import { DAYS_OF_WEEK } from "./schedulerConstants.js";

export const combineDateTimeToISO = (date, time, meridian, timezone) => {
  if (!date || !time || !meridian || !timezone) return null;

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mo = d.getMonth();
  const dd = d.getDate();

  let [hours, minutes] = time.split(":").map(Number);
  if (meridian.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (meridian.toUpperCase() === "AM" && hours === 12) hours = 0;

  const utcGuess = Date.UTC(yyyy, mo, dd, hours, minutes, 0, 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcGuess));

  const p = (type) => parseInt((parts.find((v) => v.type === type) || {}).value || "0", 10);
  const wallUTC = Date.UTC(p("year"), p("month") - 1, p("day"), p("hour") % 24, p("minute"), p("second"));

  return new Date(utcGuess - (wallUTC - utcGuess)).toISOString();
};

const getTodayInTimezone = (timezone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => (parts.find((p) => p.type === type) || {}).value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

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

export const parseServerScheduleConfig = (serverConfig) => {
  if (!serverConfig) return buildRepeatTypeConfig("daily");

  const { repeatType = "daily", timezone, useUserTimezone = false } = serverConfig;
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tz = useUserTimezone ? userTz : (timezone || userTz);
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

export const getScheduleSummary = (config) => {
  if (!config || !config.repeatType) return "Schedule not configured";

  const { repeatType, time, meridian, daysOfWeek, daysOfMonth, isLastDayOfMonth, intervalHours, cronExpression, recurrence, neverEnd, endDate, endTime, endMeridian, excludeWeekends, timezone, useUserTimezone } = config;

  const timeStr = time ? `${parseInt(time.split(":")[0], 10)}:${time.split(":")[1]} ${meridian}` : "";
  const endStr = !neverEnd && endDate ? ` till ${endDate} ${endTime || ""} ${endMeridian || ""}`.trim() : "";
  const tzLabel = useUserTimezone ? "(user timezone)" : (timezone ? `(${timezone})` : "");

  switch (repeatType) {
    case "once":
      return `Scheduled to run once${config.startDate ? ` on ${config.startDate}` : ""} at ${timeStr} ${tzLabel}.`.replace(/\s+\./g, ".");

    case "hourly":
      return `Scheduled to run every ${intervalHours} hour(s) starting at ${timeStr} ${tzLabel}${endStr}.`.replace(/\s+\./g, ".");

    case "daily":
      return `Scheduled to run daily at ${timeStr}${excludeWeekends ? " (excluding weekends)" : ""} ${tzLabel}${endStr}.`.replace(/\s+\./g, ".");

    case "weekly": {
      const dayLabels = (daysOfWeek || []).map((d) => (DAYS_OF_WEEK.find((dw) => dw.value === d) || {}).label || d).join(", ");
      return `Scheduled to run weekly on ${dayLabels} at ${timeStr} ${tzLabel}${endStr}.`.replace(/\s+\./g, ".");
    }

    case "monthly": {
      const dayStr = isLastDayOfMonth ? "last day" : (daysOfMonth || []).join(", ");
      return `Scheduled to run monthly on day(s) ${dayStr} at ${timeStr} ${tzLabel}${endStr}.`.replace(/\s+\./g, ".");
    }

    case "cron":
      return `Scheduled with cron: ${cronExpression || "(not set)"} ${tzLabel}${endStr}.`.replace(/\s+\./g, ".");

    case "custom": {
      const r = recurrence || {};
      return `Scheduled to repeat every ${r.interval || ""} ${r.type || ""} ${tzLabel}${endStr}.`.replace(/\s+\./g, ".");
    }

    default:
      return "Schedule not configured";
  }
};

export const validateSchedulerPayload = (config, instruction, selectedAgent) => {
  const errors = [];

  if (!selectedAgent?.id) errors.push("Please select an agent.");
  if (!instruction?.trim()) errors.push("Instruction is required.");
  if (!config?.repeatType) errors.push("Please select a repeat type.");

  const { repeatType } = config || {};
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const opTz = config?.useUserTimezone ? userTz : (config?.timezone || userTz);

  if (repeatType === "once") {
    if (!config.startDate) errors.push("Start date is required.");
    if (!config.time) errors.push("Start time is required.");
    if (!config.meridian) errors.push("Start time format (AM/PM) is required.");
  }

  if (repeatType === "hourly") {
    if (!config.intervalHours || config.intervalHours < 1 || config.intervalHours > 24)
      errors.push("Interval must be between 1 and 24 hours.");
    if (!config.startDate) errors.push("Start date is required.");
    if (!config.time) errors.push("Start time is required.");
    if (!config.meridian) errors.push("Start time format (AM/PM) is required.");
  }

  if (repeatType === "cron") {
    if (!config.cronExpression?.trim()) errors.push("Cron expression is required.");
    if (!config.startDate) errors.push("Start date is required.");
    if (!config.startTime) errors.push("Start time is required.");
    if (!config.startMeridian) errors.push("Start time format (AM/PM) is required.");
  }

  if (repeatType === "custom") {
    const r = config.recurrence || {};
    if (r.type === "minutes" && (r.interval < 1 || r.interval > 59))
      errors.push("Minutes interval must be between 1 and 59.");
    if (r.type === "hourly" && (r.interval < 1 || r.interval > 23))
      errors.push("Hourly interval must be between 1 and 23.");
    if (!config.daysOfWeek?.length) errors.push("Please select at least one day.");
    if (!config.startDate) errors.push("Start date is required.");
    if (r.type === "minutes" || r.type === "hourly") {
      if (!r.startTime?.time) errors.push("Start time is required.");
      if (!r.startTime?.meridian) errors.push("Start time format (AM/PM) is required.");
    }
  }

  if (repeatType === "weekly" && !config.daysOfWeek?.length)
    errors.push("Please select at least one day.");

  if (repeatType === "monthly" && !config.isLastDayOfMonth && !config.daysOfMonth?.length)
    errors.push("Please select at least one day of the month.");

  if (!config?.neverEnd && repeatType !== "once") {
    if (!config.endDate) errors.push("Please select an end date or check 'Never end'.");
  }

  if (errors.length > 0) return errors;

  const startISO = (() => {
    if (repeatType === "once" || repeatType === "hourly")
      return combineDateTimeToISO(config.startDate, config.time, config.meridian, opTz);
    if (repeatType === "cron")
      return combineDateTimeToISO(config.startDate, config.startTime, config.startMeridian, opTz);
    if (repeatType === "custom") {
      const r = config.recurrence || {};
      if (r.type === "minutes" || r.type === "hourly")
        return combineDateTimeToISO(config.startDate, r.startTime?.time, r.startTime?.meridian, opTz);
    }
    return null;
  })();

  if (["hourly", "cron", "custom"].includes(repeatType) && config.startDate) {
    const today = getTodayInTimezone(opTz);
    if (config.startDate < today) {
      errors.push("Start date should be minimum present day, not past.");
    }
  }

  const check15Min = (() => {
    if (repeatType === "once" || repeatType === "cron") return true;
    if (repeatType === "hourly") return config.startDate === getTodayInTimezone(opTz);
    if (repeatType === "custom") {
      const r = config.recurrence || {};
      return r.type === "minutes" || r.type === "hourly";
    }
    return false;
  })();

  if (check15Min && startISO) {
    const scheduledMs = new Date(startISO).getTime();
    const fifteenMinFromNow = Date.now() + 15 * 60 * 1000;
    if (scheduledMs < fifteenMinFromNow) {
      errors.push("You cannot schedule an agent less than 15 minutes from now.");
    }
  }

  if (["hourly", "cron", "custom"].includes(repeatType) && !config.neverEnd && config.endDate) {
    let endISO = null;

    if (repeatType === "hourly" || repeatType === "cron") {
      endISO = combineDateTimeToISO(config.endDate, config.endTime, config.endMeridian, opTz);
    } else if (repeatType === "custom") {
      const r = config.recurrence || {};
      if (r.endTime?.time && r.endTime?.meridian) {
        endISO = combineDateTimeToISO(config.endDate, r.endTime.time, r.endTime.meridian, opTz);
      }
    }

    if (startISO && endISO) {
      if (new Date(endISO).getTime() <= new Date(startISO).getTime()) {
        errors.push("End date must be after start date.");
      }
    } else if (startISO && !endISO && config.endDate && config.startDate) {
      if (config.endDate < config.startDate) {
        errors.push("End date must be after start date.");
      }
    }
  }

  return errors;
};
