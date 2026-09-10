import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {rng} from '../origins-study/materials.js';

function asteroidMaterial(id,objectToUnit=new T.Matrix4(),boulders=false){
 const material=new T.MeshStandardMaterial({color:id==='ryugu'?0x494c48:0x4a4b49,roughness:.99,metalness:0});
 material.onBeforeCompile=shader=>{
  shader.uniforms.asteroidToUnit={value:objectToUnit};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 asteroidToUnit;varying vec3 vAsteroid;')
   .replace('#include <project_vertex>',`#include <project_vertex>
    vec4 surfacePosition=vec4(transformed,1.);
    #ifdef USE_INSTANCING
     surfacePosition=instanceMatrix*surfacePosition;
    #endif
    vAsteroid=(asteroidToUnit*surfacePosition).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vAsteroid;
   float asteroidHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float asteroidNoise(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(asteroidHash(i),asteroidHash(i+vec3(1,0,0)),f.x),mix(asteroidHash(i+vec3(0,1,0)),asteroidHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(asteroidHash(i+vec3(0,0,1)),asteroidHash(i+vec3(1,0,1)),f.x),mix(asteroidHash(i+vec3(0,1,1)),asteroidHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
`)
   .replace('#include <color_fragment>',`#include <color_fragment>
    vec3 p=vAsteroid+vec3(${id==='ryugu'?'4.1,9.7,2.3':'1.8,3.3,8.6'});
    vec3 warp=p+vec3(asteroidNoise(p*9.),asteroidNoise(p*9.+17.),asteroidNoise(p*9.+31.))*.085;
    float macro=asteroidNoise(warp*6.);
    float broad=asteroidNoise(warp*17.);
    float coarse=asteroidNoise(warp*54.)*.67+asteroidNoise(warp*109.+7.)*.33;
    float grain=asteroidNoise(warp*257.);
    float footprint=max(length(dFdx(warp)),length(dFdy(warp)));
    grain=mix(grain,.5,smoothstep(.0015,.006,footprint));
    // Sparse broken pockets never form a connected cell-edge network.
    float pockets=smoothstep(.64,.82,asteroidNoise(warp*71.))*smoothstep(.55,.73,broad);
    diffuseColor.rgb*=.33+macro*.56+broad*.24+coarse*.13+grain*.045;
    diffuseColor.rgb*=1.-pockets*.38;
    diffuseColor.rgb*=mix(vec3(.955,.975,1.),vec3(1.015,1.,.985),macro);`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    float relief=coarse*.018+broad*.003+grain*.0021-pockets*.003;
    vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
    vec3 r1=cross(q1,normal),r2=cross(normal,q0);
    float determinant=dot(q0,r1);
    vec3 gradient=sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2);
    vec3 roughNormal=normalize(abs(determinant)*normal-gradient*.65);
    normal=normalize(mix(normal,roughNormal,.7));`);
 };
 material.customProgramCacheKey=()=>`asteroid-detail-dense-rubble-${id}-${boulders}`;
 return material;
}

function angularBoulder(seed){
 const random=rng(seed),points=[];
 for(let i=0;i<14;i++){
  const y=1-2*(i+.5)/14,angle=i*2.399963+random()*.6,r=Math.sqrt(1-y*y),radius=.58+random()*.42;
  points.push(new T.Vector3(Math.cos(angle)*r*radius,y*radius*(.6+random()*.22),Math.sin(angle)*r*radius));
 }
 const geometry=new ConvexGeometry(points);geometry.computeBoundingSphere();
 const center=geometry.boundingSphere.center;geometry.translate(-center.x,-center.y,-center.z);
 geometry.scale(1/geometry.boundingSphere.radius,1/geometry.boundingSphere.radius,1/geometry.boundingSphere.radius);
 geometry.computeBoundingSphere();return geometry;
}

// Retains the source shape. Boulder positions and albedo are illustrative detail,
// not measurements or a site map; all added resources remain owned by unit.
export function augmentAsteroid(unit,id){
 unit.updateMatrixWorld(true);
 const inverse=new T.Matrix4().copy(unit.matrixWorld).invert(),triangles=[],oldMaterials=new Set();
 let totalArea=0;
 unit.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const transform=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??position.count;
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();
  for(let i=0;i<count;i+=3){
   a.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(transform);
   b.fromBufferAttribute(position,index?index.getX(i+1):i+1).applyMatrix4(transform);
   c.fromBufferAttribute(position,index?index.getX(i+2):i+2).applyMatrix4(transform);
   const normal=ab.subVectors(b,a).cross(ac.subVectors(c,a));
   const area=normal.length()*.5;if(area<1e-12)continue;
   totalArea+=area;
   triangles.push({a:a.clone(),b:b.clone(),c:c.clone(),normal:normal.clone().normalize(),area:totalArea});
  }
  for(const material of [mesh.material].flat())if(material)oldMaterials.add(material);
  mesh.material=asteroidMaterial(id,transform);
 });
 for(const material of oldMaterials)material.dispose();
 const detail=new T.Group();detail.name='illustrative-surface-boulders';
 detail.userData.description='Illustrative clustered boulders; source asteroid shape is preserved, added positions are not measured.';
 unit.add(detail);
 if(!triangles.length)return detail;
 const seed=id==='ryugu'?379:911,random=rng(seed),noise=new ImprovedNoise(),dummy=new T.Object3D(),up=new T.Vector3(0,1,0),color=new T.Color();
 function sample(){
  const target=random()*totalArea;let low=0,high=triangles.length-1;
  while(low<high){const middle=(low+high)>>1;if(triangles[middle].area<target)low=middle+1;else high=middle;}
  const face=triangles[low],u=Math.sqrt(random()),v=random();
  return {point:face.a.clone().multiplyScalar(1-u).addScaledVector(face.b,u*(1-v)).addScaledVector(face.c,u*v),normal:face.normal};
 }
 const material=asteroidMaterial(id,new T.Matrix4(),true);
 for(let variant=0;variant<6;variant++){
  const geometry=angularBoulder(seed+variant*173),rocks=new T.InstancedMesh(geometry,material,650);
  rocks.name=`global-fractured-rocks-${variant}`;
  for(let i=0;i<rocks.count;i++){
   let site,abundance;
   // Broad rubble provinces contain smaller clusters without regular cell boundaries.
   do{
    site=sample();const p=site.point;
    const broad=noise.noise(p.x*6+seed,p.y*6,p.z*6),local=noise.noise(p.x*19,p.y*19+seed,p.z*19);
    abundance=T.MathUtils.clamp(.5+broad*.8+local*.3,0,1);
   }while(random()>.12+.78*abundance**1.4);
   const fine=i>=210,size=i<18?.021+random()**2*.015:fine?.006+random()**1.6*.009:.014+random()**2*.009;
   dummy.quaternion.setFromUnitVectors(up,site.normal);dummy.rotateY(random()*Math.PI*2);dummy.rotateX((random()-.5)*.4);
   dummy.scale.set(size*(.72+random()*.43),size*((id==='ryugu'?.48:.55)+random()*.32)*(fine?.86:1),size*(.70+random()*.45));
   dummy.position.copy(site.point).addScaledVector(site.normal,size*(fine?-.08:.035));dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
   const shade=.69+random()*.33;color.setRGB(shade,shade,shade);rocks.setColorAt(i,color);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;rocks.computeBoundingSphere();detail.add(rocks);
 }
 return detail;
}
