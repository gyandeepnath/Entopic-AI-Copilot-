/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL DRAWING (anterior segment + fundus)           */
/*                                                                  */
/* Upgraded for real documentation:                                 */
/*   • the conventional ophthalmic COLOUR CODE, each swatch labelled */
/*     with what it means, plus a legend saved with the drawing     */
/*   • proper templates — a concentric retinal chart with clock      */
/*     hours, and an anterior-segment chart with clock hours         */
/*   • pen / straight line / ellipse / hatch / eraser, undo + redo   */
/*   • per-eye (OD / OS) drawings, each labelled and timestamped    */
/*   • saved drawings are shown back on the exam page (they used to  */
/*     be saved and then never displayed anywhere)                   */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — the colour meanings below follow widely */
/* taught retinal / anterior-segment drawing conventions, but these  */
/* vary between schools and regions. They are DOCUMENTATION labels   */
/* only: nothing here is scored, interpreted, or fed to the          */
/* diagnostic engine. The founder should confirm the wording and the */
/* chart laterality (see DRAW_DISC_SIDE_OD) against local practice.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Which side of the chart the optic disc sits on for a RIGHT eye.
   ── CONFIRMED "right", reasoned from anatomy + viewing geometry ──
     1. The optic disc lies NASAL to the fovea (~15°). Not in dispute.
     2. A fundus view/photograph looks INTO the eye from in front of the
        patient. It is a direct view of a concave surface, not a mirrored
        one, so left/right are preserved as the examiner sees them.
     3. Facing a patient, their RIGHT eye is on the examiner's LEFT, so the
        patient's nose sits to the examiner's RIGHT of that eye.
     4. Nasal retina therefore appears on the examiner's RIGHT →
        for OD the disc is on the RIGHT of the image, macula to its left.
        (Cross-check: the macula is temporal, i.e. toward that ear — the
        right ear is on the examiner's left. Same answer.)
   Sanity check in five seconds: open any labelled right-eye fundus photo;
   the disc should sit right-of-centre. Flip this one value if your local
   charts are drawn the other way — it re-orients every template at once. */
var DRAW_DISC_SIDE_OD = "right";   /* "left" | "right" */

var DRAW_W = 760, DRAW_H = 560;

var DRAW_STATE = {
  active: false,
  type: "",            /* "slit_lamp" | "fundus" */
  eye: "OD",
  tool: "pen",         /* pen | line | ellipse | hatch | eraser */
  color: "#cc0000",
  lineWidth: 2,
  isDrawing: false,
  lastX: 0, lastY: 0,
  startX: 0, startY: 0,
  snapshot: null,      /* for live shape preview */
  undo: [], redo: [],
  guideOpen: false,    /* colour-code guide panel */
  variant: ""          /* which template variant (anterior only) */
};

/* Anterior-segment documentation templates. Sources teach documenting corneal
   pathology as a FRONTAL view plus a CROSS-SECTION, so both are offered, along
   with the layouts used for the commonest anterior-segment charting tasks. */
var DRAW_ANTERIOR_TEMPLATES = [
  { id: "anterior_full", label: "Anterior segment (frontal)" },
  { id: "cornea_section", label: "Cornea — frontal + cross-section" },
  { id: "cornea_ulcer",   label: "Corneal ulcer / infiltrate chart" },
  { id: "lids",           label: "Lids & adnexa" },
  { id: "gonio",          label: "Gonioscopy (4 quadrants)" }
];

/* The palette IS the sourced colour-code guide (js/drawing-guide.js), so the
   swatches a clinician clicks and the guide they read can never drift apart. */
function drawPalette() {
  if (typeof drawGuideFor === "function") return drawGuideFor(DRAW_STATE.type).colours;
  /* Fallback if the guide module failed to load — keeps drawing usable. */
  return [{ label: "Black", value: "#000000", use: "" }];
}

function drawCanvasEl() { return document.getElementById("drawCanvas"); }
function drawCtx() { var c = drawCanvasEl(); return c ? c.getContext("2d") : null; }


/* ── Undo / redo ─────────────────────────────────────────────────
   Snapshots are kept as data URLs and capped, so a long session does
   not accumulate hundreds of MB of raw pixel buffers. */
var DRAW_UNDO_MAX = 14;

function drawPushUndo() {
  var c = drawCanvasEl();
  if (!c) return;
  try { DRAW_STATE.undo.push(c.toDataURL("image/png")); } catch (e) { return; }
  if (DRAW_STATE.undo.length > DRAW_UNDO_MAX) DRAW_STATE.undo.shift();
  DRAW_STATE.redo.length = 0;
}

