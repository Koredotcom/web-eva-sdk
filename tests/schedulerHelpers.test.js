/**
 * Verifies scheduler configuration and validation rules, especially timezone
 * conversion, repeat-type defaults, user-facing summaries, and invalid input.
 */
import {
  buildRepeatTypeConfig,
  combineDateTimeToISO,
  getScheduleSummary,
  validateSchedulerPayload,
} from '../src/schedulers/schedulerHelpers.js';

describe('scheduler helpers', () => {
  // Confirms a scheduler's local wall-clock time is converted to the expected
  // UTC instant for the selected timezone.
  it('converts a local time to the correct UTC instant', () => {
    expect(combineDateTimeToISO('2026-01-15', '09:30', 'AM', 'Asia/Kolkata'))
      .toBe('2026-01-15T04:00:00.000Z');
  });

  // Confirms every supported schedule type has a usable initial configuration.
  it('returns a complete default configuration for each supported repeat type', () => {
    ['once', 'hourly', 'daily', 'weekly', 'monthly', 'cron', 'custom'].forEach((repeatType) => {
      const config = buildRepeatTypeConfig(repeatType, 'UTC');
      expect(config.repeatType).toBe(repeatType);
      expect(config.timezone).toBe('UTC');
      expect(config).toHaveProperty('useUserTimezone', false);
    });
  });

  // Confirms missing required scheduler data produces validation messages
  // instead of throwing an exception.
  it('validates missing schedule data without throwing', () => {
    const errors = validateSchedulerPayload({}, '   ');

    expect(errors).toEqual(expect.arrayContaining([
      'Instruction is required.',
      'Please select a repeat type.',
    ]));
  });

  // Confirms weekly configuration is converted into readable summary text.
  it('creates a readable weekly summary', () => {
    const summary = getScheduleSummary({
      repeatType: 'weekly',
      daysOfWeek: [1, 3],
      time: '09:00',
      meridian: 'AM',
      neverEnd: true,
      timezone: 'UTC',
    });

    expect(summary).toContain('Scheduled to run weekly');
    expect(summary).toContain('Mon, Wed');
    expect(summary).toContain('9:00 AM');
  });
});
