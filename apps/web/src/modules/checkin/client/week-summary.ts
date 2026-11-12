import type { CheckinCalendarDay } from "../types";

export function getCheckinWeekSummary(
  days: CheckinCalendarDay[],
  today: string
) {
  const todayDate = new Date(`${today}T00:00:00Z`);
  const monday = new Date(todayDate);
  monday.setUTCDate(todayDate.getUTCDate() - ((todayDate.getUTCDay() + 6) % 7));
  const mondayKey = monday.toISOString().slice(0, 10);
  const weekDays = days.filter((day) => {
    const date = new Date(`${day.date}T00:00:00Z`);
    return (
      date >= monday &&
      date <= new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
    );
  });
  const daysByDate = new Map(weekDays.map((day) => [day.date, day]));
  const checkedInDays = weekDays.filter((day) => day.state === "done");
  const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const day = daysByDate.get(dateKey);
    return {
      date: dateKey,
      label: weekdayLabels[index],
      dayNumber: date.getUTCDate(),
      points: day?.points ?? null,
      hasPoints: day?.hasPoints ?? false,
      hasVoucher: day?.hasVoucher ?? false,
      state: day?.state ?? null,
    };
  });

  return {
    monday: mondayKey,
    points: checkedInDays.reduce((sum, day) => sum + day.points, 0),
    checkins: checkedInDays.length,
    remaining: weekDays.filter(
      (day) => day.state === "future" && day.date > today
    ).length,
    week,
  };
}
