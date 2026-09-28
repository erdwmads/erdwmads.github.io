import * as T from 'three';
import {growthPopulation,grainPosition} from './growth-dynamics.js';
import {aggregateSurface} from './aggregate-surface.js';
import {rockMaterial} from './materials.js';
import {fracturedBody} from './fracture.js';

// Chapter 04 starts from the body that chapter 02 ends with: the same retained
// grains, the same fine-material surface at t = 1 and the same texture frame.
export const parentTexture=4/1.75;
export function parentSkin(){
 const population=growthPopulation(),points=population.grains.filter(p=>!p.escape).map(p=>grainPosition(p,population,1));
 const fines=aggregateSurface(rockMaterial(),'parent-skin');fines.update(points,1.75,.25,1.6);
 const p=fines.mesh.geometry.attributes.position,n=fines.mesh.geometry.attributes.normal,count=fines.mesh.count;
 const positions=new Float64Array(count*3),normals=new Float64Array(count*3),weld=new Int32Array(count),ids=new Map();
 for(let i=0;i<count;i++){
  const l=Math.hypot(n.getX(i),n.getY(i),n.getZ(i))||1,x=p.getX(i)*1.75,y=p.getY(i)*1.75,z=p.getZ(i)*1.75,id=Math.round(x*1e6)+','+Math.round(y*1e6)+','+Math.round(z*1e6);
  positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;normals[i*3]=n.getX(i)/l;normals[i*3+1]=n.getY(i)/l;normals[i*3+2]=n.getZ(i)/l;
  if(!ids.has(id))ids.set(id,ids.size);weld[i]=ids.get(id);
 }
 fines.mesh.geometry.dispose();fines.mesh.material.dispose();
 return{positions,normals,weld,vertices:ids.size,count,points};
}
// The same kernel field that defines the fine-material surface (isolation .62).
const density=(points,p)=>{let g=0;for(const q of points){const d=((p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2)/.0625;if(d<1)g+=1.6*(1-d)**3;}return g;};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const l=Math.hypot(a[0],a[1],a[2]);return[a[0]/l,a[1]/l,a[2]/l];};
// Sutherland–Hodgman against one bisector, keeping the side nearer the cell's site.
function clip(polygon,{n,d}){
 const out=[];
 for(let k=0;k<polygon.length;k++){
  const a=polygon[k],b=polygon[(k+1)%polygon.length],da=dot(n,a[0])-d,db=dot(n,b[0])-d;
  if(da<=0)out.push(a);
  if(da*db<0){const [u,v,du,dv]=da<0?[a,b,da,db]:[b,a,db,da],t=du/(du-dv);out.push([mix(u[0],v[0],t),mix(u[1],v[1],t)]);}
 }
 return out;
}
// The continuous surface is cut exactly by Voronoi bisectors; each fracture face is the
// surface's own cross-section on its bisector, so the intact parent stays closed and seamless.
// The partition and later trajectories are illustrative, not an impact calculation.
export function fracturedParent(seed=65,count=64){
 const skin=parentSkin(),P=skin.positions,Q=skin.normals,W=skin.weld,V=i=>[P[i*3],P[i*3+1],P[i*3+2]],N=i=>[Q[i*3],Q[i*3+1],Q[i*3+2]];
 const unique=new Int32Array(skin.vertices);for(let i=0;i<skin.count;i++)unique[W[i]]=i;
 const directions=new Map(),ico=new T.IcosahedronGeometry(1,2).attributes.position;
 for(let i=0;i<ico.count;i++)directions.set([ico.getX(i),ico.getY(i),ico.getZ(i)].map(v=>v.toFixed(4)).join(),[ico.getX(i),ico.getY(i),ico.getZ(i)]);
 // Tight convex supports around each fragment are used only for contact packing.
 const envelope=[...directions.values()].map(d=>{let best=-Infinity,k=0;for(const j of unique){const s=P[j*3]*d[0]+P[j*3+1]*d[1]+P[j*3+2]*d[2];if(s>best){best=s;k=j;}}return new T.Vector3(...V(k)).multiplyScalar(1.004);});
 const {shell,cells,sites}=fracturedBody(seed,count,envelope);shell.dispose();
 const S=sites.map(s=>s.toArray()),planes=S.map((s,i)=>S.map((t,j)=>{if(i===j)return null;const n=unit(sub(t,s));return{n,d:dot(n,mix(s,t,.5))};}));
 const patches=cells.map(()=>[]),caps=cells.map(()=>[]),distance=new Float64Array(count),owners=[],shared=new Set();
 for(let q=0;q<skin.count;q+=3){
  const mx=(P[q*3]+P[q*3+3]+P[q*3+6])/3,my=(P[q*3+1]+P[q*3+4]+P[q*3+7])/3,mz=(P[q*3+2]+P[q*3+5]+P[q*3+8])/3;let r=0,nearest=Infinity;
  for(let v=q;v<q+3;v++)r=Math.max(r,Math.sqrt((P[v*3]-mx)**2+(P[v*3+1]-my)**2+(P[v*3+2]-mz)**2));
  for(let k=0;k<count;k++){const s=S[k];distance[k]=Math.sqrt((mx-s[0])**2+(my-s[1])**2+(mz-s[2])**2);if(distance[k]<nearest)nearest=distance[k];}
  // Every cell that could own part of this small triangle receives its exact clipped share.
  owners.length=0;for(let k=0;k<count;k++)if(distance[k]<=nearest+2*r+1e-9)owners.push(k);
  if(owners.length===1){patches[owners[0]].push([V(q),N(q)],[V(q+1),N(q+1)],[V(q+2),N(q+2)]);continue;}
  for(const o of owners)for(const k of owners)if(o<k)shared.add(o*count+k);
  for(const o of owners){let polygon=[[V(q),N(q)],[V(q+1),N(q+1)],[V(q+2),N(q+2)]];for(const k of owners)if(k!==o&&polygon.length)polygon=clip(polygon,planes[o][k]);for(let v=1;v+1<polygon.length;v++)patches[o].push(polygon[0],polygon[v],polygon[v+1]);}
 }
 // Surface triangles binned by centroid; a bisector only visits bins it can cross.
 const bins=new Map();
 for(let q=0;q<skin.count;q+=3){const c=[0,1,2].map(k=>Math.floor((P[q*3+k]+P[q*3+3+k]+P[q*3+6+k])/.6)),id=c.join();if(!bins.has(id))bins.set(id,{center:c.map(v=>(v+.5)*.2),triangles:[]});bins.get(id).triangles.push(q);}
 const side=new Float64Array(3),edge=new Float64Array(3);
 for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
  const {n,d}=planes[i][j],e1=unit(cross(n,Math.abs(n[0])<.9?[1,0,0]:[0,1,0])),e2=cross(n,e1),o=mix(S[i],S[j],.5);
  let face=[[1,1],[-1,1],[-1,-1],[1,-1]].map(([x,y])=>[[o[0]+(e1[0]*x+e2[0]*y)*4,o[1]+(e1[1]*x+e2[1]*y)*4,o[2]+(e1[2]*x+e2[2]*y)*4],n]);
  // Only the bisectors that bound this Voronoi face can trim its cross-section.
  const bounds=[];for(let k=0;k<count&&face.length;k++)if(k!==i&&k!==j&&face.some(([p])=>dot(planes[i][k].n,p)>planes[i][k].d)){face=clip(face,planes[i][k]);bounds.push(planes[i][k]);}
  if(face.length<3)continue;
  const back=[-n[0],-n[1],-n[2]],add=(x,y,z)=>{if(dot(cross(sub(y,x),sub(z,x)),n)<0)[y,z]=[z,y];caps[i].push([x,n],[y,n],[z,n]);caps[j].push([x,back],[z,back],[y,back]);};
  const emit=polygon=>{for(let v=1;v+1<polygon.length;v++)add(polygon[0][0],polygon[v][0],polygon[v+1][0]);};
  // A face that never meets the surface lies wholly inside (its cap is the face) or outside;
  // the field decides clear cases (half or 1.5 times the isolation) and the exact loop handles the rest.
  if(!shared.has(i*count+j)){const g=density(skin.points,face.reduce((c,[p])=>c.map((v,k)=>v+p[k]/face.length),[0,0,0]));if(g<.31)continue;if(g>.93){emit(face);continue;}}
  // Exact crossings of the closed surface, keyed by the welded surface edge they lie on.
  const points=[],links=new Map();
  for(const bin of bins.values()){
   if(Math.abs(dot(n,bin.center)-d)>.3)continue;
   for(const q of bin.triangles){
    let inside=0;for(let v=0;v<3;v++){side[v]=P[(q+v)*3]*n[0]+P[(q+v)*3+1]*n[1]+P[(q+v)*3+2]*n[2]-d;if(side[v]<=0)inside++;}
    if(inside===0||inside===3)continue;
    let found=0;
    for(let v=0;v<3;v++){const w=(v+1)%3;if((side[v]<=0)===(side[w]<=0))continue;
     const low=W[q+v]<W[q+w],x=low?q+v:q+w,y=low?q+w:q+v,id=W[x]*skin.vertices+W[y];edge[found++]=id;
     if(!links.has(id)){const t=(low?side[v]:side[w])/(side[v]-side[w])*(low?1:-1);links.set(id,{point:[P[x*3]+(P[y*3]-P[x*3])*t,P[x*3+1]+(P[y*3+1]-P[x*3+1])*t,P[x*3+2]+(P[y*3+2]-P[x*3+2])*t],next:[]});points.push(id);}
    }
    links.get(edge[0]).next.push(edge[1]);links.get(edge[1]).next.push(edge[0]);
   }
  }
  const used=new Set();
  for(const start of points){
   if(used.has(start))continue;const loop=[];let current=start,previous;
   // Chain surface crossings into closed cross-section loops.
   while(current!==undefined&&!used.has(current)){used.add(current);loop.push([links.get(current).point,n]);const next=links.get(current).next.find(k=>k!==previous&&!used.has(k));previous=current;current=next;}
   let cap=loop;for(const bound of bounds)if(cap.length>2)cap=clip(cap,bound);
   if(cap.length<3)continue;
   for(const t of T.ShapeUtils.triangulateShape(cap.map(([p])=>new T.Vector2(dot(p,e1),dot(p,e2))),[]))add(...t.map(v=>cap[v][0]));
  }
 }
 return cells.map((cell,i)=>{
  const vertices=[...patches[i],...caps[i]],c=cell.center.toArray(),position=new Float32Array(vertices.length*3),normal=new Float32Array(vertices.length*3),offset=new Float32Array(vertices.length*3);
  vertices.forEach(([p,v],k)=>{position.set(sub(p,c),k*3);normal.set(unit(v),k*3);offset.set(c,k*3);});
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.setAttribute('rockOffset',new T.BufferAttribute(offset,3));
  // A neutral morph target keeps the fragment interface used by the breakup update and the offline settling sampler.
  geometry.morphAttributes.position=[new T.BufferAttribute(position.slice(),3)];
  return{geometry,center:cell.center,support:cell.geometry};
 });
}
