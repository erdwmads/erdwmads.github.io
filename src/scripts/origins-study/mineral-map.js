import {rng} from './materials.js';
import {insideSection,fabricAt} from './breccia-fabric.js';

// Ito et al. 2022, Extended Data Table 1, C0068 row. Includes mapped voids.
// These are reported vol%; the synthetic section uses matching area fractions.
// No inference of bulk Orgueil abundances or initial ice content is made here.
export const modalReference=Object.freeze({
 sample:'Ryugu C0068',doi:'10.1038/s41550-022-01745-5',
 phases:['Phyllosilicates','Sulfides','Magnetite','Carbonates','Apatite','Void'],
 percent:[88,2.4,5.3,1.6,.2,2.5]
});
export function createMineralMap(seed=9068,width=512,height=336){
 const random=rng(seed),ids=new Uint8Array(width*height).fill(255),pixels=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=((x+.5)/width-.5)*4.64,py=((y+.5)/height-.5)*3.04;
  if(insideSection(px,py)){const i=y*width+x;ids[i]=0;pixels.push({i,x:px,y:py,fabric:fabricAt(px,py)});}
 }
 // Irregular, spatially separated phase domains. Rank their areas, not grain counts.
 for(let phase=1;phase<6;phase++){
  const step=[0,.38,.26,.52,.72,.29][phase],nx=Math.ceil(4.64/step)+4,ny=Math.ceil(3.04/step)+4,cells=[];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)cells.push({
   x:(x-2+random())*step-2.32,y:(y-2+random())*step-1.52,
   a:random()*Math.PI,stretch:phase===1?1.6+random():.75+random()*.65,size:.55+random()*.9
  });
  const ranked=[];
  for(const p of pixels){if(ids[p.i])continue;
   const cx=Math.floor((p.x+2.32)/step)+2,cy=Math.floor((p.y+1.52)/step)+2;let score=Infinity;
   for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++){
    const c=cells[y*nx+x],dx=p.x-c.x,dy=p.y-c.y,cos=Math.cos(c.a),sin=Math.sin(c.a);
    const u=(dx*cos+dy*sin)/c.stretch,v=(-dx*sin+dy*cos)*c.stretch;
    score=Math.min(score,(u*u+v*v)/c.size);
   }
   score*=1+.16*Math.sin(p.x*83+phase)*Math.cos(p.y*67-phase);
   // Rank areas globally, but favour distinct lithologies locally. No extra phases are added.
   const f=p.fabric,regional=.3+1.5*Math.exp(-((p.x+.75)**2+(p.y-.30)**2)/.8);
   const affinity=phase===3?(.07+f.richness**2)*regional:phase===5?.1+f.porosity**2:phase===1?.15+f.richness:phase===2?.25+(1-f.tone)*1.5:1;
   score/=affinity;
   ranked.push({i:p.i,score});
  }
  ranked.sort((a,b)=>a.score-b.score);
  const count=Math.round(pixels.length*modalReference.percent[phase]/100);
  for(let i=0;i<count;i++)ids[ranked[i].i]=phase;
 }
 const rgba=new Uint8Array(ids.length*4);
 ids.forEach((id,i)=>{rgba[i*4]=id===255?0:id;rgba[i*4+3]=255;});
 const fabricRGBA=new Uint8Array(ids.length*4);
 for(const p of pixels){const f=p.fabric;fabricRGBA.set([Math.round(f.tone*255),Math.round(f.clast*255),Math.round(f.porosity*255),Math.round(f.angle/Math.PI*255)],p.i*4);}
 return {width,height,ids,rgba,fabricRGBA,reference:modalReference};
}
