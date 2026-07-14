"use client";

const DAYS = [
  { value: 0, label: "CN" },
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
];

type Props = {
  days: number[];
  time: string;
  onDaysChange: (days: number[]) => void;
  onTimeChange: (time: string) => void;
};

export default function CrawlingSchedulePicker({
  days,
  time,
  onDaysChange,
  onTimeChange,
}: Props) {
  function toggleDay(day: number) {
    if (days.includes(day)) {
      onDaysChange(days.filter((d) => d !== day));
    } else {
      onDaysChange([...days, day].sort());
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">
          Days of week
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const active = days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`h-9 w-10 rounded-lg text-xs font-bold transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Time</p>
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
