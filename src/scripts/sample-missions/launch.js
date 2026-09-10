import * as T from 'three';

const ease=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const mesh=(g,m,parent,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
const lathe=(points,segments=64,start=0,length=Math.PI*2)=>new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),segments,start,length);
function cylinder(parent,material,radius,bottom,top){return mesh(new T.CylinderGeometry(radius,radius,top-bottom,64),material,parent,0,(bottom+top)/2);}
function ring(parent,material,radius,y,width=.014){return cylinder(parent,material,radius,y-width/2,y+width/2);}
function tube(parent,material,points,radius=.009){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,radius,7,false),material,parent);}
function bolts(parent,material,radius,y,count=24){
 const o=new T.InstancedMesh(new T.SphereGeometry(.006,6,4),material,count),dummy=new T.Object3D();
 for(let i=0;i<count;i++){const a=i/count*Math.PI*2;dummy.position.set(Math.sin(a)*radius,y,Math.cos(a)*radius);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);}
 parent.add(o);
}
function tankMaterial(color){
 const material=new T.MeshStandardMaterial({color,metalness:.22,roughness:.71});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 tankPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\ntankPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 tankPosition;').replace('#include <color_fragment>',`#include <color_fragment>
   float grain=fract(sin(dot(floor(tankPosition*2400.),vec3(12.9898,78.233,38.91)))*43758.5453);
   float rib=.5+.5*sin(atan(tankPosition.x,tankPosition.z)*190.);
   diffuseColor.rgb*=.94+.055*grain+.025*rib;
  `);
 };
 material.customProgramCacheKey=()=> 'launch-insulation-v1';return material;
}
function engine(parent,materials,y,radius=.115,length=.28,x=0){
 const bell=new T.Group();bell.position.set(x,y,0);parent.add(bell);
 mesh(lathe([[radius,0],[radius*.97,.025],[radius*.76,length*.3],[radius*.47,length*.7],[radius*.35,length]]),materials.engine,bell);
 mesh(lathe([[radius*.94,.007],[radius*.86,.045],[radius*.58,length*.45],[radius*.29,length*.92]]),materials.soot,bell);
 ring(bell,materials.metal,radius*1.015,.012,.013);
 for(let i=1;i<7;i++){const h=i/7*length,r=radius*(1-.66*Math.pow(i/7,.78));ring(bell,materials.engine,r,h,.006);}
 cylinder(bell,materials.soot,radius*.29,length*.88,length*.97);
 return bell;
}
// Crossed emissive sheets have no opaque outline; noise breaks the exhaust into filaments.
function exhaust(parent,{y,x=0,radius=.16,length=2.4,solid=false}){
 const group=new T.Group();group.position.set(x,y,0);parent.add(group);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  uniforms:{phase:{value:0},power:{value:1},solid:{value:solid?1:0}},
  vertexShader:'varying vec2 flameUv; void main(){flameUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 flameUv;uniform float phase;uniform float power;uniform float solid;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){
    float t=clamp(1.-flameUv.y,0.,1.),x=(flameUv.x-.5)*2.;
    float flow=phase*10.;
    float n=noise(vec2(x*9.+t*3.,t*17.-flow));
    float fine=noise(vec2(x*25.,t*45.-flow*2.));
    float bend=(noise(vec2(t*6.,flow*.25))-.5)*t*.16;
    float width=(.19+.36*sin(t*2.7))*pow(1.-t,.45);
    float radial=exp(-pow(abs(x-bend)/(width+.005),2.)*3.);
    float tail=pow(1.-t,.65)*(1.-smoothstep(.88,1.,t));
    float wisps=smoothstep(.14,.82,n*.72+fine*.28+radial*.28);
    float core=exp(-pow(x/(width*.3+.003),2.))*exp(-t*2.2);
    float diamonds=pow(.5+.5*cos(t*56.-1.),12.)*exp(-t*3.)*(1.-solid)*radial;
    vec3 edge=mix(vec3(.18,.38,1.),vec3(1.,.28,.045),solid);
    vec3 hot=mix(vec3(.7,.85,1.8),vec3(1.7,1.05,.48),solid);
    vec3 color=mix(edge,hot,clamp(core*.85+diamonds*.4+.16,0.,1.));
    float a=(radial*wisps*.33+core*.28+diamonds*.15)*tail*power;
    gl_FragColor=vec4(color,a);
   }`});
 const geometry=new T.PlaneGeometry(radius*7,length,1,1);geometry.translate(0,-length/2,0);
 for(let i=0;i<3;i++){const o=mesh(geometry,material,group);o.rotation.y=i*Math.PI/3;o.castShadow=false;o.receiveShadow=false;}
 return {group,update(p,power){material.uniforms.phase.value=p*19;material.uniforms.power.value=power;group.visible=power>.002;group.scale.y=.94+.06*Math.sin(p*173);}};
}
function fairingHalf(parent,materials,sign,radius){
 const half=new T.Group();half.name=`fairing-half-${sign}`;half.position.y=1.54;parent.add(half);
 const nose=.83,rho=(radius*radius+nose*nose)/(2*radius),profile=[[radius,0],[radius,.62]];
 for(let i=1;i<=28;i++){const h=nose*i/28;profile.push([Math.max(.001,Math.sqrt(rho*rho-h*h)+radius-rho),.62+h]);}
 const start=sign>0?0:Math.PI;
 mesh(lathe(profile,48,start,Math.PI),materials.white,half);
 const inner=profile.map(([r,y])=>[Math.max(.0005,r-.007),y+.001]);
 mesh(lathe(inner,48,start,Math.PI),materials.interior,half);
 for(const height of [.025,.61])mesh(lathe([[radius-.016,height-.008],[radius,height-.008],[radius,height+.008],[radius-.016,height+.008]],48,start,Math.PI),materials.frame,half);
 for(const a of [start,start+Math.PI]){
  const points=profile.map(([r,y])=>[Math.sin(a)*(r-.003),y,Math.cos(a)*(r-.003)]);
  tube(half,materials.frame,points,.0035);
 }
 // Small surface access panels and fasteners, instead of painted toy-like stripes.
 const a=start+Math.PI*.48;
 const panel=mesh(new T.BoxGeometry(.055,.07,.003),materials.panel,half,Math.sin(a)*(radius+.001),.31,Math.cos(a)*(radius+.001));panel.rotation.y=a;
 return half;
}

