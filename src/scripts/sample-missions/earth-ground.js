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
