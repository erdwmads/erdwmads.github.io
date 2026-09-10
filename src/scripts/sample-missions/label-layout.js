// Place annotations around the inset and earlier labels without moving models.
export function placeLabel(x,y,width,height,occupied,viewport){
 const clamp=(x,y)=>({x:Math.max(10,Math.min(x,viewport.width-width-10)),y:Math.max(12,Math.min(y,viewport.height-height-45)),width,height});
 const overlaps=(a,b)=>a.x<b.x+b.width+6&&a.x+a.width+6>b.x&&a.y<b.y+b.height+6&&a.y+a.height+6>b.y;
 let box=clamp(x,y);
 for(let pass=0;pass<occupied.length+1;pass++){
  const hit=occupied.find(o=>overlaps(box,o));if(!hit)return box;
  const candidates=[clamp(box.x,hit.y+hit.height+8),clamp(hit.x+hit.width+8,box.y),clamp(box.x,hit.y-height-8),clamp(hit.x-width-8,box.y)];
  candidates.sort((a,b)=>occupied.filter(o=>overlaps(a,o)).length-occupied.filter(o=>overlaps(b,o)).length||Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));box=candidates[0];
 }
 return box;
}
