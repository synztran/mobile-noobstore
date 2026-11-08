export function isPickupSelectionValid(args: {
  date: string;
  time: string;
  minDate: string;
  availableSlots: string[];
  now?: Date;
}) {
  const { date, time, minDate, availableSlots, now = new Date() } = args;
  const selectedAt = new Date(`${date}T${time}:00`);
  return (
    !Number.isNaN(selectedAt.getTime()) &&
    date >= minDate &&
    selectedAt.getTime() > now.getTime() &&
    availableSlots.includes(time)
  );
}
