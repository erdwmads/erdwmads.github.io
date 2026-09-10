import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {poreLayout} from './pore-layout.js';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {rng,rockMaterial,stoneGeometry,clastGeometry,rubble,dustCloud,fractureRelief} from './materials.js';
import {IMPACTS,collision,evolution,smooth} from './timeline.mjs';
import {diskVolume} from './disk-volume.js';
import {fracturedBody} from './fracture.js';

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
  const material=rockMaterial(0x656866),iceMat=new T.MeshPhysicalMaterial({color:0xaebbb9,roughness:.32,metalness:0,clearcoat:.4,clearcoatRoughness:.23});
  body.add(rubble(41,.95,material));
  const crustGeo=stoneGeometry(313,2),crust=new T.InstancedMesh(crustGeo,iceMat,46),crustRandom=rng(902),crustObject=new T.Object3D(),surfaceRay=new T.Raycaster();
  const core=body.children[0].children[0];core.updateWorldMatrix(true,false);crust.name='surface-ice';
  for(let i=0;i<46;i++){
    const a=crustRandom()*Math.PI*2,z=crustRandom()*1.7-.85,r=Math.sqrt(1-z*z),direction=new T.Vector3(Math.cos(a)*r,z,Math.sin(a)*r);
    surfaceRay.set(direction.clone().multiplyScalar(3),direction.clone().negate());const hit=surfaceRay.intersectObject(core,false)[0];
    crustObject.position.copy(hit.point).divideScalar(.95).addScaledVector(hit.face.normal,-.004);
    crustObject.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),hit.face.normal);crustObject.rotateZ(crustRandom()*6.28);
    crustObject.scale.set(.02+crustRandom()*.035,.012+crustRandom()*.025,.009);crustObject.updateMatrix();crust.setMatrixAt(i,crustObject.matrix);
  }body.children[0].add(crust);
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
    rock.position.copy(dir).multiplyScalar(e.contact-e.radius*.04);settled.push(rock);
    const dust=dustCloud(250,31+i);body.add(dust.points);
    const ice=new T.Mesh(stoneGeometry(i+2,1),iceMat);ice.scale.set(.22,.08,.16);const iceDirection=new T.Vector3(.31,.63,.53).normalize();
    const localCore=new T.Mesh(rock.children[0].geometry);localCore.updateMatrixWorld(true);surfaceRay.set(iceDirection.clone().multiplyScalar(3),iceDirection.clone().negate());const iceHit=surfaceRay.intersectObject(localCore,false)[0];
    ice.position.copy(iceHit.point).addScaledVector(iceHit.face.normal,-.02);ice.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),iceHit.face.normal);ice.scale.set(.09,.035,.07);rock.add(ice);
    return{e,rock,dir,dust,contactPoint};
  });
  const random=rng(17),particles=new T.InstancedMesh(stoneGeometry(2,0),material,180),o=new T.Object3D(),orbits=[];
  for(let i=0;i<180;i++)orbits.push({a:random()*6.28,r:2.6+random()*3.2,y:(random()-.5)*1.6,s:.009+random()**3*.06});
  group.add(particles);
  return{group,camera:[3.9,2.1,6.2],target:[0,0,0],update(t,phase){
    material.color.setHex(phase?0x8f7c59:0x60686a);iceMat.color.setHex(phase?0x7bcedb:0xaebbb9);
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
  // Beveled rhombohedral faces catch light without reading as white cubes.
  const geometry=new RoundedBoxGeometry(1,1,1,3,.045),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    p.setXYZ(i,x+.24*y+.24*z,.971*y+.19*z,.952*z);
  }
  geometry.computeVertexNormals();return geometry;
}
export function alteration(sectionGeometry){
  const group=new T.Group(),random=rng(31),matrix=rockMaterial(0x515950);
  const {cavities,poreGeometries}=poreLayout(),rock=new T.Mesh(sectionGeometry,matrix);
  rock.geometry.boundsTree=new MeshBVH(rock.geometry,{targetLeafSize:10});rock.raycast=acceleratedRaycast;
  rock.name='alteration-matrix';rock.material=matrix;group.add(rock);
  const icy=new T.MeshPhysicalMaterial({color:0x9aa5a2,roughness:.31,metalness:0,clearcoat:.32,clearcoatRoughness:.24,flatShading:false});
  const waterBase=new T.MeshPhysicalMaterial({color:0x475452,roughness:.28,metalness:0,transparent:true,opacity:.13,depthWrite:false,clearcoat:.22,side:T.BackSide});
  const carbonMat=new T.MeshPhysicalMaterial({color:0xb3b8b5,roughness:.38,metalness:0,clearcoat:.26,clearcoatRoughness:.24});
  const crystalGeo=carbonateGeometry(),ice=[],waters=[],crystals=[],linings=[],wallRay=new T.Raycaster();wallRay.firstHitOnly=true;rock.updateMatrixWorld(true);
  cavities.forEach(([x,y,r],index)=>{
    const alteredWall=rockMaterial(0x505a4f);alteredWall.side=T.BackSide;alteredWall.clippingPlanes=[new T.Plane(new T.Vector3(0,0,-1),.132)];
    const lining=new T.Mesh(poreGeometries[index],alteredWall);
    lining.position.set(x,y,.14);lining.scale.setScalar(.995);group.add(lining);linings.push(lining);
    for(let j=0;j<3;j++){
      const mesh=new T.Mesh(clastGeometry(index*10+j,2),icy),a=j*2.4;
      mesh.position.set(x+Math.cos(a)*r*.22,y+Math.sin(a)*r*.25,-.035);
      mesh.rotation.set(random(),random(),random());mesh.userData.size=r*(.28+random()*.10);mesh.name='embedded-ice';
      wallRay.set(new T.Vector3(mesh.position.x,mesh.position.y,2),new T.Vector3(0,0,-1));const wall=wallRay.intersectObject(rock,false)[0];
      if(wall){mesh.position.copy(wall.point).addScaledVector(wall.face.normal,mesh.userData.size*.4);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),wall.face.normal);}
      group.add(mesh);ice.push(mesh);
    }
    const mat=waterBase.clone();mat.clippingPlanes=[new T.Plane(new T.Vector3(0,0,-1),.13)];
    const water=new T.Mesh(poreGeometries[index],mat);water.position.set(x,y,.14);water.scale.setScalar(.997);group.add(water);waters.push(water);
    for(let j=0;j<5;j++){
      const mesh=new T.Mesh(crystalGeo,carbonMat),a=j*2.4;
      mesh.position.set(x+Math.cos(a)*r*(.15+random()*.5),y+Math.sin(a)*r*(.15+random()*.45),-r*.26);
      mesh.rotation.set(.4+random()*.5,.2+random()*.4,a);mesh.userData.size=r*(j===0?.62+random()*.17:.23+random()*.20);mesh.userData.habit=new T.Vector3(.78+random()*.34,.78+random()*.34,.75+random()*.4);
      wallRay.set(new T.Vector3(mesh.position.x,mesh.position.y,2),new T.Vector3(0,0,-1));
      const wall=wallRay.intersectObject(rock,false)[0];
      if(wall){mesh.userData.root=wall.point.clone();mesh.userData.normal=wall.face.normal.clone().normalize();mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),mesh.userData.normal);mesh.rotateZ(a);mesh.rotateX((random()-.5)*.55);mesh.rotateY((random()-.5)*.55);}
      group.add(mesh);crystals.push(mesh);
    }
  });
  const flecks=new T.InstancedMesh(stoneGeometry(77,0),new T.MeshStandardMaterial({color:0x555c56,roughness:.8}),270),o=new T.Object3D();
  for(let i=0;i<270;i++){
    let x,y;do{x=(random()-.5)*4.2;y=(random()-.5)*3.35;}while((x*x/4.41+y*y/2.8)>.9||cavities.some(([cx,cy,r])=>Math.hypot(cx-x,cy-y)<r*1.1));
    wallRay.set(new T.Vector3(x,y,2),new T.Vector3(0,0,-1));const hit=wallRay.intersectObject(rock,false)[0];
    if(hit){o.position.copy(hit.point);o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),hit.face.normal);o.rotateZ(random()*6);o.scale.set(.005+random()*.016,.006+random()*.023,.004);}else{o.scale.setScalar(0);}
    o.updateMatrix();flecks.setMatrixAt(i,o.matrix);
  }group.add(flecks);
  return{group,camera:[-3.3,1.8,5.4],target:[0,0,0],update(t,phase){
    const state=evolution(t);matrix.color.setHex(phase?0x736b52:0x505658);icy.color.setHex(phase?0x85cfe2:0x9aa5a2);
    ice.forEach(m=>{m.scale.setScalar(m.userData.size*Math.cbrt(state.ice));m.visible=state.ice>.001;});
    waters.forEach(water=>{water.visible=state.liquid>.01;water.material.color.setHex(phase?0x368fae:0x475452);water.material.opacity=state.liquid*(phase?.42:.13);});
    crystals.forEach(m=>{const size=m.userData.size*state.carbonate;m.scale.copy(m.userData.habit).multiplyScalar(size);if(m.userData.root)m.position.copy(m.userData.root).addScaledVector(m.userData.normal,size*.2);});
    linings.forEach(m=>{m.visible=state.reaction>.01;m.material.color.setHex(phase?0x5e936f:0x515951);m.material.color.multiplyScalar(.7+state.reaction*.3);});
  },moment(t){return t<.2?'Embedded water ice':t<.4?'Melting and pore water':t<.7?'Water-rock reaction & carbonates':'Cooling / a mineral record remains';}};
}

