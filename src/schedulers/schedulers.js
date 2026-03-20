import store from "../redux/store";
import {
  fetchSchedulers,
  createOrUpdateScheduler as createOrUpdateSchedulerThunk,
  deleteScheduler as deleteSchedulerThunk,
} from "../redux/actions/global.action";
import { combineDateTimeToISO } from "./schedulerHelpers.js";

const normalizeSchedulers = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.schedulers) return data.schedulers;
  if (data?.data) return Array.isArray(data.data) ? data.data : [];
  return [];
};

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
    const raw = await store
      .dispatch(fetchSchedulers({ userId, params }))
      .unwrap();
    const list = normalizeSchedulers(raw);
    return {
      status: "success",
      schedulers: raw,
      data: list,
    };
  } catch (error) {
    const err =
      error && typeof error === "object" && !Array.isArray(error)
        ? error
        : { message: String(error ?? "Unable to fetch schedulers") };
    return {
      status: "failed",
      error: err,
      data: [],
    };
  }
};

export const getListOfSchedulers = getSchedulers;

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
    date: onceDate,
    startDate,
    time,
    meridian,
    endDate,
    endTime,
    endMeridian,
    neverEnd,
    intervalHours,
    excludeWeekends,
    daysOfWeek,
    isLastDayOfMonth,
    daysOfMonth,
    cronExpression,
    startTime: cronStartTime,
    startMeridian: cronStartMeridian,
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
