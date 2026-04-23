# Schedulers API — Developer Documentation

## Overview

The `schedulers` module of the EVA Web SDK provides functions to **create**, **list**, and **manage** scheduled agent executions. Schedulers allow you to trigger agents at specified times or intervals (once, hourly, daily, weekly, monthly, cron, or custom recurrence).

### Importing

```javascript
import { getSchedulers, createScheduler, deleteSchedulerById } from "eva-web-sdk";
```

> `getListOfSchedulers` is an alias for `getSchedulers`.

---

## `getSchedulers(options?)`

Fetches the list of schedulers for the current user. The SDK automatically resolves the user ID from the internal store — no need to pass it.

### Signature

```javascript
const result = await getSchedulers(options);
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| options | object | No | Options object. All fields optional. Defaults to `{}`. |
| options.params | object | No | Additional query parameters forwarded to the API request. |
| options.updateStore | boolean | No | Whether to update the internal Redux store with the fetched data. Defaults to `false`. |

### Return Value

Returns a `Promise` that resolves to:

```javascript
// On success
{
  status: "success",
  data: [ /* array of scheduler objects */ ]
}

// On failure
{
  status: "failed",
  error: { message: "..." },
  data: []
}
```

### Usage Example

```javascript
import { getSchedulers } from "eva-web-sdk";

const result = await getSchedulers();

