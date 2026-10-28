import type { Item, Runtime } from "./schema";

export function nextScriptedReply(
  items: Item[],
  state: Runtime,
  thread?: string,
) {
  return items.find(
    (item) =>
      item.outgoing &&
      (!thread || item.title === thread) &&
      item.meta.sendOnTap === "true" &&
      !state.unlocked.includes(item.id) &&
      (!item.meta.sendAfter || state.unlocked.includes(item.meta.sendAfter)) &&
      (!item.meta.sendWhenRead ||
        state.read.includes(item.meta.sendWhenRead)) &&
      (!item.meta.sendPhase ||
        state.variables.storyPhase === item.meta.sendPhase),
  );
}
