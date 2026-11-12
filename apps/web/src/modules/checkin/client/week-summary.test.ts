import { describe, expect, it } from "vitest";
import { getCheckinWeekSummary } from "./week-summary";

describe("getCheckinWeekSummary", () => {
  it("summarizes current week, excluding adjacent weeks", () => {
    const dates = [
      ["2026-11-01", "done", 2], // Previous Sunday
      ["2026-11-02", "done", 1],
      ["2026-11-03", "done", 1],
      ["2026-11-04", "missed", 1],
      ["2026-11-05", "today", 1],
      ["2026-11-06", "future", 1],
      ["2026-11-07", "future", 2],
    ] as const;
    const days = dates.map(([date, state, points]) => ({
      date,
      state,
      points,
      hasPoints: true,
      hasVoucher: false,
      event: null,
    }));

    expect(getCheckinWeekSummary(days, "2026-11-05")).toEqual({
      monday: "2026-11-02",
      points: 2,
      checkins: 2,
      remaining: 2,
      week: [
        {
          date: "2026-11-02",
          label: "T2",
          dayNumber: 2,
          points: 1,
          state: "done",
          hasPoints: true,
          hasVoucher: false,
        },
        {
          date: "2026-11-03",
          label: "T3",
          dayNumber: 3,
          points: 1,
          state: "done",
          hasPoints: true,
          hasVoucher: false,
        },
        {
          date: "2026-11-04",
          label: "T4",
          dayNumber: 4,
          points: 1,
          state: "missed",
          hasPoints: true,
          hasVoucher: false,
        },
        {
          date: "2026-11-05",
          label: "T5",
          dayNumber: 5,
          points: 1,
          state: "today",
          hasPoints: true,
          hasVoucher: false,
        },
        {
          date: "2026-11-06",
          label: "T6",
          dayNumber: 6,
          points: 1,
          state: "future",
          hasPoints: true,
          hasVoucher: false,
        },
        {
          date: "2026-11-07",
          label: "T7",
          dayNumber: 7,
          points: 2,
          state: "future",
          hasPoints: true,
          hasVoucher: false,
        },
        {
          date: "2026-11-08",
          label: "CN",
          dayNumber: 8,
          points: null,
          state: null,
          hasPoints: false,
          hasVoucher: false,
        },
      ],
    });
  });

  it("handles week boundary on Sunday", () => {
    expect(
      getCheckinWeekSummary(
        [
          {
            date: "2026-11-02",
            state: "done",
            points: 1,
            hasPoints: true,
            hasVoucher: false,
            event: null,
          },
          {
            date: "2026-11-08",
            state: "today",
            points: 2,
            hasPoints: true,
            hasVoucher: false,
            event: null,
          },
        ],
        "2026-11-08"
      )
    ).toEqual({
      monday: "2026-11-02",
      points: 1,
      checkins: 1,
      remaining: 0,
      week: [
        {
          date: "2026-11-02",
          label: "T2",
          dayNumber: 2,
          points: 1,
          state: "done",
          hasPoints: true,
          hasVoucher: false,
        },
        {
          date: "2026-11-03",
          label: "T3",
          dayNumber: 3,
          points: null,
          state: null,
          hasPoints: false,
          hasVoucher: false,
        },
        {
          date: "2026-11-04",
          label: "T4",
          dayNumber: 4,
          points: null,
          state: null,
          hasPoints: false,
          hasVoucher: false,
        },
        {
          date: "2026-11-05",
          label: "T5",
          dayNumber: 5,
          points: null,
          state: null,
          hasPoints: false,
          hasVoucher: false,
        },
        {
          date: "2026-11-06",
          label: "T6",
          dayNumber: 6,
          points: null,
          state: null,
          hasPoints: false,
          hasVoucher: false,
        },
        {
          date: "2026-11-07",
          label: "T7",
          dayNumber: 7,
          points: null,
          state: null,
          hasPoints: false,
          hasVoucher: false,
        },
        {
          date: "2026-11-08",
          label: "CN",
          dayNumber: 8,
          points: 2,
          state: "today",
          hasPoints: true,
          hasVoucher: false,
        },
      ],
    });
  });
});
