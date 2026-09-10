// Physical lengths in metres; scene coordinates in kilometres.
export const physicalSizes={
 'hayabusa2':{spanM:6,diameterM:900,target:'Ryugu',source:'https://global.jaxa.jp/projects/sas/hayabusa2/index.html',bodySource:'https://www.hayabusa2.jaxa.jp/science/ryuugu/'},
 'osiris-rex':{spanM:6.2,diameterM:500,target:'Bennu',source:'https://www.nasa.gov/wp-content/uploads/2016/06/osiris_rex_factsheet5-9.pdf',bodySource:'https://www.asteroidmission.org/objectives/bennu/'}
};
export const isProximity=kind=>kind==='rendezvous'||kind==='depart'||kind==='flyby';
export const physicalScale=(nativeSpan,metres)=>metres/1000/nativeSpan;
export function sampleTrack(track,p){
 p=Number.isFinite(p)?Math.max(0,Math.min(1,p)):0;
 const samples=track.samples,index=Math.min(samples.length-2,Math.floor(p*(samples.length-1))),u=p*(samples.length-1)-index,a=samples[index],b=samples[index+1],dt=(Date.parse(b.time)-Date.parse(a.time))/1000;
 const h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;
 const position=a.position.map((v,i)=>h00*v+h10*dt*a.velocity[i]+h01*b.position[i]+h11*dt*b.velocity[i]);
 const velocity=a.position.map((v,i)=>((6*u*u-6*u)*v+(3*u*u-4*u+1)*dt*a.velocity[i]+(-6*u*u+6*u)*b.position[i]+(3*u*u-2*u)*dt*b.velocity[i])/dt);
 return {position,velocity,time:new Date(Date.parse(a.time)+u*dt*1000).toISOString()};
}
export function proximityShot(state,focus,aspect=1.9){
 const {position,extent,diameterKm,spanKm}=state;let target,offset,near;
 if(focus==='asteroid'){target=state.targetPosition||[0,0,0];offset=[1.5,.9,2].map(v=>v*diameterKm);near=diameterKm*.002;}
 else if(focus==='spacecraft'){target=position;offset=[2,1.2,3].map(v=>v*spanKm);near=spanKm*.02;}
 else{target=state.center;offset=(state.kind==='flyby'?[.12,1.35,.6]:[0,.5,1.55]).map(v=>v*extent);near=extent*.0001;}
 const framing=Math.max(1,Math.min(1.9,1.25/aspect));return {target,position:target.map((v,i)=>v+offset[i]*framing),fov:40,near,far:Math.max(150,extent*8),minDistance:focus==='spacecraft'?spanKm*.7:focus==='asteroid'?diameterKm*.8:extent*.1,maxDistance:focus==='spacecraft'?spanKm*20:focus==='asteroid'?diameterKm*10:extent*8};
}
