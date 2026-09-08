import * as THREE from 'three';
import {alterationState} from './origins-process.js';

// Sample the existing cutaway. Reject triangles bridging a cavity or missing rock.
export function createSurfaceFilm(center,radius,project,seed) {
  const points=[],distances=[],positions=[],normals=[],radii=[],owners=[],steps=12;
  for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++) {
    const u=x/steps*2-1,v=y/steps*2-1,angle=Math.atan2(v,u);
    const edge=.83+.1*Math.sin(angle*5+seed)+.06*Math.cos(angle*9-seed);
    const hit=project(new THREE.Vector3(center.x+u*radius,center.y+v*radius,center.z));
    const normal=hit?.face.normal.clone().transformDirection(hit.object.matrixWorld);
    points.push(hit?{point:hit.point.clone().addScaledVector(normal,.002),normal,owner:hit.object.parent}:null);
    distances.push(Math.hypot(u,v)/edge);
  }
  for(let y=0;y<steps;y++)for(let x=0;x<steps;x++) {
    const a=y*(steps+1)+x,b=a+1,c=a+steps+1,d=c+1;
    for(const ids of [[a,b,c],[b,d,c]]) {
      const vertices=ids.map(i=>points[i]);
      if(vertices.some(v=>!v)||ids.every(i=>distances[i]>1.12))continue;
      if(vertices.some(v=>v.owner!==vertices[0].owner))continue;
      if(vertices.some((v,i)=>v.point.distanceTo(vertices[(i+1)%3].point)>radius*.45))continue;
      for(let i=0;i<3;i++){positions.push(...vertices[i].point.toArray());normals.push(...vertices[i].normal.toArray());radii.push(distances[ids[i]]);}
      owners.push(vertices[0].owner);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('wetRadius',new THREE.Float32BufferAttribute(radii,1));
  geometry.userData.owners=owners;
  return geometry;
}

function filmMaterial(color,roughness) {
  const extent={value:0};
  const material=new THREE.MeshPhysicalMaterial({color,roughness,clearcoat:1-roughness,transparent:true,opacity:.62,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  material.onBeforeCompile=shader=>{
    shader.uniforms.wetExtent=extent;
    shader.vertexShader='attribute float wetRadius; varying float vWetRadius;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWetRadius=wetRadius;');
    shader.fragmentShader='uniform float wetExtent; varying float vWetRadius;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a *= 1.0-smoothstep(max(0.0,wetExtent-.18),wetExtent,vWetRadius);');
  };
  material.userData.extent=extent;
  return material;
}

// Colour and enlargement distinguish processes, not measured pore fluids or abundances.
export function createAqueousPockets(curves,project,random,light) {
  const group=new THREE.Group(),ice=new THREE.Group();ice.name='origin-ice';group.add(ice);
  const iceMaterial=new THREE.MeshPhysicalMaterial({color:0xa6c6d0,roughness:.3,metalness:0,clearcoat:.6,clearcoatRoughness:.16,flatShading:true});
  const iceGeometry=new THREE.IcosahedronGeometry(1,0);
  const pockets=[],axis=new THREE.Vector3(0,0,1);
  for(let i=0;i<9;i++) {
    const curve=curves[i%curves.length],point=curve.getPoint(.13+(i%3)*.30),hit=project(point);
    if(!hit)continue;
    const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld),position=hit.point.clone();
    const size=.06+random()*.055;
    const frozen=new THREE.Group();frozen.position.copy(position);frozen.quaternion.setFromUnitVectors(axis,normal);ice.add(frozen);
    for(let j=0;j<5;j++) {
      const shard=new THREE.Mesh(iceGeometry,iceMaterial),angle=j*2.3999;
      shard.position.set(Math.cos(angle)*size*.4,Math.sin(angle)*size*.4,-size*.10);
      shard.rotation.set(random()*.7,random()*.5,angle);shard.scale.set(size*(.45+random()*.35),size*.4,size*(.2+random()*.25));frozen.add(shard);
    }
    const filmGeometry=createSurfaceFilm(position,size*2.2,project,i);
    const liquid=new THREE.Mesh(filmGeometry,filmMaterial(light?0x397f8d:0x438998,.2)),reactions=[];
    liquid.name='origin-liquid-pocket';liquid.renderOrder=2;group.add(liquid);
    // Permanent reaction films live in the coordinate system of each actual rock piece.
    for(const owner of new Set(filmGeometry.userData.owners)) {
      const geometry=filmGeometry.clone(),indices=[];
      filmGeometry.userData.owners.forEach((piece,j)=>{if(piece===owner)indices.push(j*3,j*3+1,j*3+2);});
      geometry.setIndex(indices);geometry.translate(-owner.userData.rest.x,-owner.userData.rest.y,-owner.userData.rest.z);
      geometry.userData={};
      const reaction=new THREE.Mesh(geometry,filmMaterial(0x708171,.92));
      reaction.name='origin-altered-wall';reaction.renderOrder=1;owner.add(reaction);reactions.push(reaction);
    }
    delete filmGeometry.userData.owners;
    pockets.push({frozen,liquid,reactions,delay:(i%3)*.025});
  }
  function update(phase,time,interior) {
    group.visible=phase===2&&interior;
    const state=alterationState(phase===3?1:time);ice.visible=phase===2&&state.ice>.001;
    for(const pocket of pockets) {
      const local=alterationState(phase===3?1:Math.max(0,time-pocket.delay));
      pocket.frozen.scale.setScalar(Math.cbrt(local.ice));
      pocket.liquid.material.userData.extent.value=Math.sqrt(local.liquid)*.82;
      pocket.liquid.material.opacity=.6*(1-local.reaction*.7);
      pocket.liquid.visible=phase===2&&local.liquid>.001;
      for(const reaction of pocket.reactions) {
        reaction.material.userData.extent.value=Math.sqrt(local.reaction);
        reaction.visible=phase>=2&&(interior||phase===3)&&local.reaction>.001;
      }
    }
    group.userData.process=state;
  }
  return {group,update};
}
