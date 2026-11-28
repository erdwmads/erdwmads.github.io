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

// Enough of a <template> for mission-index.js, which reads the first h3 of a record for its ledger title.
const createTemplate = () => {
  const template = {
    innerHTML: "",
    content: {
      querySelector(selector) {
        const match = selector === "h3" && template.innerHTML.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
        return match ? { textContent: match[1].replace(/<[^>]*>/g, "") } : null;
      }
    }
  };
  return template;
};

// wide: the (min-width: 1200px) query matches, so the ledger disclosure is opened after unlock.
const bootPage = (payloads, { wide = false } = {}) => {
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
    // The list sits inside the ledger disclosure, and the summary holds the record count.
    const ledger = { open: false };
    indexList.closest = (selector) => (selector === "details" ? ledger : null);
    const count = new FakeElement();
    count.textContent = "records";
    missionNodes = { indexList, list, ledger, count };
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
    querySelectorAll(selector) {
      return selector === '[data-i18n-key="missionIndexCount"]' ? [missionNodes.count] : [];
    },
    getElementById() {
      return null;
    },
    createElement(tag) {
      assert.equal(tag, "template");
      return createTemplate();
    },
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      documentListeners.set(type, (documentListeners.get(type) || []).filter((item) => item !== listener));
    },
    listenerCount(type) {
      return (documentListeners.get(type) || []).length;
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
    matchMedia: (query) => ({ matches: query === "(min-width: 1200px)" && wide }),
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

  const runMissionIndex = () => vm.runInNewContext(missionIndex, context, { filename: "mission-index.js" });
  vm.runInNewContext(researchLock, context, { filename: "research-lock.js" });
  runMissionIndex();

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
    rerunMissionIndex: runMissionIndex,
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

test("soft re-entry leaves one Mission Index renderer active before unlock", async () => {
  const page = bootPage([createPayload(firstEntries)]);
  page.rerunMissionIndex();

  assert.equal(page.document.listenerCount("mads:research-unlocked"), 1);
  assert.equal(page.document.listenerCount("mads:research-locked"), 1);

  page.input.value = password;
  await page.form.emit("submit");
  await flush();

  assert.equal(page.missionNodes.indexList.listenerCount("click"), 1);
  assert.equal(page.documentEvents.filter((type) => type === "mads:mission-log-rendered").length, 1);
  assert.match(page.missionNodes.list.innerHTML, /id="log-002"/);
});

test("progress brief uses escaped archive metadata and preserves the original record", async () => {
  const entry = { ...firstEntries[0], latestNote: 'Observed <relief>', questionNote: 'Identity remains open', nextNote: 'Planned, not completed' };
  const page = bootPage([createPayload([entry])]);
  page.input.value = password;
  await page.form.emit('submit');
  await flush();
  const html = page.missionNodes.list.innerHTML;
  assert.match(html, /Recorded/);
  assert.match(html, /Still open/);
  assert.match(html, /Next step/);
  assert.match(html, /Observed &lt;relief&gt;/);
  assert.match(html, /Identity remains open/);
  assert.match(html, /Planned, not completed/);
  assert.ok(html.includes(entry.bodyHtml));
  assert.doesNotMatch(html, /data-mission-compare-toggle/);
  assert.equal(page.missionNodes.list.listenerCount('click'), 1);
  page.window.emit('pagehide', { persisted: true });
  assert.equal(page.content.innerHTML, page.lockedMarkup);
});

test("ledger rows read SOL, date and title, the summary states the count, and the ledger opens on wide screens", async () => {
  const entries = [
    { id: "log-001", number: 1, sol: 3, date: "2026/04/12", label: "LOG 001", title: "Stored title", bodyHtml: "<h3>Heading not used</h3>" },
    { id: "log-002", number: 2, sol: 21, date: "2026/09/03", label: "LOG 002", stage: "Stage fallback", bodyHtml: "<p class=\"mission-entry-kicker\">LOG 002</p><h3>First <em>record</em> heading</h3><h3>Second heading</h3>" },
    { id: "log-003", number: 3, date: "2026/09/04", label: "LOG 003", stage: "Stage <only>", bodyHtml: "<p>No heading</p>" }
  ];
  const page = bootPage([createPayload(entries)], { wide: true });
  page.input.value = password;
  await page.form.emit("submit");
  await flush();
  const { indexList, list, ledger, count } = page.missionNodes;
  const rows = indexList.innerHTML.split("</a>").slice(0, 3);
  // SOL first, then the date (with a machine-readable datetime), then the title, whose tooltip holds the whole title
  // (it shows two lines at most); the LOG label stays as hidden text.
  assert.match(rows[0], /mission-jump-sol tabular">SOL 003<[\s\S]*datetime="2026-04-12">2026\/04\/12<[\s\S]*mission-jump-title" title="Stored title">Stored title<[\s\S]*mission-jump-log visually-hidden">LOG 001</);
  assert.match(rows[1], /SOL 021[\s\S]*mission-jump-title" title="First record heading">First record heading</);
  // Without a SOL the LOG label takes its place and is not repeated; without a heading the stage is the title.
  assert.match(rows[2], /mission-jump-sol tabular">LOG 003<[\s\S]*mission-jump-title" title="Stage &lt;only&gt;">Stage &lt;only&gt;</);
  assert.doesNotMatch(rows[2], /mission-jump-log/);
  assert.equal(count.textContent, "3 records");
  assert.equal(ledger.open, true);
  // The entry (LOG 002, the page's initial record) shows its SOL figure before its one LOG label.
  assert.match(list.innerHTML, /<div class="mission-record-meta"><span class="mission-record-sol tabular">SOL 021<\/span><span class="research-note-date">LOG 002<\/span><time datetime="2026-09-03">2026\/09\/03<\/time>/);
  assert.equal((list.innerHTML.match(/research-note-date/g) || []).length, 1);
  page.window.emit("pagehide", { persisted: true });
  assert.equal(page.content.innerHTML, page.lockedMarkup);
});

test("an entry without a SOL keeps only its LOG label; the ledger stays closed on narrow screens", async () => {
  const entries = [
    { id: "log-001", number: 1, date: "2026/04/12", label: "LOG 001", bodyHtml: "<h3>Only record</h3>" }
  ];
  const page = bootPage([createPayload(entries)]);
  page.input.value = password;
  await page.form.emit("submit");
  await flush();
  const { list, ledger, count } = page.missionNodes;
  assert.match(list.innerHTML, /<div class="mission-record-meta"><span class="research-note-date">LOG 001<\/span><time datetime="2026-04-12">2026\/04\/12<\/time>/);
  assert.doesNotMatch(list.innerHTML, /mission-record-sol/);
  assert.equal(count.textContent, "1 record");
  assert.equal(ledger.open, false);
});
