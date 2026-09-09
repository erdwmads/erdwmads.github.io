export const clamp = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => { x = clamp(x); return x*x*(3-2*x); };
export const IMPACTS = [
  {time:.18, radius:.53, contact:1.14, angle:.5, tilt:.28},
  {time:.29, radius:.42, contact:1.1, angle:2.6, tilt:-.48},
  {time:.40, radius:.67, contact:1.36, angle:4.4, tilt:.24},
  {time:.51, radius:.46, contact:1.25, angle:1.6, tilt:.78},
  {time:.63, radius:.73, contact:1.65, angle:3.1, tilt:.25},
  {time:.75, radius:.55, contact:1.49, angle:5.6, tilt:-.4},
  {time:.87, radius:.39, contact:1.55, angle:2.1, tilt:-.85},
];
export function collision(t, e) {
  const approach = smooth((t-e.time+.17)/.17);
  const retained = smooth((t-e.time)/.10);
  return {distance:e.contact+(1-approach)*6.5-retained*e.radius*.04,
    retained, approach, impact:Math.exp(-Math.max(0,t-e.time)*60)*(t>=e.time?1:0)};
}
export function bodyVolume(t) {
  return 1 + IMPACTS.reduce((sum,e)=>sum+e.radius**3*collision(t,e).retained,0);
}
export function evolution(t) {
  const melt=smooth((t-.08)/.35), cool=smooth((t-.70)/.3);
  return {melt, liquid:melt*(1-cool), reaction:smooth((t-.25)/.45),
    carbonate:smooth((t-.39)/.40), cool, ice:1-melt};
}
