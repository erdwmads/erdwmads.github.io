import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const file = new URL('../public/assets/js/research-passkey.js', import.meta.url);
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const origin = 'https://erdwmads.github.io';
const archiveUrl = 'assets/data/mission-log.enc.json';
const encode = value => new TextEncoder().encode(value);
const credentialId = new Uint8Array([11,22,33,44]);
const secret = new Uint8Array(32).fill(87);
const savedPassword = 'synthetic archive password — never a real secret';
const b64 = value => Buffer.from(value).toString('base64url');

const memoryStore = () => {
  const data = new Map();
  return {data, getItem:k=>data.get(k) ?? null, setItem:(k,v)=>data.set(k,v), removeItem:k=>data.delete(k)};
};

async function credential(options, creation, changes = {}) {
  const {publicKey:pk} = options;
  const auth = new Uint8Array(37);
  auth.set(new Uint8Array(await webcrypto.subtle.digest('SHA-256', encode(pk.rp?.id || pk.rpId))));
  auth[32] = 5;
  const client = encode(JSON.stringify({type:creation ? 'webauthn.create' : 'webauthn.get', challenge:b64(pk.challenge), origin, crossOrigin:false, ...changes.client}));
  return {
    type:'public-key', rawId:credentialId.slice().buffer,
    response: {clientDataJSON:client.buffer, authenticatorData:auth.buffer, getAuthenticatorData:()=>auth.buffer},
    getClientExtensionResults:()=>({prf:{enabled:true, results:{first:secret.slice().buffer}}}),
    ...changes
  };
}

function boot({storage=memoryStore(), credentials, secure=true, platform=true} = {}) {
  const calls=[];
  credentials = {
    create:async options=>{calls.push(['create',options]); return credential(options,true);},
    get:async options=>{calls.push(['get',options]); return credential(options,false);},
    ...credentials
  };
  const window={crypto:webcrypto,isSecureContext:secure,location:new URL(origin+'/research-graduation.html'),localStorage:storage,
    PublicKeyCredential:{isUserVerifyingPlatformAuthenticatorAvailable:async()=>platform},
    navigator:{credentials}};
  vm.runInNewContext(source,{window,URL,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DOMException,AbortController,
    atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64')});
  assert.equal(typeof window.MadsResearchPasskey?.forArchive,'function','passkey vault API must exist');
  return {vault:window.MadsResearchPasskey.forArchive(archiveUrl),storage,calls,window};
}
const getRecord = storage => JSON.parse([...storage.data.values()][0]);
const changeRecord = (storage, change) => {const key=[...storage.data.keys()][0];storage.setItem(key,JSON.stringify({...getRecord(storage),...change}));};

test('PRF encrypts the password; a new page restores it using user verification',async()=>{
  const a=boot();
  assert.equal(await a.vault.available(),true);
  assert.equal(a.vault.hasBinding(),false);
  await a.vault.register(savedPassword);
  assert.equal(a.vault.hasBinding(),true);
  const record=getRecord(a.storage);
  assert.equal(record.version,1);
  assert.equal(record.origin,origin);
  assert.equal(record.archiveUrl,origin+'/'+archiveUrl);
  assert.equal(JSON.stringify(record).includes(savedPassword),false);
  assert.equal('password' in record,false);
  assert.equal('key' in record,false);
  assert.equal(a.calls[0][1].publicKey.authenticatorSelection.userVerification,'required');
  assert.equal(a.calls[0][1].publicKey.authenticatorSelection.authenticatorAttachment,'platform');
  const b=boot({storage:a.storage});
  assert.equal(await b.vault.recover(),savedPassword);
  assert.equal(b.calls[0][1].publicKey.userVerification,'required');
  assert.equal(b.calls[0][1].publicKey.rpId,'erdwmads.github.io');
  assert.equal(b.calls[0][1].publicKey.allowCredentials.length,1);
});

test('creation without PRF output performs a get ceremony before saving',async()=>{
  const calls=[];
  const a=boot({credentials:{
    create:async o=>credential(o,true,{getClientExtensionResults:()=>({prf:{enabled:true}})}),
    get:async o=>{calls.push(o);return credential(o,false);}
  }});
  await a.vault.register(savedPassword);
  assert.equal(calls.length,2);
  assert.equal(await a.vault.recover(),savedPassword);
});

test('missing PRF support never saves a shortcut, including a get with no output',async()=>{
  for(const creation of [true,false]) {
    const a=boot({credentials:{
      create:async o=>credential(o,true,{getClientExtensionResults:()=>({prf:{enabled:!creation}})}),
      get:async o=>credential(o,false,{getClientExtensionResults:()=>({prf:{}})})
    }});
    await assert.rejects(a.vault.register(savedPassword),{message:'passkey-prf-unsupported'});
    assert.equal(a.storage.data.size,0);
  }
});

test('ciphertext tampering and a different authenticator secret cannot decrypt',async()=>{
  const a=boot(); await a.vault.register(savedPassword);
  const original=getRecord(a.storage);
  changeRecord(a.storage,{ciphertext:b64(new Uint8Array(80))});
  await assert.rejects(a.vault.recover());
  changeRecord(a.storage,original);
  const b=boot({storage:a.storage,credentials:{get:async o=>credential(o,false,{getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(12).buffer}}})})}});
  await assert.rejects(b.vault.recover());
});

