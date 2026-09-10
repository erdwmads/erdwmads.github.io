import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createMissionScene,disposeGraph} from './scenes.js';
import {missions} from './data.js';
import {durations,clampProgress} from './motion.js';
import {missionShot,cameraDamping} from './camera.js';
import {hasEarthContext} from './locations.js';
import {earthFlightShot} from './earth-scene.js';
import {createPresentation} from './presentation.js';
import {isProximity,proximityShot} from './proximity.js';
import {placeLabel} from './label-layout.js';

export function createViewer(host,{signal,onTick,onReady,onError}){
 const lifetime=new AbortController(),combined=AbortSignal.any([signal,lifetime.signal]);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,logarithmicDepthBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.prepend(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#050d15');
 const studio=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.07);studio.dispose();pmrem.dispose();
 scene.environment=environment.texture;scene.environmentIntensity=.28;
 scene.add(new T.HemisphereLight(0xbfd6e5,0x40332a,.45));
 const key=new T.DirectionalLight(0xffefcf,2.1);key.position.set(5,10,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;key.shadow.normalBias=.04;scene.add(key,key.target);
 const rim=new T.DirectionalLight(0x87c4ef,.85);rim.position.set(-6,4,-5);scene.add(rim);
 const camera=new T.PerspectiveCamera(38,1,.05,150),controls=new OrbitControls(camera,renderer.domElement);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 controls.enableDamping=!reduced.matches;controls.dampingFactor=.12;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=32;controls.maxPolarAngle=Math.PI*.86;
 const presentation=createPresentation(renderer,scene,camera);renderer.info.autoReset=false;
 const coarse=matchMedia('(pointer:coarse)');controls.enabled=!coarse.matches;
 let alive=true,visible=true,frame=0,last=0,playing=false,world,mission='hayabusa2',stage=0,progress=0,context='earth',focus='both',version=0,autoCamera=true,contextLost=false,frames=0;
 const insetCamera=new T.PerspectiveCamera(40,1,.1,1000000),inset=host.querySelector('[data-mission-inset]'),legend=host.querySelector('[data-mission-legend]');
 const cache=new Map(),labelLayer=host.querySelector('[data-mission-labels]'),labelElements=Array.from({length:3},()=>{const s=document.createElement('span');labelLayer.append(s);return s;});
 const leaderElements=labelElements.map(()=>{const line=document.createElement('i');line.className='mission-leader';labelLayer.prepend(line);return line;});
 let width=0,height=0;
 const resize=()=>{const r=host.getBoundingClientRect();if(!r.width||!r.height||width===r.width&&height===r.height)return;width=r.width;height=r.height;renderer.setSize(width,height,false);presentation.resize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();request();};
 const observer=new ResizeObserver(resize);observer.observe(host);
 function request(){if(alive&&visible&&!document.hidden&&!contextLost&&!frame)frame=requestAnimationFrame(draw);}
 function positionCamera(immediate=false,seconds=1/60){
  if(!world)return false;
  const kind=missions[mission].stages[stage].kind,shot=isProximity(kind)?proximityShot(world.proximity(),focus,camera.aspect):hasEarthContext(kind)?earthFlightShot(world.earth(),context,camera.aspect):missionShot(kind,progress,mission,camera.aspect),desired=new T.Vector3(...shot.position),aim=new T.Vector3(...shot.target);
  camera.near=shot.near??.05;camera.far=shot.far??150;controls.minDistance=shot.minDistance??3;controls.maxDistance=shot.maxDistance??32;
  const alpha=immediate||reduced.matches?1:cameraDamping(seconds);
  camera.fov+=(shot.fov-camera.fov)*alpha;if(Math.abs(camera.fov-shot.fov)<.001)camera.fov=shot.fov;camera.updateProjectionMatrix();
  camera.position.lerp(desired,alpha);controls.target.lerp(aim,alpha);
  if(camera.position.distanceToSquared(desired)<.000001)camera.position.copy(desired);if(controls.target.distanceToSquared(aim)<.000001)controls.target.copy(aim);camera.lookAt(controls.target);
  return !camera.position.equals(desired)||!controls.target.equals(aim)||camera.fov!==shot.fov;
 }
 function setScene(){
  if(!world)return;
  const s=missions[mission].stages[stage],previous=focus==='spacecraft'&&isProximity(s.kind)?world.proximity()?.position:context==='detail'&&hasEarthContext(s.kind)?world.earth()?.cameraTarget:null;world.update(s.kind,progress,s.id,context,focus);
  // Keep the camera in the vehicle's translating frame, including after manual orbit.
  if(previous){const delta=new T.Vector3(...(isProximity(s.kind)?world.proximity().position:world.earth().cameraTarget)).sub(new T.Vector3(...previous));camera.position.add(delta);controls.target.add(delta);}
  presentation.glow(context!=='earth'&&(['launch','cruise','return'].includes(s.kind)||s.kind==='landing'&&progress<.48));
  scene.background.set('#050d15');
  if(context!=='earth'&&s.kind==='landing')scene.background.lerp(new T.Color(mission==='hayabusa2'?'#09151d':'#728791'),T.MathUtils.smoothstep(progress,.30,.54));
  const f=world.earth();key.castShadow=!isProximity(s.kind)&&context==='detail';
  if(f&&context==='detail'){
   const target=new T.Vector3(...f.cameraTarget),size=f.displaySpanKm;key.position.copy(target).add(new T.Vector3(4,8,5).multiplyScalar(size));key.target.position.copy(target);key.target.updateMatrixWorld();
   key.shadow.camera.left=key.shadow.camera.bottom=-size*3;key.shadow.camera.right=key.shadow.camera.top=size*3;key.shadow.camera.near=size*.02;key.shadow.camera.far=size*30;key.shadow.normalBias=size*.002;key.shadow.camera.updateProjectionMatrix();
   if(f.altitudeKm<30){scene.background.set(s.kind==='launch'?'#789db5':'#8fa8b5');scene.fog=new T.FogExp2(scene.background,Math.max(0,1-f.altitudeKm/30)*.05);}else scene.fog=null;
  }else{key.position.set(5,10,7);key.target.position.set(0,0,0);key.target.updateMatrixWorld();key.shadow.camera.left=key.shadow.camera.bottom=-12;key.shadow.camera.right=key.shadow.camera.top=12;key.shadow.camera.near=.5;key.shadow.camera.far=500;key.shadow.normalBias=.04;key.shadow.camera.updateProjectionMatrix();scene.fog=null;}
  controls.maxPolarAngle=Math.PI*(context==='detail'&&['sample','impact','landing'].includes(s.kind)?.495:.94);
 }
 function setStage(index,p=0,transition=true){
  if(!world)return;if(transition)presentation.capture();stage=Math.max(0,Math.min(missions[mission].stages.length-1,index));progress=clampProgress(p);autoCamera=true;focus=missions[mission].stages[stage].kind==='rendezvous'?'asteroid':missions[mission].stages[stage].kind==='depart'?'spacecraft':'both';context='detail';
  setScene();positionCamera(true);controls.update();last=0;request();
 }
 function drawInset(){
  const f=world?.earth(),physical=world?.proximity(),active=!!f&&context==='detail'||!!physical&&focus!=='both';inset.hidden=!active;legend.hidden=!(physical&&focus==='both');if(!active)return;
  inset.querySelector('span').textContent=f?'Earth context':'Distance context';
  const shot=f?earthFlightShot(f,'earth',1):proximityShot(physical,'both',1);insetCamera.position.set(...shot.position);insetCamera.near=shot.near;insetCamera.far=shot.far;insetCamera.fov=shot.fov;insetCamera.lookAt(new T.Vector3(...shot.target));insetCamera.updateProjectionMatrix();insetCamera.updateMatrixWorld();
  const anchors=f?[[0,-6371,0],f.positionKm]:[[0,0,0],physical.position];
  ['target','vehicle'].forEach((name,i)=>{const label=inset.querySelector('[data-inset-'+name+']'),point=new T.Vector3(...anchors[i]).project(insetCamera);label.textContent=i===0?(f?'Earth':physical.kind==='flyby'?'Earth':missions[mission].target):'Vehicle';label.style.left=Math.max(4,Math.min((point.x*.5+.5)*inset.clientWidth-14,inset.clientWidth-40))+'px';label.style.top=Math.max(4,Math.min((-point.y*.5+.5)*inset.clientHeight+7,inset.clientHeight-34))+'px';});
  const r=inset.getBoundingClientRect(),h=host.getBoundingClientRect(),savedViewport=new T.Vector4();renderer.getViewport(savedViewport);const fog=scene.fog,background=scene.background.clone();scene.fog=null;scene.background.set('#050d15');world.contextHelpers(true);
  renderer.setScissorTest(true);renderer.setScissor(r.left-h.left,h.bottom-r.bottom,r.width,r.height);renderer.setViewport(r.left-h.left,h.bottom-r.bottom,r.width,r.height);renderer.clear();const updateShadows=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;renderer.render(scene,insetCamera);renderer.shadowMap.autoUpdate=updateShadows;renderer.setScissorTest(false);renderer.setViewport(savedViewport);scene.fog=fog;scene.background.copy(background);world.contextHelpers(false);
 }
 function draw(now){
  frame=0;if(!alive||!visible||document.hidden||contextLost)return;
  const seconds=last?Math.min(Math.max(0,now-last)/1000,.1):1/60;
  if(playing&&world){
   if(last)progress+=(Math.min(now-last,100)/1000)/(durations[missions[mission].stages[stage].kind]||14);
   if(progress>=1){if(stage<missions[mission].stages.length-1)setStage(stage+1,0);else {progress=1;playing=false;}}
   setScene();onTick({mission,stage,progress,playing});
  }
  last=now;
  const cameraMoving=autoCamera&&world?positionCamera(false,seconds):false;
  controls.dampingFactor=cameraDamping(seconds);
  controls.update();renderer.info.reset();presentation.render(now);drawInset();frames++;
  const labels=world?.labels()||[],rect=host.getBoundingClientRect(),occupied=[];
  if(!inset.hidden){const r=inset.getBoundingClientRect();occupied.push({x:r.left-rect.left,y:r.top-rect.top,width:r.width,height:r.height});}
  labels.forEach((entry,i)=>{
   if(i>=3)return;
   const point=entry.point.clone().project(camera),label=labelElements[i],leader=leaderElements[i],kind=world.kind();
   label.textContent=entry.text;const x=(point.x*.5+.5)*rect.width,y=(-point.y*.5+.5)*rect.height;
   const outside=point.z>1||point.z<-1||x<0||x>rect.width||y<0||y>rect.height;
   label.hidden=leader.hidden=outside;
   if(outside&&isProximity(kind)&&focus!=='both'){
    const direction=entry.point.clone().applyMatrix4(camera.matrixWorldInverse),horizontal=Math.abs(direction.x)>=Math.abs(direction.y),arrow=horizontal?(direction.x<0?'←':'→'):(direction.y>0?'↑':'↓');
    label.hidden=false;label.textContent=arrow+' '+entry.text.split(' · ')[0]+' · '+world.proximity().rangeKm.toLocaleString('en-US',{maximumFractionDigits:1})+' km';
    const box=placeLabel(direction.x<0?10:rect.width-label.offsetWidth-10,rect.height*.7,label.offsetWidth,label.offsetHeight,occupied,rect);occupied.push(box);label.style.left=box.x+'px';label.style.top=box.y+'px';return;
   }
   const right=x<rect.width*.6,offset=Math.min(110,rect.width*.13),lw=label.offsetWidth,lh=label.offsetHeight;
   let lx=Math.min(Math.max(10,x+(right?offset:-offset-lw)),rect.width-lw-10);
   const dy=context==='earth'&&hasEarthContext(kind)?(i===0?55:i===1?-70:-120):['cruise','outbound','flyby','rendezvous','depart'].includes(kind)?(i===0?-60:40):kind==='return'?(i===0?-65:i===1?35:100):kind==='landing'?(i===0?-55:55):kind==='stow'?80:kind==='sample'?(i===0?40:-75):-50;
   let ly=Math.min(Math.max(12,y+dy),rect.height-lh-45);
   if(!outside){const box=placeLabel(lx,ly,lw,lh,occupied,rect);lx=box.x;ly=box.y;occupied.push(box);}
   label.style.left=lx+'px';label.style.top=ly+'px';
   const endX=right?lx:lx+lw,endY=ly+lh*.5,dx=endX-x,deltaY=endY-y;
   leader.style.left=x+'px';leader.style.top=y+'px';leader.style.width=Math.hypot(dx,deltaY)+'px';leader.style.transform='rotate('+Math.atan2(deltaY,dx)+'rad)';
  });
  for(let i=labels.length;i<3;i++)labelElements[i].hidden=leaderElements[i].hidden=true;
  if(playing||presentation.transitioning||cameraMoving)request();
 }
 renderer.domElement.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)e.stopImmediatePropagation();},{capture:true,passive:true,signal:combined});
 controls.addEventListener('change',request);
 controls.addEventListener('start',()=>{autoCamera=false;});
 reduced.addEventListener('change',()=>{controls.enableDamping=!reduced.matches;last=0;request();},{signal:combined});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;playing=false;cancelAnimationFrame(frame);frame=0;onError(new Error('The 3D context was interrupted. Retry the view.'));},{signal:combined});
 async function load(id){
  const ticket=++version;playing=false;last=0;
  if(!cache.has(id))cache.set(id,createMissionScene(id,combined));
  try{
   const next=await cache.get(id);if(!alive||ticket!==version)return;
   await renderer.compileAsync(next.group,camera,scene);if(!alive||ticket!==version)return;
   if(world){presentation.capture();scene.remove(world.group);}world=next;mission=id;scene.add(world.group);setStage(0,0,false);resize();onReady();
  }catch(error){cache.delete(id);if(alive&&ticket===version)onError(error);}
 }
 resize();
 return {load,select:setStage,
  progress(p){progress=clampProgress(p);playing=false;last=0;setScene();request();},
  play(value){playing=Boolean(value)&&!!world;if(playing&&stage===missions[mission].stages.length-1&&progress>=1)setStage(0,0);last=0;request();},
  visible(value){visible=value;last=0;if(!value){cancelAnimationFrame(frame);frame=0;}else request();},
  touch(value){controls.enabled=!coarse.matches||value;renderer.domElement.style.touchAction=value?'none':'pan-y';},
  action(action){if(['both','asteroid','spacecraft'].includes(action)){if(!isProximity(missions[mission].stages[stage].kind)||focus===action)return;presentation.capture();focus=action;autoCamera=true;setScene();positionCamera(true);controls.update();request();onTick({mission,stage,progress,playing});return;}if(action==='earth'||action==='detail'){if(!hasEarthContext(missions[mission].stages[stage].kind)||context===action)return;presentation.capture();context=action;autoCamera=true;setScene();positionCamera(true);controls.update();request();onTick({mission,stage,progress,playing});return;}if(action==='reset'){autoCamera=true;positionCamera(true);}else{autoCamera=false;const factor=action==='zoom-in'?.8:1.25;const delta=camera.position.clone().sub(controls.target);delta.setLength(T.MathUtils.clamp(delta.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(delta);}controls.update();request();},
  get state(){return {mission,stage,progress,playing,context,focus,proximity:world?.proximity(),earth:world?.earth(),ready:!!world,visible,frames,transitioning:presentation.transitioning,camera:{position:camera.position.toArray(),target:controls.target.toArray(),automatic:autoCamera},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
  dispose(){if(!alive)return;alive=false;lifetime.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();presentation.dispose();cache.forEach(p=>p.then(w=>disposeGraph(w.group)).catch(()=>{}));cache.clear();environment.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();labelLayer.replaceChildren();}
 };
}
