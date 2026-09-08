// One continuous clock for both scenes keeps the shared star/Sun handoff aligned.
export function arrivalProgress(time) {
  const t = Math.max(0, Math.min(1, time));
  return t * t * (3 - 2 * t);
}
