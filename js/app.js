/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - MAIN APPLICATION ENTRY POINT
 * ============================================================================
 */

import { auth } from './auth.js';
import { store } from './state.js';
import { router } from './router.js';
import { initTheme, toggleTheme, hideModal, escapeHtml } from './utils.js';

// Views
import { renderLogin, renderRegister, renderForgotPassword } from './views/authView.js';
import { renderAdminDashboard } from './admin/dashboard.js';
import { renderAdminTests } from './admin/tests.js';
import { renderTestEditor } from './admin/testEditor.js';
import { renderQuestionBuilder } from './admin/questionBuilder.js';
import { renderAdminResults } from './admin/results.js';
import { renderAdminStudents } from './admin/students.js';
import { renderStudentDashboard } from './student/dashboard.js';
import { renderStudentHistory } from './student/history.js';
import { renderExamEngine } from './exam/examEngine.js';
import { renderResultView } from './exam/resultView.js';

// Register Routes
router.register('#/login', renderLogin);
router.register('#/register', renderRegister);
router.register('#/forgot-password', renderForgotPassword);

// Admin Routes (Protected - Role Admin)
router.register('#/admin/dashboard', renderAdminDashboard, { requiresAuth: true, role: 'admin' });
router.register('#/admin/tests', renderAdminTests, { requiresAuth: true, role: 'admin' });
router.register('#/admin/tests/new', renderTestEditor, { requiresAuth: true, role: 'admin' });
router.register('#/admin/tests/:id/edit', renderTestEditor, { requiresAuth: true, role: 'admin' });
router.register('#/admin/tests/:id/questions', renderQuestionBuilder, { requiresAuth: true, role: 'admin' });
router.register('#/admin/results', renderAdminResults, { requiresAuth: true, role: 'admin' });
router.register('#/admin/students', renderAdminStudents, { requiresAuth: true, role: 'admin' });

// Student Routes (Protected)
router.register('#/student/dashboard', renderStudentDashboard, { requiresAuth: true });
router.register('#/student/history', renderStudentHistory, { requiresAuth: true });

// Exam & Result Routes (Protected)
router.register('#/exam/:testId', renderExamEngine, { requiresAuth: true });
router.register('#/result/:attemptId', renderResultView, { requiresAuth: true });

/**
 * Sync Navigation Bar with Auth & Profile state
 */
function updateNavbar() {
  const state = store.getState();
  const navUserSection = document.getElementById('navbar-user-section');
  const navLinksSection = document.getElementById('navbar-links-section');
  const mobileNavLinksSection = document.getElementById('mobile-navbar-links-section');
  const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');

  if (!navUserSection || !navLinksSection) return;

  // Close mobile drawer on state change
  if (mobileDrawer) mobileDrawer.classList.remove('active');

  if (state.user && state.profile) {
    const role = state.profile.role;
    const isAdm = role === 'admin';

    const linksHtml = isAdm
      ? `
        <li><a href="#/admin/dashboard" class="nav-link"><i class="fa-solid fa-gauge"></i> Dashboard</a></li>
        <li><a href="#/admin/tests" class="nav-link"><i class="fa-solid fa-file-lines"></i> Tests</a></li>
        <li><a href="#/admin/results" class="nav-link"><i class="fa-solid fa-square-poll-vertical"></i> Results</a></li>
        <li><a href="#/admin/students" class="nav-link"><i class="fa-solid fa-users"></i> Students</a></li>
      `
      : `
        <li><a href="#/student/dashboard" class="nav-link"><i class="fa-solid fa-book-open"></i> Available Tests</a></li>
        <li><a href="#/student/history" class="nav-link"><i class="fa-solid fa-clock-rotate-left"></i> My History</a></li>
      `;

    navLinksSection.innerHTML = linksHtml;
    if (mobileNavLinksSection) {
      mobileNavLinksSection.innerHTML = linksHtml;
      // Close mobile drawer when link clicked
      mobileNavLinksSection.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', () => {
          mobileDrawer?.classList.remove('active');
        });
      });
    }

    if (mobileMenuToggleBtn) mobileMenuToggleBtn.style.display = 'inline-flex';

    // Set User Profile Badge & Logout
    navUserSection.innerHTML = `
      <div class="user-badge role-${role}">
        <i class="fa-solid ${isAdm ? 'fa-shield-halved' : 'fa-graduation-cap'}"></i>
        <span>${escapeHtml(state.profile.full_name || state.profile.email)}</span>
      </div>
      <button id="btn-app-logout" class="btn btn-outline btn-sm" title="Sign Out">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
      </button>
    `;

    document.getElementById('btn-app-logout')?.addEventListener('click', () => {
      auth.logout();
    });
  } else {
    navLinksSection.innerHTML = '';
    if (mobileNavLinksSection) mobileNavLinksSection.innerHTML = '';
    if (mobileMenuToggleBtn) mobileMenuToggleBtn.style.display = 'none';

    navUserSection.innerHTML = `
      <a href="#/login" class="btn btn-outline btn-sm">Sign In</a>
      <a href="#/register" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

  // Mobile drawer toggle button
  document.getElementById('mobile-menu-toggle-btn')?.addEventListener('click', () => {
    const drawer = document.getElementById('mobile-nav-drawer');
    const icon = document.getElementById('mobile-menu-icon');
    if (drawer) {
      const isActive = drawer.classList.toggle('active');
      if (icon) {
        icon.className = isActive ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
      }
    }
  });

  // Subscribe navbar to auth profile changes
  store.subscribe('profile', updateNavbar);
  store.subscribe('user', updateNavbar);

  // Close modal on backdrop click
  document.getElementById('global-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'global-modal-backdrop') {
      hideModal();
    }
  });

  // Modal header close button
  document.getElementById('modal-close-btn')?.addEventListener('click', hideModal);

  // Initialize Supabase Auth session
  await auth.init();

  // Route initial URL
  router.handleRouting();
});
