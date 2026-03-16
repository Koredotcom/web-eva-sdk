export const REPEAT_TYPES = [
  { value: "once", label: "Once" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
  { value: "cron", label: "Cron" },
];

export const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const TIMEZONES = [
  { tz: "Pacific/Midway", display: "(GMT-11:00)", name: "Midway Island, Samoa" },
  { tz: "Pacific/Honolulu", display: "(GMT-10:00)", name: "Hawaii" },
  { tz: "America/Anchorage", display: "(GMT-09:00)", name: "Alaska" },
  { tz: "America/Los_Angeles", display: "(GMT-08:00)", name: "Pacific Time (US & Canada)" },
  { tz: "America/Denver", display: "(GMT-07:00)", name: "Mountain Time (US & Canada)" },
  { tz: "America/Chicago", display: "(GMT-06:00)", name: "Central Time (US & Canada)" },
  { tz: "America/New_York", display: "(GMT-05:00)", name: "Eastern Time (US & Canada)" },
  { tz: "America/Caracas", display: "(GMT-04:30)", name: "Caracas" },
  { tz: "America/Halifax", display: "(GMT-04:00)", name: "Atlantic Time (Canada)" },
  { tz: "America/St_Johns", display: "(GMT-03:30)", name: "Newfoundland" },
  { tz: "America/Sao_Paulo", display: "(GMT-03:00)", name: "Brasilia" },
  { tz: "America/Argentina/Buenos_Aires", display: "(GMT-03:00)", name: "Buenos Aires" },
  { tz: "Atlantic/South_Georgia", display: "(GMT-02:00)", name: "Mid-Atlantic" },
  { tz: "Atlantic/Azores", display: "(GMT-01:00)", name: "Azores" },
  { tz: "Europe/London", display: "(GMT+00:00)", name: "London, Dublin, Lisbon" },
  { tz: "Europe/Berlin", display: "(GMT+01:00)", name: "Berlin, Paris, Rome" },
  { tz: "Europe/Helsinki", display: "(GMT+02:00)", name: "Helsinki, Kyiv, Bucharest" },
  { tz: "Africa/Cairo", display: "(GMT+02:00)", name: "Cairo" },
  { tz: "Europe/Moscow", display: "(GMT+03:00)", name: "Moscow, St. Petersburg" },
  { tz: "Asia/Dubai", display: "(GMT+04:00)", name: "Abu Dhabi, Muscat" },
  { tz: "Asia/Kolkata", display: "(GMT+05:30)", name: "Chennai, Kolkata, Mumbai" },
  { tz: "Asia/Kathmandu", display: "(GMT+05:45)", name: "Kathmandu" },
  { tz: "Asia/Dhaka", display: "(GMT+06:00)", name: "Dhaka" },
  { tz: "Asia/Bangkok", display: "(GMT+07:00)", name: "Bangkok, Hanoi, Jakarta" },
  { tz: "Asia/Shanghai", display: "(GMT+08:00)", name: "Beijing, Hong Kong, Singapore" },
  { tz: "Asia/Tokyo", display: "(GMT+09:00)", name: "Tokyo, Seoul" },
  { tz: "Australia/Adelaide", display: "(GMT+09:30)", name: "Adelaide" },
  { tz: "Australia/Sydney", display: "(GMT+10:00)", name: "Sydney, Melbourne" },
  { tz: "Pacific/Noumea", display: "(GMT+11:00)", name: "New Caledonia" },
  { tz: "Pacific/Auckland", display: "(GMT+12:00)", name: "Auckland, Wellington" },
  { tz: "Pacific/Tongatapu", display: "(GMT+13:00)", name: "Nuku'alofa" },
];

/**
 * Generate 96 time options (15-min intervals, 12-hour format).
 * Each entry: { value: "hh:mm", meridian: "AM"|"PM", label: "h:mmam" }
 */
export const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const meridian = h < 12 ? "AM" : "PM";
      const mm = String(m).padStart(2, "0");
      const value = `${String(h12).padStart(2, "0")}:${mm}`;
      const label = `${h12}:${mm}${meridian.toLowerCase()}`;
      options.push({ value, meridian, label, h24: h, m });
    }
  }
  return options;
};

export const TIME_OPTIONS = generateTimeOptions();

export const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
