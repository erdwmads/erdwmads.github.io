import assert from "node:assert/strict";
import { createCipheriv, pbkdf2Sync, randomBytes, webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const researchLock = fs.readFileSync(path.join(scriptsDir, "..", "public", "assets", "js", "research-lock.js"), "utf8");
const password = "correct research password";
const entries = [{ id: "log-001", label: "Test entry" }];

const toBase64 = (value) => Buffer.from(value).toString("base64");

const createPayload = () => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 600000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(entries), "utf8"), cipher.final()]);

  return {
    version: 1,
    kdf: "PBKDF2-SHA-256",
    iterations: 600000,
    cipher: "AES-256-GCM",
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(Buffer.concat([ciphertext, cipher.getAuthTag()]))
  };
};

const validPayload = createPayload();

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.listeners = new Map();
    this.selectCount = 0;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = (this.listeners.get(type) || []).filter((item) => item !== listener);
    this.listeners.set(type, listeners);
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }

  async emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) {
      await listener({ preventDefault() {}, ...event });
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector() {
    return this.button;
  }

  select() {
    this.selectCount += 1;
  }
}

const createClassList = () => {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value)
  };
};

const strictAtob = (value) => {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("invalid base64");
  }
  return Buffer.from(value, "base64").toString("latin1");
};

const bootLock = (fetchImpl, { crypto = webcrypto } = {}) => {
  const gate = new FakeElement();
  gate.dataset.protectedArchiveUrl = "assets/data/mission-log.enc.json";
  const content = new FakeElement();
  content.hidden = true;
  content.innerHTML = '<section data-locked-safe>Locked-safe content</section>';
  const lockedMarkup = content.innerHTML;
  const form = new FakeElement();
  form.button = new FakeElement();
  const input = new FakeElement();
  input.setAttribute("aria-describedby", "research-lock-error");
  const error = new FakeElement();
  error.hidden = true;
  const documentEvents = [];
  const documentEventListeners = new Map();
  const windowEvents = new Map();
  const document = {
    documentElement: { classList: createClassList() },
    querySelector(selector) {
      return {
        "[data-research-lock-gate]": gate,
        "[data-research-lock-content]": content,
        "[data-research-lock-form]": form,
        "[data-research-lock-input]": input,
        "[data-research-lock-error]": error
      }[selector] || null;
    },
    dispatchEvent(event) {
      documentEvents.push(event.type);
      for (const listener of documentEventListeners.get(event.type) || []) listener(event);
    },
    addEventListener(type, listener) {
      const listeners = documentEventListeners.get(type) || [];
      listeners.push(listener);
      documentEventListeners.set(type, listeners);
    }
  };
  document.addEventListener("mads:research-unlocked", () => {
    content.innerHTML = '<article data-decrypted-entry>Decrypted entry</article>';
  });
  const window = {
    crypto,
    addEventListener(type, listener) {
      const listeners = windowEvents.get(type) || [];
      listeners.push(listener);
      windowEvents.set(type, listeners);
    },
    removeEventListener(type, listener) {
      const listeners = (windowEvents.get(type) || []).filter((item) => item !== listener);
      windowEvents.set(type, listeners);
    },
    listenerCount(type) {
      return (windowEvents.get(type) || []).length;
    },
    emit(type, event = {}) {
      for (const listener of windowEvents.get(type) || []) listener(event);
    }
  };
  class CustomEvent {
    constructor(type) {
      this.type = type;
    }
  }

  const context = {
    AbortController,
    CustomEvent,
    Error,
    JSON,
    Number,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    atob: strictAtob,
    document,
    fetch: fetchImpl,
    window
  };
  const initialize = () => vm.runInNewContext(researchLock, context, { filename: "research-lock.js" });
  initialize();

  return { content, document, documentEvents, error, form, gate, initialize, input, lockedMarkup, window };
};

const responseFor = (payload) => ({
  ok: true,
  json: async () => payload
});

const archiveState = (page) =>
  page.window.MadsProtectedArchive && JSON.parse(JSON.stringify(page.window.MadsProtectedArchive));

