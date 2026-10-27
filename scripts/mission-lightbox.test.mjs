import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const missionLightbox = fs.readFileSync(path.join(scriptsDir, "..", "public", "assets", "js", "mission-lightbox.js"), "utf8");

// The fake document whose activeElement focus() updates; set by bootLightbox.
let activeDocument = null;

const createClassList = () => {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle: (name, force = !values.has(name)) => {
      if (force) values.add(name);
      else values.delete(name);
      return force;
    },
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

  contains(node) {
    return node === this || this.children.some((child) => child.contains(node));
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (!this.classList.contains("mission-lightbox")) return;

    // Same control order as the real viewer: Close, Previous, image, Next.
    const viewer = this.appendChild(new FakeElement("div"));
    viewer.className = "mission-lightbox__viewer";
    const close = viewer.appendChild(new FakeElement("button"));
    close.className = "mission-lightbox__close";
    const prev = viewer.appendChild(new FakeElement("button"));
    prev.className = "mission-lightbox__prev";
    const img = viewer.appendChild(new FakeElement("img"));
    img.className = "mission-lightbox__img";
    const caption = viewer.appendChild(new FakeElement("span"));
    caption.className = "mission-lightbox__caption";
    const counter = viewer.appendChild(new FakeElement("span"));
    counter.className = "mission-lightbox__counter";
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

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "src") this.src = "";
  }

  focus() {
    if (activeDocument) activeDocument.activeElement = this;
  }
}

