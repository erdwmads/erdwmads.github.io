import * as T from 'three';
import {earthFlightState,EARTH_RADIUS_KM as R,EARTH_FLIGHT_PROFILES} from './earth-physics.js';
import {earthPoint,locationFor} from './geography.js';
import {physicalScale,physicalSizes} from './proximity.js';
import {earthGroundMaterial,createRecoveryGround} from './earth-ground.js';
const up=new T.Vector3(0,1,0),down=new T.Vector3(0,-1,0),center=new T.Vector3(0,-R,0);
const bounds=o=>new T.Box3().setFromObject(o),span=o=>Math.max(...bounds(o).getSize(new T.Vector3()).toArray());
function releaseFrame(state){
 const outward=new T.Vector3(...state.capsule.positionKm).sub(new T.Vector3(...state.spacecraft.positionKm)).normalize();
 const wing=new T.Vector3(0,0,1); // fixed orbit-plane normal, including collinear ejection
 return {outward,wing,deck:outward.clone().cross(wing).normalize()};
}
export function earthOrientation(site){
 const a=site.lon*Math.PI/180,east=new T.Vector3(-Math.sin(a),0,-Math.cos(a)),normal=earthPoint(site.lat,site.lon),south=east.clone().cross(normal);
 return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(east,normal,south).invert());
}
export function earthFlightShot(state,context,aspect=1.9){
 const portrait=Math.max(1,Math.min(1.65,1.18/aspect)),position=new T.Vector3(...state.positionKm);
 let target,offset,size,cameraUp=up.clone();
 if(context==='earth'){
  if(state.kind==='return'){
   target=position.clone().add(center).multiplyScalar(.5);size=position.distanceTo(center)+R*2;
   offset=new T.Vector3(.18,.25,1.55).multiplyScalar(size*portrait);
  }else {target=center.clone();size=R*2;offset=new T.Vector3(.28,1.35,.78).multiplyScalar(size*portrait);}
 }else{
  target=new T.Vector3(...state.cameraTarget);size=state.displaySpanKm;
  const radial=new T.Vector3(...state.up),east=new T.Vector3(radial.y,-radial.x,0),south=new T.Vector3(0,0,1);
  if(state.kind==='launch'){
   // This local orbital frame never rolls through a global-up singularity.
   cameraUp.copy(radial);offset=east.multiplyScalar(1.25).addScaledVector(radial,.5).addScaledVector(south,2.15);
  }else{
   const approach=new T.Vector3(...(state.approachDirection||state.forward));
   cameraUp.copy(south).cross(approach).normalize();
   // A fixed oblique view down the incoming path keeps Earth ahead of the
   // released capsule, rather than panning sideways around the mother ship.
   offset=approach.multiplyScalar(-2.5).addScaledVector(south,.65);
   if(state.kind==='landing'){
    const nearGround=1-T.MathUtils.smoothstep(state.altitudeKm,5,80);
    offset.lerp(east.multiplyScalar(-2.2).addScaledVector(radial,.65).addScaledVector(south,.65),nearGround);
    cameraUp.lerp(radial,nearGround).normalize();
   }
  }
  offset.multiplyScalar(size*portrait);
 }
 return {target:target.toArray(),position:target.clone().add(offset).toArray(),up:cameraUp.toArray(),fov:40,near:Math.max(.0000005,size*.005),far:Math.max(40000,position.distanceTo(center)*4),minDistance:size*.8,maxDistance:Math.max(50000,size*8)};
}
export function createEarthFlightScene(id,{group,earth,craft,launch,capsule,canopy,desert,heat,entryWake}){
 const profile=EARTH_FLIGHT_PROFILES[id],craftScale=physicalScale(span(craft.group),physicalSizes[id].spanM),capsuleScale=profile.capsule.diameterKm/bounds(capsule).getSize(new T.Vector3()).x,capsuleBottom=bounds(capsule).min.y,capsuleTop=bounds(capsule).max.y;
 // Solid airframe dimensions exclude the transparent exhaust plume.
 const launchScale=profile.rocket.lengthKm/(launch.group.userData.airframeLength||(id==='hayabusa2'?4.72:4.70));
 const upperStage=launch.group.getObjectByName(id==='hayabusa2'?'second-stage':'Centaur'),upperBounds=new T.Box3();
 launch.group.updateMatrixWorld(true);
 upperStage.traverse(o=>{if(o.isMesh&&!o.material?.uniforms?.power)upperBounds.union(bounds(o));});
 const upperCenter=launch.group.worldToLocal(upperBounds.getCenter(new T.Vector3())),upperSpan=Math.max(...upperBounds.getSize(new T.Vector3()).toArray());
 const local=new T.Group(),land=new T.Mesh(new T.PlaneGeometry(1.2,1.2,48,48).rotateX(-Math.PI/2),earthGroundMaterial(0x405f45));local.add(land);land.receiveShadow=true;
 const pad=new T.Mesh(new T.BoxGeometry(.07,.00015,.085),new T.MeshStandardMaterial({color:0x8c9496,roughness:1}));pad.position.y=.000075;local.add(pad);pad.receiveShadow=true;
 const trench=new T.Mesh(new T.BoxGeometry(.008,.0002,.12),new T.MeshStandardMaterial({color:0x313d40,roughness:1}));trench.position.set(0,.0001,.036);local.add(trench);group.add(local);
 const recoveryGround=createRecoveryGround(id);group.add(recoveryGround);
 const markerGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0,0,0,0],3)),markerMaterial=new T.PointsMaterial({size:6,sizeAttenuation:false,color:0xe8c782,depthTest:false,depthWrite:false});
 markerMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\nif(length(gl_PointCoord-vec2(.5))>.5)discard;');};
 const markers=new T.Points(markerGeometry,markerMaterial);group.add(markers);
 const smokeGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(90),3)),smokeMaterial=new T.PointsMaterial({color:0xd9dedc,size:.014,transparent:true,opacity:.22,depthWrite:false,sizeAttenuation:true});
 smokeMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\nfloat cloudRadius=length(gl_PointCoord-vec2(.5))*2.;if(cloudRadius>1.)discard;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=pow(1.-cloudRadius,1.6);');};
 const smoke=new T.Points(smokeGeometry,smokeMaterial);group.add(smoke);
 const routes={};for(const kind of ['launch','return','landing']){const positions=Array.from({length:241},(_,i)=>new T.Vector3(...earthFlightState(id,kind,i/240).positionKm)),route=new T.Line(new T.BufferGeometry().setFromPoints(positions),new T.LineBasicMaterial({color:0x84bfd0,transparent:true,opacity:.45}));group.add(route);routes[kind]=route;}
 let current,state,labels=[];
 function helpers(visible){markers.visible=visible;for(const [kind,r] of Object.entries(routes))r.visible=visible&&kind===current;}
 function hide(){smoke.visible=false;local.visible=false;recoveryGround.visible=false;helpers(false);state=null;}
 function update(kind,p,context){
  // Reserve the last two playback seconds for fabric settling after touchdown.
  current=kind;state={...earthFlightState(id,kind,kind==='landing'?Math.min(1,p/.92):p),kind};smoke.visible=kind==='launch'&&state.elapsedSeconds<35;labels=[];local.visible=kind==='launch'&&state.altitudeKm<5;helpers(context==='earth');
  earth.visible=true;earth.scale.setScalar(R);earth.position.copy(center);earth.quaternion.copy(earthOrientation(locationFor(id,kind)));
  earth.children[0].material.opacity=1;earth.children[1].material.opacity=.45;earth.children[2].material.uniforms.opacity.value=.32;
  desert.visible=false;recoveryGround.visible=kind==='landing'&&state.altitudeKm<80;
  capsule.userData.setRecovery?.(0);const radial=new T.Vector3(...state.up),forward=new T.Vector3(...state.forward);
  if(kind==='launch'){
   const t=state.elapsedSeconds,sp=smokeGeometry.attributes.position;for(let i=0;i<30;i++){const age=Math.max(0,t-i*.3),angle=i*2.39996,r=.0006*age+Math.sqrt(i)*.001;sp.setXYZ(i,Math.cos(angle)*r,.002+age*.00015,Math.sin(angle)*r+.0004*age);}sp.needsUpdate=true;smokeGeometry.computeBoundingSphere();smokeMaterial.opacity=Math.min(.36,t*.09)*Math.max(0,1-t/35);smokeMaterial.size=.012+.0006*Math.min(t,25);
   launch.update(p,state);launch.group.visible=true;launch.group.scale.setScalar(launchScale);launch.group.quaternion.setFromUnitVectors(up,forward);launch.group.position.copy(new T.Vector3(...state.positionKm)).addScaledVector(radial,.00015-(launch.group.userData.baseY??(id==='hayabusa2'?-1.73:-1.71))*launchScale);launch.group.updateMatrixWorld(true);
   const payload=launch.group.localToWorld(launch.payloadMountPosition(p,state)).sub(craft.launchMount.clone().multiplyScalar(craftScale).applyQuaternion(launch.group.quaternion));state.cameraTarget=state.spacecraftReleased?payload.toArray():launch.group.position.toArray();state.displaySpanKm=profile.rocket.lengthKm;
   {
    // Reframe around the surviving hardware after the fairing and first stage
    // depart. Bounds exclude exhaust; this changes the camera, never model scale.
    const focusStart=Math.max(state.events.stageSeparation,state.events.fairingSeparation);
    const focus=T.MathUtils.smoothstep(t,focusStart+20,focusStart+50);
    state.cameraTarget=launch.group.position.clone().lerp(launch.group.localToWorld(upperCenter.clone()),focus).toArray();
    state.displaySpanKm=T.MathUtils.lerp(profile.rocket.lengthKm,upperSpan*launchScale*1.6,focus);
    const releaseFocus=T.MathUtils.smoothstep(t,state.events.spacecraftSeparation,state.events.spacecraftSeparation+30);
    state.cameraTarget=new T.Vector3(...state.cameraTarget).lerp(payload,releaseFocus).toArray();
    state.displaySpanKm=T.MathUtils.lerp(state.displaySpanKm,profile.spacecraft.spanKm*2,releaseFocus);
   }
   // The real folded payload remains on its adapter after the fairing leaves.
   craft.group.visible=true;craft.group.scale.setScalar(craftScale);craft.group.position.copy(payload);craft.group.quaternion.copy(launch.group.quaternion);craft.setSolarDeployment(state.spacecraftReleased?Math.min(1,(state.elapsedSeconds-state.events.spacecraftSeparation)/40):0);craft.setHornDeployment?.(state.spacecraftReleased?Math.min(1,(state.elapsedSeconds-state.events.spacecraftSeparation)/40):0);
   labels.push({text:state.spacecraftReleased?profile.spacecraft.name:profile.rocket.name,point:new T.Vector3(...state.cameraTarget)});
  }else if(kind==='return'){
   craft.group.visible=capsule.visible=true;craft.group.scale.setScalar(craftScale);craft.group.position.set(...state.spacecraft.positionKm);craft.group.quaternion.setFromUnitVectors(up,new T.Vector3(...state.capsule.positionKm).sub(craft.group.position).normalize());craft.capsule.visible=false;
   if(id==='hayabusa2'){
    // Illustrative release attitude: the +Z capsule deck faces the separating
    // capsule, with solar paddles across the ejection path. No attitude telemetry
    // is implied; spacecraft and capsule positions and physical sizes stay fixed.
    const frame=releaseFrame(state);
    craft.group.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(frame.wing,frame.deck,frame.outward));
   }
   capsule.scale.setScalar(capsuleScale);capsule.position.set(...state.capsule.positionKm).addScaledVector(radial,-capsuleBottom*capsuleScale);capsule.quaternion.setFromUnitVectors(down,forward);
   const separation=craft.group.position.distanceTo(capsule.position),follow=T.MathUtils.smoothstep(separation,profile.spacecraft.spanKm*3,profile.spacecraft.spanKm*8);
   state.cameraTarget=craft.group.position.clone().add(capsule.position).multiplyScalar(.5).lerp(capsule.position,follow).toArray();state.displaySpanKm=T.MathUtils.lerp(profile.spacecraft.spanKm*1.7,profile.capsule.diameterKm*2.3,follow);
   labels.push({text:state.diverting?'Spacecraft · Earth avoidance':'Spacecraft · capsule release',point:craft.group.position.clone()},{text:'Return capsule · '+Math.round(profile.capsule.diameterKm*1e5)+' cm',point:capsule.position.clone()});
  }else{
   capsule.visible=true;capsule.scale.setScalar(capsuleScale);capsule.position.set(...state.positionKm);capsule.quaternion.setFromUnitVectors(down,state.parachute>0?radial.clone().negate():forward);capsule.position.addScaledVector(radial,-capsuleBottom*capsuleScale);capsule.userData.setRecovery?.(state.parachute);
   heat.visible=state.heat>.005;heat.scale.setScalar(capsuleScale*.65);heat.quaternion.copy(capsule.quaternion);heat.position.copy(capsule.position);entryWake.update(.08+Math.min(.3,state.elapsedSeconds/1000));
   const canopyScale=(id==='osiris-rex'?.0073:.0025)/(canopy.group.userData.deployedSpan||(id==='osiris-rex'?2.7323272:2.7729001)),crown=id==='hayabusa2'?0:capsuleTop*capsuleScale; canopy.group.visible=state.parachute>0;canopy.group.scale.setScalar(canopyScale);canopy.group.quaternion.setFromUnitVectors(up,radial);canopy.group.position.copy(capsule.position).addScaledVector(radial,2*canopyScale+crown);
   canopy.update(state.parachute,state.landed?T.MathUtils.smoothstep(p,.92,1):0,(capsuleBottom*capsuleScale-crown)/canopyScale);
   state.cameraTarget=capsule.position.clone().addScaledVector(radial,state.parachute>0?canopyScale:0).toArray();state.displaySpanKm=state.parachute>0?canopyScale*3:profile.capsule.diameterKm*2.3;
   if(state.landed){
    const settle=T.MathUtils.smoothstep(p,.94,1);
    const recoveryBounds=new T.Box3().setFromObject(canopy.group,true).union(new T.Box3().setFromObject(capsule,true));
    state.cameraTarget=new T.Vector3(...state.cameraTarget).lerp(recoveryBounds.getCenter(new T.Vector3()),settle).toArray();
    state.displaySpanKm*=T.MathUtils.lerp(1,.72,settle);
   }
   labels.push({text:state.landed?'Recovered capsule':state.parachute>0?'Parachute descent':'Heat shield faces the airflow',point:capsule.position.clone()});
  }
  const position=markerGeometry.attributes.position;position.setXYZ(0,0,.001,0);position.setXYZ(1,...state.positionKm);position.setXYZ(2,...(state.spacecraft?.positionKm||state.positionKm));position.needsUpdate=true;markerGeometry.computeBoundingSphere();
  if(context==='earth'){labels=kind==='return'?[{text:'Earth · recovery region',point:new T.Vector3(0,0,0)},...labels]:[{text:locationFor(id,kind).label,point:new T.Vector3(0,0,0)},...labels];}
  group.updateMatrixWorld(true);return labels;
 }
 hide();return {update,hide,helpers,state:()=>state};
}
