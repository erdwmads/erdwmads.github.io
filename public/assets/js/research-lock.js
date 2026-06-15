(() => {
  const HASH = 'c70de696ba32206485f4f0d2b3ceba1ba1fec7328e9ebca874ae29b7c3b295b5';
  const STORAGE_KEY = 'mads-research-log-unlocked';

  const gate = document.querySelector('[data-research-lock-gate]');
  const content = document.querySelector('[data-research-lock-content]');
  if (!gate || !content) return;

  const form = gate.querySelector('[data-research-lock-form]');
  const input = form?.querySelector('input[name="password"]');
  const message = gate.querySelector('[data-research-lock-message]');

  const setMessage = (text) => {
    if (message) message.textContent = text;
  };

  const unlock = () => {
    content.hidden = false;
    gate.hidden = true;
    document.documentElement.classList.add('research-log-unlocked');
    document.dispatchEvent(new CustomEvent('mads:research-log-unlocked'));
  };

  const digest = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const alreadyUnlocked = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === HASH;
    } catch (error) {
      return false;
    }
  };

  const rememberUnlock = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, HASH);
    } catch (error) {}
  };

  if (alreadyUnlocked()) {
    unlock();
    return;
  }

  gate.hidden = false;
  content.hidden = true;
  window.requestAnimationFrame(() => input?.focus({ preventScroll: true }));

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = String(input?.value || '');
    if (!password) {
      setMessage('Enter the password.');
      return;
    }
    if (!crypto?.subtle?.digest) {
      setMessage('This browser cannot unlock the research log.');
      return;
    }

    setMessage('Checking...');
    const result = await digest(password);
    if (result === HASH) {
      rememberUnlock();
      setMessage('');
      unlock();
    } else {
      setMessage('Incorrect password.');
      input?.select();
    }
  });
})();
