import store from "../redux/store";
import axiosInstance from "../api/axiosInstance";
import { fetchSchedulers as fetchSchedulersThunk, createOrUpdateScheduler as createOrUpdateSchedulerThunk, deleteScheduler as deleteSchedulerThunk } from "../redux/actions/global.action";
import { setSchedulers } from "../redux/globalSlice";

/**
 * Normalizes API or store response to an array of schedulers.
 * @param {any} data - Raw response (array or object with schedulers/data)
 * @returns {Array}
 */
const normalizeSchedulers = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.schedulers) return data.schedulers;
  if (data?.data) return Array.isArray(data.data) ? data.data : [];
  return [];
};

/**
 * Returns a promise that resolves with the list of schedulers from store.
 * Uses store subscription pattern (vanilla JS style, same as agents).
 * Call fetchSchedulers() first to load data from the API.
 *
 * @returns {Promise<{ status: string, error: any, data: Array }>}
 */
export const subscribeToSchedulers = () => {
  return new Promise((resolve) => {
    const state = store.getState();
    const { status, error, schedulers } = state.global?.schedulers ?? {};        

    if (status && status !== "loading") {
      resolve({ status, error, data: schedulers });
      return;
    }

    const unsubscribe = store.subscribe(() => {
      const currentState = store.getState();
      const { status: s, error: e, data: d } = currentState.global?.schedulers ?? {};
      if (s && s !== "loading") {
        unsubscribe();
        resolve({ status: s, error: e, data: normalizeSchedulers(d) });
      }
    });
  });
};

/**
 * Fetches schedulers directly from the API (on demand). Does not rely on Redux
 * subscription. Use when you need data once (e.g. when a modal opens) without
 * waiting for the store.
 *
 * @param {{ userId?: string, params?: object, updateStore?: boolean }} [options]
 *   - userId: optional; defaults to store.global.profile.data.id
 *   - params: optional query/request params
 *   - updateStore: if true, updates Redux after success so the rest of the app stays in sync (default: false)
 * @returns {Promise<{ status: 'success'|'failed', error?: any, data: Array }>}
 */
export const getSchedulers = async (options = {}) => {
  const { userId: optionsUserId, params, updateStore = false } = options;
  const state = store.getState();
  const userId = optionsUserId ?? state.global?.profile?.data?.id;

  if (!userId) {
    return {
      status: "failed",
      error: { message: "User ID not available" },
      data: [],
    };
  }

  try {
    const response = await axiosInstance.get(`1.1/users/${userId}/schedulers`, {
      params,
    });
    const raw = response?.data;    
    // const data = normalizeSchedulers(raw);  
    store.dispatch(setSchedulers({ status: "success", 'schedulers':raw }))
    return { status: "success", 'schedulers':raw };
  } catch (error) {
    const err = error?.response?.data ?? { message: error?.message };    
    store.dispatch(setSchedulers({ status: "failed", error: err, 'schedulers':{} }))
    return {
      status: "failed",
      error: err,
      data: [],
    };
  }
};

/** Alias for getSchedulers - fetches list of schedulers from API. */
export const getListOfSchedulers = getSchedulers;

/**
 * Deletes a scheduler by ID via the API.
 *
 * @param {string} schedulerId - The scheduler ID to delete
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const deleteSchedulerById = async (schedulerId) => {
  const state = store.getState();
  const userId = state.global?.profile?.data?.id;

  if (!userId || !schedulerId) {
    return { success: false, error: "Missing userId or schedulerId" };
  }

  try {
    await store.dispatch(deleteSchedulerThunk({ userId, schedulerId })).unwrap();
    return { success: true };
  } catch {
    return { success: false, error: "Unable to delete the schedule" };
  }
};

/**
 * Toggles a scheduler's enabled state. If the scheduler has no valid schedule
 * (missing schedule or "once" without startDate), returns { openDialog: true }
 * so the caller can open the create/edit dialog instead.
 *
 * @param {object} agent - Full scheduler/agent item from the list
 * @returns {Promise<{ success: boolean, openDialog?: boolean, updatedSchedule?: object, error?: string }>}
 */
