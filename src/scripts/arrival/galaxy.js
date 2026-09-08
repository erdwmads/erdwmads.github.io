import * as THREE from 'three';
import {createSolarJourney} from './solar.js';

const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function createGalaxy(host){
 const mobile=innerWidth<700;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:new URLSearchParams(location.search).has('inspect')});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.4:1.75));
 renderer.setClearColor(0x040910,0);host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(46,1,.08,180);
 const galaxy=new THREE.Group();galaxy.rotation.set(.98,0,-.32);scene.add(galaxy);
 const orientation=galaxy.quaternion.clone(),spin=new THREE.Quaternion(),diskAxis=new THREE.Vector3(0,0,1);
 const materials=[],geometries=[];
 const solar=createSolarJourney(host);
 let disposed=false,seed=731,distance;
 const anchorAngle=Math.PI+2.6*Math.log(5.6)-.20*Math.sin(8.5);
 const anchor=new THREE.Vector3(Math.cos(anchorAngle)*5,Math.sin(anchorAngle)*5,0);
 const anchorWorld=new THREE.Vector3(),aim=new THREE.Vector3();
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const normal=()=>Math.sqrt(-2*Math.log(Math.max(random(),.000001)))*Math.cos(random()*Math.PI*2);
 // Continuous light fills inter-arm space; correlated dust attenuates the disk.
 const diskGeometry=new THREE.PlaneGeometry(25,25);geometries.push(diskGeometry);
 const diskMaterial=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{fade:{value:0}},
  vertexShader:'varying vec2 pos;void main(){pos=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`
   varying vec2 pos;uniform float fade;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(.8,.6,-.6,.8)*p*2.1+3.7;a*=.5;}return n;}
   void main(){
    float r=length(pos),theta=atan(pos.y,pos.x);
    float irregular=fbm(pos*.7);
    float phase=theta-2.6*log(r+.6)+.20*sin(r*1.7)+.28*(irregular-.5);
    float arms=pow(.5+.5*cos(2.*phase),8.);
    float branches=pow(.5+.5*cos(2.*phase+.80),14.)*.30*smoothstep(2.,5.,r);
    float lane=pow(.5+.5*cos(2.*phase-.22),22.);
    float cutoff=1.-smoothstep(7.6,11.6,r);
    float grain=fbm(pos*8.);
    float dust=clamp(1.-lane*(.55+.35*fbm(pos*3.)),.1,1.);
    float disk=(.10+arms*.90+branches)*exp(-r*.23)*cutoff;
    disk*=dust*(.22+irregular*.8)*(.7+grain*.55);
    float core=exp(-dot(pos*vec2(.85,1.15),pos*vec2(.85,1.15))*.65);
    vec3 color=vec3(.56,.64,.69)*sqrt(disk)*1.15+vec3(.86,.81,.67)*core*.58;
    float detail=1.-smoothstep(.4,1.2,length(fwidth(pos))*90.);
    color*=mix(1.,.88+.12*noise(pos*90.),detail);
    float alpha=clamp((sqrt(disk)*1.4+core)*fade,0.,.85);
    gl_FragColor=vec4(color,alpha);
   }`
 });
 materials.push(diskMaterial);
 const diskTexture=new THREE.WebGLRenderTarget(mobile?1024:2048,mobile?1024:2048,{depthBuffer:false,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
 const diskDisplay=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{fade:{value:0},map:{value:diskTexture.texture}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv;uniform sampler2D map;uniform float fade;void main(){vec4 color=texture2D(map,vUv);gl_FragColor=vec4(color.rgb,color.a*fade);}'
 });materials.push(diskDisplay);
 const disk=new THREE.Mesh(diskGeometry,diskDisplay);disk.renderOrder=0;galaxy.add(disk);
 function stars(count,field=false){
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count);
  for(let i=0;i<count;i++){
   let x,y,z,r,bulge=false;
   if(field){x=(random()-.5)*80;y=(random()-.5)*60;z=-random()*45;r=15;}
   else{
    bulge=random()<.14;
    if(bulge){x=normal()*.78;y=normal()*.60;z=normal()*.36;r=Math.hypot(x,y);}
    else{
     // Two logarithmic arms and a low-density inter-arm population.
     r=.28+Math.pow(random(),.76)*10.5;
     const diffuse=random()<.24,arm=random()<.52?0:Math.PI;
     const angle=diffuse?random()*Math.PI*2:arm+2.6*Math.log(r+.6)-.20*Math.sin(r*1.7)+normal()*(.075+.012*r);
     const scatter=.055+r*.014;
     x=Math.cos(angle)*r+normal()*scatter;y=Math.sin(angle)*r+normal()*scatter;
     z=normal()*(.035+.025*r);
    }
   }
   positions.set([x,y,z],i*3);
   const warm=bulge||random()<.20,bright=.45+random()*.55;
   colors.set((warm?[.91,.83,.65]:[.70,.83,.95]).map(c=>c*bright),i*3);
   sizes[i]=field?.065+random()*.10:(bulge?.023:.04)+Math.pow(random(),7)*.30;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('tint',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('size',new THREE.BufferAttribute(sizes,1));geometries.push(geometry);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
   uniforms:{fade:{value:0},resolution:{value:innerHeight},speed:{value:0},opacity:{value:field?.48:.82}},
   vertexShader:`attribute vec3 tint;attribute float size;uniform float resolution;uniform float speed;varying vec3 vTint;varying float vDepth;varying float vAngle;varying float vStretch;
    void main(){vec4 p=modelViewMatrix*vec4(position,1.);vTint=tint;vDepth=-p.z;vAngle=atan(p.y,p.x);vStretch=1.+speed*1.2*(1.-smoothstep(3.,20.,vDepth));gl_PointSize=clamp(size*resolution*.38/max(.2,-p.z),.65,8.)*vStretch;gl_Position=projectionMatrix*p;}`,
   fragmentShader:`uniform float fade;uniform float opacity;varying vec3 vTint;varying float vDepth;varying float vAngle;varying float vStretch;
    void main(){vec2 q=(gl_PointCoord-.5)*2.;float c=cos(vAngle),s=sin(vAngle);q=mat2(c,-s,s,c)*q;q.y*=vStretch;float r=length(q);if(r>1.)discard;float a=exp(-r*r*7.)*(1.-smoothstep(.55,1.,r));gl_FragColor=vec4(vTint,a*opacity*fade*smoothstep(.3,2.2,vDepth));}`
  });material.userData.field=field;materials.push(material);
  const mesh=new THREE.Points(geometry,material);mesh.renderOrder=1;mesh.frustumCulled=false;(field?scene:galaxy).add(mesh);
 }
 stars(mobile?24000:56000);stars(mobile?450:1000,true);
 // The destination star and the incoming Sun share the same vanishing point.
 const anchorGeometry=new THREE.BufferGeometry().setFromPoints([anchor]);geometries.push(anchorGeometry);
 const anchorMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
  uniforms:{fade:{value:0},resolution:{value:innerHeight}},
  vertexShader:'uniform float resolution;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(.13*resolution/(.848*max(.1,-p.z)),1.,64.);gl_Position=projectionMatrix*p;}',
  fragmentShader:'uniform float fade;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(1.,.86,.58,exp(-r*r*5.)*(1.-smoothstep(.65,1.,r))*fade);}'
 });materials.push(anchorMaterial);galaxy.add(new THREE.Points(anchorGeometry,anchorMaterial));
 function resize(){
  if(disposed)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  materials.forEach(m=>{if(m.uniforms.resolution)m.uniforms.resolution.value=innerHeight*renderer.getPixelRatio();});
  distance=Math.max(29,12.7/(Math.tan(THREE.MathUtils.degToRad(23))*camera.aspect));
  solar.resize();
 }
 resize();
 function render(progress){
  if(disposed)return;
  const approach=smooth(.065,.38,progress);
  // Rotate within the tilted disk; the camera follows its moving destination star.
  galaxy.quaternion.copy(orientation).multiply(spin.setFromAxisAngle(diskAxis,progress*1.5));
  galaxy.updateMatrixWorld();anchorWorld.copy(anchor).applyMatrix4(galaxy.matrixWorld);
  aim.copy(anchorWorld).multiplyScalar(smooth(.05,.235,progress));
  camera.position.copy(aim);camera.position.z+=distance*Math.pow(1.6/distance,approach);camera.lookAt(aim);
  const fade=smooth(0,.05,progress)*(1-smooth(.23,.35,progress));
  materials.forEach(m=>{m.uniforms.fade.value=m.userData.field?Math.max(fade,.20)*(1-smooth(.90,1,progress)):fade;if(m.uniforms.speed)m.uniforms.speed.value=m.userData.field?0:smooth(.14,.24,progress)*(1-smooth(.28,.35,progress));});
  anchorMaterial.uniforms.fade.value=smooth(.12,.22,progress)*(1-smooth(.265,.31,progress));
  galaxy.visible=fade>.0001||anchorMaterial.uniforms.fade.value>.0001;
  renderer.render(scene,camera);
  solar.render(renderer,progress);
 }
 async function prepare(){
  host.style.visibility='hidden';
  await solar.prepare(renderer);if(disposed)return;
  // The dust structure is static. Bake its expensive noise once; retain the live 3D stars and camera.
  const bakeScene=new THREE.Scene(),bakeCamera=new THREE.OrthographicCamera(-12.5,12.5,12.5,-12.5,.1,10);
  bakeCamera.position.z=1;bakeScene.add(new THREE.Mesh(diskGeometry,diskMaterial));
  diskMaterial.blending=THREE.NoBlending;diskMaterial.transparent=false;diskMaterial.uniforms.fade.value=1;
  renderer.setRenderTarget(diskTexture);renderer.render(bakeScene,bakeCamera);renderer.setRenderTarget(null);
  renderer.compile(scene,camera);
  // Render real-size frames before starting the clock: compilation alone does not upload geometry or exercise every draw path.
  for(const progress of [.14,.42,.77]){
   if(disposed)return;
   render(progress);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  if(disposed)return;
  render(0);host.style.visibility='visible';
 }
 return{render,resize,ready:prepare(),canvas:renderer.domElement,dispose(){if(disposed)return;disposed=true;solar.dispose();diskTexture.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}
