/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - STUDENT ATTEMPT HISTORY
 * ============================================================================
 */

import { store } from '../state.js';
import { db } from '../db.js';
import { formatDate, formatSeconds, escapeHtml } from '../utils.js';

export async function renderStudentHistory() {
  const container = document.getElementById('app-main');
  const user = store.getState().user;

  container.innerHTML = `
    <div class="container animate-fade-in">
      <div class="admin-header">
        <div class="admin-title-group">
          <h1><i class="fa-solid fa-clock-rotate-left text-primary"></i> My Test Attempt History</h1>
          <p>Review your previous examination scores, accuracy breakdown, and solutions</p>
        </div>
        <div class="toolbar-actions">
          <a href="#/student/dashboard" class="btn btn-secondary">
            <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
          </a>
        </div>
      </div>

      <div class="table-responsive glass-card">
        <table class="table">
          <thead>
            <tr>
              <th>Examination Title</th>
              <th>Score Obtained</th>
              <th>Accuracy (C / W / U)</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Time Taken</th>
              <th>Submitted Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="history-table-tbody">
            <tr>
              <td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">Loading your test history...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    const attempts = await db.getUserAttempts(user.id);
    const tbody = document.getElementById('history-table-tbody');

    if (!attempts || attempts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted" style="padding: 3rem;">
            You haven't completed any examinations yet.
            <div class="mt-4">
              <a href="#/student/dashboard" class="btn btn-primary btn-sm">Explore Tests</a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = attempts
      .map((att) => {
        const isPassed = Number(att.percentage) >= Number(att.tests?.passing_percentage || 40);
        return `
        <tr>
          <td>
            <div class="font-bold">${escapeHtml(att.tests?.title || 'Examination')}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(att.tests?.category || 'General')}</div>
          </td>
          <td>
            <strong class="font-mono" style="font-size: 1.0625rem;">${att.score}</strong>
          </td>
          <td>
            <div class="flex-center gap-1 font-mono" style="font-size: 0.8125rem;">
              <span class="text-success font-bold" title="Correct">${att.correct_answers}</span> /
              <span class="text-danger font-bold" title="Wrong">${att.wrong_answers}</span> /
              <span class="text-muted" title="Unanswered">${att.unanswered}</span>
            </div>
          </td>
          <td>
            <strong class="font-mono ${isPassed ? 'text-success' : 'text-danger'}">${att.percentage}%</strong>
          </td>
          <td>
            <span class="badge badge-${isPassed ? 'passed' : 'failed'}">
              ${isPassed ? 'PASSED' : 'FAILED'}
            </span>
          </td>
          <td class="font-mono text-secondary" style="font-size: 0.8125rem;">
            ${formatSeconds(att.time_taken_seconds)}
          </td>
          <td class="text-secondary" style="font-size: 0.8125rem;">
            ${formatDate(att.submitted_at)}
          </td>
          <td>
            <a href="#/result/${att.id}" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-chart-simple"></i> View Result
            </a>
          </td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load student history:', err);
  }
}
