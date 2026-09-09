import {createIcons, BookOpen, ZoomIn, ZoomOut, RotateCcw, Pause, Play, X} from 'lucide';
const lucide={createIcons:()=>createIcons({icons:{BookOpen,ZoomIn,ZoomOut,RotateCcw,Pause,Play,X}})};
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {nebula,accretion,alteration,inheritance} from './scenes.js';

const $=s=>document.querySelector(s),canvas=$('#scene'),viewport=$('#viewport');
document.querySelectorAll('button,input').forEach(control=>control.disabled=true);
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.info.autoReset=false;
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x080d10);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.localClippingEnabled=true;
const world=new T.Scene();world.background=new T.Color(0x080d10);
const camera=new T.PerspectiveCamera(42,1,.04,100);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=45;controls.maxPolarAngle=Math.PI*.88;
world.add(new T.HemisphereLight(0x9eb3bf,0x282623,.6));
const key=new T.DirectionalLight(0xffe9cf,2.7);key.position.set(3,5,6);world.add(key);
const rim=new T.DirectionalLight(0x9abfcd,2.1);rim.position.set(-4,2,-3);world.add(rim);
const fill=new T.DirectionalLight(0xbcc3d1,.3);fill.position.set(-3,-1,5);world.add(fill);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(world,camera));
const ao=new SSAOPass(world,camera,1,1);ao.kernelRadius=9;ao.minDistance=.001;ao.maxDistance=.12;composer.addPass(ao);composer.addPass(new OutputPass());
const descriptions=[
  {eyebrow:'01 / THE SOLAR NEBULA',title:'Before the planets',description:'A young Sun, surrounded by a rotating disk of gas and dust. Cold, shielded regions can preserve the ice carried into primitive parent bodies.',scale:'EXTERNAL DISK VIEW / NOT TO SCALE',environment:'A plausible disk, not a reconstruction of the Sun\'s exact birth environment.',legend:[['#bc9060','Scattered-light illustration'],['#7cafba','Cold-region context']]},
  {eyebrow:'02 / PARENT-BODY FORMATION',title:'Built by encounters',description:'Independent ice-bearing bodies meet. Some material is retained; some escapes. Repeated retention and restructuring can build an irregular, porous parent body.',scale:'LOCAL MIDPLANE / ILLUSTRATIVE LIGHTING',environment:'The modeled formation region is dark and shielded. This lighting reveals otherwise obscured material.',legend:[['#b9a079','Rock & organics'],['#7bcedb','Water ice']]},
  {eyebrow:'03 / AN INTERIOR TRANSFORMED',title:'Water changes the record',description:'Internal radioactive heating melts embedded ice. Water reacts with the rock; secondary minerals form. Cooling leaves a changed mineral assemblage.',scale:'INTERIOR TEXTURE / MAGNIFIED SCHEMATIC',environment:'An illustrative pore-scale cutout. Shapes and proportions are not sample measurements; the outer parent remains cooler.',legend:[['#85cfe2','Ice'],['#368fae','Pore water'],['#5e936f','Reacted matrix'],['#d3c9ac','Carbonates']]},
  {eyebrow:'04 / BREAKUP & INHERITANCE',title:'A smaller world survives',description:'After cooling, a later impact disrupts the parent. Less-heated fragments away from the impact preserve their mineral record and can reaccumulate.',scale:'LATE DISRUPTION / TIME COMPRESSED',environment:'Nakamura et al. propose reaccretion of remote material into Ryugu. The exact fragments and trajectories are unknown.',legend:[['#8daeb6','Parent-body material'],['#baab8f','Impactor and ejecta']]}
];
let stage=0,progress=.08,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,phase=false,last=performance.now(),hold=0,dirty=true;
controls.addEventListener('change',()=>dirty=true);
const scenes=[];
lucide.createIcons();
function icon(button,name){button.innerHTML=`<i data-lucide="${name}"></i>`;lucide.createIcons();}
function resetCamera(){
  const active=scenes[stage],aspect=viewport.clientWidth/viewport.clientHeight;
  camera.position.fromArray(active.camera).multiplyScalar(Math.max(1,.98/aspect));controls.target.fromArray(active.target);controls.update();
}
function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;
  camera.setViewOffset(w,h,w>760?-w*.10:0,0,w,h);camera.updateProjectionMatrix();resetCamera();
}
function showStage(index,initial=.05){
  stage=index;progress=initial;hold=0;scenes.forEach((s,i)=>s.group.visible=i===index);
  const data=descriptions[index];for(const key of['eyebrow','title','description','scale','environment'])$('#'+key).textContent=data[key];
  document.querySelectorAll('[data-stage]').forEach(b=>{if(Number(b.dataset.stage)===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  $('#legend').innerHTML=data.legend.map(([color,label])=>`<span><i style="--swatch:${color}"></i>${label}</span>`).join('');
  ao.enabled=index!==0 && viewport.clientWidth>760;resetCamera();sync();
}
function sync(){
  dirty=true;
  $('#progress').value=progress;$('#progress-value').textContent=Math.round(progress*100)+'%';$('#moment').textContent=scenes[stage].moment(progress);
  scenes[stage].update(progress,phase);
}
function setPlaying(value){playing=value;$('#play').setAttribute('aria-label',value?'Pause':'Play');$('#play').title=value?'Pause':'Play';icon($('#play'),value?'pause':'play');last=performance.now();}
function setPhase(value){phase=value;$('#phase-mode').setAttribute('aria-pressed',value);$('#material-mode').setAttribute('aria-pressed',!value);$('#legend').hidden=!value;sync();}
$('#play').addEventListener('click',()=>{if(progress>=1)progress=0;setPlaying(!playing);});
$('#progress').addEventListener('input',e=>{progress=Number(e.target.value);hold=0;setPlaying(false);sync();});
$('#reset').addEventListener('click',resetCamera);
function zoom(factor){const v=camera.position.clone().sub(controls.target);v.setLength(T.MathUtils.clamp(v.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);controls.update();}
$('#zoom-in').addEventListener('click',()=>zoom(.8));$('#zoom-out').addEventListener('click',()=>zoom(1.25));
$('#material-mode').addEventListener('click',()=>setPhase(false));$('#phase-mode').addEventListener('click',()=>setPhase(true));
document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>showStage(Number(b.dataset.stage))));
$('#evidence').addEventListener('click',()=>{$('#sources').showModal();setPlaying(false);});$('#sources .close').addEventListener('click',()=>$('#sources').close());
$('#sources').addEventListener('click',e=>{if(e.target===$('#sources')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('visibilitychange',()=>last=performance.now());
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();setPlaying(false);$('#loading').hidden=false;$('#loading').textContent='The graphics context was interrupted. Reload this study to continue.';});
// Build once. Scrubbing reuses geometry and deterministic transforms in every chapter.
try{
  for(const build of[nebula,accretion,alteration,inheritance]){await new Promise(resolve=>requestAnimationFrame(resolve));const s=build();scenes.push(s);world.add(s.group);s.group.visible=false;}
  resize();scenes.forEach(s=>s.group.visible=true);await renderer.compileAsync(world,camera);
  showStage(0,.08);setPlaying(playing);$('#loading').hidden=true;
  document.querySelectorAll('button,input').forEach(control=>control.disabled=false);
  new ResizeObserver(resize).observe(viewport);
  window.study={select:showStage,setProgress(t){progress=t;setPlaying(false);sync();},setPhase,get state(){return{stage,progress,playing,phase,camera:camera.position.toArray(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
  function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.06);last=now;if(document.hidden)return;
    if(playing){if(progress<1){progress=Math.min(1,progress+dt/[32,42,38,40][stage]);sync();}else{hold+=dt;if(hold>2)setPlaying(false);}}
    controls.update();if(dirty){renderer.info.reset();composer.render();dirty=false;}
  }requestAnimationFrame(frame);
}catch(error){console.error(error);$('#loading').textContent='This preview could not initialize its 3D scene.';}
