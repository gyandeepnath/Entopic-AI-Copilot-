/* ═══════════════════════════════════════════════════════════════ */
/* ACCESSIBILITY BRIDGE                                             */
/*                                                                  */
/* Phase 9 measured the LIVE exam screen in a real browser and found */
/* two WCAG 2.2 AA blockers — not style issues, blockers:            */
/*                                                                  */
/*   1. 9 of 9 visible form controls had NO programmatic label.      */
/*      Every one has a visible <label> next to it, but as a sibling */
/*      with no `for`, so a screen reader announces "edit text" with */
/*      no idea whether it is the patient's name or their IOP.       */
/*      (WCAG 1.3.1 / 3.3.2. A placeholder is explicitly not a       */
/*      label — it also vanishes the moment you type.)               */
/*                                                                  */
/*   2. 31 clickable elements were <div>/<span> with onclick and no  */
/*      tabindex — including the ENTIRE 22-step exam navigation.     */
/*      A keyboard-only or switch-device user could not move between */
/*      exam steps at all. (WCAG 2.1.1.) That is a critical clinical */
/*      workflow made unreachable, which is the exact question this  */
/*      phase asks about accessibility.                              */
/*                                                                  */
/* ── WHY THIS IS A RUNTIME PASS AND NOT 500 EDITS ──                */
/*                                                                  */
/* The UI is built by string concatenation with no build step, and   */
/* the pattern is remarkably consistent: 169 <label> elements and    */
/* 132 `<div class="fi"><label>X</label><control></div>` wrappers.   */
/* Hand-editing every one would touch thousands of lines of quoted   */
/* markup across a dozen files, risk typos in clinical forms, and do */
/* nothing for the next form somebody writes the same way.           */
/*                                                                   */
/* One observer fixes every current form AND every future one, in    */
/* ~100 lines, and can be deleted wholesale if the markup is ever    */
/* rewritten properly. That is the right size for this codebase.     */
/*                                                                   */
/* ── WHAT IT DELIBERATELY DOES NOT DO ──                            */
/*                                                                   */
/* It changes NO pixels. No colours, no spacing, no layout, no text. */
/* It adds only: id/for associations, aria-label where a control has */
/* no visible label, role/tabindex on things that were already       */
/* clickable, and Enter/Space activation that calls the SAME onclick */
/* the mouse already calls. It never invents an accessible name from */
/* nothing, and it never adds ARIA where semantic HTML already works */
/* (an existing <button> is left completely alone).                  */
/*                                                                   */
/* Load order: after the UI modules, before app.js boots.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

(function () {
  if (typeof document === "undefined" || !document.querySelectorAll) return;

  var DONE = "data-a11y";          /* idempotence marker — never process twice */
  var seq = 0;

  function nextId(prefix) { seq++; return prefix + "-a11y-" + seq; }

  /* ── 1. Associate every visible label with its control ──
     The markup is `<div class="fi"><label>Age *</label><input ...></div>`.
     Wiring `for`/`id` is preferred over aria-label because it also makes the
     visible text a CLICK TARGET for the control, which helps everyone using a
     mouse or a touchscreen, not only screen-reader users. */
  function linkLabels(root) {
    var labels = root.querySelectorAll("label:not([" + DONE + "])");
    for (var i = 0; i < labels.length; i++) {
      var lab = labels[i];
      lab.setAttribute(DONE, "1");
      if (lab.getAttribute("for")) continue;          /* already correct */
      if (lab.querySelector("input,select,textarea")) continue;  /* wrapping label */

      /* The control this label describes: the next control inside the same
         field wrapper. Scoped to the wrapper so a label can never capture a
         control belonging to a different field. */
      var wrap = lab.parentElement;
      if (!wrap) continue;
      var ctl = wrap.querySelector("input,select,textarea");
      if (!ctl) continue;
      if (ctl.type === "hidden") continue;

      if (!ctl.id) ctl.id = nextId(ctl.tagName.toLowerCase());
      lab.setAttribute("for", ctl.id);
    }
  }

  /* ── 2. Give any still-unlabelled control an accessible name ──
     Only from text that is ALREADY on screen for that control — a placeholder
     or a title. If there is nothing, it is left alone and reported by the
     audit rather than given an invented name, because a wrong label is worse
     than a missing one: it tells a clinician the field is something it isn't. */
  function nameOrphans(root) {
    var ctls = root.querySelectorAll(
      "input:not([" + DONE + "]),select:not([" + DONE + "]),textarea:not([" + DONE + "])");
    for (var i = 0; i < ctls.length; i++) {
      var el = ctls[i];
      el.setAttribute(DONE, "1");
      if (el.type === "hidden") continue;
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) continue;
      if (el.id && document.querySelector('label[for="' + el.id + '"]')) continue;
      if (el.closest && el.closest("label")) continue;

      var name = el.getAttribute("placeholder") || el.getAttribute("title") || "";
      if (name) el.setAttribute("aria-label", name);
    }
  }

  /* ── 3. Make already-clickable elements keyboard-operable ──
     These elements ALREADY respond to a mouse; this only makes the same
     action reachable from a keyboard. Enter/Space call .click(), so the exact
     same onclick handler runs — no behaviour is duplicated or re-implemented,
     which matters because several of these call nav() into the clinical flow. */
  function keyboardEnable(root) {
    var els = root.querySelectorAll("[onclick]:not([" + DONE + "])");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.setAttribute(DONE, "1");
      var tag = el.tagName;
      /* Native controls are already keyboard-operable. Leave them exactly as
         they are — adding role/tabindex to a <button> is the "blindly add
         ARIA" mistake this phase was told not to make. */
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT" ||
          tag === "SELECT" || tag === "TEXTAREA") continue;
      if (el.getAttribute("tabindex") !== null) continue;

      el.setAttribute("tabindex", "0");
      if (!el.getAttribute("role")) el.setAttribute("role", "button");
    }
  }

  /* One delegated key handler for the whole document rather than one per
     element: it cannot accumulate as panels re-render, which is the listener
     leak this app's full-panel innerHTML rendering would otherwise invite. */
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
    var el = ev.target;
    if (!el || !el.getAttribute) return;
    if (el.getAttribute("role") !== "button") return;
    if (!el.hasAttribute("onclick")) return;
    /* Space scrolls the page by default; Enter submits forms. Both are wrong
       for something acting as a button. */
    ev.preventDefault();
    el.click();
  });

  function pass(root) {
    if (!root || root.nodeType !== 1) return;
    try {
      linkLabels(root);
      nameOrphans(root);
      keyboardEnable(root);
    } catch (e) {
      /* Accessibility wiring must never be able to break a clinical screen. */
      if (typeof console !== "undefined" && console.error) console.error("a11y pass failed", e);
    }
  }

  function runAll() { pass(document.body); }

  /* Re-apply after every render. The app replaces whole panels via innerHTML,
     so new controls appear constantly; an observer catches them all without
     every render function having to remember to call anything.

     Batched on the microtask queue: a single render can produce hundreds of
     mutation records, and processing each one separately would do the same
     work hundreds of times. The DONE marker makes repeat passes cheap. */
  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    (typeof Promise !== "undefined" ? Promise.resolve().then.bind(Promise.resolve())
                                    : function (f) { setTimeout(f, 0); })(function () {
      queued = false;
      runAll();
    });
  }

  if (typeof MutationObserver === "function") {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].addedNodes && records[i].addedNodes.length) { schedule(); return; }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runAll);
  } else {
    runAll();
  }

  /* Exposed so tests and the audit probe can force a pass deterministically
     rather than waiting on the observer. */
  if (typeof window !== "undefined") window.a11yPass = runAll;
})();
