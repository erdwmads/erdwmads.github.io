import {loadSectionGeometry} from './section-asset.js';
import {descriptions} from './descriptions.js';
import {studyLocation} from './navigation.js';
import {syncOcclusionCamera} from './occlusion.js';
import {createIcons, BookOpen, ZoomIn, ZoomOut, RotateCcw, Pause, Play, X} from 'lucide';
const lucide={createIcons:()=>createIcons({icons:{BookOpen,ZoomIn,ZoomOut,RotateCcw,Pause,Play,X}})};
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {nebula,accretion,alteration,inheritance} from './scenes.js';

export function mountStudy(root,recovery){
  const abort=new AbortController();
  let disposed=false,released=false,compiling=false,frameId=0,visible=false,contextLost=false,requestFrame=()=>{},resizeObserver,intersectionObserver,api;
  const on=(target,event,listener)=>target.addEventListener(event,listener,{signal:abort.signal});
  root.dataset.renderState='loading';
  const $=s=>root.querySelector(s),viewport=$('#viewport');
  const canvas=$('#scene').cloneNode(false);$('#scene').replaceWith(canvas);
  const studyControls=root.querySelectorAll('.observatory button:not(#retry-scene),.observatory input,[data-stage]');
  studyControls.forEach(control=>control.disabled=true);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.info.autoReset=false;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x080d10);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.localClippingEnabled=true;
  const world=new T.Scene();world.background=new T.Color(0x080d10);
  const environmentScene=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.08);world.environment=environment.texture;world.environmentIntensity=.22;environmentScene.dispose();pmrem.dispose();
  const camera=new T.PerspectiveCamera(42,1,.04,100);
  canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)e.stopImmediatePropagation();},{capture:true,passive:true,signal:abort.signal});
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=45;controls.maxPolarAngle=Math.PI*.88;
  let manualCamera=false;controls.addEventListener('start',()=>manualCamera=true);
  const coarse=matchMedia('(pointer:coarse)');let exploring=false;
  function setExploring(value){exploring=value;controls.enabled=!coarse.matches||value;canvas.style.touchAction=coarse.matches&&!value?'pan-y':'none';$('#explore').textContent=value?'Done':'Explore';$('#explore').setAttribute('aria-pressed',String(value));$('#explore').setAttribute('aria-label',value?'Return to page scrolling':'Enable model rotation and pinch zoom');viewport.toggleAttribute('data-exploring',value);}
  on($('#explore'),'click',()=>setExploring(!exploring));on(coarse,'change',()=>setExploring(false));setExploring(false);
  on(canvas,'keydown',e=>{if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}else if(e.key==='Escape'){setExploring(false);$('#explore').focus();}});
  const ambient=new T.HemisphereLight(0x9eb3bf,0x282623,.6);world.add(ambient);
  const key=new T.DirectionalLight(0xfff1df,2.7);key.position.set(-3,5,4);world.add(key);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  key.castShadow=true;key.shadow.mapSize.setScalar(viewport.clientWidth>760?2048:1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.camera.near=.5;key.shadow.camera.far=30;key.shadow.normalBias=.025;key.shadow.bias=-.0001;
  const rim=new T.DirectionalLight(0x9abfcd,2.1);rim.position.set(4,2,-3);world.add(rim);
  const fill=new T.DirectionalLight(0xbcc3d1,.3);fill.position.set(-3,-1,5);world.add(fill);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(world,camera));
  const ao=new SSAOPass(world,camera,1,1);ao.kernelRadius=5;ao.minDistance=.001;ao.maxDistance=.065;composer.addPass(ao);composer.addPass(new OutputPass());

  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const chapterMotionNodes=['.chapter-heading','.chapter-description','.scene-note'].map(selector=>$(selector));
  on(reducedMotion,'change',()=>{
    if(reducedMotion.matches){
      chapterMotionNodes.forEach(node=>node.getAnimations().forEach(animation=>animation.cancel()));
      setPlaying(false);clearDissolve();
    }
  });
  function animateChapter(){
    chapterMotionNodes.forEach((node,index)=>{
      node.getAnimations().forEach(animation=>animation.cancel());
      if(!reducedMotion.matches)node.animate([{opacity:.45,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,delay:index*35,easing:'cubic-bezier(0,0,.3,1)'});
    });
  }
  let dissolveCanvas,dissolveAnimation;
  function clearDissolve(){dissolveAnimation?.cancel();dissolveCanvas?.remove();dissolveCanvas=undefined;dissolveAnimation=undefined;}
  function captureDissolve(){
    if(reducedMotion.matches||!visible)return;
    // Copy after a synchronous render; no preserved WebGL drawing buffer is needed.
    syncOcclusionCamera(ao,camera);composer.render();
    const snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.className='study-dissolve';snapshot.setAttribute('aria-hidden','true');
    const context=snapshot.getContext('2d');context.drawImage(canvas,0,0);
    if(dissolveCanvas){context.globalAlpha=Number(getComputedStyle(dissolveCanvas).opacity);context.drawImage(dissolveCanvas,0,0,snapshot.width,snapshot.height);}
    clearDissolve();dissolveCanvas=snapshot;viewport.append(snapshot);
  }
  function startDissolve(){
    if(!dissolveCanvas)return;
    syncOcclusionCamera(ao,camera);composer.render();
    const snapshot=dissolveCanvas,animation=snapshot.animate([{opacity:1},{opacity:0}],{duration:460,easing:'cubic-bezier(.25,0,.3,1)',fill:'forwards'});dissolveAnimation=animation;
    animation.finished.then(()=>{if(dissolveCanvas===snapshot)clearDissolve();}).catch(()=>{});
  }
  let stage=0,progress=.08,playing=!reducedMotion.matches,phase=false,last=performance.now(),hold=0,dirty=true;
  controls.addEventListener('change',()=>dirty=true);
  const scenes=[];
  lucide.createIcons();
  function icon(button,name){button.innerHTML=`<i data-lucide="${name}"></i>`;lucide.createIcons();}
  function resetCamera(){
    const active=scenes[stage],aspect=viewport.clientWidth/viewport.clientHeight;
    const pose=active.cameraAt?.(progress);camera.position.fromArray(pose?.position||active.camera).multiplyScalar(Math.max(1,.98/aspect));controls.target.fromArray(pose?.target||active.target);controls.update();
  }
  function resize(){
    const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;
    camera.clearViewOffset();camera.updateProjectionMatrix();resetCamera();
  }
  function showStage(index,initial=.05){
    const changing=index!==stage;
    if(changing)captureDissolve();
    setExploring(false);manualCamera=false;stage=index;progress=initial;hold=0;scenes.forEach((s,i)=>s.group.visible=i===index);
    const data=descriptions[index];for(const key of['eyebrow','title','description','scale','environment'])$('#'+key).textContent=data[key];
    root.querySelectorAll('[data-stage]').forEach(b=>{if(Number(b.dataset.stage)===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    $('#scene-counter').textContent=String(index+1).padStart(2,'0')+' / 04';
    if(changing)animateChapter();
    $('#legend').innerHTML=data.legend.map(([color,label])=>`<span><i style="--swatch:${color}"></i>${label}</span>`).join('');
    ao.enabled=index!==0 && viewport.clientWidth>760;key.intensity=index===0?2.7:3.2;rim.intensity=index===0?2.1:1.4;fill.intensity=index===0?.3:.5;ambient.intensity=index===0?.6:.55;world.environmentIntensity=index===0?.22:.24;resetCamera();sync();if(changing)startDissolve();
  }
  function sync(){
    dirty=true;
    root.style.setProperty('--chapter-progress',progress);
    $('#progress').value=progress;$('#progress').setAttribute('aria-valuetext',Math.round(progress*100)+'% · '+scenes[stage].moment(progress));$('#progress-value').textContent=Math.round(progress*100)+'%';$('#moment').textContent=scenes[stage].moment(progress);
    scenes[stage].update(progress,phase);if(scenes[stage].cameraAt&&!manualCamera)resetCamera();
  }
  function setPlaying(value){playing=value;$('#play').setAttribute('aria-label',value?'Pause':'Play');$('#play').title=value?'Pause':'Play';$('#play').setAttribute('aria-pressed',String(value));icon($('#play'),value?'pause':'play');last=performance.now();}
  function setPhase(value){phase=value;$('#phase-mode').setAttribute('aria-pressed',value);$('#material-mode').setAttribute('aria-pressed',!value);$('#legend').hidden=!value;$('#material-note').hidden=value;sync();}
  on($('#play'),'click',()=>{if(progress>=1)progress=0;setPlaying(!playing);});
  on($('#progress'),'input',e=>{progress=Number(e.target.value);hold=0;setPlaying(false);sync();});
  on($('#reset'),'click',()=>{manualCamera=false;resetCamera();});
  function zoom(factor){manualCamera=true;const v=camera.position.clone().sub(controls.target);v.setLength(T.MathUtils.clamp(v.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);controls.update();}
  on($('#zoom-in'),'click',()=>zoom(.8));on($('#zoom-out'),'click',()=>zoom(1.25));
  on($('#material-mode'),'click',()=>setPhase(false));on($('#phase-mode'),'click',()=>setPhase(true));
  root.querySelectorAll('[data-stage]').forEach(b=>on(b,'click',()=>showStage(Number(b.dataset.stage))));
  on(document,'visibilitychange',()=>{last=performance.now();if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else requestFrame();});
  on(canvas,'webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frameId);frameId=0;setPlaying(false);root.dataset.renderState='error';$('#loading').hidden=false;$('#loading').textContent='The graphics context was interrupted. Retry the scene to continue.';$('#retry-scene').hidden=false;});
  // Build once per visit; a superseded visit stops between chapters.
  async function initialize(){
  try{
    for(const build of[nebula,accretion,alteration,inheritance]){await new Promise(resolve=>requestAnimationFrame(resolve));if(disposed)return;const geometry=build===alteration?await loadSectionGeometry():undefined;if(disposed){geometry?.dispose();return;}const s=build(geometry);s.group.traverse(node=>{if(node.isMesh&&node.material?.isMeshStandardMaterial&&!node.material.transparent){node.castShadow=node.material.side!==T.BackSide;node.receiveShadow=node.material.side!==T.BackSide;}});scenes.push(s);world.add(s.group);s.group.visible=false;}
    resize();scenes.forEach(s=>s.group.visible=true);compiling=true;try{await renderer.compileAsync(world,camera);}finally{compiling=false;if(disposed)releaseResources();}if(disposed)return;
    const initial=recovery||studyLocation(location.hash);showStage(initial.stage,initial.progress);setPhase(initial.phase||false);setPlaying(initial.paused?false:playing);$('#loading').hidden=true;
    studyControls.forEach(control=>control.disabled=false);
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(viewport);
    intersectionObserver=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);root.dataset.inView=String(visible);last=performance.now();if(visible){dirty=true;requestFrame();}else{cancelAnimationFrame(frameId);frameId=0;}});intersectionObserver.observe(viewport);
    api={select:showStage,setProgress(t){progress=t;setPlaying(false);sync();},setPhase,get state(){return{stage,progress,playing,phase,camera:camera.position.toArray(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
    window.study=api;root.dataset.renderState="ready";
    function frame(now){frameId=0;if(disposed||!visible||document.hidden||contextLost)return;frameId=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.06);last=now;if(document.hidden)return;
      if(playing){if(progress<1){progress=Math.min(1,progress+dt/[32,42,38,40][stage]);sync();}else{hold+=dt;if(hold>2)setPlaying(false);}}
      controls.update();if(dirty){renderer.info.reset();syncOcclusionCamera(ao,camera);composer.render();dirty=false;}
    }requestFrame=()=>{if(!frameId&&!disposed&&visible&&!document.hidden&&!contextLost)frameId=requestAnimationFrame(frame);};requestFrame();
  }catch(error){if(!disposed){console.error(error);root.dataset.renderState='error';$('#loading').textContent='This study could not initialize its 3D scene. The scientific context remains available.';$('#retry-scene').hidden=false;dispose();}}
  }

  function releaseResources(){
    if(released)return;released=true;
    const geometries=new Set(),materials=new Set(),textures=new Set();
    world.traverse(node=>{
      if(node.geometry)geometries.add(node.geometry);
      if(node.material)(Array.isArray(node.material)?node.material:[node.material]).forEach(material=>materials.add(material));
      if(node.isInstancedMesh)node.dispose();
    });
    scenes.forEach(scene=>scene.materials?.forEach(material=>materials.add(material)));
    materials.forEach(material=>{
      Object.values(material).forEach(value=>{if(value?.isTexture)textures.add(value);});
      Object.values(material.uniforms||{}).forEach(uniform=>{if(uniform.value?.isTexture)textures.add(uniform.value);});
      material.dispose();
    });
    geometries.forEach(geometry=>geometry.dispose());textures.forEach(texture=>texture.dispose());
    composer.passes.forEach(pass=>pass.dispose?.());composer.dispose();environment.dispose();key.shadow.dispose();
    world.clear();renderer.dispose();renderer.forceContextLoss();
  }
  function dispose(){
    if(disposed)return;disposed=true;
    abort.abort();clearDissolve();cancelAnimationFrame(frameId);resizeObserver?.disconnect();intersectionObserver?.disconnect();
    chapterMotionNodes.forEach(node=>node.getAnimations().forEach(animation=>animation.cancel()));controls.dispose();
    if(window.study===api)delete window.study;
    if(!compiling)releaseResources();
  }
  initialize();
  return dispose;

}
