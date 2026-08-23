/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - ADMIN RESULTS & ANALYTICS
 * ============================================================================
 */

import { db } from '../db.js';
import { formatDate, formatSeconds, escapeHtml, showModal } from '../utils.js';

export async function renderAdminResults() {
  const container = document.getElementById('app-main');

  container.innerHTML = `
    <div class="container animate-fade-in">
      <div class="admin-header">
        <div class="admin-title-group">
          <h1><i class="fa-solid fa-square-poll-vertical text-primary"></i> Examination Results & Analytics</h1>
          <p>Detailed performance breakdown of all student test attempts</p>
        </div>
      </div>

      <!-- Admin Top Nav Bar -->
      <div class="admin-nav-bar">
        <a href="#/admin/dashboard" class="admin-nav-btn"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
        <a href="#/admin/tests" class="admin-nav-btn"><i class="fa-solid fa-file-lines"></i> Tests</a>
        <a href="#/admin/results" class="admin-nav-btn active"><i class="fa-solid fa-square-poll-vertical"></i> Results</a>
        <a href="#/admin/students" class="admin-nav-btn"><i class="fa-solid fa-users"></i> Students</a>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="toolbar-bar">
        <div class="toolbar-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="res-search-input" class="form-control" placeholder="Search student name, email, or test..." />
        </div>
        <div class="toolbar-actions">
          <select id="res-test-filter" class="form-control" style="width: auto;">
            <option value="">All Tests</option>
          </select>
          <select id="res-status-filter" class="form-control" style="width: auto;">
            <option value="">All Results (Pass/Fail)</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>
      </div>

      <!-- Results Data Table -->
      <div class="table-responsive glass-card">
        <table class="table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Test</th>
              <th>Questions</th>
              <th>Accuracy (C / W / U)</th>
              <th>Marks Breakdown</th>
              <th>Final Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Time Taken</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="results-table-tbody">
            <tr>
              <td colspan="11" class="text-center text-muted" style="padding: 2.5rem;">Loading results...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  let testsList = [];
  let allAttempts = [];

  const loadData = async () => {
    try {
      testsList = await db.getTests(true);
      const testSelect = document.getElementById('res-test-filter');
      testsList.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.title;
        testSelect.appendChild(opt);
      });

      allAttempts = await db.getAllAttempts();
      renderTable();
    } catch (err) {
      console.error('Failed to load results:', err);
    }
  };

  const renderTable = () => {
    const tbody = document.getElementById('results-table-tbody');
    const searchVal = document.getElementById('res-search-input').value.toLowerCase();
    const testVal = document.getElementById('res-test-filter').value;
    const statusVal = document.getElementById('res-status-filter').value;

    let filtered = allAttempts.filter((att) => {
      const matchTest = !testVal || att.test_id === testVal;
      const isPassed = Number(att.percentage) >= Number(att.tests?.passing_percentage || 40);
      const matchStatus = !statusVal || (statusVal === 'passed' && isPassed) || (statusVal === 'failed' && !isPassed);

      const q = searchVal;
      const matchSearch =
        !q ||
        att.profiles?.full_name?.toLowerCase().includes(q) ||
        att.profiles?.email?.toLowerCase().includes(q) ||
        att.tests?.title?.toLowerCase().includes(q);

      return matchTest && matchStatus && matchSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center text-muted" style="padding: 3rem;">
            No student attempt records match the chosen filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((att) => {
        const isPassed = Number(att.percentage) >= Number(att.tests?.passing_percentage || 40);
        const totalQ = (att.correct_answers || 0) + (att.wrong_answers || 0) + (att.unanswered || 0);

        return `
        <tr>
          <td>
            <div class="font-bold">${escapeHtml(att.profiles?.full_name || 'Student')}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(att.profiles?.email || '—')}</div>
          </td>
          <td>
            <div class="font-bold">${escapeHtml(att.tests?.title || 'Test')}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(att.tests?.category || 'General')}</div>
          </td>
          <td><span class="font-mono font-bold">${totalQ}</span></td>
          <td>
            <div class="flex-center gap-1 font-mono" style="font-size: 0.8125rem;">
              <span class="text-success font-bold" title="Correct">${att.correct_answers}</span> /
              <span class="text-danger font-bold" title="Wrong">${att.wrong_answers}</span> /
              <span class="text-muted" title="Unanswered">${att.unanswered}</span>
            </div>
          </td>
          <td>
            <div style="font-size: 0.75rem;" class="font-mono">
              <span class="text-success">+${att.positive_marks}</span>
              ${att.negative_marks > 0 ? ` <span class="text-danger">-${att.negative_marks}</span>` : ''}
            </div>
          </td>
          <td><strong class="font-mono" style="font-size: 1rem;">${att.score}</strong></td>
          <td><strong class="font-mono ${isPassed ? 'text-success' : 'text-danger'}">${att.percentage}%</strong></td>
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
            <button class="btn btn-outline btn-sm btn-inspect-attempt" data-id="${att.id}">
              <i class="fa-solid fa-file-invoice"></i> Inspect
            </button>
          </td>
        </tr>
      `;
      })
      .join('');

    // Attach inspect attempt handlers
    tbody.querySelectorAll('.btn-inspect-attempt').forEach((btn) => {
      btn.addEventListener('click', () => inspectAttemptModal(btn.dataset.id));
    });
  };

  const inspectAttemptModal = async (attemptId) => {
    try {
      const data = await db.getAttemptResult(attemptId);
      const { attempt, test, student, questions, answersMap } = data;
      const isPassed = Number(attempt.percentage) >= Number(test.passing_percentage);

      const modalContent = `
        <div>
          <!-- Summary Header -->
          <div class="glass-card mb-4" style="background: var(--bg-tertiary);">
            <div class="flex-between mb-3 flex-wrap gap-2">
              <div>
                <h4 class="font-bold">${escapeHtml(student?.full_name)} (${escapeHtml(student?.email)})</h4>
                <p class="text-secondary" style="font-size: 0.875rem;">Exam: <strong>${escapeHtml(test?.title)}</strong></p>
              </div>
              <span class="badge badge-${isPassed ? 'passed' : 'failed'}" style="font-size: 0.875rem; padding: 0.4rem 1rem;">
                ${isPassed ? 'PASSED' : 'FAILED'} (${attempt.percentage}%)
              </span>
            </div>

            <div class="scorecard-stats-row">
              <div class="scorecard-stat-pill">
                <span class="label">Final Score</span>
                <span class="val font-mono">${attempt.score}</span>
              </div>
              <div class="scorecard-stat-pill">
                <span class="label">Correct</span>
                <span class="val font-mono text-success">${attempt.correct_answers}</span>
              </div>
              <div class="scorecard-stat-pill">
                <span class="label">Wrong</span>
                <span class="val font-mono text-danger">${attempt.wrong_answers}</span>
              </div>
              <div class="scorecard-stat-pill">
                <span class="label">Unanswered</span>
                <span class="val font-mono text-muted">${attempt.unanswered}</span>
              </div>
              <div class="scorecard-stat-pill">
                <span class="label">Time Taken</span>
                <span class="val font-mono">${formatSeconds(attempt.time_taken_seconds)}</span>
              </div>
            </div>
          </div>

          <!-- Question by Question Breakdown -->
          <h4 class="font-bold mb-3"><i class="fa-solid fa-list-ol text-primary"></i> Question-by-Question Response Log</h4>
          <div class="attempt-questions-log" style="max-height: 420px; overflow-y: auto; padding-right: 4px;">
            ${questions
              .map((q, idx) => {
                const userAns = answersMap[q.id];
                const selectedOptId = userAns?.selected_option_id;
                const sortedOptions = (q.options || []).sort((a, b) => a.option_order - b.option_order);
                const correctOpt = sortedOptions.find((o) => o.is_correct);

                let statusClass = 'status-unanswered';
                let statusLabel = '<span class="badge badge-neutral">Unanswered (0 marks)</span>';

                if (selectedOptId) {
                  if (correctOpt && selectedOptId === correctOpt.id) {
                    statusClass = 'status-correct';
                    statusLabel = `<span class="badge badge-passed"><i class="fa-solid fa-check"></i> Correct (+${test.marks_per_correct})</span>`;
                  } else {
                    statusClass = 'status-wrong';
                    statusLabel = `<span class="badge badge-failed"><i class="fa-solid fa-xmark"></i> Wrong (${test.negative_marking_enabled ? `-${test.negative_marks_per_wrong}` : '0'})</span>`;
                  }
                }

                return `
                <div class="attempt-q-breakdown ${statusClass}">
                  <div class="flex-between mb-2">
                    <span class="font-bold text-primary">Question ${idx + 1}</span>
                    ${statusLabel}
                  </div>
                  <div class="mb-3 font-bold" style="color: var(--text-primary); font-size: 0.9375rem;">
                    ${escapeHtml(q.question_text)}
                  </div>

                  <div class="flex-col gap-2">
                    ${sortedOptions
                      .map((opt, optIdx) => {
                        const label = String.fromCharCode(65 + optIdx);
                        const isStudentChoice = opt.id === selectedOptId;
                        const isTrueCorrect = !!opt.is_correct;

                        let rowStyle = 'background: var(--bg-secondary); border: 1px solid var(--border-color);';
                        let tag = '';

                        if (isTrueCorrect) {
                          rowStyle = 'background: rgba(16, 185, 129, 0.12); border: 1px solid var(--success); color: #34d399;';
                          tag = '<span class="badge badge-success" style="font-size: 0.6875rem;">Correct Answer</span>';
                        }
                        if (isStudentChoice && !isTrueCorrect) {
                          rowStyle = 'background: rgba(239, 68, 68, 0.12); border: 1px solid var(--danger); color: #f87171;';
                          tag = '<span class="badge badge-danger" style="font-size: 0.6875rem;">Student\'s Wrong Choice</span>';
                        }

                        return `
                        <div style="padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.875rem; ${rowStyle}">
                          <div>
                            <strong>${label}.</strong> ${escapeHtml(opt.option_text)}
                          </div>
                          ${tag}
                        </div>
                      `;
                      })
                      .join('')}
                  </div>

                  ${
                    q.explanation
                      ? `
                    <div class="explanation-box mt-2" style="font-size: 0.8125rem; padding: 0.625rem;">
                      <strong>Explanation:</strong> ${escapeHtml(q.explanation)}
                    </div>
                  `
                      : ''
                  }
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `;

      showModal({
        title: `<i class="fa-solid fa-magnifying-glass-chart text-primary"></i> Attempt Detail - ${escapeHtml(student?.full_name)}`,
        contentHtml: modalContent,
        confirmText: 'Close',
        size: 'lg',
      });
    } catch (err) {
      console.error('Failed to inspect attempt:', err);
    }
  };

  document.getElementById('res-search-input').addEventListener('input', renderTable);
  document.getElementById('res-test-filter').addEventListener('change', renderTable);
  document.getElementById('res-status-filter').addEventListener('change', renderTable);

  loadData();
}
