/**
 * useClarityTracking
 * ------------------
 * Thin wrapper around Microsoft Clarity's JS API so we can fire
 * custom events + set custom tags from React components.
 *
 * Docs: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
 */

declare global {
  interface Window {
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

/** Fire a named custom event that shows up in Clarity's dashboard */
export function clarityEvent(eventName: string) {
  if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
    window.clarity('event', eventName);
  }
}

/**
 * Set a custom tag (key/value pair) that gets attached to all sessions.
 * Useful for segmenting recordings by wallet network, user type, etc.
 */
export function clarityTag(key: string, value: string | string[]) {
  if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
    window.clarity('set', key, value);
  }
}

/**
 * Identify a user session (e.g., after login).
 * customId: your internal user id (never use PII like email/wallet address directly).
 */
export function clarityIdentify(customId: string, sessionId?: string, pageId?: string, friendlyName?: string) {
  if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
    window.clarity('identify', customId, sessionId, pageId, friendlyName);
  }
}

/**
 * Convenience hook — returns all tracking helpers pre-bound.
 * Usage:
 *   const { event, tag } = useClarityTracking();
 *   event('wallet_scanned');
 *   tag('network', 'ethereum');
 */
export function useClarityTracking() {
  return {
    event: clarityEvent,
    tag: clarityTag,
    identify: clarityIdentify,
  };
}