if (result.status === "success") {
  console.log("Schedulers:", result.data);
} else {
  console.error("Error:", result.error.message);
}
```

---

## `createScheduler(params)`

Creates a new scheduler or updates an existing one. The function builds the correct API payload based on the `repeatType` and dispatches it to the backend.

### Signature

```javascript
const result = await createScheduler({
  schedulerId,
  agentId,
  repeatType,
  config,
  instruction,
  enabled,
  notifications,
});
```

### Top-Level Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| schedulerId | string | No | If provided, the existing scheduler with this ID is **updated**. Omit to **create** a new scheduler. |
| agentId | string | Yes | The ID of the agent this scheduler will trigger. |
| repeatType | string | Yes | Schedule frequency. One of: `once`, `hourly`, `daily`, `weekly`, `monthly`, `cron`, `custom`. |
| config | object | Yes | Configuration object whose shape depends on repeatType (see below). |
| instruction | string | Yes | The instruction/prompt text the agent will execute on each trigger. |
| enabled | boolean | Yes | Whether the scheduler is active (true) or paused (false). |
| notifications | string | No | When to send notifications. Typically `onCompletion`. |

---

### `config` Object — Fields by `repeatType`

#### Common Fields (present in all repeat types)

| Field | Type | Required | Description |
|---|---|---|---|
| timezone | string | No | IANA timezone string (e.g. `America/New_York`). Defaults to user's browser timezone. |
| useUserTimezone | boolean | No | If true, browser timezone is used for all date/time calculations. Defaults to `false`. |

---

#### repeatType: "once"

Run the agent a single time at a specific date and time.

| Field | Type | Required | Description |
|---|---|---|---|
| date or startDate | string | Yes | The date to run. Format: `YYYY-MM-DD`. |
| time | string | Yes | Time in 12-hour format: `HH:MM` (e.g. `09:30`). |
| meridian | string | Yes | `AM` or `PM`. |

```javascript
await createScheduler({
  agentId: "ag-xxx",
  repeatType: "once",
  config: {
    date: "2026-04-15",
    time: "09:30",
    meridian: "AM",
    timezone: "America/New_York",
  },
  instruction: "Generate the daily sales report",
  enabled: true,
  notifications: "onCompletion",
});
```

---

#### repeatType: "hourly"

Run the agent every N hours.

| Field | Type | Required | Description |
|---|---|---|---|
| intervalHours | number | Yes | Interval in hours (1–24). |
| startDate | string | Yes | When to start. Format: `YYYY-MM-DD`. |
| time | string | Yes | Start time: `HH:MM`. |
| meridian | string | Yes | `AM` or `PM`. |
| neverEnd | boolean | Yes | If true, the schedule runs indefinitely. |
| endDate | string | Conditional | End date: `YYYY-MM-DD`. Required if neverEnd is false. |
| endTime | string | Conditional | End time: `HH:MM`. Required if neverEnd is false. |
| endMeridian | string | Conditional | `AM` or `PM`. Required if neverEnd is false. |

```javascript
await createScheduler({
  agentId: "ag-xxx",
  repeatType: "hourly",
  config: {
    intervalHours: 2,
    startDate: "2026-04-10",
    time: "08:00",
    meridian: "AM",
    neverEnd: false,
    endDate: "2026-04-30",
    endTime: "06:00",
    endMeridian: "PM",
    timezone: "America/Chicago",
  },
  instruction: "Check inventory levels",
  enabled: true,
  notifications: "onCompletion",
});
```

---

#### repeatType: "daily"

Run the agent once every day at a fixed time.

| Field | Type | Required | Description |
|---|---|---|---|
| time | string | Yes | Time to run: `HH:MM`. |
| meridian | string | Yes | `AM` or `PM`. |
| excludeWeekends | boolean | No | If true, skips Saturday and Sunday. Defaults to false. |
| neverEnd | boolean | Yes | If true, runs indefinitely. |
| endDate | string | Conditional | End date. Required if neverEnd is false. |
| endTime | string | Conditional | End time. Required if neverEnd is false. |
| endMeridian | string | Conditional | `AM` or `PM`. Required if neverEnd is false. |

```javascript
await createScheduler({
  agentId: "ag-xxx",
  repeatType: "daily",
  config: {
    time: "08:00",
    meridian: "AM",
    excludeWeekends: true,
    neverEnd: true,
    timezone: "Asia/Kolkata",
  },
  instruction: "Send morning briefing",
  enabled: true,
  notifications: "onCompletion",
});
```

---

#### repeatType: "weekly"

Run the agent on specific days of the week.

| Field | Type | Required | Description |
|---|---|---|---|
| daysOfWeek | number[] | Yes | Array of day indices. 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat. |
| time | string | Yes | Time to run: `HH:MM`. |
| meridian | string | Yes | `AM` or `PM`. |
| neverEnd | boolean | Yes | If true, runs indefinitely. |
| endDate | string | Conditional | End date. Required if neverEnd is false. |
| endTime | string | Conditional | End time. Required if neverEnd is false. |
| endMeridian | string | Conditional | `AM` or `PM`. Required if neverEnd is false. |

```javascript
await createScheduler({
  agentId: "ag-xxx",
  repeatType: "weekly",
  config: {
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    time: "10:00",
    meridian: "AM",
    neverEnd: true,
    timezone: "Europe/London",
  },
  instruction: "Run weekly sync",
  enabled: true,
  notifications: "onCompletion",
});
```

---

#### repeatType: "monthly"

Run the agent on specific days of the month.

| Field | Type | Required | Description |
|---|---|---|---|
| isLastDayOfMonth | boolean | Yes | If true, runs on the last day of each month. daysOfMonth is ignored. |
| daysOfMonth | number[] | Conditional | Array of day numbers (1–31). Required if isLastDayOfMonth is false. |
| time | string | Yes | Time to run: `HH:MM`. |
| meridian | string | Yes | `AM` or `PM`. |
| neverEnd | boolean | Yes | If true, runs indefinitely. |
| endDate | string | Conditional | End date. Required if neverEnd is false. |
| endTime | string | Conditional | End time. Required if neverEnd is false. |
| endMeridian | string | Conditional | `AM` or `PM`. Required if neverEnd is false. |

```javascript
await createScheduler({
  agentId: "ag-xxx",
  repeatType: "monthly",
  config: {
    isLastDayOfMonth: false,
    daysOfMonth: [1, 15],
    time: "09:00",
    meridian: "AM",
    neverEnd: true,
    timezone: "America/New_York",
  },
  instruction: "Generate payroll report",
  enabled: true,
  notifications: "onCompletion",
});
```

---

#### repeatType: "cron"

Run the agent using a standard cron expression.

| Field | Type | Required | Description |
|---|---|---|---|
| cronExpression | string | Yes | Standard cron expression (e.g. `0 9 * * 1-5`). |
| startDate | string | Yes | When to start evaluating the cron. Format: `YYYY-MM-DD`. |
| startTime | string | Yes | Start time: `HH:MM`. Also accepts `time`. |
| startMeridian | string | Yes | `AM` or `PM`. Also accepts `meridian`. |
| neverEnd | boolean | Yes | If true, runs indefinitely. |
| endDate | string | Conditional | End date. Required if neverEnd is false. |
| endTime | string | Conditional | End time. Required if neverEnd is false. |
| endMeridian | string | Conditional | `AM` or `PM`. Required if neverEnd is false. |

```javascript
await createScheduler({
  agentId: "ag-xxx",
  repeatType: "cron",
  config: {
    cronExpression: "0 9 * * 1-5",
    startDate: "2026-04-01",
    startTime: "09:00",
    startMeridian: "AM",
    neverEnd: true,
    timezone: "America/Los_Angeles",
  },
  instruction: "Run weekday morning process",
  enabled: true,
  notifications: "onCompletion",
});
```

---

#### repeatType: "custom"

Advanced recurrence with minute-level or hourly intervals on selected days.

| Field | Type | Required | Description |
|---|---|---|---|
| recurrence | object | Yes | Recurrence definition (see sub-fields below). |
| recurrence.type | string | Yes | `minutes` or `hourly`. |
| recurrence.interval | number | Yes | Interval value. For minutes: 1–59. For hourly: 1–23. |
| recurrence.startTime | object | Yes | `{ time: "HH:MM", meridian: "AM" }` — window start. |
| recurrence.endTime | object | No | `{ time: "HH:MM", meridian: "PM" }` — window end. |
| daysOfWeek | number[] | Yes | Days the schedule is active. Same index as weekly. |
| startDate | string | Yes | Schedule effective start date. Format: `YYYY-MM-DD`. |
| neverEnd | boolean | Yes | If true, runs indefinitely. |
| endDate | string | Conditional | End date. Required if neverEnd is false. |

```javascript
await createScheduler({
  agentId: "ag-xxx",
  repeatType: "custom",
  config: {
    recurrence: {
      type: "minutes",
      interval: 30,
      startTime: { time: "08:00", meridian: "AM" },
      endTime: { time: "05:00", meridian: "PM" },
    },
    daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
    startDate: "2026-04-10",
    neverEnd: true,
    timezone: "Asia/Tokyo",
  },
  instruction: "Poll service health every 30 minutes",
  enabled: true,
  notifications: "onCompletion",
});
```

---

### Return Value

```javascript
// On success — returns the server response object (scheduler details)
{ id: "sch-xxx", config: { ... }, ... }

