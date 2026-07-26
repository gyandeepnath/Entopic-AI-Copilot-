/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ASSIGNMENTS UI (faculty side)                          */
/*                                                                  */
/* A tutor sets work in one short form: what to cover, how hard, how */
/* many, by when, for whom. Everything else is derived — the cases   */
/* come from the knowledge base at launch time, so an assignment is  */
/* a small rule, not a stored list of questions that can go stale.   */
/*                                                                  */
/* Cohort progress is shown per student, and deliberately reports    */
/* what happened (attempted / correct) rather than issuing a grade.  */
/* Learning telemetry only — no patient data is involved anywhere on */
/* this screen.                                                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Scope choices, kept in one place so the form and the summary agree. */
var ASSIGN_SCOPES = [
  { id: "common", label: "Common conditions" },
  { id: "all",    label: "Anything in the KB" },
  { id: "urgent", label: "Red flags only" },
  { id: "domain", label: "One domain…" }
];

function assignDomainList() {
  var seen = {}, out = [];
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    KNOWLEDGE_ALL.forEach(function (c) {
      var d = c.domain || "Other";
      if (!seen[d]) { seen[d] = true; out.push(d); }
    });
  }
  return out.sort();
}

/* Students this tutor can assign to. Empty selection = the whole cohort. */
function assignStudentList() {
  var users = (typeof loadUsers === "function") ? loadUsers() : [];
  return users.filter(function (u) { return u.role === "student"; });
}

function assignScopeLabel(a) {
  if (a.scope === "domain") return a.domain || "One domain";
  for (var i = 0; i < ASSIGN_SCOPES.length; i++) if (ASSIGN_SCOPES[i].id === a.scope) return ASSIGN_SCOPES[i].label;
  return a.scope;
}

/* ── Faculty card, for the Teaching tab ──────────────────────────── */

function assignFacultyCard() {
  if (typeof assignLoad !== "function") return "";
  var list = assignLoad();
  var h = '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">📌 Assignments</div>' +
    '<div class="home-settings-desc">' +
      'Set practice work for your students — a scope, a difficulty and a number of cases. ' +
      'Cases are drawn from the knowledge base when the student starts, so an assignment never goes stale. ' +
      'Progress below is learning data only; no patient records are involved.' +
    '</div>' +
    '<button class="btn btn-p" style="font-size:.62rem" onclick="assignOpenForm()">New assignment</button>';

  if (!list.length) {
    return h + '<div style="font-size:.58rem;color:var(--sv);margin-top:8px">No assignments yet.</div></div>';
  }

  list.slice().reverse().forEach(function (a) {
    var cohort = assignCohortProgress(a);
    var target = (a.scope === "list" && a.conditions.length) ? a.conditions.length : a.count;
    var complete = cohort.filter(function (r) { return r.complete; }).length;

    h += '<div style="border-top:1px solid var(--fg);padding:7px 0">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap">' +
        '<div style="font-size:.64rem;font-weight:600">' + esc(a.title) +
          ' <span style="font-weight:400;color:var(--sv)">· ' + esc(assignScopeLabel(a)) +
          ' · ' + esc(a.mode === "osce" ? "OSCE" : simTier(a.tier).label) +
          ' · ' + target + ' case' + (target === 1 ? '' : 's') +
          (a.due ? ' · due ' + esc(a.due) : '') + '</span></div>' +
        '<button class="btn btn-s" style="font-size:.54rem" onclick="assignRemove(\'' + a.id + '\')">Delete</button>' +
      '</div>' +
      '<div style="font-size:.56rem;color:var(--sl)">' +
        (a.assignedTo && a.assignedTo.length
          ? a.assignedTo.length + ' student(s) assigned'
          : 'Whole cohort') +
        ' · ' + cohort.length + ' started · ' + complete + ' finished</div>';

    if (cohort.length) {
      h += '<div style="margin-top:4px">';
      cohort.forEach(function (r) {
        var pct = Math.round(100 * r.done / Math.max(1, r.target));
        h += '<div style="display:flex;align-items:center;gap:8px;font-size:.56rem;margin:2px 0">' +
          '<div style="width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.username) + '</div>' +
          '<div style="flex:1;height:5px;background:var(--gr);border-radius:3px;overflow:hidden">' +
            '<div style="width:' + pct + '%;height:100%;background:' + (r.complete ? "#2e7d32" : "var(--ink)") + '"></div></div>' +
          '<div style="width:70px;text-align:right;font-family:var(--mono)">' +
            r.done + '/' + r.target + ' · ' + r.accuracy + '%</div>' +
        '</div>';
      });
      h += '</div>';
    } else {
      h += '<div style="font-size:.54rem;color:var(--sv);margin-top:3px">Nobody has started this yet.</div>';
    }
    h += '</div>';
  });

  return h + '</div>';
}

