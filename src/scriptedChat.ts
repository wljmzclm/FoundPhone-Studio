import type { Item, Runtime } from "./schema";

export function nextScriptedReply(items: Item[], state: Runtime) {
  return items.find(
    (item) =>
      item.outgoing &&
      item.meta.sendOnTap === "true" &&
      !state.unlocked.includes(item.id) &&
      (!item.meta.sendAfter || state.unlocked.includes(item.meta.sendAfter)) &&
      (!item.meta.sendPhase ||
        state.variables.storyPhase === item.meta.sendPhase),
  );
}
