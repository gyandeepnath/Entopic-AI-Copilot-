/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — FILE ATTACHMENTS                                       */
/*                                                                  */
/* Import PDFs / scans / images and keep them with the record —     */
/* investigation scans (OCT/VF/topography) on the visit, and        */
/* digitised prior reports on the patient. Offline-first: files are  */
/* stored as data URLs in localStorage alongside the record, so a    */
/* per-file size cap keeps the store within quota. Adds are          */
/* audit-logged. Two scopes: 'visit' (V.inv.attachments) and         */
/* 'patient' (P.attachments).                                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var ATTACH_MAX_BYTES = 1.6 * 1024 * 1024; /* ~1.5 MB/file — localStorage is small */

function attachGetList(scope) {
  if (scope === "visit") { if (!V.inv.attachments) V.inv.attachments = []; return V.inv.attachments; }
  if (scope === "patient") { if (!P.attachments) P.attachments = []; return P.attachments; }
  return [];
}

function attachPersist(scope) {
  if (scope === "visit") {
    if (typeof doSave === "function") doSave();
    if (typeof renderMain === "function") renderMain();
  } else if (scope === "patient") {
    /* write the updated patient back into the store, then re-render the chart */
    var pts = loadPatients();
    for (var i = 0; i < pts.length; i++) if (pts[i].id === P.id) { pts[i] = P; break; }
    savePatients(pts);
    if (typeof renderChart === "function") renderChart();
  }
}

/* Read the chosen files, convert to data URLs, and store them. */
function attachHandle(input, scope) {
  var files = input.files;
  if (!files || !files.length) return;
  var list = attachGetList(scope);
  var pending = files.length;
  function done() { if (--pending <= 0) attachPersist(scope); }
  for (var i = 0; i < files.length; i++) {
    (function (f) {
      if (f.size > ATTACH_MAX_BYTES) {
        alert("“" + f.name + "” is " + (f.size / 1048576).toFixed(1) + " MB — too large for on-device storage (max ~1.5 MB).\n\nScan/compress at a lower resolution, or split multi-page PDFs. Large files are best kept in your cloud backup.");
        done(); return;
      }
      var r = new FileReader();
      r.onload = function () {
        list.push({
          id: "a" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
          name: f.name, type: f.type || "file", size: f.size,
          dataUrl: r.result,
          added: new Date().toISOString(),
          added_by: (typeof CU !== "undefined" && CU) ? (CU.username || "") : ""
        });
        if (typeof logAudit === "function") {
          logAudit("file_attached", (scope === "patient" ? "Patient document: " : "Investigation file: ") + f.name,
            { patient_id: (typeof CP !== "undefined" ? CP : null), visit_id: scope === "visit" ? (typeof CV !== "undefined" ? CV : null) : null });
        }
        done();
      };
      r.onerror = function () { done(); };
      r.readAsDataURL(f);
    })(files[i]);
  }
  input.value = "";
}

function attachFind(scope, id) {
  var list = attachGetList(scope);
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

/* Open an attachment in a new tab (image inline, PDF in the viewer). */
function openAttachment(scope, id) {
  var a = attachFind(scope, id);
  if (!a) return;
  try {
    var w = window.open();
    if (w) {
      if (/^image\//.test(a.type)) w.document.write('<img src="' + a.dataUrl + '" style="max-width:100%">');
      else w.location = a.dataUrl;
    }
  } catch (e) { /* fall back: navigate current tab */ }
}

function removeAttachment(scope, id) {
  if (!window.confirm("Remove this file from the record?")) return;
  var list = attachGetList(scope);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      if (typeof logAudit === "function") logAudit("file_removed", "Removed file: " + list[i].name, { patient_id: (typeof CP !== "undefined" ? CP : null) });
      list.splice(i, 1);
      break;
    }
  }
  attachPersist(scope);
}

/* Render the attachment grid (thumbnails for images, doc icon for the rest). */
function renderAttachList(scope) {
  var list = attachGetList(scope);
  if (!list.length) return '<div style="font-size:.6rem;color:var(--sv)">No files attached yet.</div>';
  var h = '<div style="display:flex;flex-wrap:wrap;gap:8px">';
  for (var i = 0; i < list.length; i++) {
    var a = list[i], isImg = /^image\//.test(a.type);
    h += '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:6px;width:120px;font-size:.54rem">' +
      (isImg
        ? '<img src="' + a.dataUrl + '" style="width:100%;height:70px;object-fit:cover;border-radius:3px;cursor:pointer" onclick="openAttachment(\'' + scope + '\',\'' + a.id + '\')">'
        : '<div onclick="openAttachment(\'' + scope + '\',\'' + a.id + '\')" style="height:70px;display:flex;align-items:center;justify-content:center;background:var(--fg);border-radius:3px;cursor:pointer;font-size:1.5rem">' + (/pdf/.test(a.type) ? "📄" : "📎") + '</div>') +
      '<div style="margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(a.name) + '">' + esc(a.name) + '</div>' +
      '<div style="color:var(--sv)">' + (a.size / 1024).toFixed(0) + ' KB' + (a.added ? ' · ' + esc(a.added.slice(0, 10)) : '') + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:2px">' +
        '<span style="cursor:pointer;color:var(--md)" onclick="openAttachment(\'' + scope + '\',\'' + a.id + '\')">open</span>' +
        '<span style="cursor:pointer;color:var(--as,#c0392b)" onclick="removeAttachment(\'' + scope + '\',\'' + a.id + '\')">remove</span>' +
      '</div></div>';
  }
  return h + '</div>';
}

/* A ready-made "Attachments" block (file input + grid) for a scope. */
function attachBlock(scope, label) {
  return '<input type="file" multiple accept="image/*,application/pdf" onchange="attachHandle(this,\'' + scope + '\')" style="margin-bottom:8px;font-size:.62rem">' +
    '<div style="font-size:.52rem;color:var(--sv);margin-bottom:6px">Images or PDFs up to ~1.5 MB each · stored on this device with the ' + (scope === "patient" ? "patient" : "visit") + '</div>' +
    renderAttachList(scope);
}
