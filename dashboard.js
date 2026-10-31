// ==========================================================================
// Dashboard JavaScript - Student Management System
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardStats();
});

async function fetchDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success && json.data) {
      renderDashboard(json.data);
    } else {
      console.error('Failed to load dashboard statistics:', json.message);
    }
  } catch (err) {
    console.error('Network error fetching dashboard stats:', err);
  }
}

function renderDashboard(data) {
  const {
    total_students,
    average_marks,
    highest_student,
    lowest_student,
    pass_rate,
    pass_count,
    course_breakdown,
    grade_breakdown,
    recent_students
  } = data;

  // 1. Total Students
  const totalElem = document.getElementById('dashTotalStudents');
  if (totalElem) {
    totalElem.textContent = total_students;
  }

  // 2. Average Marks
  const avgMarksElem = document.getElementById('dashAvgMarks');
  const avgSubtextElem = document.getElementById('dashAvgSubtext');
  const avgGradePill = document.getElementById('dashAvgGradePill');
  if (avgMarksElem) {
    avgMarksElem.textContent = total_students > 0 ? `${Number(average_marks).toFixed(1)}%` : '0.0%';
  }
  if (avgSubtextElem) {
    avgSubtextElem.textContent = total_students > 0
      ? `Across ${total_students} enrolled student${total_students === 1 ? '' : 's'}`
      : 'No student records in database';
  }
  if (avgGradePill) {
    const grade = getGradeLabel(average_marks);
    avgGradePill.textContent = total_students > 0 ? grade.label : 'No Data';
    avgGradePill.className = `grade-pill-tag ${grade.className}`;
  }

  // 3. Top Performer
  const topNameElem = document.getElementById('dashTopStudentName');
  const topDetailElem = document.getElementById('dashTopStudentDetail');
  const topScoreBadge = document.getElementById('dashTopScoreBadge');
  if (topNameElem) {
    if (highest_student) {
      topNameElem.textContent = highest_student.name;
      topDetailElem.textContent = `${highest_student.course} • USN: ${highest_student.usn}`;
      topScoreBadge.textContent = `${Number(highest_student.marks).toFixed(1)}%`;
      topScoreBadge.style.display = 'inline-flex';
    } else {
      topNameElem.textContent = 'None';
      topDetailElem.textContent = 'No records registered yet';
      topScoreBadge.style.display = 'none';
    }
  }

  // 4. Pass Rate
  const passRateElem = document.getElementById('dashPassRate');
  const passCountElem = document.getElementById('dashPassCountText');
  const passProgress = document.getElementById('dashPassProgress');
  if (passRateElem) {
    passRateElem.textContent = total_students > 0 ? `${Number(pass_rate).toFixed(1)}%` : '0.0%';
  }
  if (passCountElem) {
    passCountElem.textContent = total_students > 0
      ? `${pass_count} of ${total_students} student${total_students === 1 ? '' : 's'} scoring ≥ 40%`
      : 'Passing mark: 40.0%';
  }
  if (passProgress) {
    passProgress.style.width = `${Math.min(100, Math.max(0, pass_rate || 0))}%`;
  }

  // 5. Course Enrollment Breakdown
  const coursesCountBadge = document.getElementById('dashTotalCoursesCount');
  if (coursesCountBadge) {
    coursesCountBadge.textContent = `${course_breakdown ? course_breakdown.length : 0} Programs`;
  }
  renderCourseBreakdown(course_breakdown, total_students);

  // 6. Academic Performance Breakdown
  renderGradeBreakdown(grade_breakdown, total_students);

  // 7. Recent Students Table
  renderRecentStudents(recent_students);
}

