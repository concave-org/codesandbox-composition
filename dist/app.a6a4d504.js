// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"node_modules/@concave/concave/dist/concave.esm.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runPipeline = exports.html = exports.createStore = exports.createRouter = exports.createRenderer = exports.createPipeline = exports.createComponent = exports.actions = void 0;
const actions = {
  state: 'state',
  routeTo: 'routeTo',
  routeBack: 'routeBack',
  routeNew: 'routeNew',
  pipelineChange: 'pipelineChange',
  appendComponent: 'appendComponent',
  replaceComponent: 'replaceComponent',
  setAttributes: 'setAttributes',
  mounted: 'mounted',
  rerender: 'rerender'
};
exports.actions = actions;

const html = (literals, ...substitutions) => {
  // join arrays for easier usage in app e.g. list rendering
  return String.raw(literals, ...substitutions.map(x => Array.isArray(x) ? x.join('') : x)).replace(/\n\s+/g, '');
};

exports.html = html;
const template = document.createElement('template');

const createComponent = (renderFn, props = {}, hooks = {}, actionReducer) => {
  let oldNode;
  return (action, dispatch) => {
    switch (action.type) {
      case actions.state:
        let {
          h,
          attrs
        } = renderFn(action.value, props);
        template.innerHTML = h;
        let node = template.content.firstChild;
        let renderAction = !oldNode ? actions.appendComponent : !oldNode.isEqualNode(node) ? actions.replaceComponent : null;

        if (renderAction) {
          let toDispatch = [];
          toDispatch.push({
            type: renderAction,
            value: {
              node,
              oldNode
            }
          });
          if (attrs) toDispatch.push({
            type: actions.setAttributes,
            value: attrs
          });
          dispatch(...toDispatch);
          oldNode = node;
        }

        break;

      case actions.pipelineChange:
        oldNode = null;
        break;

      case actions.mounted:
        if (hooks.mounted && oldNode === action.value) hooks.mounted(dispatch);
        break;
    }

    if (actionReducer) actionReducer(action, dispatch);
    return action;
  };
};

exports.createComponent = createComponent;

const createPipeline = (...fns) => (x, dispatch) => fns.reduce((v, f) => f(v, dispatch), x);

exports.createPipeline = createPipeline;

const runPipeline = pipeline => state => {
  let callback;
  const queue = [];
  const corePipeline = pipeline;
  let actualPipeline = pipeline;

  const dispatch = (...actions) => {
    if (callback) callback();
    queue.push(...actions);
  };

  (async function () {
    while (true) {
      while (queue.length > 0) {
        const action = queue.shift();
        if (action.type === actions.pipelineChange) actualPipeline = createPipeline(corePipeline, action.value.pipe);
        actualPipeline(action, dispatch);
      }

      await new Promise(resolve => {
        callback = resolve;
      });
      callback = null;
    }
  })();

  corePipeline({
    type: actions.state,
    value: state
  }, dispatch);
  return dispatch;
};

exports.runPipeline = runPipeline;

const createStore = stateReducer => {
  let state;
  let initialState;
  return (action, dispatch) => {
    switch (action.type) {
      case actions.state:
        if (!initialState) initialState = action.value;
        state = action.value;
        window.history.replaceState(state, null, document.location.href);
        break;

      case actions.pipelineChange:
        // needed to reset the state with a routeBack action
        if (action.value.state) state = action.value.state;
        state._route = action.value.route;
        dispatch({
          type: actions.state,
          value: JSON.parse(JSON.stringify(state))
        });
        break;

      case actions.routeTo:
        state = initialState;
        window.history.pushState(state, null, document.location.origin + action.value);
        break;

      case actions.rerender:
        dispatch({
          type: actions.state,
          value: JSON.parse(JSON.stringify(state))
        });
    }

    stateReducer(JSON.parse(JSON.stringify(state)), action, dispatch);
    return action;
  };
};

exports.createStore = createStore;
const RESOURCE_REGEX = /([^/]+)/g;

