import { describe, expect, it } from "vitest";
import { partitionSoldOutLast } from "./queries";

/**
 * `soldOutLast` ordering: available products first, sold-out after, with the
 * requested sort order preserved WITHIN each group.
 *
 * Why it lives on the server: availability is DERIVED (stock.ts), so SQL cannot
 * order by it. `getProductListByFilters` therefore skips SQL pagination, shapes
 * every row, partitions here, then slices. A client-side partition was the old
 * approach and re-shuffled the grid on every infinite-scroll page append.
 */
type Row = { id: string; stock_quantity: number };

const rows = (...spec: Array<[string, number]>): Row[] =>
  spec.map(([id, stock_quantity]) => ({ id, stock_quantity }));

describe("partitionSoldOutLast", () => {
  it("sinks sold-out products below every available one", () => {
    const input = rows(
      ["a", 2],
      ["sold1", 0],
      ["b", 1],
      ["sold2", 0],
      ["c", 5],
    );
    expect(partitionSoldOutLast(input).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
      "sold1",
      "sold2",
    ]);
  });

  it("preserves incoming order within the available group", () => {
    const input = rows(["z", 3], ["y", 1], ["x", 2]);
    expect(partitionSoldOutLast(input).map((r) => r.id)).toEqual([
      "z",
      "y",
      "x",
    ]);
  });

  it("preserves incoming order within the sold-out group", () => {
    const input = rows(["z", 0], ["y", 0], ["x", 1]);
    expect(partitionSoldOutLast(input).map((r) => r.id)).toEqual([
      "x",
      "z",
      "y",
    ]);
  });

  it("keeps every row — it reorders, it never filters", () => {
    const input = rows(["a", 1], ["b", 0], ["c", 0], ["d", 9]);
    expect(partitionSoldOutLast(input)).toHaveLength(input.length);
  });

  it("does not mutate its input", () => {
    const input = rows(["a", 0], ["b", 4]);
    const copy = [...input];
    partitionSoldOutLast(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty list", () => {
    expect(partitionSoldOutLast([])).toEqual([]);
  });

  it("handles an all-sold-out and an all-available list", () => {
    expect(partitionSoldOutLast(rows(["a", 0], ["b", 0])).map((r) => r.id)).toEqual(
      ["a", "b"],
    );
    expect(partitionSoldOutLast(rows(["a", 1], ["b", 2])).map((r) => r.id)).toEqual(
      ["a", "b"],
    );
  });

  it("treats zero, negative and NULL stock as sold out", () => {
    const input = [
      { id: "null", stock_quantity: null as unknown as number },
      { id: "neg", stock_quantity: -3 },
      { id: "zero", stock_quantity: 0 },
      { id: "ok", stock_quantity: 1 },
    ];
    expect(partitionSoldOutLast(input).map((r) => r.id)).toEqual([
      "ok",
      "null",
      "neg",
      "zero",
    ]);
  });
});
