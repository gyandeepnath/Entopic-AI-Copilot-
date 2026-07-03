/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DRAWING CANVAS                                        */
/* Canvas-based sketching for slit lamp and fundus diagrams        */
/* Tools: pen, eraser, color selection                             */
/* Templates: anterior eye diagram, fundus diagram                 */
/* Drawings stored in visit data as base64                         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* STATE                                                           */
/* ═══════════════════════════════════════════════════════════════ */

var DRAW_STATE = {
  active: false,
  type: "",          /* "slit_lamp" or "fundus" */
  tool: "pen",       /* "pen" or "eraser" */
  color: "#000000",
  lineWidth: 2,
  isDrawing: false,
  lastX: 0,
  lastY: 0
};

var DRAW_COLORS = [
  { label: "Black",  value: "#000000" },
  { label: "Red",    value: "#cc0000" },
  { label: "Blue",   value: "#0044cc" },
  { label: "Green",  value: "#007700" },
  { label: "Brown",  value: "#884400" },
  { label: "Grey",   value: "#888888" }
];


/* ═══════════════════════════════════════════════════════════════ */
/* OPEN DRAWING                                                    */
/* ═══════════════════════════════════════════════════════════════ */

function openDrawing(type) {
  DRAW_STATE.type = type;
  DRAW_STATE.active = true;
  DRAW_STATE.tool = "pen";
  DRAW_STATE.color = "#000000";
  DRAW_STATE.lineWidth = 2;

  /* Show overlay */
  var overlay = document.getElementById("canvasOverlay");
  if (overlay) overlay.style.display = "flex";

  /* Build toolbar */
  renderCanvasToolbar();

  /* Setup canvas */
  var canvas = document.getElementById("drawCanvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");

  /* Clear and draw template */
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (type === "slit_lamp") {
    drawAnteriorTemplate(ctx, canvas);
  } else if (type === "fundus") {
    drawFundusTemplate(ctx, canvas);
  }

  /* Attach event listeners */
  canvas.onmousedown = function(e) { startDraw(e, canvas); };
  canvas.onmousemove = function(e) { doDraw(e, canvas); };
  canvas.onmouseup = function() { endDraw(); };
  canvas.onmouseleave = function() { endDraw(); };

  /* Touch support */
  canvas.ontouchstart = function(e) {
    e.preventDefault();
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousedown", { clientX: touch.clientX, clientY: touch.clientY });
    startDraw(mouseEvent, canvas);
  };
  canvas.ontouchmove = function(e) {
    e.preventDefault();
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousemove", { clientX: touch.clientX, clientY: touch.clientY });
    doDraw(mouseEvent, canvas);
  };
  canvas.ontouchend = function() { endDraw(); };
}


/* ═══════════════════════════════════════════════════════════════ */
/* CLOSE DRAWING (cancel)                                          */
/* ═══════════════════════════════════════════════════════════════ */

function closeDrawing() {
  DRAW_STATE.active = false;
  var overlay = document.getElementById("canvasOverlay");
  if (overlay) overlay.style.display = "none";
}


/* ═══════════════════════════════════════════════════════════════ */
/* SAVE DRAWING                                                    */
/* Saves canvas as base64 data URL into visit data                 */
/* ═══════════════════════════════════════════════════════════════ */

function saveDrawing() {
  var canvas = document.getElementById("drawCanvas");
  if (!canvas) return;

  var dataUrl = canvas.toDataURL("image/png");

  var drawingEntry = {
    type: DRAW_STATE.type,
    timestamp: new Date().toISOString(),
    data: dataUrl
  };

  /* Store in appropriate visit field */
  if (DRAW_STATE.type === "slit_lamp") {
    if (!V.sl.drawings) V.sl.drawings = [];
    V.sl.drawings.push(drawingEntry);
  } else if (DRAW_STATE.type === "fundus") {
    if (!V.fun.drawings) V.fun.drawings = [];
    V.fun.drawings.push(drawingEntry);
  }

  closeDrawing();
  alert("Drawing saved.");
}


