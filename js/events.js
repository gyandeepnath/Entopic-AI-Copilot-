/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DOMAIN EVENT BUS                                      */
/*                                                                  */
/* Forty lines that let a lower layer report something happened     */
/* without knowing who cares.                                       */
/*                                                                  */
/* Why this exists                                                  */
/* ──────────────                                                   */
/* The architecture review found the layering was real and mostly   */
/* respected, with a handful of places where it inverted: the       */
/* storage layer built its own DOM banners, and the sync layer      */
/* called renderHome() by name. Both work. Both mean the bottom of  */
/* the stack has a compile-time dependency on the top of it, so     */
/* storage cannot be tested, reused or replaced without dragging a  */
/* browser and a specific screen along with it.                     */
/*                                                                  */
/* The fix is not a framework. It is this: the lower layer states a */
/* fact ("this store is corrupt"), and whoever is responsible for   */
/* telling the clinician subscribes to it.                          */
/*                                                                  */
/* Deliberately NOT included                                        */
/* ────────────────────────                                         */
/*  - No async/microtask dispatch. Handlers run synchronously, in   */
/*    subscription order, so a corrupt-store warning is on screen   */
/*    before the next line of the caller runs. A deferred banner is */
/*    a banner the clinician might not see before they act.         */
/*  - No wildcards, no namespacing, no priorities, no once(). When  */
/*    something here needs them, add them then.                     */
/*                                                                  */
/* A throwing handler must never take down the thing that emitted   */
/* the event — a broken banner cannot be allowed to break saving.   */
/*                                                                  */
/* Load order: FIRST, alongside data-classification.js. Anything    */
/* may emit.                                                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var _evHandlers = {};

/* Subscribe. Returns an unsubscribe function. */
function evOn(name, fn) {
  if (typeof fn !== "function") return function () {};
  if (!_evHandlers[name]) _evHandlers[name] = [];
  _evHandlers[name].push(fn);
  return function () { evOff(name, fn); };
}

function evOff(name, fn) {
  var list = _evHandlers[name];
  if (!list) return;
  var i = list.indexOf(fn);
  if (i >= 0) list.splice(i, 1);
}

/* Announce that something happened. Returns how many handlers ran.
   Never throws: the emitter is usually a save path, and a listener's bug
   must not become a lost record. */
function evEmit(name, payload) {
  var list = _evHandlers[name];
  if (!list || !list.length) return 0;
  var ran = 0;
  /* Copy first — a handler may unsubscribe itself while we iterate. */
  var snapshot = list.slice();
  for (var i = 0; i < snapshot.length; i++) {
    try {
      snapshot[i](payload);
      ran++;
    } catch (e) {
      try {
        console.error("Entopic: a handler for '" + name + "' threw. " +
          "The event was still delivered to the others.", e);
      } catch (e2) { /* console itself is unavailable */ }
    }
  }
  return ran;
}

/* Test/diagnostic helper: how many handlers a given event has. */
function evCount(name) {
  return (_evHandlers[name] || []).length;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { evOn: evOn, evOff: evOff, evEmit: evEmit, evCount: evCount };
}
