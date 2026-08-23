/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - ADMIN SETTINGS & DATABASE SETUP HELPER
 * ============================================================================
 */

import { showToast } from '../utils.js';

export function renderAdminSettings() {
  const container = document.getElementById('app-main');

  container.innerHTML = `
    <div class="container animate-fade-in" style="max-width: 900px;">
      <div class="admin-header">
        <div class="admin-title-group">
          <h1><i class="fa-solid fa-gear text-primary"></i> Platform Settings & Security</h1>
          <p>Single Admin configuration, Supabase RLS security, and database maintenance</p>
        </div>
      </div>

      <!-- Admin Top Nav Bar -->
      <div class="admin-nav-bar">
        <a href="#/admin/dashboard" class="admin-nav-btn"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
        <a href="#/admin/tests" class="admin-nav-btn"><i class="fa-solid fa-file-lines"></i> Tests</a>
        <a href="#/admin/results" class="admin-nav-btn"><i class="fa-solid fa-square-poll-vertical"></i> Results</a>
        <a href="#/admin/students" class="admin-nav-btn"><i class="fa-solid fa-users"></i> Students</a>
        <a href="#/admin/settings" class="admin-nav-btn active"><i class="fa-solid fa-gear"></i> Settings</a>
      </div>

      <!-- Single Admin Rule Card -->
      <div class="glass-card mb-4">
        <div class="flex-center gap-3 mb-3">
          <div class="stat-icon" style="--stat-bg: rgba(245, 158, 11, 0.12); --stat-color: #f59e0b;">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h3 class="font-bold" style="font-size: 1.125rem;">Single Admin Security Architecture</h3>
            <p class="text-secondary" style="font-size: 0.8125rem;">Enforced at both Database Row Level Security (RLS) and Frontend Guards</p>
          </div>
        </div>

        <p class="text-secondary mb-3" style="font-size: 0.875rem;">
          By design, this platform enforces a <strong>Single Admin Model</strong>. There is no public admin registration form.
          All new registrations default strictly to <code>role = 'student'</code>.
        </p>

        <div class="marking-formula-preview">
          <strong>To designate/promote an account as the Single Admin:</strong>
          <pre class="mt-2 font-mono" style="background: var(--bg-primary); padding: 0.75rem; border-radius: var(--radius-sm); color: var(--accent); overflow-x: auto;">
-- Run in Supabase SQL Editor:
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your_admin_email@example.com';</pre>
        </div>
      </div>

      <!-- Database Schema Setup Card -->
      <div class="glass-card mb-4">
        <div class="flex-between mb-3">
          <div>
            <h3 class="font-bold" style="font-size: 1.125rem;"><i class="fa-solid fa-database text-primary"></i> Supabase SQL Schema</h3>
            <p class="text-secondary" style="font-size: 0.8125rem;">Schema includes RLS policies, trigger functions, and secure scoring RPCs</p>
          </div>
          <button id="btn-copy-sql" class="btn btn-primary btn-sm">
            <i class="fa-regular fa-copy"></i> Copy SQL Schema
          </button>
        </div>

        <p class="text-secondary mb-3" style="font-size: 0.875rem;">
          The full PostgreSQL script is stored in <code>schema.sql</code>. If you haven't run it in Supabase yet, click the button above and paste it into your <strong>Supabase Dashboard &gt; SQL Editor</strong>.
        </p>

        <div class="flex-center gap-2 mt-4">
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Supabase Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-copy-sql')?.addEventListener('click', async () => {
    try {
      const response = await fetch('./schema.sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      showToast('Copied to Clipboard', 'The complete SQL schema has been copied.', 'success');
    } catch (e) {
      showToast('Copy Failed', 'Could not copy automatically. Please open schema.sql file.', 'warning');
    }
  });
}
