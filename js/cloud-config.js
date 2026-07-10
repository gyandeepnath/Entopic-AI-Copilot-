/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLOUD CONFIG                                          */
/* Connection details for the optional Supabase backend.            */
/*                                                                  */
/* The anon key is a PUBLIC client credential by design — all data   */
/* access is enforced by Row-Level Security in the database, never   */
/* by hiding this key. (Supabase docs: safe to ship in clients.)     */
/*                                                                  */
/* enabled:false or an unreachable network NEVER affects the exam:   */
/* the app is local-first; the cloud only syncs/backs up.            */
/* url may be overridden (e.g. tests point it at a mock server) via  */
/* localStorage key "entopic_cloud_url_override".                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CLOUD_CONFIG = {
  enabled: true,
  url: "https://wguxwhovwgpbvhbxrfyg.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXh3aG92d2dwYnZoYnhyZnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMjU3NDUsImV4cCI6MjA5ODgwMTc0NX0.ej0dzTkxYy5rMWdyl2wkoJxdJ3Chxnv7zBP0kBug8Cw"
};

(function applyCloudOverrides() {
  try {
    var o = localStorage.getItem("entopic_cloud_url_override");
    if (o) CLOUD_CONFIG.url = o;
  } catch (e) { /* no localStorage → leave defaults */ }
})();