/** Schematic H-IIA 202 / Atlas V 411, y-up. Staging progress is illustrative, not telemetry. */
export function createLaunchVehicle(id){
 const japanese=id==='hayabusa2',group=new T.Group();group.name=japanese?'H-IIA 202':'Atlas V 411';
 const materials={
  white:new T.MeshStandardMaterial({color:0xe6e8e5,roughness:.46,metalness:.18,side:T.DoubleSide}),
  tank:tankMaterial(japanese?0xd48a45:0xbba781),
  metal:new T.MeshStandardMaterial({color:0x9aa8ac,roughness:.3,metalness:.84}),
  frame:new T.MeshStandardMaterial({color:0x909b9b,roughness:.49,metalness:.7}),
  panel:new T.MeshStandardMaterial({color:0xc9ceca,roughness:.52,metalness:.25}),
  dark:new T.MeshStandardMaterial({color:0x242d31,roughness:.56,metalness:.45}),
  engine:new T.MeshStandardMaterial({color:0x4a4c49,roughness:.36,metalness:.86,side:T.DoubleSide}),
  soot:new T.MeshStandardMaterial({color:0x11171b,roughness:.82,side:T.DoubleSide}),
  interior:new T.MeshStandardMaterial({color:0xc3ba9a,roughness:.87,metalness:.08,side:T.BackSide}),
  gold:new T.MeshStandardMaterial({color:0xc29a4b,roughness:.43,metalness:.76}),
 };
 // Interface radii are authored mounting illustrations; full vehicle dimensions
 // remain sourced separately. Match the spacecraft's structural attachment ring.
 const airframeHeight=japanese?4.72:4.70,heightM=japanese?53:189*.3048;
 const radialScale=japanese?(airframeHeight/53*4/.44):(airframeHeight/189*12.5/.44);
 const mountRadiusM=japanese?.4:.5,mountRadius=mountRadiusM/(heightM/airframeHeight)/radialScale;
 const core=new T.Group();core.name='first-stage';group.add(core);
 cylinder(core,materials.tank,.22,-1.34,.77);
 cylinder(core,materials.white,.225,-1.47,-1.25);
 cylinder(core,japanese?materials.white:materials.dark,.223,.73,.98);
 for(const y of [-1.25,-.91,.15,.72])ring(core,japanese?materials.panel:materials.metal,.223,y,.015);
 for(const y of [-1.43,.83,.95]){ring(core,materials.frame,.229,y,.016);bolts(core,materials.metal,.23,y);}
 // Longitudinal raceway and external feedline remain with the first stage.
 mesh(new T.BoxGeometry(.036,1.93,.022),materials.white,core,0,-.19,.224);
 tube(core,materials.metal,[[.18,-1.28,.135],[.20,-1.13,.14],[.20,.59,.14],[.17,.7,.14]],.009);
 for(const y of [-1.03,-.59,-.15,.29,.63])mesh(new T.BoxGeometry(.06,.012,.024),materials.frame,core,0,y,.224);
 for(let i=0;i<32;i++){const a=i/32*Math.PI*2;mesh(new T.BoxGeometry(.006,.13,.007),materials.panel,core,Math.sin(a)*.226,-1.36,Math.cos(a)*.226).rotation.y=a;}
 const corePlumes=[];
 if(japanese){engine(core,materials,-1.73,.128,.29);corePlumes.push(exhaust(core,{y:-1.735,radius:.135,length:2.7}));}
 else for(const x of [-.089,.089]){engine(core,materials,-1.71,.074,.22,x);corePlumes.push(exhaust(core,{x,y:-1.715,radius:.095,length:2.8}));}
 const upper=new T.Group();upper.name=japanese?'second-stage':'Centaur';group.add(upper);
 cylinder(upper,materials.white,japanese?.219:.191,.99,1.64);
 cylinder(upper,japanese?materials.tank:materials.metal,japanese?.22:.193,1.11,1.60);
 for(const y of [1.025,1.12,1.58,1.64])ring(upper,materials.frame,japanese?.224:.198,y,.013);
 if(japanese)cylinder(upper,materials.white,.224,.99,1.10);
 else{
  for(let i=0;i<20;i++){const a=i*Math.PI/10;const o=mesh(new T.BoxGeometry(.008,.48,.005),materials.panel,upper,Math.sin(a)*.194,1.355,Math.cos(a)*.194);o.rotation.y=a;}
  mesh(new T.BoxGeometry(.046,.31,.021),materials.white,upper,.19,1.39,0);
 }
 engine(upper,materials,.82,japanese?.11:.12,.21);
 const upperPlume=exhaust(upper,{y:.815,radius:.095,length:1.5});
 // Payload adapter and its braces are revealed when the shells depart.
 mesh(lathe([[.19,1.64],[.19,1.67],[mountRadius,1.83],[mountRadius,1.88]]),materials.gold,upper);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(upper,materials.frame,[[Math.sin(a)*.19,1.66,Math.cos(a)*.19],[Math.sin(a)*mountRadius,1.86,Math.cos(a)*mountRadius]],.005);}
 ring(upper,materials.dark,mountRadius,1.885,.018);bolts(upper,materials.metal,mountRadius,1.891,16);
 const fairingRadius=japanese?.232:.251;
 const fairings=[fairingHalf(group,materials,1,fairingRadius),fairingHalf(group,materials,-1,fairingRadius)];
 const boosters=[];
 for(const sign of japanese?[-1,1]:[1]){
  const booster=new T.Group();booster.name=`solid-booster-${sign}`;group.add(booster);
  const radius=japanese?.132:.095,bottom=japanese?-1.32:-1.36,top=japanese?-.46:-.26;
  cylinder(booster,materials.white,radius,bottom,top);
  mesh(lathe([[radius,top],[radius*.98,top+.08],[radius*.83,top+.19],[radius*.50,top+.30],[.009,top+.36]],48),materials.white,booster);
  cylinder(booster,materials.panel,radius*1.055,bottom,bottom+.20);
  for(const y of [bottom+.06,bottom+.21,bottom+.57,top-.14]){ring(booster,materials.frame,radius*1.02,y,.01);bolts(booster,materials.metal,radius*1.032,y,12);}
  const skirt=mesh(new T.CylinderGeometry(radius,radius*1.13,.13,48),materials.white,booster,0,bottom-.045);
  skirt.name='motor-skirt';
  engine(booster,materials,bottom-.23,radius*.67,.2);
  for(const y of [bottom+.39,top-.10]){
   mesh(new T.BoxGeometry(.11,.04,.04),materials.frame,booster,-sign*radius,y,0);
   tube(booster,materials.metal,[[-sign*radius,y-.09,.038],[-sign*(radius+.07),y+.02,.038]],.008);
  }
  const plume=exhaust(booster,{y:bottom-.235,radius:radius*.9,length:japanese?2.95:3.3,solid:true});
  boosters.push({booster,sign,plume});
 }
 // Keep the established vertical/payload anchors while correcting the overly
 // wide schematic airframes to JAXA's 53 m / 4 m and ULA's 189 ft / 12.5 ft.
 for(const component of group.children){component.scale.x*=radialScale;component.scale.z*=radialScale;}
 group.userData.airframeLength=airframeHeight;
 group.userData.payloadMountRadiusM=mountRadiusM;
 group.userData.baseY=japanese?-1.73:-1.71;
 group.userData.coreDiameterDisplay=.44*radialScale;
 group.userData.heightM=japanese?53:189*.3048;
 function payloadPosition(p,physicsState){
  const release=physicsState?ease((physicsState.elapsedSeconds-physicsState.events.spacecraftSeparation)/60):ease((p-.8)/.2);return new T.Vector3(.65*radialScale*release,2.03+.9*release,.1*radialScale*release);
 }
 function payloadMountPosition(p,physicsState){
  const point=payloadPosition(p,physicsState);point.y+=1.894-2.03;return point;
 }
 function update(p,physicsState){
  p=T.MathUtils.clamp(p,0,1);
  // Mission event order is supplied in elapsed seconds. Separation drift remains
  // illustrative; the optional state preserves the legacy standalone demo API.
  const separation=(event,duration)=>{
   const age=(physicsState.elapsedSeconds-physicsState.events[event])/duration;
   return age>1?age:ease(age);
  };
  const remainsInView=(event,seconds)=>!physicsState||physicsState.elapsedSeconds-physicsState.events[event]<seconds;
  const boosterSep=physicsState?separation('boosterSeparation',20):ease((p-.32)/.25);
  const stageSep=physicsState?separation('stageSeparation',20):ease((p-.6)/.32);
  const fairingSep=physicsState?separation('fairingSeparation',15):ease((p-.68)/.26);
  core.position.set(-.48*stageSep,-3.1*stageSep,-.16*stageSep);core.rotation.set(0,0,.21*stageSep);
  core.visible=remainsInView('stageSeparation',90);
  for(const {booster,sign,plume} of boosters){
   booster.visible=remainsInView('boosterSeparation',60);
   booster.position.set(sign*((japanese?.363:.326)*radialScale+1.05*boosterSep),-2.4*boosterSep,-.1*boosterSep);
   booster.rotation.set(-.12*boosterSep,0,-sign*.42*boosterSep);
   plume.update(p,physicsState?Number(physicsState.engineOn.boosters)*.88:(1-ease((p-.27)/.10))*.88);
  }
  for(let i=0;i<fairings.length;i++){
   const sign=i===0?1:-1,half=fairings[i];
   half.visible=remainsInView('fairingSeparation',45);
   half.position.set(sign*1.13*fairingSep,1.54-.68*fairingSep,.15*fairingSep);
   half.rotation.set(sign*.12*fairingSep,0,-sign*.62*fairingSep);
  }
  corePlumes.forEach(plume=>plume.update(p,physicsState?Number(physicsState.engineOn.core):1-ease((p-.57)/.055)));
  upperPlume.update(p,physicsState?Number(physicsState.engineOn.upper):ease((p-.62)/.06)*(1-ease((p-.79)/.07)));
 }
 update(0);return {group,update,payloadPosition,payloadMountPosition};
}
