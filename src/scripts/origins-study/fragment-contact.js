import * as T from 'three';
// Convex separating axes use the actual fragment faces, not oversized bounding spheres.
export function fragmentShape(geometry){
 const p=geometry.attributes.position,vertices=[],normals=[],edges=[];
 function unique(list,v){if(v.lengthSq()<1e-14)return;v.normalize();if(v.x<-.00001||(Math.abs(v.x)<.00001&&v.y<-.00001)||(Math.abs(v.x)+Math.abs(v.y)<.00001&&v.z<0))v.negate();if(!list.some(n=>Math.abs(n.dot(v))>1-1e-7))list.push(v);}
 for(let i=0;i<p.count;i+=3){
  const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
  for(const v of [a,b,c])if(!vertices.some(q=>q.distanceToSquared(v)<1e-12))vertices.push(v);
  const ab=b.clone().sub(a),ac=c.clone().sub(a);unique(normals,ab.clone().cross(ac));
  unique(edges,ab);unique(edges,ac);unique(edges,c.clone().sub(b));
 }
 return{vertices,normals,edges,pairs:new WeakMap()};
}
function axes(a,b){
 if(a.pairs.has(b))return a.pairs.get(b);
 const dirs=[...a.normals,...b.normals];for(const u of a.edges)for(const v of b.edges){const n=u.clone().cross(v);if(n.lengthSq()>1e-10)dirs.push(n.normalize());}
 const result=dirs.map(n=>{const av=a.vertices.map(v=>v.dot(n)),bv=b.vertices.map(v=>v.dot(n));return{n,amin:Math.min(...av)-.008,amax:Math.max(...av)+.008,bmin:Math.min(...bv)-.008,bmax:Math.max(...bv)+.008};});
 a.pairs.set(b,result);return result;
}
export function contactDistance(a,b,direction){
 let distance=Infinity;
 for(const s of axes(a,b)){const d=direction.dot(s.n);if(d>1e-8)distance=Math.min(distance,(s.bmax-s.amin)/d);else if(d< -1e-8)distance=Math.min(distance,(s.bmin-s.amax)/d);}
 return distance;
}
export function fragmentsSeparated(a,ap,b,bp){
 const offset=ap.clone().sub(bp);
 return axes(a,b).some(s=>{const d=offset.dot(s.n);return s.amin+d>=s.bmax-1e-8||s.amax+d<=s.bmin+1e-8;});
}
