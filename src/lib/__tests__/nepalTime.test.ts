import {
  getNepaliDateString,
  getNepaliHour,
  getNepaliMinute,
  getNepaliDayOfWeek,
  formatToNepalTime,
  isOpenNow,
} from '../nepalTime';

/**
 * These assert against Intl with an explicit Asia/Kathmandu zone, so they hold
 * whatever timezone the machine running them is set to. That is the point: the
 * previous implementation added `getTimezoneOffset()` and so only produced
 * Nepal time on a host whose own clock was UTC.
 */
function nepalParts(d: Date) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    weekday: 'short',
  }).formatToParts(d);
  const get = (t: string) => f.find(p => p.type === t)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

describe('nepalTime', () => {
  it('reports the Nepal wall clock regardless of the host timezone', () => {
    const expected = nepalParts(new Date());
    expect(getNepaliDateString()).toBe(expected.date);
    expect(getNepaliHour()).toBe(expected.hour);
    expect(getNepaliMinute()).toBe(expected.minute);
    expect(getNepaliDayOfWeek()).toBe(expected.weekday);
  });

  it('formats a UTC timestamp into Nepal local time', () => {
    // 2026-09-16T02:51Z is 08:36 on 16 Sep in Kathmandu (UTC+5:45).
    expect(formatToNepalTime('2026-09-16T02:51:00.000Z')).toBe('Sep 16, 8:36 AM');
  });

  it('crosses the Nepal date boundary at 18:15 UTC, not at midnight UTC', () => {
    // 18:14Z is still the same Nepal day; 18:15Z is already the next one.
    expect(formatToNepalTime('2026-09-16T18:14:00.000Z')).toBe('Sep 16, 11:59 PM');
    expect(formatToNepalTime('2026-09-16T18:15:00.000Z')).toBe('Sep 17, 12:00 AM');
  });

  it('calls a cafe open when the Nepal clock is inside its hours', () => {
    const now = nepalParts(new Date());
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hours = Object.fromEntries(
      days.map(d => [d, { open: '00:00', close: '23:59', closed: false }])
    ) as Record<string, { open: string; close: string; closed: boolean }>;
    expect(isOpenNow(hours).isOpen).toBe(true);

    // A window that has already closed for the Nepal day reads as closed.
    const past = `${String(Math.max(now.hour - 1, 0)).padStart(2, '0')}:00`;
    const shut = Object.fromEntries(
      days.map(d => [d, { open: '00:00', close: past, closed: false }])
    ) as Record<string, { open: string; close: string; closed: boolean }>;
    if (now.hour >= 1) expect(isOpenNow(shut).isOpen).toBe(false);
  });
});
