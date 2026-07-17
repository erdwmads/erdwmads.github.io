import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const missionLightbox = fs.readFileSync(path.join(scriptsDir, "..", "public", "assets", "js", "mission-lightbox.js"), "utf8");

const createClassList = () => {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    setFromString: (value) => {
      values.clear();
      String(value).split(/\s+/).filter(Boolean).forEach((name) => values.add(name));
    }
  };
};

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.classList = createClassList();
    this.dataset = {};
    this.listeners = new Map();
    this.parentNode = null;
    this.textContent = "";
    this.alt = "";
    this.src = "";
    this.complete = true;
    this.naturalWidth = 100;
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    child.parentNode = null;
    return child;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (!this.classList.contains("mission-lightbox")) return;

    const viewer = this.appendChild(new FakeElement("div"));
    viewer.className = "mission-lightbox__viewer";
    const img = viewer.appendChild(new FakeElement("img"));
    img.className = "mission-lightbox__img";
    const caption = viewer.appendChild(new FakeElement("span"));
    caption.className = "mission-lightbox__caption";
    const counter = viewer.appendChild(new FakeElement("span"));
    counter.className = "mission-lightbox__counter";
    const close = viewer.appendChild(new FakeElement("button"));
    close.className = "mission-lightbox__close";
    const prev = viewer.appendChild(new FakeElement("button"));
    prev.className = "mission-lightbox__prev";
    const next = viewer.appendChild(new FakeElement("button"));
    next.className = "mission-lightbox__next";
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const className = selector.startsWith(".") ? selector.slice(1) : "";
    const matches = [];
    const visit = (node) => {
      if (className && node.classList.contains(className)) matches.push(node);
      node.children.forEach(visit);
    };
    this.children.forEach(visit);
    return matches;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener({ preventDefault() {}, stopPropagation() {}, ...event });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "src") this.src = "";
  }

  focus() {}
}

const bootLightbox = () => {
  const documentListeners = new Map();
  const documentElement = new FakeElement("html");
  const body = new FakeElement("body");
  const scope = new FakeElement("article");
  scope.className = "mission-log-entry";
  const figure = scope.appendChild(new FakeElement("figure"));
  const image = figure.appendChild(new FakeElement("img"));
  image.dataset.fullSrc = "assets/img/mission-log/protected-full.jpg";
  image.src = "assets/img/mission-log/protected-thumb.jpg";
  image.alt = "Protected carbonate candidate";
  const caption = figure.appendChild(new FakeElement("figcaption"));
  caption.textContent = "Protected Mission Log caption";
  figure.querySelector = (selector) => ({ img: image, figcaption: caption })[selector] || null;
  figure.closest = (selector) => selector === ".mission-log-entry" ? scope : null;
  image.closest = (selector) => selector === ".mission-photo-grid figure" ? figure : null;
  scope.querySelectorAll = (selector) => selector === ".mission-photo-grid figure" ? [figure] : [];
  const document = {
    activeElement: new FakeElement("button"),
    body,
    documentElement,
    createElement: (tagName) => new FakeElement(tagName),
    querySelectorAll: (selector) => selector === ".mission-photo-grid figure" ? [figure] : [],
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    dispatchEvent(event) {
      for (const listener of documentListeners.get(event.type) || []) listener(event);
    },
    emit(type, event = {}) {
      for (const listener of documentListeners.get(type) || []) listener({ preventDefault() {}, ...event });
    }
  };
  const window = {
    matchMedia: () => ({ matches: false }),
    dispatchEvent() {},
    setTimeout(callback) { callback(); }
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const context = { CustomEvent, document, window };
  vm.runInNewContext(missionLightbox, context, { filename: "mission-lightbox.js" });

  return {
    document,
    figure,
    get overlay() {
      return body.children.find((child) => child.classList.contains("mission-lightbox"));
    },
    scope,
    window
  };
};

test("research lock purges an open Mission Log lightbox and prevents stale keyboard navigation", () => {
  const page = bootLightbox();
  page.document.emit("click", { target: { closest: () => page.figure } });

  const overlay = page.overlay;
  const image = overlay.querySelector(".mission-lightbox__img");
  const caption = overlay.querySelector(".mission-lightbox__caption");
  const counter = overlay.querySelector(".mission-lightbox__counter");
  assert.equal(overlay.classList.contains("is-open"), true);
  assert.equal(image.src, "assets/img/mission-log/protected-full.jpg");
  assert.equal(caption.textContent, "Protected Mission Log caption");
  assert.equal(page.document.documentElement.classList.contains("mission-lightbox-open"), true);
  assert.equal(page.document.body.classList.contains("mission-lightbox-open"), true);

  page.document.dispatchEvent({ type: "mads:research-locked" });

  assert.equal(overlay.classList.contains("is-open"), false);
  assert.equal(image.src, "");
  assert.equal(caption.textContent, "");
  assert.equal(counter.textContent, "");
  assert.equal(page.document.documentElement.classList.contains("mission-lightbox-open"), false);
  assert.equal(page.document.body.classList.contains("mission-lightbox-open"), false);

  page.document.emit("keydown", { key: "ArrowRight", target: page.document.body });
  assert.equal(image.src, "");
  assert.equal(caption.textContent, "");

  page.window.MadsMissionLightbox.prepare({ querySelectorAll: () => [] });
  page.document.emit("click", { target: { closest: () => page.figure } });
  assert.equal(overlay.classList.contains("is-open"), false);
  assert.equal(image.src, "");

  page.window.MadsMissionLightbox.prepare(page.scope);
  page.document.emit("click", { target: { closest: () => page.figure } });
  assert.equal(overlay.classList.contains("is-open"), true);
  assert.equal(image.src, "assets/img/mission-log/protected-full.jpg");
});
