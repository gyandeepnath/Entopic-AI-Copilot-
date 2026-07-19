/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — RAPID CLINICAL REVIEW QUEUE                           */
/*                                                                  */
/* The founder-facing fast path for verifying the provisional        */
/* (NEEDS_CLINICAL_REVIEW) KB entries. Each row shows EVERYTHING the */
/* attestation covers — required findings, urgency flag, ICD code +  */
/* label, About summary — with one Verify button, so a batch pass    */
/* takes seconds per condition instead of a full editor round-trip.  */
/*                                                                  */
/* Verification is a CLINICAL ATTESTATION by the signed-in human:    */
/*  • admin-gated (clinical authority = the founder);                */
/*  • it flips review_status AND icd_status on the LIVE condition    */
/*    (the row displays the code precisely so the sign-off covers it)*/
/*  • persists via the existing local-edits overlay (kb-remote.js),  */
/*    so it survives reloads and remote KB bundle loads;             */
/*  • nothing here edits clinical CONTENT — only the review flags.   */
/*    Content edits stay in the KB editor (which re-stamps           */
/*    provisional, as it must).                                      */
/*                                                                  */
/* Pure core first (Node-testable); DOM wiring guarded at bottom.    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* One display row per provisional condition — everything the reviewer
   needs to attest, in plain language. */
function kbReviewItems() {
  if (typeof KNOWLEDGE_ALL === "undefined" || !KNOWLEDGE_ALL) return [];
  var pretty = (typeof kbPrettyToken === "function") ? kbPrettyToken : function (t) { return String(t).replace(/_/g, " "); };
  var findFn = (typeof findCondition === "function") ? findCondition : null;
  var out = [];
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];
    if (c.review_status !== "NEEDS_CLINICAL_REVIEW") continue;
    var info = (typeof resolveConditionInfo === "function") ? resolveConditionInfo(c.name, findFn, pretty) : null;
    out.push({
      name: c.name,
      domain: c._domain || c.domain || "",
      urgent: !!c.urgent,
      icd: c.icd || "",
      icd_label: c.icd_label || "",
      req: (c.req || []).map(pretty),
      summary: (info && info.summary) || ""
    });
  }
  /* urgent first (their urgency flags are the riskiest thing to leave
     unreviewed), then by domain, then name — so a reviewer can work one
     specialty area at a time. */
  out.sort(function (a, b) {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    if (a.domain !== b.domain) return a.domain < b.domain ? -1 : 1;
    return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
  });
  return out;
}

/* Has this live condition been clinically verified? (Used by the About
   panel to swap the provisional banner for a verified line.) */
function kbConditionVerified(name) {
  var c = (typeof findCondition === "function") ? findCondition(name) : null;
  return !!(c && c.review_status === "VERIFIED_BY_CLINICIAN");
}

/* The attestation. Flips the review flags on the live condition and
   persists through the local-edits overlay. Returns the condition, or
   null if it isn't found / isn't provisional. */
function kbRapidVerify(name, verifiedBy) {
  var c = (typeof findCondition === "function") ? findCondition(name) : null;
  if (!c || c.review_status !== "NEEDS_CLINICAL_REVIEW") return null;
  c.review_status = "VERIFIED_BY_CLINICIAN";
  c.icd_status = "VERIFIED_BY_CLINICIAN";
  c.review_verified_on = new Date().toISOString().slice(0, 10);
  c.review_verified_by = verifiedBy || "";
  if (typeof kbApplyLocalConditionUpsert === "function") kbApplyLocalConditionUpsert(c);
  return c;
}


/* ── Export sign-offs ─────────────────────────────────────────────
   Builds the full content of knowledge/verified.js from every condition
   the founder has verified on this device, so sign-offs can be baked
   permanently into the source KB (replace the file, commit). Pure. */
