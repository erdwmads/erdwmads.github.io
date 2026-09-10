import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {rockMaterial,stoneGeometry,rng} from '../origins-study/materials.js';
import {createSpacecraft,createCapsule} from './spacecraft.js';
import {createLaunchVehicle} from './launch.js';
import {physicalSizes,physicalScale,sampleTrack,isProximity} from './proximity.js';
import {transferState,transferPath,flybyFrameState} from './transfer.js';
import {hasEarthContext} from './locations.js';
import {createEarthFlightScene} from './earth-scene.js';
import {earthInertialOrientation} from './earth-inertial.js';
import {earthGroundMaterial} from './earth-ground.js';
import {createSciProjectile} from './sci.js';
import {createSamplingTerrain} from './terrain.js';
import {createRecoveryCanopy} from './recovery.js';
import {createCorona,createEntryWake} from './atmosphere.js';
import {augmentAsteroid} from './asteroid-detail.js';
import {normalizeAsteroid} from '../asteroid-scale.js';
import {samplingClearance,samplingState,collectedGrain,phaseLabel,smooth,mix,sciFlight} from './motion.js';

export function disposeGraph(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root?.traverse?.(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))materials.add(m);});
 for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}
 geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
}
const mesh=(geometry,material,parent,position=[0,0,0])=>{const m=new T.Mesh(geometry,material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
function glow(color,opacity=.2){
 return new T.ShaderMaterial({uniforms:{color:{value:new T.Color(color)},opacity:{value:opacity}},transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,
 vertexShader:'varying vec3 n; varying vec3 p; void main(){ n=normalize(mat3(modelMatrix)*normal);p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
 fragmentShader:'varying vec3 n;varying vec3 p;uniform vec3 color;uniform float opacity;void main(){float angle=abs(dot(normalize(n),normalize(cameraPosition-p)));float r=pow(1.-angle,3.)*smoothstep(0.,.18,angle);gl_FragColor=vec4(color,r*opacity);}'});
}
function makeEarth(day,clouds){
 const group=new T.Group();
 mesh(new T.SphereGeometry(1,128,80),new T.MeshStandardMaterial({map:day,roughness:.76,transparent:true}),group);
 mesh(new T.SphereGeometry(1+8/6371,128,80),new T.MeshStandardMaterial({map:clouds,transparent:true,opacity:.85,depthWrite:false,roughness:1}),group);
 mesh(new T.SphereGeometry(1+100/6371,64,48),glow('#5aabed',.55),group);
 group.children.forEach(mesh=>{mesh.castShadow=false;mesh.receiveShadow=false;});
 group.rotation.set(.12,2,.15);return group;
}
function photosphere(){
 return new T.ShaderMaterial({vertexShader:'varying vec3 vPosition;varying vec3 vNormal;varying vec3 vEye;void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vEye=-mv.xyz;gl_Position=projectionMatrix*mv;}',
 fragmentShader:`
 varying vec3 vPosition;varying vec3 vNormal;varying vec3 vEye;
 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
 void main(){vec3 p=normalize(vPosition);float cell=noise(p*85.)*.6+noise(p*180.)*.4;float macro=noise(p*12.);
 float limb=pow(max(0.,dot(normalize(vNormal),normalize(vEye))),.28);float spots=smoothstep(.72,.88,macro)*.4;
 vec3 light=mix(vec3(2.5,.72,.12),vec3(5.1,2.9,.8),cell);gl_FragColor=vec4(light*(.35+.65*limb)*(1.-spots),1.);}
 `});
}

function line(points,color,opacity=.45){
 return new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity}));
}
async function asteroid(id,signal){
 const response=await fetch('/assets/data/planetary/'+(id==='ryugu'?'ryugu.obj':'bennu.glb'),{signal});
 if(!response.ok)throw Error('Asteroid model unavailable');
 const object=id==='ryugu'?new OBJLoader().parse(await response.text()):(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')).scene;
 const unit=normalizeAsteroid(object,id);
 object.traverse(o=>{if(o.isMesh){for(const m of [o.material].flat())m?.dispose();o.material=rockMaterial(id==='ryugu'?0x454846:0x474542);o.castShadow=true;o.receiveShadow=true;}});
 augmentAsteroid(unit,id);return unit;
}
export async function createMissionScene(id,signal){
 const loader=new T.TextureLoader();
 const results=await Promise.allSettled([createSpacecraft(id),asteroid(id==='hayabusa2'?'ryugu':'bennu',signal),loader.loadAsync('/assets/img/arrival/earth-day.jpg'),loader.loadAsync('/assets/img/arrival/earth-clouds.png'),fetch('/assets/data/missions/ephemeris.json',{signal}).then(r=>{if(!r.ok)throw Error('Mission trajectory unavailable');return r.json();}),fetch('/assets/data/missions/journey.json',{signal}).then(r=>{if(!r.ok)throw Error('Solar journey unavailable');return r.json();})]);
 if(signal.aborted||results.some(r=>r.status==='rejected')){
  for(const r of results)if(r.status==='fulfilled'){if(r.value?.isTexture)r.value.dispose();else disposeGraph(r.value.group||r.value);}
  throw results.find(r=>r.status==='rejected')?.reason||new DOMException('Disposed','AbortError');
 }
 const [craft,body,day,clouds,ephemeris,journeyData]=results.map(r=>r.value);day.colorSpace=T.SRGBColorSpace;
 const group=new T.Group(),earth=makeEarth(day,clouds),sun=new T.Group(),launch=createLaunchVehicle(id),capsule=createCapsule(id),canopy=createRecoveryCanopy(id),chute=canopy.group,terrain=createSamplingTerrain(id),ground=terrain.group,desert=new T.Group(),route=new T.Group(),stars=new T.Group();
 const sizes=physicalSizes[id],craftSpan=new T.Box3().setFromObject(craft.group).getSize(new T.Vector3());
 const craftPhysicalScale=physicalScale(Math.max(...craftSpan.toArray()),sizes.spanM),bodyPhysicalScale=body.userData.kilometersPerUnit;
 const proximityRoutes={},proximityTrails={},proximityViews={};
 for(const kind of ['rendezvous','depart','flyby']){
  const raw=ephemeris[id][kind==='flyby'?'earthFlyby':kind],track={...raw,samples:raw.samples.slice(raw.playbackStartIndex||0)},rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(...track.samples[0].position).normalize(),new T.Vector3(.92,.15,.36).normalize());
  if(kind==='flyby'){const closest=track.samples.reduce((a,b)=>Math.hypot(...a.position)<Math.hypot(...b.position)?a:b),r=new T.Vector3(...closest.position).normalize(),n=r.clone().cross(new T.Vector3(...closest.velocity)).normalize(),t=n.clone().cross(r).normalize();rotation.setFromRotationMatrix(new T.Matrix4().makeBasis(r,n.negate(),t).invert());}
  const points=track.samples.map(s=>new T.Vector3(...s.position).applyQuaternion(rotation)),box=new T.Box3().setFromPoints([new T.Vector3(),...points]),extent=box.getSize(new T.Vector3()).length(),center=box.getCenter(new T.Vector3()).toArray();
  const route=line(points,0x7cb9c6,.30),trail=line(points,0xe8c782,.9);group.add(route,trail);proximityRoutes[kind]=route;proximityTrails[kind]=trail;proximityViews[kind]={track,rotation,extent,center};
 }
 const locatorGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0],3)),locators=new T.Points(locatorGeometry,new T.PointsMaterial({size:5,sizeAttenuation:false,color:0xe8c782,depthTest:false,depthWrite:false}));group.add(locators);
 locators.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\nif(length(gl_PointCoord-vec2(.5))>.5)discard;');};let proximityState=null;
 group.add(craft.group,body,earth,sun,launch.group,capsule,chute,ground,desert,route,stars);
 mesh(new T.SphereGeometry(.62,40,28),photosphere(),sun);
 sun.add(createCorona());
 const random=rng(618),noise=new ImprovedNoise();
 const dummy=new T.Object3D();
 const impactor=createSciProjectile();group.add(impactor);
 const projectile=mesh(new T.SphereGeometry(.018,12,8),new T.MeshStandardMaterial({color:0xc8c5b2,metalness:.7,roughness:.4}),group);
 const particles=new T.InstancedMesh(stoneGeometry(80,1),new T.MeshStandardMaterial({color:0x626059,roughness:1}),96);group.add(particles);
 const seeds=Array.from({length:96},()=>({a:random()*Math.PI*2,v:.4+random()*2,h:.5+random()*1.7,s:.004+random()**3*.035}));
 const desertGeometry=new T.PlaneGeometry(200,200,100,100);desertGeometry.rotateX(-Math.PI/2);
 const dp=desertGeometry.attributes.position;for(let i=0;i<dp.count;i++){const x=dp.getX(i),z=dp.getZ(i);dp.setY(i,(noise.noise(x*.18,4,z*.18)-noise.noise(0,4,0))*.15*smooth((Math.hypot(x,z)-2.8)/3));}desertGeometry.computeVertexNormals();
 const desertMaterial=earthGroundMaterial(id==='hayabusa2'?0x947452:0xb6a78b);desertMaterial.transparent=true;
 mesh(desertGeometry,desertMaterial,desert).castShadow=false;
 const entryWake=createEntryWake(),heat=entryWake.group;group.add(heat);
 const solarRoutes={};
 for(const kind of ['cruise','outbound']){
  const points=transferPath(id,kind,journeyData).map(p=>new T.Vector3(...p)),path=line(points,0x83b8c7,.35),trail=line(points,0xe8c782,.95);
  const earthPath=line(transferPath(id,kind,journeyData,'earth').map(p=>new T.Vector3(...p)),0x7cb9e5,.3),targetPath=line(transferPath(id,kind,journeyData,'target').map(p=>new T.Vector3(...p)),0xc3aa81,.3);
  const chapter=new T.Group();chapter.add(path,trail,earthPath,targetPath);route.add(chapter);solarRoutes[kind]={group:chapter,trail};
 }
 // Flyby positions share the same time and orientation in both reference frames.
 const flybySunPoints=[],flybyEarthPoints=[];
 for(let i=0;i<ephemeris[id].earthFlyby.samples.length;i++){
  const f=flybyFrameState(id,i/(ephemeris[id].earthFlyby.samples.length-1),ephemeris,journeyData),rotation=proximityViews.flyby.rotation;
  flybySunPoints.push(new T.Vector3(...f.heliocentricOffsetKm).applyQuaternion(rotation));flybyEarthPoints.push(new T.Vector3(...f.earthOffsetKm).applyQuaternion(rotation));
 }
 const flybySunRoute=line(flybySunPoints,0x83b8c7,.4),flybySunTrail=line(flybySunPoints,0xe8c782,.95),flybyEarthRoute=line(flybyEarthPoints,0x7cb9e5,.5);group.add(flybySunRoute,flybySunTrail,flybyEarthRoute);
 const sunFrameBox=new T.Box3().setFromPoints([...flybySunPoints,...flybyEarthPoints]);
 const flybyEnds=[0,1].map(p=>flybyFrameState(id,p,ephemeris,journeyData));
 let journeyState=null,frameState=null;
 const starPoints=new Float32Array(450*3);for(let i=0;i<450;i++){const a=random()*Math.PI*2,z=random()*2-1,r=Math.sqrt(1-z*z);starPoints.set([Math.cos(a)*r*35,z*35,Math.sin(a)*r*35],i*3);}
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(starPoints,3));stars.add(new T.Points(sg,new T.PointsMaterial({size:.038,color:0xc6d9e5,transparent:true,opacity:.65,sizeAttenuation:true,depthWrite:false})));
 const earthFlight=createEarthFlightScene(id,{group,earth,craft,launch,capsule,canopy,desert,heat,entryWake});
 let labels=[],currentKind;
 function addLabel(text,point){labels.push({text,point:point.clone()});}
 function update(kind,p,stageId,context='detail',focus='both',reference='earth',cutaway=false){
  currentKind=kind;labels=[];proximityState=null;journeyState=null;frameState=null;flybySunRoute.visible=flybySunTrail.visible=flybyEarthRoute.visible=false;locators.visible=false;Object.values(proximityRoutes).forEach(r=>r.visible=false);Object.values(proximityTrails).forEach(r=>r.visible=false);stars.scale.setScalar(1);earthFlight.hide();
  for(const o of [craft.group,body,earth,sun,launch.group,capsule,chute,ground,desert,route,impactor,projectile,particles,heat]){o.visible=false;o.rotation.set(0,0,0);o.position.set(0,0,0);o.scale.setScalar(1);}
  earth.rotation.set(.12,2,.15);earth.children[0].material.opacity=1;earth.children[1].material.opacity=.85;earth.children[2].material.uniforms.opacity.value=.55;
  craft.capsule.visible=true;craft.setSampling(false);craft.setSolarDeployment(1);craft.setHornDeployment?.(1);craft.setSamplingCutaway?.(false);
  if(id==='osiris-rex'&&(['depart','return','landing'].includes(kind)))craft.setStowage(1);
  stars.visible=kind!=='landing';
  terrain.update(kind,p,stageId);
  if(hasEarthContext(kind)){
   labels=earthFlight.update(kind,p,context);const flight=earthFlight.state();stars.visible=flight.altitudeKm>40;stars.scale.setScalar(Math.max(1000,new T.Vector3(...flight.positionKm).length()/10));
  }else if(kind==='cruise'||kind==='outbound'){
   const transfer=transferState(p,id,journeyData,kind);journeyState=transfer;
   sun.visible=earth.visible=body.visible=route.visible=craft.group.visible=true;sun.scale.setScalar(.24);earth.scale.setScalar(.075);earth.position.set(...transfer.earth);body.scale.setScalar(.07);body.position.set(...transfer.asteroid);
   craft.group.position.set(...transfer.craft);craft.group.scale.setScalar(.035);
   Object.entries(solarRoutes).forEach(([name,r])=>r.group.visible=name===kind);solarRoutes[kind].trail.geometry.setDrawRange(0,Math.max(1,transfer.travelledCount));
   addLabel('Earth',earth.position);addLabel(sizes.target,body.position);addLabel(id==='hayabusa2'?'Hayabusa2':'OSIRIS-REx',craft.group.position);
  }else if(isProximity(kind)){
   const view=proximityViews[kind],sample=sampleTrack(view.track,p),position=new T.Vector3(...sample.position).applyQuaternion(view.rotation),velocity=new T.Vector3(...sample.velocity).applyQuaternion(view.rotation);
   const target=kind==='flyby'?'Earth':sizes.target,diameterM=kind==='flyby'?12742000:sizes.diameterM;
   let targetPosition=new T.Vector3(),extent=view.extent,center=view.center;
   if(kind==='flyby'){frameState={...flybyFrameState(id,p,ephemeris,journeyData),endpoints:flybyEnds.map(f=>({time:f.time,speedEarthKmS:f.speedEarthKmS,speedSunKmS:f.speedSunKmS}))};if(reference==='sun'){position.set(...frameState.heliocentricOffsetKm).applyQuaternion(view.rotation);velocity.set(...frameState.heliocentricVelocityKmS).applyQuaternion(view.rotation);targetPosition.set(...frameState.earthOffsetKm).applyQuaternion(view.rotation);extent=sunFrameBox.getSize(new T.Vector3()).length();center=sunFrameBox.getCenter(new T.Vector3()).toArray();}}
   body.visible=kind!=='flyby';earth.visible=kind==='flyby';if(earth.visible){earth.scale.setScalar(6371);earth.quaternion.copy(earthInertialOrientation(sample.time,view.rotation));}craft.group.visible=true;body.scale.setScalar(bodyPhysicalScale);craft.group.scale.setScalar(craftPhysicalScale);craft.group.position.copy(position);earth.position.copy(targetPosition);craft.group.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),targetPosition.clone().sub(position).normalize());
   const route=proximityRoutes[kind],travelled=proximityTrails[kind];route.visible=travelled.visible=focus==='both'&&reference!=='sun';locators.visible=focus==='both';if(kind==='flyby'&&reference==='sun'){flybySunRoute.visible=flybySunTrail.visible=flybyEarthRoute.visible=focus==='both';flybySunTrail.geometry.setDrawRange(0,Math.max(1,Math.floor(p*(view.track.samples.length-1))+1));}travelled.geometry.setDrawRange(0,Math.max(1,Math.floor(p*(view.track.samples.length-1))+1));stars.scale.setScalar(Math.max(1,view.extent/10));
   locatorGeometry.attributes.position.setXYZ(0,...targetPosition.toArray());locatorGeometry.attributes.position.setXYZ(1,position.x,position.y,position.z);locatorGeometry.attributes.position.needsUpdate=true;locatorGeometry.computeBoundingSphere();
   proximityState={position:position.toArray(),velocity:velocity.toArray(),rangeKm:Math.hypot(...sample.position),rangeRateKmS:sample.position.reduce((sum,x,i)=>sum+x*sample.velocity[i],0)/Math.hypot(...sample.position),targetPosition:targetPosition.toArray(),extent,center,diameterKm:diameterM/1000,spanKm:sizes.spanM/1000,kind,time:sample.time,rangeHistory:view.track.samples.map(s=>Math.hypot(...s.position)),source:view.track.source,sourceLabel:view.track.sourceLabel,dataKind:view.track.dataKind,target};
   addLabel(target+(kind==='flyby'?' · 12,742 km':' · ~'+diameterM+' m'),targetPosition);
   addLabel((id==='hayabusa2'?'Hayabusa2':'OSIRIS-REx')+' · '+sizes.spanM+' m span',position);
  }else if(kind==='sample'){
   ground.visible=craft.group.visible=true;craft.setSampling(true);craft.setSamplingCutaway?.(cutaway);
   const scale=.9,tip=craft.samplerTip;craft.group.scale.setScalar(scale);craft.group.position.set(-tip.x*scale,samplingClearance(p,id)-tip.y*scale,-tip.z*scale);
   const contact=p>=.46&&p<=.57;
   addLabel(contact?(id==='hayabusa2'?'Sampler horn contact':'TAGSAM contact'):'Sampling target',new T.Vector3(0,.2,0));
   addLabel(id==='hayabusa2'?'Hayabusa2':'OSIRIS-REx',craft.group.position);
   const sampling=samplingState(p,id);projectile.visible=sampling.projectileVisible;projectile.position.set(0,sampling.projectileY,0);
   const burst=sampling.ejecta,surface=samplingClearance(id==='hayabusa2'?.51:.49,id);particles.visible=burst>0&&p<.92;
   for(let i=0;i<seeds.length;i++){
    const s=seeds[i],r=burst*s.v;
    if(i<24){const grain=collectedGrain(p,id,s,i),size=grain.visible?Math.min(s.s,.012):0;dummy.position.set(...grain.position);dummy.scale.set(size,size*.65,size*.8);}
    else{dummy.position.set(Math.cos(s.a)*r,surface+Math.max(.02,burst*s.h-burst*burst*.38),Math.sin(s.a)*r);dummy.scale.set(s.s,s.s*.48,s.s*.73);}
    dummy.rotation.set(i,p+i,i*.2);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);
   }
   particles.instanceMatrix.needsUpdate=true;
  }else if(kind==='impact'){
   ground.visible=true;
   const impact=sciFlight(p),origin=terrain.markers.sciImpact;impactor.visible=impact.visible;impactor.position.copy(origin).add(new T.Vector3(0,impact.height+impactor.userData.contactOffset,0));
   const burst=Math.max(0,(p-.4)*7);particles.visible=p>.4;
   for(let i=0;i<seeds.length;i++){
    const s=seeds[i],northward=i<28,a=northward?-Math.PI/2+(s.a/Math.PI/2-.5)*.8:s.a;
    // Ejecta follow ballistic arcs; the northern fan reaches the off-crater site.
    const t=Math.max(0,(p-.4)/.6),distance=northward?14+(i%7)*.65:3+s.v*3,flight=Math.min(1,t/(northward?.82:.65));
    const endX=origin.x+Math.cos(a)*distance,endZ=origin.z+Math.sin(a)*distance,groundY=terrain.heightAt(endX,endZ);dummy.position.set(mix(origin.x,endX,flight),mix(origin.y,groundY,flight)+.02+(northward?6:3)*4*flight*(1-flight),mix(origin.z,endZ,flight));dummy.scale.set(s.s*1.5,s.s*.65,s.s*.9);dummy.rotation.set(i,burst+i,i*.2);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);
   }particles.instanceMatrix.needsUpdate=true;
   addLabel(p<.4?'SCI copper projectile · 13 cm':'SCI crater · ejecta source',p<.4?impactor.position:origin);addLabel('Second touchdown · 20 m north',terrain.markers.samplingTarget);
  }else if(kind==='stow'){
   craft.group.visible=true;craft.setStowage(p);craft.group.rotation.y=-.2+p*.25;craft.group.updateMatrix();
   craft.group.updateMatrixWorld(true);
   const anchor=p>=.16&&p<.64?(craft.samplingHead||craft.group.getObjectByName('tagsam-collector-head')):p>=.64&&p<.82?craft.group.getObjectByName('tagsam-wrist'):craft.capsule;
   const point=anchor===craft.capsule?new T.Vector3(0,.365,0).applyMatrix4(craft.group.matrix):anchor.getWorldPosition(new T.Vector3());
   addLabel(phaseLabel('stow',p,id),point);
  }
  group.updateMatrixWorld(true);
 }
 // Custom 3D effects must write the same logarithmic depth as the physical meshes.
 const depthMaterials=new Set();group.traverse(o=>{for(const m of [o.material].flat())if(m?.isShaderMaterial)depthMaterials.add(m);});
 for(const m of depthMaterials){
  m.vertexShader='#include <common>\n#include <logdepthbuf_pars_vertex>\n'+m.vertexShader.trim().replace(/}$/, '\n#include <logdepthbuf_vertex>\n}');
  m.fragmentShader='#include <logdepthbuf_pars_fragment>\n'+m.fragmentShader.replace(/void main\(\)\s*{/, 'void main(){\n#include <logdepthbuf_fragment>\n');
 }
 update('launch',0,'launch');
 return {group,update,labels:()=>labels,kind:()=>currentKind,proximity:()=>proximityState,journey:()=>journeyState,flyby:()=>frameState,earth:()=>earthFlight.state(),contextHelpers(visible){if(earthFlight.state())earthFlight.helpers(visible);if(proximityState){proximityRoutes[currentKind].visible=proximityTrails[currentKind].visible=locators.visible=visible;}}};
}