function drawRestore(url, cb) {
  var c = drawCanvasEl(), ctx = drawCtx();
  if (!c || !ctx) return;
  var img = new Image();
  img.onload = function () {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    if (cb) cb();
  };
  img.src = url;
}

function drawUndo() {
  var c = drawCanvasEl();
  if (!c || !DRAW_STATE.undo.length) { if (typeof toast === "function") toast("Nothing to undo."); return; }
  try { DRAW_STATE.redo.push(c.toDataURL("image/png")); } catch (e) {}
  drawRestore(DRAW_STATE.undo.pop(), renderCanvasToolbar);
}

function drawRedo() {
  var c = drawCanvasEl();
  if (!c || !DRAW_STATE.redo.length) { if (typeof toast === "function") toast("Nothing to redo."); return; }
  try { DRAW_STATE.undo.push(c.toDataURL("image/png")); } catch (e) {}
  drawRestore(DRAW_STATE.redo.pop(), renderCanvasToolbar);
}


/* ── Open / close / clear ────────────────────────────────────────── */

function openDrawing(type, eye) {
  DRAW_STATE.type = type;
  DRAW_STATE.eye = eye || "OD";
  DRAW_STATE.active = true;
  DRAW_STATE.tool = "pen";
  DRAW_STATE.lineWidth = 2;
  DRAW_STATE.color = drawPalette()[0].value;
  DRAW_STATE.undo = [];
  DRAW_STATE.redo = [];
  DRAW_STATE.variant = (type === "slit_lamp") ? "anterior_full" : "";
  DRAW_STATE.guideOpen = false;

  var overlay = document.getElementById("canvasOverlay");
  if (overlay) overlay.style.display = "flex";

  var canvas = drawCanvasEl();
  if (!canvas) return;
  canvas.width = DRAW_W;
  canvas.height = DRAW_H;

  drawResetTemplate();
  renderCanvasToolbar();

  canvas.onmousedown = function (e) { startDraw(e, canvas); };
  canvas.onmousemove = function (e) { doDraw(e, canvas); };
  canvas.onmouseup = function (e) { endDraw(e, canvas); };
  canvas.onmouseleave = function () { if (DRAW_STATE.isDrawing) endDraw(null, canvas); };

  canvas.ontouchstart = function (e) {
    e.preventDefault();
    var t = e.touches[0];
    startDraw({ clientX: t.clientX, clientY: t.clientY }, canvas);
  };
  canvas.ontouchmove = function (e) {
    e.preventDefault();
    var t = e.touches[0];
    doDraw({ clientX: t.clientX, clientY: t.clientY }, canvas);
  };
  canvas.ontouchend = function (e) { e.preventDefault(); endDraw(null, canvas); };
}

function setDrawEye(eye) {
  if (DRAW_STATE.eye === eye) return;
  if (DRAW_STATE.undo.length && !window.confirm("Switch to " + eye + "? The current drawing will be cleared.")) return;
  DRAW_STATE.eye = eye;
  DRAW_STATE.undo = []; DRAW_STATE.redo = [];
  drawResetTemplate();
  renderCanvasToolbar();
}

function closeDrawing() {
  DRAW_STATE.active = false;
  var overlay = document.getElementById("canvasOverlay");
  if (overlay) overlay.style.display = "none";
}

function drawResetTemplate() {
  var canvas = drawCanvasEl(), ctx = drawCtx();
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (DRAW_STATE.type === "slit_lamp") drawAnteriorVariant(ctx, canvas, DRAW_STATE.variant || "anterior_full");
  else drawFundusTemplate(ctx, canvas);
}

function clearDrawing() {
  drawPushUndo();
  drawResetTemplate();
}


/* ── Save ────────────────────────────────────────────────────────── */

function saveDrawing() {
  var canvas = drawCanvasEl();
  if (!canvas) return;
  var entry = {
    id: "d" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    type: DRAW_STATE.type,
    eye: DRAW_STATE.eye,
    timestamp: new Date().toISOString(),
    by: (typeof CU !== "undefined" && CU) ? (CU.username || "") : "",
    legend: drawLegendUsed(),
    data: canvas.toDataURL("image/png")
  };
  if (DRAW_STATE.type === "slit_lamp") {
    if (!V.sl.drawings) V.sl.drawings = [];
    V.sl.drawings.push(entry);
  } else {
    if (!V.fun.drawings) V.fun.drawings = [];
    V.fun.drawings.push(entry);
  }
  if (typeof logAudit === "function") {
    logAudit("drawing_saved",
      (DRAW_STATE.type === "slit_lamp" ? "Anterior segment" : "Fundus") + " drawing " + DRAW_STATE.eye,
      { patient_id: (typeof CP !== "undefined" ? CP : null), visit_id: (typeof CV !== "undefined" ? CV : null) });
  }
  closeDrawing();
  if (typeof doSave === "function") doSave();
  if (typeof renderMain === "function") renderMain();
  if (typeof toast === "function") toast("Drawing saved to the record.");
}

