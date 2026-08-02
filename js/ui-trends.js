/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — TREND CHARTS                                          */
/*                                                                  */
/* Inline SVG, no libraries (offline-first). Draws the numbers that */
/* were recorded, in date order, and nothing else.                  */
/*                                                                  */
/* WHAT THIS DELIBERATELY DOES NOT DO                               */
/* ─────────────────────────────────                                */
/* It does not say a trend is worsening. It does not compute a rate */
/* of progression. It does not draw a regression line, a target, or */
/* a "normal range" band, and it raises no alert.                   */
/*                                                                  */
/* Every one of those would be a clinical claim. "This visual field */
/* is progressing" is a judgement that depends on test reliability, */
/* the specific perimeter, the number of points and the patient —   */
/* and getting it wrong in either direction is a patient-safety     */
/* event. The clinician looks at the numbers and decides. This       */
/* draws them accurately and stays out of the way.                   */
/*                                                                  */
/* Missing values are SKIPPED, never plotted as zero. A visit where */
/* IOP was not measured is not a visit where IOP was 0.              */
/*                                                                  */
/* Load order: after visit-history.js and dom-escape.js.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var TREND_W = 260, TREND_H = 84, TREND_PAD = 22;

/* One sparkline-style chart for one metric. */
function trendChart(series, label, unit) {
  if (!series || series.length < 2) return "";

  var vals = series.map(function (p) { return p.value; });
  var min = Math.min.apply(null, vals);
  var max = Math.max.apply(null, vals);
  /* A flat series would divide by zero and also reads better with headroom. */
  if (max === min) { max = max + 1; min = min - 1; }

  var w = TREND_W, h = TREND_H, pad = TREND_PAD;
  var innerW = w - pad * 2, innerH = h - pad;

  function x(i) { return pad + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW); }
  function y(v) { return (pad / 2) + innerH - ((v - min) / (max - min)) * innerH; }

  var pts = series.map(function (p, i) { return x(i).toFixed(1) + "," + y(p.value).toFixed(1); });

  var s = '<div class="trend">';
  s += '<div class="trend-t">' + escHtml(label) +
       (unit ? ' <span class="trend-u">(' + escHtml(unit) + ')</span>' : '') + '</div>';
  s += '<svg viewBox="0 0 ' + w + ' ' + h + '" class="trend-svg" role="img" aria-label="' +
       escHtml(label + ": " + vals.join(", ")) + '">';

  /* Axis extremes only — no gridlines implying thresholds. */
  s += '<text x="2" y="' + (pad / 2 + 4) + '" class="trend-ax">' + max.toFixed(1) + '</text>';
  s += '<text x="2" y="' + (pad / 2 + innerH) + '" class="trend-ax">' + min.toFixed(1) + '</text>';

  s += '<polyline class="trend-line" points="' + pts.join(" ") + '" />';
  series.forEach(function (p, i) {
    s += '<circle class="trend-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) +
         '" r="3"><title>' + escHtml(String(p.date).slice(0, 10) + " — " + p.value + (unit ? " " + unit : "")) +
         '</title></circle>';
  });

  s += '</svg>';
  s += '<div class="trend-x"><span>' + escHtml(String(series[0].date).slice(0, 10)) + '</span>' +
       '<span>' + escHtml(String(series[series.length - 1].date).slice(0, 10)) + '</span></div>';
  s += '<div class="trend-n">' + series.length + ' recorded value' +
       (series.length === 1 ? '' : 's') + '</div>';
  s += '</div>';
  return s;
}

/* Every metric with at least two points, for one patient. */
function trendsPanel(patientId) {
  if (typeof trendsAvailable !== "function") return "";
  var list = trendsAvailable(patientId);
  if (!list.length) {
    return '<div class="trend-empty">No measurement has been recorded at two or more ' +
           'visits yet, so there is nothing to compare.</div>';
  }
  var h = '<div class="trend-grid">';
  list.forEach(function (t) { h += trendChart(t.points, t.label, t.unit); });
  h += '</div>';
  h += '<div class="trend-note">Recorded values only. Entopic does not judge whether a ' +
       'trend is progressing — that is a clinical decision.</div>';
  return h;
}
