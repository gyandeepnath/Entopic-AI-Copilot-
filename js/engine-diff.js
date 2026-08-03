/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — WHAT CHANGED  (Phase 4 finding F-6)                   */
/*                                                                  */
/* ── THE DEFECT THIS CLOSES ──                                    */
/*                                                                  */
/* The engine re-runs on every field the clinician touches, and the */
/* advisory panel silently redraws. A condition can move from       */
/* fourth to first, or vanish entirely, between two keystrokes, and */
/* nothing says so. The clinician sees a list; they never see the   */
/* list MOVE, and so they never learn which of their findings the   */
/* engine is actually reacting to.                                  */
/*                                                                  */
/* That is the difference between a tool you can interrogate and a  */
/* tool you have to trust.                                          */
/*                                                                  */
/* ── WHY THIS CAN BE STATED AS CAUSE, NOT CORRELATION ──          */
/*                                                                  */
/* The engine is deterministic and pure over its token set: the     */
/* same tokens always produce the same differential (ADR-004). So   */
/* when exactly ONE token changed between two runs, that token IS   */
/* the cause of every difference — this is a proof, not an          */
/* inference, and the wording says "adding X moved Y".              */
/*                                                                  */
/* When several tokens changed at once, no single one can be blamed */
/* and the wording drops to "since your last entry (added: …)".     */
/* `attributable` carries that distinction so no consumer has to    */
/* re-derive it, and so the UI cannot accidentally overclaim.       */
/*                                                                  */
/* ── WHAT THIS NEVER DOES ──                                      */
/*                                                                  */
/* It changes no score, no rank, no alert. It reads two snapshots   */
/* and describes the difference. It also never SUPPRESSES anything: */
/* a red flag that disappeared is reported louder than one that     */
/* appeared, because a clinician who removes a finding and quietly  */
/* loses an urgent alert is the dangerous case.                     */
/*                                                                  */
/* Load order: after engine.js. In-memory only — snapshots are not  */
/* persisted; the visit already records its own tokens.             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Snapshots kept per visit. Enough to answer "what changed" across a
   section of the exam without unbounded growth on a long consultation. */
var ENGINE_DIFF_MAX = 30;

var ENGINE_RUNS = { key: null, list: [], lastDiff: null };


/* Which visit these snapshots belong to. A snapshot from another patient
   must never be diffed against this one, so the key changes when the visit
   does and the history restarts. */
function _diffKeyOf(visit) {
  if (!visit) return "none";
  return String(visit.id || visit._id || "") + "|" + String(visit.date || "");
}

/* Everything the diff needs, and nothing else. Deliberately a copy: the
   engine reuses and mutates its own arrays between runs. */
function engineSnapshotOf(visit, tokens) {
  var dx = (visit && visit.dxList) || [];
  return {
    at: new Date().toISOString(),
    tokens: (tokens || []).slice().sort(),
    ranked: dx.map(function (d, i) {
      return {
        n: d.n, prob: (typeof d.prob === "number") ? d.prob : 0,
        rank: i + 1, urgent: !!d.urgent, overlay: !!d.overlay
      };
    }),
    alerts: ((visit && visit.alerts) || []).map(function (a) {
      return { m: a.m, l: a.l, key: _alertKey(a), derived: !!a.derived, condition: a.condition || "" };
    })
  };
}

/* An alert's IDENTITY, which is not its wording.
   Derived alerts (F-1) embed the current match strength in their text — "…
   (match 17)". Comparing on text therefore reported ONE alert whose score
   moved by two points as a removal PLUS an addition, and the removal is the
   loudest line the panel has. That is alert fatigue manufactured by a diff.
   Found by driving the real app, not by a unit test. */
function _alertKey(a) {
  if (!a) return "";
  if (a.condition) return "cond:" + a.condition;   /* derived — one per condition */
  if (a.overlay && a.overlay.id) return "overlay:" + a.overlay.id;
  return "msg:" + String(a.m || "");
}

/* Called by the engine at the end of every run. Cheap: one array copy and a
   set comparison over a few hundred short strings. */
