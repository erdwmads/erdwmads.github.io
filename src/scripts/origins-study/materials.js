import * as T from 'three';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
export const noise=new ImprovedNoise();
export function rng(seed=1234){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};}
export function stoneGeometry(seed=1,detail=3){
  const g=new T.IcosahedronGeometry(1,detail),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const a=noise.noise(x*2.1+seed,y*2.1,z*2.1),b=noise.noise(x*6+seed,y*6,z*6);
    const fine=noise.noise(x*19+seed,y*19,z*19);
    const r=1+a*.26+b*.045+fine*.013;
    p.setXYZ(i,x*r,y*r*(.88+.06*Math.sin(seed)),z*r*.92);
  }
  g.deleteAttribute('normal');g.deleteAttribute('uv');const merged=mergeVertices(g);merged.computeVertexNormals();return merged;
}
// Unequal fracture planes and chipped edges, rather than a displaced sphere.
export function clastGeometry(seed=1,detail=18){
  const random=rng(seed),planes=Array.from({length:8},(_,i)=>{const z=1-2*(i+.5)/8,a=i*2.399+random()*.3,r=Math.sqrt(1-z*z);return {normal:new T.Vector3(Math.cos(a)*r,z,Math.sin(a)*r),offset:.60+random()*.38};});
  const geometry=new T.IcosahedronGeometry(1,detail),p=geometry.attributes.position,v=new T.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).normalize();let radius=1;
    for(const plane of planes){const d=v.dot(plane.normal);if(d>0)radius=Math.min(radius,plane.offset/d);}
    radius+=.035*noise.noise(v.x*7+seed,v.y*7,v.z*7)+.013*noise.noise(v.x*23+seed,v.y*23,v.z*23);
    p.setXYZ(i,v.x*radius,v.y*radius*.78,v.z*radius*.93);
  }
  geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');const merged=mergeVertices(geometry);merged.computeVertexNormals();return merged;
}
export function rockMaterial(color=0x8d8b80){
  const m=new T.MeshStandardMaterial({color,roughness:.98,metalness:0});
  m.onBeforeCompile=(shader)=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nvarying vec3 vStone;`).replace('#include <begin_vertex>',`#include <begin_vertex>\nvStone=position;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vStone;
      float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float grainNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float coarse=grainNoise(vStone*8.);
      float medium=grainNoise(vStone*43.);
      float fine=grainNoise(vStone*210.);
      float pits=smoothstep(.58,.81,medium)*smoothstep(.42,.65,coarse);
      float flecks=smoothstep(.78,.9,fine);
      float strata=grainNoise(vStone*3.5+vec3(0.,grainNoise(vStone*6.)*2.,0.));
      diffuseColor.rgb*=.42+coarse*.48+fine*.23-pits*.34;
      diffuseColor.rgb*=mix(vec3(.78,.86,.93),vec3(1.15,1.04,.88),strata);
      diffuseColor.rgb*=1.+flecks*.035;
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float relief=grainNoise(vStone*43.)*.16+grainNoise(vStone*210.)*.025;
      vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
      vec3 r1=cross(q1,normal),r2=cross(normal,q0);
      float determinant=dot(q0,r1);
      vec3 grad=sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2);
      normal=normalize(abs(determinant)*normal-grad*.035);
    `);
  };return m;
}
export function rubble(seed=1,radius=1,material=rockMaterial()){
  const group=new T.Group(),random=rng(seed);
  const core=new T.Mesh(clastGeometry(seed,22),material);group.add(core);
  const small=new T.InstancedMesh(clastGeometry(seed+7,2),material,75),o=new T.Object3D(),ray=new T.Raycaster();
  core.updateMatrixWorld(true);
  for(let i=0;i<75;i++){
    const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);
    const direction=new T.Vector3(r*Math.cos(a),z,r*Math.sin(a)),size=.018+random()**2*.09;
    ray.set(direction.clone().multiplyScalar(3),direction.clone().negate());
    const hit=ray.intersectObject(core,false)[0];
    o.position.copy(hit.point).addScaledVector(hit.face.normal,-size*.35);
    o.rotation.set(random()*6,random()*6,random()*6);o.scale.setScalar(size);o.updateMatrix();small.setMatrixAt(i,o.matrix);
  }
  group.add(small);group.scale.setScalar(radius);return group;
}
export function dustCloud(count=450,seed=5){
  const random=rng(seed),positions=new Float32Array(count*3),directions=[];
  for(let i=0;i<count;i++){const v=new T.Vector3(random()-.5,random()-.5,random()-.5).normalize();directions.push({v,s:.25+random()*2,delay:random()*.04});}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));
  const m=new T.PointsMaterial({color:0xa7b0b1,size:.085,transparent:true,opacity:0,depthWrite:false});
  m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_particle_fragment>','#include <map_particle_fragment>\nfloat falloff=length(gl_PointCoord-.5)*2.;if(falloff>1.)discard;diffuseColor.a*=exp(-falloff*falloff*4.)*(1.-smoothstep(.65,1.,falloff));');};
  const points=new T.Points(g,m);points.frustumCulled=false;
  return {points,update(age,origin,axis){
    points.visible=age>0&&age<.32;if(!points.visible)return;
    m.opacity=(1-Math.min(1,age/.32))*.6;
    for(let i=0;i<count;i++){
      const {v,s,delay}=directions[i],d=Math.max(0,age-delay)*7*s;
      positions[i*3]=origin.x+(v.x+axis.x*.55)*d;
      positions[i*3+1]=origin.y+(v.y+axis.y*.55)*d;
      positions[i*3+2]=origin.z+(v.z+axis.z*.55)*d;
    }g.attributes.position.needsUpdate=true;
  }};
}

// A shared spatial displacement keeps neighboring fracture faces matched.
// Morphing exposes the relief during separation, while the intact body stays closed.
export function fractureRelief(source,center){
  const geometry=new TessellateModifier(.13,5).modify(source),rough=geometry.clone(),p=rough.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)+center.x,y=p.getY(i)+center.y,z=p.getZ(i)+center.z;
    const strength=.045;
    p.setXYZ(i,p.getX(i)+strength*noise.noise(x*12+73,y*12,z*12),p.getY(i)+strength*noise.noise(x*12,y*12+19,z*12),p.getZ(i)+strength*noise.noise(x*12,y*12,z*12+47));
  }
  rough.computeVertexNormals();geometry.morphAttributes.position=[rough.attributes.position];geometry.morphAttributes.normal=[rough.attributes.normal];rough.dispose();return geometry;
}
