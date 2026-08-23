/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - AUTHENTICATION LOGIC
 * ============================================================================
 */

import { getSupabase } from './config.js';
import { store } from './state.js';
import { db } from './db.js';
import { showToast } from './utils.js';
import { router } from './router.js';

export const auth = {
  async init() {
    const supabase = getSupabase();
    if (!supabase) return;

    // Check existing session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await this.handleUserSession(session.user);
    } else {
      store.setState({ user: null, profile: null, isLoading: false });
    }

    // Subscribe to auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await this.handleUserSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        store.setState({ user: null, profile: null, isLoading: false });
        store.resetExamState();
        router.navigate('#/login');
      }
    });
  },

  async handleUserSession(user) {
    try {
      const profile = await db.ensureProfile(user);
      store.setState({ user, profile, isLoading: false });
    } catch (err) {
      console.error('Error in handleUserSession:', err);
      store.setState({ user, profile: null, isLoading: false });
    }
  },

  async register(fullName, email, password, confirmPassword) {
    if (!fullName || !email || !password) {
      showToast('Validation Error', 'Please fill in all required fields.', 'warning');
      return { success: false };
    }

    if (password !== confirmPassword) {
      showToast('Validation Error', 'Passwords do not match.', 'error');
      return { success: false };
    }

    if (password.length < 6) {
      showToast('Validation Error', 'Password must be at least 6 characters long.', 'warning');
      return { success: false };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // Explicitly student role
          role: 'student',
        },
      },
    });

    if (error) {
      showToast('Registration Failed', error.message, 'error');
      return { success: false, error };
    }

    showToast('Account Created', 'Registration successful! You are logged in as a Student.', 'success');

    if (data.user) {
      await this.handleUserSession(data.user);
      router.navigate('#/student/dashboard');
    }

    return { success: true, data };
  },

  async login(email, password) {
    if (!email || !password) {
      showToast('Validation Error', 'Please provide both email and password.', 'warning');
      return { success: false };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showToast('Login Failed', error.message, 'error');
      return { success: false, error };
    }

    showToast('Welcome Back', 'Logged in successfully.', 'success');

    if (data.user) {
      await this.handleUserSession(data.user);
      const profile = store.getState().profile;

      if (profile?.role === 'admin') {
        router.navigate('#/admin/dashboard');
      } else {
        router.navigate('#/student/dashboard');
      }
    }

    return { success: true, data };
  },

  async resetPassword(email) {
    if (!email) {
      showToast('Validation Error', 'Please enter your account email address.', 'warning');
      return { success: false };
    }

    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#/reset-password',
    });

    if (error) {
      showToast('Reset Failed', error.message, 'error');
      return { success: false };
    }

    showToast('Password Reset Sent', 'Check your email for the password reset instructions.', 'info');
    return { success: true };
  },

  async logout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    store.setState({ user: null, profile: null });
    store.resetExamState();
    showToast('Logged Out', 'You have been signed out safely.', 'info');
    router.navigate('#/login');
  },
};