function engineRecordRun(visit, tokens) {
  var key = _diffKeyOf(visit);
  if (key !== ENGINE_RUNS.key) {
    ENGINE_RUNS.key = key;
    ENGINE_RUNS.list = [];
    ENGINE_RUNS.lastDiff = null;
  }

  var snap = engineSnapshotOf(visit, tokens);
  var prev = ENGINE_RUNS.list.length ? ENGINE_RUNS.list[ENGINE_RUNS.list.length - 1] : null;

  /* A re-run that changed nothing is not a run worth remembering — the engine
     fires on navigation as well as on data entry, and recording no-ops would
     push the genuinely interesting snapshots out of the ring. */
  var diff = prev ? engineDiff(prev, snap) : null;
  if (diff && !diff.changed) return ENGINE_RUNS.lastDiff;

  ENGINE_RUNS.list.push(snap);
  if (ENGINE_RUNS.list.length > ENGINE_DIFF_MAX) ENGINE_RUNS.list.shift();
  ENGINE_RUNS.lastDiff = diff;
  return diff;
}

function _setDiff(a, b) {
  var inB = {};
  for (var i = 0; i < b.length; i++) inB[b[i]] = true;
  return a.filter(function (x) { return !inB[x]; });
}

function _rankMap(ranked) {
  var m = {};
  for (var i = 0; i < ranked.length; i++) m[ranked[i].n] = ranked[i];
  return m;
}

/* Compare two snapshots. Pure — no globals, no storage, no DOM. */
function engineDiff(prev, next) {
  if (!prev || !next) return null;

  var tAdded = _setDiff(next.tokens, prev.tokens);
  var tRemoved = _setDiff(prev.tokens, next.tokens);

  var pm = _rankMap(prev.ranked), nm = _rankMap(next.ranked);
  var entered = [], left = [], moved = [];

  next.ranked.forEach(function (r) {
    var was = pm[r.n];
    if (!was) { entered.push({ n: r.n, rank: r.rank, prob: r.prob, urgent: r.urgent, overlay: r.overlay }); return; }
    if (was.rank !== r.rank) {
      moved.push({ n: r.n, from: was.rank, to: r.rank, from_prob: was.prob, to_prob: r.prob, urgent: r.urgent });
    }
  });
  prev.ranked.forEach(function (r) {
    if (!nm[r.n]) left.push({ n: r.n, rank: r.rank, prob: r.prob, urgent: r.urgent, overlay: r.overlay });
  });

  /* Compared by identity, never by wording — see _alertKey. */
  var pAl = prev.alerts.map(function (a) { return a.key || _alertKey(a); });
  var nAl = next.alerts.map(function (a) { return a.key || _alertKey(a); });
  var alertsAdded = next.alerts.filter(function (a) { return pAl.indexOf(a.key || _alertKey(a)) < 0; });
  var alertsRemoved = prev.alerts.filter(function (a) { return nAl.indexOf(a.key || _alertKey(a)) < 0; });

  var changed = !!(tAdded.length || tRemoved.length || entered.length || left.length ||
                   moved.length || alertsAdded.length || alertsRemoved.length);

  return {
    changed: changed,
    /* Exactly one token moved → the engine's determinism makes that token the
       proven cause of everything else in this diff. */
    attributable: (tAdded.length + tRemoved.length) === 1,
    tokens_added: tAdded,
    tokens_removed: tRemoved,
    entered: entered,
    left: left,
    moved: moved.sort(function (a, b) { return a.to - b.to; }),
    alerts_added: alertsAdded,
    alerts_removed: alertsRemoved,
    from: prev.at,
    to: next.at
  };
}


/* ── PLAIN LANGUAGE ────────────────────────────────────────────── */

/* A token as a clinician would say it. The dictionary's first alias is the
   natural-language form; the token id is the fallback, never a guess. */
function engineTokenLabel(tok) {
  if (typeof TOKEN_DICTIONARY !== "undefined" && TOKEN_DICTIONARY[tok] &&
      TOKEN_DICTIONARY[tok].length) {
    return TOKEN_DICTIONARY[tok][0];
  }
  return String(tok).replace(/_/g, " ");
}

function _list(arr, max) {
  var labels = arr.slice(0, max || 3).map(engineTokenLabel);
  var extra = arr.length - labels.length;
  return labels.join(", ") + (extra > 0 ? " and " + extra + " more" : "");
}

