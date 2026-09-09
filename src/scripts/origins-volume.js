import * as THREE from 'three';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {createOriginSurface,createOriginCarbonates} from './origins-surface.js';
import {accretionState,alterationState} from './origins-process.js';
import {createAqueousPockets} from './origins-aqueous.js';
import {prepareAssembly} from './origins-assembly.js';

const smooth=value=>{const t=THREE.MathUtils.clamp(value,0,1);return t*t*(3-2*t);};

export function createOriginVolume(material,random,light,originVolume) {
  const group=new THREE.Group();group.name='origin-pieces';
  const noise=new ImprovedNoise(),surface=createOriginSurface(),inside=createOriginSurface(true);
  const materials=[
    new THREE.MeshStandardMaterial({...surface,color:0x939d9c,vertexColors:true}),
    new THREE.MeshStandardMaterial({...inside,color:0xa5aa99,vertexColors:true,bumpScale:.065}),
    new THREE.MeshStandardMaterial({...inside,color:0x858c80,vertexColors:true,bumpScale:.04})
  ];
  const freshInner=new THREE.Color(0xa5aa99),alteredInner=new THREE.Color(0x8e9d8f),freshPore=new THREE.Color(0x858c80),alteredPore=new THREE.Color(0x78877c);
  const inclusionGeometry=new THREE.IcosahedronGeometry(1,1),inclusionMaterial=new THREE.MeshStandardMaterial({color:0xb0b5aa,roughness:.9});
  const placer=new THREE.Object3D(),up=new THREE.Vector3(0,0,1);
  const pieces=originVolume.chunks.map((data,i)=>{
    const geometry=new THREE.BufferGeometry(),positions=[],normals=[],uv=[],colors=[];
    for(let j=0;j<data.vertices.length;j+=6) {
      const [x,y,z,nx,ny,nz]=data.vertices.slice(j,j+6).map(v=>v/10000);
      positions.push(x,y,z);normals.push(nx,ny,nz);
      if(Math.abs(nz)>=Math.max(Math.abs(nx),Math.abs(ny)))uv.push(x*1.5,y*1.5);
      else if(Math.abs(nx)>Math.abs(ny))uv.push(z*1.5,y*1.5);else uv.push(x*1.5,z*1.5);
      const c=.82+.12*noise.noise(x*13,y*13,z*13)+.06*noise.noise(x*57,y*57,z*57);
      colors.push(c,c,c*.98);
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(data.indices);
    let start=0;
    for(let j=1;j<=data.kinds.length;j++)if(data.kinds[j]!==data.kinds[start]){geometry.addGroup(start*3,(j-start)*3,data.kinds[start]);start=j;}
    geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(new THREE.Vector3());geometry.translate(-center.x,-center.y,-center.z);
    const piece=new THREE.Group(),mesh=new THREE.Mesh(geometry,materials);piece.add(mesh);piece.position.copy(center);
    const faces=[],position=geometry.attributes.position;let area=0;
    for(let j=0;j<data.kinds.length;j++)if(data.kinds[j]!==0) {
      const vertices=data.indices.slice(j*3,j*3+3).map(id=>new THREE.Vector3().fromBufferAttribute(position,id));
      const triangle=new THREE.Triangle(...vertices),weight=triangle.getArea();
      if(weight>1e-7){area+=weight;faces.push({triangle,area});}
    }
    if(faces.length) {
      const inclusions=new THREE.InstancedMesh(inclusionGeometry,inclusionMaterial,72);
      for(let j=0;j<inclusions.count;j++) {
        const choice=random()*area,{triangle}=faces.find(face=>face.area>=choice),normal=triangle.getNormal(new THREE.Vector3());
        const u=Math.sqrt(random()),v=random(),size=.005+random()**2*.017;
        placer.position.copy(triangle.a).multiplyScalar(1-u).addScaledVector(triangle.b,u*(1-v)).addScaledVector(triangle.c,u*v).addScaledVector(normal,.002);
        placer.quaternion.setFromUnitVectors(up,normal);placer.rotateZ(random()*Math.PI);
        placer.scale.set(size*1.4,size*.85,size*.32);placer.updateMatrix();inclusions.setMatrixAt(j,placer.matrix);
        inclusions.setColorAt(j,new THREE.Color(j%9===0?0x777f64:j%13===0?0xb9ad8a:0x949b95).multiplyScalar(.7+random()*.4));
      }
      piece.add(inclusions);
    }
    piece.name=i===4?'origin-fragment':`origin-piece-${i+1}`;
    piece.userData.rest=center;piece.userData.index=i;group.add(piece);return piece;
  });
  prepareAssembly(pieces,originVolume.chunks);
  const survivor=pieces[4],record=new THREE.Group();record.name='origin-carbonates';survivor.add(record);
  // Embedded in a cavity, not an abundance/phase map or a measured grain.
  const anchors=[[-.02,.035,-.075],[-.18,.24,-.018],[.23,.31,.045]];
  const wall=survivor.children[0].geometry,wallPosition=wall.attributes.position,wallIndex=wall.index;
  for(let i=0;i<anchors.length;i++) {
    const crystal=createOriginCarbonates(random);
    const desired=new THREE.Vector3(...anchors[i]).sub(survivor.userData.rest),point=new THREE.Vector3(),normal=new THREE.Vector3();let distance=Infinity;
    for(const face of wall.groups.filter(face=>face.materialIndex===2))for(let at=face.start;at<face.start+face.count;at+=3) {
      const triangle=new THREE.Triangle(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(wallPosition,wallIndex.getX(at+j))));
      if(triangle.getArea()<1e-10)continue;
      triangle.closestPointToPoint(desired,point);
      const d=point.distanceToSquared(desired);
      if(d<distance){distance=d;crystal.position.copy(point);triangle.getNormal(normal);}
    }
    crystal.quaternion.setFromUnitVectors(up,normal);crystal.rotateZ(i*.8);
    // Each crystal base penetrates the local wall, instead of hovering above its anchor.
    crystal.children.forEach(mesh=>{
      mesh.updateMatrix();mesh.geometry.computeBoundingBox();
      const local=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);mesh.position.z-=local.min.z+.06;
      mesh.position.x*=.55;mesh.position.y*=.55;
    });
    crystal.userData.size=i===0?.16:.09;record.add(crystal);
  }
  const paths=[
    [[-.52,-.64,.10],[-.36,-.39,.13],[-.22,-.18,.01],[-.08,.0,-.08],[.04,.16,-.06],[.26,.36,.05],[.47,.65,.14]],
    [[-.24,-.2,.01],[-.45,-.11,.05],[-.56,.14,.11]],
    [[.04,.16,-.06],[-.12,.3,-.04],[-.20,.46,-.06]],
    [[.26,.36,.05],[.42,.29,.1],[.61,.30,.22]]
  ];
  group.updateMatrixWorld(true);
  const exposed=pieces.slice(0,8).map(piece=>piece.children[0]),ray=new THREE.Raycaster();
  const project=point=>{ray.set(new THREE.Vector3(point.x,point.y,3),new THREE.Vector3(0,0,-1));return ray.intersectObjects(exposed,false)[0];};
  const pocketGuides=paths.map(path=>{
    // These unrendered guides distribute wall-bound wetting patches.
    const guide=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)),false,'centripetal');
    const points=guide.getPoints(144).map(point=>{
      const hit=project(point);
      return hit?hit.point.clone().add(new THREE.Vector3(0,0,.002)):null;
    }).filter(Boolean);
    const curve=new THREE.CurvePath();
    for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
    return curve;
  });
  const aqueous=createAqueousPockets(pocketGuides,project,random,light);survivor.add(aqueous.group);aqueous.group.position.copy(survivor.userData.rest).negate();
  const point=new THREE.Vector3();
  function update(phase,t,depth) {
    const release=phase===3?smooth(t/.55):0,ending=phase===3?smooth((t-.48)/.52):0;
    const interior=depth>0;
    for(const piece of pieces) {
      const {rest,index:i}=piece.userData,cover=[8,9,10,11].includes(i),angle=i*2.39996;
      piece.position.copy(rest);piece.rotation.set(0,0,0);piece.scale.setScalar(1);
      piece.visible=!(cover&&phase>=2&&interior);
      if(phase<2) {
        const assembly=accretionState(phase===0?0:t,piece.userData.assemblyRank);
        point.copy(rest).normalize();
        if(point.lengthSq()<.1)point.set(.3,.5,.2).normalize();
        piece.position.addScaledVector(point,assembly.gap);
        piece.position.applyAxisAngle(new THREE.Vector3(0,1,0),assembly.turn);
        piece.rotation.set(Math.sin(angle)*assembly.gap*.28,assembly.turn*.35,Math.cos(angle)*assembly.gap*.22);
        if(phase===0)piece.scale.setScalar(smooth((t-.45)/.55));
      }
      if(phase===3) {
        piece.position.addScaledVector(rest.clone().normalize(),release*.55);
        piece.rotation.set(Math.sin(angle)*release*.33,Math.cos(angle)*release*.4,release*.18);
        if(material==='orgueil') {
          if(i===4) {piece.position.multiplyScalar(1-ending);piece.scale.setScalar(1+ending*.6);piece.rotation.set(piece.rotation.x*(1-ending*.7),piece.rotation.y*(1-ending*.7),piece.rotation.z*(1-ending*.7));}
          else {
            point.copy(rest).normalize();point.z*=.3;point.normalize();
            piece.position.addScaledVector(point,smooth(t/.7)*7);
            if(t>=.72)piece.visible=false;
          }
        } else {
          // Reassembly is a kinematic comparison; the public asteroid shape is separate evidence.
          point.copy(rest).multiplyScalar(.94);point.y*=.76;
          piece.position.lerp(point,ending);piece.scale.lerp(new THREE.Vector3(.90,.90,.90),ending);
          piece.rotation.x*=1-ending*.55;piece.rotation.y*=1-ending*.55;
        }
      }
    }
    const alteration=phase===3?1:t;
    const chemistry=alterationState(alteration);aqueous.update(phase,t,interior);
    materials[1].color.copy(freshInner).lerp(alteredInner,phase>=2?chemistry.reaction:0);
    materials[2].color.copy(freshPore).lerp(alteredPore,phase>=2?chemistry.reaction:0);
    if(phase<2){materials[1].color.setHex(0x8c9694);materials[2].color.setHex(0x666f6c);}
    record.visible=phase>=2&&(phase===3||interior);
    record.children.forEach((crystal,i)=>crystal.scale.setScalar(crystal.userData.size*alterationState(Math.max(0,alteration-i*.025)).carbonate));

  }
  return {group,update,inspectionTarget:()=>record.children[0]};
}
