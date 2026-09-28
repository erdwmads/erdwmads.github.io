// Compact mission trajectory files (journey.packed.json, ephemeris.packed.json) written by
// scripts/mission-data-pack.mjs. The JSON keeps every string, label, source and scalar verbatim; each
// numeric track is fixed-point integers (value = integer / 10^digits), predicted from earlier decoded
// samples and adaptive-Rice coded into one base64 payload. decodePacked() rebuilds the object that
// JSON.parse() returned for journey.json / ephemeris.json.
export const PACK_FORMAT = 'mission-pack';
export const zigzag = v => v >= 0 ? v * 2 : -v * 2 - 1;
export const unzigzag = z => z % 2 ? -(z + 1) / 2 : z / 2;
export const RICE_ESCAPE = 24;

// Running-mean Rice parameter (LOCO-I style); identical arithmetic in encoder and decoder.
export class RiceState {
 constructor(){this.sum=16;this.count=4;}
 get k(){let k=0,m=this.count*2;while(m<=this.sum){m*=2;k++;}return k;}
 update(z){this.sum+=Math.min(z,32*Math.ceil(this.sum/this.count));if(++this.count>=64){this.sum=Math.ceil(this.sum/2);this.count=32;}}
}
class BitReader {
 constructor(bytes){this.bytes=bytes;this.bit=0;}
 read(n){
  let v=0,scale=1;
  while(n>0){
   const byte=this.bytes[this.bit>>>3],offset=this.bit&7,take=Math.min(8-offset,n);
   if(byte===undefined)throw Error('Packed mission data is truncated');
   v+=(byte>>offset&(1<<take)-1)*scale;scale*=1<<take;n-=take;this.bit+=take;
  }
  return v;
 }
 raw(){return unzigzag(this.read(this.read(6)));}
 unary(){
  let q=0;
  while(q<RICE_ESCAPE){
   const byte=this.bytes[this.bit>>>3];if(byte===undefined)throw Error('Packed mission data is truncated');
   if(!(byte>>(this.bit++&7)&1))return q;q++;
  }
  return q;
 }
 rice(state){const k=state.k,q=this.unary(),z=q<RICE_ESCAPE?q*2**k+this.read(k):this.read(this.read(6));state.update(z);return unzigzag(z);}
}

// Weights of a polynomial through value (order 0) and derivative (order 1) constraints [tau, order]:
// p(1) = sum(w[k] * value[k]) and p'(1) = sum(d[k] * value[k]). Fixed-order Gauss-Jordan elimination
// keeps every prediction bit-identical in the encoder and in each browser.
function weights(rows){
 const n=rows.length,A=rows.map(([tau,order],r)=>{const row=[];for(let j=0;j<n;j++)row.push(order?(j?j*tau**(j-1):0):tau**j);for(let k=0;k<n;k++)row.push(k===r?1:0);return row;});
 for(let c=0;c<n;c++){
  let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;
  [A[c],A[p]]=[A[p],A[c]];
  for(let r=0;r<n;r++)if(r!==c){const f=A[r][c]/A[c][c];for(let k=c;k<2*n;k++)A[r][k]-=f*A[c][k];}
 }
 const w=[],d=[];
 for(let k=0;k<n;k++){let value=0,slope=0;for(let j=0;j<n;j++){const a=A[j][n+k]/A[j][j];value+=a;slope+=j*a;}w.push(value);d.push(slope);}
 return {w,d};
}
const plans=new Map(),clockPlans=new WeakMap();
// Prediction weights depend only on the relative sample spacing, so the few distinct cadences
// (daily, hourly, five-minute and their joins) are solved once and shared by every track.
function plan(kind,t,i){
 let table=clockPlans.get(t);if(!table)clockPlans.set(t,table={A:[],D:[]});
 if(table[kind][i])return table[kind][i];
 const h=t[i]-t[i-1],t2=(t[i-2]-t[i-1])/h,t3=i<3?null:(t[i-3]-t[i-1])/h,key=kind+t2+','+t3;
 let result=plans.get(key);if(result)return table[kind][i]=result;
 if(kind==='A')result={velocity:weights(t3===null?[[0,0],[t2,0]]:[[0,0],[t2,0],[t3,0]]),position:weights([[0,0],[0,1],[t2,1],[1,1]])};
 else{const base=[[0,0],[0,1],[t2,0],[t2,1]];result={velocity:weights(t3===null?base:[...base,[t3,1]]),position:weights([...base,[1,1]])};}
 plans.set(key,result);return table[kind][i]=result;
}
// Predict velocity integer V[i] and, once it is known, position integer X[i] from earlier samples.
// t: seconds; f: position units per (velocity unit x second). Predictor 'A' extrapolates velocity by a
// quadratic and integrates it; 'D' fits positions and velocities with a Hermite-type polynomial.
export function predictState(kind,X,V,t,i,f){
 if(!i)return [0,()=>0];
 const h=t[i]-t[i-1],x0=X[i-1],s=h*f;
 if(i<2)return [V[0],v=>x0+s*(V[0]+v)/2];
 const {velocity,position}=plan(kind,t,i);
 if(kind==='A'){
  const w=velocity.w,pv=w[0]*V[i-1]+w[1]*V[i-2]+(i<3?0:w[2]*V[i-3]),p=position.w;
  return [pv,v=>x0+(p[1]*s*V[i-1]+p[2]*s*V[i-2]+p[3]*s*v)];
 }
 const d=velocity.d,dx=X[i-2]-x0,pv=(d[1]*s*V[i-1]+d[2]*dx+d[3]*s*V[i-2]+(i<3?0:d[4]*s*V[i-3]))/s,p=position.w;
 return [pv,v=>x0+(p[1]*s*V[i-1]+p[2]*dx+p[3]*s*V[i-2]+p[4]*s*v)];
}

