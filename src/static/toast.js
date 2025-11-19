/**
 * Toast Notification System
 * Provides unified toast notifications across all pages
 */

// Toast queue to manage multiple simultaneous toasts
const toastQueue = [];
let toastIdCounter = 0;

// Icon mapping for toast types
const toastIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
};

// Default titles for toast types
const defaultTitles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information'
};

/**
 * Initialize toast system - creates container if it doesn't exist
 */
function initToastSystem() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

/**
 * Show a toast notification
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} title - Toast title (optional, uses default if not provided)
 * @param {string} message - Toast message
 * @param {number} duration - Duration in milliseconds (default: 5000, 0 for no auto-dismiss)
 * @returns {number} Toast ID for manual dismissal
 */
function showToast(type = 'info', title = '', message = '', duration = 5000) {
    initToastSystem();

    const toastId = ++toastIdCounter;
    const container = document.getElementById('toast-container');

    // Use default title if none provided
    const toastTitle = title || defaultTitles[type] || defaultTitles.info;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = `toast-${toastId}`;
    toast.setAttribute('data-toast-id', toastId);

    // Build toast HTML
    toast.innerHTML = `
        <div class="toast-icon">${toastIcons[type] || toastIcons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${toastTitle}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" onclick="hideToast(${toastId})" aria-label="Close">
            ×
        </button>
        ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;

    // Add to container
    container.appendChild(toast);

    // Add to queue
    toastQueue.push({
        id: toastId,
        element: toast,
        timeout: null
    });

    // Auto-dismiss after duration
    if (duration > 0) {
        const timeoutId = setTimeout(() => {
            hideToast(toastId);
        }, duration);

        // Update timeout in queue
        const queueItem = toastQueue.find(t => t.id === toastId);
        if (queueItem) {
            queueItem.timeout = timeoutId;
        }
    }

    return toastId;
}

/**
 * Hide a specific toast
 * @param {number} toastId - Toast ID to hide
 */
function hideToast(toastId) {
    const queueItem = toastQueue.find(t => t.id === toastId);
    if (!queueItem) return;

    const toast = queueItem.element;
    if (!toast) return;

    // Clear timeout if exists
    if (queueItem.timeout) {
        clearTimeout(queueItem.timeout);
    }

    // Add removing class for animation
    toast.classList.add('removing');

    // Remove from DOM after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }

        // Remove from queue
        const index = toastQueue.findIndex(t => t.id === toastId);
        if (index > -1) {
            toastQueue.splice(index, 1);
        }
    }, 300); // Match animation duration
}

/**
 * Hide all toasts
 */
function hideAllToasts() {
    const toasts = [...toastQueue];
    toasts.forEach(toast => hideToast(toast.id));
}

/**
 * Convenience function: Show success toast
 * @param {string} message - Success message
 * @param {string} title - Optional title (default: "Success")
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
function showSuccess(message, title = '', duration = 5000) {
    return showToast('success', title, message, duration);
}

/**
 * Convenience function: Show error toast
 * @param {string} message - Error message
 * @param {string} title - Optional title (default: "Error")
 * @param {number} duration - Duration in milliseconds (default: 7000 - longer for errors)
 */
function showError(message, title = '', duration = 7000) {
    return showToast('error', title, message, duration);
}

/**
 * Convenience function: Show warning toast
 * @param {string} message - Warning message
 * @param {string} title - Optional title (default: "Warning")
 * @param {number} duration - Duration in milliseconds (default: 6000)
 */
function showWarning(message, title = '', duration = 6000) {
    return showToast('warning', title, message, duration);
}

/**
 * Convenience function: Show info toast
 * @param {string} message - Info message
 * @param {string} title - Optional title (default: "Information")
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
function showInfo(message, title = '', duration = 5000) {
    return showToast('info', title, message, duration);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToastSystem);
} else {
    initToastSystem();
}
