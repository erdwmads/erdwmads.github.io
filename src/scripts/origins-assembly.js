import * as THREE from 'three';

// The offline pieces share fracture vertices. Dock each piece to an already settled neighbour.
export function prepareAssembly(pieces,chunks) {
  const faces=chunks.map(chunk=>{
    const vertices=new Map();
    chunk.kinds.forEach((kind,i)=>{if(kind===1)for(let j=0;j<3;j++){
      const at=chunk.indices[i*3+j]*6,xyz=chunk.vertices.slice(at,at+3);
      vertices.set(xyz.join(','),new THREE.Vector3(...xyz).multiplyScalar(.0001));
    }});
    return vertices;
  });
  const ordered=[4],attached=new Set(ordered);
  pieces[4].userData.assemblyRank=0;
  for(let cursor=0;cursor<ordered.length;cursor++) {
    const parent=ordered[cursor];
    for(let i=0;i<pieces.length;i++)if(!attached.has(i)) {
      const common=[...faces[i]].filter(([key])=>faces[parent].has(key));
      if(common.length<3)continue;
      const contact=common.reduce((best,[,point])=>point.lengthSq()>best.lengthSq()?point:best,new THREE.Vector3());
      Object.assign(pieces[i].userData,{assemblyRank:ordered.length,contact:contact.clone(),contactParent:parent});
      attached.add(i);ordered.push(i);
    }
  }
  if(attached.size!==pieces.length)throw new Error('Parent-body pieces must have a connected contact graph');
}
