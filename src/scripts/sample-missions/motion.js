export const clampProgress=p=>Number.isFinite(p)?Math.max(0,Math.min(1,p)):0;
export const smooth=t=>{t=clampProgress(t);return t*t*(3-2*t);};
export const mix=(a,b,t)=>a+(b-a)*t;
export function samplingClearance(p){
 p=clampProgress(p);
 if(p<.46)return 7*(1-smooth(p/.46));
 if(p<=.57)return 0;
 return 6.5*smooth((p-.57)/.43);
}
export function releasePaths(p){
 p=clampProgress(p);const separation=smooth((p-.28)/.72);
 const craft=[mix(-5,5,p),3+Math.sin(p*Math.PI)*.4,0];
 const capsule=p<.28?[craft[0],craft[1]-.3,0]:[mix(-2.2,.65,separation),mix(2.7,.45,separation),mix(0,1.85,separation)];
 return {craft,capsule,separated:p>=.28};
}
export function phaseLabel(kind,p,id){
 if(kind==='sample')return p<.46?'Controlled descent':p<=.57?(id==='hayabusa2'?'Projectile sampling':'Nitrogen-assisted sampling'):'Back-away and ascent';
 if(kind==='impact')return p<.4?'Impactor descent':p<.6?'Impact and excavation':'Fresh ejecta on the surface';
 if(kind==='return')return p<.28?'Earth approach':'Capsule released · spacecraft diverts';
 if(kind==='landing')return p<.48?'Atmospheric entry':p<.94?'Parachute descent':p<1?'Touchdown approach':'Capsule on Earth';
 if(kind==='launch')return p<.12?'Initial climb':p<.5?'Pitch-over and ascent':p<.78?'Stage separation':p<.88?'Spacecraft separation':p<1?'Solar array deployment':'Solar arrays deployed';
 if(kind==='stow')return p<.16?'Opening the return capsule':p<.57?'Placing the sampling head':p<.64?'Head seated in capture ring':p<.82?'Head retained · arm withdraws':p<1?'Closing the return capsule':'Samples secured for return';
 if(kind==='cruise')return '~1 year orbiting the Sun';
 if(kind==='flyby')return p<.46?'Earth flyby · incoming approach':p>.54?'Earth flyby · outgoing departure':'Earth flyby · closest approach';
 if(kind==='outbound')return 'Onward transfer to '+(id==='hayabusa2'?'Ryugu':'Bennu');
 return {rendezvous:'Surveying the asteroid',depart:'Leaving with samples'}[kind]||'';
}
export const durations={launch:28,cruise:12,flyby:18,outbound:10,rendezvous:14,sample:16,impact:14,stow:12,depart:12,return:22,landing:26};
