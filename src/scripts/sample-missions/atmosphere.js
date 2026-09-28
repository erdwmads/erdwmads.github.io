import * as T from 'three';

// Soft screen-facing corona: the outer boundary reaches zero opacity.
export function createCorona(){
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy;gl_Position=projectionMatrix*center;}',
 fragmentShader:'varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float halo=exp(-r*r*7.)*.2+exp(-pow((r-.40)/.07,2.))*.14;halo*=1.-smoothstep(.65,1.,r);gl_FragColor=vec4(1.,.48,.12,halo);}'});
 return new T.Mesh(new T.PlaneGeometry(3.2,3.2),material);
}

// Entry glow in the capsule frame (+Y trails behind the heat shield): a thin, hot shock cap
// over the shield and a long wake of flow-aligned streaks. Brightness follows the physics
// radiance envelope (earth-physics `heat`), so the glow fades as the capsule slows.
export function createEntryWake(){
 const shock=[new T.Vector2(0,-.17),new T.Vector2(.2,-.155),new T.Vector2(.36,-.09),new T.Vector2(.43,.02),new T.Vector2(.44,.13),new T.Vector2(.4,.24)];
 const wake=[new T.Vector2(.42,.02),new T.Vector2(.45,.3),new T.Vector2(.4,.85),new T.Vector2(.3,1.7),new T.Vector2(.17,2.7),new T.Vector2(.05,3.6),new T.Vector2(0,3.9)];
 const uniforms={phase:{value:0},intensity:{value:1}};
 const noise=`
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}`;
 const vertexShader='varying vec3 vp;varying vec3 vn;varying vec3 eye;void main(){vp=position;vn=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);eye=-p.xyz;gl_Position=projectionMatrix*p;}';
 const material=(fragment)=>new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,vertexShader,fragmentShader:`varying vec3 vp;varying vec3 vn;varying vec3 eye;uniform float phase;uniform float intensity;${noise}\nvoid main(){${fragment}}`});
 // Stagnation region white-hot, cooling to orange at the shoulder.
 const cap=material(`float facing=abs(dot(normalize(vn),normalize(eye))),rim=pow(1.-facing,1.3);
  float shoulder=smoothstep(-.17,.2,vp.y),flicker=.85+.15*noise(vec3(normalize(vp.xz+1e-4)*1.5,vp.y*9.+phase*40.));
  vec3 color=mix(vec3(6.,4.2,2.2),vec3(3.4,.9,.16),shoulder);
  gl_FragColor=vec4(color,intensity*(.22+.5*rim)*(1.-smoothstep(.12,.26,vp.y))*flicker);`);
 // Streaks run along the flow (+Y); the wake narrows, reddens and fades downstream.
 const trail=material(`float h=max(0.,vp.y),rim=pow(1.-abs(dot(normalize(vn),normalize(eye))),1.4);
  // Noise on the unit circle avoids an angular seam.
  vec2 around=normalize(vp.xz+1e-4);float streak=noise(vec3(around*2.4,h*1.3-phase*38.))*.65+noise(vec3(around*6.2+4.,h*3.1-phase*61.))*.35;
  float fade=pow(max(0.,1.-h/3.9),1.6)*smoothstep(0.,.18,h);
  vec3 color=mix(vec3(4.2,1.35,.3),vec3(1.9,.26,.06),smoothstep(.2,2.6,h));
  gl_FragColor=vec4(color,intensity*fade*(.08+.42*rim)*smoothstep(.28,.82,streak));`);
 const group=new T.Group();group.add(new T.Mesh(new T.LatheGeometry(shock,48),cap),new T.Mesh(new T.LatheGeometry(wake,48,0,Math.PI*2),trail));
 return {group,update(p,intensity=1){uniforms.phase.value=p;uniforms.intensity.value=intensity;}};
}
