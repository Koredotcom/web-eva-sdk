import { textPlugin } from './text-plugin';
import { renderEChart, buildEChartOptions } from '../DynamicEChart';

const CHART_REGEX = /```\s*chart\s*([\s\S]*?)\s*```/g;

function safeJsonParseChart(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const tryJsonParse = (value) => {
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  };

  // First try normal JSON.parse
  const firstParse = tryJsonParse(trimmed);
  if (firstParse && typeof firstParse === 'object') return firstParse;

  // Handle strings with escaped quotes (e.g., {\"key\":\"value\"})
  let unescaped = trimmed;
  if (unescaped.includes('\\"')) {
    unescaped = unescaped
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  const secondParse = tryJsonParse(unescaped);
  if (secondParse && typeof secondParse === 'object') return secondParse;

  try {
    // Try to normalize common non-JSON patterns (single quotes, trailing commas, comments)
    let normalized = unescaped
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/([^:])\/\/.*$/gm, '$1') // line comments
      .replace(/'/g, '"') // single to double quotes
      .replace(/,\s*([}\]])/g, '$1'); // trailing commas

    const finalParse = tryJsonParse(normalized);
    return finalParse;
  } catch (err) {
    console.error('chart-plugin: failed to parse chart JSON', err);
    return null;
  }
}

function splitChartContent(content) {
  const matches = content.match(CHART_REGEX);
  if (!matches) return [{ type: 'text', content }];

  const sections = [];
  let lastIndex = 0;

  // We need to use a non-global regex for individual matches to extract groups correctly
  const SINGLE_CHART_REGEX = /```\s*chart\s*([\s\S]*?)\s*```/;

  matches.forEach(match => {
    const index = content.indexOf(match, lastIndex);
    if (index > lastIndex) {
      sections.push({
        type: 'text',
        content: content.slice(lastIndex, index),
      });
    }

    const m = match.match(SINGLE_CHART_REGEX);
    const chartJson = (m && m[1]) || '';
    sections.push({ type: 'chart', content: chartJson.trim() });

    lastIndex = index + match.length;
  });

  if (lastIndex < content.length) {
    sections.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return sections;
}

function encodeSpec(spec) {
  try {
    return encodeURIComponent(JSON.stringify(spec));
  } catch {
    return '';
  }
}

function decodeSpec(encoded) {
  try {
    return JSON.parse(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}

/**
 * Initialize all uninitialized charts in the given container (or document)
 */
export function initializeCharts(container) {
  const nodes = (container || document).querySelectorAll(
    '[data-chart-plugin="true"][data-chart-spec]:not([data-chart-initialized="true"])'
  );

  if (nodes.length === 0) return;

  nodes.forEach(node => {
    // Basic check if node is in DOM and visible (optional but safer for ECharts)
    if (!node.isConnected) return;

    const encoded = node.getAttribute('data-chart-spec');
    const spec = decodeSpec(encoded);
    if (!spec) return;

    try {
      const option = buildEChartOptions(spec);
      renderEChart(node, option, spec.theme || 'light');
      node.setAttribute('data-chart-initialized', 'true');
    } catch (err) {
      console.error('chart-plugin: failed to render chart', err);
    }
  });
}

// Global observer to catch charts added to the DOM dynamically
if (typeof window !== 'undefined' && !window._chartObserverInitialized) {
  const observer = new MutationObserver((mutations) => {
    let hasNewCharts = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.hasAttribute?.('data-chart-plugin') || node.querySelector?.('[data-chart-plugin="true"]')) {
              hasNewCharts = true;
            }
          }
        });
      }
    });
    if (hasNewCharts) {
      // Small delay to ensure styles are applied and layout is stable
      setTimeout(() => initializeCharts(document), 50);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window._chartObserverInitialized = true;
}

export const chartPlugin = {
  name: 'chart',
  priority: 4,
  canHandle: content => {
    CHART_REGEX.lastIndex = 0;
    return CHART_REGEX.test(content);
  },
  render: content => {
    const sections = splitChartContent(content);

    const wrapper = document.createElement('div');
    wrapper.className = 'chart-content-wrapper';

    sections.forEach((sec, i) => {
      if (sec.type === 'text') {
        if (sec.content) {
          const textDiv = document.createElement('div');
          textDiv.className = 'text-section';
          textDiv.innerHTML = textPlugin.render(sec.content);
          wrapper.appendChild(textDiv);
        }
      } else if (sec.type === 'chart') {
        const chartSpec = safeJsonParseChart(sec.content) || {};
        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart-section';

        const canvasDiv = document.createElement('div');
        canvasDiv.className = 'echart-canvas';
        canvasDiv.style.width = '100%';
        canvasDiv.style.height = '400px';
        canvasDiv.style.margin = '16px 0';
        canvasDiv.setAttribute('data-chart-plugin', 'true');
        canvasDiv.setAttribute('data-chart-spec', encodeSpec(chartSpec));

        chartDiv.appendChild(canvasDiv);
        wrapper.appendChild(chartDiv);
      }
    });

    // We return the HTML, and the MutationObserver created above will handle
    // initialization once this HTML is actually inserted into the DOM.
    return wrapper.innerHTML;
  },
};
