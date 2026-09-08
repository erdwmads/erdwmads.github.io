import * as THREE from 'three';

const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const vertex=`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;
void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;

export function createSolarJourney(host){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(46,1,.01,220);
 const materials=[],geometries=[],textures=[],planets=[],rings=[];
 const group=new THREE.Group();scene.add(group);
 let disposed=false;
 const loader=new THREE.TextureLoader(),pending=[];
 function texture(url,color=true){
  let resolve,reject;
  pending.push(new Promise((yes,no)=>{resolve=yes;reject=no;}));
  const map=loader.load(url,()=>{if(disposed)map.dispose();resolve();},undefined,reject);
  if(color)map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=4;textures.push(map);
  return map;
 }
 const day=texture('/assets/img/arrival/earth-day.jpg'),night=texture('/assets/img/arrival/earth-night.jpg'),cloudMap=texture('/assets/img/arrival/earth-clouds.png',false);
 const sphere=new THREE.SphereGeometry(1,96,64);geometries.push(sphere);
 function material(value){materials.push(value);return value;}
 function globe(radius,mat,parent=group){const mesh=new THREE.Mesh(sphere,material(mat));mesh.scale.setScalar(radius);parent.add(mesh);return mesh;}
 const sun=globe(.72,new THREE.ShaderMaterial({transparent:true,uniforms:{fade:{value:0},time:{value:0}},vertexShader:vertex,
  fragmentShader:`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;uniform float fade;uniform float time;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){float limb=pow(max(0.,dot(normalize(vNormal),normalize(cameraPosition-vWorld))),.3);float grain=hash(floor(vUv*850.+vec2(time,0.)));vec3 col=mix(vec3(1.,.35,.065),vec3(1.,.88,.48),limb)*(.91+.09*grain);gl_FragColor=vec4(col,fade);
   #include <colorspace_fragment>
   }` }));
 globe(.79,new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{fade:{value:0}},vertexShader:vertex,fragmentShader:`varying vec3 vNormal;varying vec3 vWorld;uniform float fade;
  void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),5.);gl_FragColor=vec4(1.,.49,.13,rim*.24*fade);}` }));
 scene.add(new THREE.AmbientLight(0xc9d9e9,.32));
 const sunlight=new THREE.PointLight(0xfff4df,3.0,0,0);scene.add(sunlight);
 // Compressed orbital radii and illustrative phases, not a dated ephemeris.
 const bodies=[
  ['Mercury',1.8,.095,0xa8a29a,2.6,1.6],['Venus',2.65,.19,0xdec49a,4.0,1.15],
  ['Earth',3.6,.30,0x6994c4,-.65,.8],['Mars',4.65,.145,0xbb7051,1.7,.65],
  ['Jupiter',6.3,.56,0xc2a98f,3.6,.32],['Saturn',8.15,.46,0xcfc299,.45,.24],
  ['Uranus',10,.29,0x9fc9d0,2.5,.17],['Neptune',11.6,.28,0x557fab,5.5,.13]
 ];
 let earth;
 for(const [name,radius,size,color,phase,speed] of bodies){
  const orbit=new THREE.BufferGeometry().setFromPoints(Array.from({length:193},(_,i)=>new THREE.Vector3(Math.cos(i/192*Math.PI*2)*radius,0,Math.sin(i/192*Math.PI*2)*radius)));
  geometries.push(orbit);
  const line=new THREE.LineLoop(orbit,material(new THREE.LineBasicMaterial({color:name==='Earth'?0x859ea8:0x4d5c66,transparent:true,opacity:0,depthWrite:false})));
  group.add(line);rings.push(line);
  let mesh;
  if(name==='Earth'){
   earth=new THREE.Group();group.add(earth);mesh=earth;
   const surface=globe(size,new THREE.ShaderMaterial({transparent:true,uniforms:{day:{value:day},night:{value:night},fade:{value:0}},vertexShader:vertex,
    fragmentShader:`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;uniform sampler2D day;uniform sampler2D night;uniform float fade;
    void main(){vec3 n=normalize(vNormal),l=normalize(-vWorld),v=normalize(cameraPosition-vWorld);float ndl=dot(n,l);vec3 albedo=texture2D(day,vUv).rgb;
     float light=pow(max(ndl,0.),.72);vec3 col=albedo*(.012+light*1.15);
     col+=texture2D(night,vUv).rgb*(1.-smoothstep(-.18,.08,ndl))*.65;
     float ocean=smoothstep(.015,.075,albedo.b-albedo.r)*smoothstep(.005,.05,albedo.b-albedo.g);
     float spec=pow(max(dot(n,normalize(l+v)),0.),70.)*ocean*.17*max(ndl,0.);
     col+=vec3(.75,.87,1.)*spec;
     float rim=pow(1.-max(dot(n,v),0.),4.)*smoothstep(-.3,.5,ndl);
     col+=vec3(.05,.22,.42)*rim*.38;
     gl_FragColor=vec4(col,fade);
     #include <colorspace_fragment>
    }`}),earth);
   surface.rotation.z=.16;
   const clouds=globe(size*1.004,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{clouds:{value:cloudMap},fade:{value:0}},vertexShader:vertex,
    fragmentShader:`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;uniform sampler2D clouds;uniform float fade;
    void main(){vec4 tex=texture2D(clouds,vUv);float light=pow(max(dot(normalize(vNormal),normalize(-vWorld)),0.),.7);gl_FragColor=vec4(vec3(.035+light*.9),tex.r*tex.a*.78*fade);
    #include <colorspace_fragment>
    }`}),earth);
   clouds.rotation.z=.16;
   globe(size*1.015,new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{fade:{value:0}},vertexShader:vertex,
    fragmentShader:`varying vec3 vNormal;varying vec3 vWorld;uniform float fade;
    void main(){vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);float rim=pow(1.-abs(dot(n,v)),4.);float lit=smoothstep(-.35,.55,dot(n,normalize(-vWorld)));gl_FragColor=vec4(.16,.48,.86,rim*lit*.42*fade);}`}),earth);
   earth.userData={surface,clouds};
  }else{
   const mat=name==='Jupiter'||name==='Saturn'?new THREE.ShaderMaterial({transparent:true,uniforms:{fade:{value:0},base:{value:new THREE.Color(color)}},vertexShader:vertex,
    fragmentShader:`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;uniform float fade;uniform vec3 base;
    void main(){float latitude=vUv.y+sin(vUv.x*24.+vUv.y*12.)*.004;float bands=sin(latitude*93.)*.09+sin(latitude*43.)*.06+sin(latitude*270.)*.025;float light=pow(max(dot(normalize(vNormal),normalize(-vWorld)),0.),.65);vec3 col=(base+vec3(bands,bands*.83,bands*.62))*(.065+light);gl_FragColor=vec4(col,fade);
    #include <colorspace_fragment>
    }`}):new THREE.MeshStandardMaterial({color,roughness:1,transparent:true});
   mesh=globe(size,mat);
   if(name==='Saturn'){
    const geometry=new THREE.RingGeometry(1.35,2.12,96);geometries.push(geometry);
    const ring=new THREE.Mesh(geometry,material(new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{fade:{value:0}},
     vertexShader:'varying float radius;void main(){radius=length(position.xy);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
     fragmentShader:'varying float radius;uniform float fade;void main(){float band=.48+.13*sin(radius*180.)+.09*sin(radius*61.);float gap=1.-.9*exp(-pow((radius-1.89)/.025,2.));float edge=smoothstep(1.35,1.4,radius)*(1.-smoothstep(2.07,2.12,radius));gl_FragColor=vec4(.62,.58,.47,band*gap*edge*fade);}' })));
    ring.rotation.x=-Math.PI/2+.30;mesh.add(ring);
   }
  }
  planets.push({name,mesh,radius,size,phase,speed});
 }
 const labels=document.createElement('div');labels.className='celestial-labels';labels.setAttribute('aria-hidden','true');host.append(labels);
 const tags=['Sun',...bodies.map(b=>b[0])].map(name=>{const el=document.createElement('span');el.textContent=name;labels.append(el);return el;});
 const overview=new THREE.Vector3(),offset=new THREE.Vector3(),target=new THREE.Vector3(),projected=new THREE.Vector3(),destination=new THREE.Vector3();
 const labelBodies=[sun,...planets.map(b=>b.mesh)],otherBodies=planets.filter(body=>body.name!=='Earth');
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const d=Math.max(29,13/(Math.tan(THREE.MathUtils.degToRad(23))*camera.aspect));overview.set(0,d*.48,d*.88);}
 resize();
 function render(renderer,p){
  const appear=smooth(.245,.34,p),zoom=smooth(.49,.77,p),fade=appear*(1-smooth(.89,1,p));
  const orbitFade=smooth(.285,.385,p)*(1-smooth(.52,.69,p));
  group.visible=fade>.001;labels.style.opacity=String(orbitFade);
  if(!group.visible)return;
  planets.forEach(body=>{
   const angle=body.phase+smooth(.27,.59,p)*body.speed*.32;
   body.mesh.position.set(Math.cos(angle)*body.radius,0,Math.sin(angle)*body.radius);
   if(body.name!=='Earth')body.mesh.rotation.y=p*.9;
  });
  earth.userData.surface.rotation.y=1.44+p*.90;earth.userData.clouds.rotation.y=1.45+p*.93;
  materials.forEach(m=>{if(m.uniforms?.fade)m.uniforms.fade.value=fade;else m.opacity=fade;});
  const systemFade=fade*(1-smooth(.58,.73,p));
  otherBodies.forEach(body=>body.mesh.traverse(mesh=>{if(mesh.material?.uniforms?.fade)mesh.material.uniforms.fade.value=systemFade;else if(mesh.material)mesh.material.opacity=systemFade;}));
  rings.forEach((ring,i)=>ring.material.opacity=orbitFade*(i===2?.70:.28));
  sun.material.uniforms.time.value=p*2;
  const fit=Math.max(1.08,.30/(Math.tan(THREE.MathUtils.degToRad(23))*camera.aspect)*1.32);
  offset.set(-.7,.45,2).normalize().multiplyScalar(fit);
  destination.copy(earth.position).add(offset);
  // A logarithmic approach spends enough time on both the planetary system and the globe.
  const travel=1-Math.pow(1-zoom,2.0);
  const arrivalDistance=1+1.1*(1-smooth(.245,.54,p));
  camera.position.copy(overview).multiplyScalar(arrivalDistance).lerp(destination,travel);
  camera.position.x-=Math.sin(zoom*Math.PI)*1.1;
  target.copy(earth.position).multiplyScalar(smooth(.47,.69,p));
  target.x-=smooth(.80,.96,p)*(innerWidth<700?.025:.20);
  camera.lookAt(target);camera.updateMatrixWorld();
  if(orbitFade>.001)labelBodies.forEach((mesh,i)=>{
   projected.copy(mesh.position).project(camera);
   tags[i].style.left=`${(projected.x*.5+.5)*innerWidth}px`;
   const size=i===0?.72:planets[i-1].size;
   const radius=size/camera.position.distanceTo(mesh.position)*innerHeight/(2*Math.tan(THREE.MathUtils.degToRad(23)));
   tags[i].style.top=`${(-projected.y*.5+.5)*innerHeight+(i===0?-radius-21:radius+9)}px`;
   tags[i].hidden=projected.z>1||Math.abs(projected.x)>.94||Math.abs(projected.y)>.90||(innerWidth<700&&i!==0&&i!==3);
  });
  renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;
 }
 async function prepare(renderer){
  await Promise.all(pending);
  for(const map of textures){
   if(disposed)return;
   renderer.initTexture(map);
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(!disposed)renderer.compile(scene,camera);
 }
 return {prepare,resize,render,dispose(){disposed=true;labels.remove();textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
