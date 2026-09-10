import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {rng} from '../origins-study/materials.js';
import {smooth} from './motion.js';

// An illustrative local sampling site, not a reconstruction of measured topography.
function surfaceMaterial(color,grain){
 const material=new T.MeshStandardMaterial({color,roughness:.97,metalness:0,vertexColors:true});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRegolith;')
   .replace('#include <project_vertex>',`#include <project_vertex>
    vec4 terrainWorld=vec4(transformed,1.);
    #ifdef USE_INSTANCING
     terrainWorld=instanceMatrix*terrainWorld;
    #endif
    vRegolith=(modelMatrix*terrainWorld).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vRegolith;
   float terrainHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float terrainNoise(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(terrainHash(i),terrainHash(i+vec3(1,0,0)),f.x),mix(terrainHash(i+vec3(0,1,0)),terrainHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(terrainHash(i+vec3(0,0,1)),terrainHash(i+vec3(1,0,1)),f.x),mix(terrainHash(i+vec3(0,1,1)),terrainHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }`)
   .replace('#include <color_fragment>',`#include <color_fragment>
    vec3 grainPoint=vRegolith*${grain.toFixed(1)};
    float broad=terrainNoise(grainPoint*.38);
    float macro=terrainNoise(vRegolith*.43+vec3(broad*.6));
    float grit=terrainNoise(grainPoint*7.);
    float micro=terrainNoise(grainPoint*31.);
    float footprint=max(length(dFdx(grainPoint)),length(dFdy(grainPoint)));
    micro=mix(micro,.5,smoothstep(.02,.12,footprint));
    float cavities=smoothstep(.56,.80,grit)*smoothstep(.32,.6,broad);
    diffuseColor.rgb*=.4+macro*.36+broad*.18+grit*.09+micro*.045-cavities*.12;
    diffuseColor.rgb*=mix(vec3(.94,.96,1.),vec3(1.04,1.015,.97),broad);`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    float relief=terrainNoise(grainPoint*.55)*.055+terrainNoise(grainPoint*2.2)*.045+grit*.013+micro*.002;
    vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
    vec3 r1=cross(q1,normal),r2=cross(normal,q0);
    float determinant=dot(q0,r1);
    vec3 gradient=sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2);
    normal=normalize(abs(determinant)*normal-gradient*.55);`);
 };
 material.customProgramCacheKey=()=>`sampling-regolith-${grain}`;
 return material;
}

// Intersect unequal fracture planes to produce broad faces and bevelled chips.
// Unlike a radial sphere displacement, this preserves real edges and slab shapes.
function fracturedRock(seed,slabby,detailed){
 const random=rng(seed),noise=new ImprovedNoise(),planes=[];
 // A full distribution of tilted planes avoids the six dominant sides of a box.
 for(let i=0;i<14;i++){
  const y=1-2*(i+.5)/14,a=i*2.399963+random()*.7,r=Math.sqrt(1-y*y);
  const normal=new T.Vector3(Math.cos(a)*r+(random()-.5)*.22,y+(random()-.5)*.2,Math.sin(a)*r+(random()-.5)*.22).normalize();
  planes.push({normal,offset:.53+random()*.29});
 }
 const points=[],bc=new T.Vector3(),ca=new T.Vector3(),ab=new T.Vector3();
 for(let i=0;i<planes.length-2;i++)for(let j=i+1;j<planes.length-1;j++)for(let k=j+1;k<planes.length;k++){
  const a=planes[i],b=planes[j],c=planes[k];
  bc.crossVectors(b.normal,c.normal);const determinant=a.normal.dot(bc);
  if(Math.abs(determinant)<1e-5)continue;
  ca.crossVectors(c.normal,a.normal);ab.crossVectors(a.normal,b.normal);
  const point=bc.clone().multiplyScalar(a.offset).addScaledVector(ca,b.offset).addScaledVector(ab,c.offset).divideScalar(determinant);
  if(planes.every(plane=>plane.normal.dot(point)<=plane.offset+1e-5)&&!points.some(p=>p.distanceToSquared(point)<1e-8))points.push(point);
 }
 let geometry=new ConvexGeometry(points);
 geometry.scale(1,slabby?.62:.87,.81+random()*.24);
 if(detailed){
  const p=geometry.attributes.position,vertices=[];
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  const append=(v)=>{
   const relief=.055;
   vertices.push(v.x+noise.noise(v.x*5+seed,v.y*5,v.z*5)*relief,v.y+noise.noise(v.x*5,v.y*5+seed,v.z*5)*relief,v.z+noise.noise(v.x*5,v.y*5,v.z*5+seed)*relief);
  };
  for(let i=0;i<p.count;i+=3){
   a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
   const ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);
   for(const vertex of [a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca])append(vertex);
  }
  geometry.dispose();geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
 }
 geometry.computeBoundingSphere();
 const center=geometry.boundingSphere.center;geometry.translate(-center.x,-center.y,-center.z);
 geometry.scale(1/geometry.boundingSphere.radius,1/geometry.boundingSphere.radius,1/geometry.boundingSphere.radius);
 const positions=geometry.attributes.position,colors=new Float32Array(positions.count*3);
 for(let i=0;i<positions.count;i++){
  const tone=.8+noise.noise(positions.getX(i)*3+seed,positions.getY(i)*3,positions.getZ(i)*3)*.23;
  colors.set([tone,tone,tone],i*3);
 }
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}
export function createSamplingTerrain(id){
 const ryugu=id==='hayabusa2',seed=ryugu?731:1927,random=rng(seed),noise=new ImprovedNoise();
 const group=new T.Group();group.name=ryugu?'ryugu-sampling-site':'bennu-sampling-site';
 const n=(x,z,frequency,offset)=>noise.noise(x*frequency+seed*.13,offset,z*frequency+seed*.27);
 const height=(x,z)=>{
  const r=Math.hypot(x,z),contact=smooth((r-1.1)/1.15);
  return contact*(n(x,z,.17,2)*.68+n(x,z,.63,7)*.18+n(x,z,2.3,19)*.045-r*r*.0062);
 };
 const segments=160,rings=128,radius=42,vertices=[0,0,0],colors=[.9,.9,.9],indices=[];
 for(let ring=1;ring<=rings;ring++){
  const r=radius*(ring/rings)**1.65;
  for(let sector=0;sector<segments;sector++){
   const a=sector/segments*Math.PI*2;
   const jitter=ring===rings?0:n(Math.cos(a)*r,Math.sin(a)*r,1.2,33)*Math.min(.045,r*.06);
   const x=Math.cos(a)*(r+jitter),z=Math.sin(a)*(r+jitter);
   vertices.push(x,height(x,z),z);
   const tone=.81+n(x,z,.35,10)*.3+n(x,z,1.1,14)*.08;colors.push(tone,tone,tone);
   const current=1+(ring-1)*segments+sector,next=1+(ring-1)*segments+(sector+1)%segments;
   if(ring===1)indices.push(0,next,current);
   else{const previous=current-segments,previousNext=next-segments;indices.push(previous,next,current,previous,previousNext,next);}
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 // Both bowls are prepared once; GPU morph weights make scrubbing reversible.
 geometry.morphTargetsRelative=true;geometry.morphAttributes.position=[];geometry.morphAttributes.normal=[];
 for(const [cx,cz] of [[0,0],[-3.5,-1.8]]){
  const crater=geometry.clone(),position=crater.attributes.position,delta=new Float32Array(position.count*3);
  for(let i=0;i<position.count;i++){
   const x=position.getX(i)-cx,z=position.getZ(i)-cz,r=Math.hypot(x,z);
   const edge=r*(1+n(x,z,2.1,44)*.055);
   const bowl=-.76*Math.exp(-((edge/1.02)**4)),rim=.27*Math.exp(-(((edge-1.48)/.27)**2));
   const depth=bowl+rim;
   delta[i*3+1]=depth;position.setY(i,position.getY(i)+depth);
  }
  crater.computeVertexNormals();
  const normalDelta=new Float32Array(position.count*3),baseNormal=geometry.attributes.normal;
  for(let i=0;i<normalDelta.length;i++)normalDelta[i]=crater.attributes.normal.array[i]-baseNormal.array[i];
  geometry.morphAttributes.position.push(new T.BufferAttribute(delta,3));
  geometry.morphAttributes.normal.push(new T.BufferAttribute(normalDelta,3));crater.dispose();
 }
 geometry.computeBoundingSphere();
 const ground=new T.Mesh(geometry,surfaceMaterial(ryugu?0x555650:0x545554,8));
 ground.name='sampling-surface';ground.receiveShadow=true;group.add(ground);
 const rockMaterial=surfaceMaterial(ryugu?0x686960:0x626561,5),dummy=new T.Object3D(),color=new T.Color();
 const clear=(x,z,s)=>Math.hypot(x,z)>1.18+s*1.15&&Math.hypot(x+3.5,z+1.8)>1.82+s*1.15;
 for(let variant=0;variant<8;variant++)for(let layer=0;layer<2;layer++){
  const shape=fracturedRock(seed+variant*131,ryugu?variant%3!==0:variant%4===0,layer===0);
  const count=layer===0?30:120,rocks=new T.InstancedMesh(shape,rockMaterial,count);
  rocks.name=`fractured-clasts-${variant}-${layer}`;
  for(let i=0;i<count;i++){
   let x,z,s;
   const large=layer===0&&i<3,medium=layer===0&&i>=3;
   do{
    const a=random()*Math.PI*2,r=large?6+random()*17:Math.sqrt(random())*(medium?27:17);
    x=Math.cos(a)*r;z=Math.sin(a)*r;
    s=large?.6+random()**2*.9:medium?.18+random()**2*.43:.028+random()**2*.16;
    // Keep the near foreground readable while distant outcrops break the horizon.
    if(large&&z>1&&x>0)s*=.45;
   }while(!clear(x,z,s));
   dummy.rotation.set((random()-.5)*1.35,random()*Math.PI*2,(random()-.5)*1.35);
   dummy.scale.set(s*(.8+random()*.3),s*(.8+random()*.2),s*(.76+random()*.34));
   dummy.position.set(x,0,z);dummy.updateMatrix();
   // Seat irregular rotated stones into the relief instead of balancing on it.
   let lowest=Infinity;const point=new T.Vector3(),position=shape.attributes.position;
   for(let vertex=0;vertex<position.count;vertex++){
    point.fromBufferAttribute(position,vertex).applyMatrix4(dummy.matrix);
    lowest=Math.min(lowest,point.y);
   }
   dummy.position.y=height(x,z)-lowest-s*.23;dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
   const tint=.69+random()*.29;color.setRGB(tint,tint*(ryugu?.995:1.015),tint*(ryugu?.97:1.01));rocks.setColorAt(i,color);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;rocks.computeBoundingSphere();group.add(rocks);
 }
 function update(kind,p,stageId){
  ground.morphTargetInfluences[0]=kind==='impact'?smooth((p-.4)/.16):0;
  ground.morphTargetInfluences[1]=kind!=='impact'&&stageId==='touchdown-2'?1:0;
 }
 return {group,update};
}
