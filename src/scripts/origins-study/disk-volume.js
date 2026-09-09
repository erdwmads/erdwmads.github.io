import * as T from 'three';

// Qualitative dust extinction and single-scattering illustration, not radiative-transfer data.
export function diskVolume(){
 const material=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,uniforms:{time:{value:0},phase:{value:0},steps:{value:innerWidth<760?36:56}},
 vertexShader:`varying vec3 worldPoint;void main(){vec4 p=modelMatrix*vec4(position,1.);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`
 varying vec3 worldPoint;uniform float time;uniform float phase;uniform int steps;
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+31.32);return fract((p.x+p.y)*p.z);}
 float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float density(vec3 p){
   float r=length(p.xz),h=.065+.30*pow(r/6.,1.3);
   float angle=time*.045/pow(r+.45,1.5);mat2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
   vec2 q=spin*p.xz;vec3 v=vec3(q.x,p.y*3.,q.y);
   float f=n3(v*2.)*.60+n3(v*5.1)*.26+n3(v*13.)*.14;
   float vertical=exp(-pow(p.y/h,2.)*1.6);
   float inner=smoothstep(.25,.55,r),outer=1.-smoothstep(5.,6.7,r);
   return vertical*inner*outer*(.18+pow(f,2.)*3.)*1.4;
 }
 void main(){
   vec3 rd=normalize(worldPoint-cameraPosition),ro=cameraPosition;
   vec3 inv=1./rd,lo=(-vec3(7.,1.5,7.)-ro)*inv,hi=(vec3(7.,1.5,7.)-ro)*inv;
   vec3 mn=min(lo,hi),mx=max(lo,hi);float entry=max(max(mn.x,mn.y),mn.z),leave=min(min(mx.x,mx.y),mx.z);
   if(leave<=max(entry,0.))discard;
   float stepSize=(leave-max(entry,0.))/float(steps),t=max(entry,0.)+stepSize*.5;
   vec3 sum=vec3(0.);float trans=1.;
   for(int i=0;i<64;i++){if(i>=steps||trans<.025)break;vec3 p=ro+rd*t;float r=length(p.xz);float d=density(p);
     float alpha=1.-exp(-d*stepSize*2.1);
     float upper=abs(p.y)/(.09+.30*pow(r/6.,1.3));
     float light=.08+.45*smoothstep(.05,1.5,upper);
     vec3 dust=mix(vec3(.63,.40,.21),vec3(.34,.41,.44),smoothstep(.8,5.8,r));
     dust=mix(dust,mix(vec3(.81,.44,.12),vec3(.13,.55,.62),smoothstep(.8,5.8,r)),phase*.55);
     light+=.18/(r*.5+.25);
     sum+=trans*alpha*dust*light;trans*=1.-alpha;t+=stepSize;
   }
   float a=1.-trans;if(a<.003)discard;gl_FragColor=vec4(sum/max(a,.001),a);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
 }`});
 const mesh=new T.Mesh(new T.BoxGeometry(14,3,14),material);mesh.renderOrder=1;
 return{mesh,update(t,phase){material.uniforms.time.value=t*24;material.uniforms.phase.value=phase?1:0;}};
}
