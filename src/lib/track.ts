// Private, on-device usage events.
//
// CraftCV has no third-party analytics (the strict CSP deliberately blocks
// them). These counts power the "Usage on this device" card in Settings and
// stay in this browser's localStorage — they are never uploaded anywhere.

const KEY = 'craftcv.events.v1';
const CAP = 1000;

export interface TrackedEvent {
  name: string;
  at: number;
}

export function trackEvent(name: string): void {
  try {
    const raw = localStorage.getItem(KEY);
    const list: TrackedEvent[] = raw ? JSON.parse(raw) : [];
    list.push({ name, at: Date.now() });
    // keep the newest CAP events
    localStorage.setItem(KEY, JSON.stringify(list.slice(-CAP)));
  } catch {
    /* private mode / storage full — tracking is a nicety, never a requirement */
  }
}

export function trackedEvents(): TrackedEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackedEvent[]) : [];
  } catch {
    return [];
  }
}

export function eventCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of trackedEvents()) counts[e.name] = (counts[e.name] ?? 0) + 1;
  return counts;
}

export function clearTrackedEvents(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
