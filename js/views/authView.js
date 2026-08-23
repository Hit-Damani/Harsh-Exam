/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - AUTHENTICATION VIEWS
 * ============================================================================
 */

import { auth } from '../auth.js';
import { router } from '../router.js';

export function renderLogin() {
  const container = document.getElementById('app-main');
  container.innerHTML = `
    <div class="auth-wrapper animate-fade-in">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-icon">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <h2 class="auth-title">Welcome Back</h2>
          <p class="auth-subtitle">Sign in to your ApexExam account</p>
        </div>

        <div class="auth-nav">
          <button class="auth-nav-btn active" onclick="window.location.hash='#/login'">Sign In</button>
          <button class="auth-nav-btn" onclick="window.location.hash='#/register'">Create Account</button>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="login-email">Email Address</label>
            <input type="email" id="login-email" class="form-control" placeholder="name@example.com" required autocomplete="email" />
          </div>

          <div class="form-group">
            <div class="form-label">
              <label for="login-password">Password</label>
              <a href="#/forgot-password" class="helper text-primary">Forgot Password?</a>
            </div>
            <input type="password" id="login-password" class="form-control" placeholder="Enter your password" required autocomplete="current-password" />
          </div>

          <button type="submit" id="btn-login-submit" class="btn btn-primary w-full mt-4 btn-lg">
            <span>Sign In</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </form>

        <div class="auth-footer">
          Don't have an account? <a href="#/register" class="font-bold">Register as Student</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('btn-login-submit');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loading-spinner loading-spinner-sm"></div> Signing in...`;

    try {
      await auth.login(email, password);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  });
}

export function renderRegister() {
  const container = document.getElementById('app-main');
  container.innerHTML = `
    <div class="auth-wrapper animate-fade-in">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-icon">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <h2 class="auth-title">Create Account</h2>
          <p class="auth-subtitle">Register to take exams and view test results</p>
        </div>

        <div class="auth-nav">
          <button class="auth-nav-btn" onclick="window.location.hash='#/login'">Sign In</button>
          <button class="auth-nav-btn active" onclick="window.location.hash='#/register'">Create Account</button>
        </div>

        <div class="role-notice-banner">
          <i class="fa-solid fa-shield-halved"></i>
          <span>Registration automatically provisions a <strong>Student Account</strong>.</span>
        </div>

        <form id="register-form">
          <div class="form-group">
            <label class="form-label" for="reg-name">Full Name</label>
            <input type="text" id="reg-name" class="form-control" placeholder="e.g. Harsh Sharma" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Email Address</label>
            <input type="email" id="reg-email" class="form-control" placeholder="name@example.com" required autocomplete="email" />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password">Password</label>
            <input type="password" id="reg-password" class="form-control" placeholder="At least 6 characters" minlength="6" required autocomplete="new-password" />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-confirm-password">Confirm Password</label>
            <input type="password" id="reg-confirm-password" class="form-control" placeholder="Re-enter password" minlength="6" required autocomplete="new-password" />
          </div>

          <button type="submit" id="btn-reg-submit" class="btn btn-primary w-full mt-4 btn-lg">
            <span>Create Account</span>
            <i class="fa-solid fa-user-check"></i>
          </button>
        </form>

        <div class="auth-footer">
          Already registered? <a href="#/login" class="font-bold">Sign In here</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const submitBtn = document.getElementById('btn-reg-submit');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loading-spinner loading-spinner-sm"></div> Creating Account...`;

    try {
      await auth.register(fullName, email, password, confirmPassword);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Create Account</span> <i class="fa-solid fa-user-check"></i>`;
    }
  });
}

export function renderForgotPassword() {
  const container = document.getElementById('app-main');
  container.innerHTML = `
    <div class="auth-wrapper animate-fade-in">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-icon">
            <i class="fa-solid fa-key"></i>
          </div>
          <h2 class="auth-title">Reset Password</h2>
          <p class="auth-subtitle">Enter your email and we'll send you recovery instructions</p>
        </div>

        <form id="forgot-form">
          <div class="form-group">
            <label class="form-label" for="forgot-email">Account Email</label>
            <input type="email" id="forgot-email" class="form-control" placeholder="name@example.com" required />
          </div>

          <button type="submit" id="btn-forgot-submit" class="btn btn-primary w-full mt-4 btn-lg">
            <span>Send Reset Instructions</span>
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>

        <div class="auth-footer">
          Remember your password? <a href="#/login" class="font-bold">Return to Login</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const submitBtn = document.getElementById('btn-forgot-submit');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loading-spinner loading-spinner-sm"></div> Sending...`;

    try {
      await auth.resetPassword(email);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Send Reset Instructions</span> <i class="fa-solid fa-paper-plane"></i>`;
    }
  });
}
