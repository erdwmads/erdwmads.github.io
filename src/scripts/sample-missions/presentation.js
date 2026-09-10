import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
export function createPresentation(renderer,scene,camera){
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),composer=new EffectComposer(renderer);
 composer.renderTarget1.samples=2;composer.renderTarget2.samples=2;
 const render=new RenderPass(scene,camera),bloom=new UnrealBloomPass(new T.Vector2(1,1),.22,.6,1.25);
 const snapshots=Array.from({length:2},()=>new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false}));let snapshot=0;
 const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},previous:{value:null},dissolve:{value:0}},
 vertexShader:vertex,fragmentShader:`
 varying vec2 vUv;uniform sampler2D tDiffuse;uniform sampler2D previous;uniform float dissolve;
 void main(){
  vec3 current=texture2D(tDiffuse,vUv).rgb;
  vec3 color=current;if(dissolve>0.)color=mix(current,texture2D(previous,vUv).rgb,dissolve);
  vec2 uv=vUv*2.-1.;float vignette=1.-.16*pow(dot(uv,uv)*.5,1.4);
  gl_FragColor=vec4(color*vignette,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 grade.uniforms.previous.value=snapshots[snapshot].texture;
 composer.addPass(render);composer.addPass(bloom);composer.addPass(grade);
 const copyMaterial=new T.ShaderMaterial({uniforms:{source:{value:null},previous:{value:null},dissolve:{value:0}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D source;uniform sampler2D previous;uniform float dissolve;void main(){vec4 color=texture2D(source,vUv);if(dissolve>0.)color=mix(color,texture2D(previous,vUv),dissolve);gl_FragColor=color;}',toneMapped:false,depthTest:false,depthWrite:false});
 const copy=new FullScreenQuad(copyMaterial);
 let started=-Infinity,ready=false,capturedSinceRender=false;
 return {
  glow(value){bloom.enabled=value;},
  capture(){
   if(!ready||reduced.matches||capturedSinceRender)return;
   // Preserve the visible linear-light blend when a chapter interrupts a dissolve.
   copyMaterial.uniforms.source.value=grade.uniforms.tDiffuse.value;copyMaterial.uniforms.previous.value=snapshots[snapshot].texture;copyMaterial.uniforms.dissolve.value=grade.uniforms.dissolve.value;
   snapshot=1-snapshot;renderer.setRenderTarget(snapshots[snapshot]);copy.render(renderer);renderer.setRenderTarget(null);grade.uniforms.previous.value=snapshots[snapshot].texture;started=performance.now();capturedSinceRender=true;
  },
  render(now){const t=reduced.matches?1:Math.min(1,Math.max(0,(now-started)/650));grade.uniforms.dissolve.value=1-t*t*(3-2*t);composer.render();ready=true;capturedSinceRender=false;},
  get transitioning(){return grade.uniforms.dissolve.value>0||performance.now()-started<650;},
  resize(width,height){composer.setSize(width,height);snapshots.forEach(target=>target.setSize(Math.ceil(width*renderer.getPixelRatio()),Math.ceil(height*renderer.getPixelRatio())));started=-Infinity;grade.uniforms.dissolve.value=0;ready=false;capturedSinceRender=false;},
  dispose(){composer.dispose();render.dispose();bloom.dispose();grade.dispose();snapshots.forEach(target=>target.dispose());copy.dispose();copyMaterial.dispose();}
 };
}