test("decrypts a valid archive and announces the unlock", async () => {
  const page = bootLock(async () => responseFor(validPayload));
  page.input.value = password;

  await page.form.emit("submit");

  assert.deepEqual(archiveState(page), { entries });
  assert.equal(page.gate.hidden, true);
  assert.equal(page.content.hidden, false);
  assert.deepEqual(page.documentEvents, ["mads:research-unlocked"]);
  assert.equal(page.input.value, "");
  assert.equal(page.input.getAttribute("aria-invalid"), null);
});

test("pagehide fully relocks the archive and restores locked-safe markup", async () => {
  const page = bootLock(async () => responseFor(validPayload));
  page.input.value = password;

  await page.form.emit("submit");
  assert.equal(page.gate.hidden, true);
  assert.equal(page.content.hidden, false);
  assert.equal(page.content.innerHTML.includes("data-decrypted-entry"), true);
  assert.deepEqual(archiveState(page), { entries });

  page.window.emit("pagehide", { persisted: true });

  assert.equal(page.gate.hidden, false);
  assert.equal(page.content.hidden, true);
  assert.equal(page.content.innerHTML, page.lockedMarkup);
  assert.equal(page.input.value, "");
  assert.equal(page.input.getAttribute("aria-invalid"), null);
  assert.equal(page.window.MadsProtectedArchive, undefined);
  assert.equal(page.document.documentElement.classList.contains("research-unlocked"), false);
});

test("persisted pagehide relocks but keeps the visible gate ready for BFCache unlock", async () => {
  let fetchCount = 0;
  const page = bootLock(async () => {
    fetchCount += 1;
    return responseFor(validPayload);
  });
  page.input.value = password;

  await page.form.emit("submit");
  page.window.emit("pagehide", { persisted: true });
  assert.equal(page.gate.hidden, false);
  assert.equal(page.content.hidden, true);
  assert.equal(page.content.innerHTML, page.lockedMarkup);
  assert.equal(page.window.MadsProtectedArchive, undefined);

  page.window.emit("pageshow", { persisted: true });
  page.input.value = password;
  await page.form.emit("submit");

  assert.equal(fetchCount, 2);
  assert.deepEqual(archiveState(page), { entries });
  assert.equal(page.gate.hidden, true);
  assert.equal(page.content.hidden, false);
});

test("wrong passwords and altered authentication tags keep the archive locked", async () => {
  const wrongPasswordPage = bootLock(async () => responseFor(validPayload));
  wrongPasswordPage.input.value = "wrong password";
  await wrongPasswordPage.form.emit("submit");

  assert.equal(wrongPasswordPage.window.MadsProtectedArchive, undefined);
  assert.equal(wrongPasswordPage.gate.hidden, false);
  assert.equal(wrongPasswordPage.content.hidden, true);
  assert.equal(wrongPasswordPage.error.textContent, "Incorrect password.");
  assert.equal(wrongPasswordPage.input.getAttribute("aria-invalid"), "true");

  wrongPasswordPage.input.value = password;
  await wrongPasswordPage.form.emit("submit");
  assert.equal(wrongPasswordPage.input.getAttribute("aria-invalid"), null);
  assert.deepEqual(archiveState(wrongPasswordPage), { entries });

  const alteredPayload = { ...validPayload, ciphertext: `${validPayload.ciphertext.slice(0, -4)}AAAA` };
  const alteredTagPage = bootLock(async () => responseFor(alteredPayload));
  alteredTagPage.input.value = password;
  await alteredTagPage.form.emit("submit");

  assert.equal(alteredTagPage.window.MadsProtectedArchive, undefined);
  assert.equal(alteredTagPage.error.textContent, "Incorrect password.");
});

