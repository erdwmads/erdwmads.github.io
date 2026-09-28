import * as T from 'three';
import {sciLayout} from './motion.js';

// JAXA's SCI reference describes the launched copper projectile as a hollow
// spherical shell, ~13 cm across, deformed from the original 30 cm disc.
// https://www.hayabusa2.jaxa.jp/en/topics/20200320_science/paper/Arakawa_Science2020_en.pdf
// The trailing opening and wall profile are illustrative, not recovered flight CAD.
export function createSciProjectile(){
 const radius=sciLayout.projectileRadius;
 const geometry=new T.SphereGeometry(radius,32,24,0,Math.PI*2,Math.PI*.2,Math.PI*.8);
 const material=new T.MeshStandardMaterial({color:0xb97242,metalness:.8,roughness:.38,side:T.DoubleSide});
 const projectile=new T.Mesh(geometry,material);projectile.name='sci-formed-copper-shell';
 projectile.castShadow=true;projectile.userData.contactOffset=radius;
 return projectile;
}

// Screen-facing soft glow (scene units); marks the few-pixel projectile and the contact flash.
export function createGlowBillboard(color,size=1){
 const material=new T.ShaderMaterial({uniforms:{color:{value:new T.Color(color)},strength:{value:1}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));gl_Position=projectionMatrix*center;}`,
  fragmentShader:'varying vec2 vUv;uniform vec3 color;uniform float strength;void main(){float r=length(vUv-.5)*2.;float a=(exp(-r*r*9.)*.9+exp(-r*r*2.2)*.25)*(1.-smoothstep(.75,1.,r));gl_FragColor=vec4(color*1.6,a*strength);}'});
 const glow=new T.Mesh(new T.PlaneGeometry(size,size),material);glow.name='sci-glow';glow.renderOrder=2;
 glow.userData.setStrength=value=>{material.uniforms.strength.value=value;};
 return glow;
}

// Illustrative ejecta curtain: an inverted cone of fine regolith rising from the crater rim, as
// DCAM3 imaged it. Shape and timing are explanatory, not a reconstruction of the observed curtain.
export function createEjectaCurtain(){
 const uniforms={base:{value:1},height:{value:1},spread:{value:1},opacity:{value:0},phase:{value:0}};
 const geometry=new T.CylinderGeometry(1,1,1,72,10,true);geometry.translate(0,.5,0);
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
  vertexShader:`uniform float base;uniform float height;uniform float spread;varying float vHeight;varying vec2 vAround;
   void main(){vHeight=position.y;vAround=normalize(position.xz);float r=base+position.y*height*spread;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(vAround.x*r,position.y*height,vAround.y*r,1.);}`,
  fragmentShader:`uniform float opacity;uniform float phase;varying float vHeight;varying vec2 vAround;
   float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
   void main(){float rays=noise(vec3(vAround*7.,vHeight*2.5-phase))*.6+noise(vec3(vAround*19.+3.,vHeight*6.-phase*1.7))*.4;
    float density=pow(1.-vHeight,1.4)*smoothstep(0.,.06,vHeight)*(.35+.65*smoothstep(.25,.75,rays));
    gl_FragColor=vec4(mix(vec3(.46,.43,.38),vec3(.72,.68,.6),vHeight),opacity*density);}`});
 const mesh=new T.Mesh(geometry,material);mesh.name='sci-ejecta-curtain';mesh.renderOrder=1;
 return {mesh,update({base,height,spread=1,opacity,phase=0}){uniforms.base.value=base;uniforms.height.value=height;uniforms.spread.value=spread;uniforms.opacity.value=opacity;uniforms.phase.value=phase;}};
}
