/* Local encrypted shortcut. The archive password is never persisted in plaintext. */
(() => {
  const purpose = 'mads-research-passkey-v1';
  const bytes = value => new Uint8Array(value);
  const encode = value => new TextEncoder().encode(value);
  const toBase64 = value => btoa(String.fromCharCode(...bytes(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromBase64 = value => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 16384) throw new Error('passkey-binding-unavailable');
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), c => c.charCodeAt(0));
  };
  const equal = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
  const checkAbort = signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
  const random = length => window.crypto.getRandomValues(new Uint8Array(length));

  const forArchive = archivePath => {
    const origin = window.location.origin;
    const rpId = window.location.hostname;
    const archiveUrl = new URL(archivePath, window.location.href).href;
    if (new URL(archiveUrl).origin !== origin) throw new Error('passkey-archive-origin');
    const storageKey = purpose + ':' + new URL(archiveUrl).pathname;
    const storage = () => {
      try { return window.localStorage; } catch { throw new Error('passkey-storage-unavailable'); }
    };
    const readBinding = () => {
      try {
        const record = JSON.parse(storage().getItem(storageKey));
        if (!record || record.version !== 1 || record.origin !== origin || record.archiveUrl !== archiveUrl ||
            fromBase64(record.credentialId).length > 1024 || fromBase64(record.prfSalt).length !== 32 ||
            fromBase64(record.iv).length !== 12 || fromBase64(record.ciphertext).length < 17) return null;
        return record;
      } catch { return null; }
    };
    const available = async () => {
      try {
        return !!(window.isSecureContext && window.crypto?.subtle &&
          window.navigator?.credentials?.create && window.navigator?.credentials?.get &&
          await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable());
      } catch { return false; }
    };
    const assertStorage = () => {
      const probe = storageKey + ':probe';
      try { storage().setItem(probe, '1'); storage().removeItem(probe); }
      catch { throw new Error('passkey-storage-unavailable'); }
    };
    const verify = async (credential, challenge, creation, expectedId) => {
      // Only the failed check is exposed; never include response data or secrets.
      let check = 'TYPE';
      try {
        if (credential?.type !== 'public-key') throw Error();
        check = 'ID-SIZE';
        if (!credential.rawId?.byteLength || credential.rawId.byteLength > 1024) throw Error();
        check = 'ID';
        if (expectedId && !equal(bytes(credential.rawId), expectedId)) throw Error();
        check = 'CLIENT-JSON';
        const client = JSON.parse(new TextDecoder().decode(credential.response.clientDataJSON));
        check = 'CLIENT-TYPE';
        if (client?.type !== (creation ? 'webauthn.create' : 'webauthn.get')) throw Error();
        check = 'ORIGIN';
        if (client.origin !== origin) throw Error();
        check = 'CHALLENGE';
        if (client.challenge !== toBase64(challenge)) throw Error();
        check = 'CROSS-ORIGIN';
        if (client.crossOrigin === true) throw Error();
        check = 'AUTH-DATA';
        const auth = bytes(creation ? credential.response.getAuthenticatorData() : credential.response.authenticatorData);
        if (auth.length < 37) throw Error();
        check = 'RP-HASH';
        const rpHash = bytes(await window.crypto.subtle.digest('SHA-256', encode(rpId)));
        if (!equal(auth.slice(0, 32), rpHash)) throw Error();
        check = 'UP';
        if ((auth[32] & 1) !== 1) throw Error();
        check = 'UV';
        if ((auth[32] & 4) !== 4) throw Error();
      } catch {
        const error = new Error('passkey-verification-failed');
        error.code = 'PK-' + (creation ? 'CREATE' : 'GET') + '-' + check;
        throw error;
      }
    };
    const prfOutput = credential => {
      const output = credential.getClientExtensionResults()?.prf?.results?.first;
      if (output?.byteLength !== 32) throw new Error('passkey-prf-unsupported');
      return bytes(output);
    };
    const getSecret = async (record, signal) => {
      checkAbort(signal);
      const challenge = random(32);
      const credential = await window.navigator.credentials.get({
        publicKey: {
          rpId, challenge, timeout: 60000, userVerification: 'required',
          allowCredentials: [{type:'public-key', id:fromBase64(record.credentialId)}],
          extensions: {prf:{eval:{first:fromBase64(record.prfSalt)}}}
        },
        signal
      });
      checkAbort(signal);
      await verify(credential, challenge, false, fromBase64(record.credentialId));
      return prfOutput(credential);
    };
    const aad = record => encode(JSON.stringify([purpose, origin, archiveUrl, record.credentialId]));
    const wrappingKey = async (secret, record) => {
      try {
        const material = await window.crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
        return await window.crypto.subtle.deriveKey(
          {name:'HKDF', hash:'SHA-256', salt:fromBase64(record.prfSalt), info:aad(record)},
          material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']
        );
      } finally { secret.fill(0); }
    };
    const decryptBinding = async (record, signal) => {
      const secret = await getSecret(record, signal);
      const key = await wrappingKey(secret, record);
      checkAbort(signal);
      try {
        return bytes(await window.crypto.subtle.decrypt(
          {name:'AES-GCM',iv:fromBase64(record.iv),additionalData:aad(record)}, key, fromBase64(record.ciphertext)
        ));
      } catch (error) {
        if (error?.name === 'OperationError') throw new Error('passkey-decryption-failed');
        throw error;
      }
    };
    const register = async (password, {signal} = {}) => {
      checkAbort(signal);
      if (readBinding()) throw new Error('passkey-already-linked');
      if (!await available()) throw new Error('passkey-unavailable');
      assertStorage();
      if (typeof password !== 'string' || !password || encode(password).length > 4096) throw new Error('passkey-password-invalid');
      checkAbort(signal);
      const challenge = random(32);
      const salt = random(32);
      const credential = await window.navigator.credentials.create({
        publicKey: {
          rp: {id:rpId, name:'Mads LIU Yong · Research Log'},
          user: {id:random(32), name:'Research Log on this browser', displayName:'Research Log'},
          challenge, pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
          timeout:60000, attestation:'none',
          authenticatorSelection:{authenticatorAttachment:'platform', residentKey:'required', userVerification:'required'},
          extensions:{prf:{}}
        },
        signal
      });
      checkAbort(signal);
      await verify(credential, challenge, true);
      const extension = credential.getClientExtensionResults()?.prf;
      if (extension?.enabled !== true) throw new Error('passkey-prf-unsupported');
      const record = {version:1, origin, archiveUrl, credentialId:toBase64(credential.rawId), prfSalt:toBase64(salt), iv:toBase64(random(12))};
      // Derive the wrapping key through the same assertion used for future unlocks.
      const secret = await getSecret(record, signal);
      const key = await wrappingKey(secret, record);
      const clear = encode(password);
      try {
        const encrypted = await window.crypto.subtle.encrypt({name:'AES-GCM',iv:fromBase64(record.iv),additionalData:aad(record)}, key, clear);
        checkAbort(signal);
        record.ciphertext = toBase64(encrypted);
        // A created credential is not a working unlock: prove the assertion path
        // decrypts this envelope before saving a link or reporting success.
        try {
          const verified = await decryptBinding(record, signal);
          try { if (!equal(verified, clear)) throw new Error('passkey-enrollment-verification-failed'); }
          finally { verified.fill(0); }
        } catch (error) {
          if (error?.message === 'passkey-decryption-failed') throw new Error('passkey-enrollment-verification-failed');
          throw error;
        }
        checkAbort(signal);
        // Recheck at commit time: another tab may have enrolled during the ceremony.
        if (readBinding()) throw new Error('passkey-already-linked');
        try {
          storage().setItem(storageKey, JSON.stringify(record));
          if (storage().getItem(storageKey) !== JSON.stringify(record)) throw Error();
        } catch { throw new Error('passkey-storage-unavailable'); }
      } finally { clear.fill(0); }
    };
    const recover = async ({signal} = {}) => {
      checkAbort(signal);
      const record = readBinding();
      if (!record) throw new Error('passkey-binding-unavailable');
      const clear = await decryptBinding(record, signal);
      try { checkAbort(signal); return new TextDecoder('utf-8', {fatal:true}).decode(clear); }
      finally { clear.fill(0); }
    };
    const forget = () => {
      try { storage().removeItem(storageKey); }
      catch { throw new Error('passkey-storage-unavailable'); }
    };
    return {available, hasBinding:() => !!readBinding(), register, recover, forget};
  };
  window.MadsResearchPasskey = {forArchive};
})();