export function inheritance(){
  const group=new T.Group(),body=new T.Group(),material=rockMaterial(0x747a78),random=rng(65);group.add(body);
  const {shell,cells}=fracturedBody(65,64);shell.dispose();
  const departingMaterial=material.clone();departingMaterial.onBeforeCompile=material.onBeforeCompile;departingMaterial.defaultAttributeValues=material.defaultAttributeValues;departingMaterial.transparent=true;departingMaterial.depthWrite=false;
  const parts=cells.map(({geometry,center},i)=>{
    const mesh=new T.Mesh(fractureRelief(geometry,center),material);geometry.dispose();mesh.name=`parent-fragment-${i}`;body.add(mesh);
    const dir=center.clone().normalize(),preserved=center.x<.18,spin=new T.Vector3(random()-.5,random()-.5,random()-.5);
    const kick=1.0+random()*.85;
    const far=center.clone().addScaledVector(dir,kick).add(new T.Vector3(Math.max(0,center.x)*.8,random()*.15,0));
    const target=center.clone().multiplyScalar(.82).add(new T.Vector3(-1.1,-.08,0));
    return{mesh,start:center,dir,far,target,preserved,spin};
  });
  parts.forEach(part=>part.mesh.position.copy(part.start));body.updateMatrixWorld(true);
  const surfaceRandom=rng(514),surfaceRay=new T.Raycaster(),surfaceGeometry=clastGeometry(881,2),surfaceGroups=new Map();
  for(let i=0;i<180;i++){
    const z=surfaceRandom()*2-1,a=surfaceRandom()*Math.PI*2,r=Math.sqrt(1-z*z),direction=new T.Vector3(Math.cos(a)*r,z,Math.sin(a)*r);
    surfaceRay.set(direction.clone().multiplyScalar(6),direction.clone().negate());
    const hit=surfaceRay.intersectObjects(parts.map(part=>part.mesh),false)[0];if(!hit)continue;
    const size=.015+surfaceRandom()**2*.075,normal=hit.face.normal.clone();
    const sample={position:hit.object.worldToLocal(hit.point.clone()).addScaledVector(normal,-size*.25),normal,size,turn:surfaceRandom()*6.28};
    if(!surfaceGroups.has(hit.object))surfaceGroups.set(hit.object,[]);surfaceGroups.get(hit.object).push(sample);
  }
  for(const [fragment,samples] of surfaceGroups){
    const stones=new T.InstancedMesh(surfaceGeometry,material,samples.length),transform=new T.Object3D();stones.name='fragment-surface-rubble';
    samples.forEach((sample,i)=>{transform.position.copy(sample.position);transform.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),sample.normal);transform.rotateZ(sample.turn);transform.scale.set(sample.size,sample.size*.75,sample.size*.55);transform.updateMatrix();stones.setMatrixAt(i,transform.matrix);});fragment.add(stones);
  }
  const impactor=rubble(19,.38,rockMaterial(0xa19788));body.add(impactor);
  const dust=dustCloud(1500,89);body.add(dust.points);
  const splinters=new T.InstancedMesh(stoneGeometry(873,0),material,260),o=new T.Object3D(),debris=[];body.add(splinters);
  for(let i=0;i<260;i++)debris.push({v:new T.Vector3(.5+random(),(random()-.5)*1.2,(random()-.5)*1.2).normalize(),speed:2+random()*10,size:.008+random()**2*.065});
  return{group,materials:[departingMaterial],camera:[4.7,2.9,11.8],target:[0,0,0],cameraAt(t){const follow=smooth((t-.62)/.36);return{position:[4.7-3.3*follow,2.9-1.3*follow,11.8-5.6*follow],target:[-1.55*follow,-.07*follow,0]};},update(t,phase){
    const approach=smooth(t/.22),breakup=smooth((t-.22)/.26),gather=smooth((t-.59)/.39);
    material.color.setHex(phase?0x688b93:0x60686b);departingMaterial.color.copy(material.color);departingMaterial.opacity=1-smooth((t-.66)/.26);
    body.rotation.set(.08,-.28+t*.18,.07);
    impactor.position.set(5.5-approach*4.12,.24,.06);impactor.visible=t<.24;impactor.rotation.y=t*3;
    parts.forEach(({mesh,start,dir,far,target,preserved,spin})=>{
      mesh.position.copy(start).lerp(far,breakup);
      if(preserved)mesh.position.lerp(target,gather);
      else mesh.position.addScaledVector(dir,smooth((t-.45)/.55)*3.4);
      const turn=breakup*(1-gather*.65);mesh.rotation.set(spin.x*turn*2,spin.y*turn*3,spin.z*turn*2);
      mesh.material=!preserved&&t>.66?departingMaterial:material;mesh.visible=preserved||departingMaterial.opacity>.001;
      mesh.children.forEach(child=>{if(child.isMesh)child.material=mesh.material;});
      mesh.scale.setScalar(1);mesh.morphTargetInfluences[0]=breakup;
    });
    const age=Math.max(0,t-.22);splinters.visible=age>0&&t<.92;
    debris.forEach((p,i)=>{o.position.set(1.35,.24,.06).addScaledVector(p.v,age*p.speed*2);o.rotation.set(age*p.speed,age*p.speed*.7,age*p.speed*.4);o.scale.setScalar(p.size*smooth(age/.04));o.updateMatrix();splinters.setMatrixAt(i,o.matrix);});splinters.instanceMatrix.needsUpdate=true;
    dust.update(t-.22,new T.Vector3(1.4,.24,0),new T.Vector3(1,.2,0));
  },moment(t){return t<.22?'A coherent parent / a later impact':t<.5?'Fracture surfaces & escaping ejecta':t<.75?'Less-heated fragments survive':'Reaccretion / an inherited mineral record';}};
}