test('wrong origin, challenge, RP hash, user verification and credential ID are rejected',async()=>{
  const a=boot(); await a.vault.register(savedPassword);
  for(const mode of ['origin','challenge','rp','uv','credential','crossOrigin']) {
    const b=boot({storage:a.storage,credentials:{get:async o=>{
      const c=await credential(o,false);
      if(mode==='origin'||mode==='challenge'||mode==='crossOrigin') {
        const client=JSON.parse(new TextDecoder().decode(c.response.clientDataJSON));
        client[mode]=mode==='crossOrigin'?true:'wrong';
        c.response.clientDataJSON=encode(JSON.stringify(client)).buffer;
      } else if(mode==='rp') new Uint8Array(c.response.authenticatorData)[0]^=1;
      else if(mode==='uv') new Uint8Array(c.response.authenticatorData)[32]=1;
      else c.rawId=new Uint8Array([99]).buffer;
      return c;
    }}});
    await assert.rejects(b.vault.recover(),{message:'passkey-verification-failed'},mode);
  }
});

test('invalid local envelopes stay unusable and can be forgotten',async()=>{
  const a=boot(); await a.vault.register(savedPassword);
  const original=getRecord(a.storage);
  for(const changes of [{version:7},{origin:'https://evil.example'},{archiveUrl:origin+'/different.json'},{iv:'abc'},{prfSalt:'abc'},{credentialId:''}]) {
    changeRecord(a.storage,{...original,...changes});
    assert.equal(a.vault.hasBinding(),false);
    await assert.rejects(a.vault.recover(),{message:'passkey-binding-unavailable'});
  }
  a.vault.forget(); assert.equal(a.storage.data.size,0);
});

test('cancelled or aborted enrollment never stores a binding',async()=>{
  const cancelled=boot({credentials:{create:async()=>{throw new DOMException('cancelled','NotAllowedError');}}});
  await assert.rejects(cancelled.vault.register(savedPassword),{name:'NotAllowedError'});
  assert.equal(cancelled.storage.data.size,0);
  const controller=new AbortController();
  const a=boot({credentials:{create:async o=>{const c=await credential(o,true);controller.abort();return c;}}});
  await assert.rejects(a.vault.register(savedPassword,{signal:controller.signal}),{name:'AbortError'});
  assert.equal(a.storage.data.size,0);
});

test('unsupported platform and unavailable local storage preserve password fallback',async()=>{
  assert.equal(await boot({secure:false}).vault.available(),false);
  assert.equal(await boot({platform:false}).vault.available(),false);
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
  const a=boot({storage});
  assert.equal(a.vault.hasBinding(),false);
  await assert.rejects(a.vault.register(savedPassword),{message:'passkey-storage-unavailable'});
});

test('an existing binding is not overwritten by a second registration',async()=>{
  const a=boot();await a.vault.register(savedPassword);
  const original=[...a.storage.data.values()][0];
  await assert.rejects(a.vault.register('replacement'),{message:'passkey-already-linked'});
  assert.equal([...a.storage.data.values()][0],original);
});


test('key derivation uses the unlock assertion path even when creation returns a different output',async()=>{
  const a=boot({credentials:{
    get:async o=>credential(o,false,{getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(12).buffer}}})})
  }});
  await a.vault.register(savedPassword);
  assert.equal(await a.vault.recover(),savedPassword);
});

test('registration rejects an unstable unlock secret before saving any link',async()=>{
  let calls=0;
  const a=boot({credentials:{get:async o=>{
    const value=++calls===1?87:12;
    return credential(o,false,{getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(value).buffer}}})});
  }}});
  await assert.rejects(a.vault.register(savedPassword),{message:'passkey-enrollment-verification-failed'});
  assert.equal(a.storage.data.size,0);
});

test('creation output alone cannot hide an unusable assertion path',async()=>{
  const a=boot({credentials:{
    get:async o=>credential(o,false,{getClientExtensionResults:()=>({prf:{}})})
  }});
  await assert.rejects(a.vault.register(savedPassword),{message:'passkey-prf-unsupported'});
  assert.equal(a.storage.data.size,0);
});

test('local envelope decryption failure is distinct from an archive password failure',async()=>{
  const a=boot();await a.vault.register(savedPassword);
  const b=boot({storage:a.storage,credentials:{
    get:async o=>credential(o,false,{getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(12).buffer}}})})
  }});
  await assert.rejects(b.vault.recover(),{message:'passkey-decryption-failed'});
});

test('cancellation during enrollment verification leaves no saved link',async()=>{
  const a=boot({credentials:{get:async()=>{throw new DOMException('Cancelled','NotAllowedError');}}});
  await assert.rejects(a.vault.register(savedPassword),{name:'NotAllowedError'});
  assert.equal(a.storage.data.size,0);
});
