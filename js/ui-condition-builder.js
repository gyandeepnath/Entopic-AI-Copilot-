/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CONDITION BUILDER  (design doc stages 2 and 3)        */
/*                                                                  */
/* Where a clinician writes down a pattern they recognise, wires it */
/* to findings, and — before saving anything — sees three things:   */
/*                                                                  */
/*   1. THE WIRING MAP    what triggers it, what supports it,       */
/*                        what argues against it.                    */
/*   2. THE TEST BENCH    toggle findings, watch it score live      */
/*                        against the real core differential.        */
/*   3. THE IMPACT        what it would have done to their own last */
/*                        200 visits, and in how many it would have */
/*                        outranked what they actually diagnosed.    */
/*                                                                  */
/* (3) is the one that prevents harm. Wiring a condition is          */
/* abstract; being shown that it would have outranked your own       */
/* diagnosis in 6 of your last 200 consultations is evidence.        */
/*                                                                  */
/* Everything here is presentation. The rules — what may be          */
/* authored, what is stripped, what is audited — live in             */
/* js/kb-overlay.js, and the safety guarantee that an overlay can    */
/* never outrank a core red flag lives in js/engine.js.              */
/*                                                                  */
/* Load order: after kb-overlay.js, overlay-impact.js, dom-escape.js */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CB = { draft: null, editingId: null, bench: [], open: false };

function cbBlankDraft() {
  return { name: "", domain: "Personal", route: "surface", icd: "",
           req: [], sup: [], con: [], temporal: [], tests: [],
           urgent: false, urgent_reason: "", note: "", scope: "personal" };
}

function cbOpen(existingId) {
  CB.editingId = existingId || null;
  CB.open = true;
  CB.bench = [];
  if (existingId && typeof overlayById === "function") {
    var rec = overlayById(existingId);
    CB.draft = rec ? {
      name: rec.name, domain: rec.domain, route: rec.route, icd: rec.icd,
      req: (rec.req || []).slice(), sup: (rec.sup || []).slice(),
      con: (rec.con || []).slice(), temporal: (rec.temporal || []).slice(),
      tests: (rec.tests || []).slice(),
      urgent: !!rec.urgent, urgent_reason: rec.urgent_reason || "",
      note: rec.note || "", scope: rec.scope || "personal"
    } : cbBlankDraft();
    /* Seed the bench with the condition's own triggers so it fires
       immediately — the author wants to see it working, not empty. */
    CB.bench = (CB.draft.req || []).slice();
  } else {
    CB.draft = cbBlankDraft();
  }
  cbRender();
}

function cbClose() { CB.open = false; CB.draft = null; CB.editingId = null; cbRender(); }

function cbSet(field, value) {
  if (!CB.draft) return;
  CB.draft[field] = value;
  cbRender();
}

function cbToggleToken(field, token) {
  if (!CB.draft) return;
  var list = CB.draft[field] || (CB.draft[field] = []);
  var i = list.indexOf(token);
  if (i >= 0) list.splice(i, 1); else list.push(token);
  cbRender();
}

function cbAddTokenFromInput(field, inputId) {
  var el = document.getElementById(inputId);
  if (!el) return;
  var raw = String(el.value || "").trim();
  if (!raw) return;
  /* Normalise to the house convention (see tools/gen-token-registry.js):
     lower_snake_case, except that an established clinical abbreviation keeps
     its capitals. We cannot tell which is which, so we only lowercase when
     the author typed something that is clearly prose. */
  var token = /^[A-Za-z0-9_]+$/.test(raw) ? raw : raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!token) return;
  if ((CB.draft[field] || []).indexOf(token) < 0) CB.draft[field].push(token);
  el.value = "";
  cbRender();
}

function cbToggleBench(token) {
  var i = CB.bench.indexOf(token);
  if (i >= 0) CB.bench.splice(i, 1); else CB.bench.push(token);
  cbRender();
}


/* ── Live scoring for the test bench ── */

function cbBenchResult() {
  if (typeof scoreCondition !== "function" || !CB.draft) return null;
  var toks = CB.bench.slice();
  if (!toks.length) return null;
  var cond = {
    name: CB.draft.name || "(unnamed)",
    req: CB.draft.req, sup: CB.draft.sup, con: CB.draft.con,
    temporal: CB.draft.temporal, tests: CB.draft.tests,
    exclusions: [], route: CB.draft.route, urgent: !!CB.draft.urgent
  };
  try {
    var r = scoreCondition(cond, toks, new Set(toks));
    var ev = (typeof generateEvidence === "function")
      ? generateEvidence(cond, toks, r, new Set(toks)) : null;
    return { score: r.score, evidence: ev };
  } catch (e) { return null; }
}

