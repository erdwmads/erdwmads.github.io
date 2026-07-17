(() => {
  const gate = document.querySelector('[data-research-lock-gate]');
  const content = document.querySelector('[data-research-lock-content]');
  const form = document.querySelector('[data-research-lock-form]');
  const input = document.querySelector('[data-research-lock-input]');
  const error = document.querySelector('[data-research-lock-error]');

  if (!gate || !content || !form || !input) return;

  const archiveIterations = 600000;
  const archiveUrl = gate.dataset.protectedArchiveUrl;
  let isDecrypting = false;
  let attemptToken = 0;
  let archiveController = null;

  const setError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
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
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isDecrypting) return;

    isDecrypting = true;
    const currentAttempt = ++attemptToken;
    const currentController = typeof AbortController === 'function' ? new AbortController() : null;
    archiveController = currentController;
    clearError();

    const password = String(input.value || '');
    setBusy(true);

    try {
      const entries = await decryptArchive(password, currentController?.signal);
      if (currentAttempt !== attemptToken) return;
      unlock(entries);
    } catch (caughtError) {
      if (currentAttempt !== attemptToken) return;
      if (caughtError?.name === 'OperationError') {
        setError('Incorrect password.');
      } else if (caughtError?.message === 'unsupported-crypto') {
        setError('Your browser cannot unlock this archive.');
      } else {
        setError('Archive unavailable. Please try again.');
      }
      input.select?.();
    } finally {
      if (currentAttempt === attemptToken) {
        isDecrypting = false;
        if (archiveController === currentController) archiveController = null;
        setBusy(false);
      }
    }
  });

  window.addEventListener('mads:soft-nav-start', invalidateAccess);
  window.addEventListener('pagehide', invalidateAccess);
})();
