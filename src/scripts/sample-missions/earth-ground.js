import * as T from 'three';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';

// Broad, low-contrast terrain variation; mipmaps prevent the ground from
// turning into a pixel grid as the physical camera approaches the capsule.
export function earthGroundMaterial(color){
 const size=256,data=new Uint8Array(size*size*4),noise=new ImprovedNoise();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=noise.noise(u*7,3,v*7)*.65+noise.noise(u*24,8,v*24)*.25+noise.noise(u*70,1,v*70)*.1;
  const value=Math.round(218+n*52),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const map=new T.DataTexture(data,size,size,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(48,48);map.anisotropy=8;map.needsUpdate=true;
 const grain=map.clone();grain.repeat.set(600,600);grain.needsUpdate=true;
 return new T.MeshStandardMaterial({color,map,bumpMap:grain,bumpScale:.000003,roughness:1});
}

const recoveryNoise=new ImprovedNoise();
// Region characteristics follow recovery photographs, not surveyed landing imagery:
// NASA: https://science.nasa.gov/blogs/osiris-rex/2023/09/24/osiris-rex-sample-capsule-released-for-landing-on-earth/
// JAXA: https://www.hayabusa2.jaxa.jp/en/topics/20201204_ts4/
// Elevations, scrub locations and textures below are explicitly illustrative.
export function recoveryGroundHeight(id,x,z){
 const r=Math.hypot(x,z),flat=T.MathUtils.smoothstep(r,.006,.018);
 const curve=-r*r/(6371+Math.sqrt(Math.max(1,6371*6371-r*r)));
 const regional=recoveryNoise.noise(x*.55,4,z*.55)*.00035+recoveryNoise.noise(x*35,1,z*35)*.000012;
 const distant=T.MathUtils.smoothstep(r,5,12);
 const ridge=Math.exp(-(((x-20)/5)**2))*(.62+.16*recoveryNoise.noise(x*.2,8,z*.32));
 const foothills=Math.exp(-(((x-11)/4)**2))*(.065+.025*recoveryNoise.noise(x*.3,2,z*.4));
 return flat*(curve+regional+distant*(id==='osiris-rex'?ridge+foothills:(ridge+foothills)*.045));
}

function recoveryMaterial(id){
 const material=new T.MeshStandardMaterial({color:id==='hayabusa2'?0xa58b69:0xb8ae96,roughness:.97});
 material.userData.detailScalesM=[12.5,1.25,1/18,.0125];
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 recoveryPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nrecoveryPoint=position.xz*1000.;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 recoveryPoint;
   float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(groundHash(i),groundHash(i+vec2(1,0)),f.x),mix(groundHash(i+vec2(0,1)),groundHash(i+vec2(1,1)),f.x),f.y);}
   float groundBand(vec2 p,float frequency){float footprint=max(fwidth(p.x),fwidth(p.y))*frequency;return mix(groundNoise(p*frequency),.5,smoothstep(.3,1.,footprint));}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   float soilPatch=groundBand(recoveryPoint,.08),soilClod=groundBand(recoveryPoint,.8),soilPebble=groundBand(recoveryPoint,18.),soilGrain=groundBand(recoveryPoint,80.);
   // Continuous, low-contrast grain: avoid thresholded colour islands that
   // read as camouflage, while filtering subpixel texture into its mean.
   float groundRelief=soilClod*.0000008+soilPebble*.0000007+soilGrain*.00000018;
   diffuseColor.rgb*=.98+(soilPatch-.5)*.025+(soilClod-.5)*.035+(soilPebble-.5)*.12+(soilGrain-.5)*.10;
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 groundDx=dFdx(-vViewPosition),groundDy=dFdy(-vViewPosition);
   vec3 groundR1=cross(groundDy,normal),groundR2=cross(normal,groundDx);
   float groundDet=dot(groundDx,groundR1);
   vec3 groundGradient=sign(groundDet)*(dFdx(groundRelief)*groundR1+dFdy(groundRelief)*groundR2);
   normal=normalize(max(abs(groundDet),1.e-22)*normal-groundGradient*.55);
  `).replace('#include <fog_fragment>',T.ShaderChunk.fog_fragment.replace('fogDensity * fogDensity * vFogDepth * vFogDepth','fogDensity * fogDensity * vFogDepth * vFogDepth * .32'));
 };
 material.customProgramCacheKey=()=>`recovery-multiscale-${id}-v3`;
 return material;
}

/** Kilometre geometry with dense local detail and a curved 320-km regional horizon. */
export function createRecoveryGround(id){
 const group=new T.Group();group.name='recovery-ground';group.userData.units='km';
 group.userData.provenance='Illustrative regional terrain based on NASA/JAXA recovery photographs; not landing-site imagery or measured topography.';
 const radialSteps=160,sectors=192,positions=[],indices=[];
 // Exponential rings devote vertices to the metres around the capsule while
 // preserving broad relief and Earth curvature all the way to the horizon.
 for(let row=0;row<=radialSteps;row++){
  const radius=.008*Math.expm1(row/radialSteps*Math.log1p(320/.008));
  for(let col=0;col<=sectors;col++){
   const angle=col/sectors*Math.PI*2,x=radius*Math.cos(angle),z=radius*Math.sin(angle);
   positions.push(x,recoveryGroundHeight(id,x,z),z);
   if(row<radialSteps&&col<sectors){const a=row*(sectors+1)+col,b=a+sectors+1;indices.push(a,a+1,b,a+1,b+1,b);}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const surface=new T.Mesh(geometry,recoveryMaterial(id));surface.name='recovery-surface';surface.receiveShadow=true;group.add(surface);
 const random=n=>{const value=Math.sin(n*127.1+(id==='hayabusa2'?17:43))*43758.5453;return value-Math.floor(value);};
 const dummy=new T.Object3D(),color=new T.Color();
 const gravel=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0x9b927e,roughness:.94}),1000);
 gravel.name='recovery-gravel';gravel.receiveShadow=true;gravel.castShadow=true;
 const contactMaterial=new T.MeshBasicMaterial({color:0x393125,transparent:true,opacity:.18,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 contactMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 contactPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\ncontactPoint=position.xz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 contactPoint;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=1.-smoothstep(.3,1.,length(contactPoint));');
 };
 contactMaterial.customProgramCacheKey=()=> 'recovery-pebble-contact-v1';
 const contacts=new T.InstancedMesh(new T.CircleGeometry(1,12).rotateX(-Math.PI/2),contactMaterial,gravel.count),contact=new T.Object3D(),vertex=new T.Vector3();
 contacts.name='gravel-contact-shadows';
 const gravelVertices=gravel.geometry.attributes.position;
 for(let i=0;i<gravel.count;i++){
  const radius=.0011+.028*random(i*7+1)**2,angle=random(i*7+2)*Math.PI*2,x=radius*Math.cos(angle),z=radius*Math.sin(angle),size=.000004+.000025*random(i*7+3)**2;
  dummy.position.set(x,0,z);dummy.scale.set(size,size*.6,size*.8);dummy.rotation.set(random(i*7+4),random(i*7+5)*Math.PI,random(i*7+6));dummy.updateMatrix();
  let bottom=Infinity;for(let j=0;j<gravelVertices.count;j++){vertex.fromBufferAttribute(gravelVertices,j).applyMatrix4(dummy.matrix);bottom=Math.min(bottom,vertex.y);}
  const ground=recoveryGroundHeight(id,x,z);dummy.position.y=ground-bottom-size*.04;dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);
  contact.position.set(x,ground+.0000001,z);contact.scale.set(size*1.15,1,size*.9);contact.rotation.y=dummy.rotation.y;contact.updateMatrix();contacts.setMatrixAt(i,contact.matrix);
  color.set(id==='hayabusa2'?0x9d8060:0xb6ad98).multiplyScalar(.6+random(i*7+8)*.7);gravel.setColorAt(i,color);
 }
 group.add(contacts,gravel);
 // Small branching dry scrub has a real decimetre envelope and stays beyond
 // the parachute's landing patch. It gives scale without oversized foreground rocks.
 const twigPositions=[];
 for(let i=0;i<18;i++){
  const a=i*2.39996,r=.1+.12*(i%3),h=.12+.15*((i*7)%5)/5;
  const x=Math.cos(a)*r,z=Math.sin(a)*r;
  twigPositions.push(0,0,0,x-.015,h,z,x+.015,h,z,x*.35,h*.3,z*.35,x*.8-.025,h*.7,z*.8,x*.8+.025,h*.7,z*.8);
 }
 const scrubGeometry=new T.BufferGeometry();scrubGeometry.setAttribute('position',new T.Float32BufferAttribute(twigPositions,3));scrubGeometry.computeVertexNormals();
 const scrub=new T.InstancedMesh(scrubGeometry,new T.MeshStandardMaterial({color:id==='hayabusa2'?0x6c674b:0x778077,roughness:1,side:T.DoubleSide}),140);
 scrub.name='recovery-scrub';scrub.receiveShadow=true;
 for(let i=0;i<scrub.count;i++){
  const radius=.008+.2*random(i*5+9)**2,angle=random(i*5+10)*Math.PI*2,x=radius*Math.cos(angle),z=radius*Math.sin(angle);
  dummy.position.set(x,recoveryGroundHeight(id,x,z),z);dummy.scale.setScalar(.001*(.65+random(i*5+11)*1.2));dummy.rotation.set(0,angle,0);dummy.updateMatrix();scrub.setMatrixAt(i,dummy.matrix);
 }
 group.add(scrub);return group;
}
