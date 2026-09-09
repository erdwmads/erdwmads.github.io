import * as T from 'three';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
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
export function rockMaterial(color=0x8d8b80){
  const m=new T.MeshStandardMaterial({color,roughness:.95,metalness:.015});
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
      diffuseColor.rgb*=.54+coarse*.45+fine*.18-pits*.38;
      diffuseColor.rgb+=vec3(.20,.19,.16)*flecks;
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float relief=grainNoise(vStone*43.)*.16+grainNoise(vStone*210.)*.025;
      vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition);
      vec3 n=normalize(cross(q0,q1));
      vec3 grad=(cross(q1,n)*dFdx(relief)+cross(n,q0)*dFdy(relief));
      normal=normalize(normal+grad*.6);
    `);
  };return m;
}
export function fractureGeometry(seed){
  const g=stoneGeometry(seed,10),p=g.attributes.position,random=rng(seed);
  const planes=Array.from({length:3},()=>({n:new T.Vector3(random()-.5,random()-.5,random()-.5).normalize(),d:.4+random()*.25}));
  const v=new T.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    for(const{n,d}of planes){const excess=v.dot(n)-d;if(excess>0)v.addScaledVector(n,-excess);}
    p.setXYZ(i,v.x,v.y*.8,v.z);
  }
  g.computeVertexNormals();return g;
}
export function rubble(seed=1,radius=1,material=rockMaterial()){
  const group=new T.Group(),random=rng(seed);
  const core=new T.Mesh(stoneGeometry(seed,16),material);group.add(core);
  const small=new T.InstancedMesh(stoneGeometry(seed+7,1),material,75),o=new T.Object3D();
  for(let i=0;i<75;i++){
    const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);
    o.position.set(r*Math.cos(a),z*.87,r*Math.sin(a)*.92).multiplyScalar(.91);
    o.rotation.set(random()*6,random()*6,random()*6);o.scale.setScalar(.025+random()**2*.11);o.updateMatrix();small.setMatrixAt(i,o.matrix);
  }
  group.add(small);group.scale.setScalar(radius);return group;
}
export function dustCloud(count=450,seed=5){
  const random=rng(seed),positions=new Float32Array(count*3),directions=[];
  for(let i=0;i<count;i++){const v=new T.Vector3(random()-.5,random()-.5,random()-.5).normalize();directions.push({v,s:.25+random()*2,delay:random()*.04});}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));
  const m=new T.PointsMaterial({color:0xa7b0b1,size:.032,transparent:true,opacity:0,depthWrite:false});
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
