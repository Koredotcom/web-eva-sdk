import { TIME_OPTIONS } from "./schedulerConstants.js";

/**
 * Parses a flexible time string ("8", "8am", "830", "8:30pm", "1430") into
 * { value: "hh:mm", meridian: "AM"|"PM", label: "h:mmam" } or null.
 */
const parseTimeInput = (raw) => {
  if (!raw || !raw.trim()) return null;
  let str = raw.trim().toLowerCase();

  let forcedMeridian = null;
  if (str.endsWith("am")) { forcedMeridian = "AM"; str = str.slice(0, -2).trim(); }
  else if (str.endsWith("pm")) { forcedMeridian = "PM"; str = str.slice(0, -2).trim(); }

  str = str.replace(/[^0-9:]/g, "");
  let hours, minutes;

  if (str.includes(":")) {
    const parts = str.split(":");
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10) || 0;
  } else if (str.length <= 2) {
    hours = parseInt(str, 10);
    minutes = 0;
  } else if (str.length === 3) {
    hours = parseInt(str[0], 10);
    minutes = parseInt(str.slice(1), 10);
  } else if (str.length >= 4) {
    hours = parseInt(str.slice(0, 2), 10);
    minutes = parseInt(str.slice(2, 4), 10);
  } else {
    return null;
  }

  if (isNaN(hours)) return null;
  if (minutes >= 60) minutes = 0;

  if (hours > 23) {
    if (forcedMeridian) {
      hours = hours > 12 ? 12 : hours;
    } else {
      return null;
    }
  }

  if (hours > 12 && !forcedMeridian) {
    forcedMeridian = "PM";
    hours -= 12;
  }

  if (!forcedMeridian) {
    forcedMeridian = hours >= 1 && hours <= 6 ? "PM" : "AM";
  }

  if (hours === 0) { hours = 12; forcedMeridian = "AM"; }

  const roundedMin = Math.floor(minutes / 15) * 15;
  const mm = String(roundedMin).padStart(2, "0");
  const value = `${String(hours).padStart(2, "0")}:${mm}`;
  const label = `${hours}:${mm}${forcedMeridian.toLowerCase()}`;
  return { value, meridian: forcedMeridian, label };
};

/**
 * Creates a time autocomplete input with dropdown.
 *
 * @param {object} opts
 * @param {string} opts.label - Field label ("Time", "Start Time", "End Time")
 * @param {string} opts.value - Current time value "hh:mm"
 * @param {string} opts.meridian - Current meridian "AM"|"PM"
 * @param {boolean} opts.disabled - Whether field is disabled
 * @param {function} opts.onChange - Called with ({ value, meridian, label })
 * @returns {HTMLElement}
 */
export const createTimeAutocomplete = (opts = {}) => {
  const { label = "Time", value = "", meridian = "AM", disabled = false, onChange } = opts;

  const wrapper = document.createElement("div");
  wrapper.className = "sch-time-autocomplete";

  const labelEl = document.createElement("label");
  labelEl.className = "sch-field-label";
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const inputWrap = document.createElement("div");
  inputWrap.className = "sch-time-input-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "sch-time-input";
  input.placeholder = "Select time";
  input.disabled = disabled;

  const formatDisplay = (v, m) => {
    if (!v) return "";
    const h = parseInt(v.split(":")[0], 10);
    const mm = v.split(":")[1] || "00";
    return `${h}:${mm}${(m || "AM").toLowerCase()}`;
  };
  input.value = formatDisplay(value, meridian);

  const dropdown = document.createElement("div");
  dropdown.className = "sch-time-dropdown";
  dropdown.style.display = "none";

  TIME_OPTIONS.forEach((opt) => {
    const item = document.createElement("div");
    item.className = "sch-time-option";
    item.textContent = opt.label;
    item.dataset.value = opt.value;
    item.dataset.meridian = opt.meridian;
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      input.value = opt.label;
      dropdown.style.display = "none";
      if (onChange) onChange({ value: opt.value, meridian: opt.meridian, label: opt.label });
    });
    dropdown.appendChild(item);
  });

  let originalValue = input.value;
  let highlightIdx = -1;
  let debounceTimer = null;

  const highlightOption = (idx) => {
    const items = dropdown.querySelectorAll(".sch-time-option");
    items.forEach((el, i) => el.classList.toggle("highlighted", i === idx));
    if (items[idx]) items[idx].scrollIntoView({ block: "nearest" });
    highlightIdx = idx;
  };

  const findClosestIdx = (parsed) => {
    if (!parsed) return -1;
    const target24 = parsed.meridian === "PM" && parseInt(parsed.value) !== 12
      ? parseInt(parsed.value) + 12 : parsed.meridian === "AM" && parseInt(parsed.value) === 12
      ? 0 : parseInt(parsed.value);
    const targetMin = parseInt(parsed.value.split(":")[1]) || 0;
    let best = 0;
    for (let i = 0; i < TIME_OPTIONS.length; i++) {
      if (TIME_OPTIONS[i].h24 < target24 || (TIME_OPTIONS[i].h24 === target24 && TIME_OPTIONS[i].m <= targetMin)) {
        best = i;
      }
    }
    return best;
  };

  input.addEventListener("focus", () => {
    originalValue = input.value;
    highlightIdx = -1;
    dropdown.style.display = "block";
    const items = dropdown.querySelectorAll(".sch-time-option");
    items.forEach((el) => (el.style.display = ""));
  });

  input.addEventListener("input", () => {
    dropdown.style.display = "block";
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const parsed = parseTimeInput(input.value);
      const idx = findClosestIdx(parsed);
      highlightOption(idx);
    }, 300);
  });

  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll(".sch-time-option");
    const visibleCount = items.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightOption(Math.min(highlightIdx + 1, visibleCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightOption(Math.max(highlightIdx - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && items[highlightIdx]) {
        items[highlightIdx].dispatchEvent(new MouseEvent("mousedown"));
      } else {
        commitValue();
      }
      dropdown.style.display = "none";
    } else if (e.key === "Escape") {
      dropdown.style.display = "none";
    }
  });

  const commitValue = () => {
    const parsed = parseTimeInput(input.value);
    if (parsed) {
      input.value = parsed.label;
      if (onChange) onChange(parsed);
    } else {
      const now = new Date();
      const h = now.getHours();
      const m = Math.floor(now.getMinutes() / 15) * 15;
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const mer = h < 12 ? "AM" : "PM";
      const mm = String(m).padStart(2, "0");
      const fallback = { value: `${String(h12).padStart(2, "0")}:${mm}`, meridian: mer, label: `${h12}:${mm}${mer.toLowerCase()}` };
      input.value = fallback.label;
      if (onChange) onChange(fallback);
    }
  };

  input.addEventListener("blur", () => {
    setTimeout(() => { dropdown.style.display = "none"; }, 150);
    commitValue();
  });

  inputWrap.appendChild(input);
  inputWrap.appendChild(dropdown);
  wrapper.appendChild(inputWrap);

  wrapper.update = (newOpts) => {
    if (newOpts.disabled !== undefined) input.disabled = newOpts.disabled;
    if (newOpts.value !== undefined || newOpts.meridian !== undefined) {
      input.value = formatDisplay(newOpts.value ?? value, newOpts.meridian ?? meridian);
    }
  };

  return wrapper;
};
