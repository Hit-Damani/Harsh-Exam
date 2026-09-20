/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - INTERACTIVE QUESTION BUILDER
 * ============================================================================
 */

import { db } from '../db.js';
import { showToast, showModal, escapeHtml } from '../utils.js';
import { router } from '../router.js';

export async function renderQuestionBuilder(params) {
  const container = document.getElementById('app-main');
  const testId = params.id;

  let test = null;
  let questions = [];

  try {
    test = await db.getTestById(testId);
    questions = await db.getQuestionsForTest(testId, true);
  } catch (err) {
    showToast('Error', 'Failed to load test: ' + err.message, 'error');
    router.navigate('#/admin/tests');
    return;
  }

  container.innerHTML = `
    <div class="container animate-fade-in" style="max-width: 960px;">
      <!-- Header -->
      <div class="admin-header">
        <div class="admin-title-group">
          <div class="flex-center gap-2 mb-1">
            <span class="badge badge-neutral">${escapeHtml(test.category || 'General')}</span>
            <span class="badge badge-${test.status === 'published' ? 'published' : 'draft'}">${test.status}</span>
          </div>
          <h1><i class="fa-solid fa-list-check text-primary"></i> ${escapeHtml(test.title)}</h1>
          <p>Manage MCQ questions, configure options, select correct answers, and provide explanations</p>
        </div>
        <div class="toolbar-actions">
          <a href="#/admin/tests/${test.id}/edit" class="btn btn-secondary btn-sm" title="Edit Test Settings">
            <i class="fa-solid fa-gear"></i> Settings
          </a>
          <button id="btn-quick-publish" class="btn btn-${test.status === 'published' ? 'outline' : 'success'} btn-sm">
            <i class="fa-solid ${test.status === 'published' ? 'fa-eye-slash' : 'fa-globe'}"></i>
            ${test.status === 'published' ? 'Unpublish' : 'Publish Test'}
          </button>
          <a href="#/admin/tests" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-arrow-left"></i> Tests
          </a>
        </div>
      </div>

      <!-- Question Builder Controls -->
      <div class="flex-between mb-4 flex-wrap gap-2">
        <div class="font-bold text-secondary" id="question-count-text">
          Total Questions: <span class="text-primary font-mono" id="q-total-count">${questions.length}</span>
          (Max Marks: <span class="text-accent font-mono" id="q-total-marks">${(questions.length * Number(test.marks_per_correct)).toFixed(2)}</span>)
        </div>
        <button id="btn-add-new-question" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i> Add New MCQ Question
        </button>
      </div>

      <!-- Questions List Container -->
      <div id="questions-list-container">
        <!-- Rendered via JS -->
      </div>
    </div>
  `;

  // Quick Publish Handler
  document.getElementById('btn-quick-publish').addEventListener('click', async () => {
    try {
      const updated = await db.toggleTestPublish(test.id, test.status);
      test.status = updated.status;
      showToast(
        'Status Updated',
        `Test is now ${test.status === 'published' ? 'Published for students' : 'saved as Draft'}.`,
        'success'
      );
      renderQuestionBuilder(params);
    } catch (e) {
      showToast('Error', e.message, 'error');
    }
  });

  const renderQuestionsList = () => {
    const listContainer = document.getElementById('questions-list-container');
    document.getElementById('q-total-count').textContent = questions.length;
    document.getElementById('q-total-marks').textContent = (questions.length * Number(test.marks_per_correct)).toFixed(2);

    if (questions.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state glass-card">
          <div class="empty-icon"><i class="fa-solid fa-file-circle-question"></i></div>
          <h3 class="empty-title">No Questions Added Yet</h3>
          <p class="empty-desc">Click the button below to add your first multiple-choice question to this test.</p>
          <button id="btn-empty-add" class="btn btn-primary">
            <i class="fa-solid fa-plus"></i> Add First Question
          </button>
        </div>
      `;
      document.getElementById('btn-empty-add')?.addEventListener('click', () => openQuestionModal());
      return;
    }

    listContainer.innerHTML = questions
      .map((q, idx) => {
        const sortedOptions = (q.options || []).sort((a, b) => a.option_order - b.option_order);
        const correctOpt = sortedOptions.find((o) => o.is_correct);

        return `
        <div class="question-item-card animate-fade-in" id="q-card-${q.id}">
          <div class="question-item-header">
            <div class="flex-center gap-3">
              <span class="question-badge-number">${idx + 1}</span>
              <div>
                <div class="font-bold" style="font-size: 1.0625rem; max-width: 580px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(q.question_text)}
                </div>
                ${
                  q.image_url
                    ? `
                  <div class="question-card-image-meta mt-2 flex-center gap-2">
                    <img src="${escapeHtml(q.image_url)}" alt="Question Diagram" class="question-card-thumb-img" />
                    <span class="badge badge-neutral" style="font-size: 0.75rem;"><i class="fa-solid fa-image text-primary"></i> Diagram Attached</span>
                  </div>
                `
                    : ''
                }
              </div>
            </div>
            <div class="question-item-controls">
              <button class="btn btn-icon btn-secondary btn-sm btn-move-up" data-id="${q.id}" data-idx="${idx}" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button class="btn btn-icon btn-secondary btn-sm btn-move-down" data-id="${q.id}" data-idx="${idx}" title="Move Down" ${idx === questions.length - 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-arrow-down"></i>
              </button>
              <button class="btn btn-icon btn-secondary btn-sm btn-dup-q" data-id="${q.id}" title="Duplicate Question">
                <i class="fa-regular fa-copy"></i>
              </button>
              <button class="btn btn-icon btn-secondary btn-sm btn-edit-q" data-id="${q.id}" title="Edit Question">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-icon btn-danger btn-sm btn-del-q" data-id="${q.id}" title="Delete Question">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="options-builder-list mt-3">
            ${sortedOptions
              .map((opt, optIdx) => {
                const label = String.fromCharCode(65 + optIdx);
                const isCorrect = !!opt.is_correct;
                return `
                <div class="option-builder-row ${isCorrect ? 'is-correct' : ''}">
                  <span class="option-label-tag">${label}.</span>
                  <div class="flex-1" style="font-size: 0.9375rem; color: ${isCorrect ? 'var(--success)' : 'var(--text-primary)'};">
                    ${escapeHtml(opt.option_text)}
                  </div>
                  ${
                    isCorrect
                      ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Correct Answer</span>'
                      : ''
                  }
                </div>
              `;
              })
              .join('')}
          </div>

          ${
            q.explanation
              ? `
            <div class="explanation-box">
              <strong><i class="fa-solid fa-lightbulb text-warning"></i> Explanation:</strong>
              ${escapeHtml(q.explanation)}
            </div>
          `
              : ''
          }
        </div>
      `;
      })
      .join('');

    // Attach Action Listeners
    listContainer.querySelectorAll('.btn-edit-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = questions.find((item) => item.id === btn.dataset.id);
        openQuestionModal(q);
      });
    });

    listContainer.querySelectorAll('.btn-dup-q').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await db.duplicateQuestion(btn.dataset.id);
          showToast('Duplicated', 'Question duplicated successfully.', 'success');
          questions = await db.getQuestionsForTest(testId, true);
          renderQuestionsList();
        } catch (e) {
          showToast('Error', e.message, 'error');
        }
      });
    });

    listContainer.querySelectorAll('.btn-del-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        showModal({
          title: '<i class="fa-solid fa-trash text-danger"></i> Delete Question',
          contentHtml: '<p>Are you sure you want to delete this question? This action cannot be undone.</p>',
          confirmText: 'Delete',
          confirmClass: 'btn-danger',
          cancelText: 'Cancel',
          onConfirm: async () => {
            try {
              await db.deleteQuestion(btn.dataset.id);
              showToast('Deleted', 'Question removed.', 'info');
              questions = await db.getQuestionsForTest(testId, true);
              renderQuestionsList();
            } catch (e) {
              showToast('Error', e.message, 'error');
            }
          },
        });
      });
    });

    listContainer.querySelectorAll('.btn-move-up').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx > 0) {
          const temp = questions[idx];
          questions[idx] = questions[idx - 1];
          questions[idx - 1] = temp;
          await db.reorderQuestions(questions);
          renderQuestionsList();
        }
      });
    });

    listContainer.querySelectorAll('.btn-move-down').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx < questions.length - 1) {
          const temp = questions[idx];
          questions[idx] = questions[idx + 1];
          questions[idx + 1] = temp;
          await db.reorderQuestions(questions);
          renderQuestionsList();
        }
      });
    });
  };

  // Open Add/Edit Question Modal
  const openQuestionModal = (existingQ = null) => {
    let currentImageUrl = existingQ?.image_url || null;
    let pendingImageFile = null;

    let optionsList = existingQ?.options?.length
      ? existingQ.options.map((o) => ({ ...o }))
      : [
          { option_text: '', is_correct: true },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ];

    const generateOptionsHtml = () => {
      return optionsList
        .map((opt, idx) => {
          const label = String.fromCharCode(65 + idx);
          return `
          <div class="option-builder-row ${opt.is_correct ? 'is-correct' : ''}" id="modal-opt-row-${idx}">
            <input type="radio" name="modal-correct-opt" class="option-correct-radio" value="${idx}" ${opt.is_correct ? 'checked' : ''} title="Mark as correct answer" />
            <span class="option-label-tag">${label}.</span>
            <input type="text" class="form-control modal-opt-input" data-idx="${idx}" placeholder="Enter option text..." value="${escapeHtml(opt.option_text || '')}" required />
            ${
              optionsList.length > 2
                ? `<button type="button" class="btn btn-icon btn-danger btn-sm modal-del-opt" data-idx="${idx}" title="Remove option"><i class="fa-solid fa-xmark"></i></button>`
                : ''
            }
          </div>
        `;
        })
        .join('');
    };

    const modalBody = `
      <form id="modal-question-form">
        <div class="form-group">
          <label class="form-label" for="modal-q-text">
            <span>Question Statement *</span>
            <span class="helper">Clear and precise question</span>
          </label>
          <textarea id="modal-q-text" class="form-control" rows="3" placeholder="Type the question here..." required>${escapeHtml(existingQ?.question_text || '')}</textarea>
        </div>

        <!-- Question Image Upload / Diagram Section -->
        <div class="form-group">
          <label class="form-label">
            <span><i class="fa-solid fa-image text-primary"></i> Question Image / Diagram (Optional)</span>
            <span class="helper">Attach a diagram, circuit, chart, or photo</span>
          </label>

          <div class="question-image-upload-wrapper">
            <!-- Image Preview Box -->
            <div id="modal-image-preview-box" class="question-image-preview-card ${currentImageUrl ? '' : 'd-none'}">
              <div class="preview-img-container">
                <img id="modal-preview-img" src="${escapeHtml(currentImageUrl || '')}" alt="Attached question photo" />
              </div>
              <div class="preview-card-actions">
                <span class="text-secondary" style="font-size: 0.8125rem;"><i class="fa-solid fa-circle-check text-success"></i> Photo attached</span>
                <button type="button" id="btn-remove-q-image" class="btn btn-danger btn-sm">
                  <i class="fa-solid fa-trash"></i> Remove Image
                </button>
              </div>
            </div>

            <!-- Image Dropzone / Selector -->
            <div id="modal-image-uploader-box" class="question-image-dropzone ${currentImageUrl ? 'd-none' : ''}">
              <input type="file" id="modal-q-file-input" accept="image/*" style="display: none;" />
              <div class="dropzone-content">
                <div class="dropzone-icon">
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <div class="dropzone-text">
                  <span class="font-bold">Choose an image file</span> or drag & drop here
                  <div class="text-muted" style="font-size: 0.75rem; margin-top: 4px;">Supports PNG, JPG, JPEG, WebP, GIF</div>
                </div>
                <button type="button" id="btn-browse-image" class="btn btn-secondary btn-sm mt-2">
                  <i class="fa-regular fa-folder-open"></i> Browse Files
                </button>
              </div>

              <!-- URL Paste Option -->
              <div class="image-url-toggle-wrap mt-3 text-center">
                <button type="button" id="btn-toggle-url-input" class="btn btn-link btn-xs text-muted">
                  <i class="fa-solid fa-link"></i> Or paste image URL
                </button>
                <div id="modal-url-input-container" class="d-none mt-2">
                  <div class="flex-center gap-2">
                    <input type="url" id="modal-q-image-url" class="form-control" placeholder="https://example.com/diagram.png" />
                    <button type="button" id="btn-apply-image-url" class="btn btn-primary btn-sm">Attach</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <div class="flex-between mb-2">
            <label class="form-label mb-0">
              <span>MCQ Options * (Select radio button for correct answer)</span>
            </label>
            ${
              optionsList.length < 6
                ? '<button type="button" id="modal-add-opt-btn" class="btn btn-outline btn-sm"><i class="fa-solid fa-plus"></i> Add Option</button>'
                : ''
            }
          </div>
          <div id="modal-options-wrapper" class="options-builder-list">
            ${generateOptionsHtml()}
          </div>
        </div>

        <div class="form-group mt-3">
          <label class="form-label" for="modal-q-expl">
            <span>Explanation / Solution (Optional)</span>
            <span class="helper">Shown during post-submission answer review</span>
          </label>
          <textarea id="modal-q-expl" class="form-control" rows="2" placeholder="Explain why the chosen option is correct...">${escapeHtml(existingQ?.explanation || '')}</textarea>
        </div>
      </form>
    `;

    showModal({
      title: `<i class="fa-solid ${existingQ ? 'fa-pen-to-square' : 'fa-plus'} text-primary"></i> ${existingQ ? 'Edit Question' : 'Add MCQ Question'}`,
      contentHtml: modalBody,
      confirmText: existingQ ? 'Save Question' : 'Add Question',
      cancelText: 'Cancel',
      size: 'lg',
      onConfirm: async () => {
        const qText = document.getElementById('modal-q-text').value.trim();
        const expl = document.getElementById('modal-q-expl').value.trim();

        if (!qText) {
          showToast('Validation Error', 'Question statement cannot be empty.', 'warning');
          return false;
        }

        // Collect options
        const optInputs = document.querySelectorAll('.modal-opt-input');
        const correctRadio = document.querySelector('input[name="modal-correct-opt"]:checked');
        const correctIdx = correctRadio ? parseInt(correctRadio.value, 10) : 0;

        const finalOptions = [];
        for (let i = 0; i < optInputs.length; i++) {
          const val = optInputs[i].value.trim();
          if (!val) {
            showToast('Validation Error', `Option ${String.fromCharCode(65 + i)} cannot be empty.`, 'warning');
            return false;
          }
          finalOptions.push({
            option_text: val,
            is_correct: i === correctIdx,
          });
        }

        try {
          let finalImageUrl = currentImageUrl;
          if (pendingImageFile) {
            showToast('Uploading', 'Processing and securing question image...', 'info', 2000);
            finalImageUrl = await db.uploadQuestionImage(pendingImageFile);
          }

          await db.saveQuestionWithOptions({
            testId,
            questionId: existingQ?.id || null,
            questionText: qText,
            explanation: expl,
            marks: test.marks_per_correct,
            imageUrl: finalImageUrl,
            questionOrder: existingQ?.question_order || questions.length + 1,
            options: finalOptions,
          });

          showToast('Saved', 'Question saved successfully.', 'success');
          questions = await db.getQuestionsForTest(testId, true);
          renderQuestionsList();
          return true;
        } catch (err) {
          showToast('Save Error', err.message, 'error');
          return false;
        }
      },
    });

    // Wire image upload handlers inside modal
    const fileInput = document.getElementById('modal-q-file-input');
    const dropzone = document.getElementById('modal-image-uploader-box');
    const previewBox = document.getElementById('modal-image-preview-box');
    const previewImg = document.getElementById('modal-preview-img');
    const removeImgBtn = document.getElementById('btn-remove-q-image');
    const browseBtn = document.getElementById('btn-browse-image');
    const toggleUrlBtn = document.getElementById('btn-toggle-url-input');
    const urlContainer = document.getElementById('modal-url-input-container');
    const urlInput = document.getElementById('modal-q-image-url');
    const applyUrlBtn = document.getElementById('btn-apply-image-url');

    const setPreview = (src) => {
      previewImg.src = src;
      previewBox.classList.remove('d-none');
      dropzone.classList.add('d-none');
    };

    const handleFile = (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Invalid File', 'Please select a valid image file (PNG, JPG, WebP, GIF).', 'warning');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showToast('File Too Large', 'Please select an image smaller than 8MB.', 'warning');
        return;
      }
      pendingImageFile = file;
      currentImageUrl = null;
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    };

    browseBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    // Drag & Drop
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Toggle URL input
    toggleUrlBtn?.addEventListener('click', () => {
      urlContainer?.classList.toggle('d-none');
    });

    // Apply URL
    applyUrlBtn?.addEventListener('click', () => {
      const url = urlInput?.value.trim();
      if (!url) {
        showToast('URL Required', 'Please enter an image URL.', 'warning');
        return;
      }
      currentImageUrl = url;
      pendingImageFile = null;
      setPreview(url);
    });

    // Remove Image
    removeImgBtn?.addEventListener('click', () => {
      currentImageUrl = null;
      pendingImageFile = null;
      if (fileInput) fileInput.value = '';
      previewImg.src = '';
      previewBox.classList.add('d-none');
      dropzone.classList.remove('d-none');
    });

    // Wire options interactivity inside modal
    const rebindModalOptions = () => {
      const wrapper = document.getElementById('modal-options-wrapper');
      if (!wrapper) return;
      wrapper.innerHTML = generateOptionsHtml();

      // Radios
      wrapper.querySelectorAll('input[name="modal-correct-opt"]').forEach((radio) => {
        radio.addEventListener('change', (e) => {
          const selectedIdx = parseInt(e.target.value, 10);
          optionsList.forEach((o, i) => (o.is_correct = i === selectedIdx));
          rebindModalOptions();
        });
      });

      // Inputs
      wrapper.querySelectorAll('.modal-opt-input').forEach((input) => {
        input.addEventListener('input', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          optionsList[idx].option_text = e.target.value;
        });
      });

      // Delete option buttons
      wrapper.querySelectorAll('.modal-del-opt').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          optionsList.splice(idx, 1);
          // ensure at least one correct
          if (!optionsList.some((o) => o.is_correct)) {
            optionsList[0].is_correct = true;
          }
          rebindModalOptions();
        });
      });
    };

    rebindModalOptions();

    document.getElementById('modal-add-opt-btn')?.addEventListener('click', () => {
      if (optionsList.length < 6) {
        optionsList.push({ option_text: '', is_correct: false });
        rebindModalOptions();
      }
    });
  };

  document.getElementById('btn-add-new-question').addEventListener('click', () => openQuestionModal());

  renderQuestionsList();
}
