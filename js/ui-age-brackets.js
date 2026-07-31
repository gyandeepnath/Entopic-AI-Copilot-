/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — AGE BRACKET REVIEW SCREEN                              */
/*                                                                  */
/* Which age bracket a condition belongs to is a clinical judgement. */
/* Engineering built the mechanism; this screen is where the founder */
/* supplies the judgement, one click per condition, no code.        */
/*                                                                  */
/* Choices are stored locally and replay over the suggestions in     */
/* knowledge/age-classification.js, so a founder decision always     */
/* wins and survives an app update. "Export" produces a file that    */
/* can be baked into the source so every device gets it.             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var AGE_BRACKET_OPTIONS = [
  { id: "paediatric_age",  label: "Paediatric",  hint: "presents under 18" },
  { id: "young_adult_age", label: "Young adult", hint: "presents 18–40" },
  { id: "",                label: "Leave as-is", hint: "keeps the old under-18 behaviour" }
];

var _ageFilter = "";

function ageBracketScreen() {
  if (typeof ageBracketPending !== "function") return "";
  var pending = ageBracketPending();
  var classified = (typeof KNOWLEDGE_ALL !== "undefined")
    ? KNOWLEDGE_ALL.filter(function (c) { return c.age_bracket; }) : [];
  var confirmed = classified.filter(function (c) {
    return c.age_bracket_status === "VERIFIED_BY_CLINICIAN";
  }).length;

  var h = '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">👶 Age brackets — clinical review</div>' +
    '<div class="home-settings-desc">' +
      'The knowledge base had one token for "young", which the engine reads as <b>under 18</b>. ' +
      'Many conditions used it where a <b>young adult</b> is meant — which is why a simulated ' +
      'optic neuritis patient could be five years old. ' +
      'Conditions whose name states infancy or childhood have been pre-set as a suggestion; ' +
      'the rest are below for you to classify. ' +
      '<b>Nothing has changed for an unclassified condition</b> — it behaves exactly as before.' +
    '</div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;margin:8px 0;font-size:.62rem">' +
      '<div><b>' + classified.length + '</b> classified</div>' +
      '<div><b>' + confirmed + '</b> confirmed by you</div>' +
      '<div><b>' + pending.length + '</b> awaiting your decision</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
      '<input class="e-in" id="ageFilter" placeholder="Filter by name or domain…" ' +
        'value="' + esc(_ageFilter) + '" oninput="ageBracketFilter(this.value)" style="flex:1;min-width:180px">' +
      '<button class="btn btn-s" style="font-size:.58rem" onclick="ageBracketExport()">Export decisions</button>' +
    '</div>';

  h += '<div id="ageBracketList">' + ageBracketRows(pending) + '</div>';

  h += '<div style="font-size:.54rem;color:var(--sv);margin-top:8px">' +
    'Your choices are saved on this device and override the built-in suggestions. ' +
    'Export them to have them baked into the build for every device.</div>' +
  '</div>';
  return h;
}

function ageBracketRows(pending) {
  var q = _ageFilter.toLowerCase();
  var rows = pending.filter(function (p) {
    if (!q) return true;
    return (p.name + " " + p.domain).toLowerCase().indexOf(q) >= 0;
  });
  if (!rows.length) {
    return '<div style="font-size:.6rem;color:var(--sv);padding:8px 0">' +
      (pending.length ? 'No condition matches that filter.' : '✓ Every condition has been classified.') + '</div>';
  }
  return '<div style="max-height:420px;overflow:auto;border:1px solid var(--fg);border-radius:var(--r)">' +
    rows.map(function (p) {
      var cur = (typeof ageBracketFor === "function") ? ageBracketFor(p.name) : "";
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;' +
          'padding:5px 8px;border-bottom:1px solid var(--fg);flex-wrap:wrap">' +
        '<div style="font-size:.62rem;flex:1;min-width:160px">' + esc(p.name) +
          '<span style="color:var(--sv)"> · ' + esc(p.domain) + '</span>' +
          (p.suggested ? '<span style="color:#b8860b;font-size:.52rem"> · suggested</span>' : '') + '</div>' +
        '<div style="display:flex;gap:4px">' +
          AGE_BRACKET_OPTIONS.map(function (o) {
            var on = (cur || "") === o.id;
            return '<button class="btn ' + (on ? "btn-p" : "btn-s") + '" style="font-size:.54rem"' +
              ' title="' + esc(o.hint) + '"' +
              ' onclick="ageBracketChoose(' + JSON.stringify(p.name).replace(/"/g, "&quot;") +
              ',' + JSON.stringify(o.id) + ')">' + esc(o.label) + '</button>';
          }).join("") +
        '</div>' +
      '</div>';
    }).join("") + '</div>';
}

function ageBracketFilter(v) {
  _ageFilter = v || "";
  var el = document.getElementById("ageBracketList");
  if (el) el.innerHTML = ageBracketRows(ageBracketPending());
}

function ageBracketChoose(name, token) {
  if (typeof ageBracketSet !== "function") return;
  ageBracketSet(name, token);
  if (typeof toast === "function") {
    toast(token ? (name + " → " + token.replace(/_age$/, "").replace(/_/g, " "))
                : (name + " left unchanged"));
  }
  if (typeof logAudit === "function") logAudit("age_bracket_set", name + " → " + (token || "none"), {});
  /* Applies on next load — say so rather than pretending it is live. */
  var el = document.getElementById("ageBracketList");
  if (el) el.innerHTML = ageBracketRows(ageBracketPending());
}

/* Emit a source file the founder can drop into knowledge/ so every device
   inherits the decisions, exactly like the KB sign-off export. */
function ageBracketExport() {
  var o = (typeof ageBracketOverrides === "function") ? ageBracketOverrides() : {};
  var names = Object.keys(o).sort();
  if (!names.length) { if (typeof toast === "function") toast("No decisions to export yet."); return; }

  var body = names.map(function (n) {
    return '  ' + JSON.stringify(n) + ': ' + JSON.stringify(o[n]) + ',';
  }).join("\n").replace(/,$/, "");

  var src = '/* Age bracket decisions exported from Entopic on ' +
    new Date().toISOString().slice(0, 10) + '.\n' +
    '   Reviewed and confirmed by the clinician. Merge into\n' +
    '   knowledge/age-classification.js -> KB_AGE_BRACKET. */\n' +
    'var KB_AGE_BRACKET_CONFIRMED = {\n' + body + '\n};\n';

  if (dlSaveAs("age-brackets-confirmed.js", src, "text/javascript")) {
    if (typeof toast === "function") toast(names.length + " decisions exported.");
  } else {
    if (typeof toast === "function") toast("Could not export on this browser.");
  }
}
