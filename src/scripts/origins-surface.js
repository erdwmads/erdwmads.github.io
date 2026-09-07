import * as THREE from 'three';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';

const noise=new ImprovedNoise();

// Procedural relief is illustrative texture, not a measured meteorite surface.
export function sectionRelief(x,y) {
  const pore=Math.max(0,noise.noise(x*19,y*19,4)-.16);
  return .012*noise.noise(x*7,y*7,2)+.004*noise.noise(x*43,y*43,9)-pore*.09;
}

export function createOriginSurface(section=false) {
  const size=512,albedo=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size*2-1,v=y/size*2-1;
    const coarse=noise.noise(u*8,v*8,2),fine=noise.noise(u*95,v*95,7);
    const pore=Math.max(0,noise.noise(u*19,v*19,4)-.16);
    const fleck=Math.max(0,noise.noise(u*150,v*150,12)-.32);
    const value=THREE.MathUtils.clamp((section?132:152)+coarse*30+fine*30-pore*110+fleck*95,36,220);
    const relief=section?sectionRelief(u,v):coarse*.025+fine*.013-pore*.055;
    const i=(y*size+x)*4;
    albedo[i]=value;albedo[i+1]=value*.99;albedo[i+2]=value*.95;albedo[i+3]=255;
    height[i]=height[i+1]=height[i+2]=THREE.MathUtils.clamp(145+relief*1700,0,255);height[i+3]=255;
  }
  function texture(data,colorSpace) {
    const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    map.colorSpace=colorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
    map.generateMipmaps=true;map.needsUpdate=true;return map;
  }
  return {map:texture(albedo,THREE.SRGBColorSpace),bumpMap:texture(height,THREE.NoColorSpace),bumpScale:section?.028:.055,roughness:.92};
}

export function createOriginCarbonates(random) {
  const group=new THREE.Group(),c=.27,s=Math.sqrt(1-c*c);
  const basis=[new THREE.Vector3(1,0,0),new THREE.Vector3(c,s,0),new THREE.Vector3(c,(c-c*c)/s,Math.sqrt(1-c*c-((c-c*c)/s)**2))];
  const points=[];
  for(const a of [-.5,.5])for(const b of [-.5,.5])for(const d of [-.5,.5])for(let edge=0;edge<3;edge++) {
    const v=[a,b,d].map((value,i)=>value*(i===edge?1:.97));
    points.push(basis[0].clone().multiplyScalar(v[0]).addScaledVector(basis[1],v[1]).addScaledVector(basis[2],v[2]));
  }
  const geometry=new ConvexGeometry(points);
  const uv=[],p=geometry.attributes.position,n=geometry.attributes.normal;
  for(let i=0;i<p.count;i++) {
    if(Math.abs(n.getZ(i))>Math.max(Math.abs(n.getX(i)),Math.abs(n.getY(i))))uv.push(p.getX(i)+.5,p.getY(i)+.5);
    else if(Math.abs(n.getX(i))>Math.abs(n.getY(i)))uv.push(p.getZ(i)+.5,p.getY(i)+.5);else uv.push(p.getX(i)+.5,p.getZ(i)+.5);
  }
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const size=256,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size,mottle=noise.noise(u*16,v*16,3),terrace=Math.sin((u+v*.32)*240+mottle*1.4);
    const value=198+mottle*12+(terrace>.87?-13:2),i=(y*size+x)*4;
    pixels[i]=value;pixels[i+1]=value*.98;pixels[i+2]=value*.92;pixels[i+3]=255;
  }
  const map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
  for(let i=0;i<16;i++) {
    const crystal=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({
      map,color:new THREE.Color().setHSL(.105,.12,.54+random()*.12),roughness:.38,metalness:0,flatShading:true,clearcoat:.14,clearcoatRoughness:.3,
      emissive:0xa48442,emissiveIntensity:.025
    }));
    const angle=i*2.4,r=i===0?0:.20+random()*.42,size=i===0?.65:i<6?.30+random()*.30:.12+random()*.24;
    crystal.position.set(Math.cos(angle)*r,Math.sin(angle)*r,.10+size*.25);
    crystal.scale.setScalar(size);crystal.rotation.set(.25+random()*.5,-.35+random()*.8,angle*.5);
    group.add(crystal);
  }
  return group;
}