/* The colour key relevant to this drawing, stored with it so the meaning
   travels with the image into the record. */
function drawLegendUsed() {
  return drawPalette().map(function (p) { return { label: p.label, value: p.value, use: p.use }; });
}

function deleteDrawing(kind, id) {
  if (!window.confirm("Delete this drawing from the record?")) return;
  var list = kind === "slit_lamp" ? (V.sl.drawings || []) : (V.fun.drawings || []);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id || String(i) === String(id)) { list.splice(i, 1); break; }
  }
  if (typeof doSave === "function") doSave();
  renderMain();
}


/* ── Toolbar ─────────────────────────────────────────────────────── */

function renderCanvasToolbar() {
  var tb = document.getElementById("canvasToolbar");
  if (!tb) return;
  var isFundus = DRAW_STATE.type === "fundus";
  var h = '<span style="font-size:.72rem;font-weight:600;margin-right:6px">' +
    (isFundus ? "Fundus chart" : "Anterior segment") + '</span>';

  ["OD", "OS"].forEach(function (e) {
    h += '<span class="canvas-tool' + (DRAW_STATE.eye === e ? " active" : "") + '" onclick="setDrawEye(\'' + e + '\')">' + e + '</span>';
  });
  h += '<span style="width:1px;height:20px;background:var(--ms);margin:0 5px"></span>';

  /* Anterior-segment template variants */
  if (!isFundus) {
    h += '<select onchange="setDrawVariant(this.value)" style="font-size:.58rem;padding:2px 4px;margin-right:5px">' +
      DRAW_ANTERIOR_TEMPLATES.map(function (t) {
        return '<option value="' + t.id + '"' + (DRAW_STATE.variant === t.id ? " selected" : "") + '>' + t.label + '</option>';
      }).join("") + '</select>';
  }

  [["pen", "✏ Pen"], ["line", "／ Line"], ["ellipse", "◯ Shape"], ["hatch", "▨ Hatch"], ["eraser", "◻ Eraser"]].forEach(function (t) {
    h += '<span class="canvas-tool' + (DRAW_STATE.tool === t[0] ? " active" : "") + '" onclick="setDrawTool(\'' + t[0] + '\')">' + t[1] + '</span>';
  });
  h += '<span style="width:1px;height:20px;background:var(--ms);margin:0 5px"></span>';

  h += '<span class="canvas-tool" onclick="drawUndo()" title="Undo">↶</span>';
  h += '<span class="canvas-tool" onclick="drawRedo()" title="Redo">↷</span>';
  h += '<span style="width:1px;height:20px;background:var(--ms);margin:0 5px"></span>';

  drawPalette().forEach(function (c) {
    var on = DRAW_STATE.color === c.value && DRAW_STATE.tool !== "eraser";
    h += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:' + c.value + ';' +
      'border:2px solid ' + (on ? "var(--ink)" : "var(--ms)") + ';cursor:pointer;margin:0 2px;vertical-align:middle" ' +
      'onclick="setDrawColor(\'' + c.value + '\')" title="' + c.label + ' — ' + c.use + '"></span>';
  });
  h += '<span style="width:1px;height:20px;background:var(--ms);margin:0 5px"></span>';

  [[1, "Thin"], [2, "Med"], [4, "Thick"]].forEach(function (w) {
    h += '<span class="canvas-tool' + (DRAW_STATE.lineWidth === w[0] ? " active" : "") + '" onclick="setDrawWidth(' + w[0] + ')">' + w[1] + '</span>';
  });

  h += '<span style="width:1px;height:20px;background:var(--ms);margin:0 5px"></span>';
  h += '<span class="canvas-tool' + (DRAW_STATE.guideOpen ? " active" : "") + '" onclick="toggleDrawGuide()" title="Colour-code guide">' +
    (DRAW_STATE.guideOpen ? "▾ Guide" : "▸ Guide") + '</span>';

  var cur = null;
  drawPalette().forEach(function (c) { if (c.value === DRAW_STATE.color) cur = c; });
  if (cur && DRAW_STATE.tool !== "eraser") {
    h += '<div style="flex-basis:100%;width:100%;font-size:.56rem;color:var(--sl);margin-top:4px">' +
      '<b style="color:' + cur.value + '">' + cur.label + '</b> — ' + cur.use +
      '<span style="color:var(--sv)"> · conventional colour code — adjust to your local practice</span></div>';
  }
  if (DRAW_STATE.guideOpen) h += drawGuideHtml();
  tb.innerHTML = h;
}