export const toggleScheduler = async (agent) => {
  const schedule = agent?.schedule;

  const hasNoSchedule = !agent.hasOwnProperty("schedule") || !schedule;
  const isIncompleteOnce = schedule?.config?.repeatType === "once" && !schedule?.config?.startDate;

  if (hasNoSchedule || isIncompleteOnce) {
    return { success: false, openDialog: true };
  }

  const state = store.getState();
  const userId = state.global?.profile?.data?.id;
  const profileTz = state.global?.profile?.data?.timezone;

  const allAgents = (state.global?.allAgents?.data?.agents || []).filter((a) => !!a.enabled);
  const commonAgents = (state.global?.allAgents?.data?.commonAgents || state.global?.commonAgents || []);
  const filteredCommon = (Array.isArray(commonAgents) ? commonAgents : []).filter((a) => !a.disabled);
  const combined = [...allAgents, ...filteredCommon];
  const agentName = agent.name || agent.agentName;
  const matchedAgent = combined.find(
    (a) => a.id === (agent.agentId || agent.id) || a.name === agentName
  );
  const agentId = matchedAgent?.id || agent.agentId || agent.id;

  const payload = { ...schedule, enabled: !schedule.enabled, agentId };

  if (!payload.config) {
    payload.config = {
      repeatType: "once",
      timezone: profileTz || "Pacific/Tongatapu",
      startDate: new Date().toISOString(),
      useUserTimezone: false,
    };
  }

  if (!payload.instruction) {
    payload.instruction = "Execute schedule";
  }

  if (!payload.notifications?.trigger) {
    payload.notifications = { trigger: "onCompletion" };
  }

  try {
    await store.dispatch(
      createOrUpdateSchedulerThunk({ userId, schedulerId: agent.id, payload })
    ).unwrap();
    return { success: true, updatedSchedule: payload };
  } catch {
    return { success: false, error: "Unable to update the schedule" };
  }
};

/**
 * Combines a date, 12-hour time, meridian, and IANA timezone into an ISO 8601 UTC string.
 * Interprets the wall-clock time in the given timezone, then converts to UTC.
 *
 * @param {Date|string} date
 * @param {string} time - "hh:mm"
 * @param {string} meridian - "AM" or "PM"
 * @param {string} timezone - IANA timezone (e.g. "America/New_York")
 * @returns {string|null} ISO string or null if any input is missing/invalid
 */
const combineDateTimeToISO = (date, time, meridian, timezone) => {
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
  const wallAtGuess = new Date(
    new Date(utcGuess).toLocaleString("en-US", { timeZone: timezone })
  );
  const offset = wallAtGuess.getTime() - utcGuess;
  return new Date(utcGuess - offset).toISOString();
};

/**
 * Creates or updates an agent scheduler via the platform API.
 * Automatically builds the correct payload based on repeatType and determines
 * POST (create) vs PATCH (update) based on whether schedulerId is provided.
 *
 * @param {object} params
 * @param {string|null} params.schedulerId - If truthy → PATCH (update); otherwise → POST (create)
 * @param {string} params.agentId      - Agent to schedule
 * @param {string} params.repeatType   - "once"|"hourly"|"daily"|"weekly"|"monthly"|"cron"|"custom"
 * @param {object} params.config       - Type-specific configuration (see below)
 * @param {string} params.instruction  - Instruction text sent to the agent on each run
 * @param {boolean} params.enabled     - Whether the scheduler is active
 * @param {string} params.notifications - "onCompletion" or "onStart"
 * @returns {Promise<object>} Created/updated scheduler or { error: true, message: string }
 */
