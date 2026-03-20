/**
 * Nepal Timezone Utilities
 * 
 * Nepal Standard Time (NST) = UTC+5:45
 * 
 * CRITICAL: All date/time calculations in CafeOS MUST use these utilities.
 * Using raw `new Date()` will return UTC time, which is 5 hours 45 minutes
 * behind Nepal time. This causes:
 * - Wrong greeting ("Good Night" at 6 AM Nepal time)
 * - Wrong "today's" profit (shows Rs 0 until 5:45 AM Nepal time)
 * - Wrong date boundaries for reports
 * - Wrong "Open Now" status for cafes
 */

const NEPAL_OFFSET_MINUTES = 5 * 60 + 45; // 345 minutes = 5 hours 45 minutes

/**
 * Get the current date in Nepal timezone as YYYY-MM-DD string
 */
export function getNepaliDateString(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + NEPAL_OFFSET_MINUTES * 60000;
  const nepalDate = new Date(nepalMs);
  return nepalDate.toISOString().split('T')[0];
}

/**
 * Get the current hour (0-23) in Nepal timezone
 */
export function getNepaliHour(): number {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + NEPAL_OFFSET_MINUTES * 60000;
  return new Date(nepalMs).getUTCHours();
}

/**
 * Get the current minute (0-59) in Nepal timezone
 */
export function getNepaliMinute(): number {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + NEPAL_OFFSET_MINUTES * 60000;
  return new Date(nepalMs).getUTCMinutes();
}

/**
 * Get current time as HH:MM string in Nepal timezone (24-hour format)
 */
