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

/* Chosen compression profile for image attachments (see js/file-store.js).
   Persisted per device so a clinician's preference sticks. */
var ATTACH_PROFILE = (function () {
  try { return localStorage.getItem("entopic_attach_profile") || "standard"; }
  catch (e) { return "standard"; }
})();

function attachSetProfile(p) {
  ATTACH_PROFILE = p;
  try { localStorage.setItem("entopic_attach_profile", p); } catch (e) {}
  if (typeof renderMain === "function") renderMain();
}

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

/* Read the chosen files, compress images, store the bytes in IndexedDB via
   the file store, and keep only a small record with the clinical data. */
function attachHandle(input, scope) {
  var files = input.files;
  if (!files || !files.length) return;
  var list = attachGetList(scope);
  var pending = files.length;
  var savedBytes = 0, failures = [];

  function done() {
    if (--pending > 0) return;
    attachPersist(scope);
    if (failures.length) alert(failures.join("\n\n"));
    else if (savedBytes > 0 && typeof toast === "function") {
      toast("Attached · " + fsHumanSize(savedBytes) + " saved by compression");
    }
  }

  for (var i = 0; i < files.length; i++) {
    (function (f) {
      fsIngest(f, { profile: ATTACH_PROFILE }).then(function (rec) {
        savedBytes += Math.max(0, (rec.orig_size || 0) - (rec.size || 0));
        list.push(rec);
        if (typeof logAudit === "function") {
          logAudit("file_attached",
            (scope === "patient" ? "Patient document: " : "Investigation file: ") + rec.name,
            { patient_id: (typeof CP !== "undefined" ? CP : null),
              visit_id: scope === "visit" ? (typeof CV !== "undefined" ? CV : null) : null });
        }
        /* Best-effort cloud copy; a no-op unless the user connected their own
           project and is signed in. Never blocks documenting the exam. */
        if (typeof fsCloudUpload === "function") { try { fsCloudUpload(rec); } catch (e) {} }
        done();
      }).catch(function (e) {
        failures.push(String((e && e.message) || e));
        done();
      });
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
  fsResolveUrl(a).then(function (url) {
    if (!url) { alert("The stored file could not be read back from this device."); return; }
    try {
      var w = window.open();
      if (w) {
        if (/^image\//.test(a.type)) {
          w.document.write('<title>' + esc(a.name) + '</title><img src="' + url + '" style="max-width:100%">');
        } else {
          w.location = url;
        }
      }
    } catch (e) { /* popup blocked — nothing further to do */ }
  });
}

function removeAttachment(scope, id) {
  if (!window.confirm("Remove this file from the record?")) return;
  var list = attachGetList(scope);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      if (typeof logAudit === "function") logAudit("file_removed", "Removed file: " + list[i].name, { patient_id: (typeof CP !== "undefined" ? CP : null) });
      if (typeof fsForget === "function") { try { fsForget(list[i]); } catch (e) {} }
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
        ? '<img src="' + (a.thumb || a.dataUrl || "") + '" style="width:100%;height:70px;object-fit:cover;border-radius:3px;cursor:pointer" onclick="openAttachment(\'' + scope + '\',\'' + a.id + '\')">'
        : '<div onclick="openAttachment(\'' + scope + '\',\'' + a.id + '\')" style="height:70px;display:flex;align-items:center;justify-content:center;background:var(--fg);border-radius:3px;cursor:pointer;font-size:1.5rem">' + (/pdf/.test(a.type) ? "📄" : "📎") + '</div>') +
      '<div style="margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(a.name) + '">' + esc(a.name) + '</div>' +
      '<div style="color:var(--sv)">' + fsHumanSize(a.size) +
        (a.compressed && a.orig_size > a.size ? ' <span title="compressed from ' + fsHumanSize(a.orig_size) + '">↓</span>' : '') +
        (a.added ? ' · ' + esc(a.added.slice(0, 10)) : '') + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:2px">' +
        '<span style="cursor:pointer;color:var(--md)" onclick="openAttachment(\'' + scope + '\',\'' + a.id + '\')">open</span>' +
        '<span style="cursor:pointer;color:var(--as,#c0392b)" onclick="removeAttachment(\'' + scope + '\',\'' + a.id + '\')">remove</span>' +
      '</div></div>';
  }
  return h + '</div>';
}

/* A ready-made "Attachments" block (quality selector + file input + grid). */
function attachBlock(scope, label) {
  var opts = Object.keys(FS_PROFILES).map(function (k) {
    return '<option value="' + k + '"' + (ATTACH_PROFILE === k ? " selected" : "") + '>' + FS_PROFILES[k].label + '</option>';
  }).join("");

  /* Fill in the storage line once this markup is in the DOM (a <script> tag
     injected through innerHTML would never run). */
  if (typeof fsUsage === "function") {
    setTimeout(function () {
      fsUsage().then(function (u) {
        var el = document.getElementById("attachUsage_" + scope);
        if (el && u && u.quota) {
          el.textContent = "On-device storage used: " + fsHumanSize(u.usage) +
            " of ~" + fsHumanSize(u.quota) + " available.";
        }
      }).catch(function () {});
    }, 0);
  }

  return '<div class="fg" style="margin-bottom:6px">' +
      '<div class="fi"><label>Image quality</label>' +
        '<select onchange="attachSetProfile(this.value)">' + opts + '</select></div>' +
    '</div>' +
    '<input type="file" multiple accept="image/*,application/pdf" onchange="attachHandle(this,\'' + scope + '\')" style="margin-bottom:8px;font-size:.62rem">' +
    '<div style="font-size:.52rem;color:var(--sv);margin-bottom:6px">' +
      'Images are downscaled and re-encoded before saving (lossy — pick <b>Diagnostic</b> to keep the most detail). ' +
      'PDFs are stored unchanged. Files stay on this device with the ' + (scope === "patient" ? "patient" : "visit") +
      ', and are copied to your cloud project if you have connected one.' +
    '</div>' +
    '<div id="attachUsage_' + scope + '" style="font-size:.52rem;color:var(--sv);margin-bottom:6px"></div>' +
    renderAttachList(scope);
}