/* What CORE would say about the same findings — so the author sees their
   condition in the company it will actually keep. */
function cbCoreDifferential() {
  if (typeof KNOWLEDGE_ALL === "undefined" || typeof scoreCondition !== "function") return [];
  var toks = CB.bench.slice();
  if (!toks.length) return [];
  var set = new Set(toks);
  var out = [];
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];
    var hit = false;
    for (var r = 0; r < (c.req || []).length; r++) if (set.has(c.req[r])) { hit = true; break; }
    if (!hit) continue;
    try {
      var s = scoreCondition(c, toks, set);
      if (s.score >= 0.15) out.push({ n: c.name, score: s.score, urgent: !!c.urgent });
    } catch (e) {}
  }
  return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 5);
}


/* ── Save ── */

function cbSave() {
  if (typeof overlaySave !== "function" || !CB.draft) return;
  var res = overlaySave(CB.draft, CB.editingId);
  if (!res.ok) {
    alert("This condition was not saved:\n\n• " + res.errors.join("\n• "));
    return;
  }
  var msg = 'Saved "' + res.record.name + '".\n\nIt is yours only, and appears in your ' +
            'differential below the reviewed conditions, marked as your own.';
  if (res.autoSubmitted) {
    msg += "\n\nBecause you marked it urgent, it has also been sent to the administrator " +
           "for review — an emergency pattern that is right should reach everyone.";
  }
  alert(msg);
  cbClose();
  if (typeof renderHome === "function") renderHome();
}

function cbSubmit() {
  if (!CB.editingId || typeof overlaySubmit !== "function") {
    alert("Save the condition first, then send it for review.");
    return;
  }
  if (!confirm("Send this to the administrator for review?\n\nThey can publish it to the " +
               "whole clinic, send it back with a comment, or decline it.")) return;
  if (overlaySubmit(CB.editingId)) { alert("Sent for review."); cbClose(); }
}

function cbDelete() {
  if (!CB.editingId || typeof overlayDelete !== "function") return;
  if (!confirm("Remove this condition?\n\nIt stops appearing in your differential. Past " +
               "visits keep their record of it, so old differentials still make sense.")) return;
  if (overlayDelete(CB.editingId)) { cbClose(); if (typeof renderHome === "function") renderHome(); }
}


/* ── Rendering ── */

function cbTokenChips(field, label, hint) {
  var list = CB.draft[field] || [];
  var h = '<div class="cb-field"><div class="cb-lab">' + escHtml(label) +
          '<span class="cb-hint"> ' + escHtml(hint) + '</span></div><div class="cb-chips">';
  list.forEach(function (t) {
    h += '<span class="cb-chip" onclick="cbToggleToken(\'' + escAttrJs(field) + '\',\'' +
         escAttrJs(t) + '\')" title="Remove">' + escHtml(t) + ' ×</span>';
  });
  if (!list.length) h += '<span class="cb-empty">none</span>';
  h += '</div><div class="cb-add">' +
    '<input id="cbIn_' + escHtml(field) + '" placeholder="type a finding and press Add" ' +
    'onkeydown="if(event.key===\'Enter\'){cbAddTokenFromInput(\'' + escAttrJs(field) + '\',\'cbIn_' + escAttrJs(field) + '\');return false;}">' +
    '<button class="btn btn-s" onclick="cbAddTokenFromInput(\'' + escAttrJs(field) + '\',\'cbIn_' + escAttrJs(field) + '\')">Add</button>' +
    '</div></div>';
  return h;
}

/* The wiring map: what goes in, what comes out. */
function cbWiringMap() {
  var d = CB.draft;
  var h = '<div class="cb-map"><div class="cb-map-t">How the engine will use this</div>';
  h += '<div class="cb-map-row">';

  h += '<div class="cb-map-col"><div class="cb-map-h">Triggers it</div>';
  (d.req || []).forEach(function (t) { h += '<div class="cb-node req">' + escHtml(t) + '</div>'; });
  if (!(d.req || []).length) h += '<div class="cb-node none">nothing yet — it can never fire</div>';
  h += '</div>';

  h += '<div class="cb-map-arrow">→</div>';

  h += '<div class="cb-map-col"><div class="cb-map-h">Your condition</div>' +
       '<div class="cb-node self' + (d.urgent ? ' urgent' : '') + '">' +
       escHtml(d.name || "(unnamed)") + (d.urgent ? '<br><small>YOUR ALERT</small>' : '') + '</div></div>';

  h += '<div class="cb-map-arrow">←</div>';

  h += '<div class="cb-map-col"><div class="cb-map-h">Raises / lowers it</div>';
  (d.sup || []).forEach(function (t) { h += '<div class="cb-node sup">+ ' + escHtml(t) + '</div>'; });
  (d.con || []).forEach(function (t) { h += '<div class="cb-node con">− ' + escHtml(t) + '</div>'; });
  if (!(d.sup || []).length && !(d.con || []).length) h += '<div class="cb-node none">none</div>';
  h += '</div></div>';

  h += '<div class="cb-map-note">Every finding above must be one the engine already ' +
       'produces, or your condition will never see it. Use the test bench below to check.</div>';
  h += '</div>';
  return h;
}

