/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - UTILITY HELPERS
 * ============================================================================
 */

/**
 * Toast Notification System
 */
export function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    warning: 'fa-solid fa-triangle-exclamation',
    info: 'fa-solid fa-circle-info',
  };

  const icon = iconMap[type] || iconMap.info;

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${icon}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger CSS transition
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const closeToast = () => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  };

  toast.querySelector('.toast-close').addEventListener('click', closeToast);

  if (duration > 0) {
    setTimeout(closeToast, duration);
  }
}

/**
 * Modal Dialog Helper
 */
export function showModal({
  title = 'Notification',
  contentHtml = '',
  confirmText = 'OK',
  cancelText = null,
  confirmClass = 'btn-primary',
  onConfirm = null,
  onCancel = null,
  size = 'md', // 'sm', 'md', 'lg', 'full'
  hideFooter = false,
}) {
  const backdrop = document.getElementById('global-modal-backdrop');
  if (!backdrop) return;

  const container = backdrop.querySelector('.modal-container');
  container.className = `modal-container modal-${size}`;

  document.getElementById('modal-title-text').innerHTML = title;
  document.getElementById('modal-body-content').innerHTML = contentHtml;

  const footer = document.getElementById('modal-footer-content');
  if (hideFooter) {
    footer.style.display = 'none';
  } else {
    footer.style.display = 'flex';
    footer.innerHTML = '';

    if (cancelText) {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => {
        hideModal();
        if (typeof onCancel === 'function') onCancel();
      };
      footer.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.className = `btn ${confirmClass}`;
    confirmBtn.textContent = confirmText;
    confirmBtn.onclick = async () => {
      if (typeof onConfirm === 'function') {
        const result = await onConfirm();
        if (result !== false) {
          hideModal();
        }
      } else {
        hideModal();
      }
    };
    footer.appendChild(confirmBtn);
  }

  backdrop.classList.add('active');
}

export function hideModal() {
  const backdrop = document.getElementById('global-modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
  }
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatSeconds(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format ISO date to readable string
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Debounce Function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Theme Manager
 */
export function initTheme() {
  const saved = localStorage.getItem('apex_exam_theme') || 'dark';
  setTheme(saved);
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('apex_exam_theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}
