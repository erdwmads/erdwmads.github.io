import {phaseLabel} from './motion.js';
const distance=km=>km<1?Math.round(km*1000)+' m':km>=1e6?(km/1e6).toFixed(2)+' million km':km.toLocaleString('en-US',{maximumFractionDigits:1})+' km';
export function flightCue(state,kind,mission){
 const j=state?.journey,v=state?.proximity,f=state?.earth;
 if(j)return kind==='cruise'?['Earth → solar loop → Earth flyby','One year around the Sun · next: close Earth encounter']:['Earth flyby → '+j.targetName,distance(j.rangeToTargetKm)+' to '+j.targetName+' · gold ring marks arrival'];
 if(v&&kind==='flyby'){const [a,b]=state.flyby.endpoints;return [state.reference==='sun'?'Sun frame · Earth is moving':'Earth frame · one open flyby',state.reference==='sun'?'Probe / Sun: '+a.speedSunKmS.toFixed(2)+' → '+b.speedSunKmS.toFixed(2)+' km/s · blue + gold = green':'Gold: probe velocity turns · far-field Earth-relative speed nearly unchanged'];}
 if(v){const initial=v.rangeHistory[0],delta=v.rangeKm-initial;return [(kind==='depart'?'Away from ':'Approaching ')+v.target+' · '+distance(v.rangeKm),(delta<0?'Closer by ':'Farther by ')+distance(Math.abs(delta))+(kind==='depart'?' · return journey to Earth':' · range from centre')];}
 if(f)return kind==='return'?['Capsule → Earth · '+distance(f.altitudeKm)+' altitude',f.diverting?'Green path: spacecraft misses Earth · blue path: capsule enters':'Separation begins · capsule and spacecraft initially share the inbound path']:kind==='landing'?[f.landed?'Capsule on the ground':'↓ '+distance(f.altitudeKm)+' above the recovery region',f.phase]:[f.phase,distance(f.altitudeKm)+' above Earth'];
 return [phaseLabel(kind,state?.progress||0,mission),'Time compressed · pause or scrub to inspect'];
}
export function updateFlightCues(root,state,kind,mission,targetName){
 const el=name=>root.querySelector('[data-mission-'+name+']'),cue=flightCue(state,kind,mission);
 el('cue-title').textContent=cue[0];el('cue-detail').textContent=cue[1];
 const context=state?.flyby?.solarContext;el('solar-context').hidden=!context;
 if(!context)return;
 const point=v=>[110+v[0]*24,80+v[2]*15];
 for(const body of ['earth','target']){
  el('solar-'+body+'-orbit').setAttribute('d',context[body+'Orbit'].map((v,i)=>(i?'L':'M')+point(v).join(' ')).join(' '));
  el('solar-'+body).setAttribute('transform','translate('+point(context[body]).join(' ')+')');
 }
 const earth=point(context.earth),target=point(context.target);el('solar-target-name').setAttribute('y',Math.abs(target[0]-earth[0])<50&&Math.abs(target[1]+14-(earth[1]-14))<15?30:14);
 el('solar-target-name').textContent=targetName;el('solar-next').textContent='Earth bends the path → onward to '+targetName;
}
