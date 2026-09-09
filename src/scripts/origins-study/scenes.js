import * as T from 'three';
import {Brush,Evaluator,SUBTRACTION} from 'three-bvh-csg';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {rng,rockMaterial,stoneGeometry,fractureGeometry,rubble,dustCloud} from './materials.js';
import {IMPACTS,collision,evolution,smooth} from './timeline.mjs';
import {diskVolume} from './disk-volume.js';

export function nebula(){
  const group=new T.Group(),disk=new T.Group();group.add(disk);
  const volume=diskVolume();group.add(volume.mesh);
  const random=rng(123),count=8000,g=new T.BufferGeometry();
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3),params=new Float32Array(count*3);
  const warm=new T.Color('#d1aa77'),cool=new T.Color('#9aadb4'),c=new T.Color();
  for(let i=0;i<count;i++){
    const r=.35+Math.pow(random(),.7)*6.3,a=random()*Math.PI*2;
    const h=(random()+random()+random()-1.5)*(.09+Math.pow(r/6,1.4)*.45);
    positions.set([Math.cos(a)*r,h,Math.sin(a)*r],i*3);
    const variation=.45+.55*random(),shadow=Math.abs(h)<.055?.37:1;
    c.copy(warm).lerp(cool,smooth((r-1.2)/5)).multiplyScalar(variation*shadow);
    colors.set([c.r,c.g,c.b],i*3);params.set([r,a,h],i*3);
  }
  g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('color',new T.BufferAttribute(colors,3));g.setAttribute('aOrbit',new T.BufferAttribute(params,3));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{time:{value:0},pixelRatio:{value:1},phase:{value:0}},
    vertexShader:`attribute vec3 aOrbit;varying vec3 vColor;uniform float time;uniform float pixelRatio;uniform float phase;
    void main(){float r=aOrbit.x;float a=aOrbit.y+time*.16/pow(r+.3,1.5);vec3 p=vec3(cos(a)*r,aOrbit.z,sin(a)*r);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((9.+r)*pixelRatio/-mv.z,.6,2.);vColor=mix(color,mix(vec3(.78,.49,.18),vec3(.24,.58,.66),smoothstep(1.5,5.,r)),phase*.6);}`,
    fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;float a=exp(-d*d*3.)*.19;if(d>1.)discard;gl_FragColor=vec4(vColor,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const points=new T.Points(g,m);disk.add(points);
  const sun=new T.Mesh(new T.SphereGeometry(.115,28,20),new T.MeshBasicMaterial({color:0xffe5b7}));disk.add(sun);
  const haloMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{},vertexShader:`varying vec2 vUv;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=position.xy;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float a=exp(-r*7.)*.6;gl_FragColor=vec4(1.,.61,.26,a);}`});
  disk.add(new T.Mesh(new T.PlaneGeometry(2.8,2.8),haloMat));
  disk.rotation.z=.09;
  return{group,camera:[8,5.5,12],target:[0,0,0],update(t,phase){volume.update(t,phase);m.uniforms.time.value=t*24;m.uniforms.phase.value=phase?1:0;m.uniforms.pixelRatio.value=Math.min(devicePixelRatio,1.6);},
    moment(t){return t<.5?'A flared gas-dust disk':'Rotation in the solar nebula';}};
}

