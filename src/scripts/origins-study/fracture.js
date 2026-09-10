import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {rng,stoneGeometry} from './materials.js';

// Voronoi partition of one convex illustrative body; this is not an impact solver.
export function fracturedBody(seed=65,count=28){
  const random=rng(seed),surface=stoneGeometry(seed,3),vertices=[];
  for(let i=0;i<surface.attributes.position.count;i++)vertices.push(new T.Vector3().fromBufferAttribute(surface.attributes.position,i).multiplyScalar(1.6));
  const shell=new ConvexGeometry(vertices);surface.dispose();
  const positions=shell.attributes.position,faces=[];
  for(let i=0;i<positions.count;i+=3)faces.push([0,1,2].map(j=>new T.Vector3().fromBufferAttribute(positions,i+j)));
  // Denser partition near the illustrated impact, with larger remote fragments.
  const seeds=Array.from({length:count},(_,i)=>{const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z),s=.12+Math.cbrt(random())*1.12;const point=new T.Vector3(Math.cos(a)*r,z*.87,Math.sin(a)*r*.92).multiplyScalar(s);if(i>count*.4)point.multiplyScalar(.48).add(new T.Vector3(.68,.06,0));return point;});
  const cells=seeds.map((site,i)=>{
    let polygons=faces.map(face=>face.map(v=>v.clone()));
    seeds.forEach((other,j)=>{
      if(i===j)return;
      const normal=other.clone().sub(site).normalize(),distance=site.clone().add(other).multiplyScalar(.5).dot(normal),next=[],edge=[];
      for(const face of polygons){
        const clipped=[];
        for(let k=0;k<face.length;k++){
          const a=face[k],b=face[(k+1)%face.length],da=a.dot(normal)-distance,db=b.dot(normal)-distance;
          if(da<=1e-8)clipped.push(a);
          if((da<0&&db>0)||(da>0&&db<0)){const v=a.clone().lerp(b,da/(da-db));clipped.push(v);if(!edge.some(p=>p.distanceToSquared(v)<1e-12))edge.push(v);}
        }
        if(clipped.length>=3)next.push(clipped);
      }
      if(edge.length>=3){const center=edge.reduce((p,v)=>p.add(v),new T.Vector3()).divideScalar(edge.length),u=new T.Vector3().crossVectors(normal,Math.abs(normal.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0)).normalize(),v=new T.Vector3().crossVectors(normal,u);edge.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));next.push(edge);}
      polygons=next;
    });
    const points=polygons.flat(),center=points.reduce((p,v)=>p.add(v),new T.Vector3()).divideScalar(points.length),geometry=new ConvexGeometry(points.map(v=>v.clone().sub(center)));
    return {geometry,center};
  });
  return {shell,cells};
}