const bootLightbox = ({ touch = false } = {}) => {
  const documentListeners = new Map();
  const documentElement = new FakeElement("html");
  const body = new FakeElement("body");
  // Page chrome that must become inert while the viewer is open; scripts are left alone.
  const header = body.appendChild(new FakeElement("header"));
  const main = body.appendChild(new FakeElement("main"));
  const footer = body.appendChild(new FakeElement("footer"));
  const dock = body.appendChild(new FakeElement("div"));
  dock.className = "obs-fx-dock";
  const script = body.appendChild(new FakeElement("script"));
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
  figure.closest = (selector) => selector === ".mission-log-entry" ? scope : selector.includes(".mission-photo-grid figure") ? figure : null;
  image.closest = (selector) => selector === ".mission-photo-grid figure" ? figure : null;
  scope.querySelectorAll = (selector) => selector.includes(".mission-photo-grid figure") ? [figure] : [];
  const opener = new FakeElement("button");
  const document = {
    activeElement: opener,
    body,
    documentElement,
    createElement: (tagName) => new FakeElement(tagName),
    querySelectorAll: (selector) => selector.includes(".mission-photo-grid figure") ? [figure] : [],
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
  activeDocument = document;
  const touchQuery = {
    matches: touch,
    listeners: [],
    addEventListener(type, listener) {
      if (type === "change") this.listeners.push(listener);
    }
  };
  const window = {
    matchMedia: () => touchQuery,
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

  const page = {
    background: [header, main, footer, dock],
    body,
    document,
    figure,
    get overlay() {
      return body.children.find((child) => child.classList.contains("mission-lightbox"));
    },
    control: (name) => page.overlay.querySelector(`.mission-lightbox__${name}`),
    inert: () => body.children.filter((child) => child.hasAttribute("inert")),
    pressKey: (key, extra = {}) => {
      let prevented = false;
      document.emit("keydown", { key, target: document.activeElement, preventDefault() { prevented = true; }, ...extra });
      return prevented;
    },
    setTouch(value) {
      touchQuery.matches = value;
      touchQuery.listeners.forEach((listener) => listener({ matches: value }));
    },
    script,
    scope,
    window
  };
  return page;
};

const clickFigure = (page) => page.document.emit("click", { target: { closest: () => page.figure } });

test("research lock purges an open Mission Log lightbox and prevents stale keyboard navigation", () => {
  const page = bootLightbox();
  clickFigure(page);

  const overlay = page.overlay;
  const image = overlay.querySelector(".mission-lightbox__img");
  const caption = overlay.querySelector(".mission-lightbox__caption");
  const counter = overlay.querySelector(".mission-lightbox__counter");
  assert.equal(overlay.classList.contains("is-open"), true);
  assert.equal(image.src, "assets/img/mission-log/protected-full.jpg");
  assert.equal(caption.textContent, "Protected Mission Log caption");
  assert.equal(page.document.documentElement.classList.contains("mission-lightbox-open"), true);
  assert.equal(page.document.body.classList.contains("mission-lightbox-open"), true);
  assert.deepEqual(page.inert(), page.background);

  page.document.dispatchEvent({ type: "mads:research-locked" });

  assert.equal(overlay.classList.contains("is-open"), false);
  assert.equal(image.src, "");
  assert.equal(caption.textContent, "");
  assert.equal(counter.textContent, "");
  assert.equal(page.document.documentElement.classList.contains("mission-lightbox-open"), false);
  assert.equal(page.document.body.classList.contains("mission-lightbox-open"), false);
  assert.deepEqual(page.inert(), [], "purge must release the page behind the viewer");

  page.document.emit("keydown", { key: "ArrowRight", target: page.document.body });
  assert.equal(image.src, "");
  assert.equal(caption.textContent, "");

  page.window.MadsMissionLightbox.prepare({ querySelectorAll: () => [] });
  clickFigure(page);
  assert.equal(overlay.classList.contains("is-open"), false);
  assert.equal(image.src, "");

  page.window.MadsMissionLightbox.prepare(page.scope);
  clickFigure(page);
  assert.equal(overlay.classList.contains("is-open"), true);
  assert.equal(image.src, "assets/img/mission-log/protected-full.jpg");
});

test("desktop viewer keeps focus inside, makes the page inert and returns focus to the opener", () => {
  const page = bootLightbox();
  assert.equal(page.document.documentElement.classList.contains("mobile-mission-lightbox-disabled"), false);
  assert.equal(page.figure.getAttribute("role"), "button");
  assert.equal(page.figure.getAttribute("tabindex"), "0");
  assert.equal(page.figure.getAttribute("aria-label"), "Open large image: Protected Mission Log caption");

  page.figure.focus();
  assert.equal(page.pressKey("Enter"), true);
  assert.equal(page.overlay.classList.contains("is-open"), true);
  assert.equal(page.document.activeElement, page.control("close"));
  assert.deepEqual(page.inert(), page.background, "header, main, footer and the FX dock become inert");
  assert.equal(page.overlay.hasAttribute("inert"), false);
  assert.equal(page.script.hasAttribute("inert"), false);

  assert.equal(page.pressKey("Tab"), false, "Tab between viewer controls stays native");
  page.control("next").focus();
  assert.equal(page.pressKey("Tab"), true);
  assert.equal(page.document.activeElement, page.control("close"), "Tab from the last control wraps to Close");
  assert.equal(page.pressKey("Tab", { shiftKey: true }), true);
  assert.equal(page.document.activeElement, page.control("next"), "Shift+Tab from Close wraps to Next");
  page.document.activeElement = page.document.body;
  assert.equal(page.pressKey("Tab"), true);
  assert.equal(page.document.activeElement, page.control("close"), "focus outside the viewer returns to it");

  page.pressKey("Escape");
  assert.equal(page.overlay.classList.contains("is-open"), false);
  assert.deepEqual(page.inert(), []);
  assert.equal(page.document.activeElement, page.figure, "closing returns focus to the opening figure");
});

test("phones and coarse pointers keep inline figures and never open the viewer", () => {
  const page = bootLightbox({ touch: true });
  assert.equal(page.document.documentElement.classList.contains("mobile-mission-lightbox-disabled"), true);
  for (const name of ["role", "tabindex", "aria-label"]) assert.equal(page.figure.getAttribute(name), null, `${name} must not be set on touch`);

  clickFigure(page);
  assert.equal(page.overlay.classList.contains("is-open"), false, "a tap does not open the viewer");
  page.figure.focus();
  assert.equal(page.pressKey("Enter"), false);
  assert.equal(page.pressKey(" "), false);
  assert.equal(page.overlay.classList.contains("is-open"), false);
  assert.deepEqual(page.inert(), []);

  page.setTouch(false);
  assert.equal(page.document.documentElement.classList.contains("mobile-mission-lightbox-disabled"), false);
  assert.equal(page.figure.getAttribute("role"), "button");
  clickFigure(page);
  assert.equal(page.overlay.classList.contains("is-open"), true);
  assert.deepEqual(page.inert(), page.background);

  page.setTouch(true);
  assert.equal(page.document.documentElement.classList.contains("mobile-mission-lightbox-disabled"), true);
  assert.equal(page.overlay.classList.contains("is-open"), false, "switching to touch closes an open viewer");
  assert.deepEqual(page.inert(), []);
  for (const name of ["role", "tabindex", "aria-label"]) assert.equal(page.figure.getAttribute(name), null);
  clickFigure(page);
  assert.equal(page.overlay.classList.contains("is-open"), false);
});

test("touch mode leaves figure attributes it did not add", () => {
  const page = bootLightbox({ touch: true });
  page.figure.setAttribute("tabindex", "-1");
  page.window.MadsMissionLightbox.prepare(page.scope);
  assert.equal(page.figure.getAttribute("tabindex"), "-1");
  assert.equal(page.figure.getAttribute("role"), null);
});
