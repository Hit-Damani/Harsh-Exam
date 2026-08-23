/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - ADMIN TESTS MANAGEMENT
 * ============================================================================
 */

import { db } from '../db.js';
import { showToast, showModal, escapeHtml } from '../utils.js';

export async function renderAdminTests() {
  const container = document.getElementById('app-main');

  container.innerHTML = `
    <div class="container animate-fade-in">
      <div class="admin-header">
        <div class="admin-title-group">
          <h1><i class="fa-solid fa-file-lines text-primary"></i> Test Management</h1>
          <p>Create, configure, publish and manage online examination tests</p>
        </div>
        <div class="toolbar-actions">
          <a href="#/admin/tests/new" class="btn btn-primary">
            <i class="fa-solid fa-plus"></i> Create New Test
          </a>
        </div>
      </div>

      <!-- Admin Top Nav Bar -->
      <div class="admin-nav-bar">
        <a href="#/admin/dashboard" class="admin-nav-btn"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
        <a href="#/admin/tests" class="admin-nav-btn active"><i class="fa-solid fa-file-lines"></i> Tests</a>
        <a href="#/admin/results" class="admin-nav-btn"><i class="fa-solid fa-square-poll-vertical"></i> Results</a>
        <a href="#/admin/students" class="admin-nav-btn"><i class="fa-solid fa-users"></i> Students</a>
      </div>

      <!-- Search & Filters -->
      <div class="toolbar-bar">
        <div class="toolbar-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="test-search-input" class="form-control" placeholder="Search tests by title or category..." />
        </div>
        <div class="toolbar-actions">
          <select id="test-status-filter" class="form-control" style="width: auto;">
            <option value="all">All Statuses</option>
            <option value="published">Published Only</option>
            <option value="draft">Drafts Only</option>
          </select>
        </div>
      </div>

      <!-- Test Cards Grid -->
      <div id="tests-grid-container" class="test-grid">
        <div class="text-center w-full py-8 text-muted" style="grid-column: 1 / -1;">
          <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
          Loading tests...
        </div>
      </div>
    </div>
  `;

  let allTests = [];

  const loadTests = async () => {
    try {
      allTests = await db.getTests(true);
      renderTestsList();
    } catch (err) {
      console.error('Failed to load tests:', err);
      showToast('Error', 'Could not load tests: ' + err.message, 'error');
    }
  };

  const renderTestsList = () => {
    const grid = document.getElementById('tests-grid-container');
    const searchTerm = document.getElementById('test-search-input').value.toLowerCase();
    const statusFilter = document.getElementById('test-status-filter').value;

    let filtered = allTests.filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm) || (t.category && t.category.toLowerCase().includes(searchTerm));
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon"><i class="fa-solid fa-folder-open"></i></div>
          <h3 class="empty-title">No Tests Found</h3>
          <p class="empty-desc">Create your first examination test or adjust your search filters.</p>
          <a href="#/admin/tests/new" class="btn btn-primary">
            <i class="fa-solid fa-plus"></i> Create New Test
          </a>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map(
        (test) => `
      <div class="test-card animate-fade-in" id="test-card-${test.id}">
        <div>
          <div class="test-card-header">
            <span class="badge badge-neutral">${escapeHtml(test.category || 'General')}</span>
            <span class="badge badge-${test.status === 'published' ? 'published' : 'draft'}">
              <i class="fa-solid ${test.status === 'published' ? 'fa-globe' : 'fa-lock'}"></i>
              ${test.status}
            </span>
          </div>

          <h3 class="test-card-title mb-2">${escapeHtml(test.title)}</h3>
          <p class="test-card-desc">${escapeHtml(test.description || 'No description provided.')}</p>

          <div class="test-meta-pills">
            <span class="meta-pill" title="Duration">
              <i class="fa-regular fa-clock"></i> ${test.duration_minutes} mins
            </span>
            <span class="meta-pill" title="Questions Count">
              <i class="fa-solid fa-list-ol"></i> ${test.question_count} Questions
            </span>
            <span class="meta-pill" title="Positive Marks">
              <i class="fa-solid fa-plus-circle text-success"></i> +${test.marks_per_correct}
            </span>
            <span class="meta-pill" title="Negative Marks">
              <i class="fa-solid fa-minus-circle ${test.negative_marking_enabled ? 'text-danger' : 'text-muted'}"></i>
              ${test.negative_marking_enabled ? `-${test.negative_marks_per_wrong}` : 'No Neg'}
            </span>
            <span class="meta-pill" title="Passing Percentage">
              <i class="fa-solid fa-percent text-warning"></i> Pass: ${test.passing_percentage}%
            </span>
          </div>
        </div>

        <div class="test-card-footer">
          <div class="flex-center gap-2">
            <a href="#/admin/tests/${test.id}/questions" class="btn btn-primary btn-sm" title="Manage Questions">
              <i class="fa-solid fa-list-check"></i> Questions (${test.question_count})
            </a>
            <a href="#/admin/tests/${test.id}/edit" class="btn btn-secondary btn-sm" title="Edit Test Settings">
              <i class="fa-solid fa-gear"></i>
            </a>
          </div>

          <div class="flex-center gap-2">
            <button class="btn btn-outline btn-sm btn-publish-toggle" data-id="${test.id}" data-status="${test.status}" title="${test.status === 'published' ? 'Unpublish' : 'Publish'}">
              <i class="fa-solid ${test.status === 'published' ? 'fa-eye-slash' : 'fa-globe'}"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-delete-test" data-id="${test.id}" data-title="${escapeHtml(test.title)}" title="Delete Test">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    // Attach Event Listeners
    grid.querySelectorAll('.btn-publish-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const currentStatus = btn.dataset.status;
        try {
          await db.toggleTestPublish(id, currentStatus);
          showToast(
            'Status Updated',
            `Test has been ${currentStatus === 'published' ? 'unpublished to Draft' : 'published to Students'}.`,
            'success'
          );
          loadTests();
        } catch (e) {
          showToast('Error', e.message, 'error');
        }
      });
    });

    grid.querySelectorAll('.btn-delete-test').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const title = btn.dataset.title;

        showModal({
          title: '<i class="fa-solid fa-triangle-exclamation text-danger"></i> Delete Test',
          contentHtml: `<p>Are you sure you want to permanently delete <strong>"${title}"</strong>? All questions and student attempts will be deleted as well.</p>`,
          confirmText: 'Delete Permanently',
          cancelText: 'Cancel',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              await db.deleteTest(id);
              showToast('Deleted', 'Test deleted successfully.', 'info');
              loadTests();
            } catch (err) {
              showToast('Error', err.message, 'error');
            }
          },
        });
      });
    });
  };

  document.getElementById('test-search-input').addEventListener('input', renderTestsList);
  document.getElementById('test-status-filter').addEventListener('change', renderTestsList);

  loadTests();
}
