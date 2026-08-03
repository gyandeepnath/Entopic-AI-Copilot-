/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — KNOWLEDGE OVERLAYS                                    */
/*                                                                  */
/* Clinician-authored conditions, layered ON TOP of the shipped     */
/* knowledge base and never mixed into it.                          */
/*                                                                  */
/*   CORE      394 shipped conditions. Nobody edits these here.     */
/*   CLINIC    published by the admin to everyone in this clinic.   */
/*   PERSONAL  one clinician's own. Private unless they submit it.  */
/*                                                                  */
/* ═══ THE SAFETY GUARANTEE, AND HOW IT IS ACHIEVED ═══            */
/*                                                                  */
/* The danger this design exists to remove: the engine ranks ONE    */
/* list. Append a personal condition to KNOWLEDGE_ALL and it        */
/* competes directly with core conditions. A clinician's own        */
/* "evening dryness" pattern, requiring flashes and floaters        */
/* because their dry-eye patients mention them, could out-score     */
/* Retinal Detachment and push it below the fold. Nobody would      */
/* have done anything wrong, and a detachment would be buried.      */
/*                                                                  */
/* So overlay conditions are NEVER ranked against core conditions.  */
/* The engine scores them in a SEPARATE pass and js/engine.js       */
/* merges with every core urgent condition on top. A user condition */
/* therefore cannot mathematically outrank a red flag — not because */
/* a rule forbids it, but because the two are never compared.       */
/*                                                                  */
/* ═══ WHAT AN OVERLAY MAY AND MAY NOT DO ═══                       */
/*                                                                  */
/*   MAY   add a condition; wire existing or new tokens to it;      */
/*         mark it urgent (see below); be edited or deleted by its  */
/*         author; be submitted for review.                         */
/*                                                                  */
/*   MAY NOT  edit, disable, re-weight or delete anything in CORE;  */
/*            use `exclusions` — the only field that can REMOVE a   */
/*            condition from a differential, and therefore the one  */
/*            field that could suppress a red flag.                 */
/*                                                                  */
/* ═══ USER-SET URGENT FLAGS ═══                                    */
/*                                                                  */
/* The founder decided (2026-08-02) that clinicians MAY mark their  */
/* own conditions urgent. I had recommended against it: an urgent   */
/* flag is a safety claim, and the Knowledge Governance Manual says */
/* safety changes are never delegated. He overruled that, which is  */
/* his call to make — a clinician who recognises a genuine local    */
/* emergency pattern should be able to act on it.                   */
/*                                                                  */
/* It is implemented with the mitigations I proposed alongside      */
/* that concern, so the decision costs as little as possible:       */
/*                                                                  */
/*   1. A user urgent NEVER suppresses a core urgent. It is ADDED   */
/*      to the alert list, never substituted, and core alerts are   */
/*      computed first and independently.                           */
/*   2. It is visibly attributed — "YOUR ALERT", with the author's  */
/*      name — so it can never be mistaken for reviewed content.    */
/*   3. It fires only for its own scope: a personal urgent alerts   */
/*      its author only; a clinic urgent alerts that clinic only.   */
/*   4. Marking one urgent auto-submits it for review, because a    */
/*      clinician asserting an emergency pattern is exactly the     */
/*      knowledge that should reach everyone if it is right.        */
/*   5. Every urgent flag set by a user is written to the audit     */
/*      trail with the reason they gave.                            */
/*                                                                  */
/* Load order: after storage.js and knowledge/loader.js.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var OVERLAY_STORE = "kb_overlays";

/* Fields an overlay condition may carry. `exclusions` is deliberately absent
   and is stripped on save — see the safety note above. */
var OVERLAY_FIELDS = ["req", "sup", "con", "temporal", "tests"];

var OVERLAY_SCOPES = ["personal", "clinic"];

var OVERLAY_STATES = ["private", "submitted", "published", "returned", "declined"];


/* ── Storage ── */

function overlayAll() {
  if (typeof loadStore !== "function") return [];
  var l = loadStore(OVERLAY_STORE, []);
  return Array.isArray(l) ? l : [];
}

function overlaySaveAll(list) {
  if (typeof saveStore !== "function") return false;
  return saveStore(OVERLAY_STORE, list || []) !== false;
}

