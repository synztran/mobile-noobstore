// Store operating windows — day-aware.
//
// Weekdays (Mon–Fri): 08:00–19:00
// Weekends (Sat–Sun): 08:00–17:00
//
// Delivery processing and in-store pickup both run on every day of the week,
// following the schedule of that day.

export const PICKUP_SLOT_MINUTES = 30;

export type DayHours = {
  startAt: string;
  endAt: string;
};

export const WEEKDAY_HOURS: DayHours = { startAt: "08:00", endAt: "19:00" };
export const WEEKEND_HOURS: DayHours = { startAt: "08:00", endAt: "17:00" };

/** Hours for a given day-of-week (0=Sun, 6=Sat → weekend window). */
export function hoursForDay(day: number): DayHours {
  return day === 0 || day === 6 ? WEEKEND_HOURS : WEEKDAY_HOURS;
}

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function parseHM(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return { h, m };
}

function minutesOf(now: Date) {
  return now.getHours() * 60 + now.getMinutes();
}

/** Day-of-week → opening minute (08:00 every day). */
export function dayStartMinutes(day: number) {
  const { h, m } = parseHM(hoursForDay(day).startAt);
  return h * 60 + m;
}

/** Day-of-week → closing minute (19:00 weekdays / 17:00 weekends). */
export function dayEndMinutes(day: number) {
  const { h, m } = parseHM(hoursForDay(day).endAt);
  return h * 60 + m;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** True when `now` is strictly before today's closing time. */
export function isBeforeClose(now: Date): boolean {
  return minutesOf(now) < dayEndMinutes(now.getDay());
}

/** True when the store is open right now (within today's day-aware window). */
export function isOpenNow(now: Date): boolean {
  const mins = minutesOf(now);
  return mins >= dayStartMinutes(now.getDay()) && mins < dayEndMinutes(now.getDay());
}

export interface Slot {
  day: Date;
  minutes: number;
}

/** Next slot at/after `now`, following each day's own window. */
function nextSlot(now: Date, slotMinutes: number): Slot {
  const cur = minutesOf(now);
  for (let offset = 0; offset < 8; offset++) {
    const day = addDays(startOfDay(now), offset);
    const startMin = dayStartMinutes(day.getDay());
    const endMin = dayEndMinutes(day.getDay());
    if (offset === 0) {
      if (cur < startMin) return { day, minutes: startMin };
      if (cur < endMin) {
        const rounded = Math.min(
          Math.ceil((cur + 1) / slotMinutes) * slotMinutes,
          endMin
        );
        return { day, minutes: rounded };
      }
      continue;
    }
    return { day, minutes: startMin };
  }
  return { day: startOfDay(now), minutes: dayStartMinutes(now.getDay()) };
}

/** Vietnamese ETA label: "Hôm nay 08:30" / "Ngày mai 08:00" / "T5 08:00". */
export function formatEtaLabel(referenceNow: Date, day: Date, minutes: number) {
  const today = startOfDay(referenceNow);
  const diffDays = Math.round((day.getTime() - today.getTime()) / 86400000);
  const hm = formatMinutes(minutes);
  if (diffDays === 0) return `Hôm nay ${hm}`;
  if (diffDays === 1) return `Ngày mai ${hm}`;
  return `${DAY_NAMES[day.getDay()]} ${hm}`;
}

/** Start of the next working day strictly after "today" (08:00). */
export function nextWorkingDayStart(now: Date): Slot {
  const day = addDays(startOfDay(now), 1);
  return { day, minutes: dayStartMinutes(day.getDay()) };
}

/** Express (processingHours, default 2–4h): available while a working day has ≥2h before close. */
export function expressDelivery(now: Date, processingHours = 2) {
  const startMin = dayStartMinutes(now.getDay());
  const endMin = dayEndMinutes(now.getDay());
  const cur = minutesOf(now);
  if (cur >= startMin && cur <= endMin - processingHours * 60) {
    const rounded = Math.min(
      Math.ceil((cur + processingHours * 60) / PICKUP_SLOT_MINUTES) *
        PICKUP_SLOT_MINUTES,
      endMin
    );
    return {
      available: true,
      eta: formatEtaLabel(now, startOfDay(now), rounded),
    };
  }
  const next = nextWorkingDayStart(now);
  return { available: false, eta: formatEtaLabel(now, next.day, next.minutes) };
}

/** Standard (12–24h): can be started today while the store is processing. */
export function standardDelivery(now: Date) {
  const open = isOpenNow(now);
  const next = nextWorkingDayStart(now);
  return {
    available: open,
    eta: formatEtaLabel(now, next.day, next.minutes),
  };
}

/** Pickup: bookable while pickup hours are scheduled and open today. */
export function pickupDelivery(now: Date) {
  const slot = nextSlot(now, PICKUP_SLOT_MINUTES);
  const open = isOpenNow(now);
  return { available: open, eta: formatEtaLabel(now, slot.day, slot.minutes) };
}