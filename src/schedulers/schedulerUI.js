import { cloneDeep } from "lodash";
import { REPEAT_TYPES, MONTH_DAYS, TIMEZONES, getTodayDateString } from "./schedulerConstants.js";
import { createTimeAutocomplete } from "./timeAutocomplete.js";
import { createDaysOfWeekToggle } from "./daysOfWeekToggle.js";
import { buildRepeatTypeConfig, parseServerScheduleConfig, getScheduleSummary, validateSchedulerPayload } from "./schedulerHelpers.js";
import { createScheduler, getSchedulers } from "./schedulers.js";
import store from "../redux/store";

// ─── Toast System ────────────────────────────────────────────────────────────

const showToast = (message, variant = "danger") => {
  const container = document.querySelector(".sch-toast-container") || (() => {
    const el = document.createElement("div");
    el.className = "sch-toast-container";
    document.body.appendChild(el);
    return el;
  })();

  const toast = document.createElement("div");
  toast.className = `sch-toast sch-toast-${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add("sch-toast-exit"); setTimeout(() => toast.remove(), 300); }, 3000);
};

// ─── Modal 3: Timezone Dialog ────────────────────────────────────────────────

const openTimezoneModal = (currentTz, useUserTimezone, onSelect) => {
  const overlay = document.createElement("div");
  overlay.className = "sch-modal-overlay sch-tz-overlay";

  const dialog = document.createElement("div");
  dialog.className = "sch-modal sch-tz-modal";

  const header = document.createElement("div");
  header.className = "sch-modal-header";
  header.innerHTML = `<span class="sch-modal-title">Time Zone</span>`;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sch-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => overlay.remove());
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  const searchWrap = document.createElement("div");
  searchWrap.className = "sch-tz-search-wrap";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "sch-tz-search";
  searchInput.placeholder = "Search timezone";
  searchWrap.appendChild(searchInput);
  dialog.appendChild(searchWrap);

  const listWrap = document.createElement("div");
  listWrap.className = "sch-tz-list";

  const endUserItem = document.createElement("div");
  endUserItem.className = `sch-tz-item${useUserTimezone ? " selected" : ""}`;
  endUserItem.innerHTML = `<div class="sch-tz-primary">End User specific</div><div class="sch-tz-secondary">Uses the timezone of end user</div>`;
  endUserItem.addEventListener("click", () => {
    onSelect({ timezone: "", useUserTimezone: true });
    overlay.remove();
  });
  listWrap.appendChild(endUserItem);

  const noResults = document.createElement("div");
  noResults.className = "sch-tz-no-results";
  noResults.style.display = "none";
  noResults.innerHTML = `<div>No results found</div>`;

  const renderList = (filter) => {
    listWrap.querySelectorAll(".sch-tz-item:not(:first-child)").forEach((el) => el.remove());
    noResults.remove();

    const q = (filter || "").toLowerCase();
    const filtered = TIMEZONES.filter((t) => !q || t.tz.toLowerCase().includes(q) || t.display.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
      listWrap.appendChild(noResults);
      noResults.style.display = "";
      return;
    }

    filtered.forEach((t) => {
      const item = document.createElement("div");
      item.className = `sch-tz-item${!useUserTimezone && currentTz === t.tz ? " selected" : ""}`;
      item.innerHTML = `<div class="sch-tz-primary">${t.tz}</div><div class="sch-tz-secondary">${t.display} - ${t.name}</div>`;
      item.addEventListener("click", () => {
        onSelect({ timezone: t.tz, useUserTimezone: false });
        overlay.remove();
      });
      listWrap.appendChild(item);
    });
  };

  renderList("");

  let debounceTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderList(searchInput.value), 500);
  });

  dialog.appendChild(listWrap);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  searchInput.focus();
};

// ─── Modal 4: Agent Selector ─────────────────────────────────────────────────

const openAgentSelector = (onSelect) => {
  const overlay = document.createElement("div");
  overlay.className = "sch-modal-overlay sch-agent-overlay";

  const dialog = document.createElement("div");
  dialog.className = "sch-modal sch-agent-modal";

  const header = document.createElement("div");
  header.className = "sch-modal-header";
  header.innerHTML = `<span class="sch-modal-title">Select Agent</span>`;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sch-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => overlay.remove());
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  const listWrap = document.createElement("div");
  listWrap.className = "sch-agent-list";

  const state = store.getState();
  const agents = state.global?.enabledAgents || state.global?.allAgents?.data?.agents || [];

  if (agents.length === 0) {
    listWrap.innerHTML = `<div class="sch-agent-empty">No agents available.</div>`;
  }

  agents.forEach((agent) => {
    const item = document.createElement("div");
    item.className = "sch-agent-item";
    item.innerHTML = `
      <span class="sch-agent-icon">${agent.icon ? `<img src="${agent.icon}" alt="" />` : "👤"}</span>
      <span class="sch-agent-name">${agent.name || agent.id}</span>
    `;
    item.addEventListener("click", () => {
      onSelect({ id: agent.id, name: agent.name, icon: agent.icon, type: agent.type });
      overlay.remove();
    });
    listWrap.appendChild(item);
  });

  dialog.appendChild(listWrap);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
};

// ─── Modal 2: Schedule Config Modal ──────────────────────────────────────────

const openScheduleConfigModal = (config, onDone, onCancel) => {
  let cfg = cloneDeep(config);

  const overlay = document.createElement("div");
  overlay.className = "sch-modal-overlay sch-config-overlay";

  const dialog = document.createElement("div");
  dialog.className = "sch-modal sch-config-modal";

  const header = document.createElement("div");
  header.className = "sch-modal-header";
  header.innerHTML = `<span class="sch-modal-title">📅 Schedule</span>`;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sch-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => { onCancel(); overlay.remove(); });
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  const body = document.createElement("div");
  body.className = "sch-modal-body";

  const renderFields = () => {
    body.innerHTML = "";

    // Repeat type selector
    const repeatWrap = document.createElement("div");
    repeatWrap.className = "sch-field";
    repeatWrap.innerHTML = `<label class="sch-field-label">Repeats</label>`;
    const select = document.createElement("select");
    select.className = "sch-select";
    REPEAT_TYPES.forEach((rt) => {
      const opt = document.createElement("option");
      opt.value = rt.value;
      opt.textContent = rt.label;
      opt.selected = rt.value === cfg.repeatType;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      cfg = buildRepeatTypeConfig(select.value, cfg.timezone);
      cfg.useUserTimezone = config.useUserTimezone;
      renderFields();
    });
    repeatWrap.appendChild(select);
    body.appendChild(repeatWrap);

    const today = getTodayDateString();
    const rt = cfg.repeatType;

    // ─── once ───
    if (rt === "once") {
      const row = createTwoColRow();
      row.left.appendChild(createDateField("Date", cfg.startDate, today, (v) => { cfg.startDate = v; }));
      row.left.appendChild(createTimeAutocomplete({ label: "Time", value: cfg.time, meridian: cfg.meridian, onChange: (t) => { cfg.time = t.value; cfg.meridian = t.meridian; } }));
      body.appendChild(row.container);
    }

    // ─── hourly ───
    if (rt === "hourly") {
      body.appendChild(createNumberField("Repeat every __ hours", cfg.intervalHours, 1, 24, "Enter interval (hours)", (v) => { cfg.intervalHours = v; }));

      const row1 = createTwoColRow();
      row1.left.appendChild(createDateField("Start Date", cfg.startDate, today, (v) => { cfg.startDate = v; }));
      row1.right.appendChild(createTimeAutocomplete({ label: "Start Time", value: cfg.time, meridian: cfg.meridian, onChange: (t) => { cfg.time = t.value; cfg.meridian = t.meridian; } }));
      body.appendChild(row1.container);

      const row2 = createTwoColRow();
      row2.left.appendChild(createDateField("End Date", cfg.endDate, today, (v) => { cfg.endDate = v; }, cfg.neverEnd));
      row2.left.appendChild(createNeverEndCheckbox(cfg.neverEnd, (v) => { cfg.neverEnd = v; renderFields(); }));
      row2.right.appendChild(createTimeAutocomplete({ label: "End Time", value: cfg.endTime, meridian: cfg.endMeridian, disabled: cfg.neverEnd, onChange: (t) => { cfg.endTime = t.value; cfg.endMeridian = t.meridian; } }));
      body.appendChild(row2.container);
    }

    // ─── daily ───
    if (rt === "daily") {
      body.appendChild(createTimeAutocomplete({ label: "Time", value: cfg.time, meridian: cfg.meridian, onChange: (t) => { cfg.time = t.value; cfg.meridian = t.meridian; } }));
      body.appendChild(createCheckbox("Exclude weekends", cfg.excludeWeekends, (v) => { cfg.excludeWeekends = v; }));

      const row = createTwoColRow();
      row.left.appendChild(createDateField("End Date", cfg.endDate, today, (v) => { cfg.endDate = v; }, cfg.neverEnd));
      row.left.appendChild(createNeverEndCheckbox(cfg.neverEnd, (v) => { cfg.neverEnd = v; renderFields(); }));
      row.right.appendChild(createTimeAutocomplete({ label: "End Time", value: cfg.endTime, meridian: cfg.endMeridian, disabled: cfg.neverEnd, onChange: (t) => { cfg.endTime = t.value; cfg.endMeridian = t.meridian; } }));
      body.appendChild(row.container);
    }

    // ─── weekly ───
    if (rt === "weekly") {
      body.appendChild(createTimeAutocomplete({ label: "Time", value: cfg.time, meridian: cfg.meridian, onChange: (t) => { cfg.time = t.value; cfg.meridian = t.meridian; } }));
      body.appendChild(createDaysOfWeekToggle({ selectedDays: cfg.daysOfWeek, onChange: (d) => { cfg.daysOfWeek = d; } }));

      const row = createTwoColRow();
      row.left.appendChild(createDateField("End Date", cfg.endDate, today, (v) => { cfg.endDate = v; }, cfg.neverEnd));
      row.left.appendChild(createNeverEndCheckbox(cfg.neverEnd, (v) => { cfg.neverEnd = v; renderFields(); }));
      row.right.appendChild(createTimeAutocomplete({ label: "End Time", value: cfg.endTime, meridian: cfg.endMeridian, disabled: cfg.neverEnd, onChange: (t) => { cfg.endTime = t.value; cfg.endMeridian = t.meridian; } }));
      body.appendChild(row.container);
    }

    // ─── monthly ───
    if (rt === "monthly") {
      const daysWrap = document.createElement("div");
      daysWrap.className = "sch-field";
      daysWrap.innerHTML = `<label class="sch-field-label">Days</label>`;
      const multiSelect = document.createElement("select");
      multiSelect.className = "sch-select sch-multi-select";
      multiSelect.multiple = true;
      multiSelect.disabled = cfg.isLastDayOfMonth;
      MONTH_DAYS.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        opt.selected = (cfg.daysOfMonth || []).includes(d);
        multiSelect.appendChild(opt);
      });
      multiSelect.addEventListener("change", () => {
        cfg.daysOfMonth = Array.from(multiSelect.selectedOptions, (o) => Number(o.value));
      });
      daysWrap.appendChild(multiSelect);
      const suffix = document.createElement("span");
      suffix.className = "sch-field-suffix";
      suffix.textContent = "of every month";
      daysWrap.appendChild(suffix);
      body.appendChild(daysWrap);

      body.appendChild(createCheckbox("Last day of month", cfg.isLastDayOfMonth, (v) => { cfg.isLastDayOfMonth = v; renderFields(); }));
      body.appendChild(createTimeAutocomplete({ label: "Time", value: cfg.time, meridian: cfg.meridian, onChange: (t) => { cfg.time = t.value; cfg.meridian = t.meridian; } }));

      const row = createTwoColRow();
      row.left.appendChild(createDateField("End Date", cfg.endDate, today, (v) => { cfg.endDate = v; }, cfg.neverEnd));
      row.left.appendChild(createNeverEndCheckbox(cfg.neverEnd, (v) => { cfg.neverEnd = v; renderFields(); }));
      row.right.appendChild(createTimeAutocomplete({ label: "End Time", value: cfg.endTime, meridian: cfg.endMeridian, disabled: cfg.neverEnd, onChange: (t) => { cfg.endTime = t.value; cfg.endMeridian = t.meridian; } }));
      body.appendChild(row.container);
    }

    // ─── cron ───
    if (rt === "cron") {
      body.appendChild(createTextField("Expression", cfg.cronExpression, "Enter cron expression (e.g. 0 9 * * 1-5)", (v) => { cfg.cronExpression = v; }));

      const row1 = createTwoColRow();
      row1.left.appendChild(createDateField("Start Date", cfg.startDate, today, (v) => { cfg.startDate = v; }));
      row1.right.appendChild(createTimeAutocomplete({ label: "Start Time", value: cfg.startTime, meridian: cfg.startMeridian, onChange: (t) => { cfg.startTime = t.value; cfg.startMeridian = t.meridian; } }));
      body.appendChild(row1.container);

      const row2 = createTwoColRow();
      row2.left.appendChild(createDateField("End Date", cfg.endDate, today, (v) => { cfg.endDate = v; }, cfg.neverEnd));
      row2.left.appendChild(createNeverEndCheckbox(cfg.neverEnd, (v) => { cfg.neverEnd = v; renderFields(); }));
      row2.right.appendChild(createTimeAutocomplete({ label: "End Time", value: cfg.endTime, meridian: cfg.endMeridian, disabled: cfg.neverEnd, onChange: (t) => { cfg.endTime = t.value; cfg.endMeridian = t.meridian; } }));
      body.appendChild(row2.container);
    }

    // ─── custom ───
    if (rt === "custom") {
      const rec = cfg.recurrence || {};
      const recWrap = document.createElement("div");
      recWrap.className = "sch-field sch-custom-repeat-row";
      recWrap.innerHTML = `<label class="sch-field-label">Repeats every</label>`;

      const intervalInput = document.createElement("input");
      intervalInput.type = "number";
      intervalInput.className = "sch-number-input";
      intervalInput.value = rec.interval || 15;
      intervalInput.min = rec.type === "minutes" ? 1 : 1;
      intervalInput.max = rec.type === "minutes" ? 59 : 23;
      intervalInput.placeholder = rec.type === "minutes" ? "Enter interval (min 15)" : "Enter interval hourly";
      intervalInput.addEventListener("input", () => {
        cfg.recurrence = { ...cfg.recurrence, interval: parseInt(intervalInput.value, 10) || 0 };
      });

      const recTypeSelect = document.createElement("select");
      recTypeSelect.className = "sch-select sch-inline-select";
      ["minutes", "hourly"].forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v === "minutes" ? "Minutes" : "Hours";
        opt.selected = rec.type === v;
        recTypeSelect.appendChild(opt);
      });
      recTypeSelect.addEventListener("change", () => {
        cfg.recurrence = { ...cfg.recurrence, type: recTypeSelect.value, interval: recTypeSelect.value === "minutes" ? 15 : 1 };
        renderFields();
      });

      recWrap.appendChild(intervalInput);
      recWrap.appendChild(recTypeSelect);
      body.appendChild(recWrap);

      body.appendChild(createTimeAutocomplete({ label: "Start Time", value: rec.startTime?.time, meridian: rec.startTime?.meridian, onChange: (t) => { cfg.recurrence = { ...cfg.recurrence, startTime: { time: t.value, meridian: t.meridian } }; } }));
      body.appendChild(createTimeAutocomplete({ label: "End Time", value: rec.endTime?.time, meridian: rec.endTime?.meridian, onChange: (t) => { cfg.recurrence = { ...cfg.recurrence, endTime: { time: t.value, meridian: t.meridian } }; } }));
      body.appendChild(createDaysOfWeekToggle({ selectedDays: cfg.daysOfWeek, onChange: (d) => { cfg.daysOfWeek = d; } }));

      const row1 = createTwoColRow();
      row1.left.appendChild(createDateField("Start Date", cfg.startDate, today, (v) => { cfg.startDate = v; }));
      body.appendChild(row1.container);

      const row2 = createTwoColRow();
      row2.left.appendChild(createDateField("End Date", cfg.endDate, today, (v) => { cfg.endDate = v; }, cfg.neverEnd));
      row2.left.appendChild(createNeverEndCheckbox(cfg.neverEnd, (v) => { cfg.neverEnd = v; renderFields(); }));
      body.appendChild(row2.container);
    }

    // ─── Timezone (always shown) ───
    const tzWrap = document.createElement("div");
    tzWrap.className = "sch-field sch-tz-field";
    tzWrap.innerHTML = `<label class="sch-field-label">Timezone</label>`;
    const tzBtn = document.createElement("button");
    tzBtn.type = "button";
    tzBtn.className = "sch-tz-btn";
    if (cfg.useUserTimezone || !cfg.timezone) {
      tzBtn.innerHTML = `<span>End User specific</span><span class="sch-tz-desc">(Uses the timezone of end user)</span><span class="sch-chevron">▾</span>`;
    } else {
      tzBtn.innerHTML = `<span>${cfg.timezone}</span><span class="sch-chevron">▾</span>`;
    }
    tzBtn.addEventListener("click", () => {
      openTimezoneModal(cfg.timezone, cfg.useUserTimezone, (result) => {
        cfg.timezone = result.timezone;
        cfg.useUserTimezone = result.useUserTimezone;
        renderFields();
      });
    });
    tzWrap.appendChild(tzBtn);
    body.appendChild(tzWrap);
  };

  renderFields();
  dialog.appendChild(body);

  // Footer
  const footer = document.createElement("div");
  footer.className = "sch-modal-footer";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "sch-btn sch-btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => { onCancel(); overlay.remove(); });

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "sch-btn sch-btn-primary";
  doneBtn.textContent = "Done";
  doneBtn.addEventListener("click", () => { onDone(cfg); overlay.remove(); });

  footer.appendChild(cancelBtn);
  footer.appendChild(doneBtn);
  dialog.appendChild(footer);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
};

// ─── Field Helpers ───────────────────────────────────────────────────────────

const createTwoColRow = () => {
  const container = document.createElement("div");
  container.className = "sch-two-col";
  const left = document.createElement("div");
  left.className = "sch-col";
  const right = document.createElement("div");
  right.className = "sch-col";
  container.appendChild(left);
  container.appendChild(right);
  return { container, left, right };
};

const createDateField = (label, value, min, onChange, disabled = false) => {
  const wrap = document.createElement("div");
  wrap.className = "sch-field";
  wrap.innerHTML = `<label class="sch-field-label">${label}</label>`;
  const input = document.createElement("input");
  input.type = "date";
  input.className = "sch-date-input";
  input.value = value || "";
  input.min = min;
  input.disabled = disabled;
  input.addEventListener("change", () => onChange(input.value));
  wrap.appendChild(input);
  return wrap;
};

const createNumberField = (label, value, min, max, placeholder, onChange) => {
  const wrap = document.createElement("div");
  wrap.className = "sch-field";
  wrap.innerHTML = `<label class="sch-field-label">${label}</label>`;
  const input = document.createElement("input");
  input.type = "number";
  input.className = "sch-number-input";
  input.value = value ?? "";
  input.min = min;
  input.max = max;
  input.placeholder = placeholder;
  input.addEventListener("input", () => onChange(parseInt(input.value, 10) || 0));
  wrap.appendChild(input);
  return wrap;
};

const createTextField = (label, value, placeholder, onChange) => {
  const wrap = document.createElement("div");
  wrap.className = "sch-field";
  wrap.innerHTML = `<label class="sch-field-label">${label}</label>`;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "sch-text-input";
  input.value = value || "";
  input.placeholder = placeholder;
  input.addEventListener("input", () => onChange(input.value));
  wrap.appendChild(input);
  return wrap;
};

const createCheckbox = (label, checked, onChange) => {
  const wrap = document.createElement("div");
  wrap.className = "sch-checkbox-wrap";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!checked;
  cb.addEventListener("change", () => onChange(cb.checked));
  const lbl = document.createElement("label");
  lbl.textContent = label;
  lbl.addEventListener("click", () => { cb.checked = !cb.checked; onChange(cb.checked); });
  wrap.appendChild(cb);
  wrap.appendChild(lbl);
  return wrap;
};

const createNeverEndCheckbox = (checked, onChange) => createCheckbox("Never end", checked, onChange);

// ─── Modal 1: Scheduler Dialog (Main Form) ──────────────────────────────────

/**
 * Opens the main scheduler dialog.
 *
 * @param {object} opts
 * @param {object|null} opts.agentDetails - Existing scheduler data (for edit), or { isCreateFlow: true } for create
 * @param {function} opts.onComplete - Called after successful create/update to refresh list
 */
export const openSchedulerDialog = (opts = {}) => {
  const { agentDetails = null, onComplete } = opts;
  const isCreateFlow = !agentDetails?.schedule;
  const canEdit = agentDetails?.schedule?.canEdit !== false;
  const schedule = agentDetails?.schedule || {};

  let selectedAgent = isCreateFlow ? null : { id: agentDetails.agentId, name: agentDetails.name, icon: agentDetails.icon, type: agentDetails.type };
  let schedulerConfig = isCreateFlow
    ? buildRepeatTypeConfig("daily", store.getState().global?.profile?.data?.timezone)
    : parseServerScheduleConfig(schedule.config);
  let instructionToAgent = isCreateFlow
    ? (agentDetails?.sampleUtterances?.[0] || "")
    : (schedule.instruction || agentDetails?.sampleUtterances?.[0] || "");
  let notifications = isCreateFlow
    ? (agentDetails?.type === "agenticApp" ? "onStart" : "onCompletion")
    : (schedule.notifications?.trigger || "onCompletion");
  let enabled = isCreateFlow ? true : (schedule.enabled ?? true);
  let loading = false;
  let configBackup = null;
  let hasConfiguredSchedule = !isCreateFlow;

  const overlay = document.createElement("div");
  overlay.className = "sch-modal-overlay sch-main-overlay";

  const dialog = document.createElement("div");
  dialog.className = "sch-modal sch-main-modal";

  // ─── Header ───
  const header = document.createElement("div");
  header.className = "sch-modal-header";
  let titleHtml = `<span class="sch-modal-title">📅 Schedule</span>`;
  if (!isCreateFlow && !schedule.canEdit) {
    titleHtml += `<span class="sch-shared-label">(Shared by agent creator)</span>`;
  }
  header.innerHTML = titleHtml;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sch-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => overlay.remove());
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // ─── Body ───
  const body = document.createElement("div");
  body.className = `sch-modal-body${!canEdit ? " disabled-content" : ""}`;

  const renderBody = () => {
    body.innerHTML = "";

    // Section A: Agent selector
    const agentSec = document.createElement("div");
    agentSec.className = "sch-section";
    agentSec.innerHTML = `<label class="sch-field-label">Agent</label>`;

    if (selectedAgent) {
      const chip = document.createElement("div");
      chip.className = "sch-agent-chip";
      if (!isCreateFlow) chip.style.opacity = "0.7";
      chip.innerHTML = `
        <span class="sch-agent-chip-icon">${selectedAgent.icon ? `<img src="${selectedAgent.icon}" alt="" />` : "👤"}</span>
        <span class="sch-agent-chip-name">${selectedAgent.name || selectedAgent.id}</span>
      `;
      if (isCreateFlow) {
        chip.style.pointerEvents = "";
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "sch-agent-chip-remove";
        removeBtn.innerHTML = "&times;";
        removeBtn.addEventListener("click", () => { selectedAgent = null; renderBody(); updateFooter(); });
        chip.appendChild(removeBtn);
      } else {
        chip.style.pointerEvents = "none";
      }
      agentSec.appendChild(chip);
    } else {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "sch-add-agent-btn";
      addBtn.innerHTML = `<span>＋</span> Agent`;
      addBtn.addEventListener("click", () => {
        openAgentSelector((agent) => {
          selectedAgent = agent;
          if (agent.type === "agenticApp") notifications = "onStart";
          else notifications = "onCompletion";
          renderBody();
          updateFooter();
        });
      });
      agentSec.appendChild(addBtn);
    }
    body.appendChild(agentSec);

    // Section B: Schedule config summary
    const schedSec = document.createElement("div");
    schedSec.className = "sch-section";
    schedSec.innerHTML = `<label class="sch-field-label">Schedule</label><p class="sch-field-desc">Configure the frequency of the scheduler</p>`;
    const schedBtn = document.createElement("button");
    schedBtn.type = "button";
    schedBtn.className = "sch-schedule-summary-btn";
    schedBtn.innerHTML = `<span class="sch-schedule-icon">📅</span><span class="sch-schedule-text">${hasConfiguredSchedule ? getScheduleSummary(schedulerConfig) : "Schedule not configured"}</span>`;
    schedBtn.addEventListener("click", () => {
      configBackup = cloneDeep(schedulerConfig);
      openScheduleConfigModal(
        schedulerConfig,
        (updatedCfg) => { schedulerConfig = updatedCfg; hasConfiguredSchedule = true; renderBody(); },
        () => { if (configBackup) schedulerConfig = configBackup; }
      );
    });
    schedSec.appendChild(schedBtn);
    body.appendChild(schedSec);

    // Section C: Instruction
    const instrSec = document.createElement("div");
    instrSec.className = "sch-section";
    instrSec.innerHTML = `<label class="sch-field-label">Instruction</label><p class="sch-field-desc">The instruction that should be provided to run the agent based on the schedule</p>`;
    const textarea = document.createElement("textarea");
    textarea.className = "sch-textarea";
    textarea.rows = 5;
    textarea.placeholder = "Enter instruction for the agent";
    textarea.value = instructionToAgent;
    textarea.addEventListener("input", () => { instructionToAgent = textarea.value; updateFooter(); });
    instrSec.appendChild(textarea);
    body.appendChild(instrSec);

    // Section D: Notification behavior
    const behavSec = document.createElement("div");
    behavSec.className = "sch-section";
    behavSec.innerHTML = `<label class="sch-field-label">Behavior</label>`;

    const isAgenticApp = selectedAgent?.type === "agenticApp";

    const radioOnStart = createRadio("notifications", "onStart", "Ask before running", "notify and run only after user approval", notifications === "onStart", (v) => { notifications = v; });
    behavSec.appendChild(radioOnStart);

    if (!isAgenticApp) {
      const radioOnComp = createRadio("notifications", "onCompletion", "Run automatically", "run on schedule and notify when done", notifications === "onCompletion", (v) => { notifications = v; });
      behavSec.appendChild(radioOnComp);
    }

    body.appendChild(behavSec);
  };

  renderBody();
  dialog.appendChild(body);

  // ─── Footer ───
  const footer = document.createElement("div");
  footer.className = "sch-modal-footer";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "sch-btn sch-btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => overlay.remove());

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "sch-btn sch-btn-primary";
  doneBtn.textContent = "Done";

  const updateFooter = () => {
    const disabled = !instructionToAgent?.trim() || loading;
    doneBtn.disabled = disabled;
    cancelBtn.disabled = loading;
  };

  doneBtn.addEventListener("click", async () => {
    const errors = validateSchedulerPayload(schedulerConfig, instructionToAgent, selectedAgent);
    if (errors.length > 0) {
      errors.forEach((msg) => showToast(msg));
      return;
    }

    loading = true;
    doneBtn.textContent = "Saving...";
    updateFooter();

    try {
      const result = await createScheduler({
        schedulerId: isCreateFlow ? null : schedule.id,
        agentId: selectedAgent?.agentId || selectedAgent?.id || 'orchestrator',
        repeatType: schedulerConfig.repeatType,
        config: schedulerConfig,
        instruction: instructionToAgent,
        enabled,
        notifications,
      });

      if (result?.error) {
        showToast(result.message || "Unable to create or update the schedule");
      } else {
        overlay.remove();
        if (onComplete) onComplete();
      }
    } catch {
      showToast("Unable to create or update the schedule");
    } finally {
      loading = false;
      doneBtn.textContent = "Done";
      updateFooter();
    }
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(doneBtn);
  dialog.appendChild(footer);
  updateFooter();

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
};

// ─── Radio Helper ────────────────────────────────────────────────────────────

const createRadio = (name, value, label, description, checked, onChange) => {
  const wrap = document.createElement("div");
  wrap.className = "sch-radio-wrap";
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = name;
  radio.value = value;
  radio.checked = checked;
  radio.addEventListener("change", () => { if (radio.checked) onChange(value); });

  const lbl = document.createElement("div");
  lbl.className = "sch-radio-label";
  lbl.innerHTML = `<strong>${label}</strong><span class="sch-radio-desc">${description}</span>`;
  lbl.addEventListener("click", () => { radio.checked = true; onChange(value); });

  wrap.appendChild(radio);
  wrap.appendChild(lbl);
  return wrap;
};
