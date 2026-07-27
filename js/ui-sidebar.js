/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SIDEBAR RENDERER                                      */
/* 22-step navigation with category grouping, completion marks,    */
/* nudge suggestions, and knowledge base summary                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── Collapsed stages ─────────────────────────────────────────────
   Remembered per user across visits, because a clinician who never runs
   Investigations should not have to fold it away every single exam.
   Nothing is hidden from the engine — collapsing is purely visual, and a
   group containing the step being worked on always opens. */
var SB_COLLAPSE_KEY = "entopic_sidebar_collapsed";
var _sbCollapsed = null;

function sbCollapsedMap() {
  if (_sbCollapsed) return _sbCollapsed;
  try { _sbCollapsed = JSON.parse(localStorage.getItem(SB_COLLAPSE_KEY) || "{}"); }
  catch (e) { _sbCollapsed = {}; }
  return _sbCollapsed;
}

function sbGroupCollapsed(cat) { return !!sbCollapsedMap()[cat]; }

function sbToggleGroup(cat) {
  var m = sbCollapsedMap();
  if (m[cat]) delete m[cat]; else m[cat] = true;
  try { localStorage.setItem(SB_COLLAPSE_KEY, JSON.stringify(m)); } catch (e) {}
  renderSidebar();
}

function renderSidebar() {
  var el = document.getElementById("sidebarEl");
  if (!el) return;

  /* ── Which steps are actually showing, grouped by stage ──
     Built first so a group header can report its own progress and know
     whether it contains the active step (a collapsed group is force-opened
     when the step inside it is the one being worked on). */
  var groups = [];
  var byCat = {};
  for (var gi = 0; gi < STEPS.length; gi++) {
    var gs = STEPS[gi];
    if (gs.opt && !(typeof moduleOn === "function" && moduleOn(gs.opt))) continue;
    if (gs.clinic && !(typeof clinicStepOn === "function" && clinicStepOn(gs.id))) continue;
    if (!byCat[gs.c]) { byCat[gs.c] = { cat: gs.c, steps: [] }; groups.push(byCat[gs.c]); }
    byCat[gs.c].steps.push(gs);
  }

  var h = "";

  /* ── Step list, one collapsible band per stage ── */
  for (var gj = 0; gj < groups.length; gj++) {
    var grp = groups[gj];
    var doneN = 0, hasActive = false;
    grp.steps.forEach(function (st) {
      if (V.completed && V.completed.indexOf(st.id) >= 0) doneN++;
      if (V.step === st.id) hasActive = true;
    });
    /* A group holding the current step is always open, whatever was toggled. */
    var collapsed = sbGroupCollapsed(grp.cat) && !hasActive;
    var gid = "sbg_" + grp.cat.replace(/[^a-z0-9]+/gi, "_");

    h += '<div class="sb-cat' + (collapsed ? " collapsed" : "") + '"' +
        ' onclick="sbToggleGroup(' + JSON.stringify(grp.cat).replace(/"/g, "&quot;") + ')">' +
      '<span class="sb-cat-arrow">▾</span>' + grp.cat +
      (collapsed && doneN < grp.steps.length ? '<span class="sb-cat-dot"></span>' : '') +
      '<span class="sb-cat-count">' + doneN + '/' + grp.steps.length + '</span>' +
    '</div>';

    h += '<div class="sb-group' + (collapsed ? " collapsed" : "") + '"' +
      ' id="' + gid + '" data-g="' + grp.cat + '">';

  for (var i = 0; i < grp.steps.length; i++) {
    var s = grp.steps[i];

    /* Active state */
    var isActive = V.step === s.id;

    /* Done state */
    var isDone = V.completed && V.completed.indexOf(s.id) >= 0;

    /* Alert indicator — show dot if this step has relevant alerts */
    var hasAlert = false;
    if (s.id === "iop" && V.alerts) {
      for (var ai = 0; ai < V.alerts.length; ai++) {
        if (V.alerts[ai].m.indexOf("IOP") >= 0) hasAlert = true;
      }
    }
    if (s.id === "pupil" && V.pupil && V.pupil.rapd !== "None") hasAlert = true;
    if (s.id === "fundus" && V.alerts) {
      for (var afi = 0; afi < V.alerts.length; afi++) {
        if (V.alerts[afi].m.indexOf("fundus") >= 0 || V.alerts[afi].m.indexOf("disc") >= 0) hasAlert = true;
      }
    }

    h += '<div class="sb-item' + (isActive ? " act" : "") + (isDone ? " done" : "") + '"' +
      ' onclick="nav(\'' + s.id + '\')">';
    h += '<span class="sb-num">' + s.n + '</span>';
    h += '<span>' + s.l + '</span>';
    if (hasAlert && !isDone) {
      h += '<span style="margin-left:auto;color:var(--md);font-size:.5rem;font-weight:700">!</span>';
    }
    h += '</div>';
  }
    h += '</div>';   /* .sb-group */
  }

  /* ── Nudge section ── */
  if (V.nudges && V.nudges.length > 0) {
    h += '<div style="margin:10px 8px;padding:7px;border:1px solid var(--gr);border-radius:var(--r);font-size:.6rem;color:var(--sv)">';
    h += '<div style="font-size:.46rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--sl);margin-bottom:3px">Suggested Next</div>';
    for (var ni = 0; ni < V.nudges.length; ni++) {
      var nudge = V.nudges[ni];
      h += '<div class="nudge" onclick="nav(\'' + nudge.t + '\')">→ ' + nudge.m + '</div>';
    }
    h += '</div>';
  }

  /* ── Progress indicator ── */
  var completedCount = V.completed ? V.completed.length : 0;
  var totalSteps = 0;
  for (var ti = 0; ti < STEPS.length; ti++) {
    if (STEPS[ti].opt && !(typeof moduleOn === "function" && moduleOn(STEPS[ti].opt))) continue;
    if (STEPS[ti].clinic && !(typeof clinicStepOn === "function" && clinicStepOn(STEPS[ti].id))) continue;
    totalSteps++;
  }
  var pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  h += '<div style="margin:8px 8px;padding:7px;font-size:.54rem;color:var(--sl)">';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:3px">';
  h += '<span>Progress</span>';
  h += '<span>' + completedCount + '/' + totalSteps + '</span>';
  h += '</div>';
  h += '<div style="width:100%;height:3px;background:var(--gr);border-radius:2px;overflow:hidden">';
  h += '<div style="width:' + pct + '%;height:100%;background:var(--sv);border-radius:2px;transition:width 300ms"></div>';
  h += '</div>';
  h += '</div>';

  /* ── KB version ── */
  if (typeof KB_META !== "undefined") {
    h += '<div style="margin:4px 8px;font-size:.46rem;color:var(--gr)">';
    h += 'KB v' + KB_META.version + ' · ' + KB_META.conditions + ' conditions';
    h += '</div>';
  }

  el.innerHTML = h;
}