function _overlayMe() {
  if (typeof CU === "undefined" || !CU) return "";
  return CU.username || CU.name || "";
}

/* The overlay conditions that apply to the CURRENT user right now:
   their own private/submitted ones, plus anything published to the clinic.
   A condition belonging to another user is never visible here. */
function overlayActive() {
  var me = _overlayMe();
  return overlayAll().filter(function (o) {
    if (o.deleted) return false;
    /* A published clinic condition reaches everyone. An unpublished one is
       still visible to its own author — otherwise they could not test the
       thing they are drafting. */
    if (o.scope === "clinic" && o.state === "published") return true;
    return o.author === me && o.state !== "declined";
  });
}

function overlayById(id) {
  var all = overlayAll();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}


/* ── Validation ──
   Returns [] when the condition is safe to save, otherwise the reasons.
   These are structural checks only; nothing here judges clinical content. */

function overlayValidate(draft, existingId) {
  var errs = [];
  if (!draft || typeof draft !== "object") return ["No condition supplied."];

  var name = String(draft.name || "").trim();
  if (name.length < 3) errs.push("Give the condition a name of at least 3 characters.");

  /* A name collision with CORE would make the differential ambiguous and would
     let an overlay shadow a shipped condition in every list keyed by name. */
  if (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) {
    for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
      if (String(KNOWLEDGE_ALL[i].name).toLowerCase() === name.toLowerCase()) {
        errs.push('"' + name + '" is already a condition in the shipped knowledge base. ' +
          'Give yours a different name — or propose a change to that one instead.');
        break;
      }
    }
  }
  var mine = overlayAll();
  for (var j = 0; j < mine.length; j++) {
    if (mine[j].deleted || mine[j].id === existingId) continue;
    if (String(mine[j].name).toLowerCase() === name.toLowerCase() &&
        mine[j].author === _overlayMe()) {
      errs.push("You already have a condition called \"" + name + "\".");
      break;
    }
  }

  var req = Array.isArray(draft.req) ? draft.req.filter(Boolean) : [];
  if (!req.length) {
    errs.push("Add at least one REQUIRED finding. Without one the condition can never " +
      "be triggered by anything, so it would never appear.");
  }

  if (draft.exclusions && draft.exclusions.length) {
    errs.push("Exclusions cannot be used in a personal or clinic condition — they are the " +
      "only rule that can REMOVE another condition from a differential.");
  }

  if (draft.urgent && !String(draft.urgent_reason || "").trim()) {
    errs.push("Marking a condition urgent is a safety claim. Say why it is urgent — " +
      "this is recorded and sent for review.");
  }

  /* ── A REQUIRED finding the engine can never produce ──
     The token fields are free text. A clinician who types "evening dryness"
     gets `evening_dryness`, which is not a token the engine emits from any
     input path — so the condition can never fire, and NOTHING said so. They
     would leave believing the app was watching for that pattern on their
     behalf. That is worse than not having the feature at all.

     A structural check, not a clinical one: `reachable` in the generated
     token registry means "some input path produces this token". If no
     required token is reachable, the condition is dead by construction, which
     is the same class of defect as having no required finding at all. */
  req.forEach(function (t) {
    if (overlayTokenReachable(t)) return;
    errs.push('"' + t + '" is not a finding the engine can produce, so a condition ' +
      'requiring it could never appear. Pick one from the suggestions — the list is ' +
      'every finding the exam can record.');
  });

  if (OVERLAY_SCOPES.indexOf(draft.scope || "personal") < 0) errs.push("Unknown scope.");
  return errs;
}

/* Can the engine actually emit this token from some input path?
   Falls back to `true` when the registry is unavailable — a missing generated
   file must not block a clinician from saving their own work. */
function overlayTokenReachable(tok) {
  if (typeof TOKEN_REGISTRY === "undefined" || !TOKEN_REGISTRY) return true;
  var e = TOKEN_REGISTRY[tok];
  return !!(e && e.reachable);
}

/* Non-blocking notes. Supporting and contradicting findings that the engine
   never produces do not break the condition — it still fires on its required
   findings — they just never contribute anything. Worth saying, not worth
   refusing to save over. */