export function accretion(){
  const group=new T.Group(),body=new T.Group();group.add(body);
  const material=rockMaterial(0x656866),iceMat=new T.MeshPhysicalMaterial({color:0x95aaa9,roughness:.6,metalness:0,clearcoat:.1});
  body.add(rubble(41,.95,material));
  const settled=[body.children[0]],ray=new T.Raycaster();
  const events=IMPACTS.map((e,i)=>{
    const rock=rubble(73+i,e.radius,material);body.add(rock);
    const dir=new T.Vector3(Math.cos(e.angle),e.tilt,Math.sin(e.angle)).normalize();
    body.updateMatrixWorld(true);ray.set(dir.clone().multiplyScalar(8),dir.clone().negate());
    const hit=ray.intersectObjects(settled,true)[0];
    const contactPoint=hit?hit.point.clone():dir.clone().multiplyScalar(.9);
    rock.rotation.set(.2,e.angle,.3);rock.updateMatrixWorld(true);
    ray.set(dir.clone().multiplyScalar(-4),dir);
    const incomingHit=ray.intersectObject(rock,true)[0];
    const support=incomingHit?Math.abs(incomingHit.point.dot(dir)):e.radius;
    e={...e,contact:contactPoint.dot(dir)+support};
    rock.position.copy(dir).multiplyScalar(e.contact-e.radius*.35);settled.push(rock);
    const dust=dustCloud(250,31+i);body.add(dust.points);
    const ice=new T.Mesh(stoneGeometry(i+2,1),iceMat);ice.scale.set(.22,.08,.16);ice.position.set(.31,.63,.53);rock.add(ice);
    return{e,rock,dir,dust,contactPoint};
  });
  const random=rng(17),particles=new T.InstancedMesh(stoneGeometry(2,0),material,180),o=new T.Object3D(),orbits=[];
  for(let i=0;i<180;i++)orbits.push({a:random()*6.28,r:2.6+random()*3.2,y:(random()-.5)*1.6,s:.009+random()**3*.06});
  group.add(particles);
  return{group,camera:[4.9,3.2,7.8],target:[0,0,0],update(t,phase){
    material.color.setHex(phase?0x8f7c59:0x656866);iceMat.color.setHex(phase?0x7bcedb:0x95aaa9);
    body.rotation.y=-.3+t*.9;body.rotation.z=.08;
    events.forEach(({e,rock,dir,dust,contactPoint},i)=>{
      const state=collision(t,e),a=1-state.approach;
      rock.position.copy(dir).multiplyScalar(state.distance);
      // Tangential approach ends at contact; retained lobes stay attached thereafter.
      rock.position.add(new T.Vector3(-dir.z,0,dir.x).multiplyScalar(Math.sin(a*Math.PI)*1.3));
      rock.rotation.set(.2+a*1.1,e.angle+a*2,.3+a*.7);
      dust.update(t-e.time,contactPoint,dir);
    });
    orbits.forEach((p,i)=>{const a=p.a+t*1.7/Math.sqrt(p.r);o.position.set(Math.cos(a)*p.r,p.y,Math.sin(a)*p.r);o.scale.setScalar(p.s);o.rotation.set(a,a*.4,a);o.updateMatrix();particles.setMatrixAt(i,o.matrix);});particles.instanceMatrix.needsUpdate=true;
  },moment(t){const n=IMPACTS.filter(e=>t>=e.time).length;return n?`Impact ${n} / retained material`:'Independent ice-bearing bodies';}};
}

function carbonateGeometry(){
  const points=[];
  for(const a of[-.5,.5])for(const b of[-.5,.5])for(const c of[-.5,.5]){
    points.push(new T.Vector3(a+.24*b+.24*c,.971*b+.19*c,.952*c));
  }return new ConvexGeometry(points);
}
export function alteration(){
  const group=new T.Group(),random=rng(31),matrix=rockMaterial(0x515950);
  const outerGeo=stoneGeometry(91,10);outerGeo.scale(2.3,1.9,.85);
  const evaluator=new Evaluator();evaluator.attributes=['position','normal'];evaluator.useGroups=false;
  let rock=new Brush(outerGeo,matrix);rock.updateMatrixWorld();
  const cut=new Brush(new T.BoxGeometry(8,8,5));cut.position.z=2.64;cut.updateMatrixWorld();
  rock=evaluator.evaluate(rock,cut,SUBTRACTION);rock.updateMatrixWorld();
  const cavities=[[-1.05,.63,.37],[-.12,.90,.32],[.86,.48,.45],[1.06,-.45,.31],[-.10,-.65,.46],[-1.05,-.45,.29],[0,.1,.27]];
  const poreGeometries=cavities.map(([, ,r],i)=>{const g=stoneGeometry(601+i,5);g.scale(r*(i%2?1.25:.85),r*(i%2?.65:1.2),r*.9);g.rotateZ(i*1.6);return g;});
  for(let i=0;i<cavities.length;i++){const[x,y]=cavities[i];const pore=new Brush(poreGeometries[i]);pore.position.set(x,y,.08);pore.updateMatrixWorld();rock=evaluator.evaluate(rock,pore,SUBTRACTION);rock.updateMatrixWorld();}
  rock.material=matrix;group.add(rock);
  const icy=new T.MeshPhysicalMaterial({color:0xb2c9c9,roughness:.45,metalness:0,clearcoat:.12,flatShading:true});
  const waterBase=new T.MeshPhysicalMaterial({color:0x617b80,roughness:.46,metalness:0,transparent:true,opacity:.38,depthWrite:false,clearcoat:.07,side:T.BackSide});
  const carbonMat=new T.MeshStandardMaterial({color:0xd3c9ac,roughness:.46,metalness:0});
  const crystalGeo=carbonateGeometry(),ice=[],waters=[],crystals=[],linings=[];
  cavities.forEach(([x,y,r],index)=>{
    const lining=new T.Mesh(poreGeometries[index],new T.MeshStandardMaterial({color:0x555e49,roughness:.96,side:T.BackSide,clippingPlanes:[new T.Plane(new T.Vector3(0,0,-1),.132)]}));
    lining.position.set(x,y,.08);lining.scale.setScalar(.995);group.add(lining);linings.push(lining);
    for(let j=0;j<4;j++){
      const mesh=new T.Mesh(stoneGeometry(index*10+j,0),icy),a=j*2.4;
      mesh.position.set(x+Math.cos(a)*r*.22,y+Math.sin(a)*r*.25,-.035);
      mesh.rotation.set(random(),random(),random());mesh.userData.size=r*(.34+random()*.14);group.add(mesh);ice.push(mesh);
    }
    const mat=waterBase.clone(),plane=new T.Plane(new T.Vector3(0,-1,0),y-r*.65);mat.clippingPlanes=[plane,new T.Plane(new T.Vector3(0,0,-1),.065)];
    const water=new T.Mesh(poreGeometries[index],mat);water.position.set(x,y,.08);water.scale.setScalar(.96);group.add(water);waters.push({water,plane,x,y,r});
    for(let j=0;j<7;j++){
      const mesh=new T.Mesh(crystalGeo,carbonMat),a=j*2.4;
      mesh.position.set(x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.50,-r*.26);
      mesh.rotation.set(.4+random()*.5,.2+random()*.4,a);mesh.userData.size=r*(.09+random()*.1);group.add(mesh);crystals.push(mesh);
    }
  });
  const flecks=new T.InstancedMesh(stoneGeometry(77,0),new T.MeshStandardMaterial({color:0xaca78e,roughness:.8}),420),o=new T.Object3D();
  for(let i=0;i<420;i++){
    let x,y;do{x=(random()-.5)*4.2;y=(random()-.5)*3.35;}while((x*x/4.41+y*y/2.8)>.9||cavities.some(([cx,cy,r])=>Math.hypot(cx-x,cy-y)<r*1.1));
    o.position.set(x,y,.145);o.scale.set(.006+random()*.017,.007+random()*.026,.007);o.rotation.set(random(),random(),random()*6);o.updateMatrix();flecks.setMatrixAt(i,o.matrix);
  }group.add(flecks);
  return{group,camera:[.5,1.25,7.6],target:[0,0,0],update(t,phase){
    const state=evolution(t);matrix.color.setHex(phase?0x736b52:0x565956);icy.color.setHex(phase?0x85cfe2:0xb2c9c9);
    ice.forEach(m=>{m.scale.setScalar(m.userData.size*Math.cbrt(state.ice));m.visible=state.ice>.001;});
    waters.forEach(({water,plane,y,r})=>{water.visible=state.liquid>.01;plane.constant=y-r*.65+state.liquid*r*1.25;water.material.color.setHex(phase?0x368fae:0x617b80);water.material.opacity=state.liquid*.38;});
    crystals.forEach(m=>m.scale.setScalar(m.userData.size*state.carbonate));
    linings.forEach(m=>{m.visible=state.reaction>.01;m.material.color.setHex(phase?0x5e936f:0x696e5a);m.material.color.multiplyScalar(.7+state.reaction*.3);});
  },moment(t){return t<.2?'Embedded water ice':t<.4?'Melting and pore water':t<.7?'Water-rock reaction & carbonates':'Cooling / a mineral record remains';}};
}

