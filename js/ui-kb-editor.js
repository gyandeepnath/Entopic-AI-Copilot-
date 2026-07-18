/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — KNOWLEDGE BASE EDITOR (owner-facing, no coding)       */
/*                                                                  */
/* Fill fields → a working engine condition. Live validation warns    */
/* about duplicates, near-duplicates, contradictions, and "this can   */
/* never fire" (a required token nothing produces) as you type — the  */
/* checks live in js/kb-authoring.js (shared with the bulk seeder).   */
/*                                                                  */
/* Save applies to your KB immediately (local, offline) and, if you   */
/* are signed in as the build owner, upserts to the cloud. Publish     */
/* snapshots the whole KB as a new version every installation picks    */
/* up. Nothing here can weaken safety: the compiler flags entries      */
/* NEEDS_CLINICAL_REVIEW, red-flag alerts live in engine code, and     */
/* cloud writes are gated by the server-side editor allowlist (RLS).   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_EDITOR = {
  isCloudEditor: false,   /* signed in as an allowlisted owner */
  editingName: null       /* name of the condition being edited (null = new) */
};

/* Show/enable the editor entry point only for the owner. Called from the
   dashboard render. Cloud-editor status is the real gate; a local override
   (localStorage) lets the owner author offline before cloud is set up —
   safe, because local authoring only touches this device's KB and cloud
   writes are still RLS-gated. */
function kbEditorAllowed(cb) {
  /* Super admin always edits (full access to everything). */
  if (typeof isAdmin === "function" && isAdmin()) { cb(true); return; }
  var localFlag = false;
  try { localFlag = localStorage.getItem("entopic_kb_editor_local") === "1"; } catch (e) {}
  if (typeof cloudKbIsEditor === "function") {
    cloudKbIsEditor(function (isEd) {
      KB_EDITOR.isCloudEditor = !!isEd;
      cb(isEd || localFlag);
    });
  } else {
    cb(localFlag);
  }
}

function openKbEditor(conditionName) {
  KB_EDITOR.editingName = conditionName || null;
  showPage("pgKbEditor");
  renderKbEditor(conditionName ? kbFindConditionForEdit(conditionName) : null);
}
function closeKbEditor() { showPage("pgHome"); renderHome(); }

function kbFindConditionForEdit(name) {
  if (typeof findCondition === "function") {
    var c = findCondition(name);
    if (c) {
      return {
        name: c.name, route: c.route, domain: c._domain || c.domain || "",
        urgent: !!c.urgent, icd: c.icd || "", icd_label: c.icd_label || "",
        req: (c.req || []).slice(), sup: (c.sup || []).slice(), con: (c.con || []).slice(),
        temporal: (c.temporal || []).slice(), tests: (c.tests || []).slice(),
        exclusions: (c.exclusions || []).slice()
      };
    }
  }
  return null;
}

function kbEditorDomains() {
  if (typeof KNOWLEDGE_DOMAINS !== "undefined") return Object.keys(KNOWLEDGE_DOMAINS);
  return ["Surface & Lids", "Cornea", "Retina", "Neuro-Ophthalmic", "Binocular Vision",
          "Refractive", "Glaucoma", "Anterior / Uveitis", "Lens"];
}

/* ── FOUNDER REVIEW QUEUE ──
   Every AI-drafted or edited condition carries review_status =
   "NEEDS_CLINICAL_REVIEW" until the clinician verifies it. This queue is how
   the founder finds them: urgent entries first (their urgency flags are the
   riskiest thing to leave unreviewed), then alphabetical. */
function kbReviewQueue() {
  if (typeof KNOWLEDGE_ALL === "undefined") return [];
  var q = [];
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];
    if (c.review_status === "NEEDS_CLINICAL_REVIEW") q.push(c);
  }
  q.sort(function (a, b) {
    if (!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;
    return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
  });
  return q;
}

