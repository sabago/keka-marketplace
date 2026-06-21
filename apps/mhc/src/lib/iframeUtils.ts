/**
 * Utility functions for iframe detection and communication
 */

/**
 * Check if the current window is running inside an iframe
 */
export function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return window.self !== window.top;
  } catch {
    // If we can't access window.top due to cross-origin restrictions,
    // we're likely in an iframe
    return true;
  }
}

/**
 * Send a message to the parent window (WordPress)
 */
export function sendMessageToParent(action: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !isInIframe()) return;
  
  try {
    const message = {
      action,
      ...data,
      timestamp: Date.now()
    };
    
    window.parent.postMessage(message, '*');
  } catch (e) {
    console.error('Failed to send message to parent:', e);
  }
}

/**
 * Request login from parent WordPress site
 */
export function requestLogin(): void {
  sendMessageToParent('requireLogin');
}

/**
 * Request logout from parent WordPress site
 */
export function requestLogout(): void {
  sendMessageToParent('requestLogout');
}

/**
 * Notify parent about iframe height changes
 */
export function notifyHeightChange(height: number): void {
  sendMessageToParent('resize', { height });
}