export const createScheduler = async ({
  schedulerId,
  agentId,
  repeatType,
  config: inputConfig = {},
  instruction,
  enabled,
  notifications,
}) => {
  const state = store.getState();
  const userId = state.global?.profile?.data?.id;
  const {
    timezone: configTimezone,
    useUserTimezone = false,
    // common date fields
    date: onceDate,
    startDate,
    time,
    meridian,
    endDate,
    endTime,
    endMeridian,
    neverEnd,
    // hourly
    intervalHours,
    // daily
    excludeWeekends,
    // weekly / custom
    daysOfWeek,
    // monthly
    isLastDayOfMonth,
    daysOfMonth,
    // cron
    cronExpression,
    startTime: cronStartTime,
    startMeridian: cronStartMeridian,
    // custom
    recurrence,
  } = inputConfig;

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const operationalTz = useUserTimezone ? userTimezone : configTimezone;
  const payloadTimezone = configTimezone || userTimezone;

  const combine = (d, t, m) => combineDateTimeToISO(d, t, m, operationalTz);

  const payloadConfig = {
    repeatType,
    timezone: payloadTimezone,
    useUserTimezone,
  };

  switch (repeatType) {
    case "once":
      payloadConfig.startDate = combine(onceDate || startDate, time, meridian);
      break;

    case "hourly":
      payloadConfig.intervalHours = intervalHours;
      payloadConfig.startDate = combine(startDate, time, meridian);
      payloadConfig.time = time;
      payloadConfig.meridian = meridian;
      payloadConfig.neverEnd = neverEnd;
      if (!neverEnd) {
        payloadConfig.endDate = combine(endDate, endTime, endMeridian);
      }
      break;

    case "daily":
      payloadConfig.time = time;
      payloadConfig.meridian = meridian;
      payloadConfig.excludeWeekends = excludeWeekends;
      payloadConfig.neverEnd = neverEnd;
      if (!neverEnd) {
        payloadConfig.endDate = combine(endDate, endTime, endMeridian);
      }
      break;

    case "weekly":
      payloadConfig.daysOfWeek = daysOfWeek;
      payloadConfig.time = time;
      payloadConfig.meridian = meridian;
      payloadConfig.neverEnd = neverEnd;
      if (!neverEnd) {
        payloadConfig.endDate = combine(endDate, endTime, endMeridian);
      }
      break;

    case "monthly":
      payloadConfig.isLastDayOfMonth = isLastDayOfMonth;
      if (!isLastDayOfMonth) {
        payloadConfig.daysOfMonth = daysOfMonth;
      }
      payloadConfig.time = time;
      payloadConfig.meridian = meridian;
      payloadConfig.neverEnd = neverEnd;
      if (!neverEnd) {
        payloadConfig.endDate = combine(endDate, endTime, endMeridian);
      }
      break;

    case "cron":
      payloadConfig.cronExpression = cronExpression;
      payloadConfig.startDate = combine(
        startDate,
        cronStartTime || time,
        cronStartMeridian || meridian
      );
      payloadConfig.neverEnd = neverEnd;
      if (!neverEnd) {
        payloadConfig.endDate = combine(endDate, endTime, endMeridian);
      }
      break;

    case "custom": {
      payloadConfig.recurrence = recurrence;
      payloadConfig.daysOfWeek = daysOfWeek;
      payloadConfig.neverEnd = neverEnd;

      if (recurrence?.type === "minutes" || recurrence?.type === "hourly") {
        const st = recurrence?.startTime;
        payloadConfig.startDate = combine(startDate, st?.time, st?.meridian);
      } else {
        payloadConfig.startDate = startDate;
      }

      if (!neverEnd) {
        payloadConfig.endDate = endDate;
      }
      break;
    }
  }

  const payload = {
    config: payloadConfig,
    notifications: { trigger: notifications },
    instruction,
    enabled,
    agentId,
  };

  try {
    const result = await store.dispatch(
      createOrUpdateSchedulerThunk({ userId, schedulerId, payload })
    ).unwrap();

    return result;
  } catch {
    return { error: true, message: "Unable to create or update the schedule" };
  }
};