function _ord(n) {
  var s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* Sentences, most safety-relevant first. Each carries a level so the UI can
   style it without re-deciding what matters. */
function engineDiffNarrate(diff) {
  if (!diff || !diff.changed) return [];
  var out = [];

  /* An alert that STOPPED showing goes first, always. The clinician who
     corrects a finding and silently loses a red flag is the case this whole
     feature exists for.

     LEVEL: a hand-written red-flag rule vanishing is urgent news. A DERIVED
     alert vanishing means an urgent condition slid off the differential —
     worth saying, but it is not itself an emergency, and shouting it is how
     a panel teaches people to stop reading it. */
  var saidCondition = {};
  diff.alerts_removed.forEach(function (a) {
    if (a.condition) saidCondition[a.condition] = true;
    out.push({
      level: (a.l === "urgent" && !a.derived) ? "urgent" : "warn",
      text: "No longer showing: " + a.m
    });
  });
  diff.alerts_added.forEach(function (a) {
    if (a.condition) saidCondition[a.condition] = true;
    out.push({
      level: (a.l === "urgent" && !a.derived) ? "urgent" : "warn",
      text: "New alert: " + a.m
    });
  });

  /* What the clinician did, in their words. */
  var cause = "";
  if (diff.attributable) {
    var one = diff.tokens_added.length ? diff.tokens_added[0] : diff.tokens_removed[0];
    var verb = diff.tokens_added.length ? "Adding" : "Removing";
    cause = verb + " " + engineTokenLabel(one);
  } else {
    var bits = [];
    if (diff.tokens_added.length) bits.push("added " + _list(diff.tokens_added));
    if (diff.tokens_removed.length) bits.push("removed " + _list(diff.tokens_removed));
    cause = bits.length ? "Since your last entry (" + bits.join("; ") + ")" : "Since your last entry";
  }

  /* Rank movement. Only the moves worth a clinician's attention: into or out
     of the top three, or a jump of three places or more. A list that reshuffles
     7th and 8th is noise, and narrating it is how you train someone to stop
     reading the panel. */
  var notable = diff.moved.filter(function (m) {
    return m.to <= 3 || m.from <= 3 || Math.abs(m.from - m.to) >= 3;
  });

  /* Say each condition ONCE. An urgent condition that leaves the differential
     produces both a lost derived alert and a "dropped" line; the alert line is
     the stronger statement and has already been written. */
  diff.entered.forEach(function (e) {
    if (saidCondition[e.n]) return;
    if (e.rank > 3 && !e.urgent) return;
    out.push({
      level: e.urgent ? "urgent" : "info",
      text: cause + (diff.attributable ? " brought in " : ": ") +
            (diff.attributable ? "" : "new — ") + e.n +
            " at " + _ord(e.rank) + (e.urgent ? " (urgent)" : "")
    });
  });

  notable.forEach(function (m) {
    if (saidCondition[m.n]) return;
    var dir = m.to < m.from ? "up" : "down";
    out.push({
      level: m.urgent && m.to < m.from ? "warn" : "info",
      text: cause + (diff.attributable ? " moved " : ": ") + m.n +
            " " + _ord(m.from) + " → " + _ord(m.to) + " (" + dir + ")"
    });
  });

  diff.left.forEach(function (l) {
    if (saidCondition[l.n]) return;
    if (l.rank > 3 && !l.urgent) return;
    out.push({
      /* A dropped URGENT condition is a warn, not an info: it was on the list
         a moment ago and the clinician may not have seen why it left. */
      level: l.urgent ? "warn" : "info",
      text: cause + (diff.attributable ? " dropped " : ": dropped ") + l.n +
            " (was " + _ord(l.rank) + ")" + (l.urgent ? " — it was marked urgent" : "")
    });
  });

  /* Something changed but nothing on screen moved. Saying so is useful: it
     tells the clinician the finding was recorded and simply did not shift the
     differential, rather than leaving them wondering whether it registered. */
  if (!out.length && (diff.tokens_added.length || diff.tokens_removed.length)) {
    out.push({ level: "info", text: cause + " did not change the differential." });
  }
  return out;
}

/* The most recent diff, for a UI that renders after the engine has run. */
function engineLastDiff() { return ENGINE_RUNS.lastDiff; }
function engineRunHistory() { return ENGINE_RUNS.list.slice(); }

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ENGINE_DIFF_MAX: ENGINE_DIFF_MAX,
    ENGINE_RUNS: ENGINE_RUNS,
    engineSnapshotOf: engineSnapshotOf,
    engineRecordRun: engineRecordRun,
    engineDiff: engineDiff,
    engineDiffNarrate: engineDiffNarrate,
    engineTokenLabel: engineTokenLabel,
    engineLastDiff: engineLastDiff,
    engineRunHistory: engineRunHistory
  };
}