const createRouter = initialRoutes => {
  let currentRoute;
  let currentQuery;
  let routes = initialRoutes;

  const getRoute = (path, search) => {
    const query = {};
    const searchParams = new URLSearchParams(search);

    for (const pair of searchParams.entries()) {
      query[pair[0]] = pair[1];
    }

    const pathResources = path.match(RESOURCE_REGEX) || [];
    const preparedRoutes = routes.filter(r => r.path).map(r => ({ ...r,
      resources: r.path.match(RESOURCE_REGEX) || []
    })).filter(r => r.resources.length === pathResources.length);

    for (let route of preparedRoutes) {
      let calcPath = pathResources.map((pr, idx) => pr === route.resources[idx] ? `${pr}` : route.resources[idx][0] === ':' ? `${route.resources[idx]}` : '').join('/');

      if (`/${calcPath}` === route.path) {
        return { ...route,
          params: route.resources.reduce((acc, cur, idx) => cur !== pathResources[idx] ? { ...acc,
            [cur.substring(1)]: pathResources[idx]
          } : acc, {}),
          query
        };
      }
    }

    return null;
  };

  const changePipeline = async (dispatch, state) => {
    const {
      pathname,
      search
    } = document.location;
    const fallbackRoute = routes.find(r => r.fallback);
    const matchedRoute = getRoute(pathname, search); // only do anything when route or search params differ

    if (currentRoute !== pathname || currentQuery !== search) {
      // new route in defined routes?
      if (matchedRoute) {
        currentRoute = pathname;
        currentQuery = search;

        let _module = await matchedRoute.pipe();

        dispatch({
          type: actions.pipelineChange,
          value: {
            pipe: _module.default,
            route: {
              path: matchedRoute.path,
              params: matchedRoute.params,
              query: matchedRoute.query
            },
            state: state
          }
        }); // only dispatch route change if not already on fallback route
      } else if (fallbackRoute && currentRoute !== fallbackRoute.fallback) {
        currentRoute = fallbackRoute.fallback;
        currentQuery = null;
        dispatch({
          type: actions.routeTo,
          value: fallbackRoute.fallback
        });
      }
    }
  };

  return (action, dispatch) => {
    if (!currentRoute) {
      window.addEventListener('popstate', event => dispatch({
        type: actions.routeBack,
        value: event.state
      }));
    }

    switch (action.type) {
      case actions.state:
        if (!currentRoute) changePipeline(dispatch);
        break;

      case actions.routeNew:
        routes = [...routes, ...action.value];
        break;

      case actions.routeTo:
        changePipeline(dispatch);
        window.scrollTo(0, 0);
        break;

      case actions.routeBack:
        changePipeline(dispatch, action.value);
        break;
    }

    return action;
  };
};

exports.createRouter = createRouter;

const createRenderer = parent => {
  return (action, dispatch) => {
    switch (action.type) {
      case actions.appendComponent:
        parent.appendChild(action.value.node); // notify component

        dispatch({
          type: actions.mounted,
          value: action.value.node
        });
        break;

      case actions.replaceComponent:
        // get actual focused element
        let {
          id,
          selectionStart,
          selectionEnd
        } = document.activeElement;
        parent.replaceChild(action.value.node, action.value.oldNode); // set focus on elements with value prop

        if (id) {
          let el = document.getElementById(id);
          if (el.value || el.value === '') el.focus(); // set selection if set before

          if (selectionStart && selectionEnd) el.setSelectionRange(selectionStart, selectionEnd);
        }

        break;

      case actions.pipelineChange:
        while (parent.firstChild) parent.removeChild(parent.firstChild);

        break;

      case actions.setAttributes:
        Object.keys(action.value).forEach(id => {
          let el = document.getElementById(id); // only add event listener when element exists

          if (el) {
            Object.keys(action.value[id]).forEach(attr => {
              let event = attr.startsWith('on') ? attr.substring(2) : null;

              if (event && typeof action.value[id][attr] === 'function') {
                el.addEventListener(event, event => {
                  let result = action.value[id][attr](event, dispatch);
                  if (typeof result === 'object') dispatch(result);
                }, {
                  passive: true
                });
              } else el.setAttribute(attr, action.value[id][attr]);
            });
          }
        });
        break;
    }

    return action;
  };
};

