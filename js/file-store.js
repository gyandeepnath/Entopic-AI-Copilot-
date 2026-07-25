/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — FILE STORE (offline-first binary storage + compression) */
/*                                                                  */
/* WHY: attachments used to be kept as base64 data URLs inside       */
/* localStorage, which is only ~5 MB for the WHOLE app — so files    */
/* over ~1.5 MB were rejected outright and a handful of scans could  */
/* exhaust the store. Clinical documentation needs to hold many      */
/* fundus photos, OCT printouts, VF charts and scanned reports.      */
/*                                                                  */
/* WHAT THIS DOES:                                                  */
/*   • Stores file BLOBS in IndexedDB (hundreds of MB, not 5 MB),    */
/*     leaving only a small record + thumbnail in the visit/patient. */
/*   • Compresses images before storing — downscale + re-encode at a */
/*     clinician-chosen quality profile, so a 6 MB phone photo of a  */
/*     report becomes a few hundred KB.                              */
/*   • Falls back to inline data URLs if IndexedDB is unavailable,   */
/*     so the app never loses the ability to attach something.       */
/*   • Marks each file for later cloud upload; the cloud leg only    */
/*     runs when the user has connected THEIR OWN project.           */
/*                                                                  */
/* HONESTY: image compression is LOSSY. The profiles below trade     */
/* size against detail and the UI says so; "Diagnostic" preserves    */
/* the most and is always available. Original files are never        */
/* silently degraded beyond the profile the clinician picked, and a  */
/* compressed result is discarded if it is not actually smaller.     */
/* PDFs and any non-image type are stored as-is (never re-encoded).  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var FS_DB_NAME = "entopic_files";
var FS_STORE = "blobs";
var FS_DB_VER = 1;

/* Size ceiling for the localStorage fallback path only. */
var FS_INLINE_MAX = 1.6 * 1024 * 1024;
/* Hard ceiling for any single file, even in IndexedDB (sanity guard). */
var FS_ABS_MAX = 40 * 1024 * 1024;

/* Compression profiles. maxDim = longest edge in pixels after downscale. */
var FS_PROFILES = {
  diagnostic: { maxDim: 2600, quality: 0.92, label: "Diagnostic — most detail, largest file" },
  standard:   { maxDim: 1800, quality: 0.82, label: "Standard — recommended for reports & scans" },
  compact:    { maxDim: 1200, quality: 0.70, label: "Compact — smallest, for reference only" }
};
var FS_DEFAULT_PROFILE = "standard";

function fsProfile(name) { return FS_PROFILES[name] || FS_PROFILES[FS_DEFAULT_PROFILE]; }

function fsHumanSize(b) {
  b = b || 0;
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function fsIsImage(type) { return /^image\//i.test(type || ""); }


/* ── IndexedDB ──────────────────────────────────────────────────── */

function fsOpen() {
  return new Promise(function (resolve, reject) {
    if (typeof indexedDB === "undefined" || !indexedDB) { reject(new Error("no-indexeddb")); return; }
    var rq;
    try { rq = indexedDB.open(FS_DB_NAME, FS_DB_VER); }
    catch (e) { reject(e); return; }
    rq.onupgradeneeded = function () {
      var db = rq.result;
      if (!db.objectStoreNames.contains(FS_STORE)) db.createObjectStore(FS_STORE);
    };
    rq.onsuccess = function () { resolve(rq.result); };
    rq.onerror = function () { reject(rq.error || new Error("idb-open-failed")); };
  });
}

function fsTx(mode, fn) {
  return fsOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(FS_STORE, mode);
      var store = tx.objectStore(FS_STORE);
      var out;
      try { out = fn(store); } catch (e) { reject(e); return; }
      tx.oncomplete = function () { db.close(); resolve(out && out.result !== undefined ? out.result : out); };
      tx.onerror = function () { db.close(); reject(tx.error); };
      tx.onabort = function () { db.close(); reject(tx.error || new Error("idb-abort")); };
    });
  });
}

function fsPut(id, blob) { return fsTx("readwrite", function (s) { return s.put(blob, id); }); }
function fsGet(id) { return fsTx("readonly", function (s) { return s.get(id); }); }
function fsDelete(id) { return fsTx("readwrite", function (s) { return s.delete(id); }); }

/* Approximate on-device usage, when the browser exposes it. */
function fsUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    return navigator.storage.estimate().then(function (e) {
      return { usage: e.usage || 0, quota: e.quota || 0 };
    });
  }
  return Promise.resolve(null);
}


/* ── Image compression ──────────────────────────────────────────── */

/* Draw an image file onto a canvas at a bounded size and re-encode as JPEG.
   Resolves { blob, w, h, ow, oh, type }. */
function fsCompressImage(file, profileName) {
  return new Promise(function (resolve, reject) {
    var p = fsProfile(profileName);
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) { URL.revokeObjectURL(url); reject(new Error("bad-image")); return; }
      var scale = Math.min(1, p.maxDim / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      var ctx = c.getContext("2d");
      /* White matte: scans/printouts are on white, and JPEG has no alpha —
         without this, transparent PNG regions would encode as black. */
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(url);
      c.toBlob(function (blob) {
        if (!blob) { reject(new Error("encode-failed")); return; }
        resolve({ blob: blob, w: cw, h: ch, ow: w, oh: h, type: "image/jpeg" });
      }, "image/jpeg", p.quality);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode-failed")); };
    img.src = url;
  });
}