function overlayWarnings(draft) {
  var out = [];
  if (!draft) return out;
  ["sup", "con", "temporal"].forEach(function (f) {
    (Array.isArray(draft[f]) ? draft[f] : []).forEach(function (t) {
      if (overlayTokenReachable(t)) return;
      out.push('"' + t + '" is not a finding the engine can produce, so it will never ' +
        'add to or subtract from this condition\'s score. The condition still works ' +
        'without it.');
    });
  });
  return out;
}

/* Every finding the engine can actually produce — the list a picker offers.
   Sorted so the same input always yields the same list. */
function overlayTokenChoices(prefix, limit) {
  if (typeof TOKEN_REGISTRY === "undefined" || !TOKEN_REGISTRY) return [];
  var q = String(prefix || "").toLowerCase();
  var out = [];
  Object.keys(TOKEN_REGISTRY).forEach(function (t) {
    if (!TOKEN_REGISTRY[t] || !TOKEN_REGISTRY[t].reachable) return;
    if (q && t.toLowerCase().indexOf(q) < 0) return;
    out.push(t);
  });
  out.sort();
  return limit ? out.slice(0, limit) : out;
}


/* ── Save ── */

function overlaySave(draft, existingId) {
  var errs = overlayValidate(draft, existingId);
  if (errs.length) return { ok: false, errors: errs };

  var all = overlayAll();
  var now = new Date().toISOString();
  var me = _overlayMe();
  var scope = draft.scope || "personal";

  var rec = existingId ? overlayById(existingId) : null;
  var isNew = !rec;
  if (!rec) {
    rec = {
      id: "ov" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      author: me,
      author_name: (typeof CU !== "undefined" && CU) ? (CU.name || "") : "",
      created: now,
      state: "private"
    };
    all.push(rec);
  } else if (rec.author !== me && scope !== "clinic") {
    return { ok: false, errors: ["This condition belongs to someone else."] };
  }

  rec.name = String(draft.name).trim();
  rec.scope = scope;
  rec.domain = String(draft.domain || "Personal");
  rec.route = String(draft.route || "surface");
  rec.icd = String(draft.icd || "");
  rec.note = String(draft.note || "");
  rec.updated = now;

  OVERLAY_FIELDS.forEach(function (f) {
    rec[f] = (Array.isArray(draft[f]) ? draft[f] : []).map(String).filter(Boolean);
  });
  /* Stripped, always — never merely validated away. */
  rec.exclusions = [];

  var wasUrgent = !!rec.urgent;
  rec.urgent = !!draft.urgent;
  rec.urgent_reason = rec.urgent ? String(draft.urgent_reason || "").trim() : "";

  /* An overlay is NEVER reviewed content. This is not "unverified until
     someone clicks verify" — while it is an overlay it is unreviewed, and the
     only route out is review turning it into core knowledge. */
  rec.review_status = "USER_AUTHORED_NOT_REVIEWED";

  /* Marking something urgent auto-submits it. A clinician asserting an
     emergency pattern is precisely the knowledge that should reach everyone
     if it is right — and should be looked at by someone if it is not. */
  var autoSubmitted = false;
  if (rec.urgent && !wasUrgent && rec.state === "private") {
    rec.state = "submitted";
    rec.submitted_at = now;
    autoSubmitted = true;
  }

  if (!overlaySaveAll(all)) {
    return { ok: false, errors: ["Could not save — this device may be out of storage."] };
  }

  if (typeof logAudit === "function") {
    try {
      logAudit(isNew ? "overlay_created" : "overlay_edited",
        (isNew ? "Created" : "Edited") + ' own condition "' + rec.name + '"' +
        (rec.urgent ? " — MARKED URGENT: " + rec.urgent_reason : ""), {});
    } catch (e) {}
  }

  return { ok: true, record: rec, autoSubmitted: autoSubmitted };
}

/* Find a record INSIDE a given list. overlayById() parses a fresh array each
   call, so mutating what it returns and then saving overlayAll() saves a
   re-read copy and silently discards the change. Every mutator below loads
   once, edits in place, and saves THAT array. */
