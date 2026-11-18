export interface OrderAlert {
  id: string;
  order_number: string;
  total_price: number;
  created_at: string;
}

export interface OrderAlertCursor {
  createdAt: string;
  id: string;
}

export function parseOrderAlertCursor(raw: string): OrderAlertCursor | null {
  try {
    const value = JSON.parse(raw);
    if (typeof value.createdAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT[\d:.]+(?:Z|[+-]\d\d:\d\d)$/.test(value.createdAt) ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      typeof value.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) return null;
    return { createdAt: value.createdAt, id: value.id };
  } catch {
    return null;
  }
}

export function advanceOrderAlertCursor(orders: OrderAlert[]): OrderAlertCursor | null {
  const last = orders.at(-1);
  return last ? { createdAt: last.created_at, id: last.id } : null;
}
