/* ═══════════════════════════════════════════════════════════════ */
/* AUTOMATIC ARCHIVING                                              */
/*                                                                  */
/* The founder asked for archiving to happen automatically. This is */
/* what "automatically" means here, and the distinction is the      */
/* whole design:                                                    */
/*                                                                  */
/*   AUTOMATIC DETECTION — yes. The device watches its own storage  */
/*   headroom and works out what could be archived, without anyone  */
/*   remembering to check.                                          */
/*                                                                  */
/*   AUTOMATIC REMOVAL — no. Nothing leaves this device until a     */
/*   human has said so.                                             */
/*                                                                  */
/* WHY IT STOPS SHORT OF THE LAST STEP                              */
/*                                                                  */
/* Archiving ends in a FILE THE CLINIC MUST KEEP. A browser cannot  */
/* put a file anywhere by itself — it can only offer a download,    */
/* which lands in whatever folder the browser chooses, may be       */
/* blocked silently, and may be cleared by the operating system     */
/* later. An "automatic" archive would therefore mean: remove       */
/* records from the device, having written the only other copy to a */
/* location nobody chose and nobody has checked.                    */
/*                                                                  */
/* That is not archiving. That is deletion with a download attached.*/
/*                                                                  */
/* So this runs everything up to the point of no return — the       */
/* watching, the selection, the projection, the prompt at the right */
/* moment — and stops at a single click. The clinician never has to */
/* remember; they only have to agree, once, per archive.            */
/*                                                                  */
/* Retention itself remains the founder's decision: the floor is    */
/* three years by default and cannot go below one, because record   */
/* retention is a legal question that varies by jurisdiction.       */
/*                                                                  */
/* Load order: after js/storage-archive.js. Started from app.js,    */
/* deferred, never on the path of the first paint.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Prompt at 70% of the storage budget. Chosen, not guessed: the measured
   ceiling is ~1,800 visits after the per-visit split, a busy two-clinician
   practice reaches it in months, and 70% leaves roughly 500 visits of
   headroom — comfortably more than the time between a prompt and someone
   acting on it, without nagging a clinic that has years left. */
var ARCHIVE_AUTO_PCT = 70;

/* Second trigger: raw record count. Storage percentage is the honest signal,
   but a clinic whose visits are unusually small could pass a thousand records
   while still under 70%, and reading everything for an export or a sync is
   O(n) whatever the byte count. */
var ARCHIVE_AUTO_COUNT = 1200;

/* Do not raise the same prompt more than once a week. A prompt that appears
   every morning is one a clinician learns to dismiss without reading, and the
   condition it describes takes months to change. */
var ARCHIVE_AUTO_QUIET_DAYS = 7;

var ARCHIVE_AUTO_KEY = "archive_auto";

function archiveAutoState() {
  if (typeof loadStore !== "function") return { last_prompt: null, enabled: true };
  var s = loadStore(ARCHIVE_AUTO_KEY, null);
  if (!s || typeof s !== "object") return { last_prompt: null, enabled: true };
  return {
    last_prompt: s.last_prompt || null,
    /* Opt-OUT, not opt-in. A clinic that never turns this on is exactly the
       clinic that will hit the wall. */
    enabled: s.enabled !== false
  };
}

function archiveAutoSetEnabled(on) {
  var st = archiveAutoState();
  st.enabled = !!on;
  if (typeof logAudit === "function") {
    try { logAudit("archive_auto_changed",
      "Automatic archive prompting was turned " + (on ? "ON" : "OFF") + ". " +
      (on ? "" : "This device will no longer warn when it is running out of room."), {}); } catch (e) {}
  }
  return typeof saveStore === "function" && saveStore(ARCHIVE_AUTO_KEY, st) !== false;
}

function _archiveAutoNotePrompt() {
  var st = archiveAutoState();
  st.last_prompt = new Date().toISOString();
  if (typeof saveStore === "function") saveStore(ARCHIVE_AUTO_KEY, st);
}

/* Should this device be prompting right now, and why?
   Pure apart from its readers, so the rule is testable without a browser and
   without waiting a week. */
function archiveAutoCheck(now) {
  var st = archiveAutoState();
  if (!st.enabled) return { prompt: false, reason: "automatic archiving is switched off" };

  /* Never prompt into a broken or locked device: the clinician cannot act on
     it, and archiveRun would refuse anyway. Saying nothing is better than
     offering a button that cannot work. */
  if (typeof storageCorruptStores === "function" && storageCorruptStores().length) {
    return { prompt: false, reason: "a record store is damaged" };
  }
  if (typeof vaultEnabled === "function" && vaultEnabled() &&
      typeof vaultUnlocked === "function" && !vaultUnlocked()) {
    return { prompt: false, reason: "the vault is locked" };
  }

  var t = now ? Date.parse(now) : Date.now();
  if (st.last_prompt) {
    var since = t - Date.parse(st.last_prompt);
    if (isFinite(since) && since < ARCHIVE_AUTO_QUIET_DAYS * 86400000) {
      return { prompt: false, reason: "already prompted within the last " +
                                      ARCHIVE_AUTO_QUIET_DAYS + " days" };
    }
  }

  var pct = 0, count = 0;
  try {
    if (typeof storageUsage === "function") pct = storageUsage().pct || 0;
    count = (typeof visitStoreCount === "function")
      ? visitStoreCount()
      : ((typeof loadVisits === "function") ? loadVisits().length : 0);
  } catch (e) { return { prompt: false, reason: "could not read storage usage" }; }

  var full = pct >= ARCHIVE_AUTO_PCT;
  var many = count >= ARCHIVE_AUTO_COUNT;
  if (!full && !many) {
    return { prompt: false, reason: "plenty of room (" + pct + "%, " + count + " visits)",
             pct: pct, visits: count };
  }

  /* Only prompt if archiving would actually help. Telling a clinic to archive
     when every record is inside the retention floor is worse than useless — it
     is an alarm with no action behind it, and the next one gets ignored too. */
  var proj = null;
  try {
    proj = (typeof archiveProjection === "function") ? archiveProjection({}) : null;
  } catch (e) { proj = null; }
  if (!proj || !proj.eligible) {
    return { prompt: false,
             reason: "this device is at " + pct + "% but nothing is old enough to archive; " +
                     "the retention floor would have to be lowered, and that is a clinical decision",
             pct: pct, visits: count, eligible: 0, needs_founder: true };
  }

  return {
    prompt: true, pct: pct, visits: count,
    eligible: proj.eligible, held: proj.held, freed_bytes: proj.freed_bytes,
    trigger: full ? "storage" : "count",
    reason: ""
  };
}

/* Run the check and, if it fires, say so once. Deferred by the caller — this
   reads every visit's index and must never sit in front of the first paint. */
function archiveAutoStart(opts) {
  opts = opts || {};
  var delay = (typeof opts.delayMs === "number") ? opts.delayMs : 6000;
  var go = function () {
    var res;
    try { res = archiveAutoCheck(); } catch (e) { return; }
    if (!res.prompt) {
      /* One case is worth surfacing even though we are not prompting: the
         device is full AND nothing is eligible. Only the founder can resolve
         that, by lowering the retention floor — so it goes to the console for
         now rather than silently doing nothing. */
      if (res.needs_founder && typeof console !== "undefined" && console.warn) {
        console.warn("Entopic: " + res.reason);
      }
      return;
    }
    _archiveAutoNotePrompt();
    if (typeof evEmit === "function") evEmit("archive:due", res);
  };
  if (typeof setTimeout === "function") setTimeout(go, delay); else go();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ARCHIVE_AUTO_PCT: ARCHIVE_AUTO_PCT, ARCHIVE_AUTO_COUNT: ARCHIVE_AUTO_COUNT,
    ARCHIVE_AUTO_QUIET_DAYS: ARCHIVE_AUTO_QUIET_DAYS,
    archiveAutoState: archiveAutoState, archiveAutoSetEnabled: archiveAutoSetEnabled,
    archiveAutoCheck: archiveAutoCheck, archiveAutoStart: archiveAutoStart
  };
}
