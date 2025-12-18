import asyncio
import sys
sys.path.append('/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import bcrypt

mongo_url = "mongodb://localhost:27017"
db_name = "test_database"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clear existing data
    await db.users.delete_many({})
    await db.permits.delete_many({})
    await db.notifications.delete_many({})
    
    print("Base de datos limpiada...")
    
    # Create admin user
    admin = {
        "id": "admin-001",
        "email": "admin@universidad.edu",
        "password": hash_password("admin123"),
        "name": "Administrador Principal",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    print("✓ Administrador creado: admin@universidad.edu / admin123")
    
    # Create teacher user
    teacher = {
        "id": "teacher-001",
        "email": "profesor@universidad.edu",
        "password": hash_password("profesor123"),
        "name": "María García López",
        "role": "teacher",
        "contract_type": "full_time",
        "hire_date": (datetime.now(timezone.utc) - timedelta(days=365*7)).isoformat(),  # 7 years ago
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(teacher)
    print("✓ Profesor creado: profesor@universidad.edu / profesor123")
    
    # Create additional teachers
    teachers = [
        {
            "id": "teacher-002",
            "email": "juan.perez@universidad.edu",
            "password": hash_password("password123"),
            "name": "Juan Pérez Martínez",
            "role": "teacher",
            "contract_type": "full_time",
            "hire_date": (datetime.now(timezone.utc) - timedelta(days=365*10)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "teacher-003",
            "email": "ana.rodriguez@universidad.edu",
            "password": hash_password("password123"),
            "name": "Ana Rodríguez Sánchez",
            "role": "teacher",
            "contract_type": "part_time",
            "hire_date": (datetime.now(timezone.utc) - timedelta(days=365*4)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "teacher-004",
            "email": "carlos.lopez@universidad.edu",
            "password": hash_password("password123"),
            "name": "Carlos López Hernández",
            "role": "teacher",
            "contract_type": "hourly",
            "hire_date": (datetime.now(timezone.utc) - timedelta(days=365*2)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for t in teachers:
        await db.users.insert_one(t)
        print(f"✓ Profesor creado: {t['email']}")
    
    print(f"\n✓ Base de datos inicializada con éxito!")
    print(f"Total usuarios: {await db.users.count_documents({})}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
