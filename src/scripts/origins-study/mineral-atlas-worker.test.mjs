import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createMineralMap,modalReference} from './mineral-map.js';
import {prepareMineralAtlas} from './aqueous-scene.js';

const digest=atlas=>['ids','rgba','fabricRGBA'].map(key=>createHash('sha256').update(atlas[key]).digest('hex'));
const expected=createMineralMap();

test('the worker module posts the same bytes as createMineralMap() and transfers its buffers',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'self');let reply,transfer;
 Object.defineProperty(globalThis,'self',{configurable:true,writable:true,value:{postMessage(data,list){reply=data;transfer=list;}}});
 try{await import('./mineral-map.worker.js');globalThis.self.onmessage({data:null});}
 finally{if(previous)Object.defineProperty(globalThis,'self',previous);else delete globalThis.self;}
 assert.equal(reply.width,expected.width);assert.equal(reply.height,expected.height);
 assert.deepEqual(digest(reply),digest(expected));
 assert.deepEqual(transfer,[reply.ids.buffer,reply.rgba.buffer,reply.fabricRGBA.buffer]);
});

// A stand-in Worker: replies with the worker module's payload, fails to load, or never answers.
function fakeWorker(mode,log){
 return class{
  constructor(url,options){log.push(['create',String(url).split('/').pop(),options.type]);}
  postMessage(){
   if(mode==='reply')setTimeout(()=>{const {width,height,ids,rgba,fabricRGBA}=createMineralMap();this.onmessage({data:{width,height,ids,rgba,fabricRGBA}});});
   if(mode==='error')setTimeout(()=>this.onerror({preventDefault(){log.push(['preventDefault']);}}));
  }
  terminate(){log.push(['terminate']);}
 };
}
async function withWorker(Worker,run){
 const previous=globalThis.Worker;globalThis.Worker=Worker;
 try{return await run();}finally{if(previous)globalThis.Worker=previous;else delete globalThis.Worker;}
}

test('the off-thread atlas is identical to the main-thread one and keeps the modal reference',async()=>{
 const log=[],atlas=await withWorker(fakeWorker('reply',log),()=>prepareMineralAtlas(new AbortController().signal));
 assert.deepEqual(log[0],['create','mineral-map.worker.js','module']);
 assert.deepEqual(digest(atlas),digest(expected));
 assert.equal(atlas.reference,modalReference,'Ryugu C0068 modal reference stays the module object');
 assert.deepEqual(log.at(-1),['terminate']);
});

test('without a usable worker the atlas is computed on the main thread as before',async()=>{
 const log=[],failed=await withWorker(fakeWorker('error',log),()=>prepareMineralAtlas());
 assert.deepEqual(digest(failed),digest(expected));assert.equal(failed.reference,modalReference);
 assert.ok(log.some(([event])=>event==='preventDefault'));
 const missing=await withWorker(undefined,()=>prepareMineralAtlas());
 assert.deepEqual(digest(missing),digest(expected));
});

test('leaving the study stops the worker and resolves without an atlas',async()=>{
 const log=[],abort=new AbortController(),pending=withWorker(fakeWorker('silent',log),()=>{const p=prepareMineralAtlas(abort.signal);abort.abort();return p;});
 assert.equal(await pending,null);assert.deepEqual(log.at(-1),['terminate']);
 const early=new AbortController();early.abort();
 assert.equal(await withWorker(fakeWorker('silent',[]),()=>prepareMineralAtlas(early.signal)),null);
});
