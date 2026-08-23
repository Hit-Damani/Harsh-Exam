/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - TEST EDITOR (CREATE / EDIT)
 * ============================================================================
 */

import { db } from '../db.js';
import { showToast, escapeHtml } from '../utils.js';
import { router } from '../router.js';

export async function renderTestEditor(params = {}) {
  const container = document.getElementById('app-main');
  const isEdit = !!params.id;

  let existingTest = null;
  if (isEdit) {
    try {
      existingTest = await db.getTestById(params.id);
    } catch (err) {
      showToast('Error', 'Test not found.', 'error');
      router.navigate('#/admin/tests');
      return;
    }
  }

  container.innerHTML = `
    <div class="container animate-fade-in" style="max-width: 860px;">
      <div class="admin-header">
        <div class="admin-title-group">
          <h1>
            <i class="fa-solid ${isEdit ? 'fa-pen-to-square' : 'fa-plus-circle'} text-primary"></i>
            ${isEdit ? 'Edit Test Configuration' : 'Create New Examination Test'}
          </h1>
          <p>Configure test parameters, timing, and custom positive/negative marking rules</p>
        </div>
        <div class="toolbar-actions">
          <a href="#/admin/tests" class="btn btn-secondary">
            <i class="fa-solid fa-arrow-left"></i> Back to Tests
          </a>
        </div>
      </div>

      <form id="test-editor-form" class="glass-card">
        <div class="form-group">
          <label class="form-label" for="test-title">
            <span>Test Title *</span>
            <span class="helper">Descriptive name for the exam</span>
          </label>
          <input type="text" id="test-title" class="form-control" placeholder="e.g. JavaScript Advanced Certification 2026" required value="${escapeHtml(existingTest?.title || '')}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="test-description">Description & Instructions</label>
          <textarea id="test-description" class="form-control" placeholder="Explain the syllabus, rules, and expectations to students...">${escapeHtml(existingTest?.description || '')}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="test-category">Category / Subject</label>
            <input type="text" id="test-category" class="form-control" placeholder="e.g. Web Development, Aptitude, Physics" value="${escapeHtml(existingTest?.category || 'General')}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="test-duration">
              <span>Duration (Minutes) *</span>
            </label>
            <input type="number" id="test-duration" class="form-control" min="1" max="600" step="1" required value="${existingTest?.duration_minutes || 30}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="test-pass-percent">
              <span>Passing Percentage (%) *</span>
            </label>
            <input type="number" id="test-pass-percent" class="form-control" min="0" max="100" step="0.5" required value="${existingTest?.passing_percentage || 40}" />
          </div>
        </div>

        <!-- Configurable Marking Rules Card -->
        <div class="marking-rule-card mt-4">
          <h4 class="font-bold flex-between mb-4">
            <span><i class="fa-solid fa-calculator text-primary"></i> Configurable Marking System</span>
            <label class="toggle-switch">
              <input type="checkbox" id="test-neg-enabled" ${existingTest?.negative_marking_enabled ? 'checked' : ''} />
              <span class="toggle-slider"></span>
              <span style="font-size: 0.875rem; font-weight: 600;">Enable Negative Marking</span>
            </label>
          </h4>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="test-pos-marks">
                <span>Marks per Correct Answer (+X) *</span>
                <span class="helper">Marks awarded for right answer</span>
              </label>
              <input type="number" id="test-pos-marks" class="form-control" min="0.25" step="0.25" required value="${existingTest?.marks_per_correct || 4}" />
            </div>

            <div class="form-group" id="neg-marks-group" style="${existingTest?.negative_marking_enabled ? '' : 'opacity: 0.5;'}">
              <label class="form-label" for="test-neg-marks">
                <span>Negative Marks per Wrong Answer (-Y)</span>
                <span class="helper">Supports decimals: 0.25, 0.5, 1, etc.</span>
              </label>
              <input type="number" id="test-neg-marks" class="form-control" min="0" step="0.25" value="${existingTest?.negative_marks_per_wrong || 1}" ${existingTest?.negative_marking_enabled ? '' : 'disabled'} />
            </div>
          </div>

          <!-- Live Score Formula Preview -->
          <div class="marking-formula-preview">
            <div class="font-bold mb-1"><i class="fa-solid fa-circle-info"></i> Marking Calculation Rule Preview:</div>
            <div id="formula-preview-text">
              • Correct Answer = <span class="formula-highlight">+4.00 marks</span><br />
              • Wrong Answer = <span class="formula-highlight">-1.00 marks</span><br />
              • Unanswered = <span class="formula-highlight">0.00 marks</span><br />
              • Formula: <span class="formula-highlight">Final Score = MAX(0, (Correct × 4) - (Wrong × 1))</span>
            </div>
          </div>
        </div>

        <!-- Additional Settings & Toggles -->
        <div class="form-row mt-4">
          <div class="form-group">
            <label class="form-label">Review Answers After Submission</label>
            <label class="toggle-switch mt-2">
              <input type="checkbox" id="test-show-answers" ${existingTest ? (existingTest.show_answers_after_submission ? 'checked' : '') : 'checked'} />
              <span class="toggle-slider"></span>
              <span style="font-size: 0.875rem;">Allow students to view correct answers & explanations after submitting</span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label" for="test-status">Initial Status</label>
            <select id="test-status" class="form-control">
              <option value="draft" ${existingTest?.status === 'draft' ? 'selected' : ''}>Draft (Hidden from students)</option>
              <option value="published" ${existingTest?.status === 'published' ? 'selected' : ''}>Published (Available to students)</option>
            </select>
          </div>
        </div>

        <div class="flex-between mt-6 pt-4" style="border-top: 1px solid var(--border-color);">
          <a href="#/admin/tests" class="btn btn-secondary">Cancel</a>
          <button type="submit" id="btn-save-test" class="btn btn-primary btn-lg">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>${isEdit ? 'Save Changes' : 'Save & Continue to Questions'}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  // UI Interactive Updates
  const negToggle = document.getElementById('test-neg-enabled');
  const negInput = document.getElementById('test-neg-marks');
  const negGroup = document.getElementById('neg-marks-group');
  const posInput = document.getElementById('test-pos-marks');
  const formulaPreview = document.getElementById('formula-preview-text');

  const updateFormulaPreview = () => {
    const isNeg = negToggle.checked;
    const pos = parseFloat(posInput.value) || 0;
    const neg = isNeg ? parseFloat(negInput.value) || 0 : 0;

    negInput.disabled = !isNeg;
    negGroup.style.opacity = isNeg ? '1' : '0.5';

    formulaPreview.innerHTML = `
      • Correct Answer = <span class="formula-highlight">+${pos.toFixed(2)} marks</span><br />
      • Wrong Answer = <span class="formula-highlight">${isNeg ? `-${neg.toFixed(2)} marks` : '0.00 marks (Negative Marking OFF)'}</span><br />
      • Unanswered = <span class="formula-highlight">0.00 marks</span><br />
      • Formula: <span class="formula-highlight">Final Score = MAX(0, (Correct × ${pos}) - (${isNeg ? `Wrong × ${neg}` : '0'}))</span>
    `;
  };

  negToggle.addEventListener('change', updateFormulaPreview);
  posInput.addEventListener('input', updateFormulaPreview);
  negInput.addEventListener('input', updateFormulaPreview);
  updateFormulaPreview();

  // Form Submit Handler
  document.getElementById('test-editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('test-title').value.trim();
    const description = document.getElementById('test-description').value.trim();
    const category = document.getElementById('test-category').value.trim() || 'General';
    const duration_minutes = parseInt(document.getElementById('test-duration').value, 10);
    const passing_percentage = parseFloat(document.getElementById('test-pass-percent').value);
    const marks_per_correct = parseFloat(document.getElementById('test-pos-marks').value);
    const negative_marking_enabled = negToggle.checked;
    const negative_marks_per_wrong = negative_marking_enabled ? parseFloat(negInput.value) || 0 : 0;
    const show_answers_after_submission = document.getElementById('test-show-answers').checked;
    const status = document.getElementById('test-status').value;

    const payload = {
      title,
      description,
      category,
      duration_minutes,
      passing_percentage,
      marks_per_correct,
      negative_marks_per_wrong,
      negative_marking_enabled,
      show_answers_after_submission,
      status,
    };

    const submitBtn = document.getElementById('btn-save-test');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loading-spinner loading-spinner-sm"></div> Saving...`;

    try {
      if (isEdit) {
        await db.updateTest(params.id, payload);
        showToast('Success', 'Test configuration updated.', 'success');
        router.navigate('#/admin/tests');
      } else {
        const created = await db.createTest(payload);
        showToast('Test Created', 'Test created! Now add your questions.', 'success');
        router.navigate(`#/admin/tests/${created.id}/questions`);
      }
    } catch (err) {
      showToast('Save Failed', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${isEdit ? 'Save Changes' : 'Save & Continue'}</span>`;
    }
  });
}