function kbRenderReviewQueue() {
  var el = document.getElementById("kbeReviewQueue");
  if (!el) return;
  var q = kbReviewQueue();
  var title = document.getElementById("kbeReviewTitle");
  if (title) title.textContent = "Review Queue (" + q.length + " awaiting your verification)";
  if (!q.length) {
    el.innerHTML = '<div class="kbe-check kbe-ok"><span>✓</span><span>Nothing awaiting review.</span></div>';
    return;
  }
  var h = "";
  for (var i = 0; i < Math.min(q.length, 400); i++) {
    var c = q[i];
    h += '<div class="kbe-queue-item" onclick="openKbEditor(' + "'" + esc(c.name).replace(/'/g, "\\'") + "'" + ')" ' +
      'style="cursor:pointer;padding:3px 6px;border-bottom:1px solid var(--fg);font-size:.6rem;display:flex;gap:6px;align-items:center">' +
      (c.urgent ? '<span style="color:var(--ur,#c0392b);font-weight:700" title="urgent flag needs sign-off">⚑</span>' : '<span style="opacity:.35">·</span>') +
      '<span style="flex:1">' + esc(c.name) + '</span>' +
      '<span style="color:var(--sv);font-size:.5rem">' + esc(c._domain || c.domain || "") + '</span>' +
      '</div>';
  }
  el.innerHTML = h;
}

/* Mark the condition being edited as clinically verified. This is a clinical
   attestation by the signed-in clinician — it deliberately does NOT go
   through the authoring compiler (which stamps everything provisional).
   It flips the review fields on the LIVE condition and persists it as a
   local edit (and to the cloud when signed in as owner). */
function kbEditorMarkVerified() {
  var name = KB_EDITOR.editingName;
  if (!name) { kbEditorMsg("Open an existing condition first — verification applies to a saved entry.", "err"); return; }
  var live = (typeof findCondition === "function") ? findCondition(name) : null;
  if (!live) { kbEditorMsg("Condition not found in the live KB.", "err"); return; }
  var ok = window.confirm(
    "Mark “" + name + "” as clinically verified?\n\n" +
    "This records that YOU have reviewed its tokens, urgency flag and profile. " +
    "Any later edit makes it provisional again.");
  if (!ok) return;
  live.review_status = "VERIFIED_BY_CLINICIAN";
  live.review_verified_on = new Date().toISOString().slice(0, 10);
  if (typeof kbApplyLocalConditionUpsert === "function") kbApplyLocalConditionUpsert(live);
  if (KB_EDITOR.isCloudEditor && typeof cloudKbUpsertCondition === "function") {
    var row = kbEditorCloudRow(live);
    row.review_status = "VERIFIED_BY_CLINICIAN";
    cloudKbUpsertCondition(row, function (err) {
      kbEditorMsg(err ? "Verified locally. Cloud update failed: " + err.message
                      : "Verified ✓ (saved locally + cloud).", err ? "err" : "ok");
    });
  } else {
    kbEditorMsg("Verified ✓ (saved on this device).", "ok");
  }
  kbRenderReviewQueue();
  var st = document.getElementById("kbeReviewStatus");
  if (st) st.innerHTML = kbEditorStatusHtml(live);
}

function kbEditorStatusHtml(cond) {
  if (!cond) return "";
  if (cond.review_status === "VERIFIED_BY_CLINICIAN") {
    return '<span style="color:var(--ok,#27ae60)">✓ Clinically verified' +
      (cond.review_verified_on ? " on " + esc(cond.review_verified_on) : "") + '</span>';
  }
  if (cond.review_status === "NEEDS_CLINICAL_REVIEW") {
    return '<span style="color:var(--wa,#e67e22)">⚠ Provisional — needs your clinical review' +
      (cond.urgent ? ' (incl. its URGENT flag)' : '') + '</span>';
  }
  return '<span style="color:var(--sv)">Curated entry (original KB)</span>';
}

