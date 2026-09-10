import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('./viewer.js',import.meta.url),'utf8');
const handler=source.match(/renderer\.domElement\.addEventListener\('webglcontextlost',e=>\{([^\n]+)\},\{signal:combined\}\);/)[1];
const load=source.match(/async function load\(id\)\{[\s\S]*?\n \}\n resize\(\);/)[0].replace(/\n resize\(\);$/,'');
for(const phase of ['model','compile'])test(`WebGL loss during pending ${phase} cannot report a ready viewer`,async()=>{
 let release;const pending=new Promise(resolve=>release=resolve),events=[];
 const context=vm.createContext({contextLost:false,alive:true,version:0,playing:true,last:0,frame:0,world:null,mission:'hayabusa2',camera:{},combined:{},
  cache:new Map(),createMissionScene:()=>phase==='model'?pending:Promise.resolve({group:{}}),
  renderer:{compileAsync:()=>phase==='compile'?pending:Promise.resolve()},scene:{add(){},remove(){}},presentation:{capture(){}},
  setStage(){},resize(){},cancelAnimationFrame(){},onError:()=>events.push('error'),onReady:()=>events.push('ready')});
 vm.runInContext(`${load};globalThis.load=load;globalThis.lose=()=>{const e={preventDefault(){}};${handler}}`,context);
 const loading=context.load('hayabusa2');await Promise.resolve();context.lose();release({group:{}});await loading;
 assert.deepEqual(events,['error']);assert.equal(context.contextLost,true);assert.equal(context.world,null);
});