// On failure
{ error: true, message: "Unable to create or update the schedule" }
```

---

## `deleteSchedulerById(schedulerId)`

Deletes a scheduler by its ID. The SDK resolves the user ID internally.

### Signature

```javascript
const result = await deleteSchedulerById(schedulerId);
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| schedulerId | string | Yes | The ID of the scheduler to delete. |

### Return Value

```javascript
// On success
{ success: true }

// On failure
{ success: false, error: "Missing userId or schedulerId" }
{ success: false, error: "Unable to delete the schedule" }
```

### Usage Example

```javascript
import { deleteSchedulerById } from "eva-web-sdk";

const result = await deleteSchedulerById("sch-abc123-def456");

if (result.success) {
  console.log("Scheduler deleted");
} else {
  console.error("Failed:", result.error);
}
```

---

## Additional Exported Functions

| Function | Description |
|---|---|
| subscribeToSchedulers() | Returns a Promise that resolves once scheduler data is available in the store. Useful for waiting on initial data load. |
| toggleScheduler(agent) | Toggles the enabled state of an agent's schedule. If the agent has no schedule or an incomplete once schedule, returns `{ success: false, openDialog: true }` to prompt the UI to open a scheduler dialog. |
| getListOfSchedulers(options?) | Alias for getSchedulers. Same signature. |

---

## Reference: Days of Week Index

| Value | Day |
|---|---|
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

---

## Reference: Supported Timezones

The SDK provides a built-in TIMEZONES constant with IANA timezone strings. Common values:

| Timezone | Region |
|---|---|
| America/New_York | Eastern Time (US & Canada) |
| America/Chicago | Central Time (US & Canada) |
| America/Los_Angeles | Pacific Time (US & Canada) |
| Europe/London | London, Dublin, Lisbon |
| Europe/Berlin | Berlin, Paris, Rome |
| Asia/Kolkata | Chennai, Kolkata, Mumbai |
| Asia/Tokyo | Tokyo, Seoul |
| Australia/Sydney | Sydney, Melbourne |
| Pacific/Auckland | Auckland, Wellington |

---

## Notes

- **User ID**: All scheduler functions automatically resolve the current user's ID from the SDK's internal store. The client application does not need to pass it.
- **Time format**: All time fields use 12-hour `HH:MM` format with a separate meridian field (`AM` / `PM`).
- **Date format**: All date fields use `YYYY-MM-DD` string format. Do not pass ISO strings — see note below.
- **ISO date warning**: Passing full ISO strings (e.g. `2026-04-02T02:30:00.000Z`) instead of `YYYY-MM-DD` will not cause an error, but the date may silently shift by ±1 day depending on the browser's timezone offset. Always use `YYYY-MM-DD`.
- **Timezone handling**: When useUserTimezone is true, the browser's timezone is used for date/time conversion. Otherwise the explicit timezone value is used.
- **Minimum lead time**: Schedules of type once, cron, hourly (same-day), and custom (minutes/hourly) must be at least **15 minutes** in the future.
- **Start date validation**: For hourly, cron, and custom types, the start date cannot be in the past.
