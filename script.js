// ==========================================================================
// Student Management System - Student Management Frontend JavaScript
// ==========================================================================

let studentsData = [];
let studentToDelete = null;
let currentViewingStudent = null;

// DOM Elements - Table & Search
const studentsTableBody = document.getElementById('studentsTableBody');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const emptyMessage = document.getElementById('emptyMessage');
const studentCountBadge = document.getElementById('studentCount');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

// On-page Main Form Elements
const studentMainForm = document.getElementById('studentMainForm');
const formStudentId = document.getElementById('formStudentId');
const formUsn = document.getElementById('formUsn');
const formName = document.getElementById('formName');
const formCourse = document.getElementById('formCourse');
const formMarks = document.getElementById('formMarks');
const formSubmitBtn = document.getElementById('formSubmitBtn');
const formResetBtn = document.getElementById('formResetBtn');
const formErrorAlert = document.getElementById('formErrorAlert');
const formModeBadge = document.getElementById('formModeBadge');
const formModeText = document.getElementById('formModeText');
const formCardHeading = document.getElementById('formCardHeading');

// Modals
const editModal = document.getElementById('editModal');
const viewModal = document.getElementById('viewModal');
const deleteModal = document.getElementById('deleteModal');

// Edit Modal Form Elements
const editStudentForm = document.getElementById('editStudentForm');
const editStudentId = document.getElementById('editStudentId');
const editUsn = document.getElementById('editUsn');
const editName = document.getElementById('editName');
const editCourse = document.getElementById('editCourse');
const editMarks = document.getElementById('editMarks');
const editSubmitBtn = document.getElementById('editSubmitBtn');
const editFormError = document.getElementById('editFormError');

// Modal Trigger Buttons
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const viewEditBtn = document.getElementById('viewEditBtn');

// ==========================================================================
// Initialization & Data Fetching
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  fetchStudents();
  initEventListeners();
});

async function fetchStudents() {
  showLoading(true);
  try {
    const res = await fetch('/api/students');
    const data = await res.json();
    if (data.success) {
      studentsData = data.data || [];
      renderTable(studentsData);

      // Deep linking / query parameter support for view/edit/delete
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') && studentsData.length > 0) {
        const targetId = parseInt(urlParams.get('view'), 10) || studentsData[0].id;
        openViewModal(targetId);
      } else if (urlParams.get('edit') && studentsData.length > 0) {
        const targetId = parseInt(urlParams.get('edit'), 10) || studentsData[0].id;
        openEditModal(targetId);
      } else if (urlParams.get('delete') && studentsData.length > 0) {
        const targetId = parseInt(urlParams.get('delete'), 10) || studentsData[0].id;
        openDeleteModal(targetId);
      }
    } else {
      showToast(data.message || 'Failed to load students', 'error');
    }
  } catch (err) {
    console.error('Error fetching students:', err);
    showToast('Network error while loading students', 'error');
  } finally {
    showLoading(false);
  }
}

// ==========================================================================
// Table Rendering
// ==========================================================================

