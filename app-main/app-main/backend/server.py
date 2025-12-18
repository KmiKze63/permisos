from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"

class ContractType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    HOURLY = "hourly"

class PermitType(str, Enum):
    VACATION_57 = "vacation_57"
    ECONOMIC_62 = "economic_62"

class PermitStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: UserRole
    contract_type: Optional[ContractType] = None
    hire_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole
    contract_type: Optional[ContractType] = None
    hire_date: Optional[datetime] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Permit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    teacher_name: str
    permit_type: PermitType
    start_date: datetime
    end_date: datetime
    days_requested: int
    reason: str
    status: PermitStatus = PermitStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    rejection_reason: Optional[str] = None

class PermitCreate(BaseModel):
    permit_type: PermitType
    start_date: datetime
    end_date: datetime
    days_requested: int
    reason: str

class PermitReview(BaseModel):
    status: PermitStatus
    rejection_reason: Optional[str] = None

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DaysAvailable(BaseModel):
    vacation_period_1: int
    vacation_period_2: int
    vacation_additional: int
    economic_days: int
    total_vacation: int
    total_economic: int

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def calculate_days_available(user: User, permits: List[Permit]) -> DaysAvailable:
    if not user.hire_date or not user.contract_type:
        return DaysAvailable(
            vacation_period_1=0, vacation_period_2=0, vacation_additional=0,
            economic_days=0, total_vacation=0, total_economic=0
        )
    
    years_of_service = (datetime.now(timezone.utc) - user.hire_date).days / 365.25
    
    vacation_period_1 = 10
    vacation_period_2 = 10
    vacation_additional = 0
    
    if user.contract_type in [ContractType.FULL_TIME, ContractType.PART_TIME]:
        if years_of_service >= 6:
            years_after_five = int(years_of_service - 5)
            vacation_additional = min(5 + years_after_five, 15)
            if user.contract_type == ContractType.FULL_TIME:
                vacation_additional = min(vacation_additional, 8)
            else:
                vacation_additional = min(vacation_additional, 8)
        elif years_of_service > 5:
            vacation_additional = 5
    
    economic_base = 8
    economic_additional = int(years_of_service / 10)
    economic_days = economic_base + economic_additional
    
    approved_permits = [p for p in permits if p.status == PermitStatus.APPROVED]
    vacation_used = sum(p.days_requested for p in approved_permits if p.permit_type == PermitType.VACATION_57)
    economic_used = sum(p.days_requested for p in approved_permits if p.permit_type == PermitType.ECONOMIC_62)
    
    total_vacation_available = vacation_period_1 + vacation_period_2 + vacation_additional
    total_economic_available = economic_days
    
    return DaysAvailable(
        vacation_period_1=max(0, vacation_period_1 - min(vacation_used, vacation_period_1)),
        vacation_period_2=max(0, vacation_period_2 - max(0, vacation_used - vacation_period_1)),
        vacation_additional=max(0, vacation_additional - max(0, vacation_used - (vacation_period_1 + vacation_period_2))),
        economic_days=max(0, total_economic_available - economic_used),
        total_vacation=max(0, total_vacation_available - vacation_used),
        total_economic=max(0, total_economic_available - economic_used)
    )

