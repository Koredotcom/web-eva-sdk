import { DAYS_OF_WEEK } from "./schedulerConstants.js";

/**
 * Creates a days-of-week multi-select toggle component.
 * Renders 7 pill buttons (Mon–Sun). Clicking toggles selection.
 *
 * @param {object} opts
 * @param {number[]} opts.selectedDays - Array of selected day indices (0=Sun, 1=Mon, etc.)
 * @param {function} opts.onChange - Called with updated selectedDays array
 * @returns {HTMLElement}
 */
export const createDaysOfWeekToggle = (opts = {}) => {
  let { selectedDays = [1, 3, 5], onChange } = opts;

  const wrapper = document.createElement("div");
  wrapper.className = "sch-days-of-week";

  const labelEl = document.createElement("label");
  labelEl.className = "sch-field-label";
  labelEl.textContent = "Repeats on";
  wrapper.appendChild(labelEl);

  const row = document.createElement("div");
  row.className = "sch-days-row";

  const buttons = [];

  DAYS_OF_WEEK.forEach((day) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sch-day-btn";
    btn.textContent = day.label;
    btn.dataset.value = day.value;

    if (selectedDays.includes(day.value)) btn.classList.add("selected");

    btn.addEventListener("click", () => {
      const idx = selectedDays.indexOf(day.value);
      if (idx >= 0) {
        selectedDays = selectedDays.filter((d) => d !== day.value);
      } else {
        selectedDays = [...selectedDays, day.value];
      }
      btn.classList.toggle("selected");
      if (onChange) onChange([...selectedDays]);
    });

    buttons.push(btn);
    row.appendChild(btn);
  });

  wrapper.appendChild(row);

  wrapper.update = (newDays) => {
    selectedDays = newDays;
    buttons.forEach((btn) => {
      btn.classList.toggle("selected", selectedDays.includes(Number(btn.dataset.value)));
    });
  };

  return wrapper;
};
