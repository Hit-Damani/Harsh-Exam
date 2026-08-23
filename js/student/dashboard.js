/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - STUDENT DASHBOARD (MOBILE OPTIMIZED)
 * ============================================================================
 */

import { store } from '../state.js';
import { db } from '../db.js';
import { showToast, showModal, escapeHtml } from '../utils.js';
import { router } from '../router.js';

export async function renderStudentDashboard() {
  const container = document.getElementById('app-main');
  const user = store.getState().user;
  const profile = store.getState().profile;

  container.innerHTML = `
    <div class="container animate-fade-in">
      <!-- Greeting Banner -->
      <div class="scorecard-hero mb-4" style="padding: 1.5rem 1.25rem; text-align: left; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="user-badge role-student mb-2"><i class="fa-solid fa-graduation-cap"></i> Student Portal</span>
          <h1 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.2rem;">
            Welcome back, <span style="background: linear-gradient(135deg, var(--primary-light), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${escapeHtml(profile?.full_name || 'Student')}</span>!
          </h1>
          <p class="text-secondary" style="font-size: 0.8125rem;">Explore available examinations, take tests, and track your performance.</p>
        </div>
        <div class="flex-center gap-2">
          <a href="#/student/history" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-clock-rotate-left"></i> My History
          </a>
        </div>
      </div>

      <!-- Quick Summary Stats (Compact & Side-by-Side) -->
      <div class="stats-grid mb-4">
        <div class="stat-card" style="--stat-color: var(--primary);">
          <div class="stat-info">
            <span class="stat-label">Available Tests</span>
            <span class="stat-value" id="student-stat-avail">—</span>
            <span class="stat-subtext">Ready to take</span>
          </div>
          <div class="stat-icon"><i class="fa-solid fa-book-open"></i></div>
        </div>

        <div class="stat-card" style="--stat-color: var(--accent);">
          <div class="stat-info">
            <span class="stat-label">Completed</span>
            <span class="stat-value" id="student-stat-completed">—</span>
            <span class="stat-subtext">Submissions</span>
          </div>
          <div class="stat-icon" style="--stat-bg: var(--accent-glow); --stat-color: var(--accent);"><i class="fa-solid fa-clipboard-check"></i></div>
        </div>

        <div class="stat-card stat-card-full-mobile" style="--stat-color: var(--success);">
          <div class="stat-info">
            <span class="stat-label">Average Score</span>
            <span class="stat-value" id="student-stat-avg">—%</span>
            <span class="stat-subtext">Across all exams</span>
          </div>
          <div class="stat-icon" style="--stat-bg: var(--success-bg); --stat-color: var(--success);"><i class="fa-solid fa-award"></i></div>
        </div>
      </div>

      <!-- Available Exams Section -->
      <div class="flex-between section-header-wrap mb-4">
        <div>
          <h2 class="font-bold" style="font-size: 1.25rem;"><i class="fa-solid fa-layer-group text-primary"></i> Available Examinations</h2>
          <p class="text-secondary" style="font-size: 0.8125rem;">Select an active examination to begin your test</p>
        </div>
        <div class="toolbar-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="student-search-test" class="form-control" placeholder="Search tests..." />
        </div>
      </div>

      <!-- Test Cards Grid -->
      <div id="student-tests-grid" class="test-grid">
        <div class="text-center w-full py-8 text-muted" style="grid-column: 1 / -1;">
          <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
          Loading available tests...
        </div>
      </div>
    </div>
  `;

  let publishedTests = [];
  let userAttempts = [];

  const loadData = async () => {
    try {
      [publishedTests, userAttempts] = await Promise.all([
        db.getTests(false),
        db.getUserAttempts(user.id),
      ]);

      // Calculate stats
      document.getElementById('student-stat-avail').textContent = publishedTests.length;
      document.getElementById('student-stat-completed').textContent = userAttempts.length;

      let avg = 0;
      if (userAttempts.length > 0) {
        const sum = userAttempts.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
        avg = (sum / userAttempts.length).toFixed(1);
      }
      document.getElementById('student-stat-avg').textContent = `${avg}%`;

      renderTests();
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    }
  };

  const renderTests = () => {
    const grid = document.getElementById('student-tests-grid');
    const searchVal = document.getElementById('student-search-test').value.toLowerCase();

    const filtered = publishedTests.filter(
      (t) =>
        t.title.toLowerCase().includes(searchVal) ||
        (t.category && t.category.toLowerCase().includes(searchVal)) ||
        (t.description && t.description.toLowerCase().includes(searchVal))
    );

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state glass-card" style="grid-column: 1 / -1;">
          <div class="empty-icon"><i class="fa-solid fa-file-excel"></i></div>
          <h3 class="empty-title">No Available Tests</h3>
          <p class="empty-desc">There are currently no published examinations matching your search.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map((test) => {
        const hasAttempted = userAttempts.some((a) => a.test_id === test.id);

        return `
        <div class="test-card animate-fade-in" id="student-test-card-${test.id}">
          <div>
            <div class="test-card-header">
              <span class="badge badge-neutral">${escapeHtml(test.category || 'General')}</span>
              ${hasAttempted ? '<span class="badge badge-passed"><i class="fa-solid fa-check"></i> Attempted</span>' : ''}
            </div>

            <h3 class="test-card-title mb-2">${escapeHtml(test.title)}</h3>
            <p class="test-card-desc">${escapeHtml(test.description || 'No specific description provided.')}</p>

            <div class="test-meta-pills">
              <span class="meta-pill" title="Duration">
                <i class="fa-regular fa-clock"></i> ${test.duration_minutes}m
              </span>
              <span class="meta-pill" title="Questions Count">
                <i class="fa-solid fa-list-ol"></i> ${test.question_count} Qs
              </span>
              <span class="meta-pill" title="Marks per Correct">
                <i class="fa-solid fa-plus-circle text-success"></i> +${test.marks_per_correct}
              </span>
              <span class="meta-pill" title="Negative Marking">
                <i class="fa-solid fa-minus-circle ${test.negative_marking_enabled ? 'text-danger' : 'text-muted'}"></i>
                ${test.negative_marking_enabled ? `-${test.negative_marks_per_wrong}` : '0 Neg'}
              </span>
              <span class="meta-pill" title="Passing Percentage">
                <i class="fa-solid fa-percent text-warning"></i> Pass ${test.passing_percentage}%
              </span>
            </div>
          </div>

          <div class="test-card-footer">
            <div>
              <span class="text-muted" style="font-size: 0.75rem;">Max Marks:</span>
              <strong class="font-mono text-primary">${(test.question_count * Number(test.marks_per_correct)).toFixed(0)}</strong>
            </div>

            <button class="btn btn-primary btn-sm btn-start-exam" data-id="${test.id}" data-title="${escapeHtml(test.title)}" data-duration="${test.duration_minutes}" data-pos="${test.marks_per_correct}" data-neg="${test.negative_marks_per_wrong}" data-negenabled="${test.negative_marking_enabled}" data-pass="${test.passing_percentage}" data-qcount="${test.question_count}">
              <i class="fa-solid fa-play"></i> Start Test
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Start Test Modal
    grid.querySelectorAll('.btn-start-exam').forEach((btn) => {
      btn.addEventListener('click', () => {
        const testId = btn.dataset.id;
        const title = btn.dataset.title;
        const duration = btn.dataset.duration;
        const pos = btn.dataset.pos;
        const neg = btn.dataset.neg;
        const negEnabled = btn.dataset.negenabled === 'true';
        const pass = btn.dataset.pass;
        const qCount = parseInt(btn.dataset.qcount, 10);

        if (qCount === 0) {
          showToast('Cannot Start Test', 'This test does not have any questions yet.', 'warning');
          return;
        }

        const instructionsHtml = `
          <div>
            <div class="glass-card mb-3" style="background: var(--bg-tertiary); padding: 1rem;">
              <h4 class="font-bold mb-2">${title}</h4>
              <div class="test-meta-pills">
                <span class="meta-pill"><i class="fa-regular fa-clock"></i> ${duration} Minutes</span>
                <span class="meta-pill"><i class="fa-solid fa-list-ol"></i> ${qCount} Questions</span>
                <span class="meta-pill text-success"><i class="fa-solid fa-plus"></i> +${pos} per correct</span>
                <span class="meta-pill ${negEnabled ? 'text-danger' : 'text-muted'}"><i class="fa-solid fa-minus"></i> ${negEnabled ? `-${neg} wrong` : 'No negative'}</span>
                <span class="meta-pill text-warning"><i class="fa-solid fa-percent"></i> ${pass}% pass</span>
              </div>
            </div>

            <div class="font-bold mb-2" style="font-size: 0.875rem;"><i class="fa-solid fa-circle-info text-primary"></i> Examination Instructions:</div>
            <ul style="padding-left: 1.25rem; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5;" class="mb-3">
              <li>Contains <strong>${qCount} Multiple Choice Questions</strong>.</li>
              <li>Timer of <strong>${duration} minutes</strong> begins immediately.</li>
              <li>Answers are <strong>automatically saved in real-time</strong>.</li>
              <li>Auto-submits when time runs out.</li>
              ${negEnabled ? `<li class="text-danger"><strong>Caution:</strong> Negative marking is enabled (-${neg} for wrong answers).</li>` : ''}
            </ul>

            <div class="role-notice-banner" style="margin-bottom: 0;">
              <i class="fa-solid fa-shield-halved"></i>
              <span>Ensure stable connection. Good luck!</span>
            </div>
          </div>
        `;

        showModal({
          title: '<i class="fa-solid fa-pen-fancy text-primary"></i> Exam Instructions',
          contentHtml: instructionsHtml,
          confirmText: 'Begin Exam',
          cancelText: 'Cancel',
          confirmClass: 'btn-primary',
          size: 'md',
          onConfirm: () => {
            router.navigate(`#/exam/${testId}`);
          },
        });
      });
    });
  };

  document.getElementById('student-search-test').addEventListener('input', renderTests);
  loadData();
}