function assignRemove(id) {
  var a = assignFind(id);
  if (!a) return;
  if (!window.confirm('Delete "' + a.title + '"? Student progress against it is kept but will no longer be shown.')) return;
  assignDelete(id);
  if (typeof renderHome === "function") renderHome();
}

/* ── The create form ─────────────────────────────────────────────── */

function assignOpenForm() {
  var students = assignStudentList();
  var doms = assignDomainList();

  var h = '<div class="modal-title">New assignment</div>' +
    '<div class="modal-desc" style="font-size:.66rem">Cases are generated from the knowledge base when a student starts, ' +
    'so the same assignment gives different cases each time it is attempted.</div>' +
    '<div class="fg" style="margin-top:10px">' +

    '<div class="fi full"><label>Title</label>' +
      '<input id="asTitle" class="e-in" placeholder="e.g. Red eye — week 3"></div>' +

    '<div class="fi"><label>Format</label><select id="asMode">' +
      '<option value="simulation">Simulation cases</option>' +
      '<option value="osce">OSCE circuit</option>' +
    '</select></div>' +

    '<div class="fi"><label>Difficulty</label><select id="asTier">' +
      SIM_TIERS.filter(function (t) { return t.id !== "osce"; }).map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === "standard" ? " selected" : "") + '>' + t.label + '</option>';
      }).join("") +
    '</select></div>' +

    '<div class="fi"><label>Cover</label>' +
      '<select id="asScope" oninput="assignFormScopeChanged()">' +
        ASSIGN_SCOPES.map(function (s) {
          return '<option value="' + s.id + '">' + esc(s.label) + '</option>';
        }).join("") +
      '</select></div>' +

    '<div class="fi" id="asDomainWrap" style="display:none"><label>Domain</label>' +
      '<select id="asDomain">' +
        doms.map(function (d) { return '<option>' + esc(d) + '</option>'; }).join("") +
      '</select></div>' +

    '<div class="fi"><label>How many cases</label>' +
      '<input id="asCount" class="e-in" type="number" min="1" max="30" value="5"></div>' +

    '<div class="fi"><label>Due date (optional)</label>' +
      '<input id="asDue" class="e-in" type="date"></div>' +

    '<div class="fi full"><label>Note to students (optional)</label>' +
      '<textarea id="asNote" placeholder="What you want them to focus on."></textarea></div>' +
    '</div>';

  h += '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 3px">Assign to</div>';
  if (!students.length) {
    h += '<div style="font-size:.58rem;color:var(--sv)">No student accounts on this device yet — ' +
      'this will be set for the whole cohort, and any student who signs in here will see it.</div>';
  } else {
    h += '<div style="font-size:.56rem;color:var(--sv);margin-bottom:4px">Leave all unticked for the whole cohort.</div>' +
      '<div style="max-height:130px;overflow:auto;border:1px solid var(--fg);border-radius:var(--r);padding:5px">' +
      students.map(function (u) {
        return '<label style="display:block;font-size:.6rem;padding:1px 0">' +
          '<input type="checkbox" class="asStu" value="' + esc(u.username) + '"> ' +
          esc(u.name || u.username) + ' <span style="color:var(--sv)">· ' + esc(u.username) + '</span></label>';
      }).join("") + '</div>';
  }

  h += '<div style="font-size:.54rem;color:var(--sv);margin-top:8px">' +
    'Assignments are stored on this device with the rest of your offline data. Sharing them across a real ' +
    'multi-device cohort needs the cloud backend switched on.</div>';

  h += '<div class="btn-g" style="margin-top:10px">' +
      '<button class="btn btn-p" onclick="assignSubmitForm()">Create</button>' +
      '<button class="btn btn-s" onclick="simCloseModal()">Cancel</button>' +
    '</div>';
  simShowModal(h);
}

function assignFormScopeChanged() {
  var sc = document.getElementById("asScope");
  var wrap = document.getElementById("asDomainWrap");
  if (sc && wrap) wrap.style.display = (sc.value === "domain") ? "" : "none";
}

function assignSubmitForm() {
  var val = function (id) { var e = document.getElementById(id); return e ? e.value : ""; };
  var title = (val("asTitle") || "").trim();
  if (!title) { if (typeof toast === "function") toast("Give the assignment a title."); return; }

  var count = parseInt(val("asCount"), 10);
  if (!(count > 0)) count = 5;
  if (count > 30) count = 30;

  var picked = [];
  var boxes = document.querySelectorAll(".asStu");
  for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) picked.push(boxes[i].value);

  var scope = val("asScope") || "common";
  assignCreate({
    title: title,
    mode: val("asMode") || "simulation",
    tier: val("asTier") || "standard",
    scope: scope,
    domain: scope === "domain" ? val("asDomain") : "",
    count: count,
    due: val("asDue") || "",
    note: (val("asNote") || "").trim(),
    assignedTo: picked
  });
  simCloseModal();
  if (typeof toast === "function") toast("Assignment created.");
  if (typeof renderHome === "function") renderHome();
}
