/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - ADMIN STUDENTS DIRECTORY
 * ============================================================================
 */

import { db } from '../db.js';
import { formatDate, escapeHtml } from '../utils.js';

export async function renderAdminStudents() {
  const container = document.getElementById('app-main');

  container.innerHTML = `
    <div class="container animate-fade-in">
      <div class="admin-header">
        <div class="admin-title-group">
          <h1><i class="fa-solid fa-users text-primary"></i> Registered Students</h1>
          <p>Directory of registered candidates and their exam activity</p>
        </div>
      </div>

      <!-- Admin Top Nav Bar -->
      <div class="admin-nav-bar">
        <a href="#/admin/dashboard" class="admin-nav-btn"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
        <a href="#/admin/tests" class="admin-nav-btn"><i class="fa-solid fa-file-lines"></i> Tests</a>
        <a href="#/admin/results" class="admin-nav-btn"><i class="fa-solid fa-square-poll-vertical"></i> Results</a>
        <a href="#/admin/students" class="admin-nav-btn active"><i class="fa-solid fa-users"></i> Students</a>
      </div>

      <div class="toolbar-bar">
        <div class="toolbar-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="student-search-input" class="form-control" placeholder="Search by student name or email..." />
        </div>
      </div>

      <!-- Student Table -->
      <div class="table-responsive glass-card">
        <table class="table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Email Address</th>
              <th>Role</th>
              <th>Tests Attempted</th>
              <th>Avg Score (%)</th>
              <th>Joined Date</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody id="students-table-tbody">
            <tr>
              <td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">Loading student records...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  let allStudents = [];

  const loadStudents = async () => {
    try {
      allStudents = await db.getAllStudents();
      renderList();
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const renderList = () => {
    const tbody = document.getElementById('students-table-tbody');
    const q = document.getElementById('student-search-input').value.toLowerCase();

    let filtered = allStudents.filter(
      (s) => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted" style="padding: 3rem;">
            No student records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (s) => `
      <tr>
        <td>
          <div class="font-bold">${escapeHtml(s.full_name || 'Anonymous')}</div>
        </td>
        <td class="text-secondary font-mono" style="font-size: 0.8125rem;">
          ${escapeHtml(s.email)}
        </td>
        <td>
          <span class="user-badge role-student" style="font-size: 0.75rem;">
            <i class="fa-solid fa-graduation-cap"></i> ${s.role}
          </span>
        </td>
        <td>
          <strong class="font-mono">${s.attemptsCount}</strong>
        </td>
        <td>
          <strong class="font-mono text-primary">${s.avgScore}%</strong>
        </td>
        <td class="text-secondary" style="font-size: 0.8125rem;">
          ${formatDate(s.created_at)}
        </td>
        <td class="text-secondary" style="font-size: 0.8125rem;">
          ${formatDate(s.lastActive)}
        </td>
      </tr>
    `
      )
      .join('');
  };

  document.getElementById('student-search-input').addEventListener('input', renderList);
  loadStudents();
}