test("malformed archives, bad iterations, and network failures stay locked", async () => {
  const page = bootLock(async () => responseFor({ ...validPayload, salt: "not base64" }));
  page.input.value = password;

  await page.form.emit("submit");

  assert.equal(page.window.MadsProtectedArchive, undefined);
  assert.equal(page.gate.hidden, false);
  assert.equal(page.content.hidden, true);
  assert.equal(page.error.textContent, "Archive unavailable. Please try again.");
  assert.equal(page.input.getAttribute("aria-invalid"), "true");

  const iterationsPage = bootLock(async () => responseFor({ ...validPayload, iterations: 1 }));
  iterationsPage.input.value = password;
  await iterationsPage.form.emit("submit");
  assert.equal(iterationsPage.window.MadsProtectedArchive, undefined);
  assert.equal(iterationsPage.error.textContent, "Archive unavailable. Please try again.");

  const networkPage = bootLock(async () => {
    throw new TypeError("network unavailable");
  });
  networkPage.input.value = password;
  await networkPage.form.emit("submit");
  assert.equal(networkPage.window.MadsProtectedArchive, undefined);
  assert.equal(networkPage.error.textContent, "Archive unavailable. Please try again.");
});

test("unsupported browsers show a distinct concise message", async () => {
  const page = bootLock(async () => responseFor(validPayload), { crypto: null });
  page.input.value = password;

  await page.form.emit("submit");

  assert.equal(page.window.MadsProtectedArchive, undefined);
  assert.equal(page.error.textContent, "Your browser cannot unlock this archive.");
});

test("duplicate submits start only one decrypt attempt", async () => {
  let fetchCount = 0;
  let resolveFetch;
  const page = bootLock(() => {
    fetchCount += 1;
    return new Promise((resolve) => {
      resolveFetch = resolve;
    });
  });
  page.input.value = password;

  const first = page.form.emit("submit");
  const second = page.form.emit("submit");
  assert.equal(fetchCount, 1);
  resolveFetch(responseFor(validPayload));
  await Promise.all([first, second]);

  assert.deepEqual(archiveState(page), { entries });
});

test("navigation lifecycle events clear data and prevent late decrypts from unlocking", async () => {
  for (const eventType of ["mads:soft-nav-start", "pagehide"]) {
    let fetchCount = 0;
    let resolveFetch;
    let fetchSignal;
    const page = bootLock((url, options) => {
      fetchCount += 1;
      if (fetchCount === 1) {
        fetchSignal = options.signal;
        return new Promise((resolve) => {
          resolveFetch = resolve;
        });
      }
      return Promise.resolve(responseFor(validPayload));
    });
    page.input.value = password;

    const firstAttempt = page.form.emit("submit");
    page.window.emit(eventType);
    assert.equal(fetchSignal.aborted, true);
    resolveFetch(responseFor(validPayload));
    await firstAttempt;

    assert.equal(page.window.MadsProtectedArchive, undefined);
    assert.equal(page.gate.hidden, false);
    assert.equal(page.document.documentElement.classList.contains("research-unlocked"), false);
    assert.equal(page.form.getAttribute("aria-busy"), null);

    page.initialize();
    page.input.value = password;
    await page.form.emit("submit");
    assert.equal(fetchCount, 2);
    assert.deepEqual(archiveState(page), { entries });
  }
});

test("reinitialization replaces stale listeners and allows a fresh unlock", async () => {
  let fetchCount = 0;
  const page = bootLock(async () => {
    fetchCount += 1;
    return responseFor(validPayload);
  });

  page.initialize();
  assert.equal(page.form.listenerCount("submit"), 1);
  assert.equal(page.window.listenerCount("mads:soft-nav-start"), 1);
  assert.equal(page.window.listenerCount("pagehide"), 1);

  page.input.value = password;
  await page.form.emit("submit");
  assert.equal(fetchCount, 1);

  page.window.emit("mads:soft-nav-start");
  assert.equal(page.form.listenerCount("submit"), 0);
  assert.equal(page.window.listenerCount("mads:soft-nav-start"), 0);
  assert.equal(page.window.listenerCount("pagehide"), 0);

  page.initialize();
  page.input.value = password;
  await page.form.emit("submit");
  assert.equal(fetchCount, 2);
  assert.deepEqual(archiveState(page), { entries });
});