function setDrawTool(tool) { DRAW_STATE.tool = tool; renderCanvasToolbar(); }
function setDrawColor(color) {
  DRAW_STATE.color = color;
  if (DRAW_STATE.tool === "eraser") DRAW_STATE.tool = "pen";
  renderCanvasToolbar();
}
function setDrawWidth(w) { DRAW_STATE.lineWidth = w; renderCanvasToolbar(); }


/* ── Pointer handling ────────────────────────────────────────────── */

function drawPos(e, canvas) {
  var r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / (r.width || canvas.width)),
    y: (e.clientY - r.top) * (canvas.height / (r.height || canvas.height))
  };
}

function startDraw(e, canvas) {
  var p = drawPos(e, canvas);
  drawPushUndo();
  DRAW_STATE.isDrawing = true;
  DRAW_STATE.lastX = DRAW_STATE.startX = p.x;
  DRAW_STATE.lastY = DRAW_STATE.startY = p.y;
  if (DRAW_STATE.tool === "line" || DRAW_STATE.tool === "ellipse") {
    try { DRAW_STATE.snapshot = canvas.toDataURL("image/png"); } catch (err) { DRAW_STATE.snapshot = null; }
  }
}

function drawStyle(ctx) {
  if (DRAW_STATE.tool === "eraser") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = DRAW_STATE.lineWidth * 6;
  } else {
    ctx.strokeStyle = DRAW_STATE.color;
    ctx.lineWidth = DRAW_STATE.lineWidth;
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function doDraw(e, canvas) {
  if (!DRAW_STATE.isDrawing) return;
  var ctx = canvas.getContext("2d");
  var p = drawPos(e, canvas);

  if (DRAW_STATE.tool === "pen" || DRAW_STATE.tool === "eraser") {
    drawStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(DRAW_STATE.lastX, DRAW_STATE.lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    DRAW_STATE.lastX = p.x; DRAW_STATE.lastY = p.y;
    return;
  }

  if (DRAW_STATE.tool === "hatch") {
    /* Short cross-strokes — the conventional way lattice / thinning is shaded. */
    drawStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y + 6);
    ctx.lineTo(p.x + 6, p.y - 6);
    ctx.stroke();
    DRAW_STATE.lastX = p.x; DRAW_STATE.lastY = p.y;
    return;
  }

  /* line / ellipse: live preview redrawn from the pre-drag snapshot */
  if (!DRAW_STATE.snapshot) return;
  var img = new Image();
  img.onload = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    drawStyle(ctx);
    ctx.beginPath();
    if (DRAW_STATE.tool === "line") {
      ctx.moveTo(DRAW_STATE.startX, DRAW_STATE.startY);
      ctx.lineTo(p.x, p.y);
    } else {
      var rx = Math.abs(p.x - DRAW_STATE.startX) / 2;
      var ry = Math.abs(p.y - DRAW_STATE.startY) / 2;
      ctx.ellipse((p.x + DRAW_STATE.startX) / 2, (p.y + DRAW_STATE.startY) / 2, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  };
  img.src = DRAW_STATE.snapshot;
}

function endDraw() {
  DRAW_STATE.isDrawing = false;
  DRAW_STATE.snapshot = null;
}


function setDrawVariant(v) {
  if (DRAW_STATE.variant === v) return;
  if (DRAW_STATE.undo.length && !window.confirm("Switch template? The current drawing will be cleared.")) return;
  DRAW_STATE.variant = v;
  DRAW_STATE.undo = []; DRAW_STATE.redo = [];
  drawResetTemplate();
  renderCanvasToolbar();
}

function toggleDrawGuide() {
  DRAW_STATE.guideOpen = !DRAW_STATE.guideOpen;
  renderCanvasToolbar();
}

/* The sourced colour-code guide, rendered inside the drawing tool. */
function drawGuideHtml() {
  if (typeof drawGuideFor !== "function") return "";
  var g = drawGuideFor(DRAW_STATE.type);
  var h = '<div style="flex-basis:100%;width:100%;margin-top:6px;border:1px solid var(--fg);border-radius:var(--r);padding:10px;background:var(--sn);max-height:260px;overflow:auto">' +
    '<div style="font-weight:600;font-size:.7rem;margin-bottom:2px">' + g.title + ' — colour code</div>' +
    '<div style="font-size:.54rem;color:var(--sv);margin-bottom:8px">Compiled and cross-checked from published teaching sources (listed below). ' +
      'Entries marked <b>varies</b> differ between schools — confirm against local practice.</div>';

  g.colours.forEach(function (c) {
    h += '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px">' +
      '<span style="flex:0 0 14px;width:14px;height:14px;border-radius:50%;background:' + c.value + ';border:1px solid #0002;margin-top:2px"></span>' +
      '<div style="flex:1">' +
        '<div style="font-size:.62rem"><b>' + c.label + '</b> — ' + c.use +
          (c.status === "varies" ? ' <span style="color:#b8860b;font-size:.52rem">(varies)</span>' : '') + '</div>' +
        (c.detail ? '<div style="font-size:.54rem;color:var(--sl)">' + c.detail + '</div>' : '') +
      '</div></div>';
  });

  h += '<div style="font-weight:600;font-size:.62rem;margin:8px 0 4px">How specific lesions are drawn</div>';
  g.rules.forEach(function (r) {
    h += '<div style="font-size:.56rem;margin-bottom:4px"><b>' + r.rule + '</b>' +
      (r.status === "varies" ? ' <span style="color:#b8860b">(varies)</span>' : '') +
      ' — ' + r.how + '</div>';
  });

  h += '<div style="font-size:.52rem;color:var(--sv);margin-top:8px;border-top:1px solid var(--fg);padding-top:5px">Sources: ' +
    DRAW_GUIDE_SOURCES.map(function (s2) {
      return '<a href="' + s2.url + '" target="_blank" rel="noopener" style="color:var(--md)">' + esc(s2.label) + '</a>';
    }).join(" · ") +
    '<br>Documentation convention only — not clinical decision support, and never read by the diagnostic engine.</div>';

  return h + '</div>';
}


/* ── Templates ───────────────────────────────────────────────────── */

/* Clock hours around a circle, 12 at the top. */
function drawClockHours(ctx, cx, cy, r) {
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "10px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (var hh = 1; hh <= 12; hh++) {
    var a = (hh / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillText(String(hh), cx + Math.cos(a) * (r + 16), cy + Math.sin(a) * (r + 16));
    ctx.strokeStyle = "#dddddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.textBaseline = "alphabetic";
}

/* Dispatch to the selected anterior-segment documentation template. */
function drawAnteriorVariant(ctx, canvas, variant) {
  if (variant === "cornea_section") return drawCorneaSectionTemplate(ctx, canvas);
  if (variant === "cornea_ulcer")   return drawCorneaUlcerTemplate(ctx, canvas);
  if (variant === "lids")           return drawLidsTemplate(ctx, canvas);
  if (variant === "gonio")          return drawGonioTemplate(ctx, canvas);
  return drawAnteriorTemplate(ctx, canvas);
}

function drawTitle(ctx, canvas, text) {
  ctx.fillStyle = "#bbbbbb";
  ctx.font = "11px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(DRAW_STATE.eye + " — " + text, canvas.width / 2, 20);
}

/* Cornea documented the conventional way: a frontal view AND a cross-section,
   so depth (epithelial / stromal / endothelial) is recorded as well as the
   position and size of the lesion. */
function drawCorneaSectionTemplate(ctx, canvas) {
  drawTitle(ctx, canvas, "cornea — frontal + cross-section");

  /* Frontal, left half */
  var cx = 210, cy = 300, limbus = 150, pupil = 42;
  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = 1;
  for (var g = -limbus; g <= limbus; g += 30) {
    ctx.beginPath(); ctx.moveTo(cx + g, cy - limbus); ctx.lineTo(cx + g, cy + limbus); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - limbus, cy + g); ctx.lineTo(cx + limbus, cy + g); ctx.stroke();
  }
  ctx.strokeStyle = "#cccccc";
  [limbus, pupil].forEach(function (r) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  });
  drawClockHours(ctx, cx, cy, limbus);
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("frontal view", cx, cy + limbus + 44);

  /* Cross-section, right half — corneal layers */
  var sx = 470, sw = 240, sy = 250, th = 74;
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;
  /* anterior and posterior curves */
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sw / 2, sy - 54, sx + sw, sy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx, sy + th); ctx.quadraticCurveTo(sx + sw / 2, sy + th - 54, sx + sw, sy + th); ctx.stroke();
  /* internal layer guides */
  ctx.strokeStyle = "#eeeeee";
  [0.18, 0.5, 0.82].forEach(function (f) {
    ctx.beginPath();
    ctx.moveTo(sx, sy + th * f);
    ctx.quadraticCurveTo(sx + sw / 2, sy + th * f - 54, sx + sw, sy + th * f);
    ctx.stroke();
  });
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "8px 'DM Sans', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("epithelium", sx + sw + 6, sy - 6);
  ctx.fillText("stroma", sx + sw + 6, sy + th * 0.5 - 20);
  ctx.fillText("endothelium", sx + sw + 6, sy + th - 2);
  ctx.textAlign = "center";
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.fillText("cross-section (depth)", sx + sw / 2, sy + th + 40);

  /* Measurement prompt — sources stress recording size for comparability */
  ctx.fillStyle = "#cccccc";
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Size  H ____ mm  ×  V ____ mm", 60, canvas.height - 30);
  ctx.fillText("Depth: epi / ant stroma / mid / deep / endo", 380, canvas.height - 30);
}

