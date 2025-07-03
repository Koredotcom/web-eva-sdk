import marked from "marked";
import { encodeHtml } from "../../utils/helpers"; // optional, if you still need it
import DOMPurify from "dompurify";

const SHOELACE_TAGS = [
  // Input Components
  'sl-button',
  'sl-button-group',
  'sl-checkbox',
  'sl-color-picker',
  'sl-input',
  'sl-radio',
  'sl-radio-button',
  'sl-radio-group',
  'sl-range',
  'sl-rating',
  'sl-select',
  'sl-option',
  'sl-switch',
  'sl-textarea',
  
  // Display Components
  'sl-alert',
  'sl-avatar',
  'sl-badge',
  'sl-card',
  'sl-carousel',
  'sl-carousel-item',
  'sl-details',
  'sl-dialog',
  'sl-divider',
  'sl-drawer',
  'sl-icon',
  'sl-icon-button',
  'sl-image-comparer',
  'sl-progress-bar',
  'sl-progress-ring',
  'sl-qr-code',
  'sl-skeleton',
  'sl-spinner',
  'sl-tag',
  'sl-tooltip',
  
  // Navigation Components
  'sl-breadcrumb',
  'sl-breadcrumb-item',
  'sl-menu',
  'sl-menu-item',
  'sl-menu-label',
  'sl-tab',
  'sl-tab-group',
  'sl-tab-panel',
  'sl-tree',
  'sl-tree-item',
  
  // Layout Components
  'sl-split-panel',
  
  // Utility Components
  'sl-animated-image',
  'sl-animation',
  'sl-copy-button',
  'sl-dropdown',
  'sl-format-bytes',
  'sl-format-date',
  'sl-format-number',
  'sl-include',
  'sl-mutation-observer',
  'sl-popup',
  'sl-relative-time',
  'sl-resize-observer',
  'sl-visually-hidden',
];

const SHOELACE_ATTRS = [
  // Common Web Component Attributes
  'slot',
  'part',
  'exportparts',
  
  // Common Shoelace Attributes
  'variant',
  'size',
  'type',
  'value',
  'placeholder',
  'label',
  'name',
  'checked',
  'disabled',
  'readonly',
  'required',
  'invalid',
  'help-text',
  'clearable',
  'password-toggle',
  'password-visible',
  'no-spin-buttons',
  'form',
  'min',
  'max',
  'step',
  'minlength',
  'maxlength',
  'pattern',
  'autocomplete',
  'autocorrect',
  'autocapitalize',
  'spellcheck',
  'inputmode',
  
  // Button specific
  'circle',
  'pill',
  'caret',
  'loading',
  'outline',
  'href',
  'target',
  'download',
  
  // Select specific
  'multiple',
  'max-options-visible',
  'placement',
  'hoist',
  'filled',
  
  // Dialog/Drawer specific
  'open',
  'modal',
  'no-header',
  'contained',
  
  // Alert specific
  'closable',
  'duration',
  
  // Progress specific
  'percentage',
  'indeterminate',
  
  // Icon specific
  'src',
  'library',
  
  // Animation specific
  'play',
  'delay',
  'direction',
  'duration',
  'easing',
  'end-delay',
  'fill',
  'iterations',
  'iteration-start',
  'keyframes',
  'play-rate',
  
  // Carousel specific
  'loop',
  'navigation',
  'pagination',
  'autoplay',
  'autoplay-interval',
  'slides-per-page',
  'slides-per-move',
  'orientation',
  'mouse-dragging',
  
  // Tree specific
  'selection',
  'expanded',
  'selected',
  'indeterminate',
  'leaf',
  'lazy',
  
  // Tab specific
  'panel',
  'active',
  'closable',
  'placement',
  'activation',
  'no-scroll-controls',
  
  // Tooltip specific
  'content',
  'placement',
  'disabled',
  'distance',
  'open',
  'skidding',
  'trigger',
  'hoist',
  
  // Rating specific
  'max',
  'precision',
  'readonly',
  'clearable',
  'value',
  
  // Range specific
  'min',
  'max',
  'step',
  'value',
  'label',
  'help-text',
  'disabled',
  'tooltip',
  
  // Common data attributes that might be used
  'data-*',
  
  // Common event attributes (if you need them)
  'onclick',
  'onchange',
  'oninput',
  'onblur',
  'onfocus',
  'onsubmit',
  'onload',
  'onclose',
  'onopen',
  'onshow',
  'onhide',
  'onselect',
  'onslchange',
  'onslclear',
  'onslclose',
  'onslhide',
  'onslinput',
  'onslopen',
  'onslselect',
  'onslshow',
  'onslstart',
  'onslend',
  'onslcancel',
  'onslfinish',
  'onslreposition',
  'onslresize',
  'onslmutation',
  'onslload',
  'onslerror',
  'onslchange',
  'onslclear',
  'onslinvalid',
  'onslremove',
  'onslafter-show',
  'onslafter-hide',
  'onslrequest-close',
  'onslinitial-focus',
  'onslselection-change',
  'onslload',
  'onslerror',
  'onslplay',
  'onslpause',
  'onslcancel',
  'onslfinish',
  'onslstart',
  'onslend',
];

// Set marked config
marked.setOptions({
    gfm: true,
    breaks: true, // Enables line breaks with single newline
    smartLists: true, // Fixes weird list formatting
    smartypants: false, // Disables curly quotes, etc.
});

const customMarkdownRenderer = (text) => {
    if (!text) return "";

    // Convert markdown to HTML
    const cleanedMarkdown = text.replace(/^\s{2,}/gm, "");
    let rawHtml = marked(cleanedMarkdown);
    rawHtml = rawHtml.replace("<a", '<a target="_blank"');

    // Sanitize to prevent XSS (recommended)
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: SHOELACE_TAGS,
        ADD_ATTR: SHOELACE_ATTRS,
    });

    return encodeHtml ? encodeHtml(sanitizedHtml) : sanitizedHtml;
};

export default customMarkdownRenderer;