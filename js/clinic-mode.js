/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINIC DEPLOYMENT MODE                                */
/*                                                                  */
/* Entopic's sign-in was built for a single-owner laptop and for     */
/* teaching installs: anyone may create an account, a session lasts  */
/* until the tab closes, and wrong passwords may be tried forever.   */
/* On a shared consulting-room terminal holding real patient records */
/* each of those is a way in. The production-readiness audit         */
/* (2026-07-30) rated the first two deployment blockers.             */
/*                                                                  */
/* Rather than bolt on a settings screen per protection, this is ONE */
/* switch the practice turns on before the terminal sees a patient:  */
/*                                                                  */
/*   • self-signup is closed — the admin creates staff accounts      */
/*   • the session auto-locks after an idle period (work is SAVED    */
/*     first, then the screen is locked — nothing in progress is     */
/*     lost, the clinician just signs back in)                       */
/*                                                                  */
/* Login throttling is NOT behind the switch — it is always on,      */
/* because slowing down repeated wrong passwords has no downside for */
/* any install.                                                      */
/*                                                                  */
/* Deliberately NOT what this is: it does not encrypt local storage  */
/* and does not turn the sign-in screen into real access control.    */
/* Anyone with the device's filesystem can still read the records    */
/* (see the audit's B-4). This raises the bar at the keyboard; full  */
/* at-rest protection needs OS disk encryption plus the record-store */
/* migration the audit scopes separately. Saying so plainly matters  */
/* more than appearing to have solved it.                            */
/*                                                                  */
/* Pure core first (Node-testable); DOM/timer wiring guarded below.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CLINIC_MODE_KEY = "entopic_clinic_mode";
var CLINIC_LOCK_MINUTES_KEY = "entopic_clinic_lock_minutes";
var CLINIC_LOCK_DEFAULT_MIN = 15;

/* ── The switch ──────────────────────────────────────────────────
   Off by default so existing teaching/demo installs behave exactly as
   they did. The admin panel surfaces it with a "turn this on before
   seeing patients" prompt. */
function clinicModeOn() {
  try { return localStorage.getItem(CLINIC_MODE_KEY) === "1"; } catch (e) { return false; }
}

function clinicModeSet(on) {
  try { localStorage.setItem(CLINIC_MODE_KEY, on ? "1" : "0"); } catch (e) {}
  if (typeof logAudit === "function") {
    try { logAudit("clinic_mode_" + (on ? "enabled" : "disabled"),
      "Clinic deployment protections " + (on ? "ON (signup closed, idle lock active)" : "OFF"), {}); } catch (e) {}
  }
  if (typeof clinicIdleReset === "function") clinicIdleReset();
}

function clinicLockMinutes() {
  var n = 0;
  try { n = parseInt(localStorage.getItem(CLINIC_LOCK_MINUTES_KEY), 10); } catch (e) {}
  if (!n || isNaN(n) || n < 1) n = CLINIC_LOCK_DEFAULT_MIN;
  if (n > 240) n = 240;
  return n;
}

function clinicLockMinutesSet(n) {
  n = parseInt(n, 10);
  if (!n || isNaN(n) || n < 1 || n > 240) return false;
  try { localStorage.setItem(CLINIC_LOCK_MINUTES_KEY, String(n)); } catch (e) {}
  if (typeof clinicIdleReset === "function") clinicIdleReset();
  return true;
}

/* ── Self-signup gate ───────────────────────────────────────────
   In clinic mode the "Create new account" path is closed once the
   practice has at least one account. The first account can always be
   created, otherwise a fresh install in clinic mode would be unusable
   (no way in at all). */
function signupAllowed(userCount) {
  if (!clinicModeOn()) return true;
  var n = userCount;
  if (typeof n !== "number") {
    n = (typeof loadUsers === "function") ? loadUsers().length : 0;
  }
  return n === 0;
}


/* ── Login throttling (always on) ────────────────────────────────
   Per-username failure counter with a growing delay. Deliberately
   simple: this is a local browser store, so it cannot be a real
   security boundary against someone with the filesystem — it stops
   someone at the keyboard guessing passwords, which is the realistic
   consulting-room threat. Pure functions so the policy is testable. */
var CLINIC_ATTEMPT_KEY = "entopic_login_attempts";
var CLINIC_LOCKOUT_AFTER = 5;          /* failures before a wait is imposed */
var CLINIC_LOCKOUT_BASE_MS = 15000;    /* 15s, doubling, capped below */
var CLINIC_LOCKOUT_MAX_MS = 15 * 60 * 1000;

function throttleDelayMs(failures) {
  if (failures < CLINIC_LOCKOUT_AFTER) return 0;
  var over = failures - CLINIC_LOCKOUT_AFTER;
  var ms = CLINIC_LOCKOUT_BASE_MS * Math.pow(2, Math.min(over, 10));
  return Math.min(ms, CLINIC_LOCKOUT_MAX_MS);
}

function _throttleLoad() {
  try { return JSON.parse(localStorage.getItem(CLINIC_ATTEMPT_KEY) || "{}") || {}; }
  catch (e) { return {}; }
}
function _throttleSave(map) {
  try { localStorage.setItem(CLINIC_ATTEMPT_KEY, JSON.stringify(map)); } catch (e) {}
}

/* How long this username must wait right now, in ms (0 = may try). */
function loginBlockedFor(username, nowMs) {
  var now = (typeof nowMs === "number") ? nowMs : Date.now();
  var rec = _throttleLoad()[String(username || "").toLowerCase()];
  if (!rec || !rec.n) return 0;
  var wait = throttleDelayMs(rec.n);
  if (!wait) return 0;
  var remain = (rec.last + wait) - now;
  return remain > 0 ? remain : 0;
}

function loginRecordFailure(username, nowMs) {
  var now = (typeof nowMs === "number") ? nowMs : Date.now();
  var map = _throttleLoad();
  var k = String(username || "").toLowerCase();
  var rec = map[k] || { n: 0, last: 0 };
  rec.n++;
  rec.last = now;
  map[k] = rec;
  _throttleSave(map);
  if (rec.n === CLINIC_LOCKOUT_AFTER && typeof logAudit === "function") {
    try { logAudit("login_throttled", "Repeated failed sign-ins for @" + k + " — delays now applied", {}); } catch (e) {}
  }
  return rec.n;
}

function loginClearFailures(username) {
  var map = _throttleLoad();
  delete map[String(username || "").toLowerCase()];
  _throttleSave(map);
}


/* ═══════════════════════════════════════════════════════════════ */
/* IDLE AUTO-LOCK (browser only)                                   */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  var _idleTimer = null;
  var _idleLast = Date.now();

  /* Save first, then lock. doSave() is the same call the autosave timer
     makes, so an in-progress exam is already on disk — locking cannot
     cost the clinician work. */
  function clinicLockNow() {
    try { if (typeof doSave === "function") doSave(); } catch (e) {}
    if (typeof logAudit === "function") {
      try { logAudit("session_auto_locked", "Idle for " + clinicLockMinutes() + " min — session locked", {}); } catch (e) {}
    }
    if (typeof doLogout === "function") doLogout();
    if (typeof toast === "function") {
      toast("Locked after " + clinicLockMinutes() + " min idle. Your work was saved — sign in to continue.");
    }
  }
  window.clinicLockNow = clinicLockNow;

  function clinicIdleTick() {
    if (!clinicModeOn()) return;
    if (typeof CU === "undefined" || !CU) return;       /* nobody signed in */
    var idleMs = Date.now() - _idleLast;
    if (idleMs >= clinicLockMinutes() * 60000) clinicLockNow();
  }

  function clinicIdleReset() {
    _idleLast = Date.now();
  }
  window.clinicIdleReset = clinicIdleReset;

  /* One low-frequency timer + passive activity listeners. Cheap: the
     listeners only stamp a timestamp, the timer does the comparing. */
  function clinicIdleStart() {
    if (_idleTimer) return;
    var events = ["mousedown", "keydown", "touchstart", "wheel", "focus"];
    for (var i = 0; i < events.length; i++) {
      document.addEventListener(events[i], clinicIdleReset, { passive: true, capture: true });
    }
    _idleTimer = setInterval(clinicIdleTick, 20000);   /* 20s granularity is plenty */
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clinicIdleStart);
  } else {
    clinicIdleStart();
  }
}

/* Node/UMD export for tests. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    clinicModeOn: clinicModeOn,
    clinicModeSet: clinicModeSet,
    clinicLockMinutes: clinicLockMinutes,
    clinicLockMinutesSet: clinicLockMinutesSet,
    signupAllowed: signupAllowed,
    throttleDelayMs: throttleDelayMs,
    loginBlockedFor: loginBlockedFor,
    loginRecordFailure: loginRecordFailure,
    loginClearFailures: loginClearFailures,
    CLINIC_LOCKOUT_AFTER: CLINIC_LOCKOUT_AFTER
  };
}