/* Ulcer / infiltrate charting: frontal cornea with a measurement grid and the
   conventional layer prompts (yellow infiltrate, green defect, depth). */
function drawCorneaUlcerTemplate(ctx, canvas) {
  drawTitle(ctx, canvas, "corneal ulcer / infiltrate");
  var cx = canvas.width / 2 - 60, cy = 290, limbus = 175;

  ctx.strokeStyle = "#f0f0f0";
  ctx.lineWidth = 1;
  for (var g = -limbus; g <= limbus; g += 25) {
    ctx.beginPath(); ctx.moveTo(cx + g, cy - limbus); ctx.lineTo(cx + g, cy + limbus); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - limbus, cy + g); ctx.lineTo(cx + limbus, cy + g); ctx.stroke();
  }
  ctx.strokeStyle = "#cccccc";
  ctx.beginPath(); ctx.arc(cx, cy, limbus, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.stroke();
  drawClockHours(ctx, cx, cy, limbus);

  /* Prompts down the right, so the chart records what follow-up needs */
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "10px 'DM Sans', sans-serif";
  ctx.textAlign = "left";
  var px = cx + limbus + 60, py = 120;
  ["Infiltrate  ____ × ____ mm",
   "Epithelial defect  ____ × ____ mm",
   "Depth:  epi / ant / mid / deep",
   "Hypopyon  ____ mm",
   "Vessels:  none / superficial / deep",
   "Thinning:  none / ____ %",
   "Perforation:  no / impending / yes"].forEach(function (t) {
    ctx.fillText(t, px, py); py += 26;
  });
  ctx.font = "8px 'DM Sans', sans-serif";
  ctx.fillStyle = "#c8c8c8";
  ctx.fillText("yellow = infiltrate · green = epithelial defect · red = vessels", px, py + 8);
  ctx.fillText("black = scar / outline · blue = oedema", px, py + 22);
}