function renderCourseBreakdown(breakdown, total) {
  const container = document.getElementById('courseBreakdownContainer');
  if (!container) return;

  if (!breakdown || breakdown.length === 0) {
    container.innerHTML = `
      <div class="empty-analytics-msg">
        <span>No course data available yet.</span>
      </div>
    `;
    return;
  }

  let html = '<div class="distribution-list">';
  breakdown.forEach(item => {
    html += `
      <div class="distribution-item">
        <div class="dist-header">
          <span class="dist-name">${escapeHtml(item.course)}</span>
          <div class="dist-meta">
            <span class="dist-count">${item.count} student${item.count === 1 ? '' : 's'}</span>
            <span class="dist-pct">${item.percentage}%</span>
          </div>
        </div>
        <div class="dist-bar-track">
          <div class="dist-bar-fill green-grad" style="width: ${item.percentage}%;"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderGradeBreakdown(grades, total) {
  const container = document.getElementById('gradeBreakdownContainer');
  if (!container) return;

  if (!grades || total === 0) {
    container.innerHTML = `
      <div class="empty-analytics-msg">
        <span>No student grades available yet.</span>
      </div>
    `;
    return;
  }

  const categories = [
    { label: 'Distinction (≥ 75%)', count: grades.distinction || 0, colorClass: 'grade-distinction' },
    { label: 'First Class (60% – 74%)', count: grades.first_class || 0, colorClass: 'grade-first' },
    { label: 'Second Class (50% – 59%)', count: grades.second_class || 0, colorClass: 'grade-second' },
    { label: 'Pass Class (40% – 49%)', count: grades.pass_class || 0, colorClass: 'grade-pass' },
    { label: 'Needs Improvement (< 40%)', count: grades.needs_improvement || 0, colorClass: 'grade-fail' }
  ];

  let html = '<div class="distribution-list">';
  categories.forEach(cat => {
    const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
    html += `
      <div class="distribution-item">
        <div class="dist-header">
          <span class="dist-name">${cat.label}</span>
          <div class="dist-meta">
            <span class="dist-count">${cat.count} student${cat.count === 1 ? '' : 's'}</span>
            <span class="dist-pct">${pct}%</span>
          </div>
        </div>
        <div class="dist-bar-track">
          <div class="dist-bar-fill ${cat.colorClass}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderRecentStudents(list) {
  const tbody = document.getElementById('recentStudentsTableBody');
  const emptyState = document.getElementById('recentEmptyState');
  const table = document.getElementById('recentStudentsTable');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (table) table.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (table) table.style.display = 'table';

  list.forEach((student, index) => {
    const tr = document.createElement('tr');
    const marksNum = parseFloat(student.marks);
    const marksPct = Math.min(100, Math.max(0, isNaN(marksNum) ? 0 : marksNum));
    const grade = getGradeLabel(marksNum);

    tr.innerHTML = `
      <td class="row-index" style="text-align: center;">${index + 1}</td>
      <td>
        <span class="usn-cell">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <line x1="7" y1="8" x2="17" y2="8"></line>
            <line x1="7" y1="12" x2="12" y2="12"></line>
          </svg>
          ${escapeHtml(student.usn)}
        </span>
      </td>
      <td class="name-cell">${escapeHtml(student.name)}</td>
      <td class="course-cell">${escapeHtml(student.course)}</td>
      <td class="marks-cell">
        <div class="marks-cell-wrap">
          <div class="marks-val-row">
            <span class="marks-badge ${grade.badgeClass}">${Number(student.marks).toFixed(1)}%</span>
            <small style="color: var(--slate-500); font-weight: 600; font-size: 0.8rem;">${grade.label}</small>
          </div>
          <div class="table-marks-bar">
            <div class="table-marks-fill ${grade.badgeClass}" style="width: ${marksPct}%;"></div>
          </div>
        </div>
      </td>
      <td style="text-align: center;">
        <span class="status-indicator-pill ${marksNum >= 40 ? 'pass' : 'fail'}">
          ${marksNum >= 40 ? 'Passed' : 'Failed'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function getGradeLabel(marks) {
  const m = parseFloat(marks);
  if (isNaN(m) || m <= 0) return { label: 'N/A', className: 'neutral', badgeClass: 'mid' };
  if (m >= 75) return { label: 'Distinction', className: 'distinction', badgeClass: 'high' };
  if (m >= 60) return { label: 'First Class', className: 'first', badgeClass: 'high' };
  if (m >= 50) return { label: 'Second Class', className: 'second', badgeClass: 'mid' };
  if (m >= 40) return { label: 'Pass', className: 'pass', badgeClass: 'mid' };
  return { label: 'Needs Improvement', className: 'fail', badgeClass: 'low' };
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
