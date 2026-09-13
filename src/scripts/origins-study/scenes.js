import * as T from 'three';
import {rng,rockMaterial,stoneGeometry,clastGeometry,rubble,dustCloud,fractureRelief} from './materials.js';
import {smooth} from './timeline.mjs';
import {diskRotationGLSL} from './disk-motion.js';
import {diskVolume} from './disk-volume.js';
import {fracturedBody} from './fracture.js';
import {fragmentShape} from './fragment-contact.js';
import {aggregateSurface} from './aggregate-surface.js';
import {fineSettlingTargets} from './fine-settling-targets.js';
import {packRemnant,fragmentPosition} from './inheritance-dynamics.js';

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
    vertexShader:`${diskRotationGLSL}
attribute vec3 aOrbit;varying vec3 vColor;uniform float time;uniform float pixelRatio;uniform float phase;
    void main(){float r=aOrbit.x;float a=aOrbit.y+orbitalAngle(r,time);vec3 p=vec3(cos(a)*r,aOrbit.z,sin(a)*r);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((9.+r)*pixelRatio/-mv.z,.6,2.);vColor=mix(color,mix(vec3(.78,.49,.18),vec3(.24,.58,.66),smoothstep(1.5,5.,r)),phase*.6);}`,
    fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;float a=exp(-d*d*3.)*.19;if(d>1.)discard;gl_FragColor=vec4(vColor,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const points=new T.Points(g,m);disk.add(points);
  const sun=new T.Mesh(new T.SphereGeometry(.115,28,20),new T.MeshBasicMaterial({color:0xffe5b7}));disk.add(sun);
  const haloMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{},vertexShader:`varying vec2 vUv;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=position.xy;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float a=exp(-r*7.)*.6;gl_FragColor=vec4(1.,.61,.26,a);}`});
  disk.add(new T.Mesh(new T.PlaneGeometry(2.8,2.8),haloMat));

  return{group,camera:[8,5.5,12],target:[0,0,0],update(t,phase){volume.update(t,phase);m.uniforms.time.value=t;m.uniforms.phase.value=phase?1:0;m.uniforms.pixelRatio.value=Math.min(globalThis.devicePixelRatio||1,1.6);},
    moment(t){return t<.5?'Differential rotation · inner dust moves faster':'Advected dust structure · accelerated display time';}};
}

export {accretion} from './growth-scene.js';

export {alteration} from './aqueous-scene.js';