function kbBuildVerifiedExport() {
  var entries = [];
  if (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) {
    for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
      var c = KNOWLEDGE_ALL[i];
      if (c.review_status === "VERIFIED_BY_CLINICIAN") {
        entries.push({ name: c.name, on: c.review_verified_on || "", by: c.review_verified_by || "" });
      }
    }
  }
  entries.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  var lines = [];
  for (var j = 0; j < entries.length; j++) {
    lines.push('  ' + JSON.stringify(entries[j].name) + ': { on: ' +
      JSON.stringify(entries[j].on) + ', by: ' + JSON.stringify(entries[j].by) + ' }');
  }
  var body =
    '/* ═══════════════════════════════════════════════════════════════ */\n' +
    '/* ENTOPIC — FOUNDER CLINICAL SIGN-OFFS (source of truth)          */\n' +
    '/* Generated by the Admin panel "Export sign-offs" on ' + new Date().toISOString().slice(0, 10) + '.    */\n' +
    '/* Replace knowledge/verified.js with this file and commit to make */\n' +
    '/* these attestations permanent on every device. Review flags only */\n' +
    '/* — no clinical content.                                          */\n' +
    '/* ═══════════════════════════════════════════════════════════════ */\n' +
    '"use strict";\n\n' +
    'var KB_VERIFIED = {\n' + lines.join(",\n") + (lines.length ? "\n" : "") + '};\n';
  return { count: entries.length, source: body };
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM WIRING (browser only, admin-gated)                          */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  var _kre = (typeof escH === "function") ? escH : function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  var _krFilter = { search: "", domain: "" };

  window.showReviewQueue = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;   /* founder authority */
    _krFilter = { search: "", domain: "" };
    var m = document.getElementById("modalReview");
    if (m) m.style.display = "flex";
    _krRender();
  };

  window.reviewQueueSearch = function (v) { _krFilter.search = (v || "").toLowerCase(); _krRenderList(); };
  window.reviewQueueDomain = function (d) { _krFilter.domain = (_krFilter.domain === d ? "" : d); _krRender(); };

  /* Download the ready-to-commit knowledge/verified.js. */
  window.exportSignoffs = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var out = kbBuildVerifiedExport();
    if (!out.count) { if (typeof alert === "function") alert("No sign-offs yet — verify entries in the review queue first."); return; }
    var blob = new Blob([out.source], { type: "text/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "verified.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };

  window.reviewVerify = function (name) {
    var by = (typeof CU !== "undefined" && CU && CU.name) ? CU.name : "";
    var c = kbRapidVerify(name, by);
    if (!c) return;
    _krRender();
    /* keep the Admin tab's count live if it's behind the modal */
    if (typeof HOME_TAB !== "undefined" && HOME_TAB === "admin" && typeof renderHome === "function") renderHome();
  };

  function _krRender() {
    var box = document.getElementById("reviewContent");
    if (!box) return;
    var items = kbReviewItems();
    var total = (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL.length : 0;

    if (!items.length) {
      box.innerHTML = '<div style="padding:16px;font-size:.78rem;color:var(--sl)">' +
        '✓ Nothing awaiting review — all ' + total + ' conditions carry a clinical sign-off or curated status.</div>';
      return;
    }

    /* domain chips with counts */
    var perDomain = {};
    for (var i = 0; i < items.length; i++) perDomain[items[i].domain] = (perDomain[items[i].domain] || 0) + 1;
    var chips = "";
    var dkeys = Object.keys(perDomain).sort(function (a, b) { return perDomain[b] - perDomain[a]; });
    for (var d = 0; d < dkeys.length; d++) {
      chips += '<button class="cb-chip' + (_krFilter.domain === dkeys[d] ? ' cb-chip-on' : '') +
        '" onclick="reviewQueueDomain(\'' + _kre(dkeys[d]).replace(/'/g, "\\'") + '\')">' +
        _kre(dkeys[d]) + ' <span style="opacity:.6">' + perDomain[dkeys[d]] + '</span></button>';
    }

    box.innerHTML =
      '<div style="font-size:.66rem;color:var(--sv);margin-bottom:6px">' +
        items.length + ' of ' + total + ' conditions provisional. Clicking <b>Verify</b> records YOUR clinical attestation ' +
        'of the findings, urgency flag, ICD code and summary shown — saved on this device.</div>' +
      '<input id="krSearch" type="text" placeholder="Search conditions…" oninput="reviewQueueSearch(this.value)" ' +
        'style="width:100%;box-sizing:border-box;padding:6px 8px;font-size:.7rem;border:1px solid var(--ms);border-radius:var(--r);margin-bottom:6px">' +
      '<div class="cb-facets" style="margin-bottom:6px">' + chips + '</div>' +
      '<div id="krList"></div>';
    var si = document.getElementById("krSearch");
    if (si) si.value = _krFilter.search;
    _krRenderList();
  }

  function _krRenderList() {
    var host = document.getElementById("krList");
    if (!host) return;
    var items = kbReviewItems().filter(function (it) {
      if (_krFilter.domain && it.domain !== _krFilter.domain) return false;
      if (_krFilter.search) {
        var hay = (it.name + " " + it.icd + " " + it.icd_label + " " + it.domain).toLowerCase();
        if (hay.indexOf(_krFilter.search) === -1) return false;
      }
      return true;
    });
    var h = "";
    for (var i = 0; i < Math.min(items.length, 60); i++) {
      var it = items[i];
      h += '<div class="kr-row">' +
        '<div class="kr-main">' +
          '<div class="kr-name">' + _kre(it.name) +
            (it.urgent ? ' <span class="kr-urgent">URGENT flag</span>' : '') +
            ' <span class="kr-domain">' + _kre(it.domain) + '</span></div>' +
          (it.icd ? '<div class="kr-icd">ICD-10: <b>' + _kre(it.icd) + '</b> — ' + _kre(it.icd_label) + '</div>' : '<div class="kr-icd">No ICD code</div>') +
          (it.req.length ? '<div class="kr-req">Requires: ' + _kre(it.req.join(", ")) + '</div>' : '') +
          (it.summary ? '<div class="kr-sum">' + _kre(it.summary) + '</div>' : '') +
        '</div>' +
        '<button class="btn btn-p kr-verify" onclick="reviewVerify(\'' + _kre(it.name).replace(/'/g, "\\'") + '\')">Verify ✓</button>' +
      '</div>';
    }
    if (items.length > 60) {
      h += '<div style="font-size:.6rem;color:var(--sv);padding:6px 2px">Showing 60 of ' + items.length + ' — narrow by search or area.</div>';
    }
    if (!items.length) h = '<div style="padding:10px;font-size:.7rem;color:var(--sv)">No matches for this filter.</div>';
    host.innerHTML = h;
  }
}