exports.createRenderer = createRenderer;
},{}],"src/renderfns/list.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _concave = require("@concave/concave");

function _templateObject() {
  var data = _taggedTemplateLiteral(["\n    <ul>\n      ", "\n    </ul>\n  "]);

  _templateObject = function _templateObject() {
    return data;
  };

  return data;
}

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var render = function render() {
  var items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return (0, _concave.html)(_templateObject(), items);
};

var _default = render;
exports.default = _default;
},{"@concave/concave":"node_modules/@concave/concave/dist/concave.esm.js"}],"src/renderfns/listItem.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _concave = require("@concave/concave");

function _templateObject() {
  var data = _taggedTemplateLiteral(["\n    <li>", "</li>\n  "]);

  _templateObject = function _templateObject() {
    return data;
  };

  return data;
}

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var render = function render() {
  var text = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return (0, _concave.html)(_templateObject(), text);
};

var _default = render;
exports.default = _default;
},{"@concave/concave":"node_modules/@concave/concave/dist/concave.esm.js"}],"src/components/todo.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _concave = require("@concave/concave");

var _list = _interopRequireDefault(require("../renderfns/list"));

var _listItem = _interopRequireDefault(require("../renderfns/listItem"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _templateObject() {
  var data = _taggedTemplateLiteral(["\n    <main>\n      <article>\n        ", "\n      </article>\n      <article>\n        <input id=\"next\" type=\"text\">\n        <button id=\"add\" style=\"margin-left: 1rem;\">add</button>\n      </article>\n    </main>\n  "]);

  _templateObject = function _templateObject() {
    return data;
  };

  return data;
}

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var props = {
  items: ['Milk', 'Coffee', 'Sugar'],
  next: ''
};

var render = function render(state, props) {
  return {
    h: (0, _concave.html)(_templateObject(), (0, _list.default)(props.items.map(function (item) {
      return (0, _listItem.default)(item);
    }))),
    attrs: {
      next: {
        onchange: function onchange(event) {
          props.next = event.target.value;
        }
      },
      add: {
        onclick: function onclick(event, dispatch) {
          if (props.next !== '') {
            props.items.push(props.next);
            dispatch({
              type: _concave.actions.rerender
            });
          }
        }
      }
    }
  };
};

var hooks = {
  mounted: function mounted(dispatch) {}
};

var _default = (0, _concave.createComponent)(render, props, hooks);

exports.default = _default;
},{"@concave/concave":"node_modules/@concave/concave/dist/concave.esm.js","../renderfns/list":"src/renderfns/list.js","../renderfns/listItem":"src/renderfns/listItem.js"}],"src/pipelines/todo.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _concave = require("@concave/concave");

var _todo = _interopRequireDefault(require("../components/todo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (0, _concave.createPipeline)(_todo.default);

exports.default = _default;
},{"@concave/concave":"node_modules/@concave/concave/dist/concave.esm.js","../components/todo":"src/components/todo.js"}],"src/app.js":[function(require,module,exports) {
"use strict";

var _concave = require("@concave/concave");

var todoPipe = _interopRequireWildcard(require("./pipelines/todo"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

var appStore = (0, _concave.createStore)(function (state, action, dispatch) {
  switch (action.type // ...dispatch state here with new state
  ) {}

  return action;
});
var routes = [{
  path: '/',
  pipe: function pipe() {
    return todoPipe;
  }
}, {
  fallback: '/'
}];
var appRouter = (0, _concave.createRouter)(routes);
var appRender = (0, _concave.createRenderer)(document.getElementById('app'));
var corePipe = (0, _concave.createPipeline)(appStore, appRouter, appRender);
var initialState = {};
(0, _concave.runPipeline)(corePipe)(initialState);
},{"@concave/concave":"node_modules/@concave/concave/dist/concave.esm.js","./pipelines/todo":"src/pipelines/todo.js"}],"node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "41001" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else {
        window.location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["node_modules/parcel-bundler/src/builtins/hmr-runtime.js","src/app.js"], null)
//# sourceMappingURL=/app.a6a4d504.js.map