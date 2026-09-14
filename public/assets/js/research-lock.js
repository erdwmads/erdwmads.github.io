(() => {
  const cleanupKey = '__madsResearchLockCleanup';
  window[cleanupKey]?.();

  const gate = document.querySelector('[data-research-lock-gate]');
  const content = document.querySelector('[data-research-lock-content]');
  const form = document.querySelector('[data-research-lock-form]');
  const input = document.querySelector('[data-research-lock-input]');
  const error = document.querySelector('[data-research-lock-error]');
  const passkeySetup = document.querySelector('[data-passkey-setup]');
  const passkeyUnlock = document.querySelector('[data-passkey-unlock]');
  const passkeyForget = document.querySelector('[data-passkey-forget]');
  const passkeyStatus = document.querySelector('[data-passkey-status]');
  const passkeyControls = document.querySelector('[data-passkey-controls]');
  const session = document.querySelector('[data-research-lock-session]');
  const lockButton = document.querySelector('[data-research-lock-now]');
  const sessionNotice = document.querySelector('[data-research-session-notice]');

  if (!gate || !content || !form || !input) return;

  const archiveIterations = 600000;
  const archiveUrl = gate.dataset.protectedArchiveUrl;
  const lockedContentMarkup = content.innerHTML;
  const lockedContentHidden = content.hidden;
  let isDecrypting = false;
  let attemptToken = 0;
  let archiveController = null;
  let disposed = false;
  let platformAvailable = false;
  let passkeys = null;
  try { passkeys = window.MadsResearchPasskey?.forArchive(archiveUrl); } catch {}

  const refreshPasskeys = () => {
    if (!passkeys || disposed) return;
    const linked = passkeys.hasBinding();
    if (passkeyControls) passkeyControls.hidden = false;
    if (passkeySetup) passkeySetup.hidden = !platformAvailable || linked;
    if (passkeyUnlock) passkeyUnlock.hidden = !linked;
    if (passkeyForget) passkeyForget.hidden = !linked;
    if (passkeyStatus) passkeyStatus.textContent = linked
      ? 'A passkey is linked on this browser. Your device will ask you to verify.'
      : platformAvailable
        ? 'To link this browser, enter your archive password and choose Set up passkey. Complete all device prompts; setup includes an unlock verification.'
        : 'Passkey setup is unavailable here. Use your password, or open this page in Edge or Chrome with Windows Hello enabled.';
  };

  const setError = (message, passwordError = true) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    if (passwordError) input.setAttribute('aria-invalid', 'true');
  };

  const clearError = () => {
    if (!error) return;
    error.hidden = true;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
  };

  const setBusy = (isBusy) => {
    const button = form.querySelector('button[type="submit"]');
    if (isBusy) form.setAttribute('aria-busy', 'true');
    else form.removeAttribute('aria-busy');
    if (button) button.disabled = isBusy;
    for (const control of [passkeySetup, passkeyUnlock, passkeyForget]) {
      if (control) control.disabled = isBusy;
    }
  };

  const fromBase64 = (value) => {
    if (typeof value !== 'string' || !value) {
      throw new Error('invalid-archive');
    }

    try {
      return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    } catch {
      throw new Error('invalid-archive');
    }
  };

  const validateArchive = (payload) => {
    if (
      !payload ||
      payload.version !== 1 ||
      payload.kdf !== 'PBKDF2-SHA-256' ||
      payload.cipher !== 'AES-256-GCM' ||
      payload.iterations !== archiveIterations
    ) {
      throw new Error('invalid-archive');
    }

    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const ciphertext = fromBase64(payload.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length <= 16) {
      throw new Error('invalid-archive');
    }

    return { salt, iv, ciphertext };
  };

  const decryptArchive = async (password, signal) => {
    if (!window.crypto?.subtle) {
      throw new Error('unsupported-crypto');
    }
    if (!archiveUrl) {
      throw new Error('archive-unavailable');
    }

    const response = await fetch(archiveUrl, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('archive-unavailable');

    const payload = await response.json();
    const { salt, iv, ciphertext } = validateArchive(payload);
    const material = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations: payload.iterations
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const clear = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const entries = JSON.parse(new TextDecoder().decode(clear));
    if (!Array.isArray(entries) || !entries.length) {
      throw new Error('invalid-archive');
    }

    return entries;
  };

  const unlock = (entries) => {
    window.MadsProtectedArchive = { entries };
    input.value = '';
    gate.hidden = true;
    content.hidden = false;
    if (session) session.hidden = false;
    document.documentElement.classList.add('research-unlocked');
    document.dispatchEvent(new CustomEvent('mads:research-unlocked'));
  };

  const invalidateAccess = () => {
    attemptToken += 1;
    isDecrypting = false;
    archiveController?.abort();
    archiveController = null;
    setBusy(false);
    delete window.MadsProtectedArchive;
    document.documentElement.classList.remove('research-unlocked');
    input.value = '';
    clearError();
    gate.hidden = false;
    content.hidden = lockedContentHidden;
    if (session) session.hidden = true;
    content.innerHTML = lockedContentMarkup;
    document.dispatchEvent(new CustomEvent('mads:research-locked'));
    refreshPasskeys();
  };

  const passkeyMessage = (caughtError) => {
    if (caughtError?.name === 'NotAllowedError' || caughtError?.name === 'AbortError') return 'Passkey verification was cancelled or timed out. Try again or use your password.';
    if (caughtError?.message === 'passkey-verification-failed') {
      const code = /^PK-(CREATE|GET)-(TYPE|ID-SIZE|ID|CLIENT-JSON|CLIENT-TYPE|ORIGIN|CHALLENGE|CROSS-ORIGIN|AUTH-DATA|RP-HASH|UP|UV)$/.test(caughtError.code)
        ? caughtError.code : 'PK-VERIFY';
      return 'The passkey could not be verified. Use your password. [' + code + ']';
    }
    return {
      'passkey-prf-unsupported': 'This passkey cannot decrypt the archive because it does not support PRF. Use your password. An unused passkey may remain in your device’s passkey settings.',
      'passkey-unavailable': 'Passkey setup is unavailable in this browser. Use your password.',
      'passkey-storage-unavailable': 'This browser could not save the encrypted shortcut. Allow site storage or use your password.',
      'passkey-binding-unavailable': 'No usable passkey link was found on this browser. Unlock with your password to set one up.',
      'passkey-already-linked': 'This browser already has a passkey link. Use it, or forget this browser before setting up a replacement.',
      'passkey-decryption-failed': 'Device verification completed, but this browser’s encrypted shortcut could not be decrypted. Choose Forget this browser, then set up again with your current archive password. [PK-LOCAL]',
      'passkey-enrollment-verification-failed': 'The device created a passkey, but its unlock test failed. No browser link was saved. Use your password. [PK-SETUP]',
    }[caughtError?.message] || 'The passkey could not unlock this archive. Use your password; if it has changed, forget this browser and set up the passkey again.';
  };

  const runUnlock = async (mode) => {
    if (isDecrypting || disposed) return;
    if (mode === 'setup' && form.reportValidity && !form.reportValidity()) return;
    if (mode !== 'password' && !passkeys) return;
    isDecrypting = true;
    const currentAttempt = ++attemptToken;
    const currentController = typeof AbortController === 'function' ? new AbortController() : null;
    archiveController = currentController;
    clearError();
    setBusy(true);
    let phase = mode === 'passkey' ? 'passkey' : 'archive';
    let password = '';
    try {
      password = mode === 'passkey'
        ? await passkeys.recover({signal:currentController?.signal})
        : String(input.value || '');
      if (currentAttempt !== attemptToken) return;
      phase = 'archive';
      const entries = await decryptArchive(password, currentController?.signal);
      if (currentAttempt !== attemptToken) return;
      if (mode === 'setup') {
        phase = 'passkey';
        if (passkeyStatus) passkeyStatus.textContent = 'Follow the device prompts to create the passkey and verify that it can unlock this browser…';
        await passkeys.register(password, {signal:currentController?.signal});
        if (currentAttempt !== attemptToken) return;
      }
      if (sessionNotice) sessionNotice.textContent = mode === 'setup'
        ? 'Passkey linked on this browser. Keep your archive password for recovery.'
        : 'Unlocked for this page. Leaving the page locks the archive.';
      unlock(entries);
    } catch (caughtError) {
      if (currentAttempt !== attemptToken) return;
      if (phase === 'archive' && mode === 'passkey' && caughtError?.name === 'OperationError') {
        setError('The passkey recovered its saved password, but that password could not decrypt the current archive. If your password changed, forget this browser and set up again with the current password. [PK-ARCHIVE]', false);
      } else if (phase === 'passkey') {
        setError(passkeyMessage(caughtError), false);
      } else if (caughtError?.name === 'OperationError') {
        setError('Incorrect password.');
      } else if (caughtError?.message === 'unsupported-crypto') {
        setError('Your browser cannot unlock this archive.');
      } else {
        setError('Archive unavailable. Please try again.');
      }
      if (mode !== 'passkey') input.select?.();
    } finally {
      password = '';
      if (currentAttempt === attemptToken) {
        isDecrypting = false;
        if (archiveController === currentController) archiveController = null;
        setBusy(false);
        refreshPasskeys();
      }
    }
  };

  const onSubmit = event => { event.preventDefault(); return runUnlock('password'); };
  const onSetup = event => { event.preventDefault(); return runUnlock('setup'); };
  const onPasskey = event => { event.preventDefault(); return runUnlock('passkey'); };
  const onForget = () => {
    if (isDecrypting || !passkeys) return;
    clearError();
    try {
      passkeys.forget();
      refreshPasskeys();
      if (passkeyStatus) passkeyStatus.textContent = 'The encrypted shortcut was removed from this browser. The passkey itself remains in your device’s passkey settings.';
    } catch (caughtError) { setError(passkeyMessage(caughtError), false); }
  };

  const onSoftNavigation = () => invalidateAccess();

  const onPageHide = (event) => {
    if (event.persisted) invalidateAccess();
    else teardown();
  };

  const teardown = () => {
    disposed = true;
    invalidateAccess();
    form.removeEventListener('submit', onSubmit);
    passkeySetup?.removeEventListener('click', onSetup);
    passkeyUnlock?.removeEventListener('click', onPasskey);
    passkeyForget?.removeEventListener('click', onForget);
    lockButton?.removeEventListener('click', invalidateAccess);
    window.removeEventListener('storage', refreshPasskeys);
    window.removeEventListener('mads:soft-nav-start', onSoftNavigation);
    window.removeEventListener('mads:soft-nav-before-swap', teardown);
    window.removeEventListener('pagehide', onPageHide);
    if (window[cleanupKey] === teardown) delete window[cleanupKey];
  };

  form.addEventListener('submit', onSubmit);
  passkeySetup?.addEventListener('click', onSetup);
  passkeyUnlock?.addEventListener('click', onPasskey);
  passkeyForget?.addEventListener('click', onForget);
  lockButton?.addEventListener('click', invalidateAccess);
  window.addEventListener('storage', refreshPasskeys);
  if (passkeys) {
    refreshPasskeys();
    passkeys.available().then(supported => {
      if (disposed) return;
      platformAvailable = supported;
      refreshPasskeys();
    });
  }
  window.addEventListener('mads:soft-nav-start', onSoftNavigation);
  window.addEventListener('mads:soft-nav-before-swap', teardown);
  window.addEventListener('pagehide', onPageHide);
  window[cleanupKey] = teardown;
})();