/* ═══════════════════════════════════════════════════════════════ */
/* CLEAR DRAWING                                                   */
/* Resets canvas to template                                       */
/* ═══════════════════════════════════════════════════════════════ */

function clearDrawing() {
  var canvas = document.getElementById("drawCanvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (DRAW_STATE.type === "slit_lamp") {
    drawAnteriorTemplate(ctx, canvas);
  } else if (DRAW_STATE.type === "fundus") {
    drawFundusTemplate(ctx, canvas);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* CANVAS TOOLBAR                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function renderCanvasToolbar() {
  var toolbar = document.getElementById("canvasToolbar");
  if (!toolbar) return;

  var h = '';

  /* Title */
  h += '<span style="font-size:.72rem;font-weight:500;margin-right:8px">' +
    (DRAW_STATE.type === "slit_lamp" ? "Anterior Segment" : "Fundus Drawing") +
  '</span>';

  /* Pen tool */
  h += '<span class="canvas-tool' + (DRAW_STATE.tool === "pen" ? " active" : "") + '" onclick="setDrawTool(\'pen\')">✏ Pen</span>';

  /* Eraser tool */
  h += '<span class="canvas-tool' + (DRAW_STATE.tool === "eraser" ? " active" : "") + '" onclick="setDrawTool(\'eraser\')">◻ Eraser</span>';

  /* Separator */
  h += '<span style="width:1px;height:20px;background:var(--ms);margin:0 4px"></span>';

  /* Colors */
  for (var i = 0; i < DRAW_COLORS.length; i++) {
    var c = DRAW_COLORS[i];
    var isActive = DRAW_STATE.color === c.value && DRAW_STATE.tool === "pen";
    h += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:' + c.value + ';' +
      'border:2px solid ' + (isActive ? 'var(--ink)' : 'var(--ms)') + ';cursor:pointer;margin:0 1px" ' +
      'onclick="setDrawColor(\'' + c.value + '\')" title="' + c.label + '"></span>';
  }

  /* Separator */
  h += '<span style="width:1px;height:20px;background:var(--ms);margin:0 4px"></span>';

  /* Line width */
  h += '<span class="canvas-tool" onclick="setDrawWidth(1)" style="' + (DRAW_STATE.lineWidth === 1 ? 'background:var(--ink);color:var(--wh)' : '') + '">Thin</span>';
  h += '<span class="canvas-tool" onclick="setDrawWidth(2)" style="' + (DRAW_STATE.lineWidth === 2 ? 'background:var(--ink);color:var(--wh)' : '') + '">Medium</span>';
  h += '<span class="canvas-tool" onclick="setDrawWidth(4)" style="' + (DRAW_STATE.lineWidth === 4 ? 'background:var(--ink);color:var(--wh)' : '') + '">Thick</span>';

  toolbar.innerHTML = h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* TOOL SETTERS                                                    */
/* ═══════════════════════════════════════════════════════════════ */

function setDrawTool(tool) {
  DRAW_STATE.tool = tool;
  renderCanvasToolbar();
}

function setDrawColor(color) {
  DRAW_STATE.color = color;
  DRAW_STATE.tool = "pen";
  renderCanvasToolbar();
}

function setDrawWidth(width) {
  DRAW_STATE.lineWidth = width;
  renderCanvasToolbar();
}


/* ═══════════════════════════════════════════════════════════════ */
/* DRAWING EVENTS                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function startDraw(e, canvas) {
  DRAW_STATE.isDrawing = true;
  var rect = canvas.getBoundingClientRect();
  DRAW_STATE.lastX = e.clientX - rect.left;
  DRAW_STATE.lastY = e.clientY - rect.top;
}

function doDraw(e, canvas) {
  if (!DRAW_STATE.isDrawing) return;

  var ctx = canvas.getContext("2d");
  var rect = canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;

  ctx.beginPath();
  ctx.moveTo(DRAW_STATE.lastX, DRAW_STATE.lastY);
  ctx.lineTo(x, y);

  if (DRAW_STATE.tool === "eraser") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = DRAW_STATE.lineWidth * 5;
  } else {
    ctx.strokeStyle = DRAW_STATE.color;
    ctx.lineWidth = DRAW_STATE.lineWidth;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  DRAW_STATE.lastX = x;
  DRAW_STATE.lastY = y;
}

function endDraw() {
  DRAW_STATE.isDrawing = false;
}


/* ═══════════════════════════════════════════════════════════════ */
/* ANTERIOR SEGMENT TEMPLATE                                       */
/* Simple eye cross-section diagram                                */
/* ═══════════════════════════════════════════════════════════════ */

function drawAnteriorTemplate(ctx, canvas) {
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;

  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;

  /* Outer eye outline (circle) */
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.stroke();

  /* Cornea (upper arc) */
  ctx.beginPath();
  ctx.arc(cx, cy, 180, -0.8, -2.34, true);
  ctx.stroke();

  /* Inner circle (iris) */
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.stroke();

  /* Pupil */
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.stroke();

  /* Labels */
  ctx.fillStyle = "#cccccc";
  ctx.font = "10px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("OD / OS", cx, 30);
  ctx.fillText("Cornea", cx, cy - 160);
  ctx.fillText("Iris", cx + 110, cy);
  ctx.fillText("Pupil", cx, cy + 5);

  /* Quadrant markers */
  ctx.fillText("S", cx, cy - 190);
  ctx.fillText("I", cx, cy + 200);
  ctx.fillText("N", cx - 195, cy + 4);
  ctx.fillText("T", cx + 195, cy + 4);
}


/* ═══════════════════════════════════════════════════════════════ */
/* FUNDUS TEMPLATE                                                 */
/* Disc + macula diagram                                          */
/* ═══════════════════════════════════════════════════════════════ */

function drawFundusTemplate(ctx, canvas) {
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;

  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;

  /* Outer retina boundary */
  ctx.beginPath();
  ctx.arc(cx, cy, 220, 0, Math.PI * 2);
  ctx.stroke();

  /* Optic disc (positioned nasal) */
  var discX = cx - 80;
  var discY = cy;
  ctx.beginPath();
  ctx.ellipse(discX, discY, 35, 40, 0, 0, Math.PI * 2);
  ctx.stroke();

  /* Cup */
  ctx.beginPath();
  ctx.ellipse(discX, discY, 14, 16, 0, 0, Math.PI * 2);
  ctx.stroke();

  /* Macula (positioned temporal) */
  var macX = cx + 70;
  var macY = cy;
  ctx.beginPath();
  ctx.arc(macX, macY, 25, 0, Math.PI * 2);
  ctx.stroke();

  /* Fovea dot */
  ctx.beginPath();
  ctx.arc(macX, macY, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#cccccc";
  ctx.fill();

  /* Major arcades (simplified) */
  ctx.beginPath();
  ctx.moveTo(discX + 30, discY - 15);
  ctx.quadraticCurveTo(cx + 40, cy - 120, cx + 180, cy - 80);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(discX + 30, discY + 15);
  ctx.quadraticCurveTo(cx + 40, cy + 120, cx + 180, cy + 80);
  ctx.stroke();

  /* Labels */
  ctx.fillStyle = "#cccccc";
  ctx.font = "10px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("OD / OS", cx, 25);
  ctx.fillText("Disc", discX, discY + 55);
  ctx.fillText("Macula", macX, macY + 40);
  ctx.fillText("S", cx, 45);
  ctx.fillText("I", cx, canvas.height - 30);
  ctx.fillText("N", 25, cy + 4);
  ctx.fillText("T", canvas.width - 25, cy + 4);
}
