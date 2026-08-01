/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — INSIGHTS ENGINE                                       */
/*                                                                  */
/* Prevalence, trends, co-occurrence and care patterns computed     */
/* over the research corpus. Runs entirely offline and              */
/* deterministically — no network, no model, no LLM. The same       */
/* corpus always yields the same figures, which is the minimum bar  */
/* for anything anyone might publish or act on.                     */
/*                                                                  */
/* THREE RULES THAT MAKE THE OUTPUT HONEST                         */
/*                                                                  */
/* 1. EVERY FIGURE CARRIES ITS DENOMINATOR. "Dry eye 34%" is not a  */
/*    finding; "34% (n=17 of 50)" is. A percentage without an n is  */
/*    how small samples get published as trends.                    */
/*                                                                  */
/* 2. SMALL CELLS ARE SUPPRESSED. A cell of 1 or 2 in a single      */
/*    practice, crossed with an age band and a rare condition, can  */
/*    identify a person. Cells below the threshold report           */
/*    "suppressed" rather than a number.                            */
/*                                                                  */
/* 3. THIS IS CLINIC-ATTENDANCE PREVALENCE, NOT POPULATION          */
/*    PREVALENCE. It describes who walked through this door and     */
/*    what the engine suggested — not how common a disease is in    */
/*    the community. Every result says so, because that single      */
/*    confusion is the most likely way this data gets misused.      */
/*                                                                  */
/* AND ONE THAT MATTERS CLINICALLY                                 */
/*                                                                  */
/* The corpus stores the ENGINE'S DIFFERENTIAL, not a confirmed     */
/* diagnosis. Counting it as diagnosis would measure the software's */
/* suggestions and call them disease. Every output labels this.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Below this, a cell reports "suppressed". 5 is the common statistical
   -disclosure-control floor; it is a parameter so a larger multi-site
   corpus can justify lowering it with a stated reason. */
var INSIGHT_MIN_CELL = 5;

/* Every result carries this. It travels with exports and into any report, so
   a figure cannot be separated from what it actually means. */
var INSIGHT_CAVEAT =
  "Clinic-attendance figures from consented, de-identified records — NOT population " +
  "prevalence. Values reflect the engine's ranked differential, which is advisory and " +
  "not a confirmed diagnosis. Cells below " + INSIGHT_MIN_CELL + " are suppressed.";

function insightPct(n, d) {
  if (!d) return null;
  return +((100 * n) / d).toFixed(1);
}

/* A counted cell, suppressed when too small to report safely. */
function insightCell(n, denom, label) {
  if (n > 0 && n < INSIGHT_MIN_CELL) {
    return { label: label, suppressed: true, n: null, denom: denom, pct: null };
  }
  return { label: label, suppressed: false, n: n, denom: denom, pct: insightPct(n, denom) };
}

/* Records matching a filter. Filters are plain equality on the de-identified
   fields, which is all the corpus holds. */
function insightSelect(detail, filter) {
  filter = filter || {};
  return (detail || []).filter(function (r) {
    if (filter.age_band && r.age_band !== filter.age_band) return false;
    if (filter.sex && r.sex !== filter.sex) return false;
    if (filter.from && String(r.month) < filter.from) return false;
    if (filter.to && String(r.month) > filter.to) return false;
    if (filter.kb_version && r.kb_version !== filter.kb_version) return false;
    return true;
  });
}


/* ── Prevalence ───────────────────────────────────────────────────
   How often each condition appeared as the LEADING differential, and how
   often anywhere in the top 5. Both, because they answer different
   questions and conflating them overstates rare conditions. */
function insightPrevalence(corpus, filter) {
  var detail = insightSelect((corpus || {}).detail, filter);
  var denom = detail.length;
  var lead = {}, any = {};

  for (var i = 0; i < detail.length; i++) {
    var dx = detail[i].dx || [];
    if (dx[0] && dx[0].name) lead[dx[0].name] = (lead[dx[0].name] || 0) + 1;
    var seen = {};
    for (var j = 0; j < dx.length; j++) {
      var n = dx[j] && dx[j].name;
      if (!n || seen[n]) continue;
      seen[n] = true;
      any[n] = (any[n] || 0) + 1;
    }
  }

  function rank(map) {
    return Object.keys(map)
      .map(function (k) { return insightCell(map[k], denom, k); })
      .sort(function (a, b) { return (b.n || 0) - (a.n || 0); });
  }

  return {
    denominator: denom,
    leading: rank(lead),
    anywhere_in_top5: rank(any),
    caveat: INSIGHT_CAVEAT,
    /* A figure computed across a KB change is comparing two rulers. Say so. */
    kb_versions: insightKbSpread(detail)
  };
}

function insightKbSpread(detail) {
  var m = {};
  for (var i = 0; i < detail.length; i++) {
    var v = detail[i].kb_version || "unknown";
    m[v] = (m[v] || 0) + 1;
  }
  var keys = Object.keys(m).sort();
  return {
    versions: keys,
    mixed: keys.length > 1,
    counts: m,
    note: keys.length > 1
      ? "This selection spans " + keys.length + " knowledge-base versions. The engine's " +
        "differential changed between them, so comparisons across this range are not like-for-like."
      : ""
  };
}


/* ── Trend ───────────────────────────────────────────────────────
   A condition's share of encounters, month by month, including the roll-up
   so history is not lost when detail records are compacted. */
function insightTrend(corpus, conditionName, filter) {
  var detail = insightSelect((corpus || {}).detail, filter);
  var byMonth = {};

  function bucket(month) {
    if (!byMonth[month]) byMonth[month] = { month: month, n: 0, hits: 0 };
    return byMonth[month];
  }

  for (var i = 0; i < detail.length; i++) {
    var r = detail[i];
    if (!r.month) continue;
    var b = bucket(r.month);
    b.n++;
    if (r.dx && r.dx[0] && r.dx[0].name === conditionName) b.hits++;
  }

  /* Roll-ups keep only the leading-dx counts, which is exactly what this
     needs — so compaction does not create a hole in the trend line. */
  var rollup = (corpus || {}).rollup || [];
  for (var k = 0; k < rollup.length; k++) {
    var g = rollup[k];
    if (!g.month) continue;
    if (filter && filter.age_band && g.age_band !== filter.age_band) continue;
    if (filter && filter.sex && g.sex !== filter.sex) continue;
    var rb = bucket(g.month);
    rb.n += g.n || 0;
    rb.hits += (g.dx && g.dx[conditionName]) || 0;
  }

  var points = Object.keys(byMonth).sort().map(function (m) {
    var b = byMonth[m];
    return { month: m, n: b.n, hits: (b.hits < INSIGHT_MIN_CELL && b.hits > 0) ? null : b.hits,
             suppressed: b.hits > 0 && b.hits < INSIGHT_MIN_CELL,
             pct: (b.hits < INSIGHT_MIN_CELL) ? null : insightPct(b.hits, b.n) };
  });

  return {
    condition: conditionName,
    points: points,
    total_encounters: points.reduce(function (a, p) { return a + p.n; }, 0),
    caveat: INSIGHT_CAVEAT,
    /* A trend over fewer than three months is not a trend. */
    reportable: points.filter(function (p) { return p.pct !== null; }).length >= 3,
    reportable_note: "A direction of travel needs at least three reportable months."
  };
}


/* ── Co-occurrence ───────────────────────────────────────────────
   Which conditions appear together in the same differential. Useful for
   spotting KB entries that never separate — an engine-quality signal as
   much as a clinical one. */
function insightCooccurrence(corpus, filter) {
  var detail = insightSelect((corpus || {}).detail, filter);
  var pairs = {};
  for (var i = 0; i < detail.length; i++) {
    var names = (detail[i].dx || []).map(function (d) { return d.name; })
      .filter(Boolean).sort();
    for (var a = 0; a < names.length; a++) {
      for (var b = a + 1; b < names.length; b++) {
        var key = names[a] + " + " + names[b];
        pairs[key] = (pairs[key] || 0) + 1;
      }
    }
  }
  return {
    denominator: detail.length,
    pairs: Object.keys(pairs)
      .map(function (k) { return insightCell(pairs[k], detail.length, k); })
      .sort(function (x, y) { return (y.n || 0) - (x.n || 0); })
      .slice(0, 40),
    caveat: INSIGHT_CAVEAT
  };
}


/* ── Care patterns ───────────────────────────────────────────────
   Red-flag and referral rates. These are the figures a practice can act on
   directly, and the ones most useful for quality improvement. */
function insightCarePatterns(corpus, filter) {
  var detail = insightSelect((corpus || {}).detail, filter);
  var d = detail.length;
  var urgent = 0, referred = 0, urgentReferred = 0;
  var byUrgency = {};

  for (var i = 0; i < detail.length; i++) {
    var r = detail[i];
    var hasUrgent = (r.urgent_alerts || 0) > 0;
    var hasRef = !!r.referral;
    if (hasUrgent) urgent++;
    if (hasRef) referred++;
    if (hasUrgent && hasRef) urgentReferred++;
    if (r.referral_urgency) byUrgency[r.referral_urgency] = (byUrgency[r.referral_urgency] || 0) + 1;
  }

  return {
    denominator: d,
    red_flag_encounters: insightCell(urgent, d, "Encounters with an urgent alert"),
    referred: insightCell(referred, d, "Encounters referred"),
    /* The safety-relevant one: an urgent alert that did NOT lead to a
       referral. Reported as a question for the practice, never as a
       judgement — there are many legitimate reasons. */
    urgent_not_referred: insightCell(urgent - urgentReferred, d,
      "Urgent alert with no referral recorded"),
    referral_urgency: Object.keys(byUrgency).map(function (k) {
      return insightCell(byUrgency[k], d, k);
    }).sort(function (a, b) { return (b.n || 0) - (a.n || 0); }),
    caveat: INSIGHT_CAVEAT,
    interpretation_note:
      "An urgent alert without a recorded referral is a prompt to look, not a finding. " +
      "The patient may have been referred outside Entopic, seen the same day, or already " +
      "under care."
  };
}


/* ── One call for a dashboard ────────────────────────────────────── */
function insightsReport(corpus, filter) {
  corpus = corpus || (typeof corpusLoad === "function" ? corpusLoad() : { detail: [], rollup: [] });
  var prev = insightPrevalence(corpus, filter);
  var top = prev.leading.filter(function (c) { return !c.suppressed; })[0];
  return {
    generated_at: new Date().toISOString(),
    filter: filter || {},
    corpus: (typeof corpusStats === "function") ? corpusStats() : null,
    prevalence: prev,
    care: insightCarePatterns(corpus, filter),
    cooccurrence: insightCooccurrence(corpus, filter),
    trend: top ? insightTrend(corpus, top.label, filter) : null,
    caveat: INSIGHT_CAVEAT
  };
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    INSIGHT_MIN_CELL: INSIGHT_MIN_CELL, INSIGHT_CAVEAT: INSIGHT_CAVEAT,
    insightCell: insightCell, insightSelect: insightSelect,
    insightPrevalence: insightPrevalence, insightTrend: insightTrend,
    insightCooccurrence: insightCooccurrence, insightCarePatterns: insightCarePatterns,
    insightsReport: insightsReport
  };
}