@api_router.post("/auth/register")
async def register(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden registrar usuarios")
    
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_dict = user_data.model_dump()
    user_dict["password"] = hash_password(user_dict["password"])
    user = User(**{k: v for k, v in user_dict.items() if k != "password"})
    
    doc = user.model_dump()
    doc["password"] = user_dict["password"]
    for key in ["created_at", "hire_date"]:
        if key in doc and doc[key]:
            doc[key] = doc[key].isoformat()
    
    await db.users.insert_one(doc)
    
    notification = Notification(
        user_id=user.id,
        title="Cuenta creada",
        message=f"Bienvenido {user.name}, tu cuenta ha sido creada exitosamente."
    )
    notif_doc = notification.model_dump()
    notif_doc["created_at"] = notif_doc["created_at"].isoformat()
    await db.notifications.insert_one(notif_doc)
    
    return user

@api_router.post("/auth/login")
async def login(credentials: LoginRequest):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    if isinstance(user_doc.get("hire_date"), str):
        user_doc["hire_date"] = datetime.fromisoformat(user_doc["hire_date"])
    
    user = User(**user_doc)
    token = create_token(user.id, user.email, user.role)
    
    return {"token": token, "user": user}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/teachers", response_model=List[User])
async def get_teachers(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    teachers = await db.users.find({"role": UserRole.TEACHER}, {"_id": 0}).to_list(1000)
    for teacher in teachers:
        if isinstance(teacher.get("created_at"), str):
            teacher["created_at"] = datetime.fromisoformat(teacher["created_at"])
        if isinstance(teacher.get("hire_date"), str):
            teacher["hire_date"] = datetime.fromisoformat(teacher["hire_date"])
    return [User(**t) for t in teachers]

@api_router.get("/teachers/{teacher_id}/days", response_model=DaysAvailable)
async def get_teacher_days(teacher_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN and current_user.id != teacher_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    teacher_doc = await db.users.find_one({"id": teacher_id}, {"_id": 0})
    if not teacher_doc:
        raise HTTPException(status_code=404, detail="Maestro no encontrado")
    
    if isinstance(teacher_doc.get("created_at"), str):
        teacher_doc["created_at"] = datetime.fromisoformat(teacher_doc["created_at"])
    if isinstance(teacher_doc.get("hire_date"), str):
        teacher_doc["hire_date"] = datetime.fromisoformat(teacher_doc["hire_date"])
    
    teacher = User(**teacher_doc)
    
    permits_docs = await db.permits.find({"teacher_id": teacher_id}, {"_id": 0}).to_list(1000)
    permits = []
    for p in permits_docs:
        for key in ["start_date", "end_date", "created_at", "reviewed_at"]:
            if key in p and p[key] and isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        permits.append(Permit(**p))
    
    return calculate_days_available(teacher, permits)

@api_router.post("/permits", response_model=Permit)
async def create_permit(permit_data: PermitCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Solo profesores pueden solicitar permisos")
    
    permits_docs = await db.permits.find({"teacher_id": current_user.id}, {"_id": 0}).to_list(1000)
    permits = []
    for p in permits_docs:
        for key in ["start_date", "end_date", "created_at", "reviewed_at"]:
            if key in p and p[key] and isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        permits.append(Permit(**p))
    
    days_available = calculate_days_available(current_user, permits)
    
    if permit_data.permit_type == PermitType.VACATION_57:
        if permit_data.days_requested > days_available.total_vacation:
            raise HTTPException(status_code=400, detail=f"No tienes suficientes días de vacaciones. Disponibles: {days_available.total_vacation}")
    else:
        if permit_data.days_requested > days_available.total_economic:
            raise HTTPException(status_code=400, detail=f"No tienes suficientes días económicos. Disponibles: {days_available.total_economic}")
    
    permit = Permit(
        teacher_id=current_user.id,
        teacher_name=current_user.name,
        **permit_data.model_dump()
    )
    
    doc = permit.model_dump()
    for key in ["start_date", "end_date", "created_at", "reviewed_at"]:
        if key in doc and doc[key]:
            doc[key] = doc[key].isoformat()
    
    await db.permits.insert_one(doc)
    
    admins = await db.users.find({"role": UserRole.ADMIN}, {"_id": 0}).to_list(100)
    for admin in admins:
        notification = Notification(
            user_id=admin["id"],
            title="Nueva solicitud de permiso",
            message=f"{current_user.name} ha solicitado un permiso de {permit.days_requested} días."
        )
        notif_doc = notification.model_dump()
        notif_doc["created_at"] = notif_doc["created_at"].isoformat()
        await db.notifications.insert_one(notif_doc)
    
    return permit

@api_router.get("/permits", response_model=List[Permit])
async def get_permits(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        permits_docs = await db.permits.find({}, {"_id": 0}).to_list(1000)
    else:
        permits_docs = await db.permits.find({"teacher_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    permits = []
    for p in permits_docs:
        for key in ["start_date", "end_date", "created_at", "reviewed_at"]:
            if key in p and p[key] and isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        permits.append(Permit(**p))
    
    return permits

@api_router.put("/permits/{permit_id}/review", response_model=Permit)
async def review_permit(permit_id: str, review: PermitReview, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden revisar permisos")
    
    permit_doc = await db.permits.find_one({"id": permit_id}, {"_id": 0})
    if not permit_doc:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")
    
    update_data = {
        "status": review.status,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": current_user.name
    }
    if review.rejection_reason:
        update_data["rejection_reason"] = review.rejection_reason
    
    await db.permits.update_one({"id": permit_id}, {"$set": update_data})
    
    permit_doc.update(update_data)
    for key in ["start_date", "end_date", "created_at", "reviewed_at"]:
        if key in permit_doc and permit_doc[key] and isinstance(permit_doc[key], str):
            permit_doc[key] = datetime.fromisoformat(permit_doc[key])
    
    permit = Permit(**permit_doc)
    
    status_text = "aprobada" if review.status == PermitStatus.APPROVED else "rechazada"
    notification = Notification(
        user_id=permit.teacher_id,
        title=f"Solicitud {status_text}",
        message=f"Tu solicitud de permiso ha sido {status_text} por {current_user.name}."
    )
    notif_doc = notification.model_dump()
    notif_doc["created_at"] = notif_doc["created_at"].isoformat()
    await db.notifications.insert_one(notif_doc)
    
    return permit

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications_docs = await db.notifications.find(
        {"user_id": current_user.id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    notifications = []
    for n in notifications_docs:
        if isinstance(n.get("created_at"), str):
            n["created_at"] = datetime.fromisoformat(n["created_at"])
        notifications.append(Notification(**n))
    
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return {"success": True}

@api_router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    total_teachers = await db.users.count_documents({"role": UserRole.TEACHER})
    pending_requests = await db.permits.count_documents({"status": PermitStatus.PENDING})
    active_permits = await db.permits.count_documents({
        "status": PermitStatus.APPROVED,
        "start_date": {"$lte": datetime.now(timezone.utc).isoformat()},
        "end_date": {"$gte": datetime.now(timezone.utc).isoformat()}
    })
    
    today = datetime.now(timezone.utc).date()
    todays_absences = await db.permits.count_documents({
        "status": PermitStatus.APPROVED,
        "start_date": {"$lte": datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc).isoformat()},
        "end_date": {"$gte": datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()}
    })
    
    return {
        "total_teachers": total_teachers,
        "pending_requests": pending_requests,
        "active_permits": active_permits,
        "todays_absences": todays_absences
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()