(() => {
  const gate = document.querySelector('[data-research-lock-gate]');
  const content = document.querySelector('[data-research-lock-content]');
  const form = document.querySelector('[data-research-lock-form]');
  const input = document.querySelector('[data-research-lock-input]');
  const error = document.querySelector('[data-research-lock-error]');

  if (!gate || !content || !form || !input) return;

  const archiveUrl = gate.dataset.protectedArchiveUrl;
  let isDecrypting = false;

  const setError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  };

  const clearError = () => {
    if (!error) return;
    error.hidden = true;
    error.textContent = '';
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
      !Number.isSafeInteger(payload.iterations) ||
      payload.iterations <= 0
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

  const decryptArchive = async (password) => {
    if (!archiveUrl || !window.crypto?.subtle) {
      throw new Error('archive-unavailable');
    }

    const response = await fetch(archiveUrl, { cache: 'no-store' });
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isDecrypting) return;

    isDecrypting = true;
    clearError();

    const password = String(input.value || '');
    const button = form.querySelector('button[type="submit"]');
    form.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;

    try {
      const entries = await decryptArchive(password);
      unlock(entries);
    } catch (caughtError) {
      if (caughtError?.name === 'OperationError') {
        setError('Incorrect password.');
      } else {
        setError('This browser cannot verify the password here. Try a current browser.');
      }
      input.select?.();
    } finally {
      isDecrypting = false;
      form.removeAttribute('aria-busy');
      if (button) button.disabled = false;
    }
  });

  window.addEventListener('pagehide', () => {
    delete window.MadsProtectedArchive;
  });
})();
