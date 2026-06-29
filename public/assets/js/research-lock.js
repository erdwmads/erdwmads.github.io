(() => {
  const gate = document.querySelector('[data-research-lock-gate]');
  const content = document.querySelector('[data-research-lock-content]');
  const form = document.querySelector('[data-research-lock-form]');
  const input = document.querySelector('[data-research-lock-input]');
  const error = document.querySelector('[data-research-lock-error]');

  if (!gate || !content || !form || !input) return;

  const expectedHash = 'c70de696ba32206485f4f0d2b3ceba1ba1fec7328e9ebca874ae29b7c3b295b5';

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

  const sha256 = async (value) => {
    if (!window.crypto?.subtle) {
      throw new Error('crypto-unavailable');
    }
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  const unlock = () => {
    gate.hidden = true;
    content.hidden = false;
    document.documentElement.classList.add('research-unlocked');
    document.dispatchEvent(new CustomEvent('mads:research-unlocked'));
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const password = String(input.value || '');
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    try {
      const hash = await sha256(password);
      if (hash !== expectedHash) {
        setError('Incorrect password.');
        input.select?.();
        return;
      }

      unlock();
    } catch (error) {
      setError('This browser cannot verify the password here. Try a current browser.');
    } finally {
      if (button) button.disabled = false;
    }
  });
})();