function renderKbEditor(draft) {
  draft = draft || { name: "", route: "", domain: "", urgent: false, icd: "", icd_label: "",
                     req: [], sup: [], con: [], temporal: [], tests: [], exclusions: [] };
  var routes = (typeof KB_KNOWN_ROUTES !== "undefined") ? KB_KNOWN_ROUTES : [];
  var domains = kbEditorDomains();
  var tokenList = (typeof kbKnownTokens === "function") ? kbKnownTokens() : [];
  var condNames = (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL.map(function (c) { return c.name; }).sort() : [];

  function opt(v, sel) { return '<option value="' + esc(v) + '"' + (v === sel ? " selected" : "") + '>' + esc(v) + '</option>'; }
  function tokenField(id, label, val, hint) {
    return '<div class="kbe-field">' +
      '<label>' + esc(label) + '</label>' +
      '<input id="' + id + '" class="kbe-tok" list="kbeTokens" value="' + esc((val || []).join(", ")) + '" ' +
      'placeholder="comma-separated" oninput="kbEditorValidate()">' +
      (hint ? '<div class="kbe-hint">' + esc(hint) + '</div>' : '') +
      '</div>';
  }

  var h =
    '<datalist id="kbeTokens">' + tokenList.map(function (t) { return '<option value="' + esc(t) + '">'; }).join("") + '</datalist>' +
    '<datalist id="kbeCondNames">' + condNames.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + '</datalist>' +

    '<div class="kbe-grid">' +
      '<div class="kbe-form">' +
        '<div class="kbe-field"><label>Condition name</label>' +
          '<input id="kbeName" value="' + esc(draft.name) + '" placeholder="e.g. Filamentary Keratitis" oninput="kbEditorValidate()"' +
          (KB_EDITOR.editingName ? ' readonly title="Editing an existing condition — name is the key"' : '') + '></div>' +

        '<div class="kbe-row">' +
          '<div class="kbe-field"><label>Domain</label><select id="kbeDomain" onchange="kbEditorValidate()">' +
            '<option value="">—</option>' + domains.map(function (d) { return opt(d, draft.domain); }).join("") + '</select></div>' +
          '<div class="kbe-field"><label>Route</label><select id="kbeRoute" onchange="kbEditorValidate()">' +
            '<option value="">—</option>' + routes.map(function (r) { return opt(r, draft.route); }).join("") + '</select></div>' +
          '<div class="kbe-field kbe-urgent"><label>Urgent</label>' +
            '<input type="checkbox" id="kbeUrgent"' + (draft.urgent ? " checked" : "") + ' onchange="kbEditorValidate()"></div>' +
        '</div>' +

        tokenField("kbeReq", "Required tokens (hallmark — must be present to score)", draft.req, "The defining feature(s). If nothing in the exam produces one of these, the condition can never surface — you'll be warned.") +
        tokenField("kbeSup", "Supportive tokens (raise confidence)", draft.sup) +
        tokenField("kbeCon", "Contradicting tokens (lower / rule out)", draft.con) +
        tokenField("kbeTemporal", "Temporal (acute / chronic / progressive / …)", draft.temporal) +
        tokenField("kbeTests", "Objective tests / signs", draft.tests) +

        '<div class="kbe-field"><label>Excludes (condition names it supersedes)</label>' +
          '<input id="kbeExcl" list="kbeCondNames" value="' + esc((draft.exclusions || []).join(", ")) + '" placeholder="comma-separated condition names" oninput="kbEditorValidate()"></div>' +

        '<div class="kbe-row">' +
          '<div class="kbe-field"><label>ICD-10 code</label><input id="kbeIcd" value="' + esc(draft.icd) + '" placeholder="e.g. H16.9" oninput="kbEditorValidate()"></div>' +
          '<div class="kbe-field kbe-grow"><label>ICD-10 label</label><input id="kbeIcdLabel" value="' + esc(draft.icd_label) + '" oninput="kbEditorValidate()"></div>' +
        '</div>' +

        '<div id="kbeReviewStatus" style="font-size:.6rem;padding:2px 0">' +
          kbEditorStatusHtml(KB_EDITOR.editingName && typeof findCondition === "function" ? findCondition(KB_EDITOR.editingName) : null) +
        '</div>' +

        '<div class="kbe-actions">' +
          '<button class="btn btn-p" onclick="kbEditorSave()" id="kbeSaveBtn">Save to my KB</button>' +
          (KB_EDITOR.editingName ?
            '<button class="btn btn-s" onclick="kbEditorMarkVerified()" id="kbeVerifyBtn" title="Record that you have clinically reviewed this condition">Mark clinically verified ✓</button>' : '') +
          '<button class="btn btn-s" onclick="kbEditorPublish()" id="kbePublishBtn" title="Push a new KB version to every device">Publish to all devices…</button>' +
          '<button class="btn btn-s" onclick="closeKbEditor()">Close</button>' +
          '<span id="kbeSaveMsg" class="kbe-savemsg"></span>' +
        '</div>' +
      '</div>' +

      '<div class="kbe-side">' +
        '<div class="kbe-panel-title" id="kbeReviewTitle">Review Queue</div>' +
        '<div id="kbeReviewQueue" style="max-height:180px;overflow-y:auto;border:1px solid var(--fg);border-radius:var(--r);margin-bottom:8px"></div>' +
        '<div class="kbe-panel-title">Live checks</div>' +
        '<div id="kbeChecks" class="kbe-checks"></div>' +
        '<div class="kbe-panel-title">Preview (what the engine stores)</div>' +
        '<pre id="kbePreview" class="kbe-preview"></pre>' +
      '</div>' +
    '</div>';

  document.getElementById("kbEditorContent").innerHTML = h;
  kbEditorValidate();
  kbRenderReviewQueue();
}

/* Read the form into a draft object. */
function kbEditorReadForm() {
  function v(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function chk(id) { var el = document.getElementById(id); return !!(el && el.checked); }
  return {
    name: v("kbeName"), domain: v("kbeDomain"), route: v("kbeRoute"), urgent: chk("kbeUrgent"),
    icd: v("kbeIcd"), icd_label: v("kbeIcdLabel"),
    req: v("kbeReq"), sup: v("kbeSup"), con: v("kbeCon"),
    temporal: v("kbeTemporal"), tests: v("kbeTests"), exclusions: v("kbeExcl")
  };
}

function kbEditorValidate() {
  if (typeof kbLintCondition !== "function") return { errors: [{ msg: "authoring module not loaded" }] };
  var draft = kbEditorReadForm();
  var ctx = (typeof kbBuildContext === "function") ? kbBuildContext(KB_EDITOR.editingName) : {};
  var res = kbLintCondition(draft, ctx);

  var el = document.getElementById("kbeChecks");
  if (el) {
    var rows = "";
    function line(cls, icon, f) { return '<div class="kbe-check ' + cls + '"><span>' + icon + '</span><span>' + esc(f.msg) + '</span></div>'; }
    res.errors.forEach(function (f) { rows += line("kbe-err", "✕", f); });
    res.warnings.forEach(function (f) { rows += line("kbe-warn", "⚠", f); });
    res.infos.forEach(function (f) { rows += line("kbe-info", "ℹ", f); });
    if (!res.errors.length && !res.warnings.length) rows = '<div class="kbe-check kbe-ok"><span>✓</span><span>No blocking problems. Remember it saves as provisional (needs your clinical review).</span></div>' + rows;
    el.innerHTML = rows;
  }
  var pv = document.getElementById("kbePreview");
  if (pv) pv.textContent = JSON.stringify(res.normalized, null, 2);

  var saveBtn = document.getElementById("kbeSaveBtn");
  if (saveBtn) saveBtn.disabled = res.errors.length > 0;
  return res;
}

/* Map the compiler's normalized object → the cloud kb_conditions row shape. */
function kbEditorCloudRow(cond) {
  return {
    name: cond.name, domain: cond.domain || "Authored", route: cond.route,
    req: cond.req, sup: cond.sup, con: cond.con, temporal: cond.temporal,
    tests: cond.tests, exclusions: cond.exclusions, urgent: !!cond.urgent,
    icd10: cond.icd || null, icd_label: cond.icd_label || null,
    review_status: "NEEDS_CLINICAL_REVIEW",
    provenance: { source: "kb-editor", authored: new Date().toISOString().slice(0, 10) }
  };
}

function kbEditorMsg(text, kind) {
  var el = document.getElementById("kbeSaveMsg");
  if (!el) return;
  el.textContent = text;
  el.className = "kbe-savemsg " + (kind === "err" ? "kbe-err" : kind === "ok" ? "kbe-ok" : "");
}

function kbEditorSave() {
  var res = kbEditorValidate();
  if (res.errors.length) { kbEditorMsg("Fix the blocking problems first.", "err"); return; }
  var cond = res.normalized;

  /* 1) apply to the running local KB now (works offline) */
  if (typeof kbApplyLocalConditionUpsert === "function") kbApplyLocalConditionUpsert(cond);
  KB_EDITOR.editingName = cond.name; /* subsequent saves edit, not duplicate */

  /* 2) if signed in as owner, upsert to the cloud too */
  if (KB_EDITOR.isCloudEditor && typeof cloudKbUpsertCondition === "function") {
    kbEditorMsg("Saved locally · syncing to cloud…", "ok");
    cloudKbUpsertCondition(kbEditorCloudRow(cond), function (err) {
      if (err) kbEditorMsg("Saved locally. Cloud save failed: " + err.message + " (will stay on this device).", "err");
      else kbEditorMsg("Saved to your KB (local + cloud). Publish when ready to reach other devices.", "ok");
    });
  } else {
    kbEditorMsg("Saved to this device's KB. Sign in as owner to sync + publish to other devices.", "ok");
  }
}

function kbEditorPublish() {
  var res = kbEditorValidate();
  if (res.errors.length) { kbEditorMsg("Fix the blocking problems first.", "err"); return; }
  if (!KB_EDITOR.isCloudEditor) {
    kbEditorMsg("Publishing needs owner sign-in (cloud). Your changes are saved on this device.", "err");
    return;
  }
  /* make sure the current edit is in the KB, then snapshot everything */
  kbEditorSave();
  var current = (typeof KB_META !== "undefined" && KB_META.version) || "1.0.0";
  var suggested = kbBumpPatch(current);
  var version = window.prompt(
    "Publish the ENTIRE current knowledge base as a new version that every device will download.\n\n" +
    "Current version: " + current + "\nNew version:", suggested);
  if (!version) { kbEditorMsg("Publish cancelled.", ""); return; }
  version = String(version).trim();

  var bundle = (typeof kbExportCurrentBundle === "function") ? kbExportCurrentBundle() : null;
  /* validate the whole bundle with the same rail the installs use */
  if (typeof validateKbBundle === "function") {
    var v = validateKbBundle(bundle);
    if (!v.ok) { kbEditorMsg("Bundle failed validation (" + v.errors.slice(0, 2).join("; ") + ") — not published.", "err"); return; }
  }
  kbEditorMsg("Publishing v" + version + "…", "ok");
  cloudKbPublishVersion(version, "Published from KB editor", bundle, function (err) {
    if (err) { kbEditorMsg("Publish failed: " + err.message, "err"); return; }
    if (typeof KB_META !== "undefined") KB_META.version = version;
    kbEditorMsg("Published v" + version + ". Every device will pick it up on next open (or 'Check for updates').", "ok");
  });
}

function kbBumpPatch(v) {
  var p = String(v).split(".");
  var last = parseInt(p[p.length - 1], 10);
  if (isNaN(last)) return v + ".1";
  p[p.length - 1] = String(last + 1);
  return p.join(".");
}
