import { DAYS_OF_WEEK } from "./schedulerConstants.js";

/**
 * Returns default config for a given repeatType.
 */
export const buildRepeatTypeConfig = (repeatType, timezone) => {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = { repeatType, timezone: tz, useUserTimezone: false };

  switch (repeatType) {
    case "once":
      return { ...base, startDate: null, time: "08:00", meridian: "AM" };

    case "hourly":
      return { ...base, intervalHours: 1, startDate: null, time: "08:00", meridian: "AM", neverEnd: true, endDate: null, endTime: "05:00", endMeridian: "PM" };

    case "daily":
      return { ...base, time: "08:00", meridian: "AM", excludeWeekends: false, neverEnd: true, endDate: null, endTime: "05:00", endMeridian: "PM" };

    case "weekly":
      return { ...base, daysOfWeek: [1, 3, 5], time: "08:00", meridian: "AM", neverEnd: true, endDate: null, endTime: "05:00", endMeridian: "PM" };

    case "monthly":
      return { ...base, daysOfMonth: [1], isLastDayOfMonth: false, time: "08:00", meridian: "AM", neverEnd: true, endDate: null, endTime: "05:00", endMeridian: "PM" };

    case "cron":
      return { ...base, cronExpression: "", startDate: null, startTime: "08:00", startMeridian: "AM", neverEnd: true, endDate: null, endTime: "05:00", endMeridian: "PM" };

    case "custom":
      return {
        ...base,
        recurrence: { type: "minutes", interval: 15, startTime: { time: "08:00", meridian: "AM" }, endTime: { time: "05:00", meridian: "PM" } },
        daysOfWeek: [1, 3, 5],
        startDate: null,
        neverEnd: true,
        endDate: null,
      };

    default:
      return { ...base, time: "08:00", meridian: "AM" };
  }
};

/**
 * Splits an ISO date string back into { date (YYYY-MM-DD), time (hh:mm 12h), meridian }.
 */
const splitISO = (iso, timezone) => {
  if (!iso) return { date: null, time: "08:00", meridian: "AM" };
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || undefined,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).formatToParts(d);

    const get = (type) => (parts.find((p) => p.type === type) || {}).value || "";
    const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
    let hour = parseInt(get("hour"), 10);
    const minute = get("minute");
    const meridian = get("dayPeriod")?.toUpperCase() === "PM" ? "PM" : "AM";
    const time = `${String(hour).padStart(2, "0")}:${minute}`;
    return { date: dateStr, time, meridian };
  } catch {
    return { date: null, time: "08:00", meridian: "AM" };
  }
};

/**
 * Parses server schedule config into the local editor config format.
 * Inverse of the payload builder in createScheduler.
 */
export const parseServerScheduleConfig = (serverConfig) => {
  if (!serverConfig) return buildRepeatTypeConfig("daily");

  const { repeatType = "daily", timezone, useUserTimezone = false } = serverConfig;
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = { repeatType, timezone: tz, useUserTimezone };

  switch (repeatType) {
    case "once": {
      const s = splitISO(serverConfig.startDate, tz);
      return { ...base, startDate: s.date, time: s.time, meridian: s.meridian };
    }

    case "hourly": {
      const s = splitISO(serverConfig.startDate, tz);
      const e = splitISO(serverConfig.endDate, tz);
      return {
        ...base,
        intervalHours: serverConfig.intervalHours ?? 1,
        startDate: s.date,
        time: serverConfig.time || s.time,
        meridian: serverConfig.meridian || s.meridian,
        neverEnd: serverConfig.neverEnd ?? true,
        endDate: e.date,
        endTime: e.time,
        endMeridian: e.meridian,
      };
    }

    case "daily": {
      const e = splitISO(serverConfig.endDate, tz);
      return {
        ...base,
        time: serverConfig.time || "08:00",
        meridian: serverConfig.meridian || "AM",
        excludeWeekends: serverConfig.excludeWeekends ?? false,
        neverEnd: serverConfig.neverEnd ?? true,
        endDate: e.date,
        endTime: e.time,
        endMeridian: e.meridian,
      };
    }

    case "weekly": {
      const e = splitISO(serverConfig.endDate, tz);
      return {
        ...base,
        daysOfWeek: serverConfig.daysOfWeek ?? [1, 3, 5],
        time: serverConfig.time || "08:00",
        meridian: serverConfig.meridian || "AM",
        neverEnd: serverConfig.neverEnd ?? true,
        endDate: e.date,
        endTime: e.time,
        endMeridian: e.meridian,
      };
    }

    case "monthly": {
      const e = splitISO(serverConfig.endDate, tz);
      return {
        ...base,
        daysOfMonth: serverConfig.daysOfMonth ?? [1],
        isLastDayOfMonth: serverConfig.isLastDayOfMonth ?? false,
        time: serverConfig.time || "08:00",
        meridian: serverConfig.meridian || "AM",
        neverEnd: serverConfig.neverEnd ?? true,
        endDate: e.date,
        endTime: e.time,
        endMeridian: e.meridian,
      };
    }

    case "cron": {
      const s = splitISO(serverConfig.startDate, tz);
      const e = splitISO(serverConfig.endDate, tz);
      return {
        ...base,
        cronExpression: serverConfig.cronExpression || "",
        startDate: s.date,
        startTime: s.time,
        startMeridian: s.meridian,
        neverEnd: serverConfig.neverEnd ?? true,
        endDate: e.date,
        endTime: e.time,
        endMeridian: e.meridian,
      };
    }

    case "custom": {
      const s = splitISO(serverConfig.startDate, tz);
      return {
        ...base,
        recurrence: serverConfig.recurrence ?? { type: "minutes", interval: 15, startTime: { time: "08:00", meridian: "AM" }, endTime: { time: "05:00", meridian: "PM" } },
        daysOfWeek: serverConfig.daysOfWeek ?? [1, 3, 5],
        startDate: s.date,
        neverEnd: serverConfig.neverEnd ?? true,
        endDate: serverConfig.endDate ?? null,
      };
    }

    default:
      return buildRepeatTypeConfig("daily", tz);
  }
};

