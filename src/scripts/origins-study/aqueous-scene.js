import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {rng,rockMaterial,clastGeometry,stoneGeometry} from './materials.js';
import {createPorousMedium,localAlteration,insideSection} from './porous-medium.js';
import {createMineralMap} from './mineral-map.js';
import {sectionRadius,sectionHeight} from './breccia-fabric.js';

function sectionGeometry(){
 const positions=[],indices=[],steps=160,rings=64;
 for(let r=0;r<=rings;r++)for(let i=0;i<=steps;i++){
  const a=i/steps*Math.PI*2,k=r/rings*sectionRadius(a),x=Math.cos(a)*2.17*k,y=Math.sin(a)*1.40*k;
  positions.push(x,y,sectionHeight(x,y));
 }
 for(let r=0;r<rings;r++)for(let i=0;i<steps;i++){const a=r*(steps+1)+i,b=a+steps+1;indices.push(a,b,b+1,a,b+1,a+1);}
 const base=positions.length/3;
 for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,k=sectionRadius(a),x=Math.cos(a)*2.17*k,y=Math.sin(a)*1.40*k;positions.push(x,y,sectionHeight(x,y),x*.90,y*.90,-.32-.09*Math.sin(a*3+.8));}
 for(let i=0;i<steps;i++){const a=base+i*2;indices.push(a,a+1,a+3,a,a+3,a+2);}
 // Close the back; this is a natural fragment with an exposed study face, not a square slab.
 const back=positions.length/3;positions.push(0,0,-.40);
 for(let i=0;i<steps;i++)indices.push(back,base+(i+1)*2+1,base+i*2+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function alteration(){
 const group=new T.Group(),medium=createPorousMedium(),random=rng(7102),o=new T.Object3D(),color=new T.Color();
 group.name='granular-water-rock-study';group.userData.medium=medium;
 const atlas=createMineralMap();group.userData.modalAtlas=atlas;
 const mineralTexture=new T.DataTexture(atlas.rgba,atlas.width,atlas.height,T.RGBAFormat);
 mineralTexture.minFilter=mineralTexture.magFilter=T.NearestFilter;mineralTexture.needsUpdate=true;
 const matrixMaterial=rockMaterial(0x353d3c),matrix=new T.Mesh(sectionGeometry(),matrixMaterial);
 matrix.name='alteration-matrix';group.add(matrix);
 matrix.geometry.boundsTree=new MeshBVH(matrix.geometry);matrix.raycast=acceleratedRaycast;matrix.updateMatrixWorld(true);
 const faceRay=new T.Raycaster();faceRay.firstHitOnly=true;
 const heightAt=(x,y)=>{faceRay.set(new T.Vector3(x,y,2),new T.Vector3(0,0,-1));return faceRay.intersectObject(matrix,false)[0]?.point.z??sectionHeight(x,y);};
 const iceSites=medium.sites.map(s=>Array.from({length:3},(_,j)=>{const a=s.rotation+j*2.399,x=s.x+Math.cos(a)*s.radius*.43,y=s.y+Math.sin(a)*s.radius*.43;return{x,y,z:heightAt(x,y)+s.radius*.17};}));
 const grainMaterial=matrixMaterial,grainGeometry=clastGeometry(173,0);
 const grains=new T.InstancedMesh(grainGeometry,grainMaterial,medium.grains.length);
 grains.name='fine-rock-grains';
 medium.grains.forEach((g,i)=>{o.position.set(g.x,g.y,heightAt(g.x,g.y)-g.radius*.10-.0015);o.rotation.set(0,0,g.rotation);o.scale.set(g.radius*1.12,g.radius*.87,g.radius*.10);o.updateMatrix();grains.setMatrixAt(i,o.matrix);grains.setColorAt(i,color.setScalar(g.tone));});
 group.add(grains);
 const fines=new T.InstancedMesh(stoneGeometry(117,0),matrixMaterial,4200);
 for(let i=0;i<fines.count;i++){let x,y;do{x=(random()-.5)*4.5;y=(random()-.5)*2.9;}while(!insideSection(x,y));
  o.position.set(x,y,heightAt(x,y)-.003+random()*.001);o.rotation.set(0,0,random()*6);const r=.003+Math.pow(random(),2)*.017;o.scale.set(r*1.4,r,r*.10);o.updateMatrix();fines.setMatrixAt(i,o.matrix);fines.setColorAt(i,color.setScalar(.55+random()*.6));
 }group.add(fines);
 const iceMaterial=new T.MeshPhysicalMaterial({color:0xd7e8ec,roughness:.3,metalness:0,clearcoat:.85,clearcoatRoughness:.18});
 const ice=new T.InstancedMesh(clastGeometry(309,0),iceMaterial,medium.sites.length*3);ice.name='dispersed-ice-grains';
 const liquidMaterial=new T.MeshPhysicalMaterial({color:0x4d656a,roughness:.1,metalness:0,clearcoat:1,clearcoatRoughness:.06,transparent:true,opacity:.38,depthWrite:false});
 const lensGeometry=new T.SphereGeometry(1,8,4),lensPosition=lensGeometry.attributes.position;
 for(let i=0;i<lensPosition.count;i++){const x=lensPosition.getX(i),y=lensPosition.getY(i),z=lensPosition.getZ(i),a=Math.atan2(y,x),r=1+.22*Math.sin(a*3)+.15*Math.cos(a*5);lensPosition.setXYZ(i,x*r,y*r,z);}lensGeometry.computeVertexNormals();
 const liquid=new T.InstancedMesh(lensGeometry,liquidMaterial,medium.sites.length);liquid.name='intergranular-water';
 // Wetting is shaded into the continuous matrix, never drawn as a wire network.
 const fieldWidth=160,fieldHeight=104,fieldBytes=new Uint8Array(fieldWidth*fieldHeight*4),lookup=[];
 for(let y=0;y<fieldHeight;y++)for(let x=0;x<fieldWidth;x++){
  const px=(x/(fieldWidth-1)-.5)*4.64,py=(y/(fieldHeight-1)-.5)*3.04;let a=0,b=0,d1=Infinity,d2=Infinity;
  medium.sites.forEach((site,i)=>{const d=(site.x-px)**2+(site.y-py)**2;if(d<d1){d2=d1;b=a;d1=d;a=i;}else if(d<d2){d2=d;b=i;}});
  lookup.push({a,b,weight:Math.exp(-d1/0.009)});
 }
 const wetTexture=new T.DataTexture(fieldBytes,fieldWidth,fieldHeight,T.RGBAFormat);wetTexture.minFilter=wetTexture.magFilter=T.LinearFilter;
 matrixMaterial.userData.wetTexture=wetTexture;matrixMaterial.wettingMap=wetTexture;
 matrixMaterial.mineralMap=mineralTexture;
 const fabricTexture=new T.DataTexture(atlas.fabricRGBA,atlas.width,atlas.height,T.RGBAFormat);fabricTexture.minFilter=fabricTexture.magFilter=T.LinearFilter;fabricTexture.needsUpdate=true;matrixMaterial.fabricMap=fabricTexture;
 const rockShader=matrixMaterial.onBeforeCompile,processUniform={value:0};
 matrixMaterial.onBeforeCompile=shader=>{rockShader(shader);
  shader.fragmentShader=shader.fragmentShader.replace('normal-grad*.055','normal-grad*.008');
  shader.uniforms.fabricMap={value:fabricTexture};shader.uniforms.wettingMap={value:wetTexture};shader.uniforms.mineralMap={value:mineralTexture};shader.uniforms.wettingProcess=processUniform;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSection;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
vec4 sectionPosition=vec4(position,1.);
#ifdef USE_INSTANCING
sectionPosition=instanceMatrix*sectionPosition;
#endif
vSection=sectionPosition.xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('varying vec3 vStone;',`varying vec3 vStone; varying vec3 vSection;
uniform sampler2D fabricMap; uniform sampler2D wettingMap; uniform sampler2D mineralMap; uniform float wettingProcess;`)
   .replace('#include <roughnessmap_fragment>',`vec2 sectionUV=vSection.xy/vec2(4.64,3.04)+.5;
vec4 lithic=texture2D(fabricMap,sectionUV);
vec3 alterationState=texture2D(wettingMap,sectionUV).rgb;
float phaseId=floor(texture2D(mineralMap,sectionUV).r*255.+.5);
float surface=step(-.04,vSection.z);
float hydration=alterationState.g*surface, growth=alterationState.b*surface;
float wetEdge=alterationState.r*smoothstep(.28,.64,grainNoise(vSection*38.))*surface;
float fabric=grainNoise(vSection*130.);
float lamina=grainNoise(vec3(vSection.x*160.,vSection.y*900.+grainNoise(vSection*23.)*8.,vSection.z*160.));
float angle=lithic.a*3.14159;
vec2 localFabric=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*vSection.xy;
float lamination=grainNoise(vec3(localFabric.x*42.,localFabric.y*350.,8.));
float lithicTone=.76+lithic.r*.52;
vec3 lithicTint=mix(vec3(.90,.95,1.02),vec3(1.07,1.02,.90),lithic.r);
vec3 dryMatrix=vec3(.042,.045,.040)*lithicTone*lithicTint*(.78+fabric*.35+lamination*.08);
vec3 hydratedMatrix=vec3(.038,.044,.039)*lithicTone*lithicTint*(.80+fabric*.20+lamina*.07+lamination*.09);
vec3 phaseColor=hydratedMatrix, keyColor=vec3(.15,.33,.26);
if(phaseId==1.){phaseColor=vec3(.15,.13,.095);keyColor=vec3(.43,.28,.12);}
if(phaseId==2.){phaseColor=vec3(.026,.033,.037);keyColor=vec3(.12,.24,.42);}
if(phaseId==3.){phaseColor=vec3(.26,.27,.245);keyColor=vec3(.68,.51,.23);}
if(phaseId==4.){phaseColor=vec3(.17,.18,.16);keyColor=vec3(.44,.30,.46);}
if(phaseId==5.){phaseColor=vec3(.012,.017,.016);keyColor=phaseColor;}
float maturity=phaseId==0.?hydration:growth;
if(phaseId==5.)maturity=surface;
diffuseColor.rgb=mix(dryMatrix,phaseColor*(.86+fabric*.24),maturity);
diffuseColor.rgb=mix(diffuseColor.rgb,keyColor,maturity*wettingProcess*.72);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.57,.76,.82),wetEdge*.7);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.055,.30,.38),wetEdge*wettingProcess*.7);
#include <roughnessmap_fragment>`)
   .replace('#include <metalnessmap_fragment>',`roughnessFactor=mix(.88,.23,wetEdge);
if(phaseId==1.||phaseId==2.)roughnessFactor=mix(roughnessFactor,.42,growth);
#include <metalnessmap_fragment>`);
 };
 matrixMaterial.customProgramCacheKey=()=> 'dispersed-lithic-fabric-c0068-v3';
 for(const m of [ice,liquid]){m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;group.add(m);}
 const states=medium.sites.map(()=>({}));
 function place(mesh,index,x,y,z,sx,sy,sz,angle=0){o.position.set(x,y,z);o.rotation.set(.13,angle*.13,angle);o.scale.set(sx,sy,sz);o.updateMatrix();mesh.setMatrixAt(index,o.matrix);}
 let previousT=-1,previousPhase;
 return {
  group,camera:[.7,-2.1,6.4],target:[0,0,-.04],
  update(t,phase){
   if(t===previousT&&phase===previousPhase)return;previousT=t;previousPhase=phase;
   matrixMaterial.color.setHex(phase?0x615e4c:0x353d3c);
   iceMaterial.color.setHex(phase?0x9bdeef:0xd7e8ec);
   liquidMaterial.color.setHex(phase?0x279dc0:0x4d656a);liquidMaterial.opacity=phase?.58:.38;
   medium.sites.forEach((s,i)=>{
    const v=localAlteration(s,t);states[i]=v;
    const r=s.radius,iceScale=Math.cbrt(v.ice);
    for(let j=0;j<3;j++){const a=s.rotation+j*2.399;place(ice,i*3+j,iceSites[i][j].x,iceSites[i][j].y,iceSites[i][j].z,r*(j===0?1:.64)*iceScale,r*.65*iceScale,r*.65*iceScale,a);}
    // Shallow menisci occupy the connected space between grains, rather than a chamber.
    const wetScale=Math.sqrt(v.water);place(liquid,i,s.x,s.y,sectionHeight(s.x,s.y)+.002,r*.95*wetScale,r*.68*wetScale,.002*wetScale,s.rotation);
   });
   ice.visible=t<.5;
   processUniform.value=phase?1:0;
   lookup.forEach((pixel,i)=>{fieldBytes[i*4]=Math.round(Math.max(states[pixel.a].water,states[pixel.b].water*.8)*pixel.weight*255);fieldBytes[i*4+1]=Math.round((states[pixel.a].reaction*.65+states[pixel.b].reaction*.35)*255);fieldBytes[i*4+2]=Math.round((states[pixel.a].crystal*.65+states[pixel.b].crystal*.35)*255);fieldBytes[i*4+3]=255;});wetTexture.needsUpdate=true;
   for(const m of [ice,liquid])m.instanceMatrix.needsUpdate=true;
  },
  moment(t){return t<.17?'Fine ice dispersed between rock grains':t<.38?'Local melting wets adjacent pore surfaces':t<.64?'Water migrates; reaction fronts spread':t<.87?'Phyllosilicate matrix develops; minor phases remain local':'Phyllosilicates dominate · carbonates occupy 1.6% of the reference section';},
  process(t){return t<.17?0:t<.38?1:t<.64?2:3;}
 };
}
