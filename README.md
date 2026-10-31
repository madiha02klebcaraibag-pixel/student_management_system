# Student Management System

A professional, mobile-friendly 2-page Student Management System web application built with Python Flask, SQLite, and a clean green accent theme.

---

## 🌟 Pages & Architecture

### 1. Dashboard Page (`/` or `/dashboard`)
- **System Title & Branding**: Displays "Student Management System" with SQLite live database connection status.
- **Welcome Section**: Personalized welcome message and quick action links.
- **Summary Metrics**: Live statistics calculated from the SQLite database:
  - Total Enrolled Students
  - Class Average Marks & Academic Standing
  - Top Performer (Name, Course, Marks)
  - Pass Rate percentage (% scoring &ge; 40%)
- **Analytics & Breakdowns**:
  - Course enrollment distribution with progress bars
  - Standard grading scale category breakdown
- **Recently Enrolled Students**: Quick summary table of the latest student additions.
- **Navigation Menu**: Seamless navigation bar connecting to the Student Management page.

### 2. Student Management Page (`/students`)
- **Student Form**: Dedicated 4-field form (USN, Name, Course, Marks) supporting both Add and Edit modes.
- **Real-time Validation**:
  - Enforces all 4 fields.
  - Validates Marks between 0.0 and 100.0.
  - Prevents duplicate USNs (case-insensitive check at both client and SQLite database level).
- **CRUD Operations**:
  - **Add**: Register a new student into the database.
  - **View**: Modal popup with student avatar initials, details, and score meter.
  - **Update**: Edit existing student details directly in the form or via edit modal.
  - **Delete**: Safe delete operation with confirmation dialog.
- **Search & Filter**: Real-time instant search by USN, Name, or Course.
- **Student Records Table**: Clean, responsive table showing all database records with actions.

---

## 🛠️ Tech Stack
- **Backend**: Python 3, Flask, SQLite 3
- **Frontend**: HTML5, Modern CSS (Green theme, responsive grid), Vanilla JavaScript (Fetch API)
- **Database**: SQLite (`students.db`) storing persistent data for both pages.

---

## 🚀 How to Run the Website

### In VS Code or Windows Terminal:
```powershell
python app.py
```
*(Or double-click `run.bat`)*

Then open your browser and visit:
- **Dashboard**: [http://localhost:5000](http://localhost:5000)
- **Student Management**: [http://localhost:5000/students](http://localhost:5000/students)

### Run Automated Tests:
```powershell
python test_app.py
```

### Presentation Slides (PowerPoint):
The 10-slide project presentation with screenshots is available at:
`Student_Management_System_Presentation.pptx`
(Re-generate anytime with `python create_presentation.py`)

---

## 📄 Footer
`Student Management System | Copyright © 2026`
