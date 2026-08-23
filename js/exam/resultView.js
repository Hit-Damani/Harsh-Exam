/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - POST-EXAM RESULT SCORECARD & REVIEW
 * ============================================================================
 */

import { store } from '../state.js';
import { db } from '../db.js';
import { formatSeconds, formatDate, escapeHtml, showToast } from '../utils.js';

export async function renderResultView(params) {
  const container = document.getElementById('app-main');
  const attemptId = params.attemptId;
  const currentUser = store.getState().user;
  const isAdmin = store.isAdmin();

  let data = null;
  try {
    data = await db.getAttemptResult(attemptId);
  } catch (err) {
    showToast('Error', 'Could not load examination results: ' + err.message, 'error');
    container.innerHTML = `
      <div class="container empty-state">
        <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation text-danger"></i></div>
        <h3 class="empty-title">Result Not Found</h3>
        <p class="empty-desc">The requested test attempt results could not be located.</p>
        <a href="#/student/dashboard" class="btn btn-primary">Return to Dashboard</a>
      </div>
    `;
    return;
  }

  const { attempt, test, student, questions, answersMap } = data;
  const isPassed = Number(attempt.percentage) >= Number(test.passing_percentage);
  const totalQuestions = questions.length;
  const maxMarks = (totalQuestions * Number(test.marks_per_correct)).toFixed(2);
  const showReview = isAdmin || test.show_answers_after_submission;

  container.innerHTML = `
    <div class="container animate-fade-in" style="max-width: 960px;">
      <!-- Scorecard Hero -->
      <div class="scorecard-hero">
        <div class="scorecard-status-badge ${isPassed ? 'passed' : 'failed'}">
          <i class="fa-solid ${isPassed ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          <span>${isPassed ? 'PASSED' : 'FAILED'}</span>
        </div>

        <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem;">
          ${escapeHtml(test.title)}
        </h1>
        <p class="text-secondary mb-6">
          Student: <strong>${escapeHtml(student?.full_name || 'Student')}</strong> &bull; Submitted on ${formatDate(attempt.submitted_at)}
        </p>

        <!-- Big Score Display -->
        <div class="scorecard-big-score">
          ${attempt.score} <span>/ ${maxMarks}</span>
        </div>
        <div class="scorecard-percent">
          Score Percentage: ${attempt.percentage}% &bull; Passing Mark: ${test.passing_percentage}%
        </div>

        <!-- Metric Stat Pills -->
        <div class="scorecard-stats-row">
          <div class="scorecard-stat-pill">
            <span class="label">Total Qs</span>
            <span class="val font-mono">${totalQuestions}</span>
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
            <span class="label">Positive Marks</span>
            <span class="val font-mono text-success">+${attempt.positive_marks}</span>
          </div>

          <div class="scorecard-stat-pill">
            <span class="label">Negative Marks</span>
            <span class="val font-mono text-danger">-${attempt.negative_marks}</span>
          </div>

          <div class="scorecard-stat-pill">
            <span class="label">Time Taken</span>
            <span class="val font-mono">${formatSeconds(attempt.time_taken_seconds)}</span>
          </div>
        </div>

        <div class="flex-center gap-3 mt-6">
          <a href="${isAdmin ? '#/admin/results' : '#/student/dashboard'}" class="btn btn-primary">
            <i class="fa-solid fa-arrow-left"></i> Back to ${isAdmin ? 'Results Log' : 'Dashboard'}
          </a>
          <button onclick="window.print()" class="btn btn-secondary">
            <i class="fa-solid fa-print"></i> Print Scorecard
          </button>
        </div>
      </div>

      <!-- Question Review Section -->
      ${
        showReview
          ? `
        <div class="mb-6">
          <div class="flex-between mb-4">
            <div>
              <h3 class="font-bold" style="font-size: 1.25rem;"><i class="fa-solid fa-list-check text-primary"></i> Detailed Question Solutions & Review</h3>
              <p class="text-secondary" style="font-size: 0.875rem;">Inspect your answers against correct answers and view complete explanations</p>
            </div>
          </div>

          <div class="review-questions-container">
            ${questions
              .map((q, idx) => {
                const userAns = answersMap[q.id];
                const selectedOptId = userAns?.selected_option_id;
                const sortedOptions = (q.options || []).sort((a, b) => a.option_order - b.option_order);
                const correctOpt = sortedOptions.find((o) => o.is_correct);

                const isCorrect = selectedOptId && correctOpt && selectedOptId === correctOpt.id;
                const isUnanswered = !selectedOptId;
                const isWrong = selectedOptId && !isCorrect;

                let statusBadge = '<span class="badge badge-neutral">Unanswered (0)</span>';
                if (isCorrect) {
                  statusBadge = `<span class="badge badge-passed"><i class="fa-solid fa-check"></i> Correct (+${test.marks_per_correct})</span>`;
                } else if (isWrong) {
                  statusBadge = `<span class="badge badge-failed"><i class="fa-solid fa-xmark"></i> Wrong (${test.negative_marking_enabled ? `-${test.negative_marks_per_wrong}` : '0'})</span>`;
                }

                return `
                <div class="review-question-card">
                  <div class="flex-between mb-3">
                    <span class="font-bold text-primary">Question ${idx + 1}</span>
                    ${statusBadge}
                  </div>

                  <div class="font-bold mb-3" style="font-size: 1.0625rem;">
                    ${escapeHtml(q.question_text)}
                  </div>

                  <div class="flex-col gap-2">
                    ${sortedOptions
                      .map((opt, optIdx) => {
                        const label = String.fromCharCode(65 + optIdx);
                        const isStudentChoice = opt.id === selectedOptId;
                        const isTrueCorrect = !!opt.is_correct;

                        let optClass = 'review-option';
                        let pill = '';

                        if (isTrueCorrect) {
                          optClass += ' correct-choice';
                          pill = '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Correct Answer</span>';
                        }
                        if (isStudentChoice && !isTrueCorrect) {
                          optClass += ' user-wrong-choice';
                          pill = '<span class="badge badge-danger"><i class="fa-solid fa-xmark"></i> Your Answer</span>';
                        }
                        if (isStudentChoice && isTrueCorrect) {
                          pill = '<span class="badge badge-success"><i class="fa-solid fa-check-double"></i> Your Correct Choice</span>';
                        }

                        return `
                        <div class="${optClass}">
                          <div>
                            <strong>${label}.</strong> ${escapeHtml(opt.option_text)}
                          </div>
                          ${pill}
                        </div>
                      `;
                      })
                      .join('')}
                  </div>

                  ${
                    q.explanation
                      ? `
                    <div class="explanation-box">
                      <strong><i class="fa-solid fa-lightbulb text-warning"></i> Solution Explanation:</strong>
                      <p class="mt-1">${escapeHtml(q.explanation)}</p>
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
      `
          : `
        <div class="glass-card text-center py-6 mb-6">
          <div class="stat-icon mb-3" style="margin: 0 auto; --stat-bg: var(--bg-tertiary); --stat-color: var(--text-muted);">
            <i class="fa-solid fa-eye-slash"></i>
          </div>
          <h4 class="font-bold mb-1">Answer Solutions Hidden</h4>
          <p class="text-secondary" style="font-size: 0.875rem; max-width: 460px; margin: 0 auto;">
            The administrator has disabled question-by-question answer review for this test.
          </p>
        </div>
      `
      }
    </div>
  `;
}
