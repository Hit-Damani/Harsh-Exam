/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - EXAM RUNNER ENGINE & CONTROLLER
 * ============================================================================
 */

import { store } from '../state.js';
import { db } from '../db.js';
import { formatSeconds, showToast, showModal, escapeHtml, debounce } from '../utils.js';
import { router } from '../router.js';

let timerInterval = null;

export async function renderExamEngine(params) {
  const container = document.getElementById('app-main');
  const testId = params.testId;
  const user = store.getState().user;

  // Reset any previous exam state
  store.resetExamState();
  if (timerInterval) clearInterval(timerInterval);

  let test = null;
  let questions = [];
  let attempt = null;
  let answersMap = {};

  try {
    test = await db.getTestById(testId);
    if (!test || (test.status !== 'published' && !store.isAdmin())) {
      showToast('Unavailable', 'This test is currently not available for taking.', 'error');
      router.navigate('#/student/dashboard');
      return;
    }

    questions = await db.getQuestionsForTest(testId, false);
    if (!questions || questions.length === 0) {
      showToast('Empty Test', 'This test does not have any questions yet.', 'warning');
      router.navigate('#/student/dashboard');
      return;
    }

    // Start or resume attempt
    const attemptData = await db.startOrResumeAttempt(testId, user.id);
    attempt = attemptData.attempt;
    answersMap = attemptData.answersMap || {};

    if (attempt.status === 'completed' || attempt.status === 'expired') {
      showToast('Already Completed', 'You have already submitted this examination.', 'info');
      router.navigate(`#/result/${attempt.id}`);
      return;
    }
  } catch (err) {
    showToast('Failed to start test', err.message, 'error');
    router.navigate('#/student/dashboard');
    return;
  }

  // Calculate elapsed & remaining time
  const totalDurationSeconds = test.duration_minutes * 60;
  const startedAtMs = new Date(attempt.started_at).getTime();
  const nowMs = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  let remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

  if (remainingSeconds <= 0) {
    showToast('Time Expired', 'The allocated time for this test has already expired.', 'warning');
    await finalizeSubmission(attempt.id, test, questions, answersMap, totalDurationSeconds);
    return;
  }

  // State setup
  let currentIndex = 0;
  const visitedQuestions = new Set([0]);

  // Render Exam Shell
  container.innerHTML = `
    <div class="animate-fade-in" style="min-height: 100vh;">
      <!-- Sticky Exam Header -->
      <header class="exam-header">
        <div class="exam-test-meta">
          <h2><i class="fa-solid fa-graduation-cap text-primary"></i> ${escapeHtml(test.title)}</h2>
          <span>Category: <strong>${escapeHtml(test.category || 'General')}</strong> &bull; Total Qs: <strong>${questions.length}</strong></span>
        </div>

        <div class="flex-center gap-4">
          <!-- Autosave Indicator -->
          <div id="exam-autosave-status" class="exam-autosave-indicator saved">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>All answers synced</span>
          </div>

          <!-- Timer Box -->
          <div id="exam-timer" class="exam-timer-box">
            <i class="fa-regular fa-clock"></i>
            <span id="exam-timer-text">${formatSeconds(remainingSeconds)}</span>
          </div>

          <button id="btn-finish-exam" class="btn btn-success btn-sm">
            <i class="fa-solid fa-circle-check"></i> Submit Test
          </button>
        </div>
      </header>

      <!-- Main Exam Layout Grid -->
      <div class="container exam-grid-layout">
        <!-- Question Pane -->
        <main class="exam-question-card" id="exam-question-pane">
          <!-- Rendered via JS -->
        </main>

        <!-- Question Palette Sidebar -->
        <aside class="exam-palette-card">
          <div class="palette-title">
            <span><i class="fa-solid fa-table-cells-large text-primary"></i> Question Palette</span>
            <span class="badge badge-neutral" id="palette-progress-badge">1 / ${questions.length}</span>
          </div>

          <!-- Palette Button Grid -->
          <div class="palette-grid" id="exam-palette-grid">
            <!-- Rendered via JS -->
          </div>

          <!-- Palette Color Legend -->
          <div class="palette-legend">
            <div class="legend-item">
              <div class="legend-dot status-answered"></div>
              <span>Answered (<strong id="count-answered">0</strong>)</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot status-unanswered"></div>
              <span>Visited / Unanswered (<strong id="count-unanswered">0</strong>)</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot status-review"></div>
              <span>Marked for Review (<strong id="count-review">0</strong>)</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot status-ans-review"></div>
              <span>Answered &amp; Review (<strong id="count-ans-review">0</strong>)</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot status-unvisited"></div>
              <span>Not Visited (<strong id="count-unvisited">${questions.length}</strong>)</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  // Start Live Timer
  const timerBox = document.getElementById('exam-timer');
  const timerText = document.getElementById('exam-timer-text');

  timerInterval = setInterval(async () => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerText.textContent = '00:00';
      showToast('Time Up!', 'Your examination time has expired. Submitting your answers now...', 'warning', 5000);
      await finalizeSubmission(attempt.id, test, questions, answersMap, totalDurationSeconds);
      return;
    }

    timerText.textContent = formatSeconds(remainingSeconds);

    if (remainingSeconds <= 60) {
      timerBox.className = 'exam-timer-box danger-time';
    } else if (remainingSeconds <= 300) {
      timerBox.className = 'exam-timer-box warning-time';
    }
  }, 1000);

  // Autosave Helper
  const setAutosaveStatus = (status) => {
    const el = document.getElementById('exam-autosave-status');
    if (!el) return;
    if (status === 'saving') {
      el.className = 'exam-autosave-indicator text-warning';
      el.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> <span>Saving...</span>';
    } else {
      el.className = 'exam-autosave-indicator saved';
      el.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>All answers synced</span>';
    }
  };

  const debouncedDbSync = debounce(async (qId, optId, isReview) => {
    try {
      await db.saveAttemptAnswer(attempt.id, qId, optId, isReview);
      setAutosaveStatus('saved');
    } catch (e) {
      console.warn('Autosave error:', e);
    }
  }, 400);

  // Render Current Question
  const renderCurrentQuestion = () => {
    const qPane = document.getElementById('exam-question-pane');
    const q = questions[currentIndex];
    visitedQuestions.add(currentIndex);

    const userAns = answersMap[q.id] || { selected_option_id: null, is_marked_for_review: false };
    const sortedOptions = (q.options || []).sort((a, b) => a.option_order - b.option_order);

    qPane.innerHTML = `
      <div>
        <div class="exam-question-top">
          <div class="exam-question-num">
            Question ${currentIndex + 1} of ${questions.length}
          </div>
          <div class="exam-question-marks">
            <span class="badge badge-success">+${test.marks_per_correct} marks</span>
            ${
              test.negative_marking_enabled
                ? `<span class="badge badge-danger">-${test.negative_marks_per_wrong} negative</span>`
                : '<span class="badge badge-neutral">No negative</span>'
            }
          </div>
        </div>

        <div class="exam-question-text">${escapeHtml(q.question_text)}</div>

        ${
          q.image_url
            ? `
          <div class="exam-question-image-wrap mb-4">
            <div class="exam-question-image-card" id="exam-img-zoom-trigger">
              <img src="${escapeHtml(q.image_url)}" alt="Question Diagram" class="exam-question-img" />
              <div class="exam-img-zoom-hint">
                <i class="fa-solid fa-magnifying-glass-plus"></i> Click diagram to enlarge
              </div>
            </div>
          </div>
        `
            : ''
        }

        <div class="exam-options-group" id="options-container">
          ${sortedOptions
            .map((opt, optIdx) => {
              const label = String.fromCharCode(65 + optIdx);
              const isSelected = userAns.selected_option_id === opt.id;
              return `
              <div class="exam-option-item ${isSelected ? 'selected' : ''}" data-opt-id="${opt.id}">
                <input type="radio" name="exam-mcq-choice" class="exam-option-radio" value="${opt.id}" ${isSelected ? 'checked' : ''} />
                <span class="exam-option-key">${label}</span>
                <span class="exam-option-text">${escapeHtml(opt.option_text)}</span>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <div>
        <div class="flex-between mb-3">
          <label class="toggle-switch">
            <input type="checkbox" id="check-mark-review" ${userAns.is_marked_for_review ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span style="font-size: 0.875rem; font-weight: 600; color: var(--purple);">Mark for Review</span>
          </label>

          ${
            userAns.selected_option_id
              ? '<button type="button" id="btn-clear-selection" class="btn btn-outline btn-sm"><i class="fa-solid fa-eraser"></i> Clear Choice</button>'
              : ''
          }
        </div>

        <div class="exam-nav-actions">
          <button id="btn-prev-q" class="btn btn-secondary" ${currentIndex === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-left"></i> Previous
          </button>

          <div class="flex-center gap-2">
            ${
              currentIndex < questions.length - 1
                ? `<button id="btn-next-q" class="btn btn-primary"><span>Next Question</span> <i class="fa-solid fa-arrow-right"></i></button>`
                : `<button id="btn-submit-q-last" class="btn btn-success"><i class="fa-solid fa-check-double"></i> Submit Examination</button>`
            }
          </div>
        </div>
      </div>
    `;

    // Question Image Click-to-Enlarge Zoom
    const zoomTrigger = qPane.querySelector('#exam-img-zoom-trigger');
    if (zoomTrigger && q.image_url) {
      zoomTrigger.addEventListener('click', () => {
        showModal({
          title: `<i class="fa-solid fa-image text-primary"></i> Question Diagram (Enlarged)`,
          contentHtml: `
            <div class="text-center p-2" style="max-height: 75vh; overflow: auto;">
              <img src="${escapeHtml(q.image_url)}" alt="Question Diagram Full View" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: var(--shadow-lg);" />
            </div>
          `,
          confirmText: 'Done',
          size: 'lg',
        });
      });
    }

    // Option Selection Handlers
    qPane.querySelectorAll('.exam-option-item').forEach((item) => {
      item.addEventListener('click', () => {
        const optId = item.dataset.optId;
        const currentAns = answersMap[q.id] || { selected_option_id: null, is_marked_for_review: false };

        answersMap[q.id] = {
          ...currentAns,
          selected_option_id: optId,
        };

        setAutosaveStatus('saving');
        debouncedDbSync(q.id, optId, currentAns.is_marked_for_review);
        renderCurrentQuestion();
        updatePalette();
      });
    });

    // Mark for Review Toggle
    document.getElementById('check-mark-review')?.addEventListener('change', (e) => {
      const isReview = e.target.checked;
      const currentAns = answersMap[q.id] || { selected_option_id: null, is_marked_for_review: false };

      answersMap[q.id] = {
        ...currentAns,
        is_marked_for_review: isReview,
      };

      setAutosaveStatus('saving');
      debouncedDbSync(q.id, currentAns.selected_option_id, isReview);
      updatePalette();
    });

    // Clear Selection
    document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
      const currentAns = answersMap[q.id] || { selected_option_id: null, is_marked_for_review: false };
      answersMap[q.id] = {
        ...currentAns,
        selected_option_id: null,
      };

      setAutosaveStatus('saving');
      debouncedDbSync(q.id, null, currentAns.is_marked_for_review);
      renderCurrentQuestion();
      updatePalette();
    });

    // Previous / Next Buttons
    document.getElementById('btn-prev-q')?.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
        updatePalette();
      }
    });

    document.getElementById('btn-next-q')?.addEventListener('click', () => {
      if (currentIndex < questions.length - 1) {
        currentIndex++;
        renderCurrentQuestion();
        updatePalette();
      }
    });

    document.getElementById('btn-submit-q-last')?.addEventListener('click', () => {
      confirmAndSubmit();
    });

    updatePalette();
  };

  // Update Palette Grid & Counters
  const updatePalette = () => {
    const paletteGrid = document.getElementById('exam-palette-grid');
    if (!paletteGrid) return;

    let countAns = 0;
    let countUnans = 0;
    let countRev = 0;
    let countAnsRev = 0;
    let countUnvis = 0;

    paletteGrid.innerHTML = questions
      .map((q, idx) => {
        const isVisited = visitedQuestions.has(idx);
        const ans = answersMap[q.id];
        const isSelected = !!ans?.selected_option_id;
        const isReview = !!ans?.is_marked_for_review;

        let statusClass = 'status-unvisited';

        if (!isVisited) {
          statusClass = 'status-unvisited';
          countUnvis++;
        } else if (isSelected && isReview) {
          statusClass = 'status-ans-review';
          countAnsRev++;
        } else if (isReview) {
          statusClass = 'status-review';
          countRev++;
        } else if (isSelected) {
          statusClass = 'status-answered';
          countAns++;
        } else {
          statusClass = 'status-unanswered';
          countUnans++;
        }

        const isCurrent = idx === currentIndex;

        return `
        <button class="palette-btn ${statusClass} ${isCurrent ? 'current' : ''}" data-idx="${idx}" title="Question ${idx + 1}">
          ${idx + 1}
        </button>
      `;
      })
      .join('');

    // Update Counts in Legend
    document.getElementById('count-answered').textContent = countAns;
    document.getElementById('count-unanswered').textContent = countUnans;
    document.getElementById('count-review').textContent = countRev;
    document.getElementById('count-ans-review').textContent = countAnsRev;
    document.getElementById('count-unvisited').textContent = countUnvis;
    document.getElementById('palette-progress-badge').textContent = `${currentIndex + 1} / ${questions.length}`;

    // Click handler for jumping directly to questions
    paletteGrid.querySelectorAll('.palette-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentIndex = parseInt(btn.dataset.idx, 10);
        renderCurrentQuestion();
      });
    });
  };

  // Submit Confirmation Dialog
  const confirmAndSubmit = () => {
    let answered = 0;
    let markedReview = 0;

    questions.forEach((q) => {
      const ans = answersMap[q.id];
      if (ans?.selected_option_id) answered++;
      if (ans?.is_marked_for_review) markedReview++;
    });

    const unanswered = questions.length - answered;

    const modalContent = `
      <div>
        <p class="text-secondary mb-4">
          Are you sure you want to finish and submit your test? You will not be able to change your answers after submission.
        </p>

        <div class="glass-card" style="background: var(--bg-tertiary);">
          <h4 class="font-bold mb-3"><i class="fa-solid fa-list-check text-primary"></i> Submission Summary</h4>
          <div class="scorecard-stats-row">
            <div class="scorecard-stat-pill">
              <span class="label">Total Questions</span>
              <span class="val font-mono">${questions.length}</span>
            </div>
            <div class="scorecard-stat-pill">
              <span class="label">Answered</span>
              <span class="val font-mono text-success">${answered}</span>
            </div>
            <div class="scorecard-stat-pill">
              <span class="label">Unanswered</span>
              <span class="val font-mono ${unanswered > 0 ? 'text-warning' : 'text-muted'}">${unanswered}</span>
            </div>
            <div class="scorecard-stat-pill">
              <span class="label">For Review</span>
              <span class="val font-mono text-purple">${markedReview}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    showModal({
      title: '<i class="fa-solid fa-circle-question text-warning"></i> Confirm Test Submission',
      contentHtml: modalContent,
      confirmText: 'Yes, Submit Test',
      cancelText: 'Continue Test',
      confirmClass: 'btn-success',
      size: 'md',
      onConfirm: async () => {
        const timeTaken = totalDurationSeconds - remainingSeconds;
        await finalizeSubmission(attempt.id, test, questions, answersMap, timeTaken);
      },
    });
  };

  document.getElementById('btn-finish-exam')?.addEventListener('click', confirmAndSubmit);

  renderCurrentQuestion();
}

/**
 * Submits the attempt to Supabase and navigates to the result view
 */
async function finalizeSubmission(attemptId, test, questions, answersMap, timeTakenSeconds) {
  if (timerInterval) clearInterval(timerInterval);

  // Format answers array payload for RPC
  const answersPayload = questions.map((q) => {
    const ans = answersMap[q.id] || {};
    return {
      question_id: q.id,
      selected_option_id: ans.selected_option_id || null,
      is_marked_for_review: !!ans.is_marked_for_review,
    };
  });

  const loadingModalHtml = `
    <div class="text-center py-6">
      <div class="loading-spinner" style="margin: 0 auto 1.5rem;"></div>
      <h3 class="font-bold mb-2">Calculating Your Results...</h3>
      <p class="text-secondary">Securing your answers and evaluating scores according to test marking rules.</p>
    </div>
  `;

  showModal({
    title: 'Submitting Examination',
    contentHtml: loadingModalHtml,
    hideFooter: true,
    size: 'sm',
  });

  try {
    const result = await db.submitAttempt(attemptId, answersPayload, timeTakenSeconds);
    showToast('Test Completed', 'Your examination has been submitted successfully!', 'success');
    router.navigate(`#/result/${attemptId}`);
  } catch (err) {
    console.error('Submission failed:', err);
    showToast('Submission Error', err.message, 'error');
  }
}
