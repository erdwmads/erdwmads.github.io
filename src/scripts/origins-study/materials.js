import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import * as T from 'three';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
export const noise=new ImprovedNoise();
export function rng(seed=1234){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};}
function materialOrigin(geometry,origin){
  const values=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<values.length;i+=3)values.set(origin,i);
  geometry.setAttribute('rockOffset',new T.BufferAttribute(values,3));return geometry;
}
export function stoneGeometry(seed=1,detail=3){
  const g=new T.IcosahedronGeometry(1,detail),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const a=noise.noise(x*2.1+seed,y*2.1,z*2.1),b=noise.noise(x*6+seed,y*6,z*6);
    const fine=noise.noise(x*19+seed,y*19,z*19);
    const r=1+a*.26+b*.045+fine*.013;
    p.setXYZ(i,x*r,y*r*(.88+.06*Math.sin(seed)),z*r*.92);
  }
  g.deleteAttribute('normal');g.deleteAttribute('uv');const merged=mergeVertices(g);merged.computeVertexNormals();return materialOrigin(merged,[seed*.713,seed*.371,seed*.193]);
}
// Unequal fracture planes and chipped edges, rather than a displaced sphere.
export function clastGeometry(seed=1,detail=18){
  const random=rng(seed),planes=Array.from({length:8},(_,i)=>{const z=1-2*(i+.5)/8,a=i*2.399+random()*.3,r=Math.sqrt(1-z*z);return {normal:new T.Vector3(Math.cos(a)*r,z,Math.sin(a)*r),offset:.60+random()*.38};});
  const geometry=new T.IcosahedronGeometry(1,detail),p=geometry.attributes.position,v=new T.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).normalize();let radius=1;
    for(const plane of planes){const d=v.dot(plane.normal);if(d>0)radius=Math.min(radius,plane.offset/d);}
    radius+=.07*noise.noise(v.x*4.5+seed,v.y*4.5,v.z*4.5)+.045*noise.noise(v.x*11+seed,v.y*11,v.z*11)+.015*noise.noise(v.x*31+seed,v.y*31,v.z*31);
    p.setXYZ(i,v.x*radius,v.y*radius*.78,v.z*radius*.93);
  }
  geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');const merged=mergeVertices(geometry);merged.computeVertexNormals();return materialOrigin(merged,[seed*.713,seed*.371,seed*.193]);
}
export function rockMaterial(color=0x8d8b80){
  const m=new T.MeshStandardMaterial({color,roughness:.91,metalness:0});
  m.defaultAttributeValues={rockOffset:[0,0,0]};
  m.onBeforeCompile=(shader)=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nattribute vec3 rockOffset;varying vec3 vStone;`).replace('#include <begin_vertex>',`#include <begin_vertex>\nvStone=position+rockOffset;
#ifdef USE_INSTANCING_COLOR
vStone+=instanceColor*37.17;
#endif
`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vStone;
      float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float grainNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float coarse=grainNoise(vStone*8.);
      float medium=grainNoise(vStone*43.);
      float resolution=length(fwidth(vStone))*210.;
      float fine=mix(grainNoise(vStone*210.),.5,smoothstep(.6,2.,resolution));
      float pits=smoothstep(.60,.81,medium)*smoothstep(.42,.65,coarse);
      vec3 lithology=vStone*10.+vec3(coarse,grainNoise(vStone*4.+11.),grainNoise(vStone*4.-7.))*.65;
      float clasts=smoothstep(.62,.79,grainNoise(lithology+vec3(23.)));
      float flecks=smoothstep(.78,.9,fine);
      float strata=grainNoise(vStone*3.5+vec3(0.,grainNoise(vStone*6.)*2.,0.));
      diffuseColor.rgb*=.55+coarse*.34+fine*.12-pits*.16;
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.38,clasts*.65);
      diffuseColor.rgb*=mix(vec3(.91,.96,1.02),vec3(1.05,1.02,.97),strata);
      diffuseColor.rgb*=1.+flecks*.10;
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+grainNoise(vStone*31.)*.18-clasts*.16,.62,.98);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float relief=grainNoise(vStone*12.)*.19+grainNoise(vStone*43.)*.105+fine*.012-pits*.035;
      vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
      vec3 r1=cross(q1,normal),r2=cross(normal,q0);
      float determinant=dot(q0,r1);
      vec3 grad=sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2);
      normal=normalize(abs(determinant)*normal-grad*.055);
    `);
  };return m;
}
export function rubble(seed=1,radius=1,material=rockMaterial()){
  const group=new T.Group(),random=rng(seed);
  const core=new T.Mesh(clastGeometry(seed,22),material);core.geometry.boundsTree=new MeshBVH(core.geometry,{targetLeafSize:10});core.raycast=acceleratedRaycast;group.add(core);
  const small=new T.InstancedMesh(clastGeometry(seed+7,2),material,160),o=new T.Object3D(),ray=new T.Raycaster();ray.firstHitOnly=true;
  core.updateMatrixWorld(true);
  for(let i=0;i<160;i++){
    const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);
    const direction=new T.Vector3(r*Math.cos(a),z,r*Math.sin(a)),size=.012+random()**3*.15;
    ray.set(direction.clone().multiplyScalar(3),direction.clone().negate());
    const hit=ray.intersectObject(core,false)[0];
    o.position.copy(hit.point).addScaledVector(hit.face.normal,-size*.35);
    o.rotation.set(random()*6,random()*6,random()*6);o.scale.set(size*(.7+random()*.6),size*(.45+random()*.5),size);o.updateMatrix();small.setMatrixAt(i,o.matrix);small.setColorAt(i,new T.Color().setScalar(.66+random()*.5));
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
  source.computeBoundingBox();const size=source.boundingBox.getSize(new T.Vector3()),amplitude=Math.min(1,Math.min(size.x,size.y,size.z)/.4);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)+center.x,y=p.getY(i)+center.y,z=p.getZ(i)+center.z;
    const strength=.062*amplitude;
    p.setXYZ(i,p.getX(i)+strength*noise.noise(x*7+73,y*7,z*7)+.035*amplitude*noise.noise(x*23+11,y*23,z*23),p.getY(i)+strength*noise.noise(x*7,y*7+19,z*7)+.035*amplitude*noise.noise(x*23,y*23+31,z*23),p.getZ(i)+strength*noise.noise(x*7,y*7,z*7+47)+.035*amplitude*noise.noise(x*23,y*23,z*23+57));
  }
  rough.deleteAttribute('normal');const welded=mergeVertices(rough);welded.computeVertexNormals();const smooth=welded.toNonIndexed();
  geometry.morphAttributes.position=[rough.attributes.position];geometry.morphAttributes.normal=[smooth.attributes.normal];rough.dispose();welded.dispose();smooth.dispose();return materialOrigin(geometry,center.toArray());
}

// Real relief on the illustrative section lets grazing light reveal the matrix.
export function sectionRelief(source){
  const geometry=new TessellateModifier(.085,7).modify(source),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const weight=Math.exp(-Math.pow((z-.14)/.09,2));
    p.setZ(i,z+weight*(noise.noise(x*5+41,y*5,z*5)*.029+noise.noise(x*22+13,y*22,z*22)*.009));
  }
  geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');
  const merged=mergeVertices(geometry),creased=toCreasedNormals(merged,.7);
  geometry.dispose();merged.dispose();return creased;
}