/* Lids & adnexa — for chalazia, lid lesions, ptosis measurements, entropion. */
function drawLidsTemplate(ctx, canvas) {
  drawTitle(ctx, canvas, "lids & adnexa");
  var cx = canvas.width / 2, cy = 260;

  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;
  /* palpebral aperture — almond outline */
  ctx.beginPath();
  ctx.moveTo(cx - 210, cy);
  ctx.quadraticCurveTo(cx, cy - 110, cx + 210, cy);
  ctx.quadraticCurveTo(cx, cy + 110, cx - 210, cy);
  ctx.stroke();
  /* limbus + pupil */
  ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.stroke();
  /* lid margins / lash lines */
  ctx.strokeStyle = "#e8e8e8";
  ctx.beginPath();
  ctx.moveTo(cx - 210, cy); ctx.quadraticCurveTo(cx, cy - 128, cx + 210, cy); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 210, cy); ctx.quadraticCurveTo(cx, cy + 128, cx + 210, cy); ctx.stroke();
  /* brow */
  ctx.beginPath();
  ctx.moveTo(cx - 190, cy - 150); ctx.quadraticCurveTo(cx, cy - 190, cx + 190, cy - 150); ctx.stroke();

  ctx.fillStyle = "#aaaaaa";
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("upper lid", cx, cy - 96);
  ctx.fillText("lower lid", cx, cy + 104);
  ctx.fillText("brow", cx, cy - 158);

  ctx.textAlign = "left";
  ctx.font = "10px 'DM Sans', sans-serif";
  var py = canvas.height - 150;
  ["MRD1 ____ mm      MRD2 ____ mm",
   "Palpebral aperture ____ mm",
   "Levator function ____ mm",
   "Lid position:  normal / ptosis / retraction / ectropion / entropion",
   "Lagophthalmos ____ mm      Bell's:  good / poor"].forEach(function (t) {
    ctx.fillText(t, 70, py); py += 24;
  });
}

