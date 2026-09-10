import * as T from 'three';

const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const GORES=16,RINGS=20,WIDTH=8,TAU=Math.PI*2;

function wovenFabric(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,value=150+Math.round(30*Math.sin(x*Math.PI/2)+25*Math.sin(y*Math.PI/2)+9*Math.sin((x+y)*2.3));
  data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(3,5);
 texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}

/** Authored recovery-canopy illustration. Attachment stays at local (0,-2,0). */
export function createRecoveryCanopy(id){
 const group=new T.Group();group.name='recovery-canopy';
 const cruciform=id==='hayabusa2';
 group.userData.canopyType=cruciform?'cruciform':'triconic';
 // NASA publishes 7.3 m as the nominal canopy diameter, not a measured inflated
 // projection. JAXA's recovered cruciform canopy has no numeric span in our source.
 group.userData.nominalDiameterM=cruciform?null:7.3;
 const geometry=new T.BufferGeometry(),vertices=GORES*(RINGS+1)*(WIDTH+1);
 const positions=new Float32Array(vertices*3),colors=new Float32Array(vertices*3),uvs=new Float32Array(vertices*2),indices=[];
 const orange=new T.Color(id==='hayabusa2'?0xc97946:0xc98252),ivory=new T.Color(0xe2d9c5);
 for(let gore=0;gore<GORES;gore++)for(let row=0;row<=RINGS;row++)for(let col=0;col<=WIDTH;col++){
  const index=(gore*(RINGS+1)+row)*(WIDTH+1)+col;
  const color=(gore%4<2?orange:ivory).clone().multiplyScalar(1-.025*Math.sin(gore*2.3));
  colors.set(color.toArray(),index*3);uvs.set([col/WIDTH,row/RINGS],index*2);
  if(row<RINGS&&col<WIDTH){const a=index,b=a+WIDTH+1;indices.push(a,b+1,b,a,a+1,b+1);}
 }
 geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));geometry.setIndex(indices);
 const fabric=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,side:T.DoubleSide,bumpMap:wovenFabric(),bumpScale:.003});
 const cloth=new T.Mesh(geometry,fabric);cloth.name=cruciform?'cruciform-fabric-canopy':'sixteen-fabric-gores';cloth.castShadow=true;cloth.receiveShadow=true;group.add(cloth);
 const seamCount=GORES*RINGS+GORES*WIDTH*2;
 const seamPositions=new Float32Array(seamCount*6),seamGeometry=new T.BufferGeometry();
 seamGeometry.setAttribute('position',new T.BufferAttribute(seamPositions,3).setUsage(T.DynamicDrawUsage));
 const seams=new T.LineSegments(seamGeometry,new T.LineBasicMaterial({color:0x88745b,transparent:true,opacity:.47}));seams.name='sewn-seams-and-vent';group.add(seams);
 const cordSteps=20,cordPositions=new Float32Array(GORES*cordSteps*6),cordGeometry=new T.BufferGeometry();
 cordGeometry.setAttribute('position',new T.BufferAttribute(cordPositions,3).setUsage(T.DynamicDrawUsage));
 const cords=new T.LineSegments(cordGeometry,new T.LineBasicMaterial({color:0xd1cbb7,transparent:true,opacity:.7}));cords.name='suspension-cords';group.add(cords);
 const ventAngle=cruciform?0:Math.asin(.095/1.35),point=new T.Vector3(),end=new T.Vector3(),previous=new T.Vector3();
 let lastInflation=-1,lastCollapse=-1,lastGround;
 function update(inflation,collapse,groundOffset=0){
  inflation=T.MathUtils.clamp(inflation,0,1);collapse=T.MathUtils.clamp(collapse,0,1);
  if(inflation===lastInflation&&collapse===lastCollapse&&groundOffset===lastGround)return;
  lastInflation=inflation;lastCollapse=collapse;lastGround=groundOffset;
  const fill=smooth(inflation),fall=smooth(collapse);
  function surface(radial,angle,u,target){
   const theta=ventAngle+(Math.PI/2-ventAngle)*radial,sin=Math.sin(theta),lobe=Math.sin(u*Math.PI)**2;
   // A cross is the union of two narrow rectangles. Its cut-away corners must
   // remain open during inflation and after landing, unlike a circular canopy.
   const ca=Math.max(.000001,Math.abs(Math.cos(angle))),sa=Math.max(.000001,Math.abs(Math.sin(angle)));
   const outline=cruciform?Math.max(Math.min(1/ca,.38/sa),Math.min(.38/ca,1/sa)):1;
   const radius=1.35*outline*sin*(.055+.945*fill)*(1+.027*lobe*sin);
   const meridian=(sin-Math.sin(ventAngle))/(1-Math.sin(ventAngle));
   // Three conical bands distinguish the NASA main canopy from a hemisphere.
   // Band breakpoints and inflated angles are illustrative, not sewing patterns.
   const triconic=meridian<.35?1-.2*meridian/.35:meridian<.72?.8-.35*(meridian-.35)/.37:.45*(1-meridian)/.28;
   const height=(.29+.37*fill)*(cruciform?Math.cos(theta):triconic)+.045*lobe*sin*fill;
   const x=radius*Math.cos(angle),z=radius*Math.sin(angle);
   // Each gore loses pressure asymmetrically, then folds into a rippled fabric pile.
   const localFall=T.MathUtils.clamp(fall+.13*Math.sin(angle+.7)*Math.sin(Math.PI*fall),0,1);
   // Grounded fabric is a sheared sheet with a few crossing folds, not a radial bowl.
   const spread=1.35*outline*(.003+.997*Math.pow(radial,.84));
   const sx=spread*Math.cos(angle),sz=spread*Math.sin(angle);
   const foldedX=1.32+.62*sx+.09*sz+.10*Math.sin(sz*4.7+sx*.9)*radial;
   const foldedZ=.13+.42*sz-.12*sx+.10*Math.sin(sx*3.8+sz*1.2)*radial;
   const foldA=(sx+.36*sz+.08*Math.sin(sz*5.)-.19)/.085;
   const foldB=(sz-.18*sx+.07*Math.sin(sx*4.)+.21)/.075;
   const foldC=(sx-.7*sz-.52)/.055;
   const foldedY=-1.996+groundOffset+.001*Math.sin(sx*13.1+sz*8.7)**2
    +.098*Math.exp(-foldA*foldA-(sz-.32)**2/.24)
    +.067*Math.exp(-foldB*foldB-(sx+.43)**2/.21)
    +.027*Math.exp(-foldC*foldC-(sz+.5)**2/.19)
    +.036*smooth((radial-.85)/.15)*Math.exp(-((angle-2.3)**2)/.10);
   target.set(T.MathUtils.lerp(x,foldedX,fall),T.MathUtils.lerp(height,foldedY,localFall),T.MathUtils.lerp(z,foldedZ,fall));
   target.y+=.095*Math.sin(angle*5+radial*11)*Math.sin(Math.PI*fall)*sin;
   target.y=Math.max(-1.998+groundOffset,target.y);
   return target;
  }
  for(let gore=0;gore<GORES;gore++)for(let row=0;row<=RINGS;row++)for(let col=0;col<=WIDTH;col++){
   const u=col/WIDTH,index=(gore*(RINGS+1)+row)*(WIDTH+1)+col;
   surface(row/RINGS,(gore+u)/GORES*TAU,u,point).toArray(positions,index*3);
  }
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  let seamIndex=0;
  function seamPoint(radial,angle,u){surface(radial,angle,u,point);point.y+=.002;point.toArray(seamPositions,seamIndex);seamIndex+=3;}
  for(let gore=0;gore<GORES;gore++){
   const angle=gore/GORES*TAU;
   for(let row=0;row<RINGS;row++){seamPoint(row/RINGS,angle,0);seamPoint((row+1)/RINGS,angle,0);}
   for(const radial of [0,1])for(let col=0;col<WIDTH;col++){
    seamPoint(radial,(gore+col/WIDTH)/GORES*TAU,col/WIDTH);
    seamPoint(radial,(gore+(col+1)/WIDTH)/GORES*TAU,(col+1)/WIDTH);
   }
  }
  seamGeometry.attributes.position.needsUpdate=true;seamGeometry.computeBoundingSphere();
  let cordIndex=0;
  for(let gore=0;gore<GORES;gore++){
   const angle=gore/GORES*TAU;surface(1,angle,0,end);previous.copy(end);
   for(let step=1;step<=cordSteps;step++){
    const t=step/cordSteps,slack=Math.sin(Math.PI*t),looseness=.13*(1-fill)+.47*fall;
    point.copy(end).multiplyScalar(1-t);point.y-=2*t+looseness*slack;
    point.x+=fall*.10*slack*Math.sin(t*TAU+angle);
    point.z+=fall*.09*slack*Math.sin(t*TAU*1.5+angle);
    point.y=Math.max(-2+groundOffset+.002*slack,point.y);
    if(step===cordSteps)point.set(0,-2,0);
    previous.toArray(cordPositions,cordIndex);point.toArray(cordPositions,cordIndex+3);cordIndex+=6;previous.copy(point);
   }
  }
  cordGeometry.attributes.position.needsUpdate=true;cordGeometry.computeBoundingSphere();
 }
 update(1,0);
 const deployedSize=new T.Box3().setFromObject(cloth).getSize(new T.Vector3());
 group.userData.deployedSpan=Math.max(deployedSize.x,deployedSize.z);
 return {group,update};
}
