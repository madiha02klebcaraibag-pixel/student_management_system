import os
import sqlite3
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

DB_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'students.db'
)


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================
# INITIALIZE DATABASE
# ==========================================

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL UNIQUE COLLATE NOCASE,
            name TEXT NOT NULL,
            course TEXT NOT NULL,
            marks REAL NOT NULL
        )
    ''')

    cursor.execute('SELECT COUNT(*) FROM students')
    count = cursor.fetchone()[0]

    if count == 0:
        sample_students = [
            ('1MS21CS001', 'Aarav Sharma', 'Computer Science', 88.5),
            ('1MS21EC015', 'Priya Nair', 'Electronics & Comm.', 92.0),
            ('1MS21ME042', 'Rohan Verma', 'Mechanical Engg.', 76.5)
        ]

        cursor.executemany(
            'INSERT INTO students (usn, name, course, marks) VALUES (?, ?, ?, ?)',
            sample_students
        )

    conn.commit()
    conn.close()


# Initialize database when application starts
init_db()


# ==========================================
# PAGE ROUTES
# ==========================================

@app.route('/')
@app.route('/dashboard')
def dashboard():
    return render_template(
        'dashboard.html',
        active_page='dashboard'
    )


@app.route('/students')
def students_page():
    return render_template(
        'students.html',
        active_page='students'
    )


@app.route('/index')
def index():
    return render_template(
        'dashboard.html',
        active_page='dashboard'
    )


# ==========================================
# DASHBOARD STATISTICS API
# ==========================================

@app.route('/api/stats', methods=['GET'])
def get_stats():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT id, usn, name, course, marks FROM students ORDER BY id DESC'
    )

    students = [dict(row) for row in cursor.fetchall()]
    conn.close()

    total = len(students)

    if total == 0:
        return jsonify({
            'success': True,
            'data': {
                'total_students': 0,
                'average_marks': 0.0,
                'highest_student': None,
                'lowest_student': None,
                'pass_rate': 0.0,
                'pass_count': 0,
                'course_breakdown': [],
                'grade_breakdown': {
                    'distinction': 0,
                    'first_class': 0,
                    'second_class': 0,
                    'pass_class': 0,
                    'needs_improvement': 0
                },
                'recent_students': []
            }
        })

    marks_list = [
        float(student['marks']) for student in students
    ]

    avg_marks = round(sum(marks_list) / total, 1)

    highest_student = max(
        students,
        key=lambda student: float(student['marks'])
    )

    lowest_student = min(
        students,
        key=lambda student: float(student['marks'])
    )

    pass_count = sum(
        1 for marks in marks_list if marks >= 40.0
    )

    pass_rate = round(
        (pass_count / total) * 100,
        1
    )

    # Course enrollment breakdown
    course_counts = {}

    for student in students:
        course = student['course']
        course_counts[course] = course_counts.get(course, 0) + 1

    course_breakdown = [
        {
            'course': course,
            'count': count,
            'percentage': round((count / total) * 100, 1)
        }
        for course, count in sorted(
            course_counts.items(),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    # Academic grade breakdown
    grade_breakdown = {
        'distinction': sum(
            1 for marks in marks_list if marks >= 75.0
        ),
        'first_class': sum(
            1 for marks in marks_list if 60.0 <= marks < 75.0
        ),
        'second_class': sum(
            1 for marks in marks_list if 50.0 <= marks < 60.0
        ),
        'pass_class': sum(
            1 for marks in marks_list if 40.0 <= marks < 50.0
        ),
        'needs_improvement': sum(
            1 for marks in marks_list if marks < 40.0
        )
    }

    return jsonify({
        'success': True,
        'data': {
            'total_students': total,
            'average_marks': avg_marks,
            'highest_student': highest_student,
            'lowest_student': lowest_student,
            'pass_rate': pass_rate,
            'pass_count': pass_count,
            'course_breakdown': course_breakdown,
            'grade_breakdown': grade_breakdown,
            'recent_students': students[:5]
        }
    })


# ==========================================
# GET ALL STUDENTS
# ==========================================

@app.route('/api/students', methods=['GET'])
def get_students():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT id, usn, name, course, marks FROM students ORDER BY id DESC'
    )

    students = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        'success': True,
        'data': students
    })


# ==========================================
# GET SINGLE STUDENT
# ==========================================

@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT id, usn, name, course, marks FROM students WHERE id = ?',
        (student_id,)
    )

    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({
            'success': False,
            'message': 'Student not found'
        }), 404

    return jsonify({
        'success': True,
        'data': dict(row)
    })


# ==========================================
# ADD NEW STUDENT
# ==========================================

@app.route('/api/students', methods=['POST'])
def add_student():

    data = request.get_json() or {}

    usn = (data.get('usn') or '').strip().upper()
    name = (data.get('name') or '').strip()
    course = (data.get('course') or '').strip()
    marks_raw = data.get('marks')

    if not usn:
        return jsonify({
            'success': False,
            'message': 'USN is required.'
        }), 400

    if not name:
        return jsonify({
            'success': False,
            'message': 'Name is required.'
        }), 400

    if not course:
        return jsonify({
            'success': False,
            'message': 'Course is required.'
        }), 400

    if marks_raw is None or marks_raw == '':
        return jsonify({
            'success': False,
            'message': 'Marks is required.'
        }), 400

    try:
        marks = float(marks_raw)

        if marks < 0 or marks > 100:
            return jsonify({
                'success': False,
                'message': 'Marks must be between 0 and 100.'
            }), 400

    except (ValueError, TypeError):
        return jsonify({
            'success': False,
            'message': 'Marks must be a valid number.'
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT id FROM students WHERE usn = ?',
        (usn,)
    )

    existing = cursor.fetchone()

    if existing:
        conn.close()
        return jsonify({
            'success': False,
            'message': f'Student with USN "{usn}" already exists.'
        }), 409

    try:
        cursor.execute(
            '''
            INSERT INTO students (usn, name, course, marks)
            VALUES (?, ?, ?, ?)
            ''',
            (usn, name, course, marks)
        )

        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Student added successfully!',
            'data': {
                'id': new_id,
                'usn': usn,
                'name': name,
                'course': course,
                'marks': marks
            }
        }), 201

    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({
            'success': False,
            'message': f'Student with USN "{usn}" already exists.'
        }), 409

    except Exception as e:
        conn.close()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ==========================================
# UPDATE STUDENT
# ==========================================

@app.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):

    data = request.get_json() or {}

    usn = (data.get('usn') or '').strip().upper()
    name = (data.get('name') or '').strip()
    course = (data.get('course') or '').strip()
    marks_raw = data.get('marks')

    if not usn:
        return jsonify({
            'success': False,
            'message': 'USN is required.'
        }), 400

    if not name:
        return jsonify({
            'success': False,
            'message': 'Name is required.'
        }), 400

    if not course:
        return jsonify({
            'success': False,
            'message': 'Course is required.'
        }), 400

    if marks_raw is None or marks_raw == '':
        return jsonify({
            'success': False,
            'message': 'Marks is required.'
        }), 400

    try:
        marks = float(marks_raw)

        if marks < 0 or marks > 100:
            return jsonify({
                'success': False,
                'message': 'Marks must be between 0 and 100.'
            }), 400

    except (ValueError, TypeError):
        return jsonify({
            'success': False,
            'message': 'Marks must be a valid number.'
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check student existence
    cursor.execute(
        'SELECT id FROM students WHERE id = ?',
        (student_id,)
    )

    if cursor.fetchone() is None:
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Student record not found.'
        }), 404

    # Check duplicate USN
    cursor.execute(
        'SELECT id FROM students WHERE usn = ? AND id != ?',
        (usn, student_id)
    )

    existing = cursor.fetchone()

    if existing:
        conn.close()
        return jsonify({
            'success': False,
            'message': f'Another student with USN "{usn}" already exists.'
        }), 409

    try:
        cursor.execute(
            '''
            UPDATE students
            SET usn = ?, name = ?, course = ?, marks = ?
            WHERE id = ?
            ''',
            (usn, name, course, marks, student_id)
        )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Student updated successfully!',
            'data': {
                'id': student_id,
                'usn': usn,
                'name': name,
                'course': course,
                'marks': marks
            }
        })

    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({
            'success': False,
            'message': f'Another student with USN "{usn}" already exists.'
        }), 409

    except Exception as e:
        conn.close()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ==========================================
# DELETE STUDENT
# ==========================================

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT usn, name FROM students WHERE id = ?',
        (student_id,)
    )

    row = cursor.fetchone()

    if row is None:
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Student record not found.'
        }), 404

    cursor.execute(
        'DELETE FROM students WHERE id = ?',
        (student_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': (
            f'Student {row["name"]} ({row["usn"]}) '
            'deleted successfully.'
        )
    })


# ==========================================
# RUN FLASK APPLICATION
# ==========================================

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )