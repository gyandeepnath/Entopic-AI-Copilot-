/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLOUD CONFIG                                          */
/*                                                                  */
/* The optional cloud backend is OFF by default. Entopic is         */
/* offline-first: the exam, engine and knowledge base run entirely  */
/* on the device and NEVER depend on the network.                   */
/*                                                                  */
/* No data leaves the device until YOU connect Entopic to YOUR OWN  */
/* Supabase project (URL + anon key), entered in the app's Cloud    */
/* card and stored locally on this device. There is no shared or    */
/* default backend — nothing syncs to anyone else's account.        */
/* See docs/BACKEND_OWNERSHIP.md for the one-time setup.            */
/*                                                                  */
/* (The anon key is a PUBLIC client credential by design; access is */
/* enforced by Row-Level Security in the database, not by hiding    */
/* the key.)                                                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CLOUD_CONFIG = {
  enabled: false,   /* flips true only when a project is configured below */
  url: "",
  anonKey: ""
};

/* Load a device-local cloud project, if the user connected one. */
(function applyCloudOverrides() {
  if (typeof localStorage === "undefined") return;
  try {
    var url = localStorage.getItem("entopic_cloud_url") ||
              localStorage.getItem("entopic_cloud_url_override") || "";
    var key = localStorage.getItem("entopic_cloud_key") || "";
    if (url) CLOUD_CONFIG.url = url;
    if (key) CLOUD_CONFIG.anonKey = key;
    /* enable only when a real project (url + key) is present */
    CLOUD_CONFIG.enabled = !!(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey);
  } catch (e) { /* no localStorage → stays offline */ }
})();

/* Connect this device to YOUR Supabase project. Stored locally only. */
function configureCloud(url, anonKey) {
  url = String(url || "").trim();
  anonKey = String(anonKey || "").trim();
  if (!/^https:\/\/.+\.supabase\.co/.test(url) || anonKey.length < 20) return false;
  try {
    localStorage.setItem("entopic_cloud_url", url);
    localStorage.setItem("entopic_cloud_key", anonKey);
  } catch (e) { return false; }
  CLOUD_CONFIG.url = url;
  CLOUD_CONFIG.anonKey = anonKey;
  CLOUD_CONFIG.enabled = true;
  return true;
}

function cloudConfigured() { return !!(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey); }

/* Forget the connected project (back to fully offline). */
function disconnectCloud() {
  try {
    localStorage.removeItem("entopic_cloud_url");
    localStorage.removeItem("entopic_cloud_url_override");
    localStorage.removeItem("entopic_cloud_key");
  } catch (e) {}
  CLOUD_CONFIG.url = "";
  CLOUD_CONFIG.anonKey = "";
  CLOUD_CONFIG.enabled = false;
}
