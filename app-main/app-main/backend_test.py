#!/usr/bin/env python3
"""
Backend API Testing for Vacation Permission Management System
Tests all endpoints with admin and teacher credentials
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class VacationSystemTester:
    def __init__(self, base_url="https://school-pto-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.teacher_token = None
        self.teacher_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            if not success:
                print(f"   Status: {response.status_code}, Expected: {expected_status}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")

            return success, response_data

        except requests.exceptions.RequestException as e:
            print(f"   Request failed: {str(e)}")
            return False, {"error": str(e)}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.make_request(
            'POST', 'auth/login',
            data={"email": "admin@universidad.edu", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            self.log_test("Admin Login", True)
            return True
        else:
            self.log_test("Admin Login", False, f"Response: {response}")
            return False

    def test_teacher_login(self):
        """Test teacher login"""
        success, response = self.make_request(
            'POST', 'auth/login',
            data={"email": "profesor@universidad.edu", "password": "profesor123"}
        )
        
        if success and 'token' in response:
            self.teacher_token = response['token']
            self.teacher_id = response['user']['id']
            self.log_test("Teacher Login", True)
            return True
        else:
            self.log_test("Teacher Login", False, f"Response: {response}")
            return False

    def test_admin_stats(self):
        """Test admin statistics endpoint"""
        success, response = self.make_request(
            'GET', 'stats', token=self.admin_token
        )
        
        if success and 'total_teachers' in response:
            total_teachers = response['total_teachers']
            self.log_test("Admin Stats", True, f"Total teachers: {total_teachers}")
            return True
        else:
            self.log_test("Admin Stats", False, f"Response: {response}")
            return False

    def test_get_teachers(self):
        """Test getting teachers list"""
        success, response = self.make_request(
            'GET', 'teachers', token=self.admin_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Teachers List", True, f"Found {len(response)} teachers")
            return True
        else:
            self.log_test("Get Teachers List", False, f"Response: {response}")
            return False

    def test_teacher_days_calculation(self):
        """Test teacher days calculation"""
        success, response = self.make_request(
            'GET', f'teachers/{self.teacher_id}/days', token=self.teacher_token
        )
        
        if success and 'total_vacation' in response:
            days = response
            total_vacation = days['total_vacation']
            total_economic = days['total_economic']
            self.log_test("Teacher Days Calculation", True, 
                         f"Vacation: {total_vacation}, Economic: {total_economic}")
            return True
        else:
            self.log_test("Teacher Days Calculation", False, f"Response: {response}")
            return False

    def test_create_vacation_permit(self):
        """Test creating vacation permit"""
        start_date = datetime.now() + timedelta(days=30)
        end_date = start_date + timedelta(days=4)
        
        permit_data = {
            "permit_type": "vacation_57",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days_requested": 5,
            "reason": "Vacaciones familiares de prueba"
        }
        
        success, response = self.make_request(
            'POST', 'permits', data=permit_data, token=self.teacher_token, expected_status=200
        )
        
        if success and 'id' in response:
            self.permit_id = response['id']
            self.log_test("Create Vacation Permit", True, f"Permit ID: {response['id']}")
            return True
        else:
            self.log_test("Create Vacation Permit", False, f"Response: {response}")
            return False

    def test_create_economic_permit(self):
        """Test creating economic permit"""
        start_date = datetime.now() + timedelta(days=60)
        end_date = start_date + timedelta(days=1)
        
        permit_data = {
            "permit_type": "economic_62",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days_requested": 2,
            "reason": "Asuntos personales de prueba"
        }
        
        success, response = self.make_request(
            'POST', 'permits', data=permit_data, token=self.teacher_token, expected_status=200
        )
        
        if success and 'id' in response:
            self.economic_permit_id = response['id']
            self.log_test("Create Economic Permit", True, f"Permit ID: {response['id']}")
            return True
        else:
            self.log_test("Create Economic Permit", False, f"Response: {response}")
            return False

    def test_get_permits_admin(self):
        """Test admin getting all permits"""
        success, response = self.make_request(
            'GET', 'permits', token=self.admin_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Admin Get All Permits", True, f"Found {len(response)} permits")
            return True
        else:
            self.log_test("Admin Get All Permits", False, f"Response: {response}")
            return False

    def test_get_permits_teacher(self):
        """Test teacher getting own permits"""
        success, response = self.make_request(
            'GET', 'permits', token=self.teacher_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Teacher Get Own Permits", True, f"Found {len(response)} permits")
            return True
        else:
            self.log_test("Teacher Get Own Permits", False, f"Response: {response}")
            return False

    def test_approve_permit(self):
        """Test admin approving a permit"""
        if not hasattr(self, 'permit_id'):
            self.log_test("Approve Permit", False, "No permit ID available")
            return False
            
        review_data = {"status": "approved"}
        
        success, response = self.make_request(
            'PUT', f'permits/{self.permit_id}/review', 
            data=review_data, token=self.admin_token
        )
        
        if success and response.get('status') == 'approved':
            self.log_test("Approve Permit", True, f"Permit {self.permit_id} approved")
            return True
        else:
            self.log_test("Approve Permit", False, f"Response: {response}")
            return False

    def test_reject_permit(self):
        """Test admin rejecting a permit"""
        if not hasattr(self, 'economic_permit_id'):
            self.log_test("Reject Permit", False, "No economic permit ID available")
            return False
            
        review_data = {
            "status": "rejected",
            "rejection_reason": "Motivo de prueba para rechazo"
        }
        
        success, response = self.make_request(
            'PUT', f'permits/{self.economic_permit_id}/review', 
            data=review_data, token=self.admin_token
        )
        
        if success and response.get('status') == 'rejected':
            self.log_test("Reject Permit", True, f"Permit {self.economic_permit_id} rejected")
            return True
        else:
            self.log_test("Reject Permit", False, f"Response: {response}")
            return False

    def test_notifications(self):
        """Test notifications endpoint"""
        success, response = self.make_request(
            'GET', 'notifications', token=self.teacher_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Notifications", True, f"Found {len(response)} notifications")
            return True
        else:
            self.log_test("Get Notifications", False, f"Response: {response}")
            return False

    def test_register_new_teacher(self):
        """Test admin registering a new teacher"""
        teacher_data = {
            "email": f"test.teacher.{datetime.now().strftime('%H%M%S')}@universidad.edu",
            "password": "testpass123",
            "name": "Profesor de Prueba",
            "role": "teacher",
            "contract_type": "full_time",
            "hire_date": "2018-01-15T00:00:00Z"
        }
        
        success, response = self.make_request(
            'POST', 'auth/register', data=teacher_data, token=self.admin_token
        )
        
        if success and 'id' in response:
            self.log_test("Register New Teacher", True, f"Teacher ID: {response['id']}")
            return True
        else:
            self.log_test("Register New Teacher", False, f"Response: {response}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Vacation Permission System")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
            
        if not self.test_teacher_login():
            print("❌ Teacher login failed - stopping tests")
            return False

        # Admin functionality tests
        self.test_admin_stats()
        self.test_get_teachers()
        self.test_register_new_teacher()

        # Teacher functionality tests
        self.test_teacher_days_calculation()
        self.test_create_vacation_permit()
        self.test_create_economic_permit()

        # Permit management tests
        self.test_get_permits_admin()
        self.test_get_permits_teacher()
        self.test_approve_permit()
        self.test_reject_permit()

        # Notification tests
        self.test_notifications()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = VacationSystemTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())