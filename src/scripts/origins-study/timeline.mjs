export const clamp = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => { x = clamp(x); return x*x*(3-2*x); };
export function evolution(t) {
  const melt=smooth((t-.08)/.35), cool=smooth((t-.70)/.3);
  return {melt, liquid:melt*(1-cool), reaction:smooth((t-.25)/.45),
    carbonate:smooth((t-.39)/.40), cool, ice:1-melt};
}
