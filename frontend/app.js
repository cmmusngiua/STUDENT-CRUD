/**
 * StudentHub - Frontend Application Logic
 * Integrates with Spring Boot REST Controller (/musngi/students)
 */

(() => {
  'use strict';

  // -------------------------------------------------------------
  // Configuration & Defaults
  // -------------------------------------------------------------
  const DEFAULT_RELATIVE_API = '/musngi/students';
  const DEFAULT_ABSOLUTE_API = 'http://localhost:8080/musngi/students';

  // Read Vite environment variable if injected by Render build
  const envApiUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    ? (import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/musngi/students')
    : null;

  function getInitialApiUrl() {
    const saved = localStorage.getItem('student_api_url');
    if (saved) return saved.trim();

    if (envApiUrl) return envApiUrl;

    // If served via file:// or non-backend port, prefer absolute localhost:8080
    if (window.location.protocol === 'file:' || (window.location.port !== '8080' && window.location.hostname === 'localhost')) {
      return DEFAULT_ABSOLUTE_API;
    }
    return DEFAULT_RELATIVE_API;
  }

  let API_BASE_URL = getInitialApiUrl();

  // -------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------
  const state = {
    students: [],
    filteredStudents: [],
    currentView: localStorage.getItem('student_view') || 'table',
    theme: localStorage.getItem('student_theme') || 'light',
    searchTerm: '',
    selectedCourse: '',
    selectedSection: '',
    sortBy: 'id-asc',
    isLoading: false,
    backendOnline: false
  };

  // Avatar Color Palette
  const AVATAR_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981',
    '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'
  ];

  // -------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------
  const elements = {
    // Header & Status
    statusPill: document.getElementById('statusPill'),
    statusText: document.getElementById('statusText'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    themeIconSun: document.getElementById('themeIconSun'),
    themeIconMoon: document.getElementById('themeIconMoon'),
    btnOpenAddModal: document.getElementById('btnOpenAddModal'),

    // Stats
    statTotalStudents: document.getElementById('statTotalStudents'),
    statTotalCourses: document.getElementById('statTotalCourses'),
    statTotalSections: document.getElementById('statTotalSections'),
    statFilteredStudents: document.getElementById('statFilteredStudents'),

    // Controls
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    courseFilter: document.getElementById('courseFilter'),
    sectionFilter: document.getElementById('sectionFilter'),
    sortSelect: document.getElementById('sortSelect'),
    btnViewTable: document.getElementById('btnViewTable'),
    btnViewGrid: document.getElementById('btnViewGrid'),
    btnRefresh: document.getElementById('btnRefresh'),
    btnExportMenu: document.getElementById('btnExportMenu'),
    exportDropdown: document.getElementById('exportDropdown'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnExportJSON: document.getElementById('btnExportJSON'),
    btnPrint: document.getElementById('btnPrint'),

    // Banners & Loading
    connectionErrorBanner: document.getElementById('connectionErrorBanner'),
    connectionErrorMessage: document.getElementById('connectionErrorMessage'),
    btnRetryConnection: document.getElementById('btnRetryConnection'),
    btnShowTroubleshoot: document.getElementById('btnShowTroubleshoot'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptySubtitle: document.getElementById('emptySubtitle'),
    btnEmptyAdd: document.getElementById('btnEmptyAdd'),
    btnSeedDemo: document.getElementById('btnSeedDemo'),

    // Views
    tableViewWrapper: document.getElementById('tableViewWrapper'),
    studentsTableBody: document.getElementById('studentsTableBody'),
    gridViewWrapper: document.getElementById('gridViewWrapper'),

    // Modals
    modalAddStudent: document.getElementById('modalAddStudent'),
    formAddStudent: document.getElementById('formAddStudent'),
    addFirstname: document.getElementById('addFirstname'),
    addLastname: document.getElementById('addLastname'),
    addCourse: document.getElementById('addCourse'),
    addSection: document.getElementById('addSection'),
    btnSubmitAdd: document.getElementById('btnSubmitAdd'),

    modalEditStudent: document.getElementById('modalEditStudent'),
    formEditStudent: document.getElementById('formEditStudent'),
    editStudentId: document.getElementById('editStudentId'),
    editStudentBadgeId: document.getElementById('editStudentBadgeId'),
    editFirstname: document.getElementById('editFirstname'),
    editLastname: document.getElementById('editLastname'),
    editCourse: document.getElementById('editCourse'),
    editSection: document.getElementById('editSection'),
    btnSubmitEdit: document.getElementById('btnSubmitEdit'),

    modalViewStudent: document.getElementById('modalViewStudent'),
    viewAvatar: document.getElementById('viewAvatar'),
    viewFullName: document.getElementById('viewFullName'),
    viewIdBadge: document.getElementById('viewIdBadge'),
    viewFirstname: document.getElementById('viewFirstname'),
    viewLastname: document.getElementById('viewLastname'),
    viewCourse: document.getElementById('viewCourse'),
    viewSection: document.getElementById('viewSection'),
    btnViewToEdit: document.getElementById('btnViewToEdit'),

    modalDeleteStudent: document.getElementById('modalDeleteStudent'),
    deleteStudentId: document.getElementById('deleteStudentId'),
    deleteStudentName: document.getElementById('deleteStudentName'),
    deleteStudentIdText: document.getElementById('deleteStudentIdText'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),

    modalSettings: document.getElementById('modalSettings'),
    inputApiBaseUrl: document.getElementById('inputApiBaseUrl'),
    btnSaveApiUrl: document.getElementById('btnSaveApiUrl'),
    btnResetApiUrl: document.getElementById('btnResetApiUrl'),

    modalTroubleshoot: document.getElementById('modalTroubleshoot'),
    toastContainer: document.getElementById('toastContainer')
  };

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getInitials(firstname, lastname) {
    const f = (firstname || '').trim().charAt(0).toUpperCase();
    const l = (lastname || '').trim().charAt(0).toUpperCase();
    return (f + l) || '?';
  }

  function getAvatarColor(name) {
    let hash = 0;
    const str = name || 'Student';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function cleanApiUrl(url) {
    return url.replace(/\/+$/, '');
  }

  // -------------------------------------------------------------
  // Toast Notifications
  // -------------------------------------------------------------
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
      <button class="toast-dismiss">&times;</button>
    `;

    elements.toastContainer.appendChild(toast);

    const dismiss = () => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('.toast-dismiss').addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  }

  // -------------------------------------------------------------
  // Backend API Communication
  // -------------------------------------------------------------
  async function apiRequest(endpoint = '', options = {}) {
    const url = cleanApiUrl(API_BASE_URL) + endpoint;
    const defaultHeaders = {
      'Accept': 'application/json'
    };

    if (options.body && typeof options.body === 'string') {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    const response = await fetch(url, config);
    return response;
  }

  async function loadStudents() {
    setLoading(true);
    setConnectionStatus('checking', 'Connecting to backend...');

    try {
      const response = await apiRequest();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      state.students = Array.isArray(data) ? data : [];
      setConnectionStatus('connected', 'Connected');
      elements.connectionErrorBanner.classList.add('hidden');
      state.backendOnline = true;
      populateFilterOptions();
      applyFiltersAndRender();
    } catch (err) {
      console.error('Error fetching students:', err);
      state.backendOnline = false;
      setConnectionStatus('error', 'Disconnected');
      elements.connectionErrorBanner.classList.remove('hidden');
      elements.connectionErrorMessage.textContent = `Could not reach ${API_BASE_URL}. Ensure Spring Boot is running on port 8080 and PostgreSQL database is connected.`;
      state.students = [];
      applyFiltersAndRender();
      showToast('Cannot connect to backend server', 'error');
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------
  // UI Status & Theme Management
  // -------------------------------------------------------------
  function setConnectionStatus(status, text) {
    elements.statusPill.className = `status-pill status-${status}`;
    elements.statusText.textContent = text;
  }

  function setLoading(loading) {
    state.isLoading = loading;
    if (loading) {
      elements.loadingIndicator.classList.remove('hidden');
      elements.tableViewWrapper.classList.add('hidden');
      elements.gridViewWrapper.classList.add('hidden');
      elements.emptyState.classList.add('hidden');
    } else {
      elements.loadingIndicator.classList.add('hidden');
    }
  }

  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('student_theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      elements.themeIconSun.classList.add('hidden');
      elements.themeIconMoon.classList.remove('hidden');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      elements.themeIconSun.classList.remove('hidden');
      elements.themeIconMoon.classList.add('hidden');
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function setView(view) {
    state.currentView = view;
    localStorage.setItem('student_view', view);
    if (view === 'grid') {
      elements.btnViewGrid.classList.add('active');
      elements.btnViewTable.classList.remove('active');
    } else {
      elements.btnViewTable.classList.add('active');
      elements.btnViewGrid.classList.remove('active');
    }
    renderStudentsList();
  }

  // -------------------------------------------------------------
  // Filtering & Sorting
  // -------------------------------------------------------------
  function populateFilterOptions() {
    const courses = new Set();
    const sections = new Set();

    state.students.forEach(s => {
      if (s.course) courses.add(s.course.trim());
      if (s.section) sections.add(s.section.trim());
    });

    const currentCourse = elements.courseFilter.value;
    const currentSection = elements.sectionFilter.value;

    elements.courseFilter.innerHTML = '<option value="">All Courses</option>';
    Array.from(courses).sort().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === currentCourse) opt.selected = true;
      elements.courseFilter.appendChild(opt);
    });

    elements.sectionFilter.innerHTML = '<option value="">All Sections</option>';
    Array.from(sections).sort().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (s === currentSection) opt.selected = true;
      elements.sectionFilter.appendChild(opt);
    });
  }

  function applyFiltersAndRender() {
    let result = [...state.students];

    // Search query
    const q = state.searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(s => {
        const idStr = String(s.id || '');
        const fn = (s.firstname || '').toLowerCase();
        const ln = (s.lastname || '').toLowerCase();
        const full = `${fn} ${ln}`;
        const course = (s.course || '').toLowerCase();
        const section = (s.section || '').toLowerCase();
        return idStr.includes(q) || fn.includes(q) || ln.includes(q) || full.includes(q) || course.includes(q) || section.includes(q);
      });
    }

    // Filter by Course
    if (state.selectedCourse) {
      result = result.filter(s => (s.course || '').trim() === state.selectedCourse);
    }

    // Filter by Section
    if (state.selectedSection) {
      result = result.filter(s => (s.section || '').trim() === state.selectedSection);
    }

    // Sorting
    const [sortField, sortDir] = state.sortBy.split('-');
    const multiplier = sortDir === 'desc' ? -1 : 1;

    result.sort((a, b) => {
      if (sortField === 'id') {
        return ((a.id || 0) - (b.id || 0)) * multiplier;
      }
      if (sortField === 'name') {
        const nameA = `${a.firstname || ''} ${a.lastname || ''}`.trim().toLowerCase();
        const nameB = `${b.firstname || ''} ${b.lastname || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB) * multiplier;
      }
      if (sortField === 'course') {
        return (a.course || '').localeCompare(b.course || '') * multiplier;
      }
      if (sortField === 'section') {
        return (a.section || '').localeCompare(b.section || '') * multiplier;
      }
      return 0;
    });

    state.filteredStudents = result;
    updateStats();
    renderStudentsList();
  }

  function updateStats() {
    elements.statTotalStudents.textContent = state.students.length;

    const uniqueCourses = new Set(state.students.map(s => (s.course || '').trim()).filter(Boolean));
    elements.statTotalCourses.textContent = uniqueCourses.size;

    const uniqueSections = new Set(state.students.map(s => (s.section || '').trim()).filter(Boolean));
    elements.statTotalSections.textContent = uniqueSections.size;

    elements.statFilteredStudents.textContent = state.filteredStudents.length;
  }

  // -------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------
  function renderStudentsList() {
    if (state.isLoading) return;

    const total = state.students.length;
    const filteredCount = state.filteredStudents.length;

    if (total === 0) {
      elements.tableViewWrapper.classList.add('hidden');
      elements.gridViewWrapper.classList.add('hidden');
      elements.emptyState.classList.remove('hidden');
      elements.emptyTitle.textContent = state.backendOnline ? 'No Students in Database' : 'Database Disconnected';
      elements.emptySubtitle.textContent = state.backendOnline
        ? 'Register a new student above or click below to seed demo records.'
        : 'Please start your Spring Boot application and PostgreSQL service.';
      return;
    }

    if (filteredCount === 0) {
      elements.tableViewWrapper.classList.add('hidden');
      elements.gridViewWrapper.classList.add('hidden');
      elements.emptyState.classList.remove('hidden');
      elements.emptyTitle.textContent = 'No Matching Students';
      elements.emptySubtitle.textContent = 'Try adjusting your search criteria or filter options.';
      return;
    }

    elements.emptyState.classList.add('hidden');

    if (state.currentView === 'table') {
      elements.gridViewWrapper.classList.add('hidden');
      elements.tableViewWrapper.classList.remove('hidden');
      renderTable();
    } else {
      elements.tableViewWrapper.classList.add('hidden');
      elements.gridViewWrapper.classList.remove('hidden');
      renderGrid();
    }
  }

  function renderTable() {
    elements.studentsTableBody.innerHTML = state.filteredStudents.map(student => {
      const fullName = `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Unnamed';
      const initials = getInitials(student.firstname, student.lastname);
      const color = getAvatarColor(fullName);

      return `
        <tr data-id="${student.id}">
          <td>
            <span class="badge badge-id">#${student.id}</span>
          </td>
          <td>
            <div class="student-name-cell">
              <div class="student-avatar" style="background-color: ${color}">
                ${initials}
              </div>
              <span class="student-name-text">${escapeHtml(fullName)}</span>
            </div>
          </td>
          <td>
            <span class="badge badge-course">${escapeHtml(student.course || 'Unassigned')}</span>
          </td>
          <td>
            <span class="badge badge-section">${escapeHtml(student.section || 'N/A')}</span>
          </td>
          <td>
            <div class="row-actions">
              <button class="btn-action action-view" data-action="view" data-id="${student.id}" title="View Details">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="btn-action action-edit" data-action="edit" data-id="${student.id}" title="Edit Student">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              <button class="btn-action action-delete" data-action="delete" data-id="${student.id}" title="Delete Student">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderGrid() {
    elements.gridViewWrapper.innerHTML = state.filteredStudents.map(student => {
      const fullName = `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Unnamed';
      const initials = getInitials(student.firstname, student.lastname);
      const color = getAvatarColor(fullName);

      return `
        <div class="student-card" data-id="${student.id}">
          <div class="card-header">
            <span class="badge badge-id">#${student.id}</span>
            <div class="row-actions">
              <button class="btn-action action-view" data-action="view" data-id="${student.id}" title="View">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="btn-action action-edit" data-action="edit" data-id="${student.id}" title="Edit">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              <button class="btn-action action-delete" data-action="delete" data-id="${student.id}" title="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="card-main">
            <div class="student-avatar" style="background-color: ${color}">
              ${initials}
            </div>
            <div class="card-main-info">
              <h4>${escapeHtml(fullName)}</h4>
              <p>Student Record</p>
            </div>
          </div>
          <div class="card-badges">
            <span class="badge badge-course">${escapeHtml(student.course || 'Unassigned')}</span>
            <span class="badge badge-section">Sec: ${escapeHtml(student.section || 'N/A')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // -------------------------------------------------------------
  // Modals Management
  // -------------------------------------------------------------
  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    document.body.style.overflow = '';
  }

  // -------------------------------------------------------------
  // CRUD Actions
  // -------------------------------------------------------------
  // Add Student
  async function handleAddStudentSubmit(e) {
    e.preventDefault();

    const firstname = elements.addFirstname.value.trim();
    const lastname = elements.addLastname.value.trim();
    const course = elements.addCourse.value.trim();
    const section = elements.addSection.value.trim();

    let hasError = false;
    [['addFirstname', firstname], ['addLastname', lastname], ['addCourse', course], ['addSection', section]].forEach(([id, val]) => {
      const group = elements[id].closest('.form-group');
      if (!val) {
        group.classList.add('has-error');
        hasError = true;
      } else {
        group.classList.remove('has-error');
      }
    });

    if (hasError) return;

    const payload = { firstname, lastname, course, section };

    setButtonBusy(elements.btnSubmitAdd, true);
    try {
      const response = await apiRequest('', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to create (HTTP ${response.status})`);
      }

      const created = await response.json();
      state.students.push(created);
      populateFilterOptions();
      applyFiltersAndRender();
      closeModal(elements.modalAddStudent);
      elements.formAddStudent.reset();
      showToast(`Student ${created.firstname} ${created.lastname} registered!`, 'success');
    } catch (err) {
      console.error('Failed to create student:', err);
      showToast(err.message || 'Error saving student record', 'error');
    } finally {
      setButtonBusy(elements.btnSubmitAdd, false);
    }
  }

  // View Student
  async function openViewModal(id) {
    const student = state.students.find(s => s.id == id);
    if (!student) {
      showToast(`Student #${id} not found`, 'error');
      return;
    }

    const fullName = `${student.firstname || ''} ${student.lastname || ''}`.trim();
    elements.viewAvatar.textContent = getInitials(student.firstname, student.lastname);
    elements.viewAvatar.style.backgroundColor = getAvatarColor(fullName);
    elements.viewFullName.textContent = fullName;
    elements.viewIdBadge.textContent = `ID #${student.id}`;
    elements.viewFirstname.textContent = student.firstname || '-';
    elements.viewLastname.textContent = student.lastname || '-';
    elements.viewCourse.textContent = student.course || '-';
    elements.viewSection.textContent = student.section || '-';

    elements.btnViewToEdit.onclick = () => {
      closeModal(elements.modalViewStudent);
      openEditModal(student.id);
    };

    openModal(elements.modalViewStudent);
  }

  // Edit Student
  function openEditModal(id) {
    const student = state.students.find(s => s.id == id);
    if (!student) {
      showToast(`Student #${id} not found`, 'error');
      return;
    }

    elements.editStudentId.value = student.id;
    elements.editStudentBadgeId.textContent = student.id;
    elements.editFirstname.value = student.firstname || '';
    elements.editLastname.value = student.lastname || '';
    elements.editCourse.value = student.course || '';
    elements.editSection.value = student.section || '';

    // Clear previous errors
    elements.formEditStudent.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));

    openModal(elements.modalEditStudent);
  }

  async function handleEditStudentSubmit(e) {
    e.preventDefault();

    const id = elements.editStudentId.value;
    const firstname = elements.editFirstname.value.trim();
    const lastname = elements.editLastname.value.trim();
    const course = elements.editCourse.value.trim();
    const section = elements.editSection.value.trim();

    let hasError = false;
    [['editFirstname', firstname], ['editLastname', lastname], ['editCourse', course], ['editSection', section]].forEach(([idField, val]) => {
      const group = elements[idField].closest('.form-group');
      if (!val) {
        group.classList.add('has-error');
        hasError = true;
      } else {
        group.classList.remove('has-error');
      }
    });

    if (hasError) return;

    const payload = { firstname, lastname, course, section };

    setButtonBusy(elements.btnSubmitEdit, true);
    try {
      const response = await apiRequest(`/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to update (HTTP ${response.status})`);
      }

      const updated = await response.json();
      const index = state.students.findIndex(s => s.id == id);
      if (index !== -1) {
        state.students[index] = updated;
      }

      populateFilterOptions();
      applyFiltersAndRender();
      closeModal(elements.modalEditStudent);
      showToast(`Student #${id} updated successfully!`, 'success');
    } catch (err) {
      console.error('Failed to update student:', err);
      showToast(err.message || 'Error updating student record', 'error');
    } finally {
      setButtonBusy(elements.btnSubmitEdit, false);
    }
  }

  // Delete Student
  function openDeleteModal(id) {
    const student = state.students.find(s => s.id == id);
    if (!student) {
      showToast(`Student #${id} not found`, 'error');
      return;
    }

    elements.deleteStudentId.value = student.id;
    elements.deleteStudentIdText.textContent = student.id;
    elements.deleteStudentName.textContent = `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'this student';

    openModal(elements.modalDeleteStudent);
  }

  async function handleConfirmDelete() {
    const id = elements.deleteStudentId.value;
    if (!id) return;

    setButtonBusy(elements.btnConfirmDelete, true);
    try {
      const response = await apiRequest(`/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to delete (HTTP ${response.status})`);
      }

      state.students = state.students.filter(s => s.id != id);
      populateFilterOptions();
      applyFiltersAndRender();
      closeModal(elements.modalDeleteStudent);
      showToast(`Student #${id} deleted successfully.`, 'info');
    } catch (err) {
      console.error('Failed to delete student:', err);
      showToast(err.message || 'Error deleting student', 'error');
    } finally {
      setButtonBusy(elements.btnConfirmDelete, false);
    }
  }

  function setButtonBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    const textSpan = button.querySelector('.btn-text');
    const spinnerSpan = button.querySelector('.btn-spinner');
    if (textSpan && spinnerSpan) {
      if (busy) {
        textSpan.classList.add('hidden');
        spinnerSpan.classList.remove('hidden');
      } else {
        textSpan.classList.remove('hidden');
        spinnerSpan.classList.add('hidden');
      }
    }
  }

  // -------------------------------------------------------------
  // Demo Data Seeder
  // -------------------------------------------------------------
  async function seedDemoStudents() {
    const sampleData = [
      { firstname: 'Juan', lastname: 'Dela Cruz', course: 'BS Computer Science', section: 'CS-3A' },
      { firstname: 'Maria Clara', lastname: 'Santos', course: 'BS Information Technology', section: 'IT-2B' },
      { firstname: 'Alexander', lastname: 'Reyes', course: 'BS Computer Science', section: 'CS-3A' },
      { firstname: 'Sofia', lastname: 'Gonzales', course: 'BS Information Systems', section: 'IS-1A' },
      { firstname: 'Gabriel', lastname: 'Mendoza', course: 'BS Information Technology', section: 'IT-4A' }
    ];

    showToast('Seeding 5 demo students into database...', 'info');

    let addedCount = 0;
    for (const item of sampleData) {
      try {
        const res = await apiRequest('', {
          method: 'POST',
          body: JSON.stringify(item)
        });
        if (res.ok) {
          const created = await res.json();
          state.students.push(created);
          addedCount++;
        }
      } catch (e) {
        console.warn('Seeder failed for item:', item, e);
      }
    }

    if (addedCount > 0) {
      populateFilterOptions();
      applyFiltersAndRender();
      showToast(`Successfully added ${addedCount} sample students!`, 'success');
    } else {
      showToast('Could not seed students. Verify database connection.', 'error');
    }
  }

  // -------------------------------------------------------------
  // Export Handlers
  // -------------------------------------------------------------
  function exportCSV() {
    if (state.filteredStudents.length === 0) {
      showToast('No students to export', 'warning');
      return;
    }

    const headers = ['ID', 'First Name', 'Last Name', 'Course', 'Section'];
    const rows = state.filteredStudents.map(s => [
      s.id,
      `"${(s.firstname || '').replace(/"/g, '""')}"`,
      `"${(s.lastname || '').replace(/"/g, '""')}"`,
      `"${(s.course || '').replace(/"/g, '""')}"`,
      `"${(s.section || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, 'students_export.csv', 'text/csv;charset=utf-8;');
    showToast('Exported CSV file', 'success');
  }

  function exportJSON() {
    if (state.filteredStudents.length === 0) {
      showToast('No students to export', 'warning');
      return;
    }

    const jsonContent = JSON.stringify(state.filteredStudents, null, 2);
    downloadFile(jsonContent, 'students_export.json', 'application/json;charset=utf-8;');
    showToast('Exported JSON file', 'success');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // -------------------------------------------------------------
  // Event Listeners Setup
  // -------------------------------------------------------------
  function setupEventListeners() {
    // Theme toggle
    elements.btnThemeToggle.addEventListener('click', toggleTheme);

    // View toggles
    elements.btnViewTable.addEventListener('click', () => setView('table'));
    elements.btnViewGrid.addEventListener('click', () => setView('grid'));

    // Search & Filter
    elements.searchInput.addEventListener('input', (e) => {
      state.searchTerm = e.target.value;
      if (state.searchTerm) {
        elements.btnClearSearch.classList.remove('hidden');
      } else {
        elements.btnClearSearch.classList.add('hidden');
      }
      applyFiltersAndRender();
    });

    elements.btnClearSearch.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchTerm = '';
      elements.btnClearSearch.classList.add('hidden');
      elements.searchInput.focus();
      applyFiltersAndRender();
    });

    elements.courseFilter.addEventListener('change', (e) => {
      state.selectedCourse = e.target.value;
      applyFiltersAndRender();
    });

    elements.sectionFilter.addEventListener('change', (e) => {
      state.selectedSection = e.target.value;
      applyFiltersAndRender();
    });

    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndRender();
    });

    // Refresh & Retry
    elements.btnRefresh.addEventListener('click', loadStudents);
    elements.btnRetryConnection.addEventListener('click', loadStudents);
    elements.statusPill.addEventListener('click', loadStudents);

    // Export Dropdown
    elements.btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.exportDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!elements.exportDropdown.contains(e.target) && e.target !== elements.btnExportMenu) {
        elements.exportDropdown.classList.add('hidden');
      }
    });

    elements.btnExportCSV.addEventListener('click', () => {
      elements.exportDropdown.classList.add('hidden');
      exportCSV();
    });

    elements.btnExportJSON.addEventListener('click', () => {
      elements.exportDropdown.classList.add('hidden');
      exportJSON();
    });

    elements.btnPrint.addEventListener('click', () => {
      elements.exportDropdown.classList.add('hidden');
      window.print();
    });

    // Modal Triggers
    elements.btnOpenAddModal.addEventListener('click', () => openModal(elements.modalAddStudent));
    elements.btnEmptyAdd.addEventListener('click', () => openModal(elements.modalAddStudent));
    elements.btnSeedDemo.addEventListener('click', seedDemoStudents);

    elements.btnShowTroubleshoot.addEventListener('click', () => openModal(elements.modalTroubleshoot));

    // Settings Modal
    elements.btnOpenSettings.addEventListener('click', () => {
      elements.inputApiBaseUrl.value = API_BASE_URL;
      openModal(elements.modalSettings);
    });

    elements.btnSaveApiUrl.addEventListener('click', () => {
      const val = elements.inputApiBaseUrl.value.trim();
      if (val) {
        API_BASE_URL = cleanApiUrl(val);
        localStorage.setItem('student_api_url', API_BASE_URL);
        closeModal(elements.modalSettings);
        showToast(`API URL set to: ${API_BASE_URL}`, 'info');
        loadStudents();
      }
    });

    elements.btnResetApiUrl.addEventListener('click', () => {
      localStorage.removeItem('student_api_url');
      API_BASE_URL = getInitialApiUrl();
      elements.inputApiBaseUrl.value = API_BASE_URL;
      showToast('Reset to default API endpoint', 'info');
    });

    // Delegated Action buttons for Table and Cards (View, Edit, Delete)
    const handleActionClick = (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');

      if (action === 'view') openViewModal(id);
      if (action === 'edit') openEditModal(id);
      if (action === 'delete') openDeleteModal(id);
    };

    elements.studentsTableBody.addEventListener('click', handleActionClick);
    elements.gridViewWrapper.addEventListener('click', handleActionClick);

    // Form Submissions
    elements.formAddStudent.addEventListener('submit', handleAddStudentSubmit);
    elements.formEditStudent.addEventListener('submit', handleEditStudentSubmit);
    elements.btnConfirmDelete.addEventListener('click', handleConfirmDelete);

    // Modal Close Buttons (data-close-modal)
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        closeModal(modal);
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });

    // Table Header Sorting
    document.querySelectorAll('.students-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        const [currentField, currentDir] = state.sortBy.split('-');
        let nextDir = 'asc';
        if (currentField === field && currentDir === 'asc') {
          nextDir = 'desc';
        }
        state.sortBy = `${field}-${nextDir}`;
        elements.sortSelect.value = state.sortBy;
        applyFiltersAndRender();
      });
    });
  }

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  function init() {
    applyTheme(state.theme);
    setView(state.currentView);
    setupEventListeners();
    loadStudents();
  }

  // Start app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
