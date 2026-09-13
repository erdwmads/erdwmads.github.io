import {noise} from './materials.js';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
// Resolve sub-pixel fines as a compact density field, using the same particle positions.
// This is a visual coarse-graining of porous material, not a sintering or gravity solver.
export function aggregateSurface(material,name,resolution=52){
 material.flatShading=false;
 const originalShader=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{originalShader(shader);shader.vertexShader=shader.vertexShader.replace('vStone=position+rockOffset','vStone=position*4.0+rockOffset');};
 const mesh=new MarchingCubes(resolution,material,false,false,80000);mesh.name=name;mesh.frustumCulled=false;mesh.isolation=.62;
 function update(points,halfSize,kernel=.25,weight=1,center=[0,0,0]){
  mesh.reset();mesh.scale.setScalar(halfSize);mesh.position.fromArray(center);
  const n=resolution,cell=halfSize*2/n,field=mesh.field,r=kernel/cell,r2=r*r;
  for(const p of points){
   const x=(p[0]-center[0]+halfSize)/cell,y=(p[1]-center[1]+halfSize)/cell,z=(p[2]-center[2]+halfSize)/cell;
   const xmin=Math.max(1,Math.ceil(x-r)),xmax=Math.min(n-2,Math.floor(x+r)),ymin=Math.max(1,Math.ceil(y-r)),ymax=Math.min(n-2,Math.floor(y+r)),zmin=Math.max(1,Math.ceil(z-r)),zmax=Math.min(n-2,Math.floor(z+r));
   for(let k=zmin;k<=zmax;k++)for(let j=ymin;j<=ymax;j++)for(let i=xmin;i<=xmax;i++){
    const d=((i-x)**2+(j-y)**2+(k-z)**2)/r2;if(d>=1)continue;
    field[(k*n+j)*n+i]+=weight*(1-d)**3;
   }
  }
  mesh.update();
  const positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;
  for(let i=0;i<mesh.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),wx=x*halfSize+center[0],wy=y*halfSize+center[1],wz=z*halfSize+center[2];
   const d=(noise.noise(wx*31+9,wy*31,wz*31)*.026+noise.noise(wx*73,wy*73+7,wz*73)*.008)/halfSize;
   const nx=normals.getX(i),ny=normals.getY(i),nz=normals.getZ(i),length=Math.hypot(nx,ny,nz)||1;
   positions.setXYZ(i,x+nx/length*d,y+ny/length*d,z+nz/length*d);
  }
  positions.needsUpdate=true;normals.needsUpdate=true;mesh.visible=mesh.geometry.drawRange.count>0;
 }
 return{mesh,update};
}