/* Small preview kept inline in the record so lists render instantly. */
function fsThumbnail(file, maxDim) {
  maxDim = maxDim || 200;
  return new Promise(function (resolve) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || 1, h = img.naturalHeight || 1;
      var s = Math.min(1, maxDim / Math.max(w, h));
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * s));
      c.height = Math.max(1, Math.round(h * s));
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      try { resolve(c.toDataURL("image/jpeg", 0.6)); } catch (e) { resolve(""); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(""); };
    img.src = url;
  });
}


/* ── Ingest ─────────────────────────────────────────────────────── */

function fsBlobToDataUrl(blob) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(r.result); };
    r.onerror = function () { reject(r.error || new Error("read-failed")); };
    r.readAsDataURL(blob);
  });
}

/* Take a File, compress it if it is an image, store the bytes in IndexedDB
   (or inline as a last resort) and resolve the small record to keep with the
   clinical data.

   Resolves: {
     id, name, type, size, orig_size, w, h, thumb, store, dataUrl?,
     profile, added, added_by, cloud
   } */
function fsIngest(file, opts) {
  opts = opts || {};
  var profileName = opts.profile || FS_DEFAULT_PROFILE;
  var id = "f" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

  if (file.size > FS_ABS_MAX) {
    return Promise.reject(new Error("“" + file.name + "” is " + fsHumanSize(file.size) +
      " — beyond the " + fsHumanSize(FS_ABS_MAX) + " per-file limit."));
  }

  var rec = {
    id: id,
    name: file.name || "file",
    type: file.type || "application/octet-stream",
    orig_size: file.size,
    size: file.size,
    w: 0, h: 0,
    thumb: "",
    store: "idb",
    profile: "",
    compressed: false,
    added: new Date().toISOString(),
    added_by: (typeof CU !== "undefined" && CU) ? (CU.username || "") : "",
    cloud: "pending"   /* pending | synced | local-only */
  };

  var prep;
  if (fsIsImage(file.type) && opts.compress !== false) {
    prep = fsCompressImage(file, profileName).then(function (out) {
      /* Never accept a "compressed" result that is not actually smaller. */
      var useCompressed = out.blob.size < file.size;
      rec.w = out.w; rec.h = out.h;
      rec.profile = useCompressed ? profileName : "original";
      rec.compressed = useCompressed;
      rec.type = useCompressed ? out.type : rec.type;
      var blob = useCompressed ? out.blob : file;
      rec.size = blob.size;
      return fsThumbnail(file).then(function (t) { rec.thumb = t; return blob; });
    }).catch(function () {
      /* Undecodable image (HEIC, corrupt) — keep the original bytes. */
      rec.profile = "original";
      return file;
    });
  } else {
    prep = Promise.resolve(file);
  }

  return prep.then(function (blob) {
    return fsPut(id, blob).then(function () {
      rec.store = "idb";
      return rec;
    }).catch(function () {
      /* No IndexedDB — fall back to an inline data URL, with the old cap. */
      if (blob.size > FS_INLINE_MAX) {
        throw new Error("“" + rec.name + "” is " + fsHumanSize(blob.size) +
          " and this browser has no IndexedDB, so only files under " +
          fsHumanSize(FS_INLINE_MAX) + " can be stored on-device.");
      }
      return fsBlobToDataUrl(blob).then(function (u) {
        rec.store = "inline";
        rec.dataUrl = u;
        return rec;
      });
    });
  });
}

/* Resolve a stored record back to something the browser can open. Returns a
   Promise of an object URL (caller should revoke) or a data URL. */
function fsResolveUrl(rec) {
  if (!rec) return Promise.resolve("");
  if (rec.store === "inline" || rec.dataUrl) return Promise.resolve(rec.dataUrl || "");
  return fsGet(rec.id).then(function (blob) {
    if (!blob) return "";
    return URL.createObjectURL(blob);
  }).catch(function () { return ""; });
}

/* Remove the bytes for a record (the caller removes the record itself). */
function fsForget(rec) {
  if (!rec || rec.store === "inline") return Promise.resolve();
  return fsDelete(rec.id).catch(function () { /* already gone */ });
}


/* ── Cloud leg (only when the user connected their OWN project) ──── */

/* Upload a stored file to the user's Supabase Storage bucket. No-ops unless a
   cloud project is configured and signed in — the cloud is never a runtime
   dependency for documenting an exam. */
function fsCloudUpload(rec, bucket) {
  bucket = bucket || "attachments";
  if (typeof cloudConfigured !== "function" || !cloudConfigured()) {
    return Promise.resolve({ skipped: "cloud-not-configured" });
  }
  var s = (typeof CLOUD !== "undefined" && CLOUD) ? CLOUD.session : null;
  if (!s || !s.access_token) return Promise.resolve({ skipped: "signed-out" });

  return fsGet(rec.id).then(function (blob) {
    if (!blob && rec.dataUrl) return fetch(rec.dataUrl).then(function (r) { return r.blob(); });
    return blob;
  }).then(function (blob) {
    if (!blob) return { skipped: "no-bytes" };
    var path = encodeURIComponent(rec.id) + "-" + encodeURIComponent(rec.name);
    return fetch(CLOUD_CONFIG.url + "/storage/v1/object/" + bucket + "/" + path, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + s.access_token,
        "apikey": CLOUD_CONFIG.anonKey,
        "Content-Type": rec.type || "application/octet-stream",
        "x-upsert": "true"
      },
      body: blob
    }).then(function (r) {
      if (!r.ok) return { error: "upload-failed-" + r.status };
      rec.cloud = "synced";
      rec.cloud_path = bucket + "/" + path;
      return { ok: true, path: rec.cloud_path };
    });
  }).catch(function (e) { return { error: String(e) }; });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FS_PROFILES: FS_PROFILES, fsProfile: fsProfile,
    fsHumanSize: fsHumanSize, fsIsImage: fsIsImage
  };
}
