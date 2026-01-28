/**
 * Shoelace Runtime - Idempotent loader for Shoelace Web Components
 * 
 * This module ensures Shoelace JS and CSS are loaded only once,
 * even when multiple SDK entry points import this module.
 * 
 * The CSS is automatically injected into <head> via rollup-plugin-postcss (inject: true).
 * Shoelace custom elements are registered once when the module first loads.
 */

// Import Shoelace theme CSS - will be injected into <head> by postcss
// This import is processed by rollup-plugin-postcss with inject:true
import '@shoelace-style/shoelace/dist/themes/light.css';

// Import Shoelace components - this registers all custom elements
// Shoelace handles its own duplicate registration checks internally
import '@shoelace-style/shoelace/dist/shoelace.js';

// Use a unique key on window to track initialization state
const SHOELACE_INIT_KEY = '__EVA_SDK_SHOELACE_INITIALIZED__';

// Mark as initialized
if (typeof window !== 'undefined') {
  window[SHOELACE_INIT_KEY] = true;
}

/**
 * Ensures Shoelace is loaded. Safe to call multiple times.
 * @returns {boolean} true if Shoelace is loaded
 */
export function ensureShoelaceLoaded() {
  return typeof window !== 'undefined' && window[SHOELACE_INIT_KEY] === true;
}

export default ensureShoelaceLoaded;
