import type { Runtime, Work } from "./schema";

// Author restrictions also apply to apps installed through a saved layout.
export function canOpenApp(work: Work, state: Runtime, id: string) {
  if (!work.apps.some((a) => a.id === id && a.installed)) return false;
  const policy = work.phone.appAccess;
  return (
    !policy ||
    policy.duringStory.includes(id) ||
    (state.endings.length > 0 && policy.afterEnding.includes(id))
  );
}