export function getNepaliTimeString(): string {
  const hour = getNepaliHour();
  const minute = getNepaliMinute();
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Get the current day of week (0=Sunday, 6=Saturday) in Nepal timezone
 */
export function getNepaliDayOfWeek(): number {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + NEPAL_OFFSET_MINUTES * 60000;
  return new Date(nepalMs).getUTCDay();
}

/**
 * Get the Nepali day name (e.g., "आइतबार", "सोमबार", etc.)
 */
export function getNepaliDayName(): string {
  const days = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'];
  return days[getNepaliDayOfWeek()];
}

/**
 * Get English day name based on Nepal timezone
 */
export function getNepaliDayNameEnglish(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[getNepaliDayOfWeek()];
}

/**
 * Get appropriate Nepali greeting based on Nepal time
 * - 4 AM - 12 PM: शुभ प्रभात (Good Morning)
 * - 12 PM - 5 PM: शुभ दिन (Good Day)
 * - 5 PM - 8 PM: शुभ सन्ध्या (Good Evening)
 * - 8 PM - 4 AM: शुभ रात्रि (Good Night)
 */
export function getNepaliGreeting(): string {
  const hour = getNepaliHour();
  if (hour >= 4 && hour < 12) return 'शुभ प्रभात';
  if (hour >= 12 && hour < 17) return 'शुभ दिन';
  if (hour >= 17 && hour < 20) return 'शुभ सन्ध्या';
  return 'शुभ रात्रि';
}

/**
 * Get a Date object representing the current moment in Nepal timezone
 * Note: The returned Date object's UTC methods will give Nepal time values
 */
export function getNepaliNow(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + NEPAL_OFFSET_MINUTES * 60000;
  return new Date(nepalMs);
}

/**
 * Get the start of "today" in Nepal timezone as ISO string
 * Returns: YYYY-MM-DDT00:00:00.000Z (but represents Nepal midnight)
 */
export function getNepaliTodayStart(): string {
  return `${getNepaliDateString()}T00:00:00.000Z`;
}

/**
 * Get the end of "today" in Nepal timezone as ISO string
 * Returns: YYYY-MM-DDT23:59:59.999Z (but represents Nepal end of day)
 */
export function getNepaliTodayEnd(): string {
  return `${getNepaliDateString()}T23:59:59.999Z`;
}

/**
 * Convert a Nepal date string (YYYY-MM-DD) to UTC ISO string for database queries
 * This accounts for the fact that Nepal midnight is UTC 18:15 of the previous day
 */
export function nepalDateToUTCRange(nepalDateStr: string): { start: string; end: string } {
  // Nepal midnight = UTC previous day 18:15
  // So for Nepal date 2026-02-19, the UTC range is:
  // Start: 2026-02-18T18:15:00.000Z
  // End: 2026-02-19T18:14:59.999Z
  
  const [year, month, day] = nepalDateStr.split('-').map(Number);
  const nepalMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Subtract Nepal offset to get UTC
  const utcStart = new Date(nepalMidnight.getTime() - NEPAL_OFFSET_MINUTES * 60000);
  const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  return {
    start: utcStart.toISOString(),
    end: utcEnd.toISOString()
  };
}

/**
 * Check if a cafe is currently open based on their opening hours
 * @param hours - Opening hours object from cafe_profiles.opening_hours JSONB
 *                Format: { sunday: { open: "09:00", close: "21:00", closed: false }, ... }
 */
export function isOpenNow(hours: Record<string, { open: string; close: string; closed: boolean }> | null): { 
  isOpen: boolean; 
  nextChange: string;
} {
  if (!hours) return { isOpen: true, nextChange: '' };
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[getNepaliDayOfWeek()];
  const todayHours = hours[dayName];
  
  if (!todayHours || todayHours.closed) {
    return { isOpen: false, nextChange: 'Closed today' };
  }
  
  const currentTime = getNepaliHour() * 100 + getNepaliMinute();
  const openTime = parseInt(todayHours.open.replace(':', ''));
  const closeTime = parseInt(todayHours.close.replace(':', ''));
  
  if (currentTime >= openTime && currentTime < closeTime) {
    return { isOpen: true, nextChange: `Closes at ${todayHours.close}` };
  }
  
  if (currentTime < openTime) {
    return { isOpen: false, nextChange: `Opens at ${todayHours.open}` };
  }
  
  return { isOpen: false, nextChange: 'Closed for today' };
}

/**
 * Format a UTC timestamp to Nepal local time display string
 * @param isoString - ISO date string from database (UTC)
 * @returns Formatted string like "Feb 19, 2:30 PM"
 */
export function formatToNepalTime(isoString: string): string {
  const date = new Date(isoString);
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + NEPAL_OFFSET_MINUTES * 60000;
  const nepalDate = new Date(nepalMs);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[nepalDate.getUTCMonth()];
  const day = nepalDate.getUTCDate();
  const hours = nepalDate.getUTCHours();
  const minutes = nepalDate.getUTCMinutes();
  
  const hour12 = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  const minuteStr = minutes.toString().padStart(2, '0');
  
  return `${month} ${day}, ${hour12}:${minuteStr} ${ampm}`;
}

/**
 * Get date string for N days ago in Nepal timezone
 */
export function getNepaliDateDaysAgo(daysAgo: number): string {
  const now = getNepaliNow();
  now.setUTCDate(now.getUTCDate() - daysAgo);
  return now.toISOString().split('T')[0];
}

/**
 * Check if it's closing time (for smart nudges)
 * Returns true if current Nepal time is after 8 PM
 */
export function isClosingTime(): boolean {
  return getNepaliHour() >= 20;
}

/**
 * Check if it's morning rush hour (for smart nudges)
 * Returns true if current Nepal time is between 7 AM and 10 AM
 */
export function isMorningRush(): boolean {
  const hour = getNepaliHour();
  return hour >= 7 && hour < 10;
}

/**
 * Check if it's evening rush hour (for smart nudges)
 * Returns true if current Nepal time is between 5 PM and 8 PM
 */
export function isEveningRush(): boolean {
  const hour = getNepaliHour();
  return hour >= 17 && hour < 20;
}
