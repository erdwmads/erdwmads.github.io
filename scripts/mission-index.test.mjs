import assert from "node:assert/strict";
import { createCipheriv, pbkdf2Sync, randomBytes, webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const researchLock = fs.readFileSync(path.join(scriptsDir, "..", "public", "assets", "js", "research-lock.js"), "utf8");
const missionIndex = fs.readFileSync(path.join(scriptsDir, "..", "public", "assets", "js", "mission-index.js"), "utf8");
const password = "correct research password";

const firstEntries = [
  { id: "log-001", number: 1, date: "2026/01/01", label: "LOG 001", bodyHtml: "<p>First archive</p>" },
  { id: "log-002", number: 2, date: "2026/01/02", label: "LOG 002", bodyHtml: "<p>First latest</p>" }
];
const secondEntries = [
  { id: "log-003", number: 3, date: "2026/01/03", label: "LOG 003", bodyHtml: "<p>Fresh archive</p>" }
];

const toBase64 = (value) => Buffer.from(value).toString("base64");

const createPayload = (entries) => {
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

const createClassList = () => {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value)
  };
};

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.classList = createClassList();
    this.dataset = {};
    this.hidden = false;
    this.listeners = new Map();
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this._innerHTML = "";
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.onInnerHTML?.(this._innerHTML);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener));
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
    return this.button || null;
  }

  querySelectorAll() {
    return [];
  }

  contains() {
    return true;
  }

  select() {}
}

const strictAtob = (value) => {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|(?:[A-Za-z0-9+/]{3}=))?$/.test(value)) {
    throw new Error("invalid base64");
  }
  return Buffer.from(value, "base64").toString("latin1");
};

const flush = async () => new Promise((resolve) => setImmediate(resolve));

const bootPage = (payloads) => {
  const gate = new FakeElement();
  gate.dataset.protectedArchiveUrl = "assets/data/mission-log.enc.json";
  const content = new FakeElement();
  const form = new FakeElement();
  form.button = new FakeElement();
  const input = new FakeElement();
  const error = new FakeElement();
  error.hidden = true;
  const documentListeners = new Map();
  const windowListeners = new Map();
  const documentEvents = [];
  const lockedMarkup = "<section data-locked-safe>Locked safe content</section>";
  let missionNodes;

  const mountMissionNodes = () => {
    const list = new FakeElement();
    list.dataset.missionAutoStart = "false";
    list.dataset.initialLogId = "log-002";
    const indexList = new FakeElement();
    missionNodes = { indexList, list };
  };

  content._innerHTML = lockedMarkup;
  content.hidden = true;
  content.onInnerHTML = () => mountMissionNodes();
  mountMissionNodes();

  const document = {
    documentElement: { classList: createClassList() },
    querySelector(selector) {
      return {
        "[data-research-lock-gate]": gate,
        "[data-research-lock-content]": content,
        "[data-research-lock-form]": form,
        "[data-research-lock-input]": input,
        "[data-research-lock-error]": error,
        "[data-mission-log-list]": missionNodes.list,
        "[data-mission-index-list]": missionNodes.indexList
      }[selector] || null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    dispatchEvent(event) {
      documentEvents.push(event.type);
      for (const listener of documentListeners.get(event.type) || []) listener(event);
    }
  };
  let fetchCount = 0;
  const window = {
    crypto: webcrypto,
    history: { pushState() {} },
    location: { hash: "" },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (callback) => {
      callback();
      return 1;
    },
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      windowListeners.set(type, (windowListeners.get(type) || []).filter((item) => item !== listener));
    },
    emit(type, event = {}) {
      for (const listener of windowListeners.get(type) || []) listener(event);
    }
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
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
    fetch: async () => ({ ok: true, json: async () => payloads[fetchCount++] }),
    window
  };

  vm.runInNewContext(researchLock, context, { filename: "research-lock.js" });
  vm.runInNewContext(missionIndex, context, { filename: "mission-index.js" });

  return {
    content,
    document,
    documentEvents,
    form,
    gate,
    get missionNodes() {
      return missionNodes;
    },
    input,
    lockedMarkup,
    window
  };
};

test("BFCache relock purges the renderer and a second unlock renders the current Mission Log nodes", async () => {
  const page = bootPage([createPayload(firstEntries), createPayload(secondEntries)]);
  page.input.value = password;
  await page.form.emit("submit");
  await flush();

  const firstNodes = page.missionNodes;
  assert.match(firstNodes.indexList.innerHTML, /#log-001/);
  assert.match(firstNodes.indexList.innerHTML, /#log-002/);
  assert.match(firstNodes.list.innerHTML, /id="log-002"/);
  assert.equal(firstNodes.indexList.listenerCount("click"), 1);

  page.window.emit("pagehide", { persisted: true });
  const lockedNodes = page.missionNodes;
  assert.notEqual(lockedNodes.list, firstNodes.list);
  assert.equal(page.window.MadsProtectedArchive, undefined);
  assert.equal(page.content.innerHTML, page.lockedMarkup);
  assert.equal(page.document.documentElement.classList.contains("mission-index-ready"), false);
  assert.equal(page.document.documentElement.classList.contains("mission-log-lazy-render"), false);
  assert.equal(firstNodes.indexList.listenerCount("click"), 0);
  assert.deepEqual(page.documentEvents.filter((type) => type === "mads:research-locked"), ["mads:research-locked"]);

  page.window.emit("pageshow", { persisted: true });
  page.input.value = password;
  await page.form.emit("submit");
  await flush();

  const secondNodes = page.missionNodes;
  assert.notEqual(secondNodes.list, firstNodes.list);
  assert.match(secondNodes.indexList.innerHTML, /#log-003/);
  assert.doesNotMatch(secondNodes.indexList.innerHTML, /#log-002/);
  assert.match(secondNodes.list.innerHTML, /id="log-003"/);
  assert.equal(secondNodes.indexList.listenerCount("click"), 1);
  assert.equal(firstNodes.indexList.listenerCount("click"), 0);
});