function _overlayFindIn(list, id) {
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

function overlayDelete(id) {
  var all = overlayAll();
  var rec = _overlayFindIn(all, id);
  if (!rec) return false;
  if (rec.author !== _overlayMe() && rec.scope !== "clinic") return false;
  /* Soft delete: a differential recorded last year may have been produced with
     this condition in play, and the record has to stay explainable. */
  rec.deleted = true;
  rec.deleted_at = new Date().toISOString();
  var ok = overlaySaveAll(all);
  if (ok && typeof logAudit === "function") {
    try { logAudit("overlay_deleted", 'Removed own condition "' + rec.name + '"', {}); } catch (e) {}
  }
  return ok;
}

function overlaySubmit(id) {
  var all = overlayAll();
  var rec = _overlayFindIn(all, id);
  if (!rec || rec.author !== _overlayMe()) return false;
  if (rec.state !== "private" && rec.state !== "returned") return false;
  rec.state = "submitted";
  rec.submitted_at = new Date().toISOString();
  var ok = overlaySaveAll(all);
  if (ok && typeof logAudit === "function") {
    try { logAudit("overlay_submitted", 'Submitted "' + rec.name + '" for review', {}); } catch (e) {}
  }
  return ok;
}

/* Admin queue. */
function overlaySubmitted() {
  return overlayAll()
    .filter(function (o) { return !o.deleted && o.state === "submitted"; })
    .sort(function (a, b) { return String(a.submitted_at).localeCompare(String(b.submitted_at)); });
}

/* Admin decision. "published" makes it visible to the whole clinic; it does
   NOT make it core knowledge — only the sign-off workflow does that. */
function overlayReview(id, decision, comment) {
  if (["published", "returned", "declined"].indexOf(decision) < 0) return false;
  var all = overlayAll();
  var rec = _overlayFindIn(all, id);
  if (!rec) return false;
  rec.state = decision;
  rec.reviewed_by = _overlayMe();
  rec.reviewed_at = new Date().toISOString();
  rec.review_comment = String(comment || "");
  if (decision === "published") rec.scope = "clinic";
  var ok = overlaySaveAll(all);
  if (ok && typeof logAudit === "function") {
    try { logAudit("overlay_reviewed", decision + ' "' + rec.name + '"' +
      (comment ? " — " + comment : ""), {}); } catch (e) {}
  }
  return ok;
}


/* ── What the engine consumes ──
   Shaped exactly like a core condition so scoreCondition needs no changes,
   plus `_overlay` so every consumer can tell them apart. */
function overlayConditions() {
  return overlayActive().map(function (o) {
    return {
      name: o.name,
      domain: o.domain,
      route: o.route,
      req: o.req || [], sup: o.sup || [], con: o.con || [],
      temporal: o.temporal || [], tests: o.tests || [],
      exclusions: [],                       /* never, by construction */
      urgent: !!o.urgent,
      icd: o.icd || "",
      icd_label: "", icd_status: "",
      review_status: "USER_AUTHORED_NOT_REVIEWED",
      _overlay: {
        id: o.id, scope: o.scope, author: o.author,
        author_name: o.author_name, state: o.state,
        urgent_reason: o.urgent_reason || ""
      },
      _index: 100000                        /* sorts last on any tie-break */
    };
  });
}

/* Stamped onto every visit so a differential stays explainable once the
   knowledge behind it varies per user (design doc §3.5). */
function overlayProvenance() {
  var active = overlayActive();
  return {
    core_version: (typeof KB_VERSION !== "undefined") ? KB_VERSION : "",
    overlay_count: active.length,
    overlay_ids: active.map(function (o) { return o.id; }),
    captured_at: new Date().toISOString()
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    OVERLAY_STORE: OVERLAY_STORE, OVERLAY_FIELDS: OVERLAY_FIELDS,
    OVERLAY_SCOPES: OVERLAY_SCOPES, OVERLAY_STATES: OVERLAY_STATES,
    overlayAll: overlayAll, overlayActive: overlayActive, overlayById: overlayById,
    overlayValidate: overlayValidate, overlaySave: overlaySave,
    overlayTokenReachable: overlayTokenReachable, overlayWarnings: overlayWarnings,
    overlayTokenChoices: overlayTokenChoices,
    overlayDelete: overlayDelete, overlaySubmit: overlaySubmit,
    overlaySubmitted: overlaySubmitted, overlayReview: overlayReview,
    overlayConditions: overlayConditions, overlayProvenance: overlayProvenance
  };
}
