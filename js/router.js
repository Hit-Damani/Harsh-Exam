/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - CLIENT-SIDE VIEW ROUTER
 * ============================================================================
 */

import { store } from './state.js';
import { showToast } from './utils.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.currentParams = {};

    window.addEventListener('hashchange', () => this.handleRouting());
  }

  register(pathPattern, handler, options = {}) {
    // Convert path pattern like "#/admin/tests/:id/questions" to regex
    const paramNames = [];
    const regexPattern = pathPattern
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');

    this.routes.set(pathPattern, {
      regex: new RegExp(`^${regexPattern}$`),
      paramNames,
      handler,
      requiresAuth: options.requiresAuth || false,
      role: options.role || null, // 'admin' | 'student'
    });
  }

  navigate(hashPath) {
    if (window.location.hash === hashPath) {
      this.handleRouting();
    } else {
      window.location.hash = hashPath;
    }
  }

  async handleRouting() {
    let hash = window.location.hash || '#/login';

    // Wait for store initialization
    if (store.getState().isLoading) {
      const unsub = store.subscribe('isLoading', (isLoading) => {
        if (!isLoading) {
          unsub();
          this.handleRouting();
        }
      });
      return;
    }

    const state = store.getState();
    const isAuth = !!state.user && !!state.profile;
    const userRole = state.profile?.role;

    // Match route
    let matchedRoute = null;
    let matchedParams = {};

    for (const [pattern, routeInfo] of this.routes.entries()) {
      const match = hash.match(routeInfo.regex);
      if (match) {
        matchedRoute = routeInfo;
        const paramValues = match.slice(1);
        routeInfo.paramNames.forEach((name, idx) => {
          matchedParams[name] = decodeURIComponent(paramValues[idx]);
        });
        break;
      }
    }

    // Default fallback if route not found
    if (!matchedRoute) {
      if (isAuth) {
        this.navigate(userRole === 'admin' ? '#/admin/dashboard' : '#/student/dashboard');
      } else {
        this.navigate('#/login');
      }
      return;
    }

    // Auth guard
    if (matchedRoute.requiresAuth && !isAuth) {
      showToast('Authentication Required', 'Please log in to continue.', 'info');
      this.navigate('#/login');
      return;
    }

    // Redirect already logged in user away from auth pages
    if (isAuth && (hash === '#/login' || hash === '#/register' || hash === '#/forgot-password')) {
      this.navigate(userRole === 'admin' ? '#/admin/dashboard' : '#/student/dashboard');
      return;
    }

    // Role guard: Admin-only routes
    if (matchedRoute.role === 'admin' && userRole !== 'admin') {
      showToast('Access Denied', 'You do not have administrative privileges.', 'error');
      this.navigate('#/student/dashboard');
      return;
    }

    // Role guard: Student routes
    if (matchedRoute.role === 'student' && userRole === 'admin' && hash.startsWith('#/student/dashboard')) {
      // Optional convenience: let admin access student views or redirect to admin
    }

    this.currentRoute = matchedRoute;
    this.currentParams = matchedParams;

    // Update active nav links in UI
    this.updateNavUI(hash, userRole);

    // Render view
    const mainContainer = document.getElementById('app-main');
    if (mainContainer) {
      // Show smooth fade in
      mainContainer.innerHTML = `
        <div class="page-loader">
          <div class="loading-spinner"></div>
          <p class="text-muted">Loading view...</p>
        </div>
      `;
      try {
        await matchedRoute.handler(matchedParams);
      } catch (err) {
        console.error('Error rendering route:', err);
        mainContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation text-danger"></i></div>
            <h2 class="empty-title">Something went wrong</h2>
            <p class="empty-desc">${err.message || 'An unexpected error occurred while loading this view.'}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Reload Application</button>
          </div>
        `;
      }
    }
  }

  updateNavUI(hash, role) {
    const navLinks = document.querySelectorAll('.nav-link, .admin-nav-btn');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && (hash === href || (href !== '#/admin/dashboard' && hash.startsWith(href)))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Toggle navbar visibility based on route (e.g. hide in exam room for distraction-free)
    const navbar = document.getElementById('main-navbar');
    if (navbar) {
      if (hash.startsWith('#/exam/')) {
        navbar.style.display = 'none';
      } else {
        navbar.style.display = 'block';
      }
    }
  }
}

export const router = new Router();
