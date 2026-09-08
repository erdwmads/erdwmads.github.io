const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};

// Authored contact timing, not a gravity or impact-energy calculation.
export function accretionState(time,index) {
  if(index===0)return {gap:0,turn:0,settled:1,impact:0,age:-1};
  const contact=.16+index*.06;
  const approach=smooth(time/contact);
  const age=time-contact;
  const settled=smooth(age/.16);
  return {gap:.64*(1-approach),turn:(1-approach)*.5,settled,
    impact:age>0&&age<.15?Math.sin(Math.PI*age/.15)*(1-age/.15):0,age};
}

export function alterationState(time) {
  const melt=smooth((time-.06)/.38),wetting=smooth((time-.18)/.40);
  const reaction=smooth((time-.32)/.50),carbonate=smooth((time-.28)/.58);
  return {ice:1-melt,liquid:melt*(1-smooth((time-.57)/.43)),wetting,reaction,carbonate};
}