function getInitials(name) {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradeInfo(marks) {
  const m = parseFloat(marks);
  if (m >= 75) {
    return { tag: 'Distinction', className: 'high', barClass: 'high' };
  } else if (m >= 60) {
    return { tag: 'First Class', className: 'high', barClass: 'high' };
  } else if (m >= 50) {
    return { tag: 'Second Class', className: 'mid', barClass: 'mid' };
  } else if (m >= 40) {
    return { tag: 'Pass', className: 'mid', barClass: 'mid' };
  } else {
    return { tag: 'Needs Improvement', className: 'low', barClass: 'low' };
  }
}

function renderTable(list) {
  studentsTableBody.innerHTML = '';
  if (studentCountBadge) {
    studentCountBadge.textContent = list.length;
  }

  if (list.length === 0) {
    const isSearching = searchInput.value.trim().length > 0;
    emptyMessage.textContent = isSearching
      ? 'No students found matching your search.'
      : 'Use the form above to add your first student record.';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  list.forEach((student, index) => {
    const tr = document.createElement('tr');
    tr.dataset.id = student.id;

    const numMarks = parseFloat(student.marks);
    const marksPct = Math.min(100, Math.max(0, isNaN(numMarks) ? 0 : numMarks));
    const grade = getGradeInfo(numMarks);

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
            <span class="marks-badge ${grade.className}">
              ${Number(student.marks).toFixed(1)}%
            </span>
            <small style="color: var(--slate-500); font-weight: 600; font-size: 0.8rem;">${grade.tag}</small>
          </div>
          <div class="table-marks-bar">
            <div class="table-marks-fill ${grade.barClass}" style="width: ${marksPct}%;"></div>
          </div>
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-action action-view" title="View details" onclick="openViewModal(${student.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>View</span>
          </button>
          <button class="btn-action action-edit" title="Edit student" onclick="editStudentFromTable(${student.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Edit</span>
          </button>
          <button class="btn-action action-delete" title="Delete student" onclick="openDeleteModal(${student.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </td>
    `;
    studentsTableBody.appendChild(tr);
  });
}

function showLoading(show) {
  loadingState.style.display = show ? 'flex' : 'none';
  if (show) {
    emptyState.style.display = 'none';
    studentsTableBody.innerHTML = '';
  }
}

// ==========================================================================
// Event Listeners
// ==========================================================================

function initEventListeners() {
  // On-page Main Form Submit
  if (studentMainForm) {
    studentMainForm.addEventListener('submit', handleMainFormSubmit);
  }

  // On-page Main Form Reset
  if (formResetBtn) {
    formResetBtn.addEventListener('click', resetMainForm);
  }

  // Edit Modal Form Submit
  if (editStudentForm) {
    editStudentForm.addEventListener('submit', handleEditModalSubmit);
  }

  // Delete Confirmation Button
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleDeleteStudent);
  }

  // View modal "Edit" button
  if (viewEditBtn) {
    viewEditBtn.addEventListener('click', () => {
      if (currentViewingStudent) {
        closeModal(viewModal);
        populateMainFormForEdit(currentViewingStudent);
      }
    });
  }

  // Modal close buttons via data-close attribute
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const targetModal = document.getElementById(modalId);
      if (targetModal) closeModal(targetModal);
    });
  });

  // Close modals on clicking overlay backdrop
  [editModal, viewModal, deleteModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    }
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [editModal, viewModal, deleteModal].forEach(modal => {
        if (modal && modal.classList.contains('active')) closeModal(modal);
      });
    }
  });

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      renderTable(studentsData);
      searchInput.focus();
    });
  }
}

// ==========================================================================
// On-Page Main Form Handler (Add & Update)
// ==========================================================================

async function handleMainFormSubmit(e) {
  e.preventDefault();
  hideFormError(formErrorAlert);

  const studentId = formStudentId.value.trim();
  const isEditing = Boolean(studentId);

  const usn = formUsn.value.trim();
  const name = formName.value.trim();
  const course = formCourse.value.trim();
  const marks = formMarks.value.trim();

  // Basic validation
  if (!usn || !name || !course || marks === '') {
    showFormError(formErrorAlert, 'All four fields (USN, Name, Course, Marks) are required.');
    return;
  }

  const numMarks = parseFloat(marks);
  if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) {
    showFormError(formErrorAlert, 'Marks must be a valid number between 0.0 and 100.0.');
    formMarks.classList.add('input-error');
    formMarks.focus();
    return;
  }

  // Duplicate USN pre-check on client side
  const duplicate = isEditing
    ? studentsData.find(s => s.id !== parseInt(studentId, 10) && s.usn.toLowerCase() === usn.toLowerCase())
    : studentsData.find(s => s.usn.toLowerCase() === usn.toLowerCase());

  if (duplicate) {
    showFormError(formErrorAlert, `Duplicate USN! A student with USN "${usn.toUpperCase()}" already exists.`);
    formUsn.classList.add('input-error');
    formUsn.focus();
    return;
  }

  setButtonLoading(formSubmitBtn, true, isEditing ? 'Updating...' : 'Adding...');

  try {
    const url = isEditing ? `/api/students/${studentId}` : '/api/students';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usn, name, course, marks: numMarks })
    });

    const result = await res.json();

    if (res.ok && result.success) {
      showToast(result.message || (isEditing ? 'Student updated successfully!' : 'Student added successfully!'), 'success');
      resetMainForm();
      await fetchStudents();
    } else {
      showFormError(formErrorAlert, result.message || 'Operation failed. Please try again.');
      if (res.status === 409) {
        formUsn.classList.add('input-error');
        formUsn.focus();
      }
    }
  } catch (err) {
    showFormError(formErrorAlert, 'Network error. Please try again.');
  } finally {
    setButtonLoading(formSubmitBtn, false, isEditing ? 'Update Student' : 'Add Student');
  }
}

function populateMainFormForEdit(student) {
  formStudentId.value = student.id;
  formUsn.value = student.usn;
  formName.value = student.name;
  formCourse.value = student.course;
  formMarks.value = student.marks;

  // Toggle visual indicator to edit mode
  formModeBadge.className = 'form-mode-badge edit-mode';
  formModeText.textContent = `Editing Student (${student.usn})`;
  formCardHeading.textContent = `Edit Record: ${student.name}`;
  formSubmitBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
    </svg>
    <span>Update Student</span>
  `;

  hideFormError(formErrorAlert);
  formUsn.focus();

  // Smooth scroll to form card
  const formCard = document.getElementById('studentFormCard');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function resetMainForm() {
  studentMainForm.reset();
  formStudentId.value = '';
  hideFormError(formErrorAlert);
  studentMainForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

  // Reset visual mode back to Add
  formModeBadge.className = 'form-mode-badge';
  formModeText.textContent = 'Add New Student';
  formCardHeading.textContent = 'Student Registration Form';
  formSubmitBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
    </svg>
    <span>Add Student</span>
  `;
}

// When clicking "Edit" in the table
function editStudentFromTable(id) {
  const student = studentsData.find(s => s.id === id);
  if (!student) return;

  // Pre-fill on-page form
  populateMainFormForEdit(student);
  showToast(`Loaded "${student.name}" into form for editing.`, 'success');
}

// ==========================================================================
// View Student Modal
// ==========================================================================

function openViewModal(id) {
  const student = studentsData.find(s => s.id === id);
  if (!student) return;

  currentViewingStudent = student;

  // Set avatar initials & header
  document.getElementById('viewAvatar').textContent = getInitials(student.name);
  document.getElementById('viewName').textContent = student.name;
  document.getElementById('viewUsn').textContent = student.usn;
  document.getElementById('viewCourse').textContent = student.course;

  // Set details
  document.getElementById('viewUsnDetail').textContent = student.usn;
  document.getElementById('viewCourseDetail').textContent = student.course;

  const marksVal = Number(student.marks).toFixed(1);
  document.getElementById('viewMarks').textContent = marksVal;

  const numMarks = parseFloat(student.marks);
  const grade = getGradeInfo(numMarks);
  const gradeBadge = document.getElementById('viewGradeBadge');
  gradeBadge.textContent = grade.tag;

  const marksPct = Math.min(100, Math.max(0, isNaN(numMarks) ? 0 : numMarks));
  const bar = document.getElementById('viewMarksBar');
  bar.style.width = marksPct + '%';

  openModal(viewModal);
}

// ==========================================================================
// Edit Modal (Alternative / Secondary Edit Option)
// ==========================================================================

function openEditModal(id) {
  const student = studentsData.find(s => s.id === id);
  if (!student) return;

  resetForm(editStudentForm, editFormError);
  editStudentId.value = student.id;
  editUsn.value = student.usn;
  editName.value = student.name;
  editCourse.value = student.course;
  editMarks.value = student.marks;

  openModal(editModal);
  setTimeout(() => editUsn.focus(), 100);
}

async function handleEditModalSubmit(e) {
  e.preventDefault();
  hideFormError(editFormError);

  const id = parseInt(editStudentId.value, 10);
  const usn = editUsn.value.trim();
  const name = editName.value.trim();
  const course = editCourse.value.trim();
  const marks = editMarks.value.trim();

  if (!usn || !name || !course || marks === '') {
    showFormError(editFormError, 'All four fields (USN, Name, Course, Marks) are required.');
    return;
  }

  const numMarks = parseFloat(marks);
  if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) {
    showFormError(editFormError, 'Marks must be a valid number between 0 and 100.');
    return;
  }

  const duplicate = studentsData.find(s => s.id !== id && s.usn.toLowerCase() === usn.toLowerCase());
  if (duplicate) {
    showFormError(editFormError, `Duplicate USN! Another student already has USN "${usn.toUpperCase()}".`);
    editUsn.classList.add('input-error');
    editUsn.focus();
    return;
  }

  setButtonLoading(editSubmitBtn, true, 'Updating...');

  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usn, name, course, marks: numMarks })
    });

    const result = await res.json();

    if (res.ok && result.success) {
      closeModal(editModal);
      showToast('Student updated successfully!', 'success');
      resetMainForm();
      await fetchStudents();
    } else {
      showFormError(editFormError, result.message || 'Failed to update student.');
      if (res.status === 409) {
        editUsn.classList.add('input-error');
      }
    }
  } catch (err) {
    showFormError(editFormError, 'Network error. Please try again.');
  } finally {
    setButtonLoading(editSubmitBtn, false, 'Update Student');
  }
}

// ==========================================================================
// Delete Student
// ==========================================================================

function openDeleteModal(id) {
  const student = studentsData.find(s => s.id === id);
  if (!student) return;

  studentToDelete = student;
  document.getElementById('deleteUsn').textContent = student.usn;
  document.getElementById('deleteName').textContent = student.name;

  openModal(deleteModal);
}

async function handleDeleteStudent() {
  if (!studentToDelete) return;

  setButtonLoading(confirmDeleteBtn, true, 'Deleting...');

  try {
    const res = await fetch(`/api/students/${studentToDelete.id}`, {
      method: 'DELETE'
    });

    const result = await res.json();

    if (res.ok && result.success) {
      closeModal(deleteModal);
      showToast(result.message || 'Student deleted successfully!', 'success');
      studentToDelete = null;
      if (formStudentId.value === String(studentToDelete?.id)) {
        resetMainForm();
      }
      await fetchStudents();
    } else {
      showToast(result.message || 'Failed to delete student.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting student.', 'error');
  } finally {
    setButtonLoading(confirmDeleteBtn, false, 'Yes, Delete Student');
  }
}

// ==========================================================================
// Search Filter
// ==========================================================================

function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  clearSearchBtn.style.display = query.length > 0 ? 'flex' : 'none';

  if (!query) {
    renderTable(studentsData);
    return;
  }

  const filtered = studentsData.filter(s => {
    return (
      (s.usn && s.usn.toLowerCase().includes(query)) ||
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.course && s.course.toLowerCase().includes(query))
    );
  });

  renderTable(filtered);
}

// ==========================================================================
// Helpers
// ==========================================================================

function openModal(modal) {
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function resetForm(form, errorBox) {
  form.reset();
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  hideFormError(errorBox);
}

function showFormError(errorBox, message) {
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }
}

function hideFormError(errorBox) {
  if (errorBox) {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }
}

function setButtonLoading(btn, isLoading, text) {
  btn.disabled = isLoading;
  const span = btn.querySelector('span');
  if (span) {
    span.textContent = text;
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✅' : '⚠️';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
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
