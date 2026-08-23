/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - ADMIN DASHBOARD
 * ============================================================================
 */

import { db } from '../db.js';
import { formatDate, escapeHtml } from '../utils.js';

export async function renderAdminDashboard() {
  const container = document.getElementById('app-main');

  container.innerHTML = `
    <div class="container animate-fade-in">
      <div class="admin-header">
        <div class="admin-title-group">
          <h1><i class="fa-solid fa-gauge-high text-primary"></i> Admin Dashboard</h1>
          <p>Real-time platform overview and test administration</p>
        </div>
        <div class="toolbar-actions">
          <a href="#/admin/tests/new" class="btn btn-primary">
            <i class="fa-solid fa-plus"></i> Create New Test
          </a>
        </div>
      </div>

      <!-- Admin Top Nav Bar -->
      <div class="admin-nav-bar">
        <a href="#/admin/dashboard" class="admin-nav-btn active"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
        <a href="#/admin/tests" class="admin-nav-btn"><i class="fa-solid fa-file-lines"></i> Tests</a>
        <a href="#/admin/results" class="admin-nav-btn"><i class="fa-solid fa-square-poll-vertical"></i> Results</a>
        <a href="#/admin/students" class="admin-nav-btn"><i class="fa-solid fa-users"></i> Students</a>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" id="admin-stats-container">
        <div class="stat-card" style="--stat-color: var(--primary);">
          <div class="stat-info">
            <span class="stat-label">Total Tests</span>
            <span class="stat-value" id="stat-total-tests">—</span>
            <span class="stat-subtext" id="stat-pub-tests">— published</span>
          </div>
          <div class="stat-icon"><i class="fa-solid fa-file-circle-check"></i></div>
        </div>

        <div class="stat-card" style="--stat-color: var(--accent);">
          <div class="stat-info">
            <span class="stat-label">Registered Students</span>
            <span class="stat-value" id="stat-total-students">—</span>
            <span class="stat-subtext">Active test takers</span>
          </div>
          <div class="stat-icon" style="--stat-bg: var(--accent-glow); --stat-color: var(--accent);"><i class="fa-solid fa-user-graduate"></i></div>
        </div>

        <div class="stat-card" style="--stat-color: var(--success);">
          <div class="stat-info">
            <span class="stat-label">Total Attempts</span>
            <span class="stat-value" id="stat-total-attempts">—</span>
            <span class="stat-subtext">Completed submissions</span>
          </div>
          <div class="stat-icon" style="--stat-bg: var(--success-bg); --stat-color: var(--success);"><i class="fa-solid fa-clipboard-check"></i></div>
        </div>

        <div class="stat-card" style="--stat-color: var(--warning);">
          <div class="stat-info">
            <span class="stat-label">Avg. Percentage</span>
            <span class="stat-value" id="stat-avg-score">—%</span>
            <span class="stat-subtext">Across all exams</span>
          </div>
          <div class="stat-icon" style="--stat-bg: var(--warning-bg); --stat-color: var(--warning);"><i class="fa-solid fa-award"></i></div>
        </div>
      </div>

      <!-- Recent Test Submissions -->
      <div class="glass-card mt-6">
        <div class="flex-between mb-4">
          <div>
            <h3 class="font-bold" style="font-size: 1.125rem;"><i class="fa-solid fa-clock-rotate-left text-primary"></i> Recent Test Attempts</h3>
            <p class="text-secondary" style="font-size: 0.8125rem;">Live stream of student submissions</p>
          </div>
          <a href="#/admin/results" class="btn btn-outline btn-sm">View All Results <i class="fa-solid fa-arrow-right"></i></a>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Test Title</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="recent-attempts-tbody">
              <tr>
                <td colspan="7" class="text-center text-muted" style="padding: 2rem;">Loading recent attempts...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Fetch live stats & recent attempts
  try {
    const stats = await db.getAdminStats();
    document.getElementById('stat-total-tests').textContent = stats.totalTests;
    document.getElementById('stat-pub-tests').textContent = `${stats.publishedTests} published`;
    document.getElementById('stat-total-students').textContent = stats.totalStudents;
    document.getElementById('stat-total-attempts').textContent = stats.totalAttempts;
    document.getElementById('stat-avg-score').textContent = `${stats.avgPercentage}%`;

    const recentAttempts = await db.getAllAttempts();
    const tbody = document.getElementById('recent-attempts-tbody');

    if (!recentAttempts || recentAttempts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted" style="padding: 2.5rem;">
            No student attempts recorded yet. Create and publish a test to get started.
          </td>
        </tr>
      `;
      return;
    }

    const top5 = recentAttempts.slice(0, 5);
    tbody.innerHTML = top5
      .map((att) => {
        const isPassed = Number(att.percentage) >= Number(att.tests?.passing_percentage || 40);
        return `
        <tr>
          <td>
            <div class="font-bold">${escapeHtml(att.profiles?.full_name || 'Anonymous')}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(att.profiles?.email || '—')}</div>
          </td>
          <td>
            <div class="font-bold">${escapeHtml(att.tests?.title || 'Unknown Test')}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(att.tests?.category || 'General')}</div>
          </td>
          <td><strong class="font-mono">${att.score}</strong></td>
          <td><strong class="font-mono">${att.percentage}%</strong></td>
          <td>
            <span class="badge badge-${isPassed ? 'passed' : 'failed'}">
              ${isPassed ? 'PASSED' : 'FAILED'}
            </span>
          </td>
          <td class="text-secondary" style="font-size: 0.8125rem;">${formatDate(att.submitted_at)}</td>
          <td>
            <a href="#/result/${att.id}" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-eye"></i> Details
            </a>
          </td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load admin dashboard data:', err);
  }
}