function cbTestBench() {
  var all = {};
  ["req", "sup", "con"].forEach(function (f) {
    (CB.draft[f] || []).forEach(function (t) { all[t] = f; });
  });
  var keys = Object.keys(all);

  var h = '<div class="cb-bench"><div class="cb-map-t">Test bench — switch findings on and off</div>';
  if (!keys.length) {
    h += '<div class="cb-empty">Add some findings above first.</div></div>';
    return h;
  }
  h += '<div class="cb-chips">';
  keys.forEach(function (t) {
    var on = CB.bench.indexOf(t) >= 0;
    h += '<span class="cb-chip bench' + (on ? ' on' : '') + '" onclick="cbToggleBench(\'' +
         escAttrJs(t) + '\')">' + escHtml(t) + '</span>';
  });
  h += '</div>';

  var res = cbBenchResult();
  var core = cbCoreDifferential();

  h += '<div class="cb-bench-out">';
  if (res && res.score > 0) {
    h += '<div class="cb-bench-mine"><b>' + escHtml(CB.draft.name || "(unnamed)") + '</b> — ' +
         'match strength <b>' + (res.score * 100).toFixed(0) + '</b>' +
         '<span class="cb-badge">your condition</span></div>';
    if (res.evidence && res.evidence.missing && res.evidence.missing.length) {
      h += '<div class="cb-bench-miss">still needs: ' +
           escHtml(res.evidence.missing.slice(0, 4).join(", ")) + '</div>';
    }
  } else {
    h += '<div class="cb-bench-mine none">Your condition does not fire on these findings. ' +
         'It needs every one of its required findings.</div>';
  }

  if (core.length) {
    h += '<div class="cb-bench-core"><div class="cb-map-h">What the reviewed knowledge says ' +
         'about the same findings — these always rank above yours</div>';
    core.forEach(function (c) {
      h += '<div class="cb-core-row">' + (c.urgent ? '<span class="cb-urg">URGENT</span> ' : '') +
           escHtml(c.n) + ' <span class="cb-sc">' + (c.score * 100).toFixed(0) + '</span></div>';
    });
    h += '</div>';
  }
  h += '</div></div>';
  return h;
}

/* Stage 3 — the one that prevents harm. */
function cbShowImpact() {
  if (typeof overlayImpact !== "function") return;
  var r = overlayImpact(CB.draft);
  var el = document.getElementById("cbImpact");
  if (!el) return;

  if (!r.available) { el.innerHTML = '<div class="cb-empty">' + escHtml(r.reason) + '</div>'; return; }

  var h = '<div class="cb-impact-sum">';
  h += 'Checked your last <b>' + r.visits_examined + '</b> completed visit' +
       (r.visits_examined === 1 ? '' : 's') +
       (r.capped ? ' (of ' + r.visits_total + ')' : '') + '. ';
  h += 'This condition would have appeared in <b>' + r.fired_count + '</b> of them';
  if (r.outranked_count) {
    h += ', and in <b>' + r.outranked_count + '</b> it would have scored higher than the ' +
         'diagnosis recorded at the time';
  }
  h += '.</div>';

  if (r.outranked_count) {
    h += '<div class="cb-impact-list"><div class="cb-map-h">Where it would have outranked ' +
         'your recorded diagnosis</div>';
    r.outranked.slice(0, 10).forEach(function (x) {
      h += '<div class="cb-core-row">' + escHtml(x.date) + ' — yours <b>' +
        (x.score * 100).toFixed(0) + '</b> vs ' + escHtml(x.actual_dx || "(none recorded)") +
        ' ' + (x.actual_score !== null ? (x.actual_score * 100).toFixed(0) : "—") +
        (x.actual_is_recorded ? '' : ' <span class="cb-hint">(engine\'s leader, not a recorded diagnosis)</span>') +
        '</div>';
    });
    h += '</div>';
  }

  h += '<div class="cb-map-note">These are counts, not a verdict. Whether firing ' +
       (r.fired_count) + ' time' + (r.fired_count === 1 ? '' : 's') +
       ' is right is your clinical judgement.</div>';
  el.innerHTML = h;
}