export function inheritance(){
  const group=new T.Group(),material=rockMaterial(0x656866),random=rng(65),parts=[];
  for(let i=0;i<26;i++){
    const a=i*2.399,z=1-2*(i+.5)/26,r=Math.sqrt(1-z*z),dir=new T.Vector3(Math.cos(a)*r,z,Math.sin(a)*r);
    const mesh=new T.Mesh(fractureGeometry(200+i),material);mesh.scale.setScalar(.52+random()*.16);mesh.userData.spin=new T.Vector3(random(),random(),random());group.add(mesh);
    parts.push({mesh,dir,start:dir.clone().multiplyScalar(1.02),far:dir.clone().multiplyScalar(2+random()*2.5),target:dir.clone().multiplyScalar(.74),preserved:dir.x<.1});
  }
  const impactor=rubble(19,.47,rockMaterial(0xa19788));group.add(impactor);
  const dust=dustCloud(900,89);group.add(dust.points);
  return{group,camera:[7.8,5,17.6],target:[0,0,0],update(t,phase){
    const approach=smooth(t/.20),breakup=smooth((t-.20)/.26),gather=smooth((t-.57)/.40);
    material.color.setHex(phase?0x688b93:0x656866);
    impactor.position.set(5.5-approach*4.08,.38,.15);impactor.visible=t<.245;impactor.rotation.y=t*3;
    parts.forEach(({mesh,dir,start,far,target,preserved})=>{
      mesh.position.copy(start).lerp(far,breakup);
      if(preserved)mesh.position.lerp(target.clone().add(new T.Vector3(-1.0,0,0)),gather);
      else mesh.position.addScaledVector(dir,smooth((t-.45)/.55)*5);
      const spin=breakup*(1-gather*.9);mesh.rotation.set(mesh.userData.spin.x*spin*4,mesh.userData.spin.y*spin*5,mesh.userData.spin.z*spin*3);
      mesh.visible=preserved||t<.88;
    });
    dust.update(t-.20,new T.Vector3(1.4,.35,0),new T.Vector3(1,.2,0));
  },moment(t){return t<.2?'A later, localized impact':t<.5?'Disruption and escaping ejecta':t<.75?'Less-heated fragments survive':'Reaccretion / a rubble-pile descendant';}};
}