/**
 * Generates a human-readable summary of the schedule config.
 */
export const getScheduleSummary = (config) => {
  if (!config || !config.repeatType) return "Schedule not configured";

  const { repeatType, time, meridian, daysOfWeek, daysOfMonth, isLastDayOfMonth, intervalHours, cronExpression, recurrence, neverEnd, endDate, endTime, endMeridian, excludeWeekends } = config;

  const timeStr = time ? `${parseInt(time.split(":")[0], 10)}:${time.split(":")[1]} ${meridian}` : "";
  const endStr = !neverEnd && endDate ? ` till ${endDate} ${endTime || ""} ${endMeridian || ""}`.trim() : "";

  switch (repeatType) {
    case "once":
      return `Scheduled to run once${config.startDate ? ` on ${config.startDate}` : ""} at ${timeStr}.`;

    case "hourly":
      return `Scheduled to run every ${intervalHours} hour(s) starting at ${timeStr}${endStr}.`;

    case "daily":
      return `Scheduled to run daily at ${timeStr}${excludeWeekends ? " (excluding weekends)" : ""}${endStr}.`;

    case "weekly": {
      const dayLabels = (daysOfWeek || []).map((d) => (DAYS_OF_WEEK.find((dw) => dw.value === d) || {}).label || d).join(", ");
      return `Scheduled to run weekly on ${dayLabels} at ${timeStr}${endStr}.`;
    }

    case "monthly": {
      const dayStr = isLastDayOfMonth ? "last day" : (daysOfMonth || []).join(", ");
      return `Scheduled to run monthly on day(s) ${dayStr} at ${timeStr}${endStr}.`;
    }

    case "cron":
      return `Scheduled with cron: ${cronExpression || "(not set)"}${endStr}.`;

    case "custom": {
      const r = recurrence || {};
      return `Scheduled to repeat every ${r.interval || ""} ${r.type || ""}${endStr}.`;
    }

    default:
      return "Schedule not configured";
  }
};

/**
 * Validates the scheduler form and returns an array of error messages (empty = valid).
 */
export const validateSchedulerPayload = (config, instruction, selectedAgent) => {
  const errors = [];

  if (!selectedAgent?.id) errors.push("Please select an agent.");
  if (!instruction?.trim()) errors.push("Instruction is required.");
  if (!config?.repeatType) errors.push("Please select a repeat type.");

  const { repeatType } = config || {};

  if (repeatType === "once" && !config.startDate) errors.push("Please select a date.");
  if (repeatType === "once" && !config.time) errors.push("Please select a time.");

  if (repeatType === "hourly") {
    if (!config.intervalHours || config.intervalHours < 1 || config.intervalHours > 24) errors.push("Interval must be between 1 and 24 hours.");
    if (!config.startDate) errors.push("Please select a start date.");
  }

  if (repeatType === "cron" && !config.cronExpression?.trim()) errors.push("Cron expression is required.");

  if (repeatType === "custom") {
    const r = config.recurrence || {};
    if (r.type === "minutes" && (r.interval < 1 || r.interval > 59)) errors.push("Minutes interval must be between 1 and 59.");
    if (r.type === "hourly" && (r.interval < 1 || r.interval > 23)) errors.push("Hourly interval must be between 1 and 23.");
    if (!config.daysOfWeek?.length) errors.push("Please select at least one day.");
  }

  if (repeatType === "weekly" && !config.daysOfWeek?.length) errors.push("Please select at least one day.");

  if (repeatType === "monthly" && !config.isLastDayOfMonth && !config.daysOfMonth?.length) errors.push("Please select at least one day of the month.");

  if (!config.neverEnd && repeatType !== "once") {
    if (!config.endDate) errors.push("Please select an end date or check 'Never end'.");
  }

  return errors;
};
