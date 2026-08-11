import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Elapsed milliseconds between two instants.
 *
 * The elapsed value is always *derived* from `startedAt`, never accumulated by
 * a ticking counter. That is what makes the timer survive the app being
 * backgrounded or killed: both platforms throttle or suspend JS timers in the
 * background, so anything that counted upwards would silently under-report.
 * Re-reading the clock cannot drift.
 *
 * The interval only drives repainting; `AppState` forces an immediate recompute
 * on resume so the first frame after returning is already correct instead of
 * showing a stale value for up to a second.
 */
export function useElapsedMs(
  startedAt: number | null,
  finishedAt: number | null,
): number {
  const [now, setNow] = useState(() => Date.now());
  const running = startedAt !== null && finishedAt === null;

  useEffect(() => {
    if (!running) return;

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(Date.now());
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [running]);

  if (startedAt === null) return 0;
  return Math.max(0, (finishedAt ?? now) - startedAt);
}

const pad = (value: number) => String(value).padStart(2, '0');

/** `mm:ss`, widening to `h:mm:ss` only once the count crosses an hour. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