const isoTime=(ms,format)=>{const s=new Date(ms).toISOString();return format==='iso-seconds'?s.replace('.000Z','Z'):s;};
function decodeBlock(block,payload,values,clocks){
 const reader=new BitReader(payload.subarray(block.offset,block.offset+block.length));
 if(block.type==='int'){
  const out=[],state=new RiceState();
  for(let i=0;i<block.count;i++)out.push(i?(i>1?2*out[i-1]-out[i-2]:out[0])+reader.rice(state):reader.raw());
  return out;
 }
 if(block.type==='state'){
  const [dp,dv]=block.digits,f=10**(dp-dv),sp=10**dp,sv=10**dv,splice=block.splice;
  if(!clocks.has(block.times))clocks.set(block.times,values[block.times].map(ms=>ms/1000));
  const t=clocks.get(block.times);
  const X=[[],[],[]],V=[[],[],[]],states=Array.from({length:6},()=>new RiceState()),rows=[];
  for(let i=0;i<block.count;i++){
   if(splice&&i>=splice.from&&i<=splice.to){
    const row=values[splice.base][i].map((v,k)=>v+values[splice.add][i-splice.from][k]);
    for(let c=0;c<3;c++){X[c].push(Math.round(row[c]*sp));V[c].push(Math.round(row[c+3]*sv));}
    rows.push(row);continue;
   }
   for(let c=0;c<3;c++){
    const [pv,px]=predictState(block.predictor,X[c],V[c],t,i,f);
    const v=i?Math.round(pv)+reader.rice(states[c+3]):reader.raw();V[c].push(v);
    X[c].push(i?Math.round(px(v))+reader.rice(states[c]):reader.raw());
   }
   rows.push([X[0][i]/sp,X[1][i]/sp,X[2][i]/sp,V[0][i]/sv,V[1][i]/sv,V[2][i]/sv]);
  }
  return rows;
 }
 if(block.type==='samples'){
  const times=values[block.times],rows=values[block.state],flags=Object.entries(block.flags||{}).map(([name,list])=>[name,new Set(list)]);
  return times.map((ms,i)=>{const sample={time:isoTime(ms,block.format),position:rows[i].slice(0,3),velocity:rows[i].slice(3)};for(const [name,set] of flags)if(set.has(i))sample[name]=true;return sample;});
 }
 throw Error('Unknown packed block type '+block.type);
}
function substitute(node,values){
 if(Array.isArray(node))return node.map(v=>substitute(v,values));
 if(node&&typeof node==='object'){
  if(Object.keys(node).length===1&&Number.isInteger(node.$pack))return values[node.$pack];
  const out={};for(const key of Object.keys(node))out[key]=substitute(node[key],values);return out;
 }
 return node;
}
// input: the parsed packed JSON (or its text). The input object is not modified.
export function decodePacked(input){
 const pack=typeof input==='string'?JSON.parse(input):input;
 if(pack?.format!==PACK_FORMAT||typeof pack.payload!=='string')throw Error('Not a packed mission data file');
 if(pack.version!==1)throw Error('Unsupported packed mission data version');
 const text=atob(pack.payload),payload=new Uint8Array(text.length);for(let i=0;i<text.length;i++)payload[i]=text.charCodeAt(i);
 const values=[],clocks=new Map();for(const block of pack.blocks)values.push(decodeBlock(block,payload,values,clocks));
 return substitute(pack.tree,values);
}
// Drop-in for fetch(url).then(r=>r.json()) on the packed files; rejects with message when unavailable.
export async function loadPackedJson(url,signal,message='Mission data unavailable'){
 const response=await fetch(url,{signal});
 if(!response.ok)throw Error(message);
 return decodePacked(await response.json());
}
