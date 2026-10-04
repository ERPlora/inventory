var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// @lit-labs/ssr-dom-shim/lib/element-internals.js
var ElementInternalsShim = class ElementInternals {
  get shadowRoot() {
    return this.__host.__shadowRoot;
  }
  constructor(_host) {
    this.ariaActiveDescendantElement = null;
    this.ariaAtomic = "";
    this.ariaAutoComplete = "";
    this.ariaBrailleLabel = "";
    this.ariaBrailleRoleDescription = "";
    this.ariaBusy = "";
    this.ariaChecked = "";
    this.ariaColCount = "";
    this.ariaColIndex = "";
    this.ariaColIndexText = "";
    this.ariaColSpan = "";
    this.ariaControlsElements = null;
    this.ariaCurrent = "";
    this.ariaDescribedByElements = null;
    this.ariaDescription = "";
    this.ariaDetailsElements = null;
    this.ariaDisabled = "";
    this.ariaErrorMessageElements = null;
    this.ariaExpanded = "";
    this.ariaFlowToElements = null;
    this.ariaHasPopup = "";
    this.ariaHidden = "";
    this.ariaInvalid = "";
    this.ariaKeyShortcuts = "";
    this.ariaLabel = "";
    this.ariaLabelledByElements = null;
    this.ariaLevel = "";
    this.ariaLive = "";
    this.ariaModal = "";
    this.ariaMultiLine = "";
    this.ariaMultiSelectable = "";
    this.ariaOrientation = "";
    this.ariaOwnsElements = null;
    this.ariaPlaceholder = "";
    this.ariaPosInSet = "";
    this.ariaPressed = "";
    this.ariaReadOnly = "";
    this.ariaRelevant = "";
    this.ariaRequired = "";
    this.ariaRoleDescription = "";
    this.ariaRowCount = "";
    this.ariaRowIndex = "";
    this.ariaRowIndexText = "";
    this.ariaRowSpan = "";
    this.ariaSelected = "";
    this.ariaSetSize = "";
    this.ariaSort = "";
    this.ariaValueMax = "";
    this.ariaValueMin = "";
    this.ariaValueNow = "";
    this.ariaValueText = "";
    this.role = "";
    this.form = null;
    this.labels = [];
    this.states = /* @__PURE__ */ new Set();
    this.validationMessage = "";
    this.validity = {};
    this.willValidate = true;
    this.__host = _host;
  }
  checkValidity() {
    console.warn("`ElementInternals.checkValidity()` was called on the server.This method always returns true.");
    return true;
  }
  reportValidity() {
    return true;
  }
  setFormValue() {
  }
  setValidity() {
  }
};

// @lit-labs/ssr-dom-shim/lib/events.js
var __classPrivateFieldSet = function(receiver, state, value, kind, f3) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f3.call(receiver, value) : f3 ? f3.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f3) {
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f3 : kind === "a" ? f3.call(receiver) : f3 ? f3.value : state.get(receiver);
};
var _Event_cancelable;
var _Event_bubbles;
var _Event_composed;
var _Event_defaultPrevented;
var _Event_timestamp;
var _Event_propagationStopped;
var _Event_type;
var _Event_target;
var _Event_isBeingDispatched;
var _a;
var _CustomEvent_detail;
var _b;
var NONE = 0;
var CAPTURING_PHASE = 1;
var AT_TARGET = 2;
var BUBBLING_PHASE = 3;
var enumerableProperty = { __proto__: null };
enumerableProperty.enumerable = true;
Object.freeze(enumerableProperty);
var EventShim = (_a = class Event {
  constructor(type, options = {}) {
    _Event_cancelable.set(this, false);
    _Event_bubbles.set(this, false);
    _Event_composed.set(this, false);
    _Event_defaultPrevented.set(this, false);
    _Event_timestamp.set(this, Date.now());
    _Event_propagationStopped.set(this, false);
    _Event_type.set(this, void 0);
    _Event_target.set(this, void 0);
    _Event_isBeingDispatched.set(this, void 0);
    this.NONE = NONE;
    this.CAPTURING_PHASE = CAPTURING_PHASE;
    this.AT_TARGET = AT_TARGET;
    this.BUBBLING_PHASE = BUBBLING_PHASE;
    if (arguments.length === 0)
      throw new Error(`The type argument must be specified`);
    if (typeof options !== "object" || !options) {
      throw new Error(`The "options" argument must be an object`);
    }
    const { bubbles, cancelable, composed } = options;
    __classPrivateFieldSet(this, _Event_cancelable, !!cancelable, "f");
    __classPrivateFieldSet(this, _Event_bubbles, !!bubbles, "f");
    __classPrivateFieldSet(this, _Event_composed, !!composed, "f");
    __classPrivateFieldSet(this, _Event_type, `${type}`, "f");
    __classPrivateFieldSet(this, _Event_target, null, "f");
    __classPrivateFieldSet(this, _Event_isBeingDispatched, false, "f");
  }
  initEvent(_type, _bubbles, _cancelable) {
    throw new Error("Method not implemented.");
  }
  stopImmediatePropagation() {
    this.stopPropagation();
  }
  preventDefault() {
    __classPrivateFieldSet(this, _Event_defaultPrevented, true, "f");
  }
  get target() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get currentTarget() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get srcElement() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get type() {
    return __classPrivateFieldGet(this, _Event_type, "f");
  }
  get cancelable() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f");
  }
  get defaultPrevented() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f") && __classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get timeStamp() {
    return __classPrivateFieldGet(this, _Event_timestamp, "f");
  }
  composedPath() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? [__classPrivateFieldGet(this, _Event_target, "f")] : [];
  }
  get returnValue() {
    return !__classPrivateFieldGet(this, _Event_cancelable, "f") || !__classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get bubbles() {
    return __classPrivateFieldGet(this, _Event_bubbles, "f");
  }
  get composed() {
    return __classPrivateFieldGet(this, _Event_composed, "f");
  }
  get eventPhase() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? _a.AT_TARGET : _a.NONE;
  }
  get cancelBubble() {
    return __classPrivateFieldGet(this, _Event_propagationStopped, "f");
  }
  set cancelBubble(value) {
    if (value) {
      __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
    }
  }
  stopPropagation() {
    __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
  }
  get isTrusted() {
    return false;
  }
}, _Event_cancelable = /* @__PURE__ */ new WeakMap(), _Event_bubbles = /* @__PURE__ */ new WeakMap(), _Event_composed = /* @__PURE__ */ new WeakMap(), _Event_defaultPrevented = /* @__PURE__ */ new WeakMap(), _Event_timestamp = /* @__PURE__ */ new WeakMap(), _Event_propagationStopped = /* @__PURE__ */ new WeakMap(), _Event_type = /* @__PURE__ */ new WeakMap(), _Event_target = /* @__PURE__ */ new WeakMap(), _Event_isBeingDispatched = /* @__PURE__ */ new WeakMap(), _a.NONE = NONE, _a.CAPTURING_PHASE = CAPTURING_PHASE, _a.AT_TARGET = AT_TARGET, _a.BUBBLING_PHASE = BUBBLING_PHASE, _a);
Object.defineProperties(EventShim.prototype, {
  initEvent: enumerableProperty,
  stopImmediatePropagation: enumerableProperty,
  preventDefault: enumerableProperty,
  target: enumerableProperty,
  currentTarget: enumerableProperty,
  srcElement: enumerableProperty,
  type: enumerableProperty,
  cancelable: enumerableProperty,
  defaultPrevented: enumerableProperty,
  timeStamp: enumerableProperty,
  composedPath: enumerableProperty,
  returnValue: enumerableProperty,
  bubbles: enumerableProperty,
  composed: enumerableProperty,
  eventPhase: enumerableProperty,
  cancelBubble: enumerableProperty,
  stopPropagation: enumerableProperty,
  isTrusted: enumerableProperty
});
var CustomEventShim = (_b = class CustomEvent2 extends EventShim {
  constructor(type, options = {}) {
    super(type, options);
    _CustomEvent_detail.set(this, void 0);
    __classPrivateFieldSet(this, _CustomEvent_detail, options?.detail ?? null, "f");
  }
  initCustomEvent(_type, _bubbles, _cancelable, _detail) {
    throw new Error("Method not implemented.");
  }
  get detail() {
    return __classPrivateFieldGet(this, _CustomEvent_detail, "f");
  }
}, _CustomEvent_detail = /* @__PURE__ */ new WeakMap(), _b);
Object.defineProperties(CustomEventShim.prototype, {
  detail: enumerableProperty
});
var EventShimWithRealType = EventShim;
var CustomEventShimWithRealType = CustomEventShim;

// @lit-labs/ssr-dom-shim/lib/css.js
var _a2;
var CSSRuleShim = (_a2 = class CSSRule {
  constructor() {
    this.STYLE_RULE = 1;
    this.CHARSET_RULE = 2;
    this.IMPORT_RULE = 3;
    this.MEDIA_RULE = 4;
    this.FONT_FACE_RULE = 5;
    this.PAGE_RULE = 6;
    this.NAMESPACE_RULE = 10;
    this.KEYFRAMES_RULE = 7;
    this.KEYFRAME_RULE = 8;
    this.SUPPORTS_RULE = 12;
    this.COUNTER_STYLE_RULE = 11;
    this.FONT_FEATURE_VALUES_RULE = 14;
    this.MARGIN_RULE = 9;
    this.__parentStyleSheet = null;
    this.cssText = "";
  }
  get parentRule() {
    return null;
  }
  get parentStyleSheet() {
    return this.__parentStyleSheet;
  }
  get type() {
    return 0;
  }
}, _a2.STYLE_RULE = 1, _a2.CHARSET_RULE = 2, _a2.IMPORT_RULE = 3, _a2.MEDIA_RULE = 4, _a2.FONT_FACE_RULE = 5, _a2.PAGE_RULE = 6, _a2.NAMESPACE_RULE = 10, _a2.KEYFRAMES_RULE = 7, _a2.KEYFRAME_RULE = 8, _a2.SUPPORTS_RULE = 12, _a2.COUNTER_STYLE_RULE = 11, _a2.FONT_FEATURE_VALUES_RULE = 14, _a2.MARGIN_RULE = 9, _a2);

// @lit-labs/ssr-dom-shim/index.js
globalThis.Event ??= EventShimWithRealType;
globalThis.CustomEvent ??= CustomEventShimWithRealType;
var constructionToken = Symbol();
var isCaptureEventListener = (options) => typeof options === "boolean" ? options : options?.capture ?? false;
var enumerableProperty2 = { __proto__: null };
enumerableProperty2.enumerable = true;
Object.freeze(enumerableProperty2);
var EventTarget = class {
  constructor() {
    this.__eventListeners = /* @__PURE__ */ new Map();
    this.__captureEventListeners = /* @__PURE__ */ new Map();
  }
  addEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    let eventListeners = eventListenersMap.get(type);
    if (eventListeners === void 0) {
      eventListeners = /* @__PURE__ */ new Map();
      eventListenersMap.set(type, eventListeners);
    } else if (eventListeners.has(callback)) {
      return;
    }
    const normalizedOptions = typeof options === "object" && options ? options : {};
    normalizedOptions.signal?.addEventListener("abort", () => this.removeEventListener(type, callback, options));
    eventListeners.set(callback, normalizedOptions ?? {});
  }
  removeEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    const eventListeners = eventListenersMap.get(type);
    if (eventListeners !== void 0) {
      eventListeners.delete(callback);
      if (!eventListeners.size) {
        eventListenersMap.delete(type);
      }
    }
  }
  dispatchEvent(event) {
    let composedPath = this.__resolveFullEventPath();
    if (!event.composed && this.__host) {
      composedPath = composedPath.slice(0, composedPath.indexOf(this.__host));
    }
    let stopPropagation = false;
    let stopImmediatePropagation = false;
    let eventPhase = EventShimWithRealType.NONE;
    let target = null;
    let tmpTarget = null;
    let currentTarget = null;
    const originalStopPropagation = event.stopPropagation;
    const originalStopImmediatePropagation = event.stopImmediatePropagation;
    Object.defineProperties(event, {
      target: {
        get() {
          return target ?? tmpTarget;
        },
        ...enumerableProperty2
      },
      srcElement: {
        get() {
          return event.target;
        },
        ...enumerableProperty2
      },
      currentTarget: {
        get() {
          return currentTarget;
        },
        ...enumerableProperty2
      },
      eventPhase: {
        get() {
          return eventPhase;
        },
        ...enumerableProperty2
      },
      composedPath: {
        value: () => composedPath,
        ...enumerableProperty2
      },
      stopPropagation: {
        value: () => {
          stopPropagation = true;
          originalStopPropagation.call(event);
        },
        ...enumerableProperty2
      },
      stopImmediatePropagation: {
        value: () => {
          stopImmediatePropagation = true;
          originalStopImmediatePropagation.call(event);
        },
        ...enumerableProperty2
      }
    });
    const invokeEventListener = (listener, options, eventListenerMap) => {
      if (typeof listener === "function") {
        listener(event);
      } else if (typeof listener?.handleEvent === "function") {
        listener.handleEvent(event);
      }
      if (options.once) {
        eventListenerMap.delete(listener);
      }
    };
    const finishDispatch = () => {
      currentTarget = null;
      eventPhase = EventShimWithRealType.NONE;
      return !event.defaultPrevented;
    };
    const captureEventPath = composedPath.slice().reverse();
    target = !this.__host || !event.composed ? this : null;
    const retarget = (eventTargets) => {
      tmpTarget = this;
      while (tmpTarget.__host && eventTargets.includes(tmpTarget.__host)) {
        tmpTarget = tmpTarget.__host;
      }
    };
    for (const eventTarget of captureEventPath) {
      if (!target && (!tmpTarget || tmpTarget === eventTarget.__host)) {
        retarget(captureEventPath.slice(captureEventPath.indexOf(eventTarget)));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.CAPTURING_PHASE;
      const captureEventListeners = eventTarget.__captureEventListeners.get(event.type);
      if (captureEventListeners) {
        for (const [listener, options] of captureEventListeners) {
          invokeEventListener(listener, options, captureEventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    const bubbleEventPath = event.bubbles ? composedPath : [this];
    tmpTarget = null;
    for (const eventTarget of bubbleEventPath) {
      if (!target && (!tmpTarget || eventTarget === tmpTarget.__host)) {
        retarget(bubbleEventPath.slice(0, bubbleEventPath.indexOf(eventTarget) + 1));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.BUBBLING_PHASE;
      const eventListeners = eventTarget.__eventListeners.get(event.type);
      if (eventListeners) {
        for (const [listener, options] of eventListeners) {
          invokeEventListener(listener, options, eventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    return finishDispatch();
  }
  __resolveFullEventPath() {
    if (this.__eventPathCache) {
      return this.__eventPathCache;
    } else if (!this.__eventTargetParent) {
      return this.__eventPathCache = [this, documentShim, windowShim];
    } else {
      return this.__eventPathCache = [
        this,
        ...this.__eventTargetParent.__resolveFullEventPath()
      ];
    }
  }
};
var attributes = /* @__PURE__ */ new WeakMap();
var attributesForElement = (element) => {
  let attrs = attributes.get(element);
  if (attrs === void 0) {
    attributes.set(element, attrs = /* @__PURE__ */ new Map());
  }
  return attrs;
};
var NodeShim = class Node2 extends EventTarget {
  getRootNode(options) {
    if (options?.composed) {
      return document2;
    }
    const host = this.__host;
    return host?.__shadowRoot ?? document2;
  }
};
var DocumentShim = class Document2 extends NodeShim {
  get adoptedStyleSheets() {
    return [];
  }
  createTreeWalker() {
    return {};
  }
  createTextNode() {
    return {};
  }
  createElement() {
    return {};
  }
};
var documentShim = new DocumentShim();
var document2 = documentShim;
var WindowShim = class Window extends NodeShim {
  constructor(token) {
    super();
    if (token !== constructionToken) {
      throw new TypeError("Illegal constructor");
    }
    Object.assign(this, globalThis, {
      CustomElementRegistry,
      customElements: customElements2,
      document: document2,
      Document: DocumentShim,
      Element: ElementShim,
      EventTarget,
      HTMLElement: HTMLElementShim,
      Node: NodeShim,
      ShadowRoot: ShadowRootShim,
      window: this,
      Window: WindowShim
    });
  }
};
var ElementShim = class Element extends NodeShim {
  constructor() {
    super(...arguments);
    this.__shadowRootMode = null;
    this.__shadowRoot = null;
    this.__internals = null;
  }
  get attributes() {
    return Array.from(attributesForElement(this)).map(([name, value]) => ({
      name,
      value
    }));
  }
  get shadowRoot() {
    if (this.__shadowRootMode === "closed") {
      return null;
    }
    return this.__shadowRoot;
  }
  get localName() {
    return this.constructor.__localName;
  }
  get tagName() {
    return this.localName?.toUpperCase();
  }
  setAttribute(name, value) {
    attributesForElement(this).set(name, String(value));
  }
  removeAttribute(name) {
    attributesForElement(this).delete(name);
  }
  toggleAttribute(name, force) {
    if (this.hasAttribute(name)) {
      if (force === void 0 || !force) {
        this.removeAttribute(name);
        return false;
      }
    } else {
      if (force === void 0 || force) {
        this.setAttribute(name, "");
        return true;
      } else {
        return false;
      }
    }
    return true;
  }
  hasAttribute(name) {
    return attributesForElement(this).has(name);
  }
  attachShadow(init) {
    this.__shadowRootMode = init.mode;
    const shadowRoot = new ShadowRootShim(constructionToken, init);
    shadowRoot.__eventTargetParent = this;
    shadowRoot.__host = this;
    return this.__shadowRoot = shadowRoot;
  }
  attachInternals() {
    if (this.__internals !== null) {
      throw new Error(`Failed to execute 'attachInternals' on 'HTMLElement': ElementInternals for the specified element was already attached.`);
    }
    const internals = new ElementInternalsShim(this);
    this.__internals = internals;
    return internals;
  }
  getAttribute(name) {
    const value = attributesForElement(this).get(name);
    return value ?? null;
  }
};
var HTMLElementShim = class HTMLElement2 extends ElementShim {
};
var HTMLElementShimWithRealType = HTMLElementShim;
var ShadowRootShim = class ShadowRoot extends NodeShim {
  get host() {
    return this.__host;
  }
  constructor(constructionToken2, init) {
    super();
    if (constructionToken2 !== constructionToken2) {
      throw new TypeError("Illegal constructor");
    }
    this.mode = init.mode;
  }
};
globalThis.litServerRoot ??= Object.defineProperty(new HTMLElementShimWithRealType(), "localName", {
  // Patch localName (and tagName) to return a unique name.
  get() {
    return "lit-server-root";
  }
});
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
var CustomElementRegistry = class {
  constructor() {
    this.__definitions = /* @__PURE__ */ new Map();
    this.__reverseDefinitions = /* @__PURE__ */ new Map();
    this.__pendingWhenDefineds = /* @__PURE__ */ new Map();
  }
  define(name, ctor) {
    if (this.__definitions.has(name)) {
      if (true) {
        console.warn(`'CustomElementRegistry' already has "${name}" defined. This may have been caused by live reload or hot module replacement in which case it can be safely ignored.
Make sure to test your application with a production build as repeat registrations will throw in production.`);
      } else {
        throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used with this registry`);
      }
    }
    if (this.__reverseDefinitions.has(ctor)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the constructor has already been used with this registry for the tag name ${this.__reverseDefinitions.get(ctor)}`);
    }
    ctor.__localName = name;
    this.__definitions.set(name, {
      ctor,
      // Note it's important we read `observedAttributes` in case it is a getter
      // with side-effects, as is the case in Lit, where it triggers class
      // finalization.
      //
      // TODO(aomarks) To be spec compliant, we should also capture the
      // registration-time lifecycle methods like `connectedCallback`. For them
      // to be actually accessible to e.g. the Lit SSR element renderer, though,
      // we'd need to introduce a new API for accessing them (since `get` only
      // returns the constructor).
      observedAttributes: ctor.observedAttributes ?? []
    });
    this.__reverseDefinitions.set(ctor, name);
    this.__pendingWhenDefineds.get(name)?.resolve(ctor);
    this.__pendingWhenDefineds.delete(name);
  }
  get(name) {
    const definition = this.__definitions.get(name);
    return definition?.ctor;
  }
  getName(ctor) {
    return this.__reverseDefinitions.get(ctor) ?? null;
  }
  initialize(_root) {
    throw new Error(`customElements.initialize is not currently supported in SSR. Please file a bug if you need it.`);
  }
  upgrade(_element) {
    throw new Error(`customElements.upgrade is not currently supported in SSR. Please file a bug if you need it.`);
  }
  async whenDefined(name) {
    const definition = this.__definitions.get(name);
    if (definition) {
      return definition.ctor;
    }
    let withResolvers = this.__pendingWhenDefineds.get(name);
    if (!withResolvers) {
      withResolvers = promiseWithResolvers();
      this.__pendingWhenDefineds.set(name, withResolvers);
    }
    return withResolvers.promise;
  }
};
var CustomElementRegistryShimWithRealType = CustomElementRegistry;
var customElements2 = new CustomElementRegistryShimWithRealType();
var windowShim = new WindowShim(constructionToken);

// @lit/reactive-element/node/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e5, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e5;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s5 && 1 === s5.length;
      e5 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o7 = 1 === t5.length ? t5[0] : e5.reduce((e6, s5, o8) => e6 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s5, o7) => {
  if (e) s5.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e5 of o7) {
    const o8 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o8.setAttribute("nonce", n6), o8.textContent = e5.cssText, s5.appendChild(o8);
  }
};
var c = e || void 0 === t.CSSStyleSheet ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e5 = "";
  for (const s5 of t6.cssRules) e5 += s5.cssText;
  return r(e5);
})(t5) : t5;

// @lit/reactive-element/node/reactive-element.js
var { is: h, defineProperty: r2, getOwnPropertyDescriptor: o2, getOwnPropertyNames: n2, getOwnPropertySymbols: a, getPrototypeOf: c2 } = Object;
var l = globalThis;
l.customElements ??= customElements2;
var p = l.trustedTypes;
var d = p ? p.emptyScript : "";
var u = l.reactiveElementPolyfillSupport;
var f = (t5, s5) => t5;
var b = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? d : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i7 = t5;
  switch (s5) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var m = (t5, s5) => !h(t5, s5);
var y = { attribute: true, type: String, converter: b, reflect: false, useDefault: false, hasChanged: m };
Symbol.metadata ??= Symbol("metadata"), l.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends (globalThis.HTMLElement ?? HTMLElementShimWithRealType) {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = y) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i7 = Symbol(), e5 = this.getPropertyDescriptor(t5, i7, s5);
      void 0 !== e5 && r2(this.prototype, t5, e5);
    }
  }
  static getPropertyDescriptor(t5, s5, i7) {
    const { get: e5, set: h4 } = o2(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e5, set(s6) {
      const r6 = e5?.call(this);
      h4?.call(this, s6), this.requestUpdate(t5, r6, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(f("elementProperties"))) return;
    const t5 = c2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(f("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(f("properties"))) {
      const t6 = this.properties, s5 = [...n2(t6), ...a(t6)];
      for (const i7 of s5) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i7 = this._$Eu(t6, s5);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t5) {
    const s5 = [];
    if (Array.isArray(t5)) {
      const e5 = new Set(t5.flat(1 / 0).reverse());
      for (const t6 of e5) s5.unshift(c(t6));
    } else void 0 !== t5 && s5.push(c(t5));
    return s5;
  }
  static _$Eu(t5, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s5) {
    const i7 = this.constructor.elementProperties.get(t5), e5 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e5 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : b).toAttribute(s5, i7.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e5) : this.setAttribute(e5, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i7 = this.constructor, e5 = i7._$Eh.get(t5);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t6 = i7.getPropertyOptions(e5), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : b;
      this._$Em = e5;
      const r6 = h4.fromAttribute(s5, t6.type);
      this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i7, e5 = false, h4) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e5 && (h4 = this[t5]), i7 ??= r6.getPropertyOptions(t5), !((i7.hasChanged ?? m)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i7)))) return;
      this.C(t5, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i7, reflect: e5, wrapped: h4 }, r6) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e5 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i7] of t6) {
        const { wrapped: t7 } = i7, e5 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e5 || this.C(s6, void 0, i7, e5);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[f("elementProperties")] = /* @__PURE__ */ new Map(), g[f("finalized")] = /* @__PURE__ */ new Map(), u?.({ ReactiveElement: g }), (l.reactiveElementVersions ??= []).push("2.1.2");

// lit-html/lit-html.js
var t2 = globalThis;
var i2 = (t5) => t5;
var s2 = t2.trustedTypes;
var e2 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m2 = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g2 = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e2 ? e2.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s5 = t5.length - 1, e5 = [];
  let n6, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t5[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m2 : void 0 !== u5[2] ? (y2.test(u5[2]) && (n6 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n6 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g2) : c5 === $ || c5 === g2 ? c5 = p2 : c5 === _ || c5 === m2 ? c5 = v : (c5 = p2, n6 = void 0);
    const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e5.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e5];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e5) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u5 = t5.length - 1, d3 = this.parts, [f3, v3] = N(t5, i7);
    if (this.el = _S.createElement(f3, e5), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r6.getAttribute(t6).split(o3), e6 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e6[2], strings: s5, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r6.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i7, s5 = t5, e5) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e5 ? s5._$Co?.[e5] : s5._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o7 && (h4?._$AO?.(false), void 0 === o7 ? h4 = void 0 : (h4 = new o7(t5), h4._$AT(t5, s5, e5)), void 0 !== e5 ? (s5._$Co ??= [])[e5] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t5, h4._$AS(t5, i7.values), h4, e5)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e5 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e5;
    let h4 = P.nextNode(), o7 = 0, n6 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h4, h4.nextSibling, this, t5) : 1 === r6.type ? i8 = new r6.ctor(h4, r6.name, r6.strings, this, t5) : 6 === r6.type && (i8 = new Z(h4, this, t5)), this._$AV.push(i8), r6 = s5[++n6];
      }
      o7 !== r6?.index && (h4 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e5;
  }
  p(t5) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s5, e5) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e5, this._$Cv = e5?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s5 } = t5, e5 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e5) this._$AH.p(i7);
    else {
      const t6 = new R(e5, this), s6 = t6.u(this.options);
      t6.p(i7), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e5 = 0;
    for (const h4 of t5) e5 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e5], s5._$AI(h4), e5++;
    e5 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e5), i7.length = e5);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i2(t5).nextSibling;
      i2(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s5, e5, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e5, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s5, e5) {
    const h4 = this.strings;
    let o7 = false;
    if (void 0 === h4) t5 = M(this, t5, i7, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e6 = t5;
      let n6, r6;
      for (t5 = h4[0], n6 = 0; n6 < h4.length - 1; n6++) r6 = M(this, e6[s5 + n6], i7, n6), r6 === E && (r6 = this._$AH[n6]), o7 ||= !a2(r6) || r6 !== this._$AH[n6], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h4[n6 + 1]), this._$AH[n6] = r6;
    }
    o7 && !e5 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s5, e5, h4) {
    super(t5, i7, s5, e5, h4), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e5 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e5);
    e5 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s5) => {
  const e5 = s5?.renderBefore ?? i7;
  let h4 = e5._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e5._$litPart$ = h4 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// lit-element/lit-element.js
var s3 = globalThis;
var i3 = class extends g {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i3._$litElement$ = true, i3["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i3 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i3 });
(s3.litElementVersions ??= []).push("4.2.2");

// ui/lib/ion-tone.ts
var PALETTE = {
  danger: { base: "#c5000f", rgb: "197, 0, 15", contrast: "#fff", shade: "#ad000d", tint: "#cb1a27" },
  success: { base: "#2dd55b", rgb: "45, 213, 91", contrast: "#000", shade: "#28bb50", tint: "#42d96b" },
  warning: { base: "#ffc409", rgb: "255, 196, 9", contrast: "#000", shade: "#e0ac08", tint: "#ffca22" },
  medium: { base: "#636469", rgb: "99, 100, 105", contrast: "#fff", shade: "#57585c", tint: "#737478" }
};
function ionTone(kind, tone) {
  const p4 = PALETTE[tone];
  const token = (suffix, fallback) => `var(--ion-color-${tone}${suffix}, ${fallback})`;
  switch (kind) {
    case "solid":
      return [
        `--background: ${token("", p4.base)}`,
        `--background-activated: ${token("-shade", p4.shade)}`,
        `--background-focused: ${token("-shade", p4.shade)}`,
        `--background-hover: ${token("-tint", p4.tint)}`,
        `--color: ${token("-contrast", p4.contrast)};`
      ].join("; ");
    case "text":
      return `--color: ${token("", p4.base)}; color: ${token("", p4.base)};`;
    case "chip":
      return `--background: rgba(${token("-rgb", p4.rgb)}, 0.08); --color: ${token("-shade", p4.shade)};`;
  }
}

// @lit/reactive-element/node/decorators/property.js
var o5 = { attribute: true, type: String, converter: b, reflect: false, hasChanged: m };
var r4 = (t5 = o5, e5, r6) => {
  const { kind: n6, metadata: i7 } = r6;
  let s5 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i7, s5 = /* @__PURE__ */ new Map()), "setter" === n6 && ((t5 = Object.create(t5)).wrapped = true), s5.set(r6.name, t5), "accessor" === n6) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n7 = e5.get.call(this);
      e5.set.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    }, init(e6) {
      return void 0 !== e6 && this.C(o7, void 0, t5, e6), e6;
    } };
  }
  if ("setter" === n6) {
    const { name: o7 } = r6;
    return function(r7) {
      const n7 = this[o7];
      e5.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n6);
};
function n4(t5) {
  return (e5, o7) => "object" == typeof o7 ? r4(t5, e5, o7) : ((t6, e6, o8) => {
    const r6 = e6.hasOwnProperty(o8);
    return e6.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e6, o8) : void 0;
  })(t5, e5, o7);
}

// @lit/reactive-element/node/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// ui/lib/tax-resolve.ts
var TAX_HEADERS = [
  "tax_category",
  "tax_category_key",
  "category_tax",
  "fiscal_category",
  "tax",
  "iva",
  "vat",
  "impuesto",
  "tax_class"
];
function pickTaxValue(row) {
  for (const key of Object.keys(row)) {
    if (TAX_HEADERS.includes(key.trim().toLowerCase())) {
      const v3 = (row[key] ?? "").trim();
      if (v3) return v3;
    }
  }
  return "";
}
function normalizeAlias(value) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function categoryMatches(cat, value) {
  const v3 = normalizeAlias(value);
  if ((cat.key ?? "").toLowerCase() === v3) return cat.key;
  if (normalizeAlias(cat.name ?? "") === v3) return cat.key;
  return null;
}
async function resolveTaxCategories(rows, client) {
  const byKey = /* @__PURE__ */ new Map();
  for (const r6 of rows) {
    const value = pickTaxValue(r6);
    if (!value) continue;
    const norm = normalizeAlias(value);
    if (norm && !byKey.has(norm)) byKey.set(norm, value);
  }
  if (byKey.size === 0) return { map: /* @__PURE__ */ new Map(), unresolved: [] };
  const categories = await client.query("taxes.categories.list", { limit: 500 }) ?? [];
  const map = /* @__PURE__ */ new Map();
  const unresolved = [];
  for (const [norm, original] of byKey) {
    let key = null;
    for (const c5 of categories) {
      const m4 = categoryMatches(c5, original);
      if (m4) {
        key = m4;
        break;
      }
    }
    if (!key) {
      try {
        const rows2 = await client.query("taxes.aliases.resolve", { alias: norm }) ?? [];
        const hit = rows2[0]?.tax_category_key;
        if (hit) key = hit;
      } catch {
      }
    }
    if (key) map.set(norm, key);
    else unresolved.push(original);
  }
  return { map, unresolved };
}
async function learnAlias(client, aliasText, taxCategoryKey) {
  const alias = normalizeAlias(aliasText);
  if (!alias) return;
  await client.command("taxes.aliases.create", { alias, tax_category_key: taxCategoryKey, source: "learned" });
}
async function createCategoryWithAlias(client, key, name, aliasText) {
  await client.command("taxes.categories.create", { key, name });
  await learnAlias(client, aliasText, key);
  return key;
}

// ui/lib/tax-category-option.ts
function isRoot(r6) {
  return r6.parent_id == null || String(r6.parent_id) === "";
}
function rowsOf(r6) {
  if (Array.isArray(r6)) return r6;
  if (r6 && typeof r6 === "object" && Array.isArray(r6.rows)) {
    return r6.rows;
  }
  return [];
}
async function loadTaxRates(client) {
  const out = /* @__PURE__ */ new Map();
  try {
    const all = rowsOf(await client.queryAll("taxes.rules.list"));
    const rootByCat = /* @__PURE__ */ new Map();
    for (const r6 of all) {
      if (!r6 || !r6.tax_category_key || !isRoot(r6)) continue;
      const cat = String(r6.tax_category_key);
      const cur = rootByCat.get(cat);
      if (!cur || String(r6.valid_from ?? "") > String(cur.valid_from ?? "")) rootByCat.set(cat, r6);
    }
    for (const [cat, root] of rootByCat) {
      const cls = String(root.operation_class ?? "") || "subject";
      out.set(cat, { pct: Number(root.rate_pct) || 0, exempt: cls !== "subject" });
    }
  } catch {
  }
  return out;
}
function taxCategoryDisplayName(category) {
  return (category.display_name || "").trim() || (category.name || "").trim();
}
function taxCategoryOptionLabel(category, rates, t5) {
  const key = (category.key || "").trim();
  const name = taxCategoryDisplayName(category) || key;
  const rate = rates.get(key);
  if (!rate) return name;
  if (rate.exempt) {
    const label = t5("ui.taxExempt");
    return label && label !== "ui.taxExempt" ? `${name} \xB7 ${label}` : name;
  }
  return `${name} \xB7 ${rate.pct} %`;
}

// locales/es.json
var es_default = {
  name: "Inventario",
  description: "Productos, stock y almacenes: consulta disponibilidad, ajusta existencias y da entrada a la mercanc\xEDa.",
  navigation: {
    dashboard: {
      label: "Panel"
    },
    products: {
      label: "Productos"
    },
    categories: {
      label: "Categor\xEDas"
    },
    settings: {
      label: "Ajustes"
    },
    movements: {
      label: "Movimientos"
    }
  },
  settings: {
    title: "Inventario",
    fields: {
      allow_sell_without_stock: {
        label: "Permitir vender sin stock"
      },
      low_stock_threshold: {
        label: "Umbral de stock bajo",
        description: "En unidades enteras. Lo heredan los productos que no fijan su propio umbral; el de cada producto manda sobre este."
      },
      track_stock: {
        label: "Controlar stock"
      }
    }
  },
  setup: {
    title: "Tu cat\xE1logo",
    description: "A\xF1ade al menos un producto para que haya algo que vender."
  },
  ui: {
    name: "Nombre",
    sku: "SKU",
    price: "Precio",
    stock: "Stock",
    active: "Activo",
    category: "Categor\xEDa",
    products: "Productos",
    slugOptional: "Slug (opcional)",
    searchCategory: "Buscar categor\xEDa\u2026",
    noCategories: "Sin categor\xEDas.",
    addProduct: "A\xF1adir producto",
    newProduct: "Nuevo producto",
    editProduct: "Editar producto",
    lowStock: "Stock bajo",
    searchProduct: "Buscar producto\u2026",
    noProducts: "Sin productos",
    taxRate: "Tipo de IVA / Impuesto",
    taxDefault: "\u2014 (por defecto)",
    taxGroup: "grupo",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Borrar",
    yes: "S\xED",
    no: "No",
    actionDetail: "Detalles",
    actionEdit: "Editar",
    actionDelete: "Eliminar",
    importTaxTitle: "Categor\xEDas fiscales del CSV",
    importTaxHint: "Algunas filas necesitan una categor\xEDa fiscal antes de poder crearse: o su texto del CSV no se reconoce, o no traen columna fiscal. Elige una categor\xEDa existente o crea una nueva; la decisi\xF3n se recuerda para futuras importaciones.",
    importPick: "Elegir",
    importCreate: "Crear",
    importSkip: "Omitir",
    importConfirm: "Confirmar e importar",
    btnCancel: "Cancelar",
    btnClose: "Cerrar",
    colCategory: "Categor\xEDa",
    colKey: "Clave",
    colName: "Nombre",
    threshold: "Umbral",
    loading: "Cargando\u2026",
    statsTracked: "Productos seguidos",
    statsInStock: "En stock",
    statsOutOfStock: "Agotados",
    statsLowStock: "Stock bajo",
    statsValue: "Valor de existencias",
    statsValueAtCost: "a coste",
    statsWithoutCost: "producto(s) sin coste registrado: el valor mostrado es parcial",
    statsError: "No se pudieron cargar las m\xE9tricas del inventario.",
    lowStockTitle: "Productos con stock bajo",
    lowStockEmpty: "Sin productos en stock bajo.",
    actionReceive: "Recibir stock",
    actionCount: "Contar stock",
    countTitle: "Recuento",
    countCurrent: "Stock actual",
    countNew: "Stock contado",
    countDiff: "Diferencia",
    countReason: "Motivo (obligatorio)",
    countApply: "Aplicar recuento",
    receiveTitle: "Recepci\xF3n",
    receiveQty: "Cantidad recibida",
    receiveCost: "Coste unitario",
    receiveApply: "Registrar recepci\xF3n",
    mvDate: "Fecha",
    mvType: "Tipo",
    mvQty: "Cantidad",
    mvStockAfter: "Saldo",
    mvReason: "Motivo",
    mvReference: "Referencia",
    mvEmpty: "Todav\xEDa no hay movimientos. Aparecen al usar Recibir stock o Contar stock en un producto de Productos, y con cada venta.",
    mvInitial: "Inicial",
    mvReception: "Recepci\xF3n",
    mvSale: "Venta",
    mvVoid: "Anulaci\xF3n",
    mvCount: "Recuento",
    mvDecrease: "Descuento",
    importErrNameSku: "Faltan nombre o SKU",
    importErrPrice: "Precio no num\xE9rico",
    importErrDupFile: "SKU duplicado en el fichero",
    importReportTitle: "Resultado de la importaci\xF3n",
    importTotal: "Filas",
    importCreated: "Creadas",
    importSkipped: "Omitidas (ya exist\xEDan)",
    importFailed: "Fallidas",
    importLine: "L\xEDnea",
    importCopy: "Copiar informe",
    editingTitle: "Editando producto",
    editingCategoryTitle: "Editando categor\xEDa",
    editingCancel: "Cancelar edici\xF3n",
    skuIdentity: "El SKU es la identidad del producto: no se edita",
    fieldCost: "Coste",
    fieldInitialStock: "Stock inicial",
    fieldThreshold: "Umbral stock bajo",
    fieldDescription: "Descripci\xF3n",
    fieldType: "Tipo",
    typePhysical: "F\xEDsico",
    typeService: "Servicio",
    fieldUnit: "Unidad de medida",
    fieldCategories: "Categor\xEDas",
    saveChanges: "Guardar cambios",
    errSkuTaken: "Ese SKU ya existe en el cat\xE1logo",
    errEanTaken: "Ese EAN ya existe en el cat\xE1logo",
    errCount: "No se pudo aplicar el recuento",
    errReceive: "No se pudo registrar la recepci\xF3n",
    errDeleteProduct: "No se pudo eliminar el producto",
    errUpdateProduct: "No se pudo actualizar el producto",
    errSaveProduct: "No se pudo guardar el producto",
    errAmbiguousAmount: "Este importe se puede leer de dos maneras: \xAB{typed}\xBB tanto puede ser {grouped} como {decimal}. Escribe los decimales para que no haya duda.",
    errNotAnAmount: "Esto no es un importe. Escribe una cifra, por ejemplo 12,50.",
    errQuantity: "Introduce una cantidad v\xE1lida con un m\xE1ximo de 6 decimales",
    errQuantityGrid: "La cantidad no respeta el incremento permitido para esta unidad",
    errDeleteCategory: "No se pudo eliminar la categor\xEDa",
    errSaveCategory: "No se pudo guardar la categor\xEDa",
    saving: "Guardando\u2026",
    printBarcode: "Imprimir c\xF3digo de barras",
    errPrintBarcode: "No se pudo imprimir la etiqueta del c\xF3digo de barras",
    errPrintBarcodeNoPrinter: "Ninguna impresora tiene el rol \xABEtiqueta\xBB: as\xEDgnale una en Impresi\xF3n",
    deleteCatTitle: "Eliminar categor\xEDa",
    deleteCatImpact: "producto(s) quedar\xE1n sin esta categor\xEDa (se desvinculan; los productos no se borran)",
    deleteCatConfirm: "Eliminar y desvincular",
    deleteProdTitle: "Eliminar producto",
    deleteProdHint: "se eliminar\xE1 del cat\xE1logo (borrado l\xF3gico; sus movimientos de stock se conservan)",
    status: "Estado",
    statusUnconfigured: "Sin configurar",
    statusUnconfiguredReason: "Falta la categor\xEDa fiscal",
    fieldTaxCategory: "Categor\xEDa fiscal",
    taxCategoryPlaceholder: "Elige una categor\xEDa fiscal",
    taxNoneAvailable: "Todav\xEDa no hay categor\xEDas fiscales. Cr\xE9alas en Impuestos: un producto no se puede vender sin saber c\xF3mo tributa.",
    errTaxCategoryRequired: "Elige la categor\xEDa fiscal: sin ella el producto no se puede vender.",
    importErrTaxCategory: "Falta la categor\xEDa fiscal",
    importTaxMissingLabel: "Filas sin categor\xEDa fiscal",
    fieldTrackStock: "Controlar stock de este art\xEDculo",
    trackStockInherit: "Sigue el ajuste del hub",
    trackStockOff: "Solo cat\xE1logo: las ventas no mueven su stock",
    previewTitle: "Revisa la importaci\xF3n",
    previewHint: "Dinos qu\xE9 columna es cada cosa. No se crea nada hasta que confirmes.",
    previewIgnore: "No importar",
    previewRowsTitle: "Primeras {n} filas de {total}",
    previewSummary: "{ready} fila(s) listas \xB7 {failed} con problemas",
    previewMissingRequired: "Asigna las columnas de Nombre y SKU: sin ellas no se puede crear ning\xFAn producto.",
    previewConfirm: "Importar {n} producto(s)",
    importProgress: "Importando {done}/{total}\u2026",
    importStop: "Parar",
    importCancelledNote: "La importaci\xF3n se par\xF3 a medias. Lo que ya se hab\xEDa creado est\xE1 contado abajo; el resto del fichero se qued\xF3 como estaba.",
    taxExempt: "exento",
    countNeedsQty: "Escribe el stock contado para continuar.",
    countNeedsReason: "Hace falta un motivo para aplicar el recuento."
  },
  widgets: {
    "inventory.low_stock_count": {
      title: "Stock bajo",
      label: "Productos en stock bajo",
      category: "Inventario"
    },
    "inventory.value": {
      title: "Valor de inventario",
      label: "Valor del stock (a coste)",
      category: "Inventario"
    },
    "inventory.in_stock": {
      title: "Productos en stock",
      label: "Productos con existencias",
      category: "Inventario"
    },
    "inventory.low_stock_products": {
      title: "Productos con menos stock",
      category: "Inventario"
    }
  },
  errors: {
    "inventory.insufficient_stock": "No hay stock suficiente para completar la operaci\xF3n.",
    "inventory.unknown_product": "Este producto no existe en este hub.",
    "inventory.off_grid_quantity": "Esa cantidad no encaja en la unidad del producto: se vende en escalones fijos (unidades enteras, gramos\u2026) y no se puede descontar un trozo de escal\xF3n, como media lata. Pon un m\xFAltiplo exacto del escal\xF3n de la unidad; no se redondea solo, porque cambiar\xEDa lo vendido."
  }
};

// locales/en.json
var en_default = {
  name: "Inventory",
  navigation: {
    dashboard: {
      label: "Dashboard"
    },
    products: {
      label: "Products"
    },
    categories: {
      label: "Categories"
    },
    settings: {
      label: "Settings"
    },
    movements: {
      label: "Movements"
    }
  },
  settings: {
    title: "Inventory",
    fields: {
      allow_sell_without_stock: {
        label: "Allow selling without stock"
      },
      low_stock_threshold: {
        label: "Low stock threshold",
        description: "In whole units. Inherited by products that do not set their own threshold; a product's own threshold wins over this one."
      },
      track_stock: {
        label: "Track stock"
      }
    }
  },
  setup: {
    title: "Your catalog",
    description: "Add at least one product so there is something to sell."
  },
  ui: {
    name: "Name",
    sku: "SKU",
    price: "Price",
    stock: "Stock",
    active: "Active",
    category: "Category",
    products: "Products",
    slugOptional: "Slug (optional)",
    searchCategory: "Search category\u2026",
    noCategories: "No categories.",
    addProduct: "Add product",
    newProduct: "New product",
    editProduct: "Edit product",
    lowStock: "Low stock",
    searchProduct: "Search product\u2026",
    noProducts: "No products",
    taxRate: "Tax rate",
    taxDefault: "\u2014 (default)",
    taxGroup: "group",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    yes: "Yes",
    no: "No",
    actionDetail: "Details",
    actionEdit: "Edit",
    actionDelete: "Delete",
    importTaxTitle: "CSV tax categories",
    importTaxHint: "Some rows need a tax category before they can be created: either their CSV text is not recognized, or they bring no tax column at all. Pick an existing category or create a new one; the choice is remembered for future imports.",
    importPick: "Pick",
    importCreate: "Create",
    importSkip: "Skip",
    importConfirm: "Confirm & import",
    btnCancel: "Cancel",
    btnClose: "Close",
    colCategory: "Category",
    colKey: "Key",
    colName: "Name",
    threshold: "Threshold",
    loading: "Loading\u2026",
    statsTracked: "Tracked products",
    statsInStock: "In stock",
    statsOutOfStock: "Out of stock",
    statsLowStock: "Low stock",
    statsValue: "Inventory value",
    statsValueAtCost: "at cost",
    statsWithoutCost: "product(s) without recorded cost: the value shown is partial",
    statsError: "Inventory metrics could not be loaded.",
    lowStockTitle: "Low stock products",
    lowStockEmpty: "No products in low stock.",
    actionReceive: "Receive stock",
    actionCount: "Count stock",
    countTitle: "Stock count",
    countCurrent: "Current stock",
    countNew: "Counted stock",
    countDiff: "Difference",
    countReason: "Reason (required)",
    countApply: "Apply count",
    receiveTitle: "Goods receipt",
    receiveQty: "Quantity received",
    receiveCost: "Unit cost",
    receiveApply: "Record receipt",
    mvDate: "Date",
    mvType: "Type",
    mvQty: "Quantity",
    mvStockAfter: "Balance",
    mvReason: "Reason",
    mvReference: "Reference",
    mvEmpty: "No movements yet. They appear when you use Receive stock or Count stock on a product in Products, and with every sale.",
    mvInitial: "Initial",
    mvReception: "Reception",
    mvSale: "Sale",
    mvVoid: "Void",
    mvCount: "Count",
    mvDecrease: "Decrease",
    importErrNameSku: "Missing name or SKU",
    importErrPrice: "Non-numeric price",
    importErrDupFile: "Duplicate SKU in file",
    importReportTitle: "Import result",
    importTotal: "Rows",
    importCreated: "Created",
    importSkipped: "Skipped (already existed)",
    importFailed: "Failed",
    importLine: "Line",
    importCopy: "Copy report",
    editingTitle: "Editing product",
    editingCategoryTitle: "Editing category",
    editingCancel: "Cancel editing",
    skuIdentity: "SKU is the product identity: not editable",
    fieldCost: "Cost",
    fieldInitialStock: "Initial stock",
    fieldThreshold: "Low stock threshold",
    fieldDescription: "Description",
    fieldType: "Type",
    typePhysical: "Physical",
    typeService: "Service",
    fieldUnit: "Unit of measure",
    fieldCategories: "Categories",
    saveChanges: "Save changes",
    errSkuTaken: "That SKU already exists in the catalog",
    errEanTaken: "That EAN already exists in the catalog",
    errCount: "The stock count could not be applied",
    errReceive: "The goods receipt could not be recorded",
    errDeleteProduct: "The product could not be deleted",
    errUpdateProduct: "The product could not be updated",
    errSaveProduct: "The product could not be saved",
    errAmbiguousAmount: "This amount can be read in two ways: \xAB{typed}\xBB could be {grouped} or {decimal}. Write the decimals so there is no doubt.",
    errNotAnAmount: "This is not an amount. Type a figure, for example 12.50.",
    errQuantity: "Enter a valid quantity with no more than 6 decimal places",
    errQuantityGrid: "The quantity does not match the increment allowed for this unit",
    errDeleteCategory: "The category could not be deleted",
    errSaveCategory: "The category could not be saved",
    saving: "Saving\u2026",
    printBarcode: "Print barcode",
    errPrintBarcode: "The barcode label could not be printed",
    errPrintBarcodeNoPrinter: "No printer is assigned to the \xABLabel\xBB role: assign one in Printing",
    deleteCatTitle: "Delete category",
    deleteCatImpact: "product(s) will lose this category (unlinked; products are kept)",
    deleteCatConfirm: "Delete and unlink",
    deleteProdTitle: "Delete product",
    deleteProdHint: "will be removed from the catalog (soft delete; its stock movements are kept)",
    status: "Status",
    statusUnconfigured: "Not configured",
    statusUnconfiguredReason: "Missing tax category",
    fieldTaxCategory: "Tax category",
    taxCategoryPlaceholder: "Pick a tax category",
    taxNoneAvailable: "There are no tax categories yet. Create them in Taxes: a product cannot be sold until it is known how it is taxed.",
    errTaxCategoryRequired: "Pick the tax category: without it the product cannot be sold.",
    importErrTaxCategory: "Missing tax category",
    importTaxMissingLabel: "Rows with no tax category",
    fieldTrackStock: "Track stock for this item",
    trackStockInherit: "Following the hub setting",
    trackStockOff: "Catalog only: sales do not move its stock",
    previewTitle: "Check the import",
    previewHint: "Tell us which column is which. Nothing is created until you confirm.",
    previewIgnore: "Do not import",
    previewRowsTitle: "First {n} rows of {total}",
    previewSummary: "{ready} row(s) ready \xB7 {failed} with problems",
    previewMissingRequired: "Map the Name and SKU columns: without them no product can be created.",
    previewConfirm: "Import {n} product(s)",
    importProgress: "Importing {done}/{total}\u2026",
    importStop: "Stop",
    importCancelledNote: "The import was stopped halfway. What had already been created is counted below; the rest of the file was left untouched.",
    taxExempt: "Exempt",
    countNeedsQty: "Enter the counted stock to continue.",
    countNeedsReason: "A reason is required to apply the count."
  },
  errors: {
    "inventory.insufficient_stock": "Not enough stock to complete the operation.",
    "inventory.unknown_product": "This product does not exist in this hub.",
    "inventory.off_grid_quantity": "That quantity does not fit the product's unit: it is sold in fixed steps (whole units, grams\u2026), and a part of a step, such as half a can, cannot be taken off. Enter a whole multiple of the unit's step; it is not rounded for you, because that would change what was sold."
  }
};

// @erplora/outfitkit/dist/define.js
function define(tag, ctor) {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}

// @erplora/outfitkit/dist/shared/icons.js
var rawAdd = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288m144-144H112"/></svg>';
var rawAlertCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m0 319.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.94v-.05a21.74 21.74 0 1 1 43.44 0Z"/></svg>';
var rawAlertCircleOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 0 0-5.79-6h0a5.74 5.74 0 0 0-5.68 6"/><path fill="currentColor" d="M256 367.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20"/></svg>';
var rawAppsOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="80" height="80" x="64" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/></svg>';
var rawArchiveOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M80 152v256a40.12 40.12 0 0 0 40 40h272a40.12 40.12 0 0 0 40-40V152"/><rect width="416" height="80" x="48" y="64" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="28" ry="28"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 304l-64 64l-64-64m64 41.89V224"/></svg>';
var rawArrowRedoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M448 256L272 88v96C103.57 184 64 304.77 64 424c48.61-62.24 91.6-96 208-96v96Z"/></svg>';
var rawArrowUndoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M240 424v-96c116.4 0 159.39 33.76 208 96c0-119.23-39.57-240-208-240V88L64 256Z"/></svg>';
var rawBackspaceOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M135.19 390.14a28.8 28.8 0 0 0 21.68 9.86h246.26A29 29 0 0 0 432 371.13V140.87A29 29 0 0 0 403.13 112H156.87a28.84 28.84 0 0 0-21.67 9.84L46.33 256l88.86 134.11Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34m130.01 0L206.66 192.33m130.01 0L206.66 322.34m130.01 0L206.66 192.33"/></svg>';
var rawCalendarOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="416" height="384" x="48" y="80" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="48"/><circle cx="296" cy="232" r="24" fill="currentColor"/><circle cx="376" cy="232" r="24" fill="currentColor"/><circle cx="296" cy="312" r="24" fill="currentColor"/><circle cx="376" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="312" r="24" fill="currentColor"/><circle cx="216" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="392" r="24" fill="currentColor"/><circle cx="216" cy="392" r="24" fill="currentColor"/><circle cx="296" cy="392" r="24" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128 48v32m256-32v32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M464 160H48"/></svg>';
var rawCheckmarkCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m108.25 138.29l-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32l122.59-145.91a16 16 0 0 1 24.5 20.58"/></svg>';
var rawCheckmarkOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M416 128L192 384l-96-96"/></svg>';
var rawChevronBack = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronBackOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronDownOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 184l144 144l144-144"/></svg>';
var rawChevronForward = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronForwardOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronUpOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 328l144-144l144 144"/></svg>';
var rawClose = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34Z"/></svg>';
var rawCloseOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144m224 0L144 368"/></svg>';
var rawCloudUploadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8c-69 0-113.44 45.79-128 91.2c-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 255.79l-64-64l-64 64m64 192.42V207.79"/></svg>';
var rawCreateOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48"/><path fill="currentColor" d="M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38M399.34 90L218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 299a3.91 3.91 0 0 0 4.86 4.86l24.85-8.35a9 9 0 0 0 3.93-2.31L422 112.66a9 9 0 0 0 0-12.66l-9.95-10a9 9 0 0 0-12.71 0"/></svg>';
var rawContractOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 416V304h112m-101.8 10.23L432 432M208 96v112H96m101.8-10.23L80 80m336 128H304V96m10.23 101.8L432 80M96 304h112v112m-10.23-101.8L80 432"/></svg>';
var rawDocumentAttachOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M208 64h66.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62V432a48 48 0 0 1-48 48H192a48 48 0 0 1-48-48V304"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M288 72v120a32 32 0 0 0 32 32h120"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M160 80v152a23.69 23.69 0 0 1-24 24c-12 0-24-9.1-24-24V88c0-30.59 16.57-56 48-56s48 24.8 48 55.38v138.75c0 43-27.82 77.87-72 77.87s-72-34.86-72-77.87V144"/></svg>';
var rawDocumentOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120"/></svg>';
var rawDocumentTextOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160"/></svg>';
var rawDownloadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 176h40a40 40 0 0 1 40 40v208a40 40 0 0 1-40 40H136a40 40 0 0 1-40-40V216a40 40 0 0 1 40-40h40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m176 272l80 80l80-80M256 48v288"/></svg>';
var rawEllipsisVertical = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><circle cx="256" cy="256" r="48" fill="currentColor"/><circle cx="256" cy="416" r="48" fill="currentColor"/><circle cx="256" cy="96" r="48" fill="currentColor"/></svg>';
var rawExpandOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320m101.8-10.23L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320m10.23 101.8L208 304"/></svg>';
var rawFileTrayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M384 80H128c-26 0-43 14-48 40L48 272v112a48.14 48.14 0 0 0 48 48h320a48.14 48.14 0 0 0 48-48V272l-32-152c-5-27-23-40-48-40Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M48 272h144m128 0h144m-272 0a64 64 0 0 0 128 0"/></svg>';
var rawFolderOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M64 192v-72a40 40 0 0 1 40-40h75.89a40 40 0 0 1 22.19 6.72l27.84 18.56a40 40 0 0 0 22.19 6.72H408a40 40 0 0 1 40 40v40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M479.9 226.55L463.68 392a40 40 0 0 1-39.93 40H88.25a40 40 0 0 1-39.93-40L32.1 226.55A32 32 0 0 1 64 192h384.1a32 32 0 0 1 31.8 34.55"/></svg>';
var rawInformationCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 56C145.72 56 56 145.72 56 256s89.72 200 200 200s200-89.72 200-200S366.28 56 256 56m0 82a26 26 0 1 1-26 26a26 26 0 0 1 26-26m48 226h-88a16 16 0 0 1 0-32h28v-88h-16a16 16 0 0 1 0-32h32a16 16 0 0 1 16 16v104h28a16 16 0 0 1 0 32"/></svg>';
var rawMenuOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 160h352M80 256h352M80 352h352"/></svg>';
var rawNotificationsOffOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128.51 204.59q-.37 6.15-.37 12.76C128.14 304 110 320 84.33 351.43C73.69 364.45 83 384 101.62 384H320m94.5-48.7c-18.48-23.45-30.62-47.05-30.62-118c0-79.3-40.52-107.57-73.88-121.3c-4.43-1.82-8.6-6-9.95-10.55C294.21 65.54 277.82 48 256 48s-38.2 17.55-44 37.47c-1.35 4.6-5.52 8.71-10 10.53a150 150 0 0 0-18 8.79M320 384v16a64 64 0 0 1-128 0v-16"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M448 448L64 64"/></svg>';
var rawOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"/></svg>';
var rawPlayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16Z"/></svg>';
var rawRemove = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"/></svg>';
var rawSearchOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg>';
var rawSend = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m476.59 227.05l-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52A24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4a24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8"/></svg>';
var rawSwapVerticalOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M464 208L352 96L240 208m112-94.87V416M48 304l112 112l112-112m-112 94V96"/></svg>';
var rawTrashOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320"/><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 112h352"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M192 112V72h0a23.93 23.93 0 0 1 24-24h80a23.93 23.93 0 0 1 24 24h0v40m-64 64v224m-72-224l8 224m136-224l-8 224"/></svg>';
var rawTrendingDown = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 368h112V256"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 144l121.37 121.37a32 32 0 0 0 45.26 0l50.74-50.74a32 32 0 0 1 45.26 0L448 352"/></svg>';
var rawTrendingUp = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 144h112v112"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 368l121.37-121.37a32 32 0 0 1 45.26 0l50.74 50.74a32 32 0 0 0 45.26 0L448 160"/></svg>';
var rawVolumeHighOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M126 192H56a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a15.93 15.93 0 0 1 10.14 3.54l91.47 74.89A8 8 0 0 0 240 392V120a8 8 0 0 0-12.74-6.43l-91.47 74.89A15 15 0 0 1 126 192m194 128c9.74-19.38 16-40.84 16-64c0-23.48-6-44.42-16-64m48 176c19.48-33.92 32-64.06 32-112s-12-77.74-32-112m48 272c30-46 48-91.43 48-160s-18-113-48-160"/></svg>';
var rawVolumeLowOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M189.65 192H120a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a16 16 0 0 1 10.14 3.63l91.47 75a8 8 0 0 0 12.74-6.46V119.83a8 8 0 0 0-12.74-6.44l-91.47 75a16 16 0 0 1-10.14 3.61M384 320c9.74-19.41 16-40.81 16-64c0-23.51-6-44.4-16-64"/></svg>';
var rawVolumeMuteOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M416 432L64 80"/><path fill="currentColor" d="M224 136.92v33.8a4 4 0 0 0 1.17 2.82l24 24a4 4 0 0 0 6.83-2.82v-74.15a24.53 24.53 0 0 0-12.67-21.72a23.91 23.91 0 0 0-25.55 1.83a8 8 0 0 0-.66.51l-31.94 26.15a4 4 0 0 0-.29 5.92l17.05 17.06a4 4 0 0 0 5.37.26Zm0 238.16l-78.07-63.92a32 32 0 0 0-20.28-7.16H64v-96h50.72a4 4 0 0 0 2.82-6.83l-24-24a4 4 0 0 0-2.82-1.17H56a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h69.76l91.36 74.8a8 8 0 0 0 .66.51a23.93 23.93 0 0 0 25.85 1.69A24.49 24.49 0 0 0 256 391.45v-50.17a4 4 0 0 0-1.17-2.82l-24-24a4 4 0 0 0-6.83 2.82ZM352 256c0-24.56-5.81-47.88-17.75-71.27a16 16 0 0 0-28.5 14.54C315.34 218.06 320 236.62 320 256q0 4-.31 8.13a8 8 0 0 0 2.32 6.25l19.66 19.67a4 4 0 0 0 6.75-2A147 147 0 0 0 352 256m64 0c0-51.19-13.08-83.89-34.18-120.06a16 16 0 0 0-27.64 16.12C373.07 184.44 384 211.83 384 256c0 23.83-3.29 42.88-9.37 60.65a8 8 0 0 0 1.9 8.26l16.77 16.76a4 4 0 0 0 6.52-1.27C410.09 315.88 416 289.91 416 256"/><path fill="currentColor" d="M480 256c0-74.26-20.19-121.11-50.51-168.61a16 16 0 1 0-27 17.22C429.82 147.38 448 189.5 448 256c0 47.45-8.9 82.12-23.59 113a4 4 0 0 0 .77 4.55L443 391.39a4 4 0 0 0 6.4-1C470.88 348.22 480 307 480 256"/></svg>';
var rawWarning = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M449.07 399.08L278.64 82.58c-12.08-22.44-44.26-22.44-56.35 0L51.87 399.08A32 32 0 0 0 80 446.25h340.89a32 32 0 0 0 28.18-47.17m-198.6-1.83a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.95a21.73 21.73 0 0 1 21.5-22.69h.21a21.74 21.74 0 0 1 21.73 22.7Z"/></svg>';
function bake(svg) {
  return `data:image/svg+xml;utf8,${svg}`;
}
var iconAdd = bake(rawAdd);
var iconAlertCircle = bake(rawAlertCircle);
var iconAlertCircleOutline = bake(rawAlertCircleOutline);
var iconAppsOutline = bake(rawAppsOutline);
var iconArchiveOutline = bake(rawArchiveOutline);
var iconArrowRedoOutline = bake(rawArrowRedoOutline);
var iconArrowUndoOutline = bake(rawArrowUndoOutline);
var iconBackspaceOutline = bake(rawBackspaceOutline);
var iconCalendarOutline = bake(rawCalendarOutline);
var iconCheckmarkCircle = bake(rawCheckmarkCircle);
var iconCheckmarkOutline = bake(rawCheckmarkOutline);
var iconChevronBack = bake(rawChevronBack);
var iconChevronBackOutline = bake(rawChevronBackOutline);
var iconChevronDownOutline = bake(rawChevronDownOutline);
var iconChevronForward = bake(rawChevronForward);
var iconChevronForwardOutline = bake(rawChevronForwardOutline);
var iconChevronUpOutline = bake(rawChevronUpOutline);
var iconClose = bake(rawClose);
var iconCloseOutline = bake(rawCloseOutline);
var iconCloudUploadOutline = bake(rawCloudUploadOutline);
var iconCreateOutline = bake(rawCreateOutline);
var iconDocumentAttachOutline = bake(rawDocumentAttachOutline);
var iconContractOutline = bake(rawContractOutline);
var iconDocumentOutline = bake(rawDocumentOutline);
var iconDocumentTextOutline = bake(rawDocumentTextOutline);
var iconDownloadOutline = bake(rawDownloadOutline);
var iconEllipsisVertical = bake(rawEllipsisVertical);
var iconExpandOutline = bake(rawExpandOutline);
var iconFileTrayOutline = bake(rawFileTrayOutline);
var iconFolderOpenOutline = bake(rawFolderOpenOutline);
var iconInformationCircle = bake(rawInformationCircle);
var iconMenuOutline = bake(rawMenuOutline);
var iconNotificationsOffOutline = bake(rawNotificationsOffOutline);
var iconOpenOutline = bake(rawOpenOutline);
var iconPlayOutline = bake(rawPlayOutline);
var iconRemove = bake(rawRemove);
var iconSearchOutline = bake(rawSearchOutline);
var iconSend = bake(rawSend);
var iconSwapVerticalOutline = bake(rawSwapVerticalOutline);
var iconTrashOutline = bake(rawTrashOutline);
var iconTrendingDown = bake(rawTrendingDown);
var iconTrendingUp = bake(rawTrendingUp);
var iconVolumeHighOutline = bake(rawVolumeHighOutline);
var iconVolumeLowOutline = bake(rawVolumeLowOutline);
var iconVolumeMuteOutline = bake(rawVolumeMuteOutline);
var iconWarning = bake(rawWarning);
var BY_NAME = {
  "add": iconAdd,
  "alert-circle": iconAlertCircle,
  "alert-circle-outline": iconAlertCircleOutline,
  "apps-outline": iconAppsOutline,
  "archive-outline": iconArchiveOutline,
  "arrow-redo-outline": iconArrowRedoOutline,
  "arrow-undo-outline": iconArrowUndoOutline,
  "backspace-outline": iconBackspaceOutline,
  "calendar-outline": iconCalendarOutline,
  "checkmark-circle": iconCheckmarkCircle,
  "checkmark-outline": iconCheckmarkOutline,
  "chevron-back": iconChevronBack,
  "chevron-back-outline": iconChevronBackOutline,
  "chevron-down-outline": iconChevronDownOutline,
  "chevron-forward": iconChevronForward,
  "chevron-forward-outline": iconChevronForwardOutline,
  "chevron-up-outline": iconChevronUpOutline,
  "close": iconClose,
  "close-outline": iconCloseOutline,
  "cloud-upload-outline": iconCloudUploadOutline,
  "create-outline": iconCreateOutline,
  "document-attach-outline": iconDocumentAttachOutline,
  "contract-outline": iconContractOutline,
  "document-outline": iconDocumentOutline,
  "document-text-outline": iconDocumentTextOutline,
  "download-outline": iconDownloadOutline,
  "ellipsis-vertical": iconEllipsisVertical,
  "expand-outline": iconExpandOutline,
  "file-tray-outline": iconFileTrayOutline,
  "folder-open-outline": iconFolderOpenOutline,
  "information-circle": iconInformationCircle,
  "menu-outline": iconMenuOutline,
  "notifications-off-outline": iconNotificationsOffOutline,
  "open-outline": iconOpenOutline,
  "play-outline": iconPlayOutline,
  "remove": iconRemove,
  "search-outline": iconSearchOutline,
  "send": iconSend,
  "swap-vertical-outline": iconSwapVerticalOutline,
  "trash-outline": iconTrashOutline,
  "trending-down": iconTrendingDown,
  "trending-up": iconTrendingUp,
  "volume-high-outline": iconVolumeHighOutline,
  "volume-low-outline": iconVolumeLowOutline,
  "volume-mute-outline": iconVolumeMuteOutline,
  "warning": iconWarning
};
function okIcon(value) {
  if (!value) return void 0;
  const trimmed = value.trimStart();
  if (trimmed.startsWith("<svg")) return bake(trimmed);
  return BY_NAME[value] ?? value;
}

// @erplora/outfitkit/dist/ok-inline-feedback.js
var __defProp2 = Object.defineProperty;
var __decorateClass2 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp2(target, key, result);
  return result;
};
var DEFAULT_LABELS = {
  dismiss: "Dismiss"
};
var OkInlineFeedback = class extends i3 {
  constructor() {
    super(...arguments);
    this.tone = "info";
    this.dismissible = false;
    this.hidden = false;
    this.labels = {};
    this.hasActions = false;
    this.onActionsSlotChange = (e5) => {
      const slot = e5.target;
      this.hasActions = slot.assignedNodes({ flatten: true }).length > 0;
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex.
         --tone-color y --tone-icon se reasignan por tone abajo. */
      --tone-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --background-opacity: 0.1;
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --border-radius: var(--ok-radius, var(--ion-border-radius, 8px));
      --padding: var(--ok-spacing, var(--ion-padding, 16px));
      --accent-width: 4px;
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Responsive: el banner ocupa el ancho del contenedor. */
      display: block;
      width: 100%;
      font-family: var(--font);
      box-sizing: border-box;
    }
    :host([hidden]) { display: none; }

    /* Mapa de tonos → color Ionic + icono por defecto. */
    :host([tone='success']) { --tone-color: var(--ok-success, var(--ion-color-success, #2dd55b)); }
    :host([tone='warning']) { --tone-color: var(--ok-warning, var(--ion-color-warning, #ffc409)); }
    :host([tone='danger'])  { --tone-color: var(--ok-danger, var(--ion-color-danger, #c5000f)); }
    :host([tone='neutral']) { --tone-color: var(--ok-medium, var(--ion-color-medium, #5f5f5f)); }
    /* info / sin tono → primary (default ya aplicado en :host). */

    .box {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: var(--padding);
      border-radius: var(--border-radius);
      border-inline-start: var(--accent-width) solid var(--tone-color);
      /* Fondo tonal: el color del tono con baja opacidad (color-mix con fallback al borde fino). */
      background: color-mix(in srgb, var(--tone-color) calc(var(--background-opacity) * 100%), transparent);
      color: var(--color);
    }

    .icon {
      flex: 0 0 auto;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--tone-color);
      margin-top: 0.05rem;
    }

    .content {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .text {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .heading {
      font-weight: 700;
      font-size: 0.98rem;
      line-height: 1.3;
    }
    .body {
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .actions {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    /* Si no hay actions, el slot queda vacío y no ocupa espacio. */
    .actions.empty { display: none; }

    .close {
      flex: 0 0 auto;
      background: none;
      border: 0;
      cursor: pointer;
      padding: 0.15rem;
      margin: -0.15rem -0.15rem 0 0;
      color: inherit;
      opacity: 0.6;
      font-size: 1.2rem;
      line-height: 1;
      border-radius: 4px;
      transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease),
        opacity 0.15s ease, transform 120ms ease;
    }
    @media (hover: hover) {
      .close:hover { opacity: 1; background: rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07); }
    }
    .close:active { transform: scale(var(--ok-press-scale, 0.97)); }

    /* Móvil: las actions bajan bajo el texto (apiladas a ancho completo). */
    @media (max-width: 640px) {
      .row { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .close:hover,
      .close:active { transform: none; }
    }
  `;
  }
  // Textos efectivos: defaults en inglés + overrides del consumidor.
  get t() {
    return { ...DEFAULT_LABELS, ...this.labels };
  }
  // Icono por defecto según el tono (overridable por la prop `icon`).
  defaultIcon() {
    switch (this.tone) {
      case "success":
        return iconCheckmarkCircle;
      case "warning":
        return iconWarning;
      case "danger":
        return iconAlertCircle;
      case "neutral":
        return iconInformationCircle;
      case "info":
      default:
        return iconInformationCircle;
    }
  }
  // Oculta el banner y avisa al consumidor; éste puede revertir restaurando `hidden=false`.
  dismiss() {
    this.hidden = true;
    this.dispatchEvent(new CustomEvent("ok-dismiss", { bubbles: true, composed: true }));
  }
  render() {
    const iconName = this.icon ?? this.defaultIcon();
    return b2`
      <div class="box" role="status">
        <ion-icon class="icon" .icon=${okIcon(iconName)} aria-hidden="true"></ion-icon>
        <div class="content">
          <div class="row">
            <div class="text">
              ${this.heading ? b2`<div class="heading">${this.heading}</div>` : null}
              <div class="body"><slot></slot></div>
            </div>
            <div class="actions ${this.hasActions ? "" : "empty"}">
              <slot name="actions" @slotchange=${this.onActionsSlotChange}></slot>
            </div>
          </div>
        </div>
        ${this.dismissible ? b2`
              <button class="close" aria-label=${this.t.dismiss} @click=${this.dismiss}>
                <ion-icon .icon=${iconClose} aria-hidden="true"></ion-icon>
              </button>
            ` : null}
      </div>
    `;
  }
};
__decorateClass2([
  n4({ type: String, reflect: true })
], OkInlineFeedback.prototype, "tone");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "heading");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "icon");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "dismissible");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "hidden");
__decorateClass2([
  n4({ attribute: false })
], OkInlineFeedback.prototype, "labels");
__decorateClass2([
  r5()
], OkInlineFeedback.prototype, "hasActions");
define("ok-inline-feedback", OkInlineFeedback);

// lit-html/directive.js
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t5) => (...e5) => ({ _$litDirective$: t5, values: e5 });
var i4 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e5, i7) {
    this._$Ct = t5, this._$AM = e5, this._$Ci = i7;
  }
  _$AS(t5, e5) {
    return this.update(t5, e5);
  }
  update(t5, e5) {
    return this.render(...e5);
  }
};

// lit-html/directive-helpers.js
var { I: t4 } = j;
var i5 = (o7) => o7;
var s4 = () => document.createComment("");
var v2 = (o7, n6, e5) => {
  const l3 = o7._$AA.parentNode, d3 = void 0 === n6 ? o7._$AB : n6._$AA;
  if (void 0 === e5) {
    const i7 = l3.insertBefore(s4(), d3), n7 = l3.insertBefore(s4(), d3);
    e5 = new t4(i7, n7, o7, o7.options);
  } else {
    const t5 = e5._$AB.nextSibling, n7 = e5._$AM, c5 = n7 !== o7;
    if (c5) {
      let t6;
      e5._$AQ?.(o7), e5._$AM = o7, void 0 !== e5._$AP && (t6 = o7._$AU) !== n7._$AU && e5._$AP(t6);
    }
    if (t5 !== d3 || c5) {
      let o8 = e5._$AA;
      for (; o8 !== t5; ) {
        const t6 = i5(o8).nextSibling;
        i5(l3).insertBefore(o8, d3), o8 = t6;
      }
    }
  }
  return e5;
};
var u3 = (o7, t5, i7 = o7) => (o7._$AI(t5, i7), o7);
var m3 = {};
var p3 = (o7, t5 = m3) => o7._$AH = t5;
var M2 = (o7) => o7._$AH;
var h3 = (o7) => {
  o7._$AR(), o7._$AA.remove();
};

// lit-html/directives/repeat.js
var u4 = (e5, s5, t5) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l3 = s5; l3 <= t5; l3++) r6.set(e5[l3], l3);
  return r6;
};
var c4 = e4(class extends i4 {
  constructor(e5) {
    if (super(e5), e5.type !== t3.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e5, s5, t5) {
    let r6;
    void 0 === t5 ? t5 = s5 : void 0 !== s5 && (r6 = s5);
    const l3 = [], o7 = [];
    let i7 = 0;
    for (const s6 of e5) l3[i7] = r6 ? r6(s6, i7) : i7, o7[i7] = t5(s6, i7), i7++;
    return { values: o7, keys: l3 };
  }
  render(e5, s5, t5) {
    return this.dt(e5, s5, t5).values;
  }
  update(s5, [t5, r6, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t5, r6, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ??= [], v3 = [];
    let m4, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m4 && (m4 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m4.has(h4[x2])) if (m4.has(h4[j2])) {
      const e5 = y3.get(a3[k2]), t6 = void 0 !== e5 ? d3[e5] : null;
      if (null === t6) {
        const e6 = v2(s5, d3[x2]);
        u3(e6, p4[k2]), v3[k2] = e6;
      } else v3[k2] = u3(t6, p4[k2]), v2(s5, d3[x2], t6), d3[e5] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e5 = v2(s5, v3[w2 + 1]);
      u3(e5, p4[k2]), v3[k2++] = e5;
    }
    for (; x2 <= j2; ) {
      const e5 = d3[x2++];
      null !== e5 && h3(e5);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// lit-html/directives/style-map.js
var n5 = "important";
var i6 = " !" + n5;
var o6 = e4(class extends i4 {
  constructor(t5) {
    if (super(t5), t5.type !== t3.ATTRIBUTE || "style" !== t5.name || t5.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t5) {
    return Object.keys(t5).reduce((e5, r6) => {
      const s5 = t5[r6];
      return null == s5 ? e5 : e5 + `${r6 = r6.includes("-") ? r6 : r6.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s5};`;
    }, "");
  }
  update(e5, [r6]) {
    const { style: s5 } = e5.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(r6)), this.render(r6);
    for (const t5 of this.ft) null == r6[t5] && (this.ft.delete(t5), t5.includes("-") ? s5.removeProperty(t5) : s5[t5] = null);
    for (const t5 in r6) {
      const e6 = r6[t5];
      if (null != e6) {
        this.ft.add(t5);
        const r7 = "string" == typeof e6 && e6.endsWith(i6);
        t5.includes("-") || r7 ? s5.setProperty(t5, r7 ? e6.slice(0, -11) : e6, r7 ? n5 : "") : s5[t5] = e6;
      }
    }
    return E;
  }
});

// @erplora/outfitkit/dist/shared/anchor.js
function shadowAnchorEvent(ev) {
  const el = ev.currentTarget ?? ev.target;
  return new CustomEvent("ok-popover-anchor", { detail: { ionShadowTarget: el } });
}

// @erplora/outfitkit/dist/shared/ion-tone.js
var DEFAULT_HEX = {
  primary: "#0054e9",
  secondary: "#0163aa",
  tertiary: "#6030ff",
  success: "#2dd55b",
  warning: "#ffc409",
  danger: "#c5000f",
  light: "#f4f5f8",
  medium: "#636469",
  dark: "#222428"
};
var DEFAULT_CONTRAST = {
  primary: "#fff",
  secondary: "#fff",
  tertiary: "#fff",
  success: "#000",
  warning: "#000",
  danger: "#fff",
  light: "#000",
  medium: "#fff",
  dark: "#fff"
};
var TONE_NAME = /^[a-z][a-z0-9-]*$/;
function tokenChain(okName, ionName, hex) {
  return `var(--ok-${okName}, var(--ion-color-${ionName}${hex ? `, ${hex}` : ""}))`;
}
function ionTone2(tone, variant) {
  if (!tone || !TONE_NAME.test(tone)) return void 0;
  const value = tokenChain(tone, tone, DEFAULT_HEX[tone]);
  switch (variant) {
    case "text":
      return `color: ${value};`;
    case "clear":
      return `--color: ${value};`;
    case "outline":
      return `--color: ${value}; --border-color: ${value}; --background-activated: ${value}; --background-focused: ${value};`;
    case "solid": {
      const contrast = tokenChain(`${tone}-contrast`, `${tone}-contrast`, DEFAULT_CONTRAST[tone]);
      return `--background: ${value}; --color: ${contrast}; --background-hover: var(--ion-color-${tone}-tint, ${value}); --background-activated: var(--ion-color-${tone}-shade, ${value}); --background-focused: var(--ion-color-${tone}-shade, ${value});`;
    }
  }
}

// @erplora/outfitkit/dist/shared/searchbar-single-clear.js
function syncSearchbarInputName(root, name) {
  const bar = root?.querySelector("ion-searchbar");
  if (!bar) return;
  void customElements.whenDefined("ion-searchbar").then(() => bar.getInputElement?.()).then((input) => {
    const n6 = name();
    if (input && input.getAttribute("aria-label") !== n6) {
      input.setAttribute("aria-label", n6);
    }
  }).catch(() => {
  });
}
var searchbarSingleClear = i`
  ion-searchbar input::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }
`;

// @erplora/outfitkit/dist/ok-data-table.js
var CSV_BOM = "\uFEFF";
var WINDOWS_1252_C1 = [
  8364,
  129,
  8218,
  402,
  8222,
  8230,
  8224,
  8225,
  710,
  8240,
  352,
  8249,
  338,
  141,
  381,
  143,
  144,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  732,
  8482,
  353,
  8250,
  339,
  157,
  382,
  376
];
function decodeWindows1252(bytes) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte >= 128 && byte <= 159 ? WINDOWS_1252_C1[byte - 128] : byte);
  }
  return text;
}
function decodeCsvBuffer(buf) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = decodeWindows1252(new Uint8Array(buf));
  }
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
var __defProp3 = Object.defineProperty;
var __decorateClass3 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp3(target, key, result);
  return result;
};
function decideRowActionsFit(input) {
  const { containerWidth, contentWidth, collapsed, decidedAtWidth } = input;
  if (!(containerWidth > 0)) return { collapsed, decidedAtWidth };
  if (containerWidth !== decidedAtWidth) {
    if (collapsed) return { collapsed: false, decidedAtWidth: containerWidth };
    return { collapsed: contentWidth > containerWidth, decidedAtWidth: containerWidth };
  }
  if (!collapsed && contentWidth > containerWidth) return { collapsed: true, decidedAtWidth };
  return { collapsed, decidedAtWidth };
}
function decideCardsForFit(input) {
  const { allowed, hostWidth, folded, fitCards, fitWidth } = input;
  const idle = { fitCards: false, fitWidth: 0 };
  if (!allowed) return idle;
  if (!(hostWidth > 0)) return { fitCards, fitWidth };
  if (fitCards) return hostWidth >= fitWidth ? idle : { fitCards, fitWidth };
  if (folded && folded.containerWidth > 0 && folded.contentWidth > folded.containerWidth) {
    return { fitCards: true, fitWidth: hostWidth + folded.contentWidth - folded.containerWidth };
  }
  return idle;
}
var DEFAULT_LABELS2 = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  showResults: "Show results",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "View as list",
  viewCards: "View as cards",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  editRecord: "Edit",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records",
  loadMore: "Load more",
  noMatches: "No results match your search or filters",
  showAll: "Show all",
  loadError: "Couldn't load the data",
  retry: "Retry",
  loading: "Loading\u2026"
};
var ES_LABELS = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  showResults: "Ver resultados",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  editRecord: "Editar",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros",
  loadMore: "Cargar m\xE1s",
  noMatches: "Ning\xFAn resultado coincide con la b\xFAsqueda o los filtros",
  showAll: "Mostrar todo",
  loadError: "No se han podido cargar los datos",
  retry: "Reintentar",
  loading: "Cargando\u2026"
};
var NUMERIC_TEXT = /^-?\d+(\.\d+)?$/;
var ISO_DATE_OR_TIME = /^(\d{4}-\d{2}-\d{2}|\d{2}:\d{2})/;
var _OkDataTable = class _OkDataTable2 extends i3 {
  constructor() {
    super(...arguments);
    this.columns = [];
    this.rows = [];
    this.searchKeys = [];
    this.rowKeyField = "id";
    this.pageSize = 10;
    this.loading = false;
    this.labels = {};
    this.actions = [];
    this.addable = false;
    this.pageSizeOptions = [10, 25, 50, 100];
    this.fill = false;
    this.columnPicker = true;
    this.csv = false;
    this.csvName = "export.csv";
    this.serverSide = false;
    this.total = 0;
    this.page = 0;
    this.searchable = false;
    this.sortDir = "asc";
    this.filterValues = {};
    this.title = "";
    this.views = false;
    this.exportable = false;
    this.importable = false;
    this.columnSelector = false;
    this.rowClickable = false;
    this.selectable = false;
    this.inlineFilters = false;
    this.menuActions = [];
    this.q = "";
    this.clientPage = 0;
    this.clientPageSize = 0;
    this.mobileShown = 0;
    this.clientSort = "";
    this.clientSortDir = "asc";
    this.clientFilters = {};
    this.filterDraft = {};
    this.serverFilters = {};
    this.panel = "none";
    this.panelTitle = "";
    this.viewMode = "table";
    this.viewChosenByUser = false;
    this.isMobile = false;
    this.xOverflow = false;
    this.actionsTrackPx = 0;
    this.rowActionsCollapsed = false;
    this.actionsLabelFits = true;
    this.unfoldedCells = /* @__PURE__ */ new Set();
    this.lastPointerType = "";
    this.fitDecidedAtWidth = -1;
    this.fitCards = false;
    this.fitCardsWidth = 0;
    this.fitShape = "";
    this.rowMenuOpen = false;
    this.columnChoice = /* @__PURE__ */ new Map();
    this.internalSelection = /* @__PURE__ */ new Set();
    this.menuOpen = false;
    this.onLocaleChanged = () => this.requestUpdate();
    this.onKeydown = (e5) => {
      if (e5.key !== "Escape" || e5.defaultPrevented || this.panel === "none") return;
      e5.preventDefault();
      e5.stopPropagation();
      this.closePanel("escape");
    };
    this.onWindowResize = () => {
      this.measureXOverflow();
      this.measureRowActionsFit();
      this.syncSheetInsets();
      this.syncContentAfter();
    };
    this.sheetContent = null;
    this.notePointer = (e5) => {
      this.lastPointerType = e5.pointerType;
    };
    this.onSearch = (ev) => {
      const value = ev.target.value ?? "";
      if (this.serverSide) {
        this.q = value;
        this.emit("searchChange", value);
      } else {
        this.q = value;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
    this.gapLabels = /* @__PURE__ */ new Map();
    this.slotActionsCache = null;
  }
  static {
    this.styles = i`
    ${searchbarSingleClear}
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex */
      --background: var(--ok-surface, var(--ion-card-background, var(--ion-background-color, #ffffff)));
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-muted, var(--ion-color-medium, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.55)));
      --border-color: var(--ok-border, var(--ion-color-step-150, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.12)));
      --border-color-soft: var(--ok-border-soft, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07)));
      /* Borde más marcado para los controles de la toolbar (selects/pastilla de fechas), para que se
       * distingan como controles en claro y oscuro aunque el lienzo y la superficie casi no contrasten. */
      --control-border: color-mix(in srgb, var(--color) 22%, transparent);
      /* Relieve de cabecera/pie: step-100 (definido en claro y oscuro) → contraste con el lienzo. */
      --header-background: var(--ok-surface-2, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04)));
      --row-hover: var(--ok-row-hover, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.03)));
      --primary: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-contrast: var(--ok-primary-contrast, var(--ion-color-primary-contrast, #ffffff));
      --border-radius: var(--ok-radius, 16px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      display: block;
      color: var(--color);
      font-family: var(--font);
    }
    * { box-sizing: border-box; }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      /* Flat: sin borde ni elevación (directiva 2026-06-09). */
      border: 0;
      border-radius: var(--border-radius);
      overflow: hidden;
      background: var(--background);
      box-shadow: none;
    }

    /* Panel lateral derecho (drawer) DENTRO de la tabla: filtros / alta-edición. Base (sin media):
       overlay absoluto — es lo que había hasta #75 y lo que ve un navegador sin media queries. */
    .tk-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.18); z-index: 19; }
    .drawer { position: absolute; top: 0; right: 0; height: 100%; width: 340px; max-width: 88%;
      background: var(--background); border-left: 1px solid var(--border-color);
      display: flex; flex-direction: column; z-index: 20;
      animation: tk-slide-in 0.18s ease; }
    @keyframes tk-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    /* #75 — El panel EMPUJA en escritorio y es HOJA COMPLETA en móvil; nunca tapa a medias.
       Medido en el hub (Servicios/Citas): a 1440 el overlay de 340px se pintaba ENCIMA de
       «Duración», «Acciones» y el selector de columnas, con el 90% de la tabla vacío a la
       izquierda; a 390 dejaba una tira de 45px de tabla (media lupa, medio «Co…») que hacía
       parecer el formulario un pop-up mal puesto. Square Dashboard reduce la tabla con un panel
       fijo; Fresha/Shopify/Odoo abren una hoja a pantalla completa en móvil.
       ≥ 834px: mientras hay panel, .card pasa a rejilla de DOS columnas (tabla | panel 360px):
       la tabla se estrecha (ya sabe hacer scroll-x, #67) y nada queda tapado. */
    @media (min-width: 834px) {
      .card.has-panel { display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-rows: auto minmax(0, 1fr) auto; }
      .card.has-panel > .bar { grid-column: 1; grid-row: 1; }
      .card.has-panel > .scroll, .card.has-panel > .cards-grid, .card.has-panel > .empty, .card.has-panel > .load-error, .card.has-panel > .loading-state { grid-column: 1; grid-row: 2; min-height: 0; overflow: auto; }
      .card.has-panel > .pager { grid-column: 1; grid-row: 3; }
      .card.has-panel > .drawer { position: static; grid-column: 2; grid-row: 1 / -1; width: auto; max-width: none; height: auto; min-height: 0; animation: none; }
      .card.has-panel > .tk-scrim { display: none; }
    }
    /* < 834px: hoja a pantalla completa con su cabecera (título + Cerrar); sin tira residual.
       position:fixed dentro de ion-content se ancla al área de contenido (contain), que es justo el hueco
       bajo la cabecera de la app: el usuario conserva el título de la página. */
    @media (max-width: 833.98px) {
      .drawer { position: fixed; inset: 0; top: var(--ok-sheet-top, 0px); bottom: var(--ok-sheet-bottom, 0px); width: 100%; max-width: none; height: auto; border-left: 0; z-index: 1000; }
      .tk-scrim { display: none; }
    }
    .drawer .dh { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 0.5rem 0.6rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 1rem; }
    .drawer .db { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
    .fblock { display: flex; flex-direction: column; gap: 0.45rem; }
    .flabel { font-size: 13px; font-weight: 500; color: var(--color); }
    .frange { display: flex; gap: 0.5rem; }
    /* Filtros cliente: multi-select con ion-select (ventana flotante de Ionic) + rango de fechas. */
    .daterange { display: flex; gap: 0.6rem; }
    .daterange ion-input { flex: 1; }
    /* Pie del drawer de filtros: Limpiar / Aplicar. */
    .df { flex: 0 0 auto; display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; padding: 0.6rem 0.85rem; border-top: 1px solid var(--border-color); }
    .df .df-clear { margin-right: auto; }
    /* #207 — Server-mode «Show results»: the one button of the footer, as wide as the sheet. */
    .df .df-done { flex: 1 1 auto; }

    /* Modo fill: la tabla ocupa el alto del contenedor; filas con scroll interno; pager fijo. */
    :host([fill]) { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    :host([fill]) .card { flex: 1 1 auto; min-height: 0; }
    :host([fill]) .bar, :host([fill]) .panel, :host([fill]) .pager { flex: 0 0 auto; }
    :host([fill]) .scroll, :host([fill]) .cards-grid { flex: 1 1 auto; min-height: 0; overflow: auto; }
    /* Sin filas, renderTable/renderCards devuelven SOLO el bloque .empty (sin .scroll). En modo
       fill hay que estirarlo para que ocupe el hueco entre toolbar y pager y centre su contenido
       (icono + mensaje) en vertical; si no, queda pegado arriba con el pager a media altura. */
    :host([fill]) .empty, :host([fill]) .load-error, :host([fill]) .loading-state { flex: 1 1 auto; min-height: 0; }
    /* #218 — On a phone (MOBILE_BREAKPOINT, where the table turns into cards and «Load more») the
       module paints other blocks above the table, and rows boxed in between toolbar and footer got
       what was left: a 315px card in a 32-155px window, never readable whole. Phone lists scroll
       WITH the page (Shopify, Square, Odoo): the card is as tall as its content, the rows are not a
       scroller of their own and the shell's ion-content scrolls.
       The host box stays as it was, so the blocks ABOVE keep their size (growing it squeezed an
       ion-segment or ion-card to 0px), and the cards run past it into the page scroll. Only when
       something in flow comes AFTER the table ([content-after], see syncContentAfter) does the box
       grow, pushing that content down instead of painting over it. !important because every
       module ships .page > ok-data-table { flex: 1 1 auto; min-height: 0 }, and only an important
       declaration from inside the shadow wins over the page's own rule. */
    @media (max-width: 640px) {
      :host([fill]) .card { flex: 1 0 auto; }
      :host([fill]) .scroll, :host([fill]) .cards-grid { flex: 0 0 auto; }
      :host([fill]) .cards-grid { overflow: visible; }
      :host([fill][content-after]) { height: auto; flex-shrink: 0 !important; }
    }

    /* ── Topbar / cabecera (relieve) ─────────────────────────────────────────────────────── */
    .bar { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    /* Toolbar CONSOLIDADA: TODOS los controles son hijos directos de UNA sola fila flex que
     * envuelve ELEMENTO A ELEMENTO (no por bloques): caben en una línea → una línea; los que no
     * caben bajan a la(s) línea(s) que hagan falta. El cluster derecho se empuja al borde con
     * .tk-spacer (hueco flexible) solo cuando todo cabe en una línea; al envolver, el spacer se
     * oculta y todo se apila a la izquierda.
     * ORDEN CANÓNICO (2026-06-22, izquierda→derecha): [buscador] · [filtros en línea] · ‹spacer› ·
     * [SELECTORES: columnas → filas/página] · [BOTONES: vistas → filtros(funnel) → import → export →
     * alta → ⋮ → acción primaria]. Es decir: buscador al inicio, filtros en medio, y al final los
     * selectores (columnas, luego «N por página») seguidos de los botones de acción. */
    .bar-main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .bar-main > ion-button { --padding-start: 0.5rem; --padding-end: 0.5rem; margin: 0; }
    /* Spacer que absorbe el hueco libre en pantallas anchas (empuja el cluster derecho al borde).
     * Se oculta por debajo de 1024px para que, al envolver, los controles se apilen a la izquierda. */
    .tk-spacer { flex: 1 1 0; min-width: 0; align-self: stretch; }
    @media (max-width: 1024px) { .tk-spacer { display: none; } }
    /* Buscador a ancho completo (línea propia) en móvil; el resto envuelve debajo. */
    @media (max-width: 640px) { .search { flex-basis: 100%; max-width: none; } }
    .title-wrap { display: flex; align-items: baseline; gap: 0.5rem; }
    .title { font-size: 15px; font-weight: 600; line-height: 1; margin: 0; }
    .title-count { font-size: 12px; font-weight: 500; color: var(--color-muted); }

    /* Botón de herramienta cuadrado (filtros/import/export), look del Hub: 36×36, badge contador. */
    .toolbtn { position: relative; --padding-start: 0; --padding-end: 0; --border-radius: 10px; width: 36px; height: 36px; margin: 0; }
    .toolbtn .badge { position: absolute; top: -5px; right: -5px; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 999px; background: var(--primary); color: var(--primary-contrast); font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; pointer-events: none; }

    /* Buscador (caja con icono + limpiar), look del Hub. No crece (el spacer se queda el hueco);
     * puede encoger hasta min-width y, por debajo, envuelve. */
    .search { flex: 0 1 22rem; min-width: 12rem; max-width: 24rem; }
    ion-searchbar { --background: var(--background); --border-radius: 10px; padding: 0; min-height: 36px; }
    /* Flat: el buscador quita borde y elevación vía la clase específica de Ionic 'ion-no-border'.
     * (La regla global de Ionic para .ion-no-border no cruza el Shadow DOM, así que la
     * reimplementamos aquí dentro: --box-shadow controla la elevación; ::part(native) el borde.) */
    ion-searchbar.ion-no-border { --box-shadow: none; }
    ion-searchbar.ion-no-border::part(native) { border: none; box-shadow: none; }

    /* Toggle de vista lista/tarjetas (segmento) */
    .viewseg { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--background); }
    .viewseg ion-button { --border-radius: 7px; }

    /* Botón primario (primaryAction) */
    .primary-btn { --background: var(--primary); --color: var(--primary-contrast); }
    /* #76 — El alta en MÓVIL: botón primario CON etiqueta y área táctil de 44px, en vez del «+»
       icónico de 36px al final de la barra. Fresha/Square/Shopify POS ponen la acción primaria
       de la lista como botón visible con texto (o FAB), nunca como icono anónimo.
       #113 — Y en ESCRITORIO igual: Odoo («New»), Business Central, Shopify («Add product»),
       WooCommerce, Lightspeed y Fresha rotulan y rellenan la acción principal de un listado; NN/g
       reserva el botón sin rótulo para lo universal (buscar, cerrar). Aquí solo cambia la ALTURA:
       36px para alinear con .toolbtn y el buscador, y los 44px táctiles vuelven abajo con el
       resto de objetivos de puntero grueso. */
    .add-btn { min-height: 36px; --border-radius: 10px; --padding-start: 0.9rem; --padding-end: 1rem; margin: 0; font-weight: 600; }
    .add-btn ion-icon { margin-inline-end: 0.35rem; }

    /* Selects de la toolbar: fondo + borde visibles (como el buscador y la pastilla de fechas) para
     * que se distingan como controles en claro y oscuro (sin fondo eran invisibles en dark). */
    .tk-cols { min-width: 6.5rem; max-width: 9rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.3rem; --padding-bottom: 0.3rem; }
    .vsep { width: 1px; align-self: stretch; background: var(--border-color); margin: 0.3rem 0.25rem; }

    /* Selector de filas/página en la toolbar (consolidado) */
    /* max-width: ion-select es display:block (sin core.css el host estira a la
     * línea entera cuando .bar-end hace wrap) — se capa como .tk-cols. */
    .tk-psize { min-width: 4.25rem; max-width: 5.5rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }

    /* Filtros EN LÍNEA en la toolbar (select / rango de fechas) */
    .tk-filter { min-width: 8.5rem; max-width: 13rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.7rem; --padding-end: 0.5rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }
    .tk-daterange { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.6rem; min-height: 38px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--background); color: var(--color-muted); font-size: 13px; }
    .tk-daterange ion-icon { font-size: 15px; flex: 0 0 auto; }
    .tk-daterange ion-input { --background: transparent; --padding-start: 0; --padding-end: 0; --padding-top: 2px; --padding-bottom: 2px; --color: var(--color); min-height: 26px; width: 6.8rem; font-size: 13px; }
    .tk-daterange .arr { color: var(--color-muted); }

    /* Barra contextual de selección */
    .selbar { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.7rem; border-radius: 10px;
      font-size: 13px; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .selbar .sel-clear { margin-left: auto; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer; font-weight: 500; color: inherit; background: none; border: 0; font: inherit; }
    .selbar .sel-clear:hover { text-decoration: underline; }

    /* Acordeones (alta / filtros en modo tarjetas) */
    .panel { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    .filters-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.6rem; }

    /* ── Vista lista en CSS GRID (no <table>): permite ancho por columna ──────────────────── */
    /* #67 — La barra horizontal es PERMANENTE cuando hay desbordamiento: la overlay de macOS se
       esconde a los pocos ms y deja la tabla sin ninguna pista de que sigue a la derecha. Al
       declarar ::-webkit-scrollbar el navegador pinta la clásica, que ocupa sitio y se ve. */
    .scroll { overflow-x: auto; }
    .scroll::-webkit-scrollbar { height: 10px; }
    .scroll::-webkit-scrollbar-track { background: transparent; }
    .scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color) 25%, transparent); border-radius: 6px; }
    .scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color) 40%, transparent); }
    /* #120 - The grid floor is the SUM OF THE COLUMN MINIMUMS (min-content), not its maximum
       size. With max-content the grid sizes itself to what the widest column asks for and, in
       doing so, every 1fr track ends up as wide AS THAT ONE: at 834px each column measured
       148.86px for content asking between 10px (a "4") and 100px ("Familia Perez"). The table
       always overflowed and the pinned actions column sat on top of Pax and Estado. With
       min-content the grid fits its container as long as the minimums fit, and 1fr shares out the
       leftover space; horizontal scroll shows up only when not even the minimums fit. */
    .grid { min-width: min-content; font-size: 14px; }
    .grow { display: grid; align-items: center; gap: 0.5rem; padding: 0 1rem; }
    .ghead { position: sticky; top: 0; z-index: 2; border-bottom: 1px solid var(--border-color);
      background: var(--header-background); padding-top: 0.55rem; padding-bottom: 0.55rem; }
    .gcell { display: flex; align-items: center; min-width: 0; }
    .gcell > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    /* #217 - A touch screen has no hover to show the cell's title, so in a table whose rows open
       nothing a tap on a clipped cell unfolds it in place (see onCellTap). Only that cell wraps; the rest of the row keeps
       its one line. The grid track does not move: its minimum is the column's fixed floor. */
    .gcell > span.unfolded { white-space: normal; overflow-wrap: anywhere; }
    .gcell.right { justify-content: flex-end; text-align: right; }
    .gcell.center { justify-content: center; text-align: center; }
    /* #67 - PINNED ACTIONS COLUMN. When the grid overflows (since #120 only when not even the
       column minimums fit; before that it happened with six columns and room to spare) the button
       that opens the record went off screen: at 1440px it sat 335px past the edge with nothing to
       give it away. It stays stuck to the right edge, like Zendesk/Freshdesk/Shopify. With
       background:inherit it takes the row background (which is opaque for this very reason), so it
       keeps hover and selection without anything showing through. */
    .gcell.actions-col { position: sticky; right: 0; z-index: 1; background: inherit;
      margin-right: -1rem; padding-right: 1rem; }
    /* La sombra solo aparece cuando de verdad hay algo escondido a la izquierda (clase x-overflow);
       si la tabla cabe entera no se pinta nada. */
    .scroll.x-overflow .gcell.actions-col { box-shadow: -10px 0 10px -10px color-mix(in srgb, var(--color) 45%, transparent); }
    /* #120 - The pinned header has to be OPAQUE. background:inherit took --header-background,
       which is a 4% alpha TINT (measured rgba(24,24,27,0.04)): when the grid overflows the
       "Acciones" header went see-through and "PAX" and "ESTADO" could be read through it - the
       "PAXCIONESTAD" of the issue. It now sits on the opaque table background with the tint laid
       back on top, the same way .grow-data:hover does. */
    .ghead .gcell.actions-col { z-index: 3;
      background: linear-gradient(var(--header-background), var(--header-background)), var(--background); }
    .gh { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
    .gh.sortable { cursor: pointer; user-select: none; white-space: nowrap; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    @media (hover: hover) {
      .gh.sortable:hover { color: var(--color); }
    }
    /* Caret de orden (3 estados, icono Ionic): neutral atenuado / activo en color primario. */
    .caret { display: inline-flex; align-items: center; margin-left: 0.25rem; flex: 0 0 auto; font-size: 13px; opacity: 0.3; }
    .caret.on { opacity: 1; color: var(--primary); }
    .grow-data { background: var(--background); border-bottom: 1px solid var(--border-color-soft); padding-top: 0.6rem; padding-bottom: 0.6rem; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    .grow-data:last-child { border-bottom: 0; }
    @media (hover: hover) {
      .grow-data:hover { background: linear-gradient(var(--row-hover), var(--row-hover)), var(--background); }
    }
    .grow-data:active { transform: scale(0.995); }
    .grow-data.selected { background: linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--primary) 10%, transparent)), var(--background); }
    /* #67 — Fila clicable (opt-in row-clickable): es lo primero que intenta el usuario y lo que
       hacen Odoo, Jira SM, Shopify o Square en sus listados. */
    .grow-data.clickable { cursor: pointer; }
    .grow-data.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    .selcb { display: flex; align-items: center; justify-content: center; }
    .filters-grow { padding-top: 0.4rem; padding-bottom: 0.6rem; }
    .filters-grow input, .filters-grow select { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; padding: 0.3rem 0.4rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .range { display: flex; gap: 0.25rem; }

    /* ── Vista tarjetas ──────────────────────────────────────────────────────────────────── */
    /* Cada tarjeta mide SU contenido (no se estira al alto de la fila ni del contenedor):
       - grid-auto-rows: max-content → cada fila implícita = alto de su contenido. CLAVE: sin esto,
         en modo fill (grid de alto fijo + align-content:start) cuando las tarjetas no caben el
         navegador encoge los tracks de fila y las tarjetas se solapan.
       - align-content: start → empaqueta las filas arriba (no reparte el hueco sobrante estirando).
       - align-items: start → en una fila multi-columna cada tarjeta mide su propio contenido.
       En modo fill el grid es flex-child con overflow:auto → cuando las tarjetas no caben aparece el
       scroll DENTRO de la tabla (no crece hacia fuera). */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.75rem; padding: 1rem; grid-auto-rows: max-content; align-content: start; align-items: start; }
    /* Tarjeta = ion-card NATIVO de Ionic: su fondo, radio, elevación y padding son los de Ionic y NO
       se sobrescriben. Aquí solo se ajusta lo que el contexto de rejilla exige (margin) y los huecos
       que Ionic no trae (cabecera en fila, filas clave-valor, barra de acciones, resalte de selección). */
    ion-card.rcard { margin: 0; } /* la rejilla aporta el gap → sin esto el margin por defecto de ion-card lo duplica */
    ion-card.rcard.selected { outline: 2px solid var(--primary); outline-offset: -2px; }
    /* #74 — Tarjeta clicable (opt-in row-clickable): la mitad de #67 que faltaba. La vista de
       tarjetas es la que la tabla elige SOLA en móvil, así que sin esto el registro no se podía
       abrir desde un teléfono (medido con combos 0.1.4: 0 rowClick a 390px). */
    ion-card.rcard.clickable { cursor: pointer; }
    ion-card.rcard.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    @media (prefers-reduced-motion: reduce) {
      .gh.sortable:hover, .gh.sortable:active,
      .grow-data:hover, .grow-data:active { transform: none; }
    }
    /* Header: ion-card-header as a single row (icon + title + checkbox), keeping Ionic's padding.
       #79 — flex-direction/flex-wrap are SPELLED OUT on purpose: in ios mode (the mode the Hub
       shell pins, ADR-0143) Ionic's own host CSS gives ion-card-header a column direction, so a
       rule that only sets display:flex inherits it and the three children stack on three lines.
       Under md the same rule looked right, which is why it shipped. */
    ion-card-header.rcard-head { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 0.5rem; }
    .rcard-head .rc-icon { display: inline-flex; color: var(--primary); }
    .rcard-head .rc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    /* Cuerpo: ion-card-content (padding Ionic por defecto) con las filas clave-valor apiladas. */
    ion-card-content.rcard-body { display: flex; flex-direction: column; gap: 0.4rem; }
    .rrow { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 13px; }
    .rrow .rk { color: var(--color-muted); }
    .rrow .rv { font-weight: 500; text-align: right; color: var(--color); }
    /* Barra de acciones (Ionic no trae "card actions"): pie alineado a la derecha, fondo transparente. */
    .ractions { display: flex; justify-content: flex-end; gap: 0.25rem; padding: 0 0.5rem 0.5rem; }
    /* ERPlora/appointments#154 - a card's action row must NEVER clip.
       The assumption was that they always fit across the card. With the eight actions an
       appointment carries they do not: on a 411dp phone the card leaves 363px and the buttons ask
       for 380px (8 x 44px of tap floor + 7 gaps of 4px). Without wrapping, justify-content:
       flex-end takes that difference off the START side, so the FIRST button - Cobrar - hung off
       the left edge of the card, clipped, with no scrollbar and nothing to say it was there.
       The wrap is scoped to the card on purpose: the LIST view's row is measured by its
       scrollWidth to pin the column track (#121), and a row that wraps changes width with the
       track it is measured against, which is the loop that measure avoids. */
    .ractions .actions { flex-wrap: wrap; }

    /* ── Estado vacío ────────────────────────────────────────────────────────────────────── */
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    /* pm#530 — Error state: same frame as the empty state, but its heading reads as text, not muted. */
    .load-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    /* #268 — Loading state: same frame as the empty state, a spinner instead of the tray. */
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    .loading-state ion-spinner { width: 28px; height: 28px; color: var(--ok-primary, var(--ion-color-primary, #3880ff)); }
    .load-error .load-error-title { color: var(--color); font-weight: 600; }
    .load-error .empty-ic { color: var(--ok-danger, var(--ion-color-danger, #c5000f)); }
    .load-error ion-button { margin-top: 0.25rem; }
    .empty .empty-ic, .load-error .empty-ic { display: grid; place-items: center; width: 3.25rem; height: 3.25rem; border-radius: 999px; background: var(--header-background); font-size: 26px; }

    .actions { display: flex; gap: 0.25rem; justify-content: flex-end; }
    /* #121 - The buttons NEVER shrink. Their track is pinned to the width measured here
       (the scrollWidth of .actions); if they could shrink, a narrow track would shrink the
       measurement, which would shrink the track again. flex: 0 0 auto is what makes the
       measurement a property of the CONTENT instead of a property of the current layout. */
    .actions ion-button { flex: 0 0 auto; }
    /* #240 - Stand-in of a row action hidden on this row: it keeps the button's width (so the
       others stay in their column) and paints nothing; aria-hidden + inert keep it out of the
       accessibility tree, the tab order and the click path. */
    .actions .action-gap { visibility: hidden; }
    /* #122 - Header of the actions column while the buttons are folded into the menu. "ACCIONES"
       measures 62.83px and the folded track is 44px: painted, it spills out of its own cell and
       over "Estado" - the very thing the issue is about. The column keeps its name for assistive
       tech and paints nothing. #211 - Same while expanded when the buttons leave no room for the
       label (one icon: 32-44px), instead of painting "ACCI…". */
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip-path: inset(50%); white-space: nowrap; border: 0; }
    /* Las acciones de fila son icon-only y de tamaño small en escritorio. En tablet/móvil se
     * amplía el host completo (no solo el icono) para que el área táctil alcance 44×44 px. */
    @media (pointer: coarse), (max-width: 834px) {
      .actions ion-button { min-width: 44px; min-height: 44px; margin: 0; }
      .toolbtn { width: 44px; height: 44px; }
      .add-btn { min-height: 44px; }
      .pager .nav ion-button { min-width: 44px; min-height: 44px; margin: 0; }
      .load-error ion-button { min-height: 44px; --padding-start: 1rem; --padding-end: 1rem; }
    }
    /* Spinner de acción en curso (loading): contenido dentro del ion-button small (Ionic lo fija
     * a 28px en el :host, por eso width/height y no font-size). Cubre tabla y tarjetas: los
     * botones de fila siempre van dentro de .actions. */
    .actions ion-spinner { width: 18px; height: 18px; }

    /* ── Pie: contador + paginación ──────────────────────────────────────────────────────── */
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 1rem; border-top: 1px solid var(--border-color); background: var(--header-background); font-size: 12.5px; color: var(--color-muted); }
    .pager .left { display: flex; align-items: center; gap: 0.6rem; }
    .pager .strong { font-weight: 600; color: var(--color); }
    .psize { font: inherit; font-size: 12.5px; padding: 0.2rem 0.35rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .pager .nav { display: flex; align-items: center; gap: 0.2rem; }
    /* #78 — Pie en MÓVIL: un solo control «Cargar más» en lugar del pager numerado (Shopify
       IndexTable, Fresha, Square y Material hacen lo mismo: nadie pinta botones de página en un
       teléfono). Sin atributo fill: el sólido por defecto de Ionic es el único que pinta caja en
       modo ios (outfitkit#82 / ADR-0143). Los 44px son el área táctil mínima. */
    .pager .load-more { min-height: 44px; margin: 0; --padding-start: 1rem; --padding-end: 1rem; font-size: 13px; }
    .pager .nav .pp { font-weight: 600; color: var(--color); padding: 0 0.25rem; }
    /* Pager numerado: botón por página + «…» en los saltos (look del Hub). */
    /* #92 — min-width/height at 44px so a numbered page button matches the prev/next ion-button's
       own 44px tap target (line above): before this they were visibly smaller than their neighbors. */
    .pnum { min-width: var(--ok-tap-min, 44px); height: var(--ok-tap-min, 44px); padding: 0 0.4rem; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--color); cursor: pointer; transition: background 0.12s, border-color 0.12s; }
    .pnum:hover { background: var(--row-hover); }
    .pnum.on { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .pgap { padding: 0 0.15rem; color: var(--color-muted); }
    ion-button { --box-shadow: none; }
  `;
  }
  static {
    this.MOBILE_BREAKPOINT = 640;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this.onKeydown);
    if (this.hasUpdated) this.observeSiblings();
    if (typeof window !== "undefined") {
      window.addEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.addEventListener("resize", this.onWindowResize);
    }
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.mq = window.matchMedia(`(max-width: ${_OkDataTable2.MOBILE_BREAKPOINT}px)`);
      this.isMobile = this.mq.matches;
      const handler = (e5) => {
        const matches = "matches" in e5 ? e5.matches : this.mq?.matches ?? false;
        if (this.isMobile === matches) return;
        this.isMobile = matches;
        if (matches && this.cardViewEnabled) this.viewMode = "cards";
        else if (!matches && this.viewMode === "cards") this.viewMode = "table";
      };
      this.mq.addEventListener("change", handler);
      this._mqHandler = handler;
    }
  }
  /** #67 — Recalcula si la vista lista desborda a lo ancho (`scrollWidth > clientWidth`).
   *
   * Se mide después de renderizar, que es cuando el navegador ya conoce los anchos, y solo se
   * escribe el estado si CAMBIA: asignarlo siempre reprogramaría un render en bucle. */
  measureXOverflow() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    const overflow = !!scroll && scroll.scrollWidth > scroll.clientWidth;
    if (this.xOverflow !== overflow) this.xOverflow = overflow;
  }
  /** #121 — Ancho natural de los botones de acción de una fila, para clavar su pista en px.
   *
   * Se lee del `scrollWidth` de `.actions`, que es el ancho de SU CONTENIDO: como los botones
   * llevan `flex: 0 0 auto` nunca se encogen, así que la medida no depende de lo ancha que sea la
   * pista en ese momento. Eso es lo que la hace estable: clavar la pista al ancho natural no
   * cambia el ancho natural, así que la siguiente medida sale igual y no hay bucle. */
  measureActionsTrack() {
    if (!this.actions.length) {
      if (this.actionsTrackPx !== 0) this.actionsTrackPx = 0;
      return;
    }
    const boxes = this.renderRoot?.querySelectorAll?.(".grow-data .gcell.actions-col .actions") ?? [];
    let width = 0;
    for (const el of boxes) width = Math.max(width, Math.ceil(el.scrollWidth));
    if (width > 0 && width !== this.actionsTrackPx) this.actionsTrackPx = width;
  }
  /** #211 - Does the header label fit the actions column, or would it be painted truncated?
   *
   * The label's `scrollWidth` is its natural width both painted and `.sr-only` (it never wraps),
   * and the cell's width is the track the buttons pinned in px: hiding or showing the label
   * changes neither, so the next measurement agrees with this one and nothing loops. Any change
   * of that track is a state change, so it re-renders and lands here through `updated`. */
  measureActionsLabel() {
    const cell = this.renderRoot?.querySelector?.(".ghead .gcell.actions-col");
    const label = cell?.querySelector("span");
    if (!cell || !label) return;
    const need = Math.ceil(label.scrollWidth);
    if (need <= 0 || cell.clientWidth <= 0) return;
    const cs = getComputedStyle(cell);
    const room = cell.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const fits = need <= room;
    if (this.actionsLabelFits !== fits) this.actionsLabelFits = fits;
  }
  /** #122 — Decide si los botones de acción de la fila caben o se pliegan en el menú «⋮».
   *  El criterio y la garantía de que no oscila viven en `decideRowActionsFit`. */
  measureRowActionsFit() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) {
      this.measureCardsFit(null);
      return;
    }
    const containerWidth = scroll.clientWidth;
    const contentWidth = scroll.scrollWidth;
    const foldedOnScreen = this.rowActionsCollapsed && this.fitDecidedAtWidth === containerWidth && !this.isUpdatePending && this.pinnedTrackIsHonest();
    const next = decideRowActionsFit({
      containerWidth,
      contentWidth,
      collapsed: this.rowActionsCollapsed,
      decidedAtWidth: this.fitDecidedAtWidth
    });
    this.fitDecidedAtWidth = next.decidedAtWidth;
    if (this.rowActionsCollapsed !== next.collapsed) this.rowActionsCollapsed = next.collapsed;
    this.measureCardsFit(foldedOnScreen && next.collapsed ? { containerWidth, contentWidth } : null);
  }
  /** #267 - Hands the list over to cards when it does not fit even folded, and back when the hole
   *  has room again. The criterion lives in `decideCardsForFit`. */
  measureCardsFit(folded) {
    if (this.panel !== "none") return;
    const allowed = this.cardViewEnabled && !this.viewChosenByUser && !this.isMobile && this.defaultView !== "cards";
    const next = decideCardsForFit({
      allowed,
      hostWidth: this.clientWidth,
      folded,
      fitCards: this.fitCards,
      fitWidth: this.fitCardsWidth
    });
    this.fitCardsWidth = next.fitWidth;
    if (next.fitCards === this.fitCards) return;
    this.fitCards = next.fitCards;
    if (next.fitCards) this.viewMode = "cards";
    else if (allowed) this.viewMode = "table";
  }
  /** #267 - Is there a column pinned over the data, and does its track hold what it shows?
   *
   * Without a pinned actions column an overflow only scrolls sideways and covers nothing: the list
   * stays a list. With one, the measurement only counts once the track has been re-measured for
   * the folded "...": `.actions` stretches to the track, so its `scrollWidth` never drops below a
   * track still pinned to the unfolded buttons, and judging those frames kept the list in cards
   * for good. The buttons themselves (`flex: 0 0 auto`) say the width they really need, margins
   * included (ios paints the icon button 28px with 2px of `margin-inline` in a 32px track). */
  pinnedTrackIsHonest() {
    const boxes = this.renderRoot?.querySelectorAll?.(".grow-data .gcell.actions-col .actions") ?? [];
    if (!boxes.length) return false;
    if (this.actionsTrackPx === 0) return true;
    const outerWidth = (el) => {
      const style = getComputedStyle(el);
      const margins = (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
      return el.getBoundingClientRect().width + margins;
    };
    let natural = 0;
    for (const box of boxes) {
      for (const child of Array.from(box.children)) natural = Math.max(natural, outerWidth(child));
    }
    return natural >= this.actionsTrackPx - 1;
  }
  /** #267 - Columns on screen with their widths, the actions and selection: the list's width. */
  fitShapeOf() {
    return JSON.stringify([
      this.visibleColumns.map((c5) => [c5.key, c5.width ?? ""]),
      this.actions.map((a3) => [a3.id, !!a3.icon]),
      this.selectable
    ]);
  }
  /** #218 — Marks the host `content-after` while an element in flow follows it in its parent (a
   *  heading and a second table, a notice). Out of flow does not count: an inline `ion-modal`
   *  (absolute until it reparents), a hidden block. Written only when it changes. */
  syncContentAfter() {
    let after = false;
    if (this.fill && typeof getComputedStyle === "function") {
      for (let el = this.nextElementSibling; el; el = el.nextElementSibling) {
        const cs = getComputedStyle(el);
        if (cs.display !== "none" && cs.position !== "absolute" && cs.position !== "fixed") {
          after = true;
          break;
        }
      }
    }
    if (this.hasAttribute("content-after") !== after) this.toggleAttribute("content-after", after);
  }
  /** #218 — (Re)starts watching the parent: children added/removed and a sibling shown or hidden
   *  (`hidden`/`style`/`class` on a direct child). Deeper mutations are ignored, and so are the
   *  table's own (the sheet insets write its `style` on every resize). */
  observeSiblings() {
    this.siblingsObserver?.disconnect();
    this.siblingsObserver = void 0;
    const parent = this.parentNode;
    if (this.fill && parent && typeof MutationObserver !== "undefined") {
      this.siblingsObserver = new MutationObserver((records) => {
        if (records.some((r6) => r6.target === parent || r6.target !== this && r6.target.parentNode === parent)) this.syncContentAfter();
      });
      this.siblingsObserver.observe(parent, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style", "class"] });
    }
    this.syncContentAfter();
  }
  /** Engancha el observador al contenedor de scroll del render actual (cambia entre vistas). */
  observeXOverflow() {
    if (typeof ResizeObserver === "undefined") return;
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    this.xObserver ??= new ResizeObserver(() => {
      this.measureXOverflow();
      this.measureActionsTrack();
      this.measureRowActionsFit();
    });
    this.xObserver.disconnect();
    this.xObserver.observe(scroll);
    const grid = scroll.querySelector(".grid");
    if (grid) this.xObserver.observe(grid);
  }
  updated(changed) {
    if (changed.has("fill")) this.observeSiblings();
    if (!this.hostObserver && typeof ResizeObserver !== "undefined") {
      this.hostObserver = new ResizeObserver(() => this.measureRowActionsFit());
      this.hostObserver.observe(this);
    }
    this.observeXOverflow();
    this.measureXOverflow();
    if (changed.has("columns") || changed.has("actions") || changed.has("columnChoice") || changed.has("selectable")) {
      this.fitDecidedAtWidth = -1;
    }
    this.measureActionsTrack();
    this.measureActionsLabel();
    this.measureRowActionsFit();
    if (changed.has("panel")) this.syncSheetInsets();
    syncSearchbarInputName(this.shadowRoot, () => this.effSearchPlaceholder);
  }
  /** #75/#197 — Where the mobile sheet starts and ends. `position: fixed; inset: 0` painted it from
   *  y=0 to the screen edge: the app's `ion-header` (its own stacking context, above the content)
   *  covered the sheet's title and its only Close button — measured at 390×844 in the Appointments
   *  parity page — and the module tab bar (an `ion-footer` OUTSIDE `ion-content`) covered the last
   *  66px (ios) / 72px (md) of the sheet, so its Save button could not be tapped (inventory#105).
   *  CSS inside a shadow root cannot know where the content area begins or ends, so on open the
   *  table measures the closest `ion-content` (walking through shadow hosts) and hands both offsets
   *  over as custom properties, re-measuring them while the sheet stays open whenever the content
   *  resizes (rotation, a tab bar mounted late) or the window resizes; on close both are removed and
   *  the content stops being observed. Without an `ion-content` around, the sheet keeps the screen
   *  edge on both ends. */
  syncSheetInsets() {
    if (this.panel === "none") {
      this.style.removeProperty("--ok-sheet-top");
      this.style.removeProperty("--ok-sheet-bottom");
      this.sheetObserver?.disconnect();
      this.sheetContent = null;
      return;
    }
    let node = this;
    let content = null;
    while (node && !content) {
      const parent = node.parentNode ?? node.getRootNode?.()?.host ?? null;
      if (parent && parent.nodeType === Node.ELEMENT_NODE && parent.tagName === "ION-CONTENT") content = parent;
      node = parent === node ? null : parent;
    }
    const top = content ? Math.max(0, Math.round(content.getBoundingClientRect().top)) : 0;
    const bottom = content ? Math.max(0, Math.round(window.innerHeight - content.getBoundingClientRect().bottom)) : 0;
    this.style.setProperty("--ok-sheet-top", `${top}px`);
    this.style.setProperty("--ok-sheet-bottom", `${bottom}px`);
    if (typeof ResizeObserver !== "undefined") {
      this.sheetObserver ??= new ResizeObserver(() => {
        if (this.panel !== "none") this.syncSheetInsets();
      });
      if (content !== this.sheetContent) {
        this.sheetObserver.disconnect();
        if (content) this.sheetObserver.observe(content);
        this.sheetContent = content;
      }
    }
  }
  disconnectedCallback() {
    this.removeEventListener("keydown", this.onKeydown);
    if (typeof window !== "undefined") {
      window.removeEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.removeEventListener("resize", this.onWindowResize);
    }
    this.xObserver?.disconnect();
    this.xObserver = void 0;
    this.hostObserver?.disconnect();
    this.hostObserver = void 0;
    this.siblingsObserver?.disconnect();
    this.siblingsObserver = void 0;
    this.sheetObserver?.disconnect();
    this.sheetObserver = void 0;
    this.sheetContent = null;
    if (this.mq) {
      const handler = this._mqHandler;
      if (handler) this.mq.removeEventListener("change", handler);
      this.mq = void 0;
    }
    super.disconnectedCallback();
  }
  // ── i18n: idioma del documento ← overrides explícitos de `.labels` ─────────────────────────
  get t() {
    const lang = typeof document === "undefined" ? "en" : document.documentElement.lang.toLowerCase();
    return { ...lang.startsWith("es") ? ES_LABELS : DEFAULT_LABELS2, ...this.labels };
  }
  /** Placeholder efectivo del buscador (prop explícita → label i18n → default inglés). */
  get effSearchPlaceholder() {
    return this.searchPlaceholder ?? this.t.search;
  }
  /** Mensaje efectivo de estado vacío (prop explícita → label i18n → default inglés). */
  get effEmptyMessage() {
    return this.emptyMessage ?? this.t.empty;
  }
  /** pm#530 — The last load failed: rows, «empty» and counts would all be claims about data the
   *  table does not have. */
  get loadFailed() {
    return !!this.error?.trim() && !this.awaitingRows;
  }
  /** #268 — A load is in flight and there is nothing current to show: no rows yet, or only the
   *  failure being retried. Neither «empty» nor a count would be true yet. */
  get awaitingRows() {
    return this.loading && (this.rows.length === 0 || !!this.error?.trim());
  }
  /** #171 — Effective "no matches" message (explicit prop → i18n label → English default). */
  get effNoMatchesMessage() {
    return this.noMatchesMessage ?? this.t.noMatches;
  }
  // ── Resolución de alias (compat + documentados) ──────────────────────────────────────────
  get effPageSizes() {
    return this.pageSizes ?? this.pageSizeOptions;
  }
  get effColumnPicker() {
    return this.columnPicker || this.columnSelector;
  }
  get effExport() {
    return this.csv || this.exportable;
  }
  get effImport() {
    return this.csv || this.importable;
  }
  /** ¿Está habilitado el conmutador de vista lista/tarjetas? */
  get viewToggle() {
    if (Array.isArray(this.views)) return this.views.length > 1;
    return this.views === true;
  }
  /** ¿Está disponible la vista tarjetas? (presente en `views` o `views === true`). */
  get cardViewEnabled() {
    if (Array.isArray(this.views)) return this.views.some((v3) => v3 === "cards" || v3 === "card");
    return this.views === true;
  }
  /** Columns painted now: the person's pick in the column chooser, else the column's own `hidden`.
   *  A hidden column is only not painted — it still filters, sorts and keeps its filter control
   *  (hub#2245), which read `columns`. */
  get visibleColumns() {
    return this.columns.filter((c5) => this.columnChoice.get(c5.key) ?? c5.hidden !== true);
  }
  setVisibleColumns(keys) {
    const visible = new Set(keys);
    this.columnChoice = new Map(this.columns.map((c5) => [c5.key, visible.has(c5.key)]));
    this.emit("columnsChange", { visible: keys });
  }
  // ── Selección ─────────────────────────────────────────────────────────────────────────────
  keyOf(row) {
    if (typeof this.rowKey === "function") return String(this.rowKey(row) ?? "");
    if (typeof this.rowKey === "string") return String(row[this.rowKey] ?? "");
    return String(row[this.rowKeyField] ?? "");
  }
  /** #143 — `<prefix>-<suffix>`, or `nothing` (= the attribute is not painted) when the host gave
   *  no prefix. A blank prefix counts as absent: `" "` would leave dangling `-add` hooks, identical
   *  on every table of the screen, which is exactly what the prefix prevents. */
  tid(suffix) {
    const prefix = this.testid?.trim();
    return prefix ? `${prefix}-${suffix}` : A;
  }
  get selection() {
    return this.selectedKeys ?? this.internalSelection;
  }
  setSelection(next) {
    if (!this.selectedKeys) this.internalSelection = next;
    this.emit("selectionChange", { keys: [...next] });
    this.requestUpdate();
  }
  toggleRow(key) {
    const next = new Set(this.selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.setSelection(next);
  }
  toggleAll(visible) {
    const keys = visible.map((r6) => this.keyOf(r6));
    const allOn = keys.length > 0 && keys.every((k2) => this.selection.has(k2));
    const next = new Set(this.selection);
    if (allOn) keys.forEach((k2) => next.delete(k2));
    else keys.forEach((k2) => next.add(k2));
    this.setSelection(next);
  }
  // ── CSV ─────────────────────────────────────────────────────────────────────────────────────
  csvEscape(v3) {
    const s5 = v3 === null || v3 === void 0 ? "" : String(v3);
    return /[",\n\r]/.test(s5) ? `"${s5.replace(/"/g, '""')}"` : s5;
  }
  /** Exporta las filas a CSV (cabeceras = column.key). Si no hay filas, exporta solo la estructura. */
  exportCsv() {
    const cols = this.columns;
    const head = cols.map((c5) => this.csvEscape(c5.key)).join(",");
    const lines = this.rows.map((r6) => cols.map((c5) => this.csvEscape(r6[c5.key])).join(","));
    const csv = [head, ...lines].join("\r\n");
    const blob = new Blob([CSV_BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a3 = document.createElement("a");
    a3.href = url;
    a3.download = this.csvName;
    a3.click();
    URL.revokeObjectURL(url);
    const count = this.rows.length;
    this.emit("csvExport", { rows: count, count });
    this.emit("export", { rows: count, count });
  }
  parseCsv(text) {
    const out = [];
    let row = [];
    let field = "";
    let q = false;
    for (let i7 = 0; i7 < text.length; i7++) {
      const c5 = text[i7];
      if (q) {
        if (c5 === '"') {
          if (text[i7 + 1] === '"') {
            field += '"';
            i7++;
          } else q = false;
        } else field += c5;
      } else if (c5 === '"') q = true;
      else if (c5 === ",") {
        row.push(field);
        field = "";
      } else if (c5 === "\n" || c5 === "\r") {
        if (c5 === "\r" && text[i7 + 1] === "\n") i7++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") out.push(row);
        row = [];
      } else field += c5;
    }
    if (field !== "" || row.length) {
      row.push(field);
      out.push(row);
    }
    const headers = out.shift() ?? [];
    const rows = out.map((r6) => Object.fromEntries(headers.map((h4, i7) => [h4, r6[i7] ?? ""])));
    return { headers, rows };
  }
  async onImportFile(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    if (!file) return;
    const text = decodeCsvBuffer(await file.arrayBuffer());
    const { headers, rows } = this.parseCsv(text);
    this.emit("csvImport", { headers, rows, count: rows.length });
    this.emit("import", { headers, rows, count: rows.length });
    input.value = "";
  }
  toggle(p4) {
    this.panelTitle = "";
    if (p4 === "filters" && this.panel !== "filters") {
      this.filterDraft = this.cloneFilters(this.clientFilters);
    }
    if (this.panel === p4) this.closePanel("toggle");
    else this.panel = p4;
  }
  /** Closes the side panel and, if one was actually open, emits `panelClose` with the panel that
   *  was open and the reason it closed. No-op (no event) when the panel is already `'none'`.
   *
   *  outfitkit#195 — modules that load the edit form after an `await` (read the full row, then
   *  fill the form) listen to `panelClose` to discard that pending load if the person closes the
   *  panel meanwhile (X, backdrop, Escape) before the reply arrives. */
  closePanel(reason) {
    if (this.panel === "none") return;
    const panel = this.panel;
    this.panel = "none";
    this.emit("panelClose", { panel, reason });
  }
  // ── Filtros en memoria (modo cliente): borrador → aplicar. ───────────────────────────────────
  cloneFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      out[k2] = { values: f3.values ? new Set(f3.values) : void 0, from: f3.from, to: f3.to };
    }
    return out;
  }
  // Fija el conjunto de valores seleccionados de una columna (multi-select del drawer = ion-select).
  setFilterValues(key, values) {
    const next = this.cloneFilters(this.filterDraft);
    const clean = (values ?? []).filter((v3) => v3 != null && v3 !== "");
    if (clean.length) next[key] = { ...next[key], values: new Set(clean) };
    else next[key] = { ...next[key], values: void 0 };
    this.filterDraft = next;
  }
  setFilterRange(key, edge, value) {
    const next = this.cloneFilters(this.filterDraft);
    next[key] = { ...next[key], [edge]: value };
    this.filterDraft = next;
  }
  applyFilters() {
    const clean = {};
    for (const [k2, f3] of Object.entries(this.filterDraft)) {
      if (f3.values && f3.values.size > 0 || f3.from || f3.to) clean[k2] = f3;
    }
    this.clientFilters = clean;
    this.clientPage = 0;
    this.mobileShown = 0;
    this.closePanel("apply");
    this.emit("filterChange", { filters: this.serializeFilters(clean) });
  }
  clearFilters() {
    this.filterDraft = {};
  }
  /** #171 — "Show all" under the no-matches state: drops the search AND the column filters, so
   *  every row is back in one tap. Consumers listening to `filterChange` hear the reset. */
  resetSearchAndFilters() {
    const hadFilters = Object.keys(this.clientFilters).length > 0;
    this.q = "";
    this.clientFilters = {};
    this.filterDraft = {};
    this.clientPage = 0;
    this.mobileShown = 0;
    if (hadFilters) this.emit("filterChange", { filters: {} });
  }
  serializeFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      if (f3.values && f3.values.size > 0) out[k2] = [...f3.values];
      else if (f3.from || f3.to) out[k2] = { from: f3.from ?? "", to: f3.to ?? "" };
    }
    return out;
  }
  /** Opens the side panel (public API for the module, e.g. "edit" opens the pre-filled form).
   *  `mode` sets the default header («New» / «Edit»); `opts.title` replaces it (e.g. «Editing service — Brushing»). */
  open(panel = "create", opts = {}) {
    this.panelTitle = panel === "filters" ? "" : (opts.title ?? "").trim();
    this.panel = panel;
  }
  /** Closes the side panel (public API for the module). Emits `panelClose` with reason `'api'`
   *  when a panel was actually open (outfitkit#195); no-op when it was already closed. */
  close() {
    this.closePanel("api");
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
  get hasSearch() {
    return this.searchable || this.searchKeys.length > 0;
  }
  /** Columnas filtrables (con control en el panel de filtros). En cliente y en servidor. */
  get filterColumns() {
    return this.columns.filter((c5) => c5.filterable);
  }
  /** ¿Hay que mostrar el botón de Filtros? (cualquier columna filtrable). */
  get hasFilterRow() {
    return this.filterColumns.length > 0;
  }
  /** Nº de filtros activos → badge del botón Filtros. En servidor cuenta `filterValues` (#106): sin
   *  esto el embudo no daba NINGUNA señal de que la lista venía acotada. */
  get activeFilterCount() {
    if (this.serverSide) {
      return Object.keys(this.serverFilters).filter((k2) => this.serverFilterState(k2) !== void 0).length;
    }
    return Object.values(this.clientFilters).filter(
      (f3) => f3.values && f3.values.size > 0 || f3.from || f3.to
    ).length;
  }
  // ── Estado de filtro VISIBLE (#106) ──────────────────────────────────────────────────────────
  /** Traduce un valor de `filterValues` (la forma que emite `filterChange`) a la forma interna que
   *  usan los `render*Filter`. `undefined` = ese filtro no está puesto. */
  serverFilterState(key) {
    const raw = this.serverFilters[key];
    if (raw === void 0 || raw === null || raw === "") return void 0;
    if (Array.isArray(raw)) {
      const values = raw.filter((v3) => v3 !== null && v3 !== void 0 && v3 !== "").map((v3) => String(v3));
      return values.length ? { values: new Set(values) } : void 0;
    }
    if (typeof raw === "object") {
      const range = raw;
      const from = range.from === null || range.from === void 0 || range.from === "" ? void 0 : String(range.from);
      const to = range.to === null || range.to === void 0 || range.to === "" ? void 0 : String(range.to);
      return from !== void 0 || to !== void 0 ? { from, to } : void 0;
    }
    return { values: /* @__PURE__ */ new Set([String(raw)]) };
  }
  /** Estado de filtro efectivo de una columna: servidor → `filterValues`/espejo; cliente → memoria. */
  filterStateOf(key) {
    return this.serverSide ? this.serverFilterState(key) : this.clientFilters[key];
  }
  /** Fija (o borra) el valor visible de un filtro en el espejo de servidor. */
  setServerFilter(key, value) {
    const next = { ...this.serverFilters };
    const empty = value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0;
    if (empty) delete next[key];
    else next[key] = value;
    this.serverFilters = next;
  }
  /** Fija UN extremo de un rango en el espejo. Los dos extremos viajan en eventos SEPARADOS
   *  (`{from}` y luego `{to}`), así que aquí se MEZCLA: reemplazar borraría el otro extremo. */
  setServerRangeEdge(key, edge, value) {
    const prev = this.serverFilters[key];
    const base = prev && typeof prev === "object" && !Array.isArray(prev) ? { ...prev } : {};
    base[edge] = value;
    const alive = (v3) => v3 !== void 0 && v3 !== null && v3 !== "";
    this.setServerFilter(key, alive(base.from) || alive(base.to) ? base : void 0);
  }
  /** What a column shows, as the multi-select filter offers and matches it (`format` text if any). */
  shownValue(col, row) {
    if (col.format) return col.format(row);
    return row[col.key];
  }
  /** #256 - What a client-side sort and a date range filter compare: `sortValue`, else the field
   *  itself when it is DATA — a number, boolean, `Date`, ISO date/time or NUMERIC string («100.00»,
   *  how the hub hands over money) — so «15/01/2027» sorts after «31/12/2026» and «9,50 €» before
   *  «100,00 €» (AG Grid, MUI DataGrid, TanStack Table). Any other field (words, a status code, a
   *  stored «Sale <uuid>» the cell prints as a document number), a missing field or an object keeps
   *  sorting by the `format` text the person reads, as before #256. A null field sorts last. */
  sortKey(col, row) {
    if (col.sortValue) return col.sortValue(row);
    const value = row[col.key];
    if (!col.format || value === null) return value;
    if (typeof value === "number" || typeof value === "boolean" || value instanceof Date) return value;
    if (typeof value === "string") {
      if (NUMERIC_TEXT.test(value)) return Number(value);
      if (ISO_DATE_OR_TIME.test(value)) return value;
    }
    return col.format(row);
  }
  /** Valores distintos de una columna (para los chips del filtro multi-select). */
  distinctValues(col) {
    const set = /* @__PURE__ */ new Set();
    for (const row of this.rows) {
      const v3 = this.shownValue(col, row);
      if (v3 != null && v3 !== "") set.add(String(v3));
    }
    return [...set].sort((a3, b3) => a3.localeCompare(b3));
  }
  /** Filas tras buscar + filtrar + ordenar EN MEMORIA (solo modo cliente). */
  get clientFiltered() {
    let result = this.rows;
    const needle = this.q.trim().toLowerCase();
    if (needle && this.searchKeys.length) {
      result = result.filter(
        (r6) => this.searchKeys.some((k2) => String(r6[k2] ?? "").toLowerCase().includes(needle))
      );
    }
    const fkeys = Object.keys(this.clientFilters);
    if (fkeys.length) {
      result = result.filter(
        (row) => fkeys.every((key) => {
          const f3 = this.clientFilters[key];
          const col = this.columns.find((c5) => c5.key === key);
          if (!col) return true;
          if (f3.values && f3.values.size > 0) {
            return f3.values.has(String(this.shownValue(col, row) ?? ""));
          }
          if (f3.from || f3.to) {
            const raw = this.sortKey(col, row);
            const t5 = raw == null ? NaN : new Date(raw).getTime();
            const from = f3.from ? new Date(f3.from).getTime() : -Infinity;
            const to = f3.to ? new Date(f3.to).getTime() + 864e5 - 1 : Infinity;
            return !Number.isNaN(t5) && t5 >= from && t5 <= to;
          }
          return true;
        })
      );
    }
    if (this.clientSort) {
      const col = this.columns.find((c5) => c5.key === this.clientSort);
      if (col) {
        const dir = this.clientSortDir === "asc" ? 1 : -1;
        result = [...result].sort((a3, b3) => {
          const va = this.sortKey(col, a3);
          const vb = this.sortKey(col, b3);
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      }
    }
    return result;
  }
  /** #217 - The text cell of the list view. It keeps its one-line clip, and the full text rides
   *  along as the native `title` (hover, like MUI DataGrid, Ant Design's `ellipsis.showTitle` and
   *  ok-heatmap). Screen readers already get the whole text: the clip is only paint. */
  textCell(col, row, rowKey) {
    const text = String(this.cell(col, row) ?? "");
    const id = `${rowKey}\u241F${col.key}`;
    return b2`<span
      class=${this.unfoldedCells.has(id) ? "unfolded" : A}
      title=${text === "" ? A : text}
      @pointerdown=${this.notePointer}
      @click=${(e5) => this.onCellTap(e5, id)}
    >${text}</span>`;
  }
  /** #217 - A touch screen has no hover, so the `title` never shows there. A row that opens a
   *  record keeps opening it on the first tap (the record shows the full text; swallowing the tap
   *  would make "open" a two-tap gesture on some rows only). In a table whose rows open nothing, a
   *  tap on a clipped cell unfolds it in place. A cell that fits, and a mouse click, change nothing. */
  onCellTap(e5, id) {
    if (this.rowClickable || this.lastPointerType !== "touch") return;
    const span = e5.currentTarget;
    if (span.scrollWidth <= span.clientWidth) return;
    this.unfoldedCells = new Set(this.unfoldedCells).add(id);
  }
  cell(col, row) {
    if (col.format) return col.format(row);
    const v3 = row[col.key];
    return v3 === null || v3 === void 0 ? "" : String(v3);
  }
  /** ¿Es ordenable la columna? Servidor: opt-in (`sortable`). Cliente: por defecto SÍ (como el Hub),
   *  salvo `sortable: false` explícito. */
  isSortable(col) {
    return this.serverSide ? !!col.sortable : col.sortable !== false;
  }
  onHeaderClick(col) {
    if (!this.isSortable(col)) return;
    if (this.serverSide) {
      const dir = this.sort === col.key && this.sortDir === "asc" ? "desc" : "asc";
      this.emit("sortChange", { sort: col.key, dir });
      return;
    }
    this.mobileShown = 0;
    if (this.clientSort === col.key) {
      this.clientSortDir = this.clientSortDir === "asc" ? "desc" : "asc";
    } else {
      this.clientSort = col.key;
      this.clientSortDir = "asc";
    }
  }
  onFilterInput(col, ev) {
    const value = ev.target.value ?? "";
    this.setServerFilter(col.key, value);
    this.emit("filterChange", { col: col.key, value });
  }
  onRangeInput(col, edge, ev) {
    const raw = ev.target.value ?? "";
    const v3 = raw === "" ? "" : Number(raw);
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  onDateRangeInput(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  // ── Filtros EN LÍNEA (toolbar) ────────────────────────────────────────────────────────────
  // En modo cliente escriben directamente `clientFilters` (filtran en memoria); en servidor solo
  // emiten `filterChange`. Reutilizan la misma forma de filtro que el drawer (values / from / to).
  setClientFilter(key, patch) {
    const next = { ...this.clientFilters };
    const merged = { ...next[key], ...patch };
    const empty = (!merged.values || merged.values.size === 0) && !merged.from && !merged.to;
    if (empty) delete next[key];
    else next[key] = merged;
    this.clientFilters = next;
    this.clientPage = 0;
    this.mobileShown = 0;
  }
  // ion-select (select/multiselect) del panel de filtros (renderFilterControl). En servidor emite
  // `filterChange`; en cliente escribe `clientFilters` (multiselect ⇒ filtra por inclusión).
  onFilterSelect(col, value, multi) {
    if (this.serverSide) {
      const next = value ?? (multi ? [] : "");
      this.setServerFilter(col.key, next);
      this.emit("filterChange", { col: col.key, value: next });
      return;
    }
    if (multi) {
      const arr = Array.isArray(value) ? value.map((v3) => String(v3)) : value != null && value !== "" ? [String(value)] : [];
      this.setClientFilter(col.key, { values: arr.length ? new Set(arr) : void 0 });
    } else {
      const v3 = String(value ?? "");
      this.setClientFilter(col.key, { values: v3 ? /* @__PURE__ */ new Set([v3]) : void 0 });
    }
  }
  onInlineRange(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    if (this.serverSide) {
      this.setServerRangeEdge(col.key, edge, v3);
      this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
      return;
    }
    this.setClientFilter(col.key, { [edge]: v3 || void 0 });
  }
  // Overflow menu: anchor the popover to the tapped button via Ionic's `ionShadowTarget`
  // (the retargeted `ev.target` after dispatch would be the whole table, since `trigger` does not
  // resolve inside Shadow DOM).
  openMenu(ev) {
    this.menuEv = shadowAnchorEvent(ev);
    this.menuOpen = true;
  }
  /** #122 — Opens the «⋮» menu of ONE row. A single popover for the whole table (one per row would
   *  be as many as there are rows), anchored to the tapped button via Ionic's `ionShadowTarget`
   *  (the retargeted `ev.target` after dispatch would be the whole table). */
  openRowMenu(ev, row) {
    ev.stopPropagation();
    this.rowMenuEv = shadowAnchorEvent(ev);
    this.rowMenuRow = row;
    this.rowMenuOpen = true;
  }
  /** #122 — Las mismas acciones de la fila, como lista. Respeta `disabled`/`loading` por fila: una
   *  acción que no se puede pulsar en su botón tampoco se puede pulsar aquí. */
  renderRowMenu() {
    const kept = this.rowMenuRow;
    if (!this.actions.length || !kept) return A;
    const key = this.keyOf(kept);
    const row = key && this.rows.find((r6) => this.keyOf(r6) === key) || kept;
    const actions = this.visibleActions(row);
    return b2`
      <ion-popover
        class="row-menu"
        .isOpen=${this.rowMenuOpen}
        .event=${this.rowMenuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.rowMenuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${actions.map((a3) => {
      const disabled = a3.loading?.(row) === true || a3.disabled?.(row) === true;
      const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
      return b2`
                <!-- #143 — The action is named the SAME collapsed or not, so one spec works at any
                     width. It carries the hook only while the direct buttons are NOT there: the
                     popover survives its dismissal («rowMenuRow» is not cleared), and if the table
                     widened again there would be TWO elements with the hook and «getByTestId»
                     would pick one at random. -->
                <ion-item
                  button
                  data-testid=${this.rowActionsFolded(actions) ? this.tid(`row-${key}-${a3.id}`) : A}
                  ?disabled=${disabled}
                  aria-disabled=${disabled ? "true" : A}
                  .detail=${false}
                  @click=${() => {
        if (disabled) return;
        this.rowMenuOpen = false;
        this.emit("rowAction", { actionId: a3.id, row });
      }}
                >
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} style=${ionTone2(a3.color, "text") ?? A}></ion-icon>` : A}
                  <ion-label style=${ionTone2(a3.color, "text") ?? A}>${label}</ion-label>
                </ion-item>
              `;
    })}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Aplica la vista inicial declarada (`default-view`) una sola vez, tras el primer render. Es la
  // forma robusta de arrancar en tarjetas sin depender de fijar `viewMode` por referencia (que
  // falla si la tabla monta detrás de un `v-if`/loading y el ref aún es null).
  firstUpdated() {
    this.applyInitialView();
  }
  /** Re-evalúa la vista inicial cada render mientras el usuario no haya elegido a mano.
   *
   * `firstUpdated` NO basta: decide una sola vez, y los consumidores que asignan las props por JS
   * DESPUÉS de insertar el elemento —lo normal en páginas renderizadas por el servidor— llegan
   * tarde. En ese momento `cardViewEnabled` aún era `false`, así que no se conmutaba; y el
   * listener de `matchMedia` solo dispara al CAMBIAR el viewport, cosa que en un móvil no pasa
   * nunca. La tabla se quedaba con scroll lateral para siempre.
   *
   * Medido en Android contra producción el 2026-08-02 con el bundle ya actualizado:
   *   `views` antes de insertar  → tarjetas
   *   `views` después de insertar → tabla   ← lo que hace la página
   */
  willUpdate(changed) {
    if (changed.has("columns") || changed.has("actions") || changed.has("columnChoice") || changed.has("selectable")) {
      const shape = this.fitShapeOf();
      if (shape !== this.fitShape) {
        this.fitShape = shape;
        if (this.fitCards) {
          this.fitCards = false;
          this.fitCardsWidth = 0;
          if (!this.viewChosenByUser) this.viewMode = "table";
        }
      }
    }
    this.applyInitialView();
    if (changed.has("rows") && this.unfoldedCells.size) this.unfoldedCells = /* @__PURE__ */ new Set();
    if (changed.has("rows") || changed.has("actions")) {
      this.gapLabels.clear();
      this.slotActionsCache = null;
    }
    if (changed.has("filterValues")) this.serverFilters = { ...this.filterValues ?? {} };
    if (changed.has("search") && this.search !== void 0) {
      this.q = this.search;
      if (!this.serverSide) {
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    }
    if (!this.serverSide && changed.has("rows") && this.mobileShown !== 0 && !this.sameRecords(changed.get("rows"), this.rows))
      this.mobileShown = 0;
  }
  /** hub#2245 — Same records, same order, told apart by their key. Rows without a key cannot be
   *  told apart, so they never count as the same (the window starts again, as before). */
  sameRecords(before, after) {
    if (!before || before.length !== after.length) return false;
    return after.every((row, i7) => {
      const key = this.keyOf(row);
      return key !== "" && key === this.keyOf(before[i7]);
    });
  }
  applyInitialView() {
    if (this.viewChosenByUser) return;
    if (this.isMobile && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "cards" && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.fitCards && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "table") {
      this.viewMode = "table";
    }
  }
  setViewMode(mode) {
    this.viewChosenByUser = true;
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.emit("viewChange", mode);
  }
  // Control de filtro de una columna, con componentes Ionic (mismos inputs que el form de alta).
  renderFilterControl(col) {
    if (!col.filterable) return A;
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          label=${col.header}
          label-placement="stacked"
          fill="outline" mode="md"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${current}
          @ionChange=${(e5) => this.onFilterSelect(col, e5.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${this.t.select}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    if (type === "range" || type === "daterange") {
      const t5 = type === "daterange" ? "date" : "number";
      const onEdge = type === "daterange" ? this.onDateRangeInput.bind(this) : this.onRangeInput.bind(this);
      return b2`
        <div class="fblock">
          <span class="flabel">${col.header}</span>
          <div class="frange">
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.from : this.t.gte}
              .value=${f3?.from ?? ""}
              @ionInput=${(e5) => onEdge(col, "from", e5)}></ion-input>
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.to : this.t.lte}
              .value=${f3?.to ?? ""}
              @ionInput=${(e5) => onEdge(col, "to", e5)}></ion-input>
          </div>
        </div>
      `;
    }
    const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
    return b2`
      <ion-input
        type=${inputType}
        fill="outline" mode="md"
        label=${col.header}
        label-placement="stacked"
        placeholder=${this.t.filterPlaceholder}
        .value=${this.selectValue(f3, false)}
        @ionInput=${(e5) => this.onFilterInput(col, e5)}
      ></ion-input>
    `;
  }
  /** Valor para un control de un solo valor (`ion-select`/`ion-input`) o multi (`ion-select
   *  multiple`) a partir del estado de filtro interno. '' / [] = sin filtro. */
  selectValue(f3, multi) {
    const values = [...f3?.values ?? /* @__PURE__ */ new Set()];
    if (multi) return values;
    return values.length ? values[0] : "";
  }
  // Controles de filtro COMPACTOS para la toolbar (modo `inlineFilters`). Solo select y rango de
  // fechas (los del screenshot); el resto de tipos siguen disponibles vía el drawer si no se activa
  // `inlineFilters`. Look: «Todos los Estados» (placeholder) / «01/10/25 → 18/10/25».
  renderInlineFilters() {
    const cols = this.filterColumns.filter((c5) => {
      const t5 = c5.filterType ?? "text";
      return t5 === "select" || t5 === "multiselect" || t5 === "date" || t5 === "daterange";
    });
    if (!cols.length) return A;
    return b2`${cols.map((c5) => this.renderInlineFilter(c5))}`;
  }
  renderInlineFilter(col) {
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          class="tk-filter"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          aria-label=${col.header}
          placeholder=${col.header}
          .value=${current}
          @ionChange=${(e5) => this.onFilterSelect(col, e5.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${col.header}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    return b2`
      <span class="tk-daterange" role="group" aria-label=${col.header}>
        <ion-icon .icon=${iconCalendarOutline}></ion-icon>
        <ion-input type="date" aria-label=${this.t.fromOf.replace("{label}", col.header)} .value=${f3?.from ?? ""} @ionChange=${(e5) => this.onInlineRange(col, "from", e5)}></ion-input>
        <span class="arr">→</span>
        <ion-input type="date" aria-label=${this.t.toOf.replace("{label}", col.header)} .value=${f3?.to ?? ""} @ionChange=${(e5) => this.onInlineRange(col, "to", e5)}></ion-input>
      </span>
    `;
  }
  // Menú overflow («⋮») con ion-popover anclado por evento (Shadow-DOM-safe).
  renderOverflowMenu() {
    if (!this.menuActions.length) return A;
    return b2`
      <ion-button class="toolbtn" fill="clear" aria-label=${this.t.moreActions} @click=${(e5) => this.openMenu(e5)}>
        <ion-icon slot="icon-only" .icon=${iconEllipsisVertical}></ion-icon>
      </ion-button>
      <ion-popover
        .isOpen=${this.menuOpen}
        .event=${this.menuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.menuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.menuActions.map(
      (a3) => b2`
                <ion-item button .detail=${false} @click=${() => {
        this.menuOpen = false;
        this.emit("menuAction", { actionId: a3.id });
      }}>
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} style=${ionTone2(a3.color, "text") ?? A}></ion-icon>` : A}
                  <ion-label style=${ionTone2(a3.color, "text") ?? A}>${a3.label}</ion-label>
                </ion-item>
              `
    )}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Row action buttons, shared by the table and the card views.
  //
  // `collapsible` = the LIST view, the only one that folds its buttons into a "⋮" menu when the
  // columns leave it no width (#122). The CARD view does not fold; it WRAPS instead, see
  // `.ractions .actions` in the stylesheet.
  //
  // This comment used to claim that a card's actions "always fit across the card". They do not,
  // and nobody had measured it (#132 / ERPlora/appointments#154): with the eight actions an
  // appointment carries, the row asks for 380px and the card gives 379px at 411dp, 237px at 768px
  // and 272px at 1440px — so the first button hung off the card at ALL THREE widths, not just on
  // a phone. If you add a view that lays these buttons out, MEASURE it.
  /** hub#2014 — The row actions that exist for THIS row (`hidden` filtered out), in their order. */
  visibleActions(row) {
    return this.actions.filter((a3) => a3.hidden?.(row) !== true);
  }
  /** #213 — Are THESE row actions folded into the "..." menu? Only when the list view folds (#122)
   *  AND there is more than one: an overflow menu groups several actions, it never replaces a
   *  single one (Polaris, MUI DataGrid) — it would take the same width and cost one more tap.
   *  Except a single TEXT-only action (no icon): its button is wider than the "..." one, and left
   *  out it spills over the data columns (measured at 390px), so folding it does free width. */
  rowActionsFolded(actions) {
    return this.rowActionsCollapsed && (actions.length > 1 || actions.length === 1 && !actions[0].icon);
  }
  gapLabel(a3) {
    if (typeof a3.label !== "function") return a3.label;
    let text = this.gapLabels.get(a3);
    if (text === void 0) {
      const shown = this.rows.find((r6) => a3.hidden?.(r6) !== true);
      text = shown ? a3.label(shown) : "";
      this.gapLabels.set(a3, text);
    }
    return text;
  }
  slotActions() {
    return this.slotActionsCache ??= this.actions.filter((a3) => this.rows.some((r6) => a3.hidden?.(r6) !== true));
  }
  actionButtons(row, collapsible = false) {
    if (!this.actions.length) return A;
    const key = this.keyOf(row);
    const actions = this.visibleActions(row);
    if (collapsible && this.rowActionsCollapsed) {
      if (!actions.length) return b2`<div class="actions"></div>`;
      if (this.rowActionsFolded(actions)) return b2`
        <div class="actions">
          <ion-button
            size="small"
            fill="clear"
            style=${ionTone2("medium", "clear")}
            data-testid=${this.tid(`row-${key}-menu`)}
            aria-label=${this.t.moreActions}
            title=${this.t.moreActions}
            aria-haspopup="menu"
            @click=${(e5) => this.openRowMenu(e5, row)}
          >
            <ion-icon slot="icon-only" .icon=${okIcon(iconEllipsisVertical)}></ion-icon>
          </ion-button>
        </div>
      `;
    }
    const slots = collapsible && !this.rowActionsCollapsed ? this.slotActions() : actions;
    return b2`
      <div class="actions">
        ${slots.map(
      (a3) => {
        if (a3.hidden?.(row) === true) {
          return b2`
              <ion-button class="action-gap" size="small" fill="clear" data-slot-for=${a3.id} aria-hidden="true" inert>
                ${a3.icon ? b2`<ion-icon slot="icon-only" .icon=${okIcon(a3.icon)}></ion-icon>` : this.gapLabel(a3)}
              </ion-button>
            `;
        }
        const loading = a3.loading?.(row) === true;
        const disabled = loading || a3.disabled?.(row) === true;
        const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
        return b2`
            <ion-button
              size="small"
              fill="clear"
              style=${ionTone2(a3.color ?? "medium", "clear") ?? A}
              data-testid=${this.tid(`row-${key}-${a3.id}`)}
              ?disabled=${disabled}
              aria-disabled=${disabled ? "true" : A}
              aria-label=${label}
              title=${label}
              @click=${() => this.emit("rowAction", { actionId: a3.id, row })}
            >
              ${loading ? b2`<ion-spinner slot="icon-only" name="dots"></ion-spinner>` : a3.icon ? b2`<ion-icon slot="icon-only" .icon=${okIcon(a3.icon)}></ion-icon>` : label}
            </ion-button>
          `;
      }
    )}
      </div>
    `;
  }
  // Icon-only bar button (filters / create / view switch). `on` = active look.
  // Optional `badge` → counter (e.g. number of active filters), Hub look.
  // #247 - `toggle` makes it a toggle button: `on` is also announced as `aria-pressed`, so a screen
  // reader hears which view is on instead of it living only in the fill. Ionic 8 copies
  // `aria-pressed` to its inner <button> and watches it, so every later switch reaches the AX tree.
  toolButton(icon, on, onClick, label, badge, testid = A, toggle = false) {
    return b2`
      <ion-button class="toolbtn" size="small" fill=${on ? "solid" : "outline"} data-testid=${testid} title=${label} aria-label=${label} aria-pressed=${toggle ? String(on) : A} @click=${onClick}>
        <ion-icon slot="icon-only" .icon=${okIcon(icon)}></ion-icon>
        ${badge && badge > 0 ? b2`<span class="badge">${badge}</span>` : A}
      </ion-button>
    `;
  }
  /** Plantilla de columnas del grid de la vista lista: [checkbox] [columnas…] [acciones]. */
  gridTemplate() {
    return [
      this.selectable ? "2.75rem" : null,
      // #120 - 5.5rem (88px) is the narrowest a data column can be and stay readable: ~11
      // characters at 14px, plus the ellipsis `.gcell > span` already applies. With the previous
      // floor (8rem = 128px) the six columns of a bookings list did not fit the counter tablet
      // (128x6 + 188 for actions + gaps = 1036px against 834) and the pinned column ended up on
      // top of the data. With 5.5rem they fit (796px) and `1fr` stretches them to 94px each.
      ...this.visibleColumns.map((c5) => c5.width ?? "minmax(5.5rem,1fr)"),
      // #121 - a LENGTH, not `max-content`. The header and every row are separate grids that
      // share this string, and a content-sized track is not a length: each grid resolves it
      // against ITS OWN content - the word "ACCIONES" (62.83px) in the header, four buttons
      // (188px) in the row. The leftover the `1fr` columns share then differed between the two,
      // and the header slid right, up to 125px by the last column (measured at 834px).
      // `actionsTrackPx` is the width of the buttons MEASURED on screen, so it also keeps #120's
      // contract: the track never shrinks under its content (an `auto` track collapsed to 16px
      // and the buttons spilled over the neighbouring column). Until the first measurement lands
      // - one frame - `max-content` reserves the same room it always did.
      this.actions.length ? this.actionsTrackPx > 0 ? `${this.actionsTrackPx}px` : "max-content" : null
    ].filter(Boolean).join(" ");
  }
  /** Lista de páginas a mostrar en el pager numerado (1-based): primera, última, vecinas de la
   *  actual y «…» donde haya saltos. P.ej. en página 1 de 52 → [1,2,3,'…',52]. */
  pageList(cur1, total) {
    if (total <= 7) return Array.from({ length: total }, (_2, i7) => i7 + 1);
    const want = /* @__PURE__ */ new Set([1, total, cur1, cur1 - 1, cur1 + 1]);
    if (cur1 <= 3) [2, 3].forEach((p4) => want.add(p4));
    if (cur1 >= total - 2) [total - 1, total - 2].forEach((p4) => want.add(p4));
    const sorted = [...want].filter((p4) => p4 >= 1 && p4 <= total).sort((a3, b3) => a3 - b3);
    const out = [];
    let prev = 0;
    for (const p4 of sorted) {
      if (p4 - prev > 1) out.push("\u2026");
      out.push(p4);
      prev = p4;
    }
    return out;
  }
  render() {
    const ps = this.serverSide ? this.pageSize : this.clientPageSize || this.pageSize;
    let visible;
    let pages;
    let current;
    let count;
    if (this.serverSide) {
      visible = this.rows;
      count = this.total;
      pages = Math.max(1, Math.ceil(this.total / ps));
      current = Math.min(this.page, pages - 1);
    } else {
      const filtered = this.clientFiltered;
      count = filtered.length;
      pages = Math.max(1, Math.ceil(filtered.length / ps));
      current = Math.min(this.clientPage, pages - 1);
      visible = this.isMobile ? filtered.slice(0, Math.min(this.mobileShown || ps, count)) : filtered.slice(current * ps, current * ps + ps);
    }
    const served = this.serverSide ? (current + 1) * ps : Math.min(this.mobileShown || ps, count);
    const canLoadMore = this.isMobile && served < count;
    const rangeTo = this.isMobile && !this.serverSide ? Math.min(served, count) : Math.min((current + 1) * ps, count);
    const rangeFrom = !this.isMobile ? current * ps + 1 : this.serverSide ? this.rows.length ? Math.max(1, rangeTo - this.rows.length + 1) : current * ps + 1 : 1;
    const loadMore = () => {
      if (this.serverSide) this.emit("pageChange", current + 1);
      else this.mobileShown = Math.min((this.mobileShown || ps) + ps, count);
    };
    const goTo = (p4) => {
      if (this.serverSide) this.emit("pageChange", p4);
      else this.clientPage = p4;
    };
    const setPageSize = (n6) => {
      if (this.serverSide) this.emit("pageSizeChange", n6);
      else {
        this.clientPageSize = n6;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
    const searchbar = b2`<ion-searchbar class="ion-no-border" data-testid=${this.tid("search")} .value=${this.q} placeholder=${this.effSearchPlaceholder} debounce="250" @ionInput=${this.onSearch}></ion-searchbar>`;
    const selCount = this.selection.size;
    const showTopbar = !!this.title || this.hasSearch || this.viewToggle || this.effColumnPicker || this.effExport || this.effImport || this.hasFilterRow || this.addable || !!this.primaryAction;
    return b2`
      <div class=${`card${this.panel !== "none" ? " has-panel" : ""}`} aria-busy=${this.loading ? "true" : A}>
        ${showTopbar ? b2`
              <div class="bar">
                <div class="bar-main">
                  ${this.title ? b2`<div class="title-wrap"><h2 class="title">${this.title}</h2>${this.loadFailed || this.awaitingRows ? A : b2`<span class="title-count">${count}</span>`}</div>` : A}
                  ${this.hasSearch ? b2`<div class="search">${searchbar}</div>` : A}
                  ${this.inlineFilters ? this.renderInlineFilters() : A}
                  <span class="tk-spacer"></span>
                    ${this.effColumnPicker && !this.isMobile ? b2`
                          <ion-select
                            class="tk-cols"
                            multiple
                            interface="popover"
                            aria-label=${this.t.columnsVisible}
                            .value=${this.visibleColumns.map((c5) => c5.key)}
                            .selectedText=${this.t.columns}
                            @ionChange=${(e5) => this.setVisibleColumns(e5.detail.value)}
                          >
                            ${this.columns.map((c5) => b2`<ion-select-option value=${c5.key}>${c5.header}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.effPageSizes.length && !this.isMobile ? b2`
                          <ion-select
                            class="tk-psize"
                            interface="popover"
                            aria-label=${this.t.rowsPerPage}
                            .value=${ps}
                            @ionChange=${(e5) => setPageSize(Number(e5.detail.value))}
                          >
                            ${this.effPageSizes.map((n6) => b2`<ion-select-option .value=${n6}>${n6}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.viewToggle ? b2`
                          <span class="viewseg">
                            ${this.toolButton("list-outline", this.viewMode === "table", () => this.setViewMode("table"), this.t.viewList, void 0, A, true)}
                            ${this.toolButton("grid-outline", this.viewMode === "cards", () => this.setViewMode("cards"), this.t.viewCards, void 0, A, true)}
                          </span>
                        ` : A}
                    ${this.hasFilterRow && !this.inlineFilters ? this.toolButton("funnel-outline", this.panel === "filters" || this.activeFilterCount > 0, () => this.toggle("filters"), this.t.filters, this.activeFilterCount) : A}
                    ${this.effImport ? b2`
                          ${this.toolButton("cloud-upload-outline", false, () => this.renderRoot.querySelector(".tk-file")?.click(), this.t.importCsv)}
                          <!-- #143 — The import hook goes on the INPUT, not on the button that
                               triggers it: what a spec drives is «setInputFiles», and nobody opens
                               the button's native dialog from a test. Same criterion as
                               «GrantFilePicker.vue» in the Hub (the hook goes on the control, not
                               on its disguise). -->
                          <input class="tk-file" data-testid=${this.tid("csv-import")} type="file" accept=".csv,text/csv" hidden @change=${(e5) => this.onImportFile(e5)} />
                        ` : A}
                    ${this.effExport ? this.toolButton("download-outline", false, () => this.exportCsv(), this.t.exportCsv, void 0, this.tid("csv-export")) : A}
                    <!-- #113 — Mismo botón en los dos viewports: la acción principal de la pantalla
                         se lee, no se adivina. En escritorio era un «+» de 36px idéntico a los
                         iconos de vista/filtrar/exportar, y era el último de cuatro. -->
                    ${this.addable ? b2`
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("add")} size="small" @click=${() => this.toggle("create")}>
                            <ion-icon slot="start" .icon=${okIcon("add")}></ion-icon>${this.t.add}
                          </ion-button>
                        ` : A}
                    ${this.renderOverflowMenu()}
                    ${this.primaryAction ? b2`
                          <!-- #143 — Its own hook and NOT «-add»: «addable» and «primaryAction» are
                               two different buttons that may coexist, and both are really used
                               («addable» in the modules, «primaryAction» in the SaaS screens).
                               Sharing the name would give two elements with the same hook as soon
                               as a screen declared both. -->
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("primary-action")} size="small" @click=${() => this.emit("primaryAction", {})}>
                            <ion-icon slot="start" .icon=${okIcon(this.primaryAction.icon ?? "add")}></ion-icon>${this.primaryAction.label}
                          </ion-button>
                        ` : A}
                    <!-- El módulo proyecta aquí acciones globales adicionales. -->
                    <slot name="toolbar"></slot>
                </div>
                ${this.selectable && selCount > 0 ? b2`
                      <div class="selbar">
                        <strong>${this.t.selected.replace("{n}", String(selCount))}</strong>
                        <button class="sel-clear" @click=${() => this.setSelection(/* @__PURE__ */ new Set())}>
                          <ion-icon .icon=${iconClose} style="font-size:14px"></ion-icon> ${this.t.clear}
                        </button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.awaitingRows ? this.loadingState() : this.loadFailed ? this.errorState() : this.viewMode === "cards" && this.cardViewEnabled ? this.renderCards(visible) : this.renderTable(visible)}

        ${!this.loadFailed && (this.awaitingRows ? (
      // #268 — Nothing to count or page through yet: the footer only stays to hold its
      // page-size selector (no toolbar), never as an empty strip.
      !showTopbar && this.effPageSizes.length
    ) : pages > 1 || this.effPageSizes.length) ? b2`
              <div class="pager">
                <div class="left">
                  <span>
                    ${pages > 1 && !this.awaitingRows ? b2`${this.t.showing.replace("{from}", String(rangeFrom)).replace("{to}", String(rangeTo))} ` : A}
                    ${this.awaitingRows ? A : b2`<span class="strong">${count}</span> ${count === 1 ? this.t.recordSingular : this.t.recordPlural}`}
                  </span>
                  ${!showTopbar && this.effPageSizes.length ? b2`
                        <select class="psize" @change=${(e5) => setPageSize(Number(e5.target.value))}>
                          ${this.effPageSizes.map((n6) => b2`<option value=${n6} ?selected=${n6 === ps}>${this.t.perPageShort.replace("{n}", String(n6))}</option>`)}
                        </select>
                      ` : A}
                </div>
                ${this.isMobile ? canLoadMore && !this.awaitingRows ? b2`<ion-button class="load-more" data-testid=${this.tid("load-more")} size="small" @click=${loadMore}>${this.t.loadMore}</ion-button>` : A : pages > 1 && !this.awaitingRows ? b2`
                      <div class="nav">
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-prev")} ?disabled=${current === 0} @click=${() => goTo(current - 1)}><ion-icon slot="icon-only" .icon=${iconChevronBack}></ion-icon></ion-button>
                        ${this.pageList(current + 1, pages).map(
      (p4) => p4 === "\u2026" ? b2`<span class="pgap">…</span>` : b2`<button class=${`pnum${p4 === current + 1 ? " on" : ""}`} @click=${() => goTo(p4 - 1)}>${p4}</button>`
    )}
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-next")} ?disabled=${current >= pages - 1} @click=${() => goTo(current + 1)}><ion-icon slot="icon-only" .icon=${iconChevronForward}></ion-icon></ion-button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.panel !== "none" ? this.renderDrawer() : A}
      </div>
    `;
  }
  // Panel lateral derecho DENTRO de la tabla (no empuja contenido; igual en lista y tarjetas).
  renderDrawer() {
    const isFilters = this.panel === "filters";
    const clientFilters = isFilters && !this.serverSide;
    const serverFilters = isFilters && this.serverSide;
    const title = isFilters ? this.t.filters : this.panelTitle || (this.panel === "edit" ? this.t.editRecord : this.t.newRecord);
    return b2`
      <div class="tk-scrim" @click=${() => this.closePanel("backdrop")}></div>
      <aside class="drawer" role="dialog" aria-label=${title}>
        <header class="dh">
          <strong>${title}</strong>
          <ion-button fill="clear" size="small" aria-label=${this.t.close} @click=${() => this.closePanel("close-button")}><ion-icon slot="icon-only" .icon=${iconClose}></ion-icon></ion-button>
        </header>
        <div class="db">
          ${isFilters ? clientFilters ? this.filterColumns.map((c5) => this.renderClientFilter(c5)) : this.filterColumns.map((c5) => b2`<div class="fblock">${this.renderFilterControl(c5)}</div>`) : b2`<slot name="create"></slot>`}
        </div>
        ${clientFilters ? b2`
              <footer class="df">
                <button class="sel-clear df-clear" ?disabled=${Object.keys(this.filterDraft).length === 0} @click=${() => this.clearFilters()}>${this.t.clear}</button>
                <ion-button class="primary-btn" size="small" @click=${() => this.applyFilters()}>${this.t.apply}</ion-button>
              </footer>
            ` : serverFilters ? b2`
                <footer class="df">
                  <ion-button class="primary-btn df-done" expand="block" data-testid=${this.tid("filters-show-results")} @click=${() => this.closePanel("apply")}>${this.t.showResults}</ion-button>
                </footer>
              ` : A}
      </aside>
    `;
  }
  // Control de filtro CLIENTE de una columna: chips multi-select (select) o rango de fechas.
  renderClientFilter(col) {
    const label = col.header;
    if (col.filterType === "daterange" || col.filterType === "date") {
      const f3 = this.filterDraft[col.key] ?? {};
      return b2`
        <div class="fblock">
          <span class="flabel">${label}</span>
          <div class="daterange">
            <ion-input type="date" label=${this.t.from} label-placement="stacked" fill="outline" mode="md" .value=${f3.from ?? ""} @ionChange=${(e5) => this.setFilterRange(col.key, "from", e5.detail.value ?? "")}></ion-input>
            <ion-input type="date" label=${this.t.to} label-placement="stacked" fill="outline" mode="md" .value=${f3.to ?? ""} @ionChange=${(e5) => this.setFilterRange(col.key, "to", e5.detail.value ?? "")}></ion-input>
          </div>
        </div>
      `;
    }
    const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
    const selected = [...this.filterDraft[col.key]?.values ?? /* @__PURE__ */ new Set()];
    return b2`
      <div class="fblock">
        <ion-select
          label=${label}
          label-placement="stacked"
          fill="outline" mode="md"
          multiple
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${selected}
          @ionChange=${(e5) => this.setFilterValues(col.key, e5.detail.value ?? [])}
        >
          ${opts.length === 0 ? b2`<ion-select-option .disabled=${true} value="">${this.t.noValues}</ion-select-option>` : opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      </div>
    `;
  }
  /** #67 — Enter/Espacio activan la fila clicable (y, desde #74, la tarjeta): si se llega con el
   *  tabulador, el ratón no puede ser el único camino. Espacio además NO debe desplazar la página. */
  onRowKeydown(e5, row) {
    if (e5.key !== "Enter" && e5.key !== " " && e5.key !== "Spacebar") return;
    e5.preventDefault();
    this.emit("rowClick", { row });
  }
  emptyState() {
    const noMatches = this.rows.length > 0;
    return b2`
      <div class="empty">
        <span class="empty-ic"><ion-icon .icon=${iconFileTrayOutline}></ion-icon></span>
        <span>${noMatches ? this.effNoMatchesMessage : this.effEmptyMessage}</span>
        ${noMatches ? b2`<ion-button fill="clear" size="small" data-role="no-matches-reset" data-testid=${this.tid("show-all")} @click=${() => this.resetSearchAndFilters()}>${this.t.showAll}</ion-button>` : A}
      </div>
    `;
  }
  /** #268 — The first rows are on their way. Not the empty state: «0 records» before the hub has
   *  answered told people they had nothing. */
  loadingState() {
    return b2`
      <div class="loading-state" role="status" data-role="loading" data-testid=${this.tid("loading")}>
        <ion-spinner name="crescent" aria-hidden="true"></ion-spinner>
        <span>${this.t.loading}</span>
      </div>
    `;
  }
  /** pm#530 — The load failed. Not the empty state: «No customers» over a hub that did not answer
   *  made people believe their data was gone. Says so, gives the reason and offers to retry. */
  errorState() {
    return b2`
      <div class="load-error" role="alert" data-role="load-error">
        <span class="empty-ic"><ion-icon .icon=${okIcon("alert-circle-outline")}></ion-icon></span>
        <strong class="load-error-title">${this.t.loadError}</strong>
        <span class="load-error-reason">${this.error}</span>
        <ion-button size="small" data-role="load-error-retry" data-testid=${this.tid("retry")} @click=${() => this.emit("retry", {})}>${this.t.retry}</ion-button>
      </div>
    `;
  }
  // Vista LISTA en CSS GRID (no <table>): permite ancho por columna y cabecera sticky.
  renderTable(visible) {
    if (visible.length === 0) return this.emptyState();
    const cols = this.visibleColumns;
    const tpl = { gridTemplateColumns: this.gridTemplate() };
    const allOn = this.selectable && visible.length > 0 && visible.every((r6) => this.selection.has(this.keyOf(r6)));
    const alignCls = (a3) => a3 === "right" ? "right" : a3 === "center" ? "center" : "left";
    return b2`
      <div class=${`scroll${this.xOverflow ? " x-overflow" : ""}`}>
        <div class="grid" role="table">
          <!-- Cabecera -->
          <div class="grow ghead" role="row" style=${o6(tpl)}>
            ${this.selectable ? b2`<span class="selcb"><ion-checkbox .checked=${allOn} aria-label=${this.t.selectAll} @ionChange=${() => this.toggleAll(visible)}></ion-checkbox></span>` : A}
            ${cols.map((c5) => {
      const sortable = this.isSortable(c5);
      const active = sortable && (this.serverSide ? this.sort === c5.key : this.clientSort === c5.key);
      const dir = this.serverSide ? this.sortDir : this.clientSortDir;
      const caretIcon = !active ? iconSwapVerticalOutline : dir === "asc" ? iconChevronUpOutline : iconChevronDownOutline;
      return b2`
                <div
                  class=${`gcell gh ${alignCls(c5.align)}${sortable ? " sortable" : ""}${c5.pinned === "end" ? " actions-col" : ""}`}
                  role="columnheader"
                  @click=${() => this.onHeaderClick(c5)}
                >
                  <span title=${c5.header || A}>${c5.header}</span>
                  ${sortable ? b2`<span class=${`caret${active ? " on" : ""}`}><ion-icon .icon=${okIcon(caretIcon)}></ion-icon></span>` : A}
                </div>
              `;
    })}
            ${this.actions.length ? b2`<div class="gcell gh right actions-col" role="columnheader">
                  <span class=${this.rowActionsCollapsed || !this.actionsLabelFits ? "sr-only" : ""}>${this.t.actions}</span>
                </div>` : A}
          </div>

          <!-- Filas -->
          ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        return b2`
                <div
                  class=${`grow grow-data${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                  role="row"
                  data-testid=${this.tid(`row-${key}`)}
                  style=${o6(tpl)}
                  tabindex=${this.rowClickable ? "0" : A}
                  @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                  @keydown=${this.rowClickable ? (e5) => this.onRowKeydown(e5, row) : A}
                >
                  ${this.selectable ? b2`<span class="selcb" @click=${(e5) => e5.stopPropagation()}><ion-checkbox .checked=${selected} aria-label=${this.t.selectRow} @ionChange=${() => this.toggleRow(key)}></ion-checkbox></span>` : A}
                  ${cols.map(
          (c5) => b2`<div class=${`gcell ${alignCls(c5.align)}${c5.pinned === "end" ? " actions-col" : ""}`} role="cell">${c5.render ? c5.render(row) : this.textCell(c5, row, key)}</div>`
        )}
                  ${this.actions.length ? b2`<div class="gcell right actions-col" role="cell" @click=${(e5) => e5.stopPropagation()}>${this.actionButtons(row, true)}</div>` : A}
                </div>
              `;
      }
    )}
        </div>
      </div>
      ${this.renderRowMenu()}
    `;
  }
  /** #205 — The column a card's title already shows, so the default body does not repeat it
   *  («Tarifa mayorista 1» as the title and again as «Nombre»). Decided per card: the first visible
   *  column whose cell reads exactly like the title. Only text is compared: a title given as a
   *  template, or a column with its own `render`, is never matched. */
  cardTitleColumn(title, row) {
    if (typeof title !== "string" && typeof title !== "number") return void 0;
    const text = String(title).trim();
    if (!text) return void 0;
    return this.visibleColumns.find((c5) => !c5.render && String(this.cell(c5, row) ?? "").trim() === text);
  }
  renderCards(visible) {
    if (visible.length === 0) return this.emptyState();
    const hasHead = !!this.cardTitle || !!this.cardIcon || this.selectable;
    return b2`
      <div class="cards-grid">
        ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        const icon = this.cardIcon?.(row);
        const title = this.cardTitle?.(row);
        const titleColumn = this.cardTitleColumn(title, row);
        return b2`
              <ion-card
                class=${`rcard${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                data-testid=${this.tid(`row-${key}`)}
                role=${this.rowClickable ? "button" : A}
                tabindex=${this.rowClickable ? "0" : A}
                @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                @keydown=${this.rowClickable ? (e5) => this.onRowKeydown(e5, row) : A}
              >
                ${hasHead ? b2`
                      <ion-card-header class="rcard-head">
                        ${icon != null && icon !== "" ? b2`<span class="rc-icon">${typeof icon === "string" ? b2`<ion-icon .icon=${okIcon(icon)}></ion-icon>` : icon}</span>` : A}
                        <span class="rc-title">${this.cardTitle ? title : A}</span>
                        ${this.selectable ? b2`<ion-checkbox .checked=${selected} aria-label=${this.t.select} @click=${(e5) => e5.stopPropagation()} @ionChange=${() => this.toggleRow(key)}></ion-checkbox>` : A}
                      </ion-card-header>
                    ` : A}
                <ion-card-content class="rcard-body">
                  ${this.renderCard ? this.renderCard(row) : this.visibleColumns.filter((c5) => c5 !== titleColumn).map(
          (c5) => b2`<div class="rrow"><span class="rk">${c5.header}</span><span class="rv">${c5.render ? c5.render(row) : this.cell(c5, row)}</span></div>`
        )}
                </ion-card-content>
                ${this.actions.length ? b2`<div class="ractions" @click=${(e5) => e5.stopPropagation()}>${this.actionButtons(row)}</div>` : A}
              </ion-card>
            `;
      }
    )}
      </div>
    `;
  }
};
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "columns");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "rows");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "searchKeys");
__decorateClass3([
  n4({ attribute: "row-key-field" })
], _OkDataTable.prototype, "rowKeyField");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "rowKey");
__decorateClass3([
  n4({ type: Number, attribute: "page-size" })
], _OkDataTable.prototype, "pageSize");
__decorateClass3([
  n4({ attribute: "empty-message" })
], _OkDataTable.prototype, "emptyMessage");
__decorateClass3([
  n4({ attribute: "no-matches-message" })
], _OkDataTable.prototype, "noMatchesMessage");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "error");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "loading");
__decorateClass3([
  n4({ attribute: "search-placeholder" })
], _OkDataTable.prototype, "searchPlaceholder");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "labels");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "actions");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "addable");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizeOptions");
__decorateClass3([
  n4({ type: Boolean, reflect: true })
], _OkDataTable.prototype, "fill");
__decorateClass3([
  n4({ type: Boolean, attribute: "column-picker" })
], _OkDataTable.prototype, "columnPicker");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "csv");
__decorateClass3([
  n4({ attribute: "csv-name" })
], _OkDataTable.prototype, "csvName");
__decorateClass3([
  n4({ type: Boolean, attribute: "server-side" })
], _OkDataTable.prototype, "serverSide");
__decorateClass3([
  n4({ type: Number })
], _OkDataTable.prototype, "total");
__decorateClass3([
  n4({ type: Number })
], _OkDataTable.prototype, "page");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "searchable");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "search");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "sort");
__decorateClass3([
  n4({ attribute: "sort-dir" })
], _OkDataTable.prototype, "sortDir");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "filterValues");
__decorateClass3([
  n4()
], _OkDataTable.prototype, "title");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "views");
__decorateClass3([
  n4({ attribute: "default-view" })
], _OkDataTable.prototype, "defaultView");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "exportable");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "importable");
__decorateClass3([
  n4({ type: Boolean, attribute: "column-selector" })
], _OkDataTable.prototype, "columnSelector");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizes");
__decorateClass3([
  n4({ type: Boolean, attribute: "row-clickable" })
], _OkDataTable.prototype, "rowClickable");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "selectable");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "selectedKeys");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "primaryAction");
__decorateClass3([
  n4({ type: Boolean })
], _OkDataTable.prototype, "inlineFilters");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "menuActions");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardTitle");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardIcon");
__decorateClass3([
  n4({ attribute: false })
], _OkDataTable.prototype, "renderCard");
__decorateClass3([
  n4({ type: String })
], _OkDataTable.prototype, "testid");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "q");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientPage");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientPageSize");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "mobileShown");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientSort");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientSortDir");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "clientFilters");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "filterDraft");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "serverFilters");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "panel");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "panelTitle");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "viewMode");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "isMobile");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "xOverflow");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "actionsTrackPx");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "rowActionsCollapsed");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "actionsLabelFits");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "unfoldedCells");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "fitCards");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "rowMenuOpen");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "columnChoice");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "internalSelection");
__decorateClass3([
  r5()
], _OkDataTable.prototype, "menuOpen");
var OkDataTable = _OkDataTable;
define("ok-data-table", OkDataTable);

// @erplora/module-sdk/src/quantity.ts
var QUANTITY_SCALE = 1e6;
function toMicro(quantity) {
  return Math.round(quantity * QUANTITY_SCALE);
}

// @erplora/module-sdk/src/index.ts
var DATA_TABLE_LABELS_ES = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros",
  loadError: "No se han podido cargar los datos",
  retry: "Reintentar"
};
var DATA_TABLE_LABELS_EN = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "List view",
  viewCards: "Card view",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records",
  loadError: "Couldn't load the data",
  retry: "Retry"
};
function dataTableLabels(locale = "es") {
  return locale.toLowerCase().startsWith("en") ? DATA_TABLE_LABELS_EN : DATA_TABLE_LABELS_ES;
}
function dataTableShowsLoadError() {
  const registry = globalThis.customElements;
  const table = registry?.get("ok-data-table");
  return !!table && "error" in table.prototype;
}
function isEmpty(v3) {
  return v3 === null || v3 === void 0 || v3 === "";
}
var ListController = class {
  constructor(client, queryName, onChange = () => {
  }, opts = {}) {
    this.client = client;
    this.queryName = queryName;
    this.onChange = onChange;
    this.rows = [];
    this.total = 0;
    this.loading = false;
    this.error = "";
    /** Descarta respuestas obsoletas si llegan fuera de orden (race de cargas concurrentes). */
    this.seq = 0;
    this.state = {
      page: 0,
      pageSize: opts.pageSize ?? 50,
      search: "",
      sort: opts.sort,
      dir: opts.dir ?? "asc",
      filters: { ...opts.filters ?? {} },
      context: { ...opts.context ?? {} }
    };
    this.moneyFilters = new Set(opts.moneyFilters ?? []);
    this.quantityFilters = new Set(opts.quantityFilters ?? []);
    if (this.moneyFilters.size > 0 && typeof client.currencyDecimals !== "number") {
      throw new ErploraError(
        "list_money_filters_need_currency_decimals",
        "moneyFilters needs a list client that exposes currencyDecimals"
      );
    }
  }
  /**
   * The filters as the runtime compares them: money and quantity columns scaled from what the
   * person typed to the stored integer. `state.filters` stays as typed, so a table that echoes it
   * back keeps showing «12», not «1200».
   */
  wireFilters() {
    if (this.moneyFilters.size === 0 && this.quantityFilters.size === 0) return this.state.filters;
    const decimals = this.client.currencyDecimals ?? 0;
    const out = {};
    for (const [col, value] of Object.entries(this.state.filters)) {
      const scale = this.moneyFilters.has(col) ? (n6) => majorToMinor(n6, decimals) : this.quantityFilters.has(col) ? toMicro : null;
      out[col] = scale ? scaleFilterValue(value, scale) : value;
    }
    return out;
  }
  /** Nº de páginas según el total del servidor (mínimo 1). */
  get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.state.pageSize));
  }
  /**
   * (Re)loads the current page from the server. On a phone, after «Load more» (hub#2365), the
   * current page is everything shown so far: a refresh brings back pages 0..page in one request.
   */
  async load() {
    const s5 = this.state;
    const mySeq = ++this.seq;
    const paging = mobilePagingOf(this);
    const window2 = nextListWindow(paging, s5);
    this.loading = true;
    this.error = "";
    this.onChange();
    try {
      const page = await this.client.queryPage(this.queryName, {
        limit: window2.limit,
        offset: window2.offset,
        search: s5.search,
        sort: s5.sort,
        dir: s5.dir,
        filters: this.wireFilters(),
        params: s5.context
      });
      if (mySeq !== this.seq) return;
      const rows = page.rows ?? [];
      this.rows = window2.append ? [...this.rows, ...rows] : rows;
      this.total = page.total ?? this.rows.length;
      if (window2.growsTo !== void 0) {
        s5.page = window2.growsTo;
        keepAccumulating(paging, () => void this.load());
      }
    } catch (e5) {
      if (mySeq !== this.seq) return;
      this.rows = [];
      this.total = 0;
      const reason = e5 instanceof Error ? e5.message.trim() : "";
      this.error = tableReadReason(e5, activeLocale()) || reason || listLoadFailedMessage(activeLocale());
    } finally {
      if (mySeq === this.seq) {
        this.loading = false;
        this.onChange();
      }
    }
  }
  /**
   * Goes to `page`. On a phone `<ok-data-table>` has no pager, only «Load more», which asks for
   * `page + 1`: that one is ADDED under the rows already shown (hub#2365). Any other jump replaces.
   */
  setPage(page) {
    const next = Math.max(0, page);
    const paging = mobilePagingOf(this);
    if (next === this.state.page + 1 && phoneViewport()?.matches) {
      paging.growNext = true;
    } else {
      stopAccumulating(paging);
      this.state.page = next;
    }
    void this.load();
  }
  setSort(sort, dir) {
    this.state.sort = sort;
    this.state.dir = dir;
    this.state.page = 0;
    void this.load();
  }
  setSearch(search) {
    this.state.search = search;
    this.state.page = 0;
    void this.load();
  }
  /** Cambia el nº de filas por página y recarga desde la página 0. */
  setPageSize(pageSize) {
    this.state.pageSize = Math.max(1, pageSize);
    this.state.page = 0;
    void this.load();
  }
  /** Aplica/quita un filtro de columna; valores vacíos lo eliminan. Vuelve a la página 0. */
  setFilter(col, value) {
    if (isEmpty(value)) {
      delete this.state.filters[col];
    } else if (typeof value === "object" && value !== null) {
      const prev = this.state.filters[col] ?? {};
      const merged = { ...prev, ...value };
      const cleaned = Object.fromEntries(Object.entries(merged).filter(([, v3]) => !isEmpty(v3)));
      if (Object.keys(cleaned).length === 0) delete this.state.filters[col];
      else this.state.filters[col] = cleaned;
    } else {
      this.state.filters[col] = value;
    }
    this.state.page = 0;
    void this.load();
  }
  /** Fija/actualiza los params de contexto obligatorios (p.ej. al seleccionar el padre).
   *  Vuelve a la página 0 y recarga. Pasa `{}` o keys con valor vacío para limpiar. */
  setContext(context) {
    this.state.context = { ...context };
    this.state.page = 0;
    void this.load();
  }
  reset() {
    this.state.page = 0;
    this.state.search = "";
    this.state.filters = {};
    void this.load();
  }
};
var PHONE_MEDIA = "(max-width: 640px)";
function phoneViewport() {
  const matchMedia = globalThis.matchMedia;
  return typeof matchMedia === "function" ? matchMedia(PHONE_MEDIA) : null;
}
var mobilePaging = /* @__PURE__ */ new WeakMap();
function mobilePagingOf(ctrl) {
  let paging = mobilePaging.get(ctrl);
  if (!paging) {
    paging = { accumulated: false, growNext: false };
    mobilePaging.set(ctrl, paging);
  }
  return paging;
}
function nextListWindow(paging, s5) {
  const size = s5.pageSize;
  const grow = paging.growNext;
  paging.growNext = false;
  if (grow) {
    const target = s5.page + 1;
    if (paging.accumulated || s5.page === 0) {
      return { offset: target * size, limit: size, append: true, growsTo: target };
    }
    return { offset: 0, limit: (target + 1) * size, append: false, growsTo: target };
  }
  if (s5.page === 0) stopAccumulating(paging);
  if (paging.accumulated) return { offset: 0, limit: (s5.page + 1) * size, append: false };
  return { offset: s5.page * size, limit: size, append: false };
}
function keepAccumulating(paging, reload) {
  paging.accumulated = true;
  if (paging.unwatch) return;
  const viewport = phoneViewport();
  if (!viewport?.addEventListener) return;
  const onChange = (e5) => {
    if (e5.matches) return;
    stopAccumulating(paging);
    reload();
  };
  viewport.addEventListener("change", onChange);
  paging.unwatch = () => viewport.removeEventListener?.("change", onChange);
}
function stopAccumulating(paging) {
  paging.accumulated = false;
  paging.unwatch?.();
  paging.unwatch = void 0;
}
function scaleFilterEdge(edge, scale) {
  const text = typeof edge === "string" ? edge.trim().replace(",", ".") : edge;
  if (text === "" || text === null || text === void 0) return "";
  const n6 = Number(text);
  return Number.isFinite(n6) ? scale(n6) : "";
}
function scaleFilterValue(value, scale) {
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([edge, v3]) => [edge, scaleFilterEdge(v3, scale)])
    );
  }
  return scaleFilterEdge(value, scale);
}
var LIST_LOAD_FAILED_EN = "The hub did not return the data.";
var LIST_LOAD_FAILED_ES = "El hub no ha devuelto los datos.";
function listLoadFailedMessage(locale) {
  return locale.toLowerCase().startsWith("en") ? LIST_LOAD_FAILED_EN : LIST_LOAD_FAILED_ES;
}
function createListController(client, queryName, onChange = () => {
}, opts = {}) {
  return new ListController(client, queryName, onChange, opts);
}
var ErploraError = class extends Error {
  constructor(code, message, permission, fields, retryAfterSecs) {
    super(message);
    this.code = code;
    this.permission = permission;
    this.fields = fields;
    this.retryAfterSecs = retryAfterSecs;
    this.name = "ErploraError";
  }
};
var SERVER_UNAVAILABLE = "server_unavailable";
var READ_UNREACHABLE_UNDER_HEADING_EN = "The hub is not responding. Check the connection and try again.";
var READ_UNREACHABLE_UNDER_HEADING_ES = "El hub no responde. Comprueba la conexi\xF3n e int\xE9ntalo de nuevo.";
function tableReadReason(e5, locale) {
  if (e5?.code !== SERVER_UNAVAILABLE || !dataTableShowsLoadError()) return "";
  return locale.toLowerCase().startsWith("en") ? READ_UNREACHABLE_UNDER_HEADING_EN : READ_UNREACHABLE_UNDER_HEADING_ES;
}
function activeLocale() {
  try {
    return localStorage.getItem("erplora.locale") || "es";
  } catch {
    return "es";
  }
}
function majorToMinor(amount, decimals) {
  const n6 = Number(amount);
  return Number.isFinite(n6) ? Math.round(n6 * 10 ** decimals) : 0;
}
function minorToMajor(amount, decimals) {
  return (amount ?? 0) / 10 ** decimals;
}

// ui/components/erp-inventory-categories/erp-inventory-categories.ts
var CATALOG = { es: es_default, en: en_default };
function erplora() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function can(permission) {
  const client = erplora();
  return typeof client.hasPermission === "function" ? client.hasPermission(permission) : true;
}
var ErpInventoryCategories = class extends i3 {
  constructor() {
    super(...arguments);
    this.newName = "";
    this.newSlug = "";
    this.newTaxRateId = "";
    this.taxCategories = [];
    this.taxRates = /* @__PURE__ */ new Map();
    this.saving = false;
    this.formError = "";
    this.pageError = "";
    this.editingId = null;
    this.editTitleInHeader = false;
    // Fila completa en edición: preserva los campos que el form no expone (icon/color/order).
    this.editRow = null;
    this.deleteTarget = null;
    this.deleteImpact = 0;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; gap: 0.75rem; }
    .page > ok-data-table { flex: 1 1 auto; min-height: 0; }
    .form { display: flex; flex-direction: column; gap: 0.7rem; }
    .form ion-button { align-self: flex-end; }
    .err { color: #d9480f; font-weight: 600; margin: 0; }
  `;
  }
  get columns() {
    const t5 = (key) => erplora().t(CATALOG, key);
    return [
      { key: "name", header: t5("ui.name"), sortable: true, filterable: true, filterType: "text" },
      { key: "slug", header: "Slug", sortable: true, filterable: true, filterType: "text" },
      { key: "product_count", header: t5("ui.products"), align: "right", sortable: true, filterable: true, filterType: "range" }
    ];
  }
  get actions() {
    const t5 = (key) => erplora().t(CATALOG, key);
    return [
      ...can("inventory.change_category") ? [{ id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" }] : [],
      ...can("inventory.delete_category") ? [{ id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" }] : []
    ];
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited record under a «New» header, and the submit would UPDATE it. */
  onTableClick(e5) {
    if (!this.editingId) return;
    const addId = "inventory-categories-table-add";
    if (e5.composedPath().some((n6) => n6 instanceof HTMLElement && n6.dataset.testid === addId)) this.cancelEdit();
  }
  async firstUpdated() {
    this.renderRoot.querySelector("ok-data-table")?.addEventListener("click", (e5) => this.onTableClick(e5));
    this.ctrl = createListController(erplora(), "inventory.categories.list", () => this.requestUpdate(), {
      pageSize: 25,
      sort: "name",
      dir: "asc"
    });
    await this.ctrl.load();
    void this.loadTaxCategories();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  // Carga los tipos de IVA/impuesto para el selector del formulario (ADR-0066/0069). Best-effort:
  // si falla (módulo `taxes` no instalado, sin permiso…), el select queda con solo "— (por defecto)"
  // y el alta sigue funcionando (tax_category_key = null = tipo por defecto del hub).
  async loadTaxCategories() {
    try {
      this.taxCategories = await erplora().queryAll("taxes.categories.list", { sort: "display_name", dir: "asc" });
    } catch {
      this.taxCategories = [];
    }
    this.taxRates = await loadTaxRates(erplora());
  }
  // Opciones del ion-select: "— (por defecto)" (valor '') + una categoría por fila (value = key).
  //
  // El texto lo compone `taxCategoryOptionLabel()`, el MISMO helper que el alta de producto y el
  // importador CSV (inventory#67): `display_name` —la etiqueta que `taxes` ya devuelve traducida,
  // con `name` de reserva para un hub con `taxes` ≤ 2.3.8 (inventory#64)— y el tipo que aplica
  // detrás. Aquí se compone A MANO como `${name} (${key})`, y eso dejaba DOS formatos del mismo
  // dato en el mismo módulo: esta pantalla enseñaba la clave técnica y escondía el %, que es
  // justamente por lo que se elige una categoría. Reutilizar el helper —en vez de copiar su
  // formato— es lo que impide que las dos pantallas vuelvan a separarse al siguiente cambio.
  taxOptions() {
    const t5 = (key) => erplora().t(CATALOG, key);
    return b2`
      <ion-select-option value="">${t5("ui.taxDefault")}</ion-select-option>
      ${this.taxCategories.map(
      (c5) => b2`<ion-select-option .value=${c5.key}>${taxCategoryOptionLabel(c5, this.taxRates, t5)}</ion-select-option>`
    )}
    `;
  }
  async onRowAction(ev) {
    const { actionId, row } = ev.detail;
    const c5 = row;
    if (actionId === "edit" && can("inventory.change_category")) {
      this.editingId = c5.id;
      this.formError = "";
      this.editRow = row;
      this.newName = c5.name;
      this.newSlug = c5.slug;
      this.newTaxRateId = c5.tax_category_key ?? "";
      const title = `${erplora().t(CATALOG, "ui.editingCategoryTitle")} \u2014 ${this.newName}`;
      const table = this.dataTable();
      table?.open("edit", { title });
      await table?.updateComplete;
      this.editTitleInHeader = table?.shadowRoot?.querySelector('[role="dialog"]')?.getAttribute("aria-label") === title;
    } else if (actionId === "delete" && can("inventory.delete_category")) {
      this.deleteImpact = Number(row.product_count ?? 0);
      this.deleteTarget = c5;
      this.pageError = "";
    }
  }
  /** Ejecuta el borrado confirmado (política definida: DESVINCULAR; los productos siguen). */
  async confirmDelete() {
    if (!can("inventory.delete_category") || !this.deleteTarget) return;
    try {
      await erplora().command("inventory.categories.delete", { category_id: this.deleteTarget.id });
      this.deleteTarget = null;
      this.deleteImpact = 0;
      await this.ctrl.load();
    } catch (e5) {
      this.pageError = e5 instanceof Error ? e5.message : erplora().t(CATALOG, "ui.errDeleteCategory");
      this.deleteTarget = null;
    }
  }
  /** Vuelve al modo ALTA limpio (inventory#8). */
  cancelEdit() {
    this.editingId = null;
    this.editRow = null;
    this.newName = "";
    this.newSlug = "";
    this.newTaxRateId = "";
    this.formError = "";
  }
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  // Importa categorías desde CSV (cabeceras = name, slug…). Crea una por fila.
  // Cada fila resuelve su tipo de IVA por referencia (ADR-0066), igual que el import de productos:
  // la columna fiscal (tax/iva/vat/…) se matchea contra los tipos existentes de `taxes`, los que
  // falten (con un % real) se crean en bloque, y la categoría enlaza por `tax_category_key`. Vacío / sin
  // columna → null = tipo por defecto del hub. NO se convierten precios.
  async onCsvImport(ev) {
    if (!can("inventory.add_category")) return;
    const rows = ev.detail.rows ?? [];
    let map = /* @__PURE__ */ new Map();
    let unresolved = [];
    try {
      const res = await resolveTaxCategories(rows, erplora());
      map = res.map;
      unresolved = res.unresolved;
      if (unresolved.length > 0) {
        console.warn("[inventory] Categor\xEDas fiscales sin resolver (categor\xEDas sin categor\xEDa fiscal):", unresolved);
      }
    } catch (e5) {
      console.warn("[inventory] No se pudieron resolver las categor\xEDas fiscales del CSV:", e5);
    }
    let linked = 0;
    for (const r6 of rows) {
      if (!r6.name) continue;
      const taxValue = pickTaxValue(r6);
      const taxRateId = taxValue ? map.get(normalizeAlias(taxValue)) ?? null : null;
      if (taxRateId) linked++;
      try {
        await erplora().command("inventory.categories.create", {
          name: r6.name,
          slug: r6.slug || r6.name.toLowerCase().replace(/\s+/g, "-"),
          tax_category_key: taxRateId
        });
      } catch {
      }
    }
    if (linked > 0 || unresolved.length > 0) {
      console.info(`[inventory] Import CSV: ${linked} categor\xEDas enlazadas por categor\xEDa fiscal, ${unresolved.length} sin resolver.`);
    }
    await this.ctrl.load();
  }
  // Submit del form: alta O edición según `editingId` (inventory#8 — antes editar
  // llamaba a create y duplicaba la categoría en silencio).
  async create(ev) {
    ev.preventDefault();
    const requiredPermission = this.editingId ? "inventory.change_category" : "inventory.add_category";
    if (!can(requiredPermission) || !this.newName.trim()) return;
    this.saving = true;
    this.formError = "";
    this.pageError = "";
    try {
      const slug = this.newSlug.trim() || this.newName.trim().toLowerCase().replace(/\s+/g, "-");
      if (this.editingId) {
        const r6 = this.editRow ?? {};
        await erplora().command("inventory.categories.update", {
          category_id: this.editingId,
          name: this.newName.trim(),
          slug,
          // Campos no editados en el form: se reenvían para que los defaults del schema
          // no los machaquen (inventory#8).
          icon: r6.icon ?? "cube-outline",
          color: r6.color ?? "#3880ff",
          description: r6.description ?? "",
          order: Number(r6.order ?? 0),
          is_active: Number(r6.is_active ?? 1),
          tax_category_key: this.newTaxRateId || null
        });
      } else {
        await erplora().command("inventory.categories.create", {
          name: this.newName.trim(),
          slug,
          tax_category_key: this.newTaxRateId || null
        });
      }
      this.cancelEdit();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e5) {
      this.formError = e5 instanceof Error ? e5.message : erplora().t(CATALOG, "ui.errSaveCategory");
    } finally {
      this.saving = false;
    }
  }
  /** pm#478: the refusal appears ABOVE the button that was pressed, at the foot of the form — on a
   *  phone that can leave it off the sheet. Bring it into view once it has painted itself: scrolled
   *  before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed) {
    super.updated(changed);
    if (changed.has("formError") && this.formError) void this.revealFormError();
  }
  async revealFormError() {
    const banner = this.renderRoot.querySelector('[data-testid="inventory-categories-form-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  render() {
    return b2`
      <div class="page">
        ${this.pageError ? b2`<ok-inline-feedback data-testid="inventory-categories-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
        ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="inventory-categories-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}

        <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
             same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table
          testid="inventory-categories-table"
          .error=${this.ctrl?.error ?? ""}
          @retry=${() => Promise.all([this.ctrl?.load(), this.loadTaxCategories()])}
          .serverSide=${true}
          .fill=${true}
          .labels=${dataTableLabels(erplora().locale)}
          .columns=${this.columns}
          .actions=${this.actions}
          .rowClickable=${true}
          .addable=${can("inventory.add_category")}
          .views=${true}
          .cardTitle=${(row) => String(row.name ?? "")}
          .columnPicker=${true}
          .importable=${can("inventory.add_category")}
          .exportable=${can("inventory.export_product")}
          .csvName=${"inventory-categories.csv"}
          @csvImport=${(e5) => this.onCsvImport(e5)}
          @rowAction=${(e5) => this.onRowAction(e5)}
          @rowClick=${(e5) => this.onRowAction({ detail: { actionId: "edit", row: e5.detail.row } })}
          .rows=${this.ctrl?.rows ?? []}
          .total=${this.ctrl?.total ?? 0}
          .page=${this.ctrl?.state.page ?? 0}
          .pageSize=${this.ctrl?.state.pageSize ?? 25}
          .sort=${this.ctrl?.state.sort}
          .sortDir=${this.ctrl?.state.dir ?? "asc"}
          .searchable=${true}
          .searchPlaceholder=${erplora().t(CATALOG, "ui.searchCategory")}
          .emptyMessage=${this.ctrl?.loading ? erplora().t(CATALOG, "ui.loading") : erplora().t(CATALOG, "ui.noCategories")}
          @pageChange=${(e5) => this.ctrl.setPage(e5.detail)}
          @pageSizeChange=${(e5) => this.ctrl.setPageSize(e5.detail)}
          @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)}
          @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)}
          @filterChange=${(e5) => this.ctrl.setFilter(e5.detail.col, e5.detail.value)}
        >
          <form slot="create" class="form" data-testid="inventory-categories-form" @submit=${(e5) => this.create(e5)}>
            ${this.editingId && !this.editTitleInHeader ? b2`<b data-testid="inventory-categories-editing">${erplora().t(CATALOG, "ui.editingCategoryTitle")} — ${this.newName}</b>` : A}
            <ion-input mode="md"
              data-testid="inventory-categories-name"
              fill="outline"
              label=${erplora().t(CATALOG, "ui.name")}
              label-placement="floating"
              .value=${this.newName}
              @ionInput=${(e5) => this.newName = e5.target.value}
            ></ion-input>
            <ion-input mode="md"
              data-testid="inventory-categories-slug"
              fill="outline"
              label=${erplora().t(CATALOG, "ui.slugOptional")}
              label-placement="floating"
              .value=${this.newSlug}
              @ionInput=${(e5) => this.newSlug = e5.target.value}
            ></ion-input>
            <ion-select mode="md"
              data-testid="inventory-categories-tax-rate"
              fill="outline"
              label-placement="floating"
              label=${erplora().t(CATALOG, "ui.taxRate")}
              .value=${this.newTaxRateId}
              @ionChange=${(e5) => this.newTaxRateId = e5.target.value}
            >
              ${this.taxOptions()}
            </ion-select>
            ${this.editingId ? b2`<ion-button data-testid="inventory-categories-edit-cancel" size="small" fill="clear" @click=${() => this.cancelEdit()}>
                  ${erplora().t(CATALOG, "ui.editingCancel")}
                </ion-button>` : A}
            <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen
                 sheet and a banner on the page underneath it is never seen. -->
            ${this.formError ? b2`<ok-inline-feedback data-testid="inventory-categories-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
            <ion-button data-testid="inventory-categories-submit" type="submit" ?disabled=${this.saving || !this.newName}>
              ${this.saving ? erplora().t(CATALOG, "ui.saving") : this.editingId ? erplora().t(CATALOG, "ui.saveChanges") : erplora().t(CATALOG, "ui.save")}
            </ion-button>
          </form>
        </ok-data-table>

        <!-- Confirmación de borrado con IMPACTO (inventory#8): política = desvincular. -->
        <ion-modal .isOpen=${!!this.deleteTarget} @ionModalDidDismiss=${() => this.deleteTarget = null}>
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-title>${erplora().t(CATALOG, "ui.deleteCatTitle")}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <!-- Auto-estilado: el reparent de ion-modal a <body> mata el CSS del shadow. -->
            <ion-list lines="none">
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <b>${this.deleteTarget?.name ?? ""}</b> —
                  ${this.deleteImpact} ${erplora().t(CATALOG, "ui.deleteCatImpact")}
                </ion-label>
              </ion-item>
            </ion-list>
            <ion-button data-testid="inventory-categories-delete-submit" class="ion-margin-top" expand="block" style=${ionTone("solid", "danger")} @click=${() => this.confirmDelete()}>
              ${erplora().t(CATALOG, "ui.deleteCatConfirm")}
            </ion-button>
            <ion-button data-testid="inventory-categories-delete-cancel" expand="block" fill="outline" @click=${() => this.deleteTarget = null}>
              ${erplora().t(CATALOG, "ui.btnCancel")}
            </ion-button>
          </ion-content>
        </ion-modal>
      </div>
    `;
  }
};
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "newName", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "newSlug", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "newTaxRateId", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "taxCategories", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "taxRates", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "editingId", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "editTitleInHeader", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "deleteTarget", 2);
__decorateClass([
  r5()
], ErpInventoryCategories.prototype, "deleteImpact", 2);
define("erp-inventory-categories", ErpInventoryCategories);

// @erplora/outfitkit/dist/ok-kpi.js
var __defProp4 = Object.defineProperty;
var __decorateClass4 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp4(target, key, result);
  return result;
};
var MIN_VALUE_REM = 1;
var FIT_SPARE_PX = 0.5;
function rootPx() {
  const n6 = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(n6) && n6 > 0 ? n6 : 16;
}
var OkKpi = class extends i3 {
  constructor() {
    super(...arguments);
    this.trend = "flat";
  }
  static {
    this.styles = i`
    :host {
      display: block;
      width: 100%;
      /* Own Ionic-style tokens (overridable): --ok-* → --ion-* → hex. */
      --background: var(--ok-card-background, var(--ion-card-background, var(--ion-background-color, #ffffff)));
      --color: var(--ok-text-color, var(--ion-text-color, #1f2933));
      --label-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --border-color: var(--ok-border-color, var(--ion-border-color, rgba(0, 0, 0, 0.08)));
      --border-radius: var(--ok-radius, 12px);
      --box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
      --padding: 1rem 1.125rem;
      /* Trend colours. */
      --trend-up-color: var(--ok-color-success, var(--ion-color-success, #2dd36f));
      --trend-down-color: var(--ok-color-danger, var(--ion-color-danger, #eb445a));
      --trend-flat-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
    }

    .card {
      box-sizing: border-box;
      width: 100%;
      background: var(--background);
      color: var(--color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
      padding: var(--padding);
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    /* Top row: label + optional icon. */
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--label-color);
    }

    .label-icon {
      font-size: 1.25rem;
      color: var(--label-color);
      flex: 0 0 auto;
    }

    /* The figure is read on ONE line (outfitkit#246): it never wraps (Ionic's inherited
       overflow-wrap would split «18.405,00 €» at any character); fit() shrinks it to its width,
       and only below MIN_VALUE_REM is it cut with an ellipsis (full figure in the tooltip). */
    .value {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Delta: arrow + text, coloured by trend. */
    .delta {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .delta ion-icon {
      font-size: 1rem;
    }
    .delta.up {
      color: var(--trend-up-color);
    }
    .delta.down {
      color: var(--trend-down-color);
    }
    .delta.flat {
      color: var(--trend-flat-color);
    }

    ::slotted(*) {
      margin-top: 0.25rem;
    }
  `;
  }
  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(this);
    document.fonts?.ready.then(() => this.fit());
  }
  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = void 0;
    super.disconnectedCallback();
  }
  updated(changed) {
    if (changed.has("value")) this.fit();
  }
  /**
   * Scale the figure down to its box: measured once at full size, the text width is linear in
   * the font size, so the size that fits is full * available / natural. Never below the floor.
   */
  fit() {
    const el = this.renderRoot.querySelector(".value");
    if (!el) return;
    el.style.removeProperty("font-size");
    el.removeAttribute("title");
    const available = el.getBoundingClientRect().width;
    const text = document.createRange();
    text.selectNodeContents(el);
    const natural = text.getBoundingClientRect().width;
    if (available <= 0 || natural <= available) return;
    const fullPx = parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isFinite(fullPx) || fullPx <= 0) return;
    const minPx = MIN_VALUE_REM * rootPx();
    const fitPx = Math.floor(fullPx * (available - FIT_SPARE_PX) / natural * 10) / 10;
    el.style.fontSize = `${Math.max(minPx, fitPx)}px`;
    if (fitPx < minPx) el.title = this.value ?? "";
  }
  /** Arrow icon for the trend (baked SVG, see base/icons.ts). */
  trendIcon() {
    if (this.trend === "up") return iconTrendingUp;
    if (this.trend === "down") return iconTrendingDown;
    return iconRemove;
  }
  render() {
    return b2`
      <div class="card">
        <div class="top">
          ${this.label ? b2`<p class="label">${this.label}</p>` : null}
          ${this.icon ? b2`<ion-icon class="label-icon" .icon=${okIcon(this.icon)} aria-hidden="true"></ion-icon>` : null}
        </div>
        ${this.value ? b2`<p class="value">${this.value}</p>` : null}
        ${this.delta ? b2`<span class="delta ${this.trend}">
              <ion-icon .icon=${this.trendIcon()} aria-hidden="true"></ion-icon>${this.delta}
            </span>` : null}
        <slot></slot>
      </div>
    `;
  }
};
__decorateClass4([
  n4()
], OkKpi.prototype, "label");
__decorateClass4([
  n4()
], OkKpi.prototype, "value");
__decorateClass4([
  n4()
], OkKpi.prototype, "delta");
__decorateClass4([
  n4()
], OkKpi.prototype, "trend");
__decorateClass4([
  n4()
], OkKpi.prototype, "icon");
define("ok-kpi", OkKpi);

// ui/lib/quantity.ts
var QUANTITY_SCALE2 = 1e6;
function fromMicro2(raw) {
  return raw / QUANTITY_SCALE2;
}
function parseQuantity2(text) {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) return null;
  const raw = Math.round(Number(normalized) * QUANTITY_SCALE2);
  return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}
function formatQuantity2(raw) {
  const value = Number(raw);
  return Number.isFinite(value) ? String(fromMicro2(value)) : String(raw);
}
function onGrid2(raw, increment) {
  return !Number.isFinite(increment) || increment <= 0 || raw % increment === 0;
}

// ui/components/erp-inventory-dashboard/erp-inventory-dashboard.ts
var CATALOG2 = { es: es_default, en: en_default };
function erplora2() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpInventoryDashboard = class extends i3 {
  constructor() {
    super(...arguments);
    this.stats = null;
    this.statsLoading = true;
    this.statsError = false;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display: block; height: 100%; overflow: auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    h2 { font-size: 1rem; margin: 0 0 0.75rem; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 0 0 1rem; }
    .cards a { text-decoration: none; color: inherit; display: block; }
    .section { margin-bottom: 1.5rem; }
    .state { color: var(--ion-color-medium, #6b6557); margin: 0 0 1rem; }
    ion-note { display: block; margin: 0 0 1rem; font-size: 0.85rem; }
  `;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  /** Columnas = las que `low_stock.sql` proyecta (nada de `price`: no viene, era NaN). */
  get columns() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    return [
      { key: "name", header: t5("ui.name") },
      { key: "sku", header: t5("ui.sku") },
      {
        key: "stock",
        header: t5("ui.stock"),
        align: "right",
        format: (r6) => formatQuantity2(Number(r6.stock))
      },
      {
        key: "low_stock_threshold",
        header: t5("ui.threshold"),
        align: "right",
        format: (r6) => formatQuantity2(Number(r6.low_stock_threshold))
      }
    ];
  }
  async firstUpdated() {
    await this.loadStats();
    this.ctrl = createListController(erplora2(), "inventory.products.low_stock", () => this.requestUpdate(), {
      pageSize: 5
    });
    await this.ctrl.load();
  }
  /** The figures above the table. Never throws: a failed read is `statsError`, painted as a notice. */
  async loadStats() {
    this.statsLoading = true;
    this.statsError = false;
    try {
      const res = await erplora2().query("inventory.products.stats");
      const row = Array.isArray(res) ? res[0] : res;
      if (row && typeof row === "object") {
        this.stats = row;
      } else {
        this.statsError = true;
      }
    } catch {
      this.statsError = true;
    } finally {
      this.statsLoading = false;
    }
  }
  kpis() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    const s5 = this.stats;
    const n6 = (v3) => String(v3 ?? 0);
    const productsHref = "/m/inventory/products";
    return b2`
      <div class="cards">
        <a href=${productsHref}><ok-kpi data-testid="inventory-dashboard-kpi-tracked" label=${t5("ui.statsTracked")} value=${n6(s5.products_tracked)} icon="cube-outline"></ok-kpi></a>
        <a href=${productsHref}><ok-kpi data-testid="inventory-dashboard-kpi-in-stock" label=${t5("ui.statsInStock")} value=${n6(s5.products_in_stock)} icon="checkmark-circle-outline"></ok-kpi></a>
        <a href=${productsHref}><ok-kpi data-testid="inventory-dashboard-kpi-out-of-stock" label=${t5("ui.statsOutOfStock")} value=${n6(s5.products_out_of_stock)} icon="close-circle-outline" trend=${s5.products_out_of_stock > 0 ? "down" : "flat"}></ok-kpi></a>
        <a href=${productsHref}><ok-kpi data-testid="inventory-dashboard-kpi-low-stock" label=${t5("ui.statsLowStock")} value=${n6(s5.products_low_stock)} icon="warning-outline" trend=${s5.products_low_stock > 0 ? "down" : "flat"}></ok-kpi></a>
        <ok-kpi data-testid="inventory-dashboard-kpi-value" label=${t5("ui.statsValue")} value=${erplora2().formatMoney(Number(s5.total_inventory_value ?? 0))} icon="pricetag-outline" delta=${t5("ui.statsValueAtCost")}></ok-kpi>
      </div>
      ${s5.products_without_cost > 0 ? b2`<ion-note data-testid="inventory-dashboard-without-cost" style=${ionTone("text", "warning")}>${s5.products_without_cost} ${t5("ui.statsWithoutCost")}</ion-note>` : A}
    `;
  }
  render() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    return b2`
      <div>
        ${this.statsLoading ? b2`<p data-testid="inventory-dashboard-loading" class="state">${t5("ui.loading")}</p>` : A}
        ${this.statsError && !this.ctrl?.error ? b2`<ok-inline-feedback data-testid="inventory-dashboard-stats-error" tone="danger" icon="alert-circle-outline">${t5("ui.statsError")}</ok-inline-feedback>` : A}
        ${this.stats ? this.kpis() : A}

        <div class="section">
          <h2>${t5("ui.lowStockTitle")}</h2>
          ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="inventory-dashboard-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
          <ok-data-table
            testid="inventory-dashboard-low-stock-table"
            .error=${this.ctrl?.error ?? ""}
            @retry=${() => Promise.all([this.ctrl?.load(), this.loadStats()])}
            .serverSide=${true}
            .labels=${dataTableLabels(erplora2().locale)}
            .columns=${this.columns}
            .views=${true}
            .cardTitle=${(row) => String(row.name ?? row.sku ?? "")}
            .rows=${this.ctrl?.rows ?? []}
            .total=${this.ctrl?.total ?? 0}
            .page=${this.ctrl?.state.page ?? 0}
            .pageSize=${this.ctrl?.state.pageSize ?? 5}
            .pageSizeOptions=${[]}
            .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.lowStockEmpty")}
            @pageChange=${(e5) => this.ctrl.setPage(e5.detail)}
          ></ok-data-table>
        </div>
      </div>
    `;
  }
};
__decorateClass([
  r5()
], ErpInventoryDashboard.prototype, "stats", 2);
__decorateClass([
  r5()
], ErpInventoryDashboard.prototype, "statsLoading", 2);
__decorateClass([
  r5()
], ErpInventoryDashboard.prototype, "statsError", 2);
define("erp-inventory-dashboard", ErpInventoryDashboard);

// ui/lib/list-date.ts
function formatListDateTime(value, locale) {
  const raw = value == null ? "" : String(value);
  if (!raw) return "";
  const d3 = new Date(raw);
  if (Number.isNaN(d3.getTime())) return raw;
  const options = d3.getFullYear() === (/* @__PURE__ */ new Date()).getFullYear() ? { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" };
  try {
    return new Intl.DateTimeFormat(locale || "es", options).format(d3);
  } catch {
    return new Intl.DateTimeFormat("es", options).format(d3);
  }
}

// ui/lib/movement-reference.ts
var SALE_MOVEMENTS = /* @__PURE__ */ new Set(["sale", "void"]);
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function saleReferenceOf(row) {
  const reference = row.reference == null ? "" : String(row.reference);
  return reference && SALE_MOVEMENTS.has(String(row.movement_type ?? "")) ? reference : "";
}
function movementReference(row, doc) {
  const reference = row.reference == null ? "" : String(row.reference);
  if (!saleReferenceOf(row)) return reference;
  if (doc) return doc.number;
  return UUID.test(reference) ? "" : reference;
}
function firstRow(rows) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  return row && typeof row === "object" ? row : void 0;
}
async function resolveSaleDocument(sdk, saleId) {
  try {
    const invoice = firstRow(await sdk.queryOptional("invoice.by_source", { source_id: saleId }));
    const number = invoice?.number == null ? "" : String(invoice.number);
    if (number) return { kind: invoice?.invoice_type === "F2" ? "receipt" : "invoice", number };
  } catch {
  }
  try {
    const sale = firstRow(await sdk.queryOptional("sales.get", { sale_id: saleId }));
    const number = sale?.sale_number == null ? "" : String(sale.sale_number);
    if (number) return { kind: "sale", number };
  } catch {
  }
  return null;
}
var DOCUMENT_LOOKUP_LIMIT = 20;
function rowsOf2(answer) {
  const rows = Array.isArray(answer) ? answer : answer?.rows;
  return Array.isArray(rows) ? rows.filter((r6) => !!r6 && typeof r6 === "object") : [];
}
var textOf = (v3) => v3 == null ? "" : String(v3);
async function saleOfInvoiceNumber(sdk, number) {
  const invoices = rowsOf2(await sdk.queryOptional("invoice.list", { f_number: number, limit: DOCUMENT_LOOKUP_LIMIT }));
  for (const invoice of invoices) {
    if (textOf(invoice.source_type) !== "sale") continue;
    const saleId = textOf(firstRow(await sdk.queryOptional("invoice.get", { invoice_id: invoice.id }))?.source_id);
    if (saleId) return saleId;
  }
  return "";
}
async function saleOfSaleNumber(sdk, number) {
  const sales = rowsOf2(await sdk.queryOptional("sales.list", { f_sale_number: number, limit: DOCUMENT_LOOKUP_LIMIT }));
  return textOf(sales.find((s5) => textOf(s5.sale_number) === number)?.id);
}
async function findSaleByDocumentNumber(sdk, typed) {
  const number = typed.trim();
  if (!/\d/.test(number)) return null;
  for (const source of [saleOfInvoiceNumber, saleOfSaleNumber]) {
    try {
      const saleId = await source(sdk, number);
      if (saleId) return saleId;
    } catch {
    }
  }
  return null;
}
function withDocumentNumberSearch(client) {
  const known = /* @__PURE__ */ new Map();
  const saleOf = (typed) => {
    const text = textOf(typed);
    if (!known.has(text)) known.set(text, findSaleByDocumentNumber(client, text));
    return known.get(text);
  };
  return {
    queryOptional: (name, params) => client.queryOptional(name, params),
    async queryPage(name, params) {
      const out = { ...params };
      if (params.search) out.search = await saleOf(params.search) ?? params.search;
      const reference = params.filters?.reference;
      if (reference) out.filters = { ...params.filters, reference: await saleOf(reference) ?? reference };
      return client.queryPage(name, out);
    }
  };
}

// ui/components/erp-inventory-movements/erp-inventory-movements.ts
var CATALOG3 = { es: es_default, en: en_default };
function erplora3() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function formatQty(v3) {
  const logical = fromMicro2(Number(v3));
  return logical > 0 ? `+${logical}` : String(logical);
}
var ErpInventoryMovements = class extends i3 {
  constructor() {
    super(...arguments);
    /** The document each sale on screen produced, by sale id (inventory#137): `null` while being
     *  resolved or when none could be. Asked once per sale for the life of the view. */
    this.saleDocuments = /* @__PURE__ */ new Map();
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    /* Estructura de la casa (services/staff/products): la vista llena el alto, la tabla scrollea dentro. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
  `;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  get columns() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    const typeKey = (mt) => {
      const map = {
        initial: "ui.mvInitial",
        reception: "ui.mvReception",
        sale: "ui.mvSale",
        void: "ui.mvVoid",
        count: "ui.mvCount",
        decrease: "ui.mvDecrease"
      };
      return map[mt] ?? mt;
    };
    return [
      {
        key: "created_at",
        header: t5("ui.mvDate"),
        sortable: true,
        width: "minmax(6.25rem,1fr)",
        format: (r6) => formatListDateTime(r6.created_at, erplora3().locale)
      },
      { key: "product_name", header: t5("ui.name"), width: "minmax(7.5rem,3fr)" },
      { key: "sku", header: t5("ui.sku"), width: "minmax(4.5rem,0.8fr)" },
      {
        key: "movement_type",
        header: t5("ui.mvType"),
        filterable: true,
        filterType: "select",
        width: "4.5rem",
        options: ["reception", "sale", "void", "count", "decrease", "initial"].map((v3) => ({ value: v3, label: t5(typeKey(v3)) })),
        format: (r6) => t5(typeKey(String(r6.movement_type)))
      },
      {
        key: "qty",
        header: t5("ui.mvQty"),
        align: "right",
        sortable: true,
        width: "5.25rem",
        format: (r6) => formatQty(r6.qty)
      },
      {
        key: "stock_after",
        header: t5("ui.mvStockAfter"),
        align: "right",
        sortable: true,
        width: "4.75rem",
        format: (r6) => formatQuantity2(r6.stock_after)
      },
      { key: "reason", header: t5("ui.mvReason"), width: "minmax(3.25rem,1fr)" },
      {
        key: "reference",
        header: t5("ui.mvReference"),
        filterable: true,
        filterType: "text",
        width: "minmax(4.75rem,1.25fr)",
        format: (r6) => {
          const row = r6;
          return movementReference(row, this.saleDocuments.get(saleReferenceOf(row)));
        }
      }
    ];
  }
  updated() {
    this.resolveDocuments();
  }
  /** Ask, once per sale, which document the sales on the current page produced (inventory#137). */
  resolveDocuments() {
    for (const row of this.ctrl?.rows ?? []) {
      const saleId = saleReferenceOf(row);
      if (!saleId || this.saleDocuments.has(saleId)) continue;
      this.saleDocuments.set(saleId, null);
      void resolveSaleDocument(erplora3(), saleId).then((doc) => {
        this.saleDocuments.set(saleId, doc);
        if (doc) this.requestUpdate();
      });
    }
  }
  async firstUpdated() {
    this.ctrl = createListController(
      withDocumentNumberSearch(erplora3()),
      "inventory.stock.movements",
      () => this.requestUpdate()
    );
    await this.ctrl.load();
  }
  render() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return b2`
      <div class="page">
      ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="inventory-movements-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
      <ok-data-table
        testid="inventory-movements-table"
        .error=${this.ctrl?.error ?? ""}
        @retry=${() => this.ctrl?.load()}
        fill
        .serverSide=${true}
        .labels=${dataTableLabels(erplora3().locale)}
        .searchable=${true}
        .views=${true}
        .cardTitle=${(row) => String(row.product_name ?? row.sku ?? "")}
        .columns=${this.columns}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.mvEmpty")}
        @pageChange=${(e5) => this.ctrl.setPage(e5.detail)}
        @pageSizeChange=${(e5) => this.ctrl.setPageSize(e5.detail)}
        @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)}
        @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)}
        @filterChange=${(e5) => this.ctrl.setFilter(e5.detail.col, e5.detail.value)}
      ></ok-data-table>
      </div>
    `;
  }
};
define("erp-inventory-movements", ErpInventoryMovements);

// ui/lib/code128.ts
var PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112"
];
var START_B = 104;
var STOP = 106;
function code128b(text, module = 2, height = 70) {
  const codes = [START_B];
  let sum = START_B;
  let pos = 1;
  for (const ch of text) {
    const v3 = ch.charCodeAt(0) - 32;
    if (v3 < 0 || v3 > 94) continue;
    codes.push(v3);
    sum += v3 * pos;
    pos += 1;
  }
  codes.push(sum % 103);
  codes.push(STOP);
  const bars = [];
  let x2 = 0;
  for (const c5 of codes) {
    const pat = PATTERNS[c5];
    for (let j2 = 0; j2 < pat.length; j2++) {
      const w2 = Number(pat[j2]) * module;
      if (j2 % 2 === 0) bars.push({ x: x2, w: w2 });
      x2 += w2;
    }
  }
  return { width: x2, height, bars };
}

// ui/lib/hub-currency.ts
function hubDecimals() {
  const d3 = globalThis.erplora?.currencyDecimals;
  return typeof d3 === "number" && Number.isInteger(d3) && d3 >= 0 ? d3 : 2;
}
function minorToMajor2(minor) {
  return minorToMajor(minor, hubDecimals());
}
function majorToMinor2(major) {
  return majorToMinor(major, hubDecimals());
}

// ui/lib/barcode-print.ts
function esc(s5) {
  return s5.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function barcodeLabelHtml(sku, name) {
  const bc = code128b(sku, 2, 90);
  const rects = bc.bars.map((b3) => `<rect x="${b3.x}" y="0" width="${b3.w}" height="${bc.height}"/>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sku)}</title></head><body style="margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui"><div style="text-align:center;padding:8px"><svg width="${bc.width}" height="${bc.height}" viewBox="0 0 ${bc.width} ${bc.height}" fill="#000">${rects}</svg><div style="font:14px monospace;margin-top:6px">${esc(sku)}</div><div style="font:13px system-ui;color:#555">${esc(name)}</div></div></body></html>`;
}
function printHtmlInIframe(html, doc = document) {
  const frame = doc.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:80mm;height:1px;border:0;visibility:hidden;";
  doc.body.appendChild(frame);
  const w2 = frame.contentWindow;
  const d3 = frame.contentDocument;
  if (!w2 || !d3) {
    frame.remove();
    return;
  }
  d3.open();
  d3.write(html);
  d3.close();
  const fire = () => {
    try {
      w2.focus();
      w2.print();
    } finally {
      setTimeout(() => frame.remove(), 1e3);
    }
  };
  if (d3.readyState === "complete") setTimeout(fire, 50);
  else w2.addEventListener("load", () => setTimeout(fire, 50), { once: true });
}
function barcodeLabelData(label) {
  const data = { product_name: label.name, barcode: label.sku };
  if (label.priceCents != null && Number.isFinite(Number(label.priceCents))) {
    data.price = minorToMajor2(Number(label.priceCents));
  }
  return data;
}
function runningInInstalledApp() {
  const g3 = globalThis;
  return typeof g3.__TAURI__?.core?.invoke === "function";
}
async function printBarcodeLabel(label, deps = {}) {
  const html = barcodeLabelHtml(label.sku, label.name);
  const sdk = globalThis.erplora;
  if (sdk?.print) {
    let result;
    try {
      result = await sdk.print({
        role: "label",
        // Closed vocabulary (`DocumentType::parse`, `_ => return None`): `label` was refused AFTER
        // crossing the gate, which is why the button looked like it worked and never printed.
        documentType: "barcode_label",
        data: barcodeLabelData(label),
        html,
        jobId: `barcode-${label.sku}`
      });
    } catch (e5) {
      return { ok: false, via: "none", reason: "threw", detail: e5 instanceof Error ? e5.message : String(e5) };
    }
    const via = result?.via ?? "none";
    if (via === "bridge" || via === "queue") return { ok: true, via };
    if (via === "browser") {
      const installed = (deps.isInstalledApp ?? runningInInstalledApp)();
      return installed ? { ok: false, via, reason: "no_printer", detail: result?.error } : { ok: true, via };
    }
    return { ok: false, via, reason: "gate_error", detail: result?.error };
  }
  if (html) {
    (deps.iframePrint ?? printHtmlInIframe)(html);
    return { ok: true, via: "iframe" };
  }
  window.print();
  return { ok: true, via: "browser" };
}

// @erplora/module-toolkit/src/money-input.mjs
var SPACING = "\\s'\\u2019\\u02bc";
var GROUP_SEP = new RegExp(`[.,${SPACING}]`);
var MINUS = /[-\u2212]/;
var SIGN = /[-+\u2212]/;
var SIGNS = /[-+\u2212]/g;
var BRACKET = /[()]/;
var CURRENCY_SIGNS = /\p{Sc}/gu;
var AFFIX_FILLER = new RegExp(`^[${SPACING}\\p{Cf}.,+\\-\\u2212]*$`, "u");
var NOT_AN_AMOUNT = Object.freeze({ ok: false, code: "not_an_amount" });
function checkDecimals(decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 4) {
    throw new RangeError(`money_input_decimals_invalid: ${String(decimals)}`);
  }
}
function currencyWords(currency, locale) {
  if (currency === void 0) return [];
  if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency)) {
    throw new RangeError(`money_input_currency_invalid: ${String(currency)}`);
  }
  const words = /* @__PURE__ */ new Set([currency.toLowerCase()]);
  for (const lang of [locale || "en", "en"]) {
    for (const currencyDisplay of ["symbol", "narrowSymbol"]) {
      const part = new Intl.NumberFormat(lang, { style: "currency", currency, currencyDisplay }).formatToParts(1).find((p4) => p4.type === "currency");
      if (part) words.add(part.value.toLowerCase());
    }
  }
  return [...words].sort((a3, b3) => b3.length - a3.length);
}
function isCurrencyOnly(affixes, words) {
  let rest = affixes.toLowerCase();
  if (!words.length) rest = rest.replace(CURRENCY_SIGNS, " ");
  for (const word of words) rest = rest.split(word).join(" ");
  return AFFIX_FILLER.test(rest);
}
function isGrouping(intPart) {
  const groups = intPart.split(GROUP_SEP);
  if (groups.length < 2) return false;
  const [first, ...rest] = groups;
  const last = rest.pop();
  return /^[1-9]\d{0,2}$/.test(first) && rest.every((g3) => /^\d{2,3}$/.test(g3)) && /^\d{3}$/.test(last);
}
function digitsToMinor(intDigits2, fracDigits, decimals) {
  const padded = fracDigits.padEnd(decimals + 1, "0");
  const kept = (intDigits2 || "0") + padded.slice(0, decimals);
  let minor = Number(kept);
  if (Number(padded[decimals]) >= 5) minor += 1;
  return Number.isSafeInteger(minor) ? minor : null;
}
function signed(minor, negative) {
  return negative && minor !== 0 ? -minor : minor;
}
function splitCore(core, decimals) {
  const dots = (core.match(/\./g) ?? []).length;
  const commas = (core.match(/,/g) ?? []).length;
  if (dots && commas) {
    const dec = core.lastIndexOf(".") > core.lastIndexOf(",") ? "." : ",";
    if ((dec === "." ? dots : commas) !== 1) return null;
    const at2 = core.lastIndexOf(dec);
    return { intPart: core.slice(0, at2), frac: core.slice(at2 + 1) };
  }
  if (dots + commas !== 1) return { intPart: core, frac: "" };
  const at = Math.max(core.lastIndexOf("."), core.lastIndexOf(","));
  const intPart = core.slice(0, at);
  const tail = core.slice(at + 1);
  if (tail.length === 3 && isGrouping(core)) {
    if (decimals === 0) return { intPart: core, frac: "" };
    if (decimals !== 3) return { ambiguous: { intPart, tail } };
  }
  return { intPart, frac: tail };
}
function intDigits(intPart) {
  if (!GROUP_SEP.test(intPart)) return /^\d*$/.test(intPart) ? intPart : null;
  return isGrouping(intPart) ? intPart.replace(/\D/g, "") : null;
}
function parseMoneyInput(typed, decimals, options = {}) {
  checkDecimals(decimals);
  const words = currencyWords(options.currency, options.locale);
  if (typeof typed === "number") return parseNumber(typed, decimals);
  const raw = String(typed ?? "").trim();
  if (!raw) return { ok: true, minor: null };
  const firstDigit = raw.search(/\d/);
  if (firstDigit < 0) return NOT_AN_AMOUNT;
  const start = firstDigit > 0 && /[.,]/.test(raw[firstDigit - 1]) ? firstDigit - 1 : firstDigit;
  const end = raw.search(/\d\D*$/) + 1;
  const prefix = raw.slice(0, start);
  const suffix = raw.slice(end);
  const core = raw.slice(start, end);
  const signs = prefix.match(SIGNS) ?? [];
  if (signs.length > 1 || SIGN.test(suffix) || BRACKET.test(prefix + suffix)) return NOT_AN_AMOUNT;
  if (!isCurrencyOnly(`${prefix} ${suffix}`, words)) return NOT_AN_AMOUNT;
  const negative = signs.length === 1 && MINUS.test(signs[0]);
  const split = splitCore(core, decimals);
  if (!split) return NOT_AN_AMOUNT;
  if ("ambiguous" in split) {
    const { intPart, tail } = split.ambiguous;
    const digits = intPart.replace(/\D/g, "");
    const grouped = digitsToMinor(digits + tail, "", decimals);
    const decimal = digitsToMinor(digits, tail, decimals);
    if (grouped === null || decimal === null) return NOT_AN_AMOUNT;
    return {
      ok: false,
      code: "ambiguous_amount",
      readings: { grouped: signed(grouped, negative), decimal: signed(decimal, negative) }
    };
  }
  const whole = intDigits(split.intPart);
  if (whole === null || split.frac && !/^\d+$/.test(split.frac)) return NOT_AN_AMOUNT;
  const minor = digitsToMinor(whole, split.frac, decimals);
  return minor === null ? NOT_AN_AMOUNT : { ok: true, minor: signed(minor, negative) };
}
function parseNumber(n6, decimals) {
  const m4 = /^(\d+)(?:\.(\d+))?$/.exec(String(Math.abs(n6)));
  if (!m4) return NOT_AN_AMOUNT;
  const minor = digitsToMinor(m4[1], m4[2] ?? "", decimals);
  return minor === null ? NOT_AN_AMOUNT : { ok: true, minor: signed(minor, n6 < 0) };
}
function formatMoneyInput(minor, decimals, locale) {
  checkDecimals(decimals);
  if (minor == null) return "";
  return new Intl.NumberFormat(locale || "en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
    numberingSystem: "latn"
  }).format(minor / 10 ** decimals);
}
function normaliseMoneyInput(typed, decimals, locale, currency) {
  const parsed = parseMoneyInput(typed, decimals, { currency, locale });
  return parsed.ok && parsed.minor !== null ? formatMoneyInput(parsed.minor, decimals, locale) : typed;
}

// ui/components/erp-inventory-products/erp-inventory-products.ts
var CATALOG4 = { es: es_default, en: en_default };
var STATUS_UNCONFIGURED = "unconfigured";
var STATUS_FROM_QUERY = {
  [STATUS_UNCONFIGURED]: STATUS_UNCONFIGURED,
  active: "1",
  inactive: "0"
};
function statusFilterFromSearch(search) {
  try {
    return STATUS_FROM_QUERY[new URLSearchParams(search).get("status") ?? ""] ?? "";
  } catch {
    return "";
  }
}
function statusOf(row) {
  const key = row.tax_category_key;
  if (key == null || String(key).trim() === "") return STATUS_UNCONFIGURED;
  return Number(row.is_active) ? "active" : "inactive";
}
var IMPORT_FIELDS = [
  "name",
  "sku",
  "price",
  "cost",
  "stock",
  "low_stock_threshold",
  "ean13",
  "description",
  "unit_code",
  "tax"
];
var IMPORT_REQUIRED = ["name", "sku"];
var IMPORT_ALIASES = {
  name: ["name", "nombre", "producto", "product", "articulo", "item", "titulo"],
  sku: ["sku", "codigo", "code", "referencia", "ref", "reference", "cod"],
  price: ["price", "precio", "pvp", "precio venta", "sale price", "precio de venta"],
  cost: ["cost", "coste", "costo", "precio coste", "purchase price", "precio de compra"],
  stock: ["stock", "existencias", "cantidad", "qty", "quantity", "unidades"],
  low_stock_threshold: ["low_stock_threshold", "umbral", "minimo", "stock minimo", "min stock", "reorder point"],
  ean13: ["ean13", "ean", "barcode", "codigo de barras", "gtin", "codigo barras"],
  description: ["description", "descripcion", "detalle", "notas"],
  unit_code: ["unit_code", "unidad", "unit", "medida", "uom"],
  tax: [
    "tax_category",
    "tax_category_key",
    "category_tax",
    "fiscal_category",
    "tax",
    "iva",
    "vat",
    "impuesto",
    "tax_class",
    "categoria fiscal",
    "tipo de iva"
  ]
};
function normalizeHeader(header) {
  return (header ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}
function guessMapping(headers) {
  const out = {};
  const taken = /* @__PURE__ */ new Set();
  for (const header of headers) {
    const norm = normalizeHeader(header);
    const field = IMPORT_FIELDS.find(
      (f3) => !taken.has(f3) && IMPORT_ALIASES[f3].some((a3) => normalizeHeader(a3) === norm)
    );
    out[header] = field ?? "";
    if (field) taken.add(field);
  }
  return out;
}
function applyMapping(rows, mapping) {
  return rows.map((row) => {
    const out = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (!field) continue;
      out[field === "tax" ? "tax_category_key" : field] = row[header] ?? "";
    }
    return out;
  });
}
var PREVIEW_ROWS = 5;
function parseMoneyText(text) {
  const raw = (text ?? "").trim();
  if (raw === "") return 0;
  if (hubDecimals() === 0 && /^-?\d{1,3}([.,]\d{3})+$/.test(raw)) return Number(raw.replace(/[.,]/g, ""));
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  }
  const n6 = Number(normalized);
  return Number.isFinite(n6) ? n6 : null;
}
function erplora4() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function readMoneyField(typed) {
  const c5 = erplora4();
  const d3 = hubDecimals();
  const read = parseMoneyInput(typed, d3, { currency: c5.currency || void 0, locale: c5.locale });
  if (read.ok) return read;
  if (read.code === "ambiguous_amount") {
    return {
      ok: false,
      message: c5.t(CATALOG4, "ui.errAmbiguousAmount", {
        typed: typed.trim(),
        grouped: formatMoneyInput(read.readings.grouped, d3, c5.locale),
        decimal: formatMoneyInput(read.readings.decimal, d3, c5.locale)
      })
    };
  }
  return { ok: false, message: c5.t(CATALOG4, "ui.errNotAnAmount") };
}
function moneyFieldText(minor) {
  return formatMoneyInput(minor, hubDecimals(), erplora4().locale);
}
function normaliseMoneyField(typed) {
  const c5 = erplora4();
  return normaliseMoneyInput(typed, hubDecimals(), c5.locale, c5.currency || void 0);
}
function can2(permission) {
  const client = erplora4();
  return typeof client.hasPermission === "function" ? client.hasPermission(permission) : true;
}
var ErpInventoryProducts = class extends i3 {
  constructor() {
    super(...arguments);
    this.newName = "";
    this.newSku = "";
    this.newPrice = "";
    this.newTaxCategoryKey = "";
    this.newCost = "";
    this.newStock = "";
    this.newThreshold = "";
    this.newEan = "";
    this.newDescription = "";
    this.newType = "physical";
    this.newActive = true;
    this.newTrackStock = null;
    this.hubTracksStock = true;
    this.newUnitCode = "ud";
    this.units = [];
    this.editingId = null;
    /** pm#459: each edit opening takes a number; cancel/reset/«Add» bumps it. An opening that is no
     *  longer the LAST one stops right after each await, so a stale reply never overwrites a newer
     *  edit's form, id or header. */
    this.editSeq = 0;
    this.editTitleInHeader = false;
    this.selectedCategoryIds = /* @__PURE__ */ new Set();
    this.initialCategoryIds = /* @__PURE__ */ new Set();
    this.productCategories = [];
    this.taxCategories = [];
    this.taxRates = /* @__PURE__ */ new Map();
    this.saving = false;
    this.formError = "";
    this.pageError = "";
    this.importOpen = false;
    this.importRows = [];
    this.importMap = /* @__PURE__ */ new Map();
    this.importUnresolved = [];
    this.importChoice = {};
    this.deleteTarget = null;
    this.importReport = null;
    this.previewOpen = false;
    this.previewRows = [];
    this.previewMapping = {};
    this.importProgress = null;
    this.importCancelled = false;
    // hub#1737: an import already confirmed. A second tap on «Import» while the modal animates out
    // used to start a second run over rows the first had already cleared — and its report of
    // zeros overwrote the real one.
    this.importBusy = false;
    this.tableFilters = {};
    this.detail = null;
    this.printError = "";
    this.countTarget = null;
    this.countValue = "";
    this.countReason = "";
    this.receiveTarget = null;
    this.receiveQty = "";
    this.receiveCost = "";
    this.stockError = "";
    // Init una sola vez tras el primer render (equivalente a `componentWillLoad` de Stencil: el shell
    // crea una instancia nueva del WC en cada montaje de la vista). El re-render lo dispara el
    // controlador vía `requestUpdate()` (sustituye al antiguo `this.tick++`), no un @state.
    // Re-render al cambiar el idioma del shell (ADR-0055): los getters `columns`/`actions` y el
    // texto del template se re-evalúan con el nuevo `erplora.locale`.
    this.onLocaleChange = () => this.requestUpdate();
    // inventory#105 — a rotation changes both the screen height and the tabbar height: re-measure
    // the open mobile sheet against the shell's tabbar so Save keeps clearing it.
    this.onViewportResize = () => this.syncSheetBottom();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    /* La vista llena el alto: el data-table ocupa todo (scroll interno, footer fijo). */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    .track-note { font-size:.8rem; color:var(--ion-color-medium,#6b6557); margin-top:-.4rem; }
    .err { color:#d9480f; font-weight:600; }
    /* Detalle de producto */
    .detail { display:flex; flex-direction:column; gap:.6rem; }
    .drow { display:flex; justify-content:space-between; border-bottom:1px solid var(--ion-border-color,#eee); padding:.4rem 0; }
    .drow span { color:var(--ion-color-medium,#6b6557); }
    /* Sin reglas .barcode/.bc/.bccode a propósito (inventory#45): el código de barras vive dentro
       del ion-modal del detalle, que Ionic REPARENTA a body, así que esas reglas del shadow no le
       llegarían nunca. La placa se estila INLINE donde se pinta. */
  `;
  }
  // Getter (no campo): se re-evalúa en cada render, así los textos cambian con el idioma activo
  // (ADR-0055). `connectedCallback` re-renderiza al recibir `erplora:locale-changed`.
  get columns() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return [
      { key: "name", header: t5("ui.name"), sortable: true, filterable: true, filterType: "text" },
      { key: "sku", header: t5("ui.sku"), sortable: true, filterable: true, filterType: "text" },
      {
        key: "price",
        header: t5("ui.price"),
        align: "right",
        sortable: true,
        filterable: true,
        filterType: "range",
        // El precio está en CÉNTIMOS → `formatMoney` (divide). `formatAmount` NO divide: con él,
        // un café de 220 céntimos se pintaba «220,00 €».
        format: (r6) => erplora4().formatMoney(Number(r6.price))
      },
      {
        key: "stock",
        header: t5("ui.stock"),
        align: "right",
        sortable: true,
        filterable: true,
        filterType: "range",
        // inventory#48: an item that does not track stock has no balance worth showing.
        format: (r6) => this.rowTracksStock(r6) ? formatQuantity2(Number(r6.stock)) : "\u2014"
      },
      {
        key: "is_active",
        header: t5("ui.status"),
        align: "center",
        filterable: true,
        filterType: "select",
        // TRES estados, no dos (inventory#38). El tercero no es una columna aparte a propósito: si
        // «sin configurar» viviera al lado del toggle, un producto que no se puede vender seguiría
        // pintándose «activo» — que es exactamente la mentira que costaba una venta en el mostrador.
        options: [
          { value: "1", label: t5("ui.yes") },
          { value: "0", label: t5("ui.no") },
          { value: STATUS_UNCONFIGURED, label: t5("ui.statusUnconfigured") }
        ],
        render: (r6) => {
          if (statusOf(r6) === STATUS_UNCONFIGURED) return this.renderUnconfigured(r6);
          return can2("inventory.change_product") ? b2`
              <ion-toggle
                data-testid=${`inventory-products-active-${r6.id}`}
                aria-label=${t5("ui.active")}
                style="--track-background-checked: rgba(var(--ion-color-success-rgb, 45,211,111), 0.5); --handle-background-checked: var(--ion-color-success, #2dd36f);"
                ?checked=${!!r6.is_active}
                @ionChange=${(e5) => this.toggleActive(r6, e5)}
              ></ion-toggle>
            ` : r6.is_active ? t5("ui.yes") : t5("ui.no");
        }
      }
    ];
  }
  /**
   * Estado de la fila para la columna de estado, ya traducido. Público (y puro) para que el
   * contrato del TERCER estado se pueda fijar en un test sin renderizar la tabla entera.
   */
  productStatus(row) {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    const id = statusOf(row);
    if (id === STATUS_UNCONFIGURED) {
      return { id, label: t5("ui.statusUnconfigured"), reason: t5("ui.statusUnconfiguredReason") };
    }
    return { id, label: id === "active" ? t5("ui.yes") : t5("ui.no"), reason: "" };
  }
  /** Celda del tercer estado: DICE el motivo y, con permiso, es el atajo para arreglarlo. */
  renderUnconfigured(row) {
    const { label, reason } = this.productStatus(row);
    const editable = can2("inventory.change_product");
    return b2`
      <ion-chip
        data-testid=${`inventory-products-unconfigured-${row.id}`}
        title=${reason}
        ?disabled=${!editable}
        style=${`${ionTone("chip", "warning")}${editable ? " cursor:pointer;" : ""}`}
        @click=${() => editable && this.onRowAction(
      new CustomEvent("rowAction", { detail: { actionId: "edit", row } })
    )}
      >
        <ion-icon name="alert-circle-outline" style="color: inherit"></ion-icon>
        <ion-label>${label} · ${reason}</ion-label>
      </ion-chip>
    `;
  }
  /**
   * Filtro de estado: los TRES valores son EXCLUYENTES entre sí, pero viajan al servidor por DOS
   * columnas distintas (`is_active` y `needs_tax_setup`), así que se aplican juntos y con UNA sola
   * recarga — encadenar dos `setFilter` haría dos viajes y dejaría el filtro anterior puesto en el
   * primero de ellos.
   */
  applyStatusFilter(value) {
    const v3 = value == null ? "" : String(value);
    delete this.ctrl.state.filters.is_active;
    delete this.ctrl.state.filters.needs_tax_setup;
    if (v3 === STATUS_UNCONFIGURED) this.ctrl.state.filters.needs_tax_setup = "1";
    else if (v3 !== "") this.ctrl.state.filters.is_active = v3;
    this.setTableFilter("is_active", v3);
    this.ctrl.state.page = 0;
    void this.ctrl.load();
  }
  /**
   * Fija (o borra) el valor visible de una columna.
   *
   * Asigna siempre un objeto NUEVO: `ok-data-table` resiembra su espejo por identidad y una
   * mutación in-place no le llega —a propósito, para que las elecciones del usuario manden
   * mientras el consumidor no diga otra cosa—, así que mutando esto el control se quedaría con el
   * valor viejo. Y se copia el objeto entero, no solo la clave que cambia: la resiembra sustituye
   * el espejo completo, así que un `{is_active}` a secas borraría de la pantalla el filtro de
   * `sku` que el usuario acababa de escribir, dejando la lista acotada por algo invisible.
   */
  setTableFilter(col, value) {
    const next = { ...this.tableFilters };
    const empty = value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0;
    if (empty) delete next[col];
    else next[col] = value;
    this.tableFilters = next;
  }
  /** Diferencia del recuento (nuevo − actual), o null si aún no hay valor tecleado. */
  get countDifference() {
    if (!this.countTarget || this.countValue.trim() === "") return null;
    const raw = parseQuantity2(this.countValue);
    if (raw === null || !this.quantityMatchesUnit(raw, this.countTarget.unit_code)) return null;
    return fromMicro2(raw - Number(this.countTarget.stock));
  }
  async submitCount() {
    if (!can2("inventory.adjust_stock") || !this.countTarget || this.countValue.trim() === "" || this.countReason.trim() === "") return;
    this.stockError = "";
    const raw = parseQuantity2(this.countValue);
    if (raw === null) {
      this.stockError = erplora4().t(CATALOG4, "ui.errQuantity");
      return;
    }
    if (!this.quantityMatchesUnit(raw, this.countTarget.unit_code)) {
      this.stockError = erplora4().t(CATALOG4, "ui.errQuantityGrid");
      return;
    }
    try {
      await erplora4().command("inventory.stock.adjust", {
        product_id: this.countTarget.id,
        stock: raw,
        reason: this.countReason.trim()
      });
      this.countTarget = null;
      this.countValue = "";
      this.countReason = "";
      await this.ctrl.load();
    } catch (e5) {
      this.stockError = e5 instanceof Error ? e5.message : erplora4().t(CATALOG4, "ui.errCount");
    }
  }
  async submitReceive() {
    if (!can2("inventory.adjust_stock") || !this.receiveTarget || this.receiveQty.trim() === "") return;
    this.stockError = "";
    const qty = parseQuantity2(this.receiveQty);
    if (qty === null || qty <= 0) {
      this.stockError = erplora4().t(CATALOG4, "ui.errQuantity");
      return;
    }
    if (!this.quantityMatchesUnit(qty, this.receiveTarget.unit_code)) {
      this.stockError = erplora4().t(CATALOG4, "ui.errQuantityGrid");
      return;
    }
    const cost = readMoneyField(this.receiveCost);
    if (!cost.ok) {
      this.stockError = cost.message;
      return;
    }
    try {
      await erplora4().command("inventory.stock.receive", {
        items: [{ product_id: this.receiveTarget.id, qty, unit_cost: cost.minor }]
      });
      this.receiveTarget = null;
      this.receiveQty = "";
      this.receiveCost = "";
      await this.ctrl.load();
    } catch (e5) {
      this.stockError = e5 instanceof Error ? e5.message : erplora4().t(CATALOG4, "ui.errReceive");
    }
  }
  // Acciones por fila (botones) → la tabla emite `rowAction` con { actionId, row }. Getter (i18n).
  get actions() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return [
      { id: "detail", label: t5("ui.actionDetail"), icon: "eye-outline" },
      ...can2("inventory.adjust_stock") ? [
        { id: "receive", label: t5("ui.actionReceive"), icon: "download-outline" },
        { id: "count", label: t5("ui.actionCount"), icon: "calculator-outline" }
      ] : [],
      ...can2("inventory.change_product") ? [{ id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" }] : [],
      ...can2("inventory.delete_product") ? [{ id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" }] : []
    ];
  }
  // Receive / count open the same form from the row and from the product sheet (inventory#108).
  openReceive(p4) {
    if (!can2("inventory.adjust_stock")) return;
    this.detail = null;
    this.stockError = "";
    this.receiveTarget = p4;
  }
  openCount(p4) {
    if (!can2("inventory.adjust_stock")) return;
    this.detail = null;
    this.stockError = "";
    this.countTarget = p4;
    this.countValue = "";
    this.countReason = "";
  }
  async onRowAction(ev) {
    const { actionId, row } = ev.detail;
    const p4 = row;
    if (actionId === "detail") {
      this.detail = p4;
    } else if (actionId === "receive") {
      this.openReceive(p4);
    } else if (actionId === "count") {
      this.openCount(p4);
    } else if (actionId === "edit" && can2("inventory.change_product")) {
      const seq = ++this.editSeq;
      let full = p4;
      try {
        full = (await erplora4().query("inventory.products.get", { product_id: p4.id }))?.[0] ?? p4;
      } catch {
      }
      let mine = [];
      try {
        const links = await erplora4().query("inventory.product_categories");
        mine = (Array.isArray(links) ? links : []).filter((l3) => l3.product_id === p4.id).map((l3) => l3.category_id);
      } catch {
        mine = [];
      }
      if (seq !== this.editSeq) return;
      this.editingId = p4.id;
      this.formError = "";
      this.newName = full.name ?? "";
      this.newSku = full.sku ?? "";
      this.newPrice = moneyFieldText(full.price);
      this.newCost = moneyFieldText(full.cost ?? 0);
      this.newThreshold = formatQuantity2(
        full.low_stock_threshold ?? 1e7
      );
      this.newEan = String(full.ean13 ?? "");
      this.newDescription = String(full.description ?? "");
      this.newType = full.product_type === "service" ? "service" : "physical";
      this.newActive = Number(full.is_active ?? 1) === 1;
      const rawTrack = full.track_stock;
      this.newTrackStock = rawTrack == null || rawTrack === "" ? null : Number(rawTrack) !== 0 ? 1 : 0;
      this.newUnitCode = String(full.unit_code || "ud");
      this.newTaxCategoryKey = full.tax_category_key ?? "";
      this.initialCategoryIds = new Set(mine);
      this.selectedCategoryIds = new Set(mine);
      const title = `${erplora4().t(CATALOG4, "ui.editingTitle")} \u2014 ${this.newName}`;
      const table = this.dataTable();
      table?.open("edit", { title });
      await table?.updateComplete;
      if (seq !== this.editSeq) return;
      this.editTitleInHeader = table?.shadowRoot?.querySelector('[role="dialog"]')?.getAttribute("aria-label") === title;
      this.syncSheetBottom();
    } else if (actionId === "delete" && can2("inventory.delete_product")) {
      this.deleteTarget = p4;
      this.pageError = "";
    }
  }
  /** Ejecuta el borrado confirmado. */
  async confirmDelete() {
    if (!this.deleteTarget) return;
    try {
      await erplora4().command("inventory.products.delete", { product_id: this.deleteTarget.id });
      this.deleteTarget = null;
      await this.ctrl.load();
    } catch (e5) {
      this.pageError = e5 instanceof Error ? e5.message : erplora4().t(CATALOG4, "ui.errDeleteProduct");
      this.deleteTarget = null;
    }
  }
  async toggleActive(p4, ev) {
    if (!can2("inventory.change_product")) return;
    const checked = ev.target.checked;
    this.pageError = "";
    try {
      const full = (await erplora4().query("inventory.products.get", { product_id: p4.id }))?.[0] ?? {};
      await erplora4().command("inventory.products.update", {
        product_id: p4.id,
        name: p4.name,
        price: p4.price,
        cost: p4.cost ?? 0,
        low_stock_threshold: p4.low_stock_threshold ?? 10,
        ean13: full.ean13 ?? null,
        description: full.description ?? "",
        // De la ficha COMPLETA (autoridad), no de la fila: desde inventory#38 el command exige
        // una categoría no vacía, y un reenvío en blanco tumbaría el toggle con un error de schema.
        tax_category_key: full.tax_category_key ?? p4.tax_category_key,
        is_active: checked ? 1 : 0
      });
      await this.ctrl.load();
    } catch (e5) {
      this.pageError = e5 instanceof Error ? e5.message : erplora4().t(CATALOG4, "ui.errUpdateProduct");
    }
  }
  // Referencia al ok-data-table para abrir/cerrar su panel lateral (drawer).
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  /** inventory#105 — on a phone/tablet the table's mobile sheet runs to the bottom of the SCREEN,
   *  but the shell paints its tabbar (an ion-footer outside `ion-content`) over the sheet's last
   *  ~66px, so Save could never scroll clear of it. Reserves that overlap at the end of the form;
   *  it measures the real drawer, so it becomes 0 by itself on desktop or if OutfitKit ever ends
   *  the sheet above the tabbar. */
  syncSheetBottom() {
    const form = this.renderRoot.querySelector('form[slot="create"]');
    if (!form) return;
    const createSlot = this.dataTable()?.shadowRoot?.querySelector('slot[name="create"]');
    const drawer = createSlot?.assignedElements().includes(form) ? createSlot.closest(".drawer") : null;
    let node = this;
    let content = null;
    while (node && !content) {
      const parent = node.parentNode ?? (node.getRootNode?.()?.host ?? null);
      if (parent && parent.nodeType === Node.ELEMENT_NODE && parent.tagName === "ION-CONTENT") content = parent;
      node = parent === node ? null : parent;
    }
    const overlap = drawer && content ? Math.max(0, Math.round(drawer.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom)) : 0;
    form.style.paddingBottom = overlap > 0 ? `${overlap}px` : "";
  }
  // Importa productos desde CSV (cabeceras = name, sku, price, stock…). Crea uno por fila.
  // Cada fila resuelve su tipo de IVA por referencia (ADR-0066): la columna fiscal (tax/iva/vat/…)
  // se matchea contra los tipos existentes de `taxes`, los que falten (con un % real) se crean en
  // bloque, y el producto enlaza por `tax_category_key`. Vacío / sin columna → null = tipo por defecto
  // del hub. NO se convierten precios: "IVA incluido o no" lo gobierna el ajuste del hub/POS.
  async onCsvImport(ev) {
    if (!can2("inventory.import_product") || !can2("inventory.add_product")) return;
    const rows = ev.detail.rows ?? [];
    if (rows.length === 0) return;
    this.previewRows = rows;
    this.previewMapping = guessMapping(Object.keys(rows[0] ?? {}));
    this.previewOpen = true;
    if (this.units.length === 0) await this.loadUnits();
  }
  /** Filas del fichero ya con NUESTRAS claves, según el mapeo elegido. */
  get mappedPreviewRows() {
    return applyMapping(this.previewRows, this.previewMapping);
  }
  /** ¿Están mapeadas las columnas sin las que no se puede crear un producto? */
  get previewReady() {
    const mapped = new Set(Object.values(this.previewMapping));
    return IMPORT_REQUIRED.every((f3) => mapped.has(f3));
  }
  /**
   * Ensayo: valida TODAS las filas con el mapeo actual sin mandar nada al dispatcher, igual que el
   * «Test import» de Odoo. Lo que aquí sale limpio es lo que entrará; lo que sale con motivo se
   * corrige en el fichero (o en el mapeo) antes de tocar el catálogo.
   */
  get previewSummary() {
    const seen = /* @__PURE__ */ new Set();
    const failed = [];
    let ready = 0;
    this.mappedPreviewRows.forEach((r6, i7) => {
      const parsed = this.parseCsvRow(r6, seen);
      if ("error" in parsed) failed.push({ line: i7 + 2, reason: parsed.error });
      else ready++;
    });
    return { ready, failed };
  }
  /** Cierra la vista previa sin efecto ninguno: el fichero se descarta tal cual llegó. */
  cancelPreview() {
    this.previewOpen = false;
    this.previewRows = [];
    this.previewMapping = {};
  }
  /** Confirma la vista previa: a partir de aquí, el camino de siempre (categorías fiscales + alta). */
  async confirmPreview() {
    if (!this.previewReady) return;
    const rows = this.mappedPreviewRows;
    this.previewOpen = false;
    this.previewRows = [];
    await this.startImport(rows);
  }
  /** El usuario pulsa «Cancelar» con la importación en marcha: se para en la fila siguiente. */
  cancelImport() {
    this.importCancelled = true;
  }
  async startImport(rows) {
    let map = /* @__PURE__ */ new Map();
    let unresolved = [];
    try {
      const res = await resolveTaxCategories(rows, erplora4());
      map = res.map;
      unresolved = res.unresolved;
    } catch (e5) {
      console.warn("[inventory] No se pudieron resolver las categor\xEDas fiscales del CSV:", e5);
    }
    if (rows.some((r6) => !pickTaxValue(r6)) && !map.has("")) {
      unresolved = [...unresolved, ""];
    }
    if (unresolved.length > 0) {
      this.importRows = rows;
      this.importMap = map;
      this.importUnresolved = unresolved;
      const choice = {};
      for (const u5 of unresolved) choice[u5] = { mode: "pick", key: "", newKey: "", newName: u5 };
      this.importChoice = choice;
      if (this.taxCategories.length === 0) await this.loadTaxCategories();
      this.importOpen = true;
      return;
    }
    await this.finalizeImport(rows, map);
  }
  // Aplica las decisiones del modal: por cada texto sin resolver, persiste el alias hacia una
  // categoría existente (learnAlias) o crea una categoría nueva + alias (createCategoryWithAlias),
  // actualiza el mapa y procede con la creación de productos (ADR-0085).
  async confirmImportResolution() {
    if (this.importBusy) return;
    this.importBusy = true;
    try {
      await this.resolveAndImport();
    } finally {
      this.importBusy = false;
    }
  }
  async resolveAndImport() {
    const map = new Map(this.importMap);
    for (const text of this.importUnresolved) {
      const c5 = this.importChoice[text];
      try {
        if (c5?.mode === "pick" && c5.key) {
          await learnAlias(erplora4(), text, c5.key);
          map.set(normalizeAlias(text), c5.key);
        } else if (c5?.mode === "create" && c5.newKey.trim()) {
          const key = c5.newKey.trim();
          await createCategoryWithAlias(erplora4(), key, (c5.newName || key).trim(), text);
          map.set(normalizeAlias(text), key);
        }
      } catch (e5) {
        console.warn(`[inventory] No se pudo resolver la categor\xEDa "${text}":`, e5);
      }
    }
    this.importOpen = false;
    await this.loadTaxCategories();
    await this.finalizeImport(this.importRows, map);
  }
  // Crea un producto por fila enlazando su tax_category_key resuelto (o null = sin categoría).
  // Importa fila a fila con VALIDACIÓN previa e informe VISIBLE (inventory#13): nada de
  // `catch {}` — cada fila acaba en creada / omitida (duplicado en BD, política definida:
  // se salta y se cuenta, reintentable) / fallida (con línea FÍSICA del fichero y motivo).
  // El resumen se enseña en un modal y es copiable para corregir y reintentar.
  /**
   * Juzga UNA fila y devuelve o su motivo de rechazo o el alta lista para mandar.
   *
   * La misma función la usan el ensayo de la vista previa y la importación de verdad
   * (inventory#13): si fueran dos, el ensayo diría «5 listas» y luego entrarían 3, que es
   * exactamente la clase de mentira que un ensayo tiene que evitar. Lo único que el ensayo no
   * puede saber todavía es la categoría fiscal —se resuelve/pregunta después (ADR-0085)—, así que
   * eso se comprueba fuera, donde ya hay mapa.
   *
   * `seenSkus` se muta a propósito: el duplicado DENTRO del fichero solo existe en el recorrido.
   */
  parseCsvRow(r6, seenSkus) {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    const sku = (r6.sku ?? "").trim();
    const name = (r6.name ?? "").trim();
    if (!name || !sku) return { error: t5("ui.importErrNameSku") };
    const price = parseMoneyText(r6.price);
    const cost = parseMoneyText(r6.cost);
    if (price === null || cost === null) return { error: t5("ui.importErrPrice") };
    if (seenSkus.has(sku)) return { error: t5("ui.importErrDupFile") };
    seenSkus.add(sku);
    const unitCode = (r6.unit_code ?? "ud").trim() || "ud";
    const stock = r6.stock?.trim() ? parseQuantity2(r6.stock) : 0;
    const threshold = r6.low_stock_threshold?.trim() ? parseQuantity2(r6.low_stock_threshold) : 1e7;
    if (stock === null || threshold === null) return { error: t5("ui.errQuantity") };
    if (!this.quantityMatchesUnit(stock, unitCode) || !this.quantityMatchesUnit(threshold, unitCode)) {
      return { error: t5("ui.errQuantityGrid") };
    }
    return {
      sku,
      payload: {
        name,
        sku,
        price: majorToMinor2(price),
        stock,
        cost: majorToMinor2(cost),
        low_stock_threshold: threshold,
        product_type: "physical",
        ean13: r6.ean13 || null,
        description: r6.description ?? "",
        unit_code: unitCode,
        image: ""
      }
    };
  }
  async finalizeImport(rows, map) {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    if (rows.length === 0) return;
    const failed = [];
    let created = 0;
    let skipped = 0;
    const seenSkus = /* @__PURE__ */ new Set();
    this.importCancelled = false;
    this.importProgress = { done: 0, total: rows.length };
    for (let i7 = 0; i7 < rows.length; i7++) {
      if (this.importCancelled) break;
      this.importProgress = { done: i7, total: rows.length };
      const r6 = rows[i7];
      const line = i7 + 2;
      const parsed = this.parseCsvRow(r6, seenSkus);
      if ("error" in parsed) {
        failed.push({ line, sku: (r6.sku ?? "").trim(), reason: parsed.error });
        continue;
      }
      const taxCategoryKey = map.get(normalizeAlias(pickTaxValue(r6))) ?? null;
      if (!taxCategoryKey) {
        failed.push({ line, sku: parsed.sku, reason: t5("ui.importErrTaxCategory") });
        continue;
      }
      try {
        await erplora4().command("inventory.products.create", {
          ...parsed.payload,
          tax_category_key: taxCategoryKey
        });
        created++;
      } catch (e5) {
        if (await this.skuInCatalogue(parsed.sku)) {
          skipped++;
        } else {
          failed.push({ line, sku: parsed.sku, reason: e5 instanceof Error ? e5.message : String(e5) });
        }
      }
    }
    const cancelled = this.importCancelled;
    this.importProgress = null;
    this.importCancelled = false;
    this.importReport = { total: rows.length, created, skipped, failed, ...cancelled ? { cancelled } : {} };
    this.importRows = [];
    this.importUnresolved = [];
    await this.ctrl.load();
  }
  /**
   * Is there already a (not deleted) product with exactly this SKU? The `sku` filter is a LIKE, so
   * the rows it brings are matched exactly here — and ALL of them are read (`queryAll`): a short
   * numeric SKU («1») is contained in many others, and one page of them may not hold it. A lookup
   * that fails answers «no»: the row then stays failed with its reason, which is the honest outcome
   * when nothing could be checked.
   */
  async skuInCatalogue(sku) {
    try {
      const rows = await erplora4().queryAll("inventory.products.list", { filters: { sku } });
      return Array.isArray(rows) && rows.some((r6) => r6.sku === sku);
    } catch {
      return false;
    }
  }
  /** Informe copiable: una línea por fila fallida (`línea N · SKU · motivo`). */
  importReportText() {
    const rep = this.importReport;
    if (!rep) return "";
    const head = `total=${rep.total} created=${rep.created} skipped=${rep.skipped} failed=${rep.failed.length}`;
    const lines = rep.failed.map((f3) => `l\xEDnea ${f3.line} \xB7 ${f3.sku || "\u2014"} \xB7 ${f3.reason}`);
    return [head, ...lines].join("\n");
  }
  // Modal de resolución de categorías del importador (ADR-0085): una fila por texto sin resolver,
  // con elegir categoría existente / crear nueva / omitir; al confirmar persiste el alias.
  renderImportModal() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    const setChoice = (text, patch) => {
      this.importChoice = { ...this.importChoice, [text]: { ...this.importChoice[text], ...patch } };
    };
    return b2`
      <ion-modal .isOpen=${this.importOpen} @ionModalDidDismiss=${() => this.importOpen = false}>
        <ion-header>
          <ion-toolbar>
            <ion-title>${t5("ui.importTaxTitle")}</ion-title>
            <ion-buttons slot="end">
              <ion-button data-testid="inventory-products-import-tax-close" @click=${() => this.importOpen = false}>${t5("ui.btnCancel")}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p>${t5("ui.importTaxHint")}</p>
          ${this.importUnresolved.map((text) => {
      const c5 = this.importChoice[text] ?? { mode: "pick", key: "", newKey: "", newName: text };
      return b2`<div style="border:1px solid var(--ion-border-color,#e6e2d8);border-radius:10px;padding:.6rem .8rem;margin-bottom:.7rem;">
              <!-- La cadena vacía no es un texto del CSV: es el cajón de las filas que no traen
                   columna fiscal (inventory#38). Pintarla entre comillas no diría nada. -->
              <strong>${text === "" ? t5("ui.importTaxMissingLabel") : `"${text}"`}</strong>
              <ion-segment data-testid=${`inventory-products-import-tax-mode-${text}`} .value=${c5.mode} @ionChange=${(e5) => setChoice(text, { mode: e5.detail.value })} style="margin:.5rem 0;">
                <ion-segment-button data-testid=${`inventory-products-import-tax-pick-${text}`} value="pick"><ion-label>${t5("ui.importPick")}</ion-label></ion-segment-button>
                <ion-segment-button data-testid=${`inventory-products-import-tax-create-${text}`} value="create"><ion-label>${t5("ui.importCreate")}</ion-label></ion-segment-button>
                <ion-segment-button data-testid=${`inventory-products-import-tax-skip-${text}`} value="skip"><ion-label>${t5("ui.importSkip")}</ion-label></ion-segment-button>
              </ion-segment>
              ${c5.mode === "pick" ? b2`<ion-select mode="md" data-testid=${`inventory-products-import-tax-category-${text}`} fill="outline" label-placement="floating" label=${t5("ui.colCategory")} .value=${c5.key} @ionChange=${(e5) => setChoice(text, { key: e5.detail.value })}>
                    ${this.taxCategories.map((cat) => b2`<ion-select-option .value=${cat.key}>${taxCategoryOptionLabel(cat, this.taxRates, t5)}</ion-select-option>`)}
                  </ion-select>` : A}
              ${c5.mode === "create" ? b2`<div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                    <ion-input mode="md" data-testid=${`inventory-products-import-tax-new-key-${text}`} fill="outline" label-placement="floating" label=${t5("ui.colKey")} placeholder="restaurant.food" .value=${c5.newKey} @ionInput=${(e5) => setChoice(text, { newKey: e5.target.value })}></ion-input>
                    <ion-input mode="md" data-testid=${`inventory-products-import-tax-new-name-${text}`} fill="outline" label-placement="floating" label=${t5("ui.colName")} .value=${c5.newName} @ionInput=${(e5) => setChoice(text, { newName: e5.target.value })}></ion-input>
                  </div>` : A}
            </div>`;
    })}
          <ion-button data-testid="inventory-products-import-tax-submit" expand="block" @click=${() => this.confirmImportResolution()}>${t5("ui.importConfirm")}</ion-button>
        </ion-content>
      </ion-modal>
    `;
  }
  // Código de barras Code128 (SVG) del SKU. Barras NEGRAS fijas y `max-width` INLINE
  // (inventory#45): un código de barras no se tematiza —el escáner necesita oscuro sobre claro— y
  // las reglas del shadow no llegan al modal, que Ionic reparenta a <body>.
  renderBarcode(text) {
    const bc = code128b(text, 2, 70);
    return b2`<svg
      class="bc"
      style="max-width:100%; height:auto; background:#fff;"
      width=${bc.width}
      height=${bc.height}
      viewBox="0 0 ${bc.width} ${bc.height}"
      fill="#000"
    >
      ${bc.bars.map((b3) => w`<rect x=${b3.x} y="0" width=${b3.w} height=${bc.height}></rect>`)}
    </svg>`;
  }
  // Prints the barcode label through the SINGLE print gate (issue #30, ADR-0196 decision 5):
  // `erplora.print` (Bridge/label printer first) → isolated iframe. The old `window.open` popup
  // with an inline `window.print()` script bypassed the gate; contract in barcode-print.test.ts.
  //
  // The outcome is READ and SHOWN (inventory#44): the gate can cross fine and still print nothing
  // (no printer holding the `label` role, a refused document, the webview's dialog-less fallback),
  // and the old `void` turned every one of those into a button that did nothing without a word.
  async printBarcode(p4) {
    this.printError = "";
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    const out = await printBarcodeLabel({ sku: p4.sku, name: p4.name, priceCents: Number(p4.price) });
    if (out.ok) return;
    const head = out.reason === "no_printer" ? t5("ui.errPrintBarcodeNoPrinter") : t5("ui.errPrintBarcode");
    this.printError = out.detail ? `${head} (${out.detail})` : head;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    window.addEventListener("resize", this.onViewportResize);
  }
  async firstUpdated() {
    const table = this.renderRoot.querySelector("ok-data-table");
    table?.addEventListener("click", (e5) => this.onTableClick(e5));
    table?.addEventListener("panelClose", () => this.editSeq++);
    const status = statusFilterFromSearch(window.location.search);
    const filters = {};
    if (status === STATUS_UNCONFIGURED) filters.needs_tax_setup = "1";
    else if (status !== "") filters.is_active = status;
    if (status !== "") this.tableFilters = { is_active: status };
    this.ctrl = createListController(
      erplora4(),
      "inventory.products.list",
      () => this.requestUpdate(),
      {
        pageSize: 50,
        sort: "name",
        dir: "asc",
        filters,
        // The person types «12» € and «2» units; the SDK scales each edge to the stored integer
        // (minor unit of the hub currency / 10⁶, negatives included) and keeps what was typed
        // (hub#2271, pm#501).
        moneyFilters: ["price"],
        quantityFilters: ["stock"]
      }
    );
    await this.ctrl.load();
    void this.loadTaxCategories();
    void this.loadProductCategories();
    void this.loadUnits();
    void this.loadStockSettings();
    try {
      const reload = () => this.ctrl.load();
      const off1 = erplora4().on("inventory.stock_changed", reload);
      const off2 = erplora4().on("inventory.product.created", reload);
      this.unsub = () => {
        off1();
        off2();
      };
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    window.removeEventListener("resize", this.onViewportResize);
    super.disconnectedCallback();
    this.unsub?.();
  }
  // Carga las CATEGORÍAS fiscales para el selector del formulario (ADR-0085). Que la query falle
  // (sin permiso, `taxes` degradado…) NO puede tumbar la página, pero desde inventory#38 tampoco
  // deja pasar el alta: sin catálogo no hay categoría que elegir, y el formulario lo dice en vez de
  // guardar un producto que nadie podrá cobrar. El % lo resuelve `taxes` por país+categoría.
  async loadTaxCategories() {
    try {
      const res = await erplora4().queryAll("taxes.categories.list", { sort: "display_name", dir: "asc" });
      this.taxCategories = Array.isArray(res) ? res : [];
    } catch {
      this.taxCategories = [];
    }
    this.taxRates = await loadTaxRates(erplora4());
  }
  // Opciones del ion-select: una categoría por fila, etiqueta «Nombre · 21 %» (inventory#58) — SIN
  // la clave técnica, que no es información para quien da de alta un artículo, y CON el tipo
  // aplicable, que es el dato por el que se elige. SIN opción vacía (inventory#38): "— (por
  // defecto)" era la puerta trasera por la que entraba un producto que no sabía cómo tributa. El
  // hueco lo cubre el `placeholder` del select, que no es elegible.
  //
  // NO se preselecciona ninguna (lo que la issue dejaba «a considerar»): elegir por el usuario la
  // categoría «más común» es reponer ese mismo defecto por otra puerta — el producto saldría
  // tributando por omisión y nadie lo habría decidido. Que el campo esté vacío y sea obligatorio es
  // la decisión de inventory#38 y sigue vigente.
  taxOptions() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return this.taxCategories.map(
      (c5) => b2`<ion-select-option .value=${c5.key}>${taxCategoryOptionLabel(c5, this.taxRates, t5)}</ion-select-option>`
    );
  }
  // Registro de unidades (ADR-0147) para el selector de la ficha. Best-effort como el de
  // categorías fiscales: si la query falla, el select se queda con 'ud' y el alta sigue.
  async loadUnits() {
    try {
      const rows = await erplora4().queryAll("inventory.units.list");
      this.units = Array.isArray(rows) ? rows : [];
    } catch {
      this.units = [];
    }
  }
  /** Hub default for stock control (inventory#48). Best-effort: without permission or a settings
   *  row the schema default (tracking on) stands — the server resolves the truth anyway. */
  async loadStockSettings() {
    try {
      const rows = await erplora4().query("inventory.settings.get");
      const row = Array.isArray(rows) ? rows[0] : void 0;
      this.hubTracksStock = row?.track_stock == null ? true : Number(row.track_stock) !== 0;
    } catch {
      this.hubTracksStock = true;
    }
  }
  /** What the checkbox shows: the item's own choice, or the hub default when it has none. */
  trackStockEffective() {
    return this.newTrackStock == null ? this.hubTracksStock : this.newTrackStock === 1;
  }
  /** Touching the checkbox makes the choice EXPLICIT (1/0); only "never touched" stays null. */
  setTrackStock(on) {
    this.newTrackStock = on ? 1 : 0;
  }
  /** Effective flag of a LIST row (raw 1/0/null + hub default); services never track. */
  rowTracksStock(row) {
    if (row.product_type === "service") return false;
    const raw = row.track_stock;
    return raw == null || raw === "" ? this.hubTracksStock : Number(raw) !== 0;
  }
  /** Incremento exacto de la unidad. Sin catálogo, `ud` conserva su rejilla natural de 1. */
  unitIncrement(code) {
    const normalized = code || "ud";
    const configured = this.units.find((unit) => unit.code === normalized)?.increment_value;
    return Number(configured ?? (normalized === "ud" ? 1e6 : 0));
  }
  quantityMatchesUnit(raw, unitCode) {
    return onGrid2(raw, this.unitIncrement(unitCode));
  }
  quantityStep(unitCode) {
    const increment = this.unitIncrement(unitCode);
    return increment > 0 ? formatQuantity2(increment) : "0.000001";
  }
  /** Etiqueta del selector: «Kilogramo (kg)» / «Kilogram (kg)» según locale (ADR-0055). */
  unitLabel(u5) {
    const es = (erplora4().locale ?? "").startsWith("es");
    return `${es && u5.name_es || u5.name} (${u5.code})`;
  }
  // Opciones del ion-select de unidad. Sin registro cargado (query fallida) queda al menos la
  // unidad suelta, que es el default del contrato.
  unitOptions() {
    const list = this.units.length ? this.units : [{ id: "", code: "ud", name: "Unit", name_es: "Unidad" }];
    return list.map((u5) => b2`<ion-select-option .value=${u5.code}>${this.unitLabel(u5)}</ion-select-option>`);
  }
  /** Categorías de producto del hub (para el multi-select de la ficha, inventory#8). */
  async loadProductCategories() {
    try {
      const rows = await erplora4().queryAll("inventory.categories.list");
      this.productCategories = Array.isArray(rows) ? rows : [];
    } catch {
      this.productCategories = [];
    }
  }
  /** Resets every form field to its clean ALTA state (inventory#8): shared by `cancelEdit()` and
   *  the table's «Add» (pm#450), which must reset the form WITHOUT closing the panel it just
   *  opened. Bumping `editSeq` first also discards any edit opening still loading (pm#459): its
   *  reply will find itself no longer the last one and stop instead of overwriting this reset. */
  resetForm() {
    this.editSeq++;
    this.editingId = null;
    this.newName = "";
    this.newSku = "";
    this.newPrice = "";
    this.newCost = "";
    this.newStock = "";
    this.newThreshold = "";
    this.newEan = "";
    this.newDescription = "";
    this.newType = "physical";
    this.newActive = true;
    this.newTrackStock = null;
    this.newUnitCode = "ud";
    this.newTaxCategoryKey = "";
    this.initialCategoryIds = /* @__PURE__ */ new Set();
    this.selectedCategoryIds = /* @__PURE__ */ new Set();
    this.formError = "";
  }
  /** Back to a clean CREATE form (inventory#8): after an edit, the next «+» inherits nothing.
   *  Also CLOSES the side panel (QA 07-16: it stayed open with an empty form). */
  cancelEdit() {
    this.dataTable()?.close();
    this.resetForm();
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited record under a «New» header, and the submit would UPDATE it. Resets the form
   *  without closing: «Add» itself just opened the create panel.
   *
   *  pm#459: «Add» while an edit is still LOADING (`editingId` still null) only discards that
   *  pending opening; a draft typed in the create form survives. */
  onTableClick(e5) {
    const addId = "inventory-products-table-add";
    const isAdd = e5.composedPath().some((n6) => n6 instanceof HTMLElement && n6.dataset.testid === addId);
    if (!isAdd) return;
    if (this.editingId) this.resetForm();
    else this.editSeq++;
    void this.dataTable()?.updateComplete?.then(() => this.syncSheetBottom());
  }
  // Submit del form (alta O edición — decide `editingId`, inventory#8). El nombre se
  // conserva por compatibilidad con el template/tests históricos.
  async createProduct(ev) {
    ev.preventDefault();
    const requiredPermission = this.editingId ? "inventory.change_product" : "inventory.add_product";
    if (!can2(requiredPermission) || !this.newName.trim() || !this.newSku.trim()) return;
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    if (!this.newTaxCategoryKey) {
      this.formError = t5("ui.errTaxCategoryRequired");
      return;
    }
    this.saving = true;
    this.formError = "";
    this.pageError = "";
    try {
      const price = readMoneyField(this.newPrice);
      if (!price.ok) throw new Error(price.message);
      const cost = readMoneyField(this.newCost);
      if (!cost.ok) throw new Error(cost.message);
      const threshold = this.newThreshold.trim() === "" ? 1e7 : parseQuantity2(this.newThreshold);
      if (threshold === null) throw new Error(t5("ui.errQuantity"));
      if (!this.quantityMatchesUnit(threshold, this.newUnitCode)) {
        throw new Error(t5("ui.errQuantityGrid"));
      }
      if (this.editingId) {
        await erplora4().command("inventory.products.update", {
          product_id: this.editingId,
          name: this.newName.trim(),
          price: price.minor ?? 0,
          cost: cost.minor ?? 0,
          low_stock_threshold: threshold,
          ean13: this.newEan.trim() || null,
          description: this.newDescription,
          tax_category_key: this.newTaxCategoryKey,
          is_active: this.newActive ? 1 : 0,
          // Se envía SIEMPRE (no solo si cambió): el comando hace COALESCE y reenviar la
          // actual es idempotente; omitirla también sería válido (se conservaría).
          unit_code: this.newUnitCode,
          // inventory#48: null = keep following the hub (COALESCE keeps the stored value).
          track_stock: this.newTrackStock
        });
        for (const cid of this.selectedCategoryIds) {
          if (!this.initialCategoryIds.has(cid)) {
            await erplora4().command("inventory.products.add_category", {
              product_id: this.editingId,
              category_id: cid
            });
          }
        }
        for (const cid of this.initialCategoryIds) {
          if (!this.selectedCategoryIds.has(cid)) {
            await erplora4().command("inventory.products.remove_category", {
              product_id: this.editingId,
              category_id: cid
            });
          }
        }
      } else {
        const stock = this.newStock.trim() === "" ? 0 : parseQuantity2(this.newStock);
        if (stock === null) throw new Error(t5("ui.errQuantity"));
        if (!this.quantityMatchesUnit(stock, this.newUnitCode)) {
          throw new Error(t5("ui.errQuantityGrid"));
        }
        await erplora4().command("inventory.products.create", {
          name: this.newName.trim(),
          sku: this.newSku.trim(),
          price: price.minor ?? 0,
          cost: cost.minor ?? 0,
          stock,
          low_stock_threshold: threshold,
          product_type: this.newType,
          ean13: this.newEan.trim() || null,
          description: this.newDescription,
          tax_category_key: this.newTaxCategoryKey,
          unit_code: this.newUnitCode,
          image: "",
          // inventory#48: null = follows the hub setting; 1/0 only when the user decided.
          track_stock: this.newTrackStock,
          category_ids: [...this.selectedCategoryIds]
          // inventory#106: linked atomically with the product
        });
      }
      this.cancelEdit();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e5) {
      const msg = e5 instanceof Error ? e5.message : String(e5);
      if (/unique|duplicate/i.test(msg) && /sku/i.test(msg)) {
        this.formError = t5("ui.errSkuTaken");
      } else if (/unique|duplicate/i.test(msg) && /ean/i.test(msg)) {
        this.formError = t5("ui.errEanTaken");
      } else {
        this.formError = msg || t5("ui.errSaveProduct");
      }
    } finally {
      this.saving = false;
    }
  }
  /** pm#478: the refusal appears ABOVE the button that was pressed, at the foot of a long form — on
   *  a phone that leaves it off the sheet. Bring it into view once it has painted itself: scrolled
   *  before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed) {
    super.updated(changed);
    if (changed.has("formError") && this.formError) void this.revealFormError();
  }
  async revealFormError() {
    const banner = this.renderRoot.querySelector('[data-testid="inventory-products-form-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  render() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return b2`
      <div class="page">
        ${this.pageError ? b2`<ok-inline-feedback data-testid="inventory-products-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
        ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="inventory-products-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
        <!-- Importación en marcha (inventory#13): por dónde va y una salida. Con 280 filas, lo
             único que había era una pantalla quieta durante minutos. -->
        ${this.importProgress ? b2`<ok-inline-feedback data-testid="inventory-products-import-progress" tone="info" icon="cloud-upload-outline">
              ${erplora4().t(CATALOG4, "ui.importProgress", { done: this.importProgress.done, total: this.importProgress.total })}
              <ion-progress-bar .value=${this.importProgress.total ? this.importProgress.done / this.importProgress.total : 0}></ion-progress-bar>
              <ion-button data-testid="inventory-products-import-stop" size="small" fill="clear" @click=${() => this.cancelImport()}>${erplora4().t(CATALOG4, "ui.importStop")}</ion-button>
            </ok-inline-feedback>` : A}

        <!-- The «detail» button is not the only door: rowClickable makes the whole row open the
             same detail modal (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table
          testid="inventory-products-table"
          .error=${this.ctrl?.error ?? ""}
          @retry=${() => Promise.all([this.ctrl?.load(), this.loadTaxCategories(), this.loadProductCategories(), this.loadUnits(), this.loadStockSettings()])}
          .serverSide=${true}
          .filterValues=${this.tableFilters}
          .fill=${true}
          .labels=${dataTableLabels(erplora4().locale)}
          .columns=${this.columns}
          .actions=${this.actions}
          .rowClickable=${true}
          .addable=${can2("inventory.add_product")}
          .views=${true}
          .cardTitle=${(row) => String(row.name ?? row.sku ?? "")}
          .columnPicker=${true}
          .importable=${can2("inventory.import_product") && can2("inventory.add_product")}
          .exportable=${can2("inventory.export_product")}
          .csvName=${"inventory-products.csv"}
          @csvImport=${(e5) => this.onCsvImport(e5)}
          @rowAction=${(e5) => this.onRowAction(e5)}
          @rowClick=${(e5) => this.onRowAction({ detail: { actionId: "detail", row: e5.detail.row } })}
          .rows=${this.ctrl?.rows ?? []}
          .total=${this.ctrl?.total ?? 0}
          .page=${this.ctrl?.state.page ?? 0}
          .pageSize=${this.ctrl?.state.pageSize ?? 50}
          .sort=${this.ctrl?.state.sort}
          .sortDir=${this.ctrl?.state.dir ?? "asc"}
          .searchable=${true}
          .searchPlaceholder=${erplora4().t(CATALOG4, "ui.searchProduct")}
          .emptyMessage=${this.ctrl?.loading ? erplora4().t(CATALOG4, "ui.loading") : erplora4().t(CATALOG4, "ui.noProducts")}
          @pageChange=${(e5) => this.ctrl.setPage(e5.detail)}
          @pageSizeChange=${(e5) => this.ctrl.setPageSize(e5.detail)}
          @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)}
          @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)}
          @filterChange=${(e5) => {
      if (e5.detail.col === "is_active") return this.applyStatusFilter(e5.detail.value);
      this.setTableFilter(e5.detail.col, e5.detail.value);
      this.ctrl.setFilter(e5.detail.col, e5.detail.value);
    }}
        >
          <!-- Formulario de alta: el botón "+" del data-table despliega este acordeón. -->
          <form slot="create" class="form" data-testid="inventory-products-form" @submit=${(e5) => this.createProduct(e5)}>
            ${this.editingId ? b2`<div class="drow" style="align-items:center;">
                  ${this.editTitleInHeader ? A : b2`<b data-testid="inventory-products-editing">${erplora4().t(CATALOG4, "ui.editingTitle")} — ${this.newName}</b>`}
                  <ion-button data-testid="inventory-products-edit-cancel" size="small" fill="clear" @click=${() => this.cancelEdit()}>
                    ${erplora4().t(CATALOG4, "ui.editingCancel")}
                  </ion-button>
                </div>` : A}
            <ion-input mode="md"
              data-testid="inventory-products-name"
              fill="outline"
              label=${erplora4().t(CATALOG4, "ui.name")}
              label-placement="floating"
              .value=${this.newName}
              @ionInput=${(e5) => this.newName = e5.target.value}
            ></ion-input>
            <ion-input mode="md"
              data-testid="inventory-products-sku"
              fill="outline"
              label="SKU"
              label-placement="floating"
              .value=${this.newSku}
              .disabled=${!!this.editingId}
              helper-text=${this.editingId ? erplora4().t(CATALOG4, "ui.skuIdentity") : ""}
              @ionInput=${(e5) => this.newSku = e5.target.value}
            ></ion-input>
            <ion-input mode="md"
              data-testid="inventory-products-price"
              fill="outline"
              label=${erplora4().t(CATALOG4, "ui.price")}
              label-placement="floating"
              type="text" inputmode="decimal"
              .value=${this.newPrice}
              @ionInput=${(e5) => this.newPrice = e5.target.value}
              @ionBlur=${() => this.newPrice = normaliseMoneyField(this.newPrice)}
            ></ion-input>
            <ion-input mode="md"
              data-testid="inventory-products-cost"
              fill="outline"
              label=${`${erplora4().t(CATALOG4, "ui.fieldCost")} (${erplora4().currency})`}
              label-placement="floating"
              type="text" inputmode="decimal"
              .value=${this.newCost}
              @ionInput=${(e5) => this.newCost = e5.target.value}
              @ionBlur=${() => this.newCost = normaliseMoneyField(this.newCost)}
            ></ion-input>
            ${!this.editingId ? b2`<ion-input mode="md"
                  data-testid="inventory-products-initial-stock"
                  fill="outline"
                  label=${erplora4().t(CATALOG4, "ui.fieldInitialStock")}
                  label-placement="floating"
                  type="number" .step=${this.quantityStep(this.newUnitCode)} min="0"
                  .value=${this.newStock}
                  @ionInput=${(e5) => this.newStock = e5.target.value}
                ></ion-input>` : A}
            <ion-input mode="md"
              data-testid="inventory-products-threshold"
              fill="outline"
              label=${erplora4().t(CATALOG4, "ui.fieldThreshold")}
              label-placement="floating"
              type="number" .step=${this.quantityStep(this.newUnitCode)} min="0"
              .value=${this.newThreshold}
              @ionInput=${(e5) => this.newThreshold = e5.target.value}
            ></ion-input>
            <ion-input mode="md"
              data-testid="inventory-products-ean13"
              fill="outline"
              label="EAN-13"
              label-placement="floating"
              maxlength="13"
              .value=${this.newEan}
              @ionInput=${(e5) => this.newEan = e5.target.value}
            ></ion-input>
            <ion-input mode="md"
              data-testid="inventory-products-description"
              fill="outline"
              label=${erplora4().t(CATALOG4, "ui.fieldDescription")}
              label-placement="floating"
              .value=${this.newDescription}
              @ionInput=${(e5) => this.newDescription = e5.target.value}
            ></ion-input>
            ${!this.editingId ? b2`<ion-select mode="md"
                  data-testid="inventory-products-type"
                  fill="outline"
                  label-placement="floating"
                  label=${erplora4().t(CATALOG4, "ui.fieldType")}
                  .value=${this.newType}
                  @ionChange=${(e5) => this.newType = e5.target.value === "service" ? "service" : "physical"}
                >
                  <ion-select-option value="physical">${erplora4().t(CATALOG4, "ui.typePhysical")}</ion-select-option>
                  <ion-select-option value="service">${erplora4().t(CATALOG4, "ui.typeService")}</ion-select-option>
                </ion-select>` : A}
            ${this.newType !== "service" ? b2`<!-- Stock control PER ITEM (inventory#48): the market's checkbox
                          (Square «Track stock», Odoo «Track Inventory», Shopify «Track quantity»).
                          Shows the EFFECTIVE value; touching it makes the choice explicit. -->
                  <ion-checkbox
                    data-testid="inventory-products-track-stock"
                    label-placement="end"
                    justify="start"
                    .checked=${this.trackStockEffective()}
                    @ionChange=${(e5) => this.setTrackStock(!!e5.detail.checked)}
                  >${erplora4().t(CATALOG4, "ui.fieldTrackStock")}</ion-checkbox>
                  <ion-note class="track-note">
                    ${this.newTrackStock == null ? erplora4().t(CATALOG4, "ui.trackStockInherit") : this.newTrackStock === 0 ? erplora4().t(CATALOG4, "ui.trackStockOff") : A}
                  </ion-note>` : A}
            <ion-select mode="md"
              data-testid="inventory-products-unit"
              fill="outline"
              label-placement="floating"
              interface="popover"
              label=${erplora4().t(CATALOG4, "ui.fieldUnit")}
              .value=${this.newUnitCode}
              @ionChange=${(e5) => this.newUnitCode = e5.target.value || "ud"}
            >
              ${this.unitOptions()}
            </ion-select>
            <!-- Categoría fiscal: campo OBLIGATORIO (inventory#38), no un asterisco decorativo.
                 Sin catálogo de categorías no hay nada que elegir, así que se dice en vez de
                 dejar guardar un producto que después nadie puede cobrar. -->
            <ion-select mode="md"
              data-testid="inventory-products-tax-category"
              fill="outline"
              label-placement="floating"
              required
              label=${erplora4().t(CATALOG4, "ui.fieldTaxCategory")}
              placeholder=${erplora4().t(CATALOG4, "ui.taxCategoryPlaceholder")}
              .value=${this.newTaxCategoryKey}
              @ionChange=${(e5) => this.newTaxCategoryKey = e5.target.value}
            >
              ${this.taxOptions()}
            </ion-select>
            ${this.taxCategories.length === 0 ? b2`<ok-inline-feedback data-testid="inventory-products-tax-none" tone="warning" icon="alert-circle-outline">
                  ${erplora4().t(CATALOG4, "ui.taxNoneAvailable")}
                </ok-inline-feedback>` : A}
            ${this.productCategories.length ? b2`<ion-select mode="md"
                  data-testid="inventory-products-categories"
                  fill="outline"
                  label-placement="floating"
                  label=${erplora4().t(CATALOG4, "ui.fieldCategories")}
                  .multiple=${true}
                  .value=${[...this.selectedCategoryIds]}
                  @ionChange=${(e5) => {
      const v3 = e5.detail.value ?? [];
      this.selectedCategoryIds = new Set(v3);
    }}
                >
                  ${this.productCategories.map(
      (c5) => b2`<ion-select-option .value=${c5.id}>${c5.name}</ion-select-option>`
    )}
                </ion-select>` : A}
            <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen
                 sheet and a banner on the page underneath it is never seen. -->
            ${this.formError ? b2`<ok-inline-feedback data-testid="inventory-products-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
            <ion-button data-testid="inventory-products-submit" type="submit" ?disabled=${this.saving || !this.newName || !this.newSku || !this.newTaxCategoryKey}>
              ${this.saving ? erplora4().t(CATALOG4, "ui.saving") : this.editingId ? erplora4().t(CATALOG4, "ui.saveChanges") : erplora4().t(CATALOG4, "ui.save")}
            </ion-button>
          </form>
        </ok-data-table>

        <ion-modal
          .isOpen=${!!this.detail}
          @ionModalDidDismiss=${() => {
      this.detail = null;
      this.printError = "";
    }}
        >
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-title>${this.detail?.name ?? ""}</ion-title>
              <ion-buttons slot="end">
                <ion-button data-testid="inventory-products-detail-close" aria-label=${erplora4().t(CATALOG4, "ui.btnClose")} @click=${() => {
      this.detail = null;
      this.printError = "";
    }}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            ${this.detail ? b2`
                  <!-- Auto-estilado (reparent a <body>): las clases .detail/.drow/.barcode del
                       shadow NO llegan aquí — Ionic puro + estilos inline para el barcode. -->
                  <ion-list lines="full">
                    <ion-item>
                      <ion-label>SKU</ion-label>
                      <ion-note slot="end">${this.detail.sku}</ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>${t5("ui.price")}</ion-label>
                      <ion-note slot="end">${erplora4().formatMoney(Number(this.detail.price))}</ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>${t5("ui.stock")}</ion-label>
                      <ion-note slot="end">${formatQuantity2(this.detail.stock)}</ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>${t5("ui.status")}</ion-label>
                      <ion-note
                        slot="end"
                        style=${ionTone("text", this.productStatus(this.detail).id === "unconfigured" ? "warning" : "medium")}
                      >
                        ${this.productStatus(this.detail).label}
                        ${this.productStatus(this.detail).reason}
                      </ion-note>
                    </ion-item>
                  </ion-list>
                  <!-- Placa BLANCA con barras negras SIEMPRE, en los dos temas (inventory#45): sin
                       fondo propio heredaba el del modal (oscuro) y quedaba negro sobre negro,
                       ilegible para cualquier escáner. Inline porque el modal está reparentado. -->
                  <div style="text-align:center; margin:1rem 0; padding:1rem; border:1px solid #d7d2c8; border-radius:10px; background:#fff; color:#000;">
                    ${this.renderBarcode(this.detail.sku)}
                    <div style="font:14px ui-monospace,monospace; margin-top:.4rem; letter-spacing:.08em; color:#000;">${this.detail.sku}</div>
                  </div>
                  ${this.printError ? b2`<ok-inline-feedback data-testid="inventory-products-print-error" tone="danger" icon="alert-circle-outline">${this.printError}</ok-inline-feedback>` : A}
                  <ion-button data-testid="inventory-products-print-barcode" expand="block" @click=${() => this.detail && void this.printBarcode(this.detail)}>
                    <ion-icon name="print-outline" slot="start"></ion-icon> ${t5("ui.printBarcode")}
                  </ion-button>
                  <!-- inventory#108: the stock actions are also here, with text, not only as row icons. -->
                  ${can2("inventory.adjust_stock") ? b2`
                        <ion-button data-testid="inventory-products-detail-receive" expand="block" fill="outline" @click=${() => this.detail && this.openReceive(this.detail)}>
                          <ion-icon name="download-outline" slot="start"></ion-icon> ${t5("ui.actionReceive")}
                        </ion-button>
                        <ion-button data-testid="inventory-products-detail-count" expand="block" fill="outline" @click=${() => this.detail && this.openCount(this.detail)}>
                          <ion-icon name="calculator-outline" slot="start"></ion-icon> ${t5("ui.actionCount")}
                        </ion-button>
                      ` : A}
                ` : A}
          </ion-content>
        </ion-modal>
        ${this.renderDeleteModal()}
        ${this.renderCountModal()}
        ${this.renderReceiveModal()}
        ${this.renderPreviewModal()}
        ${this.renderImportModal()}
        ${this.renderImportReportModal()}
      </div>
    `;
  }
  /**
   * Vista previa del CSV: qué columna es qué, cómo quedan las primeras filas y cuántas están
   * listas — antes de crear NADA (inventory#13).
   *
   * Copiado de donde ya funciona: el desplegable por columna con «no importar» es de WooCommerce y
   * Lightspeed (que además no dejan seguir sin las obligatorias, la regla del botón de abajo); el
   * ensayo que cuenta filas listas y problemas es el «Test import» de Odoo; el resumen antes de
   * confirmar, de Shopify. Nada de esto se ha inventado aquí.
   */
  renderPreviewModal() {
    if (!this.previewOpen) return b2`<ion-modal .isOpen=${false}></ion-modal>`;
    const t5 = (k2, p4) => erplora4().t(CATALOG4, k2, p4);
    const headers = Object.keys(this.previewRows[0] ?? {});
    const summary = this.previewSummary;
    const fieldLabel = {
      name: t5("ui.name"),
      sku: t5("ui.sku"),
      price: t5("ui.price"),
      cost: t5("ui.fieldCost"),
      stock: t5("ui.stock"),
      low_stock_threshold: t5("ui.fieldThreshold"),
      ean13: "EAN-13",
      description: t5("ui.fieldDescription"),
      unit_code: t5("ui.fieldUnit"),
      tax: t5("ui.fieldTaxCategory")
    };
    return b2`
      <ion-modal .isOpen=${this.previewOpen} @ionModalDidDismiss=${() => this.cancelPreview()}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t5("ui.previewTitle")}</ion-title>
            <ion-buttons slot="end">
              <ion-button data-testid="inventory-products-preview-close" aria-label=${t5("ui.btnCancel")} @click=${() => this.cancelPreview()}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <!-- Auto-estilado (el modal se reparenta a <body> y el CSS del shadow no llega): Ionic
             puro + estilos inline. -->
        <ion-content class="ion-padding">
          <p style="margin:0 0 .75rem">${t5("ui.previewHint")}</p>
          <ion-list lines="full">
            ${headers.map(
      (h4) => b2`<ion-item>
                <ion-select
                  data-testid=${`inventory-products-preview-column-${h4}`}
                  label=${h4}
                  label-placement="stacked"
                  .value=${this.previewMapping[h4] ?? ""}
                  @ionChange=${(e5) => {
        const field = e5.target.value;
        const next = { ...this.previewMapping };
        if (field) {
          for (const k2 of Object.keys(next)) if (next[k2] === field) next[k2] = "";
        }
        next[h4] = field;
        this.previewMapping = next;
      }}
                >
                  <ion-select-option value="">${t5("ui.previewIgnore")}</ion-select-option>
                  ${IMPORT_FIELDS.map(
        (f3) => b2`<ion-select-option .value=${f3}>${fieldLabel[f3]}${IMPORT_REQUIRED.includes(f3) ? " *" : ""}</ion-select-option>`
      )}
                </ion-select>
              </ion-item>`
    )}
          </ion-list>

          <h3 style="margin:1rem 0 .35rem; font-size:.95rem">${t5("ui.previewRowsTitle", { n: Math.min(PREVIEW_ROWS, this.previewRows.length), total: this.previewRows.length })}</h3>
          <!-- La tabla scrollea SOLA en horizontal: un CSV de 15 columnas no puede empujar el
               modal fuera de la pantalla de una tablet. -->
          <div style="overflow-x:auto; -webkit-overflow-scrolling:touch">
            <table style="border-collapse:collapse; font-size:.85rem; min-width:100%">
              <thead>
                <tr>${headers.map((h4) => b2`<th style="text-align:left; padding:.3rem .5rem; white-space:nowrap; border-bottom:1px solid var(--ion-color-step-200,#d7d2c8)">${this.previewMapping[h4] ? fieldLabel[this.previewMapping[h4]] : b2`<s>${h4}</s>`}</th>`)}</tr>
              </thead>
              <tbody>
                ${this.previewRows.slice(0, PREVIEW_ROWS).map(
      (r6) => b2`<tr>${headers.map((h4) => b2`<td style="padding:.3rem .5rem; white-space:nowrap; border-bottom:1px solid var(--ion-color-step-100,#eee)">${r6[h4] ?? ""}</td>`)}</tr>`
    )}
              </tbody>
            </table>
          </div>

          ${this.previewReady ? b2`<ok-inline-feedback
                data-testid="inventory-products-preview-summary"
                class="ion-margin-top"
                tone=${summary.failed.length ? "warning" : "success"}
                icon=${summary.failed.length ? "alert-circle-outline" : "checkmark-outline"}
              >
                ${t5("ui.previewSummary", { ready: summary.ready, failed: summary.failed.length })}
                ${summary.failed.length ? b2`<ul style="margin:.3rem 0 0; padding-left:1.1rem">
                      ${summary.failed.slice(0, 10).map((f3) => b2`<li>${t5("ui.importLine")} ${f3.line}: ${f3.reason}</li>`)}
                    </ul>` : A}
              </ok-inline-feedback>` : b2`<ok-inline-feedback data-testid="inventory-products-preview-missing-required" class="ion-margin-top" tone="danger" icon="alert-circle-outline">
                ${t5("ui.previewMissingRequired")}
              </ok-inline-feedback>`}

          <ion-button
            data-testid="inventory-products-preview-submit"
            class="ion-margin-top"
            expand="block"
            ?disabled=${!this.previewReady || summary.ready === 0}
            @click=${() => void this.confirmPreview()}
          >
            ${t5("ui.previewConfirm", { n: summary.ready })}
          </ion-button>
          <ion-button data-testid="inventory-products-preview-cancel" expand="block" fill="outline" @click=${() => this.cancelPreview()}>${t5("ui.btnCancel")}</ion-button>
        </ion-content>
      </ion-modal>
    `;
  }
  // Informe del import CSV (inventory#13): total/creadas/omitidas/fallidas con línea y
  // motivo, copiable al portapapeles para corregir el fichero y reintentar.
  renderImportReportModal() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    const rep = this.importReport;
    return b2`
      <ion-modal .isOpen=${!!rep} @ionModalDidDismiss=${() => this.importReport = null}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t5("ui.importReportTitle")}</ion-title>
            <ion-buttons slot="end">
              <ion-button data-testid="inventory-products-import-report-close" aria-label=${t5("ui.btnClose")} @click=${() => this.importReport = null}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          ${rep ? b2`
                <!-- Auto-estilado (reparent a <body>): Ionic puro, sin clases del shadow. -->
                ${rep.cancelled ? b2`<ok-inline-feedback data-testid="inventory-products-import-report-cancelled" tone="warning" icon="alert-circle-outline">${t5("ui.importCancelledNote")}</ok-inline-feedback>` : A}
                <ion-list lines="full">
                  <ion-item>
                    <ion-label>${t5("ui.importTotal")}</ion-label>
                    <ion-note slot="end">${rep.total}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>${t5("ui.importCreated")}</ion-label>
                    <ion-note slot="end" style=${ionTone("text", "success")}>${rep.created}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>${t5("ui.importSkipped")}</ion-label>
                    <ion-note slot="end">${rep.skipped}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>${t5("ui.importFailed")}</ion-label>
                    <ion-note slot="end" style=${ionTone("text", rep.failed.length ? "danger" : "success")}>${rep.failed.length}</ion-note>
                  </ion-item>
                </ion-list>
                ${rep.failed.length ? b2`
                      <ion-list class="ion-margin-top" lines="none">
                        ${rep.failed.map(
      (f3) => b2`<ion-item>
                            <ion-label class="ion-text-wrap">
                              <b>${t5("ui.importLine")} ${f3.line}</b> · ${f3.sku || "\u2014"} — ${f3.reason}
                            </ion-label>
                          </ion-item>`
    )}
                      </ion-list>
                      <ion-button data-testid="inventory-products-import-report-copy" class="ion-margin-top" expand="block" fill="outline"
                        @click=${() => navigator.clipboard?.writeText(this.importReportText())}>
                        <ion-icon name="copy-outline" slot="start"></ion-icon>${t5("ui.importCopy")}
                      </ion-button>
                    ` : A}
              ` : A}
        </ion-content>
      </ion-modal>
    `;
  }
  // Confirmación de borrado de producto (P1 QA #6): paridad con el borrado de categorías.
  renderDeleteModal() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return b2`
      <ion-modal .isOpen=${!!this.deleteTarget} @ionModalDidDismiss=${() => this.deleteTarget = null}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t5("ui.deleteProdTitle")}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list lines="none">
            <ion-item>
              <ion-label class="ion-text-wrap">
                <b>${this.deleteTarget?.name ?? ""}</b> (${this.deleteTarget?.sku ?? ""}) — ${t5("ui.deleteProdHint")}
              </ion-label>
            </ion-item>
          </ion-list>
          <ion-button data-testid="inventory-products-delete-submit" class="ion-margin-top" expand="block" style=${ionTone("solid", "danger")} @click=${() => this.confirmDelete()}>
            ${t5("ui.actionDelete")}
          </ion-button>
          <ion-button data-testid="inventory-products-delete-cancel" expand="block" fill="outline" @click=${() => this.deleteTarget = null}>
            ${t5("ui.btnCancel")}
          </ion-button>
        </ion-content>
      </ion-modal>
    `;
  }
  // Modal de RECUENTO (inventory#7): ajuste absoluto — se enseña la diferencia contra el
  // stock actual ANTES de aplicar, y el motivo es obligatorio (lo exige también el schema).
  /**
   * Qué le falta al recuento para poder aplicarse, como clave i18n — o `null` si no le falta nada
   * (inventory#59). Se nombra UN solo motivo, el primero que hay que resolver: una lista de todo lo
   * que falta es más texto y menos acción. `null` cuando el botón está activo, para no dejar una
   * nota colgando que ya no explica nada.
   */
  countBlockedReason() {
    if (this.countDifference === null) return "ui.countNeedsQty";
    if (this.countReason.trim() === "") return "ui.countNeedsReason";
    return null;
  }
  renderCountModal() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    const diff = this.countDifference;
    return b2`
      <ion-modal .isOpen=${!!this.countTarget} @ionModalDidDismiss=${() => this.countTarget = null}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t5("ui.countTitle")} — ${this.countTarget?.name ?? ""}</ion-title>
            <ion-buttons slot="end">
              <ion-button data-testid="inventory-products-count-close" aria-label=${t5("ui.btnClose")} @click=${() => this.countTarget = null}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <!-- OJO: ion-modal se re-aparenta a <body> y PIERDE el CSS del shadow del
               componente — el contenido debe AUTO-ESTILARSE (Ionic puro + ion-margin-*),
               nunca clases propias (.detail/.drow). Patrón de la casa (sales-list). -->
          <ion-list lines="full">
            <ion-item>
              <ion-label>${t5("ui.countCurrent")}</ion-label>
              <ion-note slot="end">${formatQuantity2(this.countTarget?.stock ?? 0)}</ion-note>
            </ion-item>
            ${diff !== null ? b2`<ion-item>
                  <ion-label>${t5("ui.countDiff")}</ion-label>
                  <ion-note slot="end" style=${ionTone("text", diff < 0 ? "danger" : "success")}>${diff > 0 ? `+${diff}` : diff}</ion-note>
                </ion-item>` : A}
          </ion-list>
          <ion-input mode="md" data-testid="inventory-products-count-qty" class="ion-margin-top" fill="outline" label-placement="floating" label=${t5("ui.countNew")}
            type="number" .step=${this.quantityStep(this.countTarget?.unit_code)} min="0" inputmode="decimal"
            .value=${this.countValue}
            @ionInput=${(e5) => this.countValue = String(e5.detail.value ?? "")}
          ></ion-input>
          <ion-input mode="md" data-testid="inventory-products-count-reason" class="ion-margin-top" fill="outline" label-placement="floating" label=${t5("ui.countReason")}
            .value=${this.countReason} required
            @ionInput=${(e5) => this.countReason = String(e5.detail.value ?? "")}
          ></ion-input>
          ${this.stockError ? b2`<ok-inline-feedback data-testid="inventory-products-count-error" class="ion-margin-top" tone="danger" icon="alert-circle-outline">${this.stockError}</ok-inline-feedback>` : A}
          <ion-button data-testid="inventory-products-count-submit" class="ion-margin-top" expand="block" .disabled=${diff === null || this.countReason.trim() === ""}
            @click=${() => this.submitCount()}>
            ${t5("ui.countApply")}
          </ion-button>
          <!-- Por qué está en gris (inventory#59). Un botón desactivado sin explicación deja al
               operario mirando el modal sin saber qué le falta; con las cajas ya visibles, esto
               cierra el hueco nombrando el campo que falta en vez de callar. -->
          ${this.countBlockedReason() ? b2`<ion-note class="ion-margin-top" style=${`display:block;text-align:center;${ionTone("text", "medium")}`}>
                ${t5(this.countBlockedReason())}
              </ion-note>` : A}
        </ion-content>
      </ion-modal>
    `;
  }
  // Modal de RECEPCIÓN (inventory#7): entrada de mercancía por producto (qty decimal —
  // #10 — y coste unitario en euros → céntimos). El movimiento `reception` lo deja el SQL.
  renderReceiveModal() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return b2`
      <ion-modal .isOpen=${!!this.receiveTarget} @ionModalDidDismiss=${() => this.receiveTarget = null}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t5("ui.receiveTitle")} — ${this.receiveTarget?.name ?? ""}</ion-title>
            <ion-buttons slot="end">
              <ion-button data-testid="inventory-products-receive-close" aria-label=${t5("ui.btnClose")} @click=${() => this.receiveTarget = null}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <!-- Auto-estilado (ver nota del modal de recuento): el reparent a <body> mata el CSS del shadow. -->
          <ion-list lines="full">
            <ion-item>
              <ion-label>${t5("ui.countCurrent")}</ion-label>
              <ion-note slot="end">${formatQuantity2(this.receiveTarget?.stock ?? 0)}</ion-note>
            </ion-item>
          </ion-list>
          <ion-input mode="md" data-testid="inventory-products-receive-qty" class="ion-margin-top" fill="outline" label-placement="floating" label=${t5("ui.receiveQty")}
            type="number" .step=${this.quantityStep(this.receiveTarget?.unit_code)} min="0.000001" inputmode="decimal"
            .value=${this.receiveQty}
            @ionInput=${(e5) => this.receiveQty = String(e5.detail.value ?? "")}
          ></ion-input>
          <ion-input mode="md" data-testid="inventory-products-receive-cost" class="ion-margin-top" fill="outline" label-placement="floating" label=${`${t5("ui.receiveCost")} (${erplora4().currency})`}
            type="text" inputmode="decimal"
            .value=${this.receiveCost}
            @ionInput=${(e5) => this.receiveCost = String(e5.detail.value ?? "")}
            @ionBlur=${() => this.receiveCost = normaliseMoneyField(this.receiveCost)}
          ></ion-input>
          ${this.stockError ? b2`<ok-inline-feedback data-testid="inventory-products-receive-error" class="ion-margin-top" tone="danger" icon="alert-circle-outline">${this.stockError}</ok-inline-feedback>` : A}
          <ion-button data-testid="inventory-products-receive-submit" class="ion-margin-top" expand="block" .disabled=${this.receiveQty.trim() === ""}
            @click=${() => this.submitReceive()}>
            ${t5("ui.receiveApply")}
          </ion-button>
        </ion-content>
      </ion-modal>
    `;
  }
};
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newName", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newSku", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newPrice", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newTaxCategoryKey", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newCost", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newStock", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newThreshold", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newEan", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newDescription", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newType", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newActive", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newTrackStock", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "hubTracksStock", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "newUnitCode", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "units", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "editingId", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "editTitleInHeader", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "selectedCategoryIds", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "productCategories", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "taxCategories", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "taxRates", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "pageError", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "importOpen", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "importRows", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "importMap", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "importUnresolved", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "importChoice", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "deleteTarget", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "importReport", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "previewOpen", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "previewRows", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "previewMapping", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "importProgress", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "tableFilters", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "detail", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "printError", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "countTarget", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "countValue", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "countReason", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "receiveTarget", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "receiveQty", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "receiveCost", 2);
__decorateClass([
  r5()
], ErpInventoryProducts.prototype, "stockError", 2);
define("erp-inventory-products", ErpInventoryProducts);
