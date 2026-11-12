export function isPickupSelectionValid({
  date,
  time,
  minDate,
  availableSlots,
  now = new Date(),
}: {
  date: string;
  time: string;
  minDate: string;
  availableSlots: string[];
  now?: Date;
}) {
  const selectedAt = new Date(`${date}T${time}:00`);
  return (
    !Number.isNaN(selectedAt.getTime()) &&
    date >= minDate &&
    selectedAt.getTime() > now.getTime() &&
    availableSlots.includes(time)
  );
}

export function getPickupTimeOptions({
  slots,
  selectedDate,
  today,
  nowMinutes,
}: {
  slots: string[];
  selectedDate: string;
  today: string;
  nowMinutes: number;
}) {
  return slots
    .filter((slot) => {
      const minutes = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3, 5));
      return selectedDate !== today || minutes > nowMinutes;
    })
    .map((slot) => ({
      text: slot,
      value: slot,
    }));
}
