import * as T from 'three';

// Soft screen-facing corona: the outer boundary reaches zero opacity.
export function createCorona(){
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy;gl_Position=projectionMatrix*center;}',
 fragmentShader:'varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float halo=exp(-r*r*7.)*.2+exp(-pow((r-.40)/.07,2.))*.14;halo*=1.-smoothstep(.65,1.,r);gl_FragColor=vec4(1.,.48,.12,halo);}'});
 return new T.Mesh(new T.PlaneGeometry(3.2,3.2),material);
}

export function createEntryWake(){
 const points=[new T.Vector2(0,-.13),new T.Vector2(.25,-.10),new T.Vector2(.39,.02),new T.Vector2(.43,.22),new T.Vector2(.39,.64),new T.Vector2(.28,1.25),new T.Vector2(.07,2.05),new T.Vector2(0,2.3)];
 const material=new T.ShaderMaterial({uniforms:{phase:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
 vertexShader:'varying vec3 vp;varying vec3 vn;varying vec3 eye;void main(){vp=position;vn=normalize(normalMatrix*normal);vec3 flow=position;flow.x+=sin(position.y*5.)*max(0.,position.y)*.035;vec4 p=modelViewMatrix*vec4(flow,1.);eye=-p.xyz;gl_Position=projectionMatrix*p;}',
 fragmentShader:`
 varying vec3 vp;varying vec3 vn;varying vec3 eye;uniform float phase;
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
 void main(){float h=max(0.,vp.y+.13),rim=pow(1.-abs(dot(normalize(vn),normalize(eye))),1.6);
 float turbulence=noise(vp*vec3(16.,6.,16.)-vec3(0.,phase*70.,0.));
 float envelope=smoothstep(0.,.08,phase)*(1.-smoothstep(.36,.48,phase));
 float bow=exp(-h*6.),wake=pow(max(0.,1.-h/2.43),1.7);
 float feather=1.-smoothstep(.5,1.9,h);
 float opacity=envelope*(bow*.36+rim*wake*.48*smoothstep(.36,.78,turbulence))*feather;
 gl_FragColor=vec4(mix(vec3(2.8,.48,.08),vec3(5.,2.4,.6),bow),opacity);
 }`});
 const group=new T.Group(),shell=new T.Mesh(new T.LatheGeometry(points,48),material);group.add(shell);
 return {group,update(p){material.uniforms.phase.value=p;}};
}
