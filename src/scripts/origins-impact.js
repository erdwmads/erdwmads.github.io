import * as THREE from 'three';
import {accretionState} from './origins-process.js';

export function createImpactEjecta(pieces,random,light) {
  const count=pieces.length*32,positions=new Float32Array(count*3),alphas=new Float32Array(count);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('alpha',new THREE.BufferAttribute(alphas,1).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{tint:{value:new THREE.Color(light?0x74817f:0xbcc5c0)}},
    vertexShader:'attribute float alpha; varying float opacity; void main(){opacity=alpha; vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_PointSize=clamp(42.0/max(1.0,-p.z),2.0,16.0);}',
    fragmentShader:'uniform vec3 tint; varying float opacity; void main(){float r=length(gl_PointCoord-.5)*2.0; if(r>1.0)discard; gl_FragColor=vec4(tint,opacity*(1.0-smoothstep(.1,1.0,r)));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
  });
  const dust=new THREE.Points(geometry,material);dust.name='origin-impact-dust';dust.frustumCulled=false;
  const group=new THREE.Group(),helper=new THREE.Object3D();group.add(dust);
  const chips=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xadb3ab,roughness:.92}),count/4);
  chips.name='origin-contact-chips';chips.frustumCulled=false;group.add(chips);
  const directions=Array.from({length:count},()=>new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(.3+random()*.6));
  const center=new THREE.Vector3(),normal=new THREE.Vector3();
  function update(phase,time) {
    group.visible=phase===1;
    if(!group.visible)return;
    pieces.forEach((piece,i)=>{
      const event=accretionState(time,piece.userData.assemblyRank),age=Math.max(0,event.age),distance=(1-Math.exp(-age*13))*.55;
      center.copy(piece.userData.contact||piece.userData.rest);normal.copy(center).normalize();center.addScaledVector(normal,.012);
      for(let j=0;j<32;j++) {
        const index=i*32+j,direction=directions[index],at=index*3;
        positions[at]=center.x+direction.x*distance+normal.x*distance*.4;
        positions[at+1]=center.y+direction.y*distance+normal.y*distance*.4;
        positions[at+2]=center.z+direction.z*distance+normal.z*distance*.4;
        alphas[index]=event.impact*(j%5===0?.9:.55);
        if(j%4===0) {
          helper.position.fromArray(positions,at);helper.rotation.set(age*15+j,age*11+i,j);
          helper.scale.set(.025,.016,.012).multiplyScalar(event.impact*2);helper.updateMatrix();chips.setMatrixAt(index/4,helper.matrix);
        }
      }
    });
    geometry.attributes.position.needsUpdate=true;geometry.attributes.alpha.needsUpdate=true;
    chips.instanceMatrix.needsUpdate=true;
  }
  return {group,update};
}