/* Gonioscopy — four quadrants for angle grading and findings. */
function drawGonioTemplate(ctx, canvas) {
  drawTitle(ctx, canvas, "gonioscopy");
  var cx = canvas.width / 2, cy = 300, outer = 190, inner = 92;

  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;
  [outer, inner].forEach(function (r) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  });
  /* quadrant dividers on the diagonals */
  ctx.strokeStyle = "#e6e6e6";
  [45, 135, 225, 315].forEach(function (deg) {
    var a = deg * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  });
  drawClockHours(ctx, cx, cy, outer);

  ctx.fillStyle = "#aaaaaa";
  ctx.font = "10px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SUPERIOR", cx, cy - (outer + inner) / 2 + 4);
  ctx.fillText("INFERIOR", cx, cy + (outer + inner) / 2 + 4);
  ctx.fillText("NASAL", cx - (outer + inner) / 2, cy + 4);
  ctx.fillText("TEMPORAL", cx + (outer + inner) / 2, cy + 4);

  ctx.textAlign = "left";
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.fillStyle = "#c0c0c0";
  ctx.fillText("Record per quadrant: structures seen · Shaffer grade · pigment · PAS · NVA", 60, canvas.height - 28);
}

/* Anterior segment: cornea / limbus / iris / pupil with clock hours. */
function drawAnteriorTemplate(ctx, canvas) {
  var cx = canvas.width / 2, cy = canvas.height / 2;
  var limbus = 185, iris = 118, pupil = 46;

  /* Light locating grid inside the limbus */
  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = 1;
  for (var g = -limbus; g <= limbus; g += 37) {
    ctx.beginPath(); ctx.moveTo(cx + g, cy - limbus); ctx.lineTo(cx + g, cy + limbus); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - limbus, cy + g); ctx.lineTo(cx + limbus, cy + g); ctx.stroke();
  }

  ctx.strokeStyle = "#cccccc";
  [limbus, iris, pupil].forEach(function (r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  drawClockHours(ctx, cx, cy, limbus);

  ctx.fillStyle = "#bbbbbb";
  ctx.font = "11px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(DRAW_STATE.eye + " — anterior segment", cx, 22);
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.fillText("limbus", cx, cy - limbus - 30);
  ctx.fillText("iris", cx + (iris + pupil) / 2, cy + 3);
  ctx.fillText("pupil", cx, cy + 3);

  var nasalLeft = (DRAW_STATE.eye === "OD") === (DRAW_DISC_SIDE_OD === "left");
  ctx.fillStyle = "#999999";
  ctx.font = "10px 'DM Sans', sans-serif";
  ctx.fillText("S", cx, cy - limbus - 44);
  ctx.fillText("I", cx, cy + limbus + 48);
  ctx.fillText(nasalLeft ? "N" : "T", cx - limbus - 38, cy + 4);
  ctx.fillText(nasalLeft ? "T" : "N", cx + limbus + 38, cy + 4);
}

/* Fundus: concentric chart (posterior pole → equator → ora serrata) with the
   disc and macula placed, plus clock hours — the layout used for charting
   breaks, detachments and peripheral lesions. */
function drawFundusTemplate(ctx, canvas) {
  var cx = canvas.width / 2, cy = canvas.height / 2;
  var ora = 235, equator = 162, pole = 88;

  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;
  [ora, equator, pole].forEach(function (r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  /* Radial spokes at each clock hour */
  ctx.strokeStyle = "#eeeeee";
  for (var hh = 0; hh < 12; hh++) {
    var a = (hh / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * pole, cy + Math.sin(a) * pole);
    ctx.lineTo(cx + Math.cos(a) * ora, cy + Math.sin(a) * ora);
    ctx.stroke();
  }

  drawClockHours(ctx, cx, cy, ora);

  /* Disc nasal, macula temporal. Side driven by DRAW_DISC_SIDE_OD. */
  var discLeft = (DRAW_STATE.eye === "OD") === (DRAW_DISC_SIDE_OD === "left");
  var discX = cx + (discLeft ? -52 : 52);
  var macX = cx + (discLeft ? 42 : -42);

  ctx.strokeStyle = "#bbbbbb";
  ctx.beginPath();
  ctx.ellipse(discX, cy, 20, 23, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(discX, cy, 8, 9, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(macX, cy, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(macX, cy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "#bbbbbb";
  ctx.fill();

  /* Arcades */
  ctx.strokeStyle = "#dddddd";
  var dir = discLeft ? 1 : -1;
  [-1, 1].forEach(function (s) {
    ctx.beginPath();
    ctx.moveTo(discX + dir * 18, cy + s * 12);
    ctx.quadraticCurveTo(cx + dir * 40, cy + s * 108, cx + dir * 185, cy + s * 88);
    ctx.stroke();
  });

  ctx.fillStyle = "#bbbbbb";
  ctx.font = "11px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(DRAW_STATE.eye + " — fundus", cx, 20);
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.fillText("disc", discX, cy + 40);
  ctx.fillText("macula", macX, cy + 38);
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText("posterior pole", cx, cy - pole + 12);
  ctx.fillText("equator", cx, cy - equator + 12);
  ctx.fillText("ora serrata", cx, cy - ora + 12);

  ctx.fillStyle = "#999999";
  ctx.font = "10px 'DM Sans', sans-serif";
  ctx.fillText(discLeft ? "N" : "T", cx - ora - 38, cy + 4);
  ctx.fillText(discLeft ? "T" : "N", cx + ora + 38, cy + 4);
}


/* ── Showing saved drawings back on the exam page ────────────────── */

function renderDrawingGallery(kind) {
  var list = kind === "slit_lamp" ? ((V.sl && V.sl.drawings) || []) : ((V.fun && V.fun.drawings) || []);
  var label = kind === "slit_lamp" ? "anterior segment" : "fundus";
  var h = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
    '<button class="btn btn-d" onclick="openDrawing(\'' + kind + '\',\'OD\')">✏ Draw ' + label + ' — OD</button>' +
    '<button class="btn btn-d" onclick="openDrawing(\'' + kind + '\',\'OS\')">✏ Draw ' + label + ' — OS</button>' +
  '</div>';
  if (!list.length) {
    return h + '<div style="font-size:.58rem;color:var(--sv)">No ' + label + ' drawings yet.</div>';
  }
  h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
  list.forEach(function (d, i) {
    h += '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:5px;width:190px;font-size:.52rem">' +
      '<img src="' + d.data + '" style="width:100%;border-radius:2px;cursor:pointer;background:#fff" onclick="openSavedDrawing(\'' + kind + '\',' + i + ')">' +
      '<div style="margin-top:3px;font-weight:600">' + esc(d.eye || "") + ' · ' + esc((d.timestamp || "").slice(0, 16).replace("T", " ")) + '</div>' +
      (d.by ? '<div style="color:var(--sv)">by ' + esc(d.by) + '</div>' : '') +
      '<div style="margin-top:2px"><span style="cursor:pointer;color:var(--as,#c0392b)" onclick="deleteDrawing(\'' + kind + '\',\'' + (d.id || i) + '\')">delete</span></div>' +
    '</div>';
  });
  return h + '</div>';
}

/* Open a saved drawing full size, with its colour legend, in a new tab. */
function openSavedDrawing(kind, idx) {
  var list = kind === "slit_lamp" ? (V.sl.drawings || []) : (V.fun.drawings || []);
  var d = list[idx];
  if (!d) return;
  var w = window.open();
  if (!w) return;
  var legend = (d.legend || []).map(function (c) {
    return '<div style="display:flex;align-items:center;gap:8px;margin:2px 0;font-size:12px">' +
      '<span style="width:12px;height:12px;border-radius:50%;background:' + c.value + ';display:inline-block"></span>' +
      '<b style="min-width:52px">' + c.label + '</b><span>' + c.use + '</span></div>';
  }).join("");
  var title = (kind === "slit_lamp" ? "Anterior segment" : "Fundus") + " — " + (d.eye || "");
  w.document.write('<!doctype html><meta charset="utf-8"><title>' + esc(title) +
    '</title><body style="font-family:sans-serif;margin:24px">' +
    '<h3 style="margin:0 0 8px">' + esc(title) +
    ' <span style="font-weight:400;font-size:12px;color:#666">' + esc((d.timestamp || "").slice(0, 16).replace("T", " ")) + '</span></h3>' +
    '<img src="' + d.data + '" style="max-width:100%;border:1px solid #ddd">' +
    '<h4 style="margin:14px 0 4px;font-size:13px">Colour key</h4>' + legend +
    '<div style="font-size:11px;color:#777;margin-top:10px">Conventional drawing colours — verify against local practice. ' +
    'Drawings are documentation only and are not interpreted by the diagnostic engine.</div>' +
    '</body>');
  w.document.close();
}