function cbRender() {
  var el = document.getElementById("cbPanel");
  if (!el) return;
  if (!CB.open || !CB.draft) { el.innerHTML = ""; el.style.display = "none"; return; }
  el.style.display = "";

  var d = CB.draft;
  var h = '<div class="cb-wrap">';
  h += '<div class="cb-head"><h3>' + (CB.editingId ? "Edit your condition" : "New condition") +
       '</h3><button class="btn btn-s" onclick="cbClose()">Close</button></div>';

  h += '<div class="cb-warn">This is <b>your own</b> clinical reasoning, not reviewed content. ' +
       'It appears in your differential below the reviewed conditions and is always marked ' +
       'as yours. It can never displace or hide a red flag.</div>';

  h += '<div class="cb-field"><div class="cb-lab">Name</div>' +
    '<input id="cbName" value="' + escHtml(d.name) + '" placeholder="e.g. Evening dryness — my pattern" ' +
    'oninput="CB.draft.name=this.value">' +
    '</div>';

  h += cbTokenChips("req", "Required findings", "— all of these must be present for it to fire");
  h += cbTokenChips("sup", "Supporting findings", "— raise the match when present");
  h += cbTokenChips("con", "Findings against", "— lower the match when present");

  h += '<div class="cb-field"><label class="cb-urgent-row">' +
    '<input type="checkbox" ' + (d.urgent ? "checked" : "") +
    ' onchange="cbSet(\'urgent\', this.checked)"> Mark this urgent' +
    '</label>';
  if (d.urgent) {
    h += '<div class="cb-urgent-box">' +
      '<div class="cb-hint">An urgent flag is a safety claim. Yours adds an alert labelled ' +
      'as your own — it never replaces or hides a reviewed red flag. Saying why is required, ' +
      'and it will be sent to the administrator for review.</div>' +
      '<input id="cbUrgWhy" value="' + escHtml(d.urgent_reason) + '" ' +
      'placeholder="Why is this urgent?" oninput="CB.draft.urgent_reason=this.value">' +
      '</div>';
  }
  h += '</div>';

  h += cbWiringMap();
  h += cbTestBench();

  h += '<div class="cb-impact"><div class="cb-map-t">What this would have done to your own past visits</div>' +
       '<button class="btn btn-s" onclick="cbShowImpact()">Check against my last 200 visits</button>' +
       '<div id="cbImpact"></div></div>';

  h += '<div class="cb-actions">' +
    '<button class="btn btn-p" onclick="cbSave()">Save — mine only</button>' +
    (CB.editingId ? '<button class="btn btn-s" onclick="cbSubmit()">Send to admin for review</button>' : '') +
    (CB.editingId ? '<button class="btn btn-s" onclick="cbDelete()">Remove</button>' : '') +
    '</div>';

  h += '</div>';
  el.innerHTML = h;
}

/* The author's own list, for the home page. */
function cbMyConditionsHtml() {
  if (typeof overlayAll !== "function") return "";
  var me = (typeof CU !== "undefined" && CU) ? (CU.username || CU.name || "") : "";
  var mine = overlayAll().filter(function (o) { return !o.deleted && o.author === me; });

  var h = '<div class="home-sec"><div class="home-sec-t">My conditions ' +
    '<span class="home-sec-n">' + mine.length + '</span></div>';
  h += '<div class="cb-hint" style="margin-bottom:8px">Patterns you recognise, wired into your ' +
       'own differential. Yours only until you send one for review.</div>';
  if (!mine.length) {
    h += '<div class="cb-empty">None yet.</div>';
  } else {
    mine.forEach(function (o) {
      h += '<div class="cb-list-row" onclick="cbOpen(\'' + escAttrJs(o.id) + '\')">' +
        '<b>' + escHtml(o.name) + '</b>' +
        (o.urgent ? ' <span class="cb-urg">URGENT</span>' : '') +
        ' <span class="cb-state">' + escHtml(o.state) + '</span>' +
        '<div class="cb-hint">' + (o.req || []).length + ' required, ' +
        (o.sup || []).length + ' supporting</div></div>';
    });
  }
  h += '<button class="btn btn-p" style="margin-top:8px" onclick="cbOpen()">New condition +</button>';
  h += '</div>';
  return h;
}