export function inheritance(){
  const group=new T.Group(),body=new T.Group(),material=rockMaterial(0x747a78),random=rng(65);group.add(body);
  const {shell,cells}=fracturedBody(65,64);shell.dispose();
  const departingMaterial=material.clone();departingMaterial.onBeforeCompile=material.onBeforeCompile;departingMaterial.defaultAttributeValues=material.defaultAttributeValues;
  const parts=cells.map(({geometry,center},i)=>{
    let shape;const mesh=new T.Mesh(fractureRelief(geometry,center),material);geometry.dispose();mesh.name=`parent-fragment-${i}`;body.add(mesh);
    const dir=center.clone().normalize(),preserved=center.x<.18,spin=new T.Vector3(random()-.5,random()-.5,random()-.5);
    const vertices=mesh.geometry.morphAttributes.position[0];let radius=0;
    for(let j=0;j<vertices.count;j++)radius=Math.max(radius,Math.hypot(vertices.getX(j),vertices.getY(j),vertices.getZ(j)));
    const escapeDirection=new T.Vector3(1.4+random(),(random()-.5)*.9,(random()-.5)*.9).normalize();
    return{mesh,start:center,dir,preserved,spin,get shape(){return shape??=fragmentShape(geometry);},radius:radius+.055,delay:random()*.13,escapeDirection};
  });
  packRemnant(parts);group.userData.fragments=parts;
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
  const impactor=rubble(19,.20,rockMaterial(0xa19788));body.add(impactor);
  impactor.updateWorldMatrix(true,true);
  surfaceRay.set(new T.Vector3(-4,0,0),new T.Vector3(1,0,0));const support=-surfaceRay.intersectObject(impactor,true)[0].point.x;
  surfaceRay.set(new T.Vector3(8,.24,.06),new T.Vector3(-1,0,0));const impactPoint=surfaceRay.intersectObjects(parts.map(p=>p.mesh),false)[0].point.clone();
  const dust=dustCloud(1500,89);body.add(dust.points);
  const splinters=new T.InstancedMesh(stoneGeometry(873,0),rockMaterial(0xffffff),3000),o=new T.Object3D(),debris=[];splinters.name='mixed-fine-ejecta';body.add(splinters);
  for(let i=0;i<3000;i++){
    const preserved=i<2400,size=.010+random()**2*.045,v=new T.Vector3(.5+random(),(random()-.5)*1.2,(random()-.5)*1.2).normalize();
    const start=new T.Vector3((random()-.5)*1.5,(random()-.5)*1.5,(random()-.5)*1.5);
    const target=new T.Vector3().fromArray(fineSettlingTargets[i]);
    debris.push({v,speed:2+random()*10,size,start,target,preserved,delay:random()*.15,escapeDirection:v});
  }
  const fines=aggregateSurface(rockMaterial(0x50574f),'remnant-fine-material');body.add(fines.mesh);
  group.userData.debris=debris;let previousT=-1;
  // A few short direction trails explain fate without assigning a paint colour to every rock.
  const tracers=[...parts.filter(p=>p.preserved).slice(2,5),...parts.filter(p=>!p.preserved).slice(2,5)].map(part=>{
   const line=new T.Line(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(36*3),3)),new T.LineBasicMaterial({color:part.preserved?0xb8c6ca:0xc5a779,transparent:true,opacity:.65,depthWrite:false}));
   const tip=new T.Mesh(new T.ConeGeometry(.035,.14,6),new T.MeshBasicMaterial({color:part.preserved?0xb8c6ca:0xc5a779}));body.add(line,tip);return{part,line,tip};
  });
  return{group,materials:[departingMaterial],camera:[.3,2.3,9.5],target:[-.45,0,0],update(t,phase){
    const approach=Math.min(1,t/.22),breakup=smooth((t-.22)/.17);
    material.color.setHex(0x50574f);departingMaterial.color.copy(material.color);
    body.rotation.set(.08,-.28,.07);
    impactor.position.copy(impactPoint).add(new T.Vector3(support+(1-approach)*5,0,0));impactor.visible=t<.235;impactor.rotation.y=0;
    parts.forEach(part=>{
      const {mesh,preserved,spin}=part;mesh.position.copy(fragmentPosition(part,t));
      const settle=preserved?smooth((t-.70-part.delay)/.16):0,turn=breakup*(1-settle);
      mesh.rotation.set(spin.x*turn*2,spin.y*turn*3,spin.z*turn*2);
      mesh.material=preserved?material:departingMaterial;mesh.visible=true;
      mesh.children.forEach(child=>{if(child.isMesh)child.material=mesh.material;});
      mesh.scale.setScalar(1);mesh.morphTargetInfluences[0]=breakup;
    });
    for(const {part,line,tip} of tracers){
     line.visible=tip.visible=phase&&t>.25&&t<.96;
     if(line.visible){const p=line.geometry.attributes.position;
      for(let i=0;i<36;i++){const q=fragmentPosition(part,Math.max(.22,t-.11*(1-i/35)));p.setXYZ(i,q.x,q.y,q.z);}p.needsUpdate=true;line.geometry.computeBoundingSphere();
      const end=fragmentPosition(part,t),direction=end.clone().sub(fragmentPosition(part,t-.004)).normalize();tip.position.copy(end);tip.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
     }
    }
    const age=Math.max(0,t-.22);splinters.visible=age>0;
    const debrisColor=new T.Color();
    debris.forEach((p,i)=>{splinters.setColorAt(i,debrisColor.setHex(0x70756d));o.position.copy(fragmentPosition(p,t));const settle=p.preserved?smooth((t-.80)/.18):0;o.rotation.set(age*p.speed*(1-settle),age*p.speed*.7*(1-settle),age*p.speed*.4*(1-settle));o.scale.setScalar(p.size);o.updateMatrix();splinters.setMatrixAt(i,o.matrix);});splinters.instanceMatrix.needsUpdate=true;splinters.instanceColor.needsUpdate=true;
    if(t!==previousT){
     if(t>.82){const points=debris.filter(p=>p.preserved&&t>=.83+p.delay).map(p=>fragmentPosition(p,t).toArray());fines.update(points,3.2-.95*smooth((t-.6)/.4),.26,1.6,[-1.25,-.12,0]);}else fines.mesh.visible=false;
     previousT=t;
    }
    dust.update(t-.22,new T.Vector3(1.4,.24,0),new T.Vector3(1,.2,0));
  },moment(t){return t<.22?'A later impact disrupts the parent':t<.53?'Fragments separate · fast ejecta escape':t<.84?'Slower fragments turn back and reaccumulate':'A porous remnant retains the mineral record';},process(t){return t<.22?0:t<.53?1:2;}};
}
