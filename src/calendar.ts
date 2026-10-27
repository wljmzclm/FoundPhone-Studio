import type { Item } from "./schema";

export function calendarOccursOn(
  item: Pick<Item, "time" | "meta">,
  date: string,
) {
  const start = item.time.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  return item.meta.repeat === "yearly"
    ? date >= start && date.slice(5) === start.slice(5)
    : date === start;
}
