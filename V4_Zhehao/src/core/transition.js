// Keep one owner on screen. Once the old view reaches the backdrop, reveal
// the latest requested view. A reversal can turn the fade around at any point.
export function createFadeThrough(keyAt) {
  const fadeOut = 0.22;
  const fadeIn = 0.32;
  let shownKey;
  let level = 1;
  let displayed = 0;

  return function sample(requested, dt, reducedMotion = false) {
    const key = keyAt(requested);
    if (shownKey === undefined || reducedMotion) {
      shownKey = key;
      level = 1;
    } else if (key === shownKey) {
      level = Math.min(1, level + dt / fadeIn);
    } else {
      level = Math.max(0, level - dt / fadeOut);
      if (level === 0) shownKey = key;
    }
    if (key === shownKey) displayed = requested;
    return { progress: displayed, opacity: level * level * (3 - 2 * level) };
  };
}
