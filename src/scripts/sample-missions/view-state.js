import {missions} from './data.js';
import {isProximity} from './proximity.js';
import {hasEarthContext} from './locations.js';
const sessionKey='mads:mission-views:v1';
export function validateView(value){
 if(!value||typeof value!=='object'||!Object.hasOwn(missions,value.mission))return null;
 const chapter=missions[value.mission].stages.find(s=>s.id===value.chapter);if(!chapter)return null;
 const {progress=0,reference='earth',focus='both',context=chapter.kind==='return'?'earth':'detail',cutaway=false}=value;
 if(typeof progress!=='number'||!Number.isFinite(progress)||progress<0||progress>1||!['earth','sun'].includes(reference)||!['both','asteroid','spacecraft'].includes(focus)||!['earth','detail'].includes(context)||typeof cutaway!=='boolean')return null;
 return {mission:value.mission,chapter:chapter.id,progress,reference:chapter.kind==='flyby'?reference:'earth',focus:isProximity(chapter.kind)?focus:'both',context:hasEarthContext(chapter.kind)?context:'detail',cutaway:value.mission==='hayabusa2'&&chapter.kind==='sample'&&cutaway};
}
export function viewFromViewer(state){
 if(!state||!Object.hasOwn(missions,state.mission))return null;
 return validateView({...state,chapter:missions[state.mission].stages[state.stage]?.id});
}
export function parseViewHash(hash){
 if(typeof hash!=='string'||hash.length>2048)return null;
 const params=new URLSearchParams(hash.replace(/^#/,''));
 if(params.get('mission-view')!=='1'||params.has('observe'))return null;
 for(const key of params.keys())if(params.getAll(key).length!==1)return null;
 const value=Object.fromEntries(params);
 if(params.has('progress')){if(!/^\d+(\.\d+)?$/.test(value.progress))return null;value.progress=Number(value.progress);}
 if(params.has('cutaway')){if(!['0','1'].includes(value.cutaway))return null;value.cutaway=value.cutaway==='1';}
 return validateView(value);
}
export function viewURL(href,value){
 const view=validateView(value);if(!view)return null;
 const url=new URL(href);url.hash=new URLSearchParams({'mission-view':'1',...view,progress:String(Math.round(view.progress*1000000)/1000000),cutaway:view.cutaway?'1':'0'}).toString();return url.href;
}
export function readSession(storage){
 const result={active:'hayabusa2',views:{}};
 try{const data=JSON.parse(storage.getItem(sessionKey));if(data?.version!==1)return result;
  for(const id of Object.keys(missions)){const view=validateView(data.views?.[id]);if(view?.mission===id)result.views[id]=view;}
  if(Object.hasOwn(missions,data.active))result.active=data.active;
 }catch{}return result;
}
export function writeSession(storage,state){
 const views={};for(const id of Object.keys(missions)){const view=validateView(state.views[id]);if(view?.mission===id)views[id]=view;}
 try{storage.setItem(sessionKey,JSON.stringify({version:1,active:state.active,views}));}catch{}
}
// Call only when the selected mission has loaded. Never restore playback or an arbitrary camera matrix.
export function restoreView(viewer,value){
 const view=validateView(value);if(!view)return false;
 const chapter=missions[view.mission].stages.findIndex(s=>s.id===view.chapter),kind=missions[view.mission].stages[chapter].kind;
 viewer.play(false);viewer.select(chapter,view.progress);
 if(kind==='flyby')viewer.action('frame-'+view.reference);
 if(isProximity(kind))viewer.action(view.focus);
 if(hasEarthContext(kind))viewer.action(view.context);
 if(view.cutaway!==viewer.state.cutaway)viewer.action('cutaway');
 return true;
}
