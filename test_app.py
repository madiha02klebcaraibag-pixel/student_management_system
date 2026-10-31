import unittest
import json
import os
import tempfile
import app as flask_app

class StudentManagementSystemTestCase(unittest.TestCase):
    def setUp(self):
        # Create a temporary database for test isolation
        self.db_fd, self.temp_db_path = tempfile.mkstemp(suffix='.db')
        flask_app.DB_FILE = self.temp_db_path
        flask_app.init_db()
        self.client = flask_app.app.test_client()

    def tearDown(self):
        os.close(self.db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_dashboard_page(self):
        # Test route /
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        html = res.data.decode('utf-8')
        self.assertIn("Student Management System", html)
        self.assertIn("Dashboard", html)
        self.assertIn("Student Management", html)
        self.assertIn("Welcome to Student Management System", html)
        self.assertIn("Student Management System | Copyright &copy; 2026", html)

        # Test route /dashboard alias
        res_dash = self.client.get('/dashboard')
        self.assertEqual(res_dash.status_code, 200)

    def test_students_page(self):
        # Test route /students
        res = self.client.get('/students')
        self.assertEqual(res.status_code, 200)
        html = res.data.decode('utf-8')
        self.assertIn("Student Management Directory", html)
        self.assertIn("Student Registration Form", html)
        self.assertIn("USN", html)
        self.assertIn("Student Name", html)
        self.assertIn("Course", html)
        self.assertIn("Marks (0 – 100)", html)
        self.assertIn("Student Records Table", html)
        self.assertIn("Student Management System | Copyright &copy; 2026", html)

    def test_download_ppt(self):
        res = self.client.get('/download-ppt')
        self.assertEqual(res.status_code, 200)
        self.assertIn('presentation', res.headers.get('Content-Type', '').lower())

    def test_dashboard_stats_api(self):
        res = self.client.get('/api/stats')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        stats = data['data']
        self.assertEqual(stats['total_students'], 3)
        self.assertGreater(stats['average_marks'], 0)
        self.assertIsNotNone(stats['highest_student'])
        self.assertEqual(stats['pass_rate'], 100.0)
        self.assertGreaterEqual(len(stats['course_breakdown']), 1)
        self.assertIn('distinction', stats['grade_breakdown'])

    def test_shared_database_sync(self):
        # Verify stats before adding
        res_before = self.client.get('/api/stats')
        count_before = json.loads(res_before.data)['data']['total_students']

        # Add a student on the shared database
        new_student = {
            'usn': 'SYNC001',
            'name': 'Sync Test User',
            'course': 'Data Science',
            'marks': 98.0
        }
        add_res = self.client.post('/api/students', json=new_student)
        self.assertEqual(add_res.status_code, 201)

        # Verify stats on dashboard API immediately reflect the new student
        res_after = self.client.get('/api/stats')
        stats_after = json.loads(res_after.data)['data']
        self.assertEqual(stats_after['total_students'], count_before + 1)
        self.assertEqual(stats_after['highest_student']['usn'], 'SYNC001')

    def test_get_all_students(self):
        res = self.client.get('/api/students')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertGreaterEqual(len(data['data']), 3)

    def test_add_student_success(self):
        new_student = {
            'usn': '4NI21CS100',
            'name': 'Kavya Rao',
            'course': 'Information Science',
            'marks': 95.5
        }
        res = self.client.post('/api/students', json=new_student)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['usn'], '4NI21CS100')
        self.assertEqual(data['data']['name'], 'Kavya Rao')
        self.assertEqual(data['data']['course'], 'Information Science')
        self.assertEqual(data['data']['marks'], 95.5)

    def test_prevent_duplicate_usn(self):
        # Existing sample USN is 1MS21CS001
        duplicate_student = {
            'usn': '1MS21CS001',
            'name': 'Another Person',
            'course': 'Civil Engineering',
            'marks': 70
        }
        res = self.client.post('/api/students', json=duplicate_student)
        self.assertEqual(res.status_code, 409)
        data = json.loads(res.data)
        self.assertFalse(data['success'])
        self.assertIn('already exists', data['message'])

        # Case-insensitive duplicate test
        duplicate_lower = {
            'usn': '1ms21cs001',
            'name': 'Case Insensitive Person',
            'course': 'Civil Engineering',
            'marks': 70
        }
        res_lower = self.client.post('/api/students', json=duplicate_lower)
        self.assertEqual(res_lower.status_code, 409)

    def test_add_validation_errors(self):
        # Missing fields
        res = self.client.post('/api/students', json={'usn': '', 'name': 'John', 'course': 'CS', 'marks': 50})
        self.assertEqual(res.status_code, 400)

        # Invalid marks > 100
        res = self.client.post('/api/students', json={'usn': 'TEST001', 'name': 'John', 'course': 'CS', 'marks': 150})
        self.assertEqual(res.status_code, 400)

        # Invalid marks < 0
        res = self.client.post('/api/students', json={'usn': 'TEST002', 'name': 'John', 'course': 'CS', 'marks': -5})
        self.assertEqual(res.status_code, 400)

    def test_view_student(self):
        list_res = self.client.get('/api/students')
        first_id = json.loads(list_res.data)['data'][0]['id']

        res = self.client.get(f'/api/students/{first_id}')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['id'], first_id)

    def test_update_student(self):
        list_res = self.client.get('/api/students')
        students = json.loads(list_res.data)['data']
        target_student = students[0]
        other_student = students[1]

        # Valid update
        update_payload = {
            'usn': target_student['usn'],
            'name': 'Updated Name',
            'course': 'Updated Course',
            'marks': 99.0
        }
        res = self.client.put(f'/api/students/{target_student["id"]}', json=update_payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['data']['name'], 'Updated Name')
        self.assertEqual(data['data']['marks'], 99.0)

        # Attempt to change USN to another existing student's USN
        conflict_payload = {
            'usn': other_student['usn'],
            'name': 'Updated Name',
            'course': 'Updated Course',
            'marks': 99.0
        }
        conflict_res = self.client.put(f'/api/students/{target_student["id"]}', json=conflict_payload)
        self.assertEqual(conflict_res.status_code, 409)

    def test_delete_student(self):
        # Add a student to delete
        add_res = self.client.post('/api/students', json={
            'usn': 'DEL999',
            'name': 'Delete Me',
            'course': 'Test Course',
            'marks': 60
        })
        new_id = json.loads(add_res.data)['data']['id']

        # Delete it
        del_res = self.client.delete(f'/api/students/{new_id}')
        self.assertEqual(del_res.status_code, 200)
        del_data = json.loads(del_res.data)
        self.assertTrue(del_data['success'])

        # Verify it's gone
        get_res = self.client.get(f'/api/students/{new_id}')
        self.assertEqual(get_res.status_code, 404)

if __name__ == '__main__':
    unittest.main()