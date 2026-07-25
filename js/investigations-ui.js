/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — INVESTIGATION UI                                       */
/* Three surfaces over js/investigations.js:                        */
/*   • invOrderBlock()      — raise an order from inside the exam   */
/*   • homeSecInvestigations() — the shared queue (perform + upload) */
/*   • invReviewBlock()     — results back with the clinician        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function invStatusPill(status) {
  var col = { ordered: "#b8860b", in_progress: "#1565c0", completed: "#2e7d32",
              reviewed: "#555", cancelled: "#999" }[status] || "#666";
  return '<span style="font-size:.5rem;text-transform:uppercase;letter-spacing:.05em;' +
    'border:1px solid ' + col + ';color:' + col + ';border-radius:99px;padding:1px 7px;white-space:nowrap">' +
    (INV_STATUS_LABEL[status] || status) + '</span>';
}

function invUrgencyPill(u) {
  if (!u || u === "Routine") return '';
  var col = u === "Same day" ? "#c0392b" : u === "Urgent" ? "#c0392b" : "#b8860b";
  return ' <span style="font-size:.5rem;text-transform:uppercase;letter-spacing:.05em;color:' + col + ';font-weight:600">' + esc(u) + '</span>';
}


/* ── 1. Ordering, from the exam ──────────────────────────────────── */

function invOrderBlock() {
  var cats = {};
  INVESTIGATION_CATALOGUE.forEach(function (t) { (cats[t.cat] = cats[t.cat] || []).push(t); });

  var h = '<div class="dv"><span>Order Investigations</span></div>' +
    '<div style="font-size:.58rem;color:var(--sv);margin-bottom:8px">' +
      'Raised orders appear in the shared <b>Investigations</b> queue, where a technician or another clinician ' +
      'performs the test and uploads the report. You review and sign off when the patient returns.</div>';

  Object.keys(cats).forEach(function (cat) {
    h += '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 3px">' + esc(cat) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:5px">';
    cats[cat].forEach(function (t) {
      var on = !!INV_ORDER_DRAFT.codes[t.code];
      h += '<button class="btn ' + (on ? "btn-p" : "btn-s") + '" style="font-size:.58rem"' +
        ' onclick="invDraftToggle(\'' + t.code + '\')">' + esc(t.name) + '</button>';
      if (on && t.eyes) {
        h += '<span style="display:inline-flex;gap:2px;align-items:center;margin-right:6px">';
        ["OD", "OS", "OU"].forEach(function (e) {
          var sel = INV_ORDER_DRAFT.codes[t.code] === e;
          h += '<button class="btn ' + (sel ? "btn-p" : "btn-s") + '" style="font-size:.52rem;padding:2px 6px"' +
            ' onclick="invDraftEye(\'' + t.code + '\',\'' + e + '\')">' + e + '</button>';
        });
        h += '</span>';
      }
    });
    h += '</div>';
  });

  var n = Object.keys(INV_ORDER_DRAFT.codes).length;
  h += '<div class="fg" style="margin-top:10px">' +
      '<div class="fi"><label>Urgency</label><select oninput="INV_ORDER_DRAFT.urgency=this.value">' +
        INV_URGENCY.map(function (u) {
          return '<option' + (INV_ORDER_DRAFT.urgency === u ? " selected" : "") + '>' + u + '</option>';
        }).join("") + '</select></div>' +
      '<div class="fi full"><label>Clinical question for the person performing it</label>' +
        '<input class="e-in" value="' + esc(INV_ORDER_DRAFT.question) + '" oninput="INV_ORDER_DRAFT.question=this.value"' +
        ' placeholder="e.g. Rule out glaucomatous RNFL loss — asymmetric discs"></div>' +
    '</div>' +
    '<div style="margin-top:8px">' +
      '<button class="btn btn-p" style="font-size:.62rem"' + (n ? '' : ' disabled') +
        ' onclick="invCreateOrder()">Raise order' + (n ? ' (' + n + ')' : '') + '</button>' +
    '</div>';

  /* Existing orders for this patient */
  var mine = (typeof P !== "undefined" && P) ? (P.orders || []) : [];
  if (mine.length) {
    h += '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 4px">This patient\'s orders</div>';
    mine.slice().reverse().forEach(function (o) {
      h += '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:8px;margin-bottom:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<div style="font-size:.64rem;font-weight:600">' +
            o.items.map(function (i) { return esc(i.name) + (i.eye ? ' (' + i.eye + ')' : ''); }).join(", ") +
            invUrgencyPill(o.urgency) + '</div>' +
          invStatusPill(o.status) +
        '</div>' +
        (o.question ? '<div style="font-size:.56rem;color:var(--sv);margin-top:2px">' + esc(o.question) + '</div>' : '') +
        '<div style="font-size:.52rem;color:var(--sv);margin-top:3px">Raised ' + esc((o.created_at || "").slice(0, 16).replace("T", " ")) +
          (o.created_by ? ' by ' + esc(o.created_by) : '') + '</div>' +
        (o.status === "ordered"
          ? '<div style="margin-top:4px"><span style="cursor:pointer;font-size:.54rem;color:var(--as,#c0392b)" onclick="invCancelOrder(\'' + o.id + '\')">cancel order</span></div>'
          : '') +
      '</div>';
    });
  }
  return h;
}


/* ── 2. The shared queue ─────────────────────────────────────────── */

var INV_QUEUE_FILTER = "ordered";
function invSetFilter(f) { INV_QUEUE_FILTER = f; INV_OPEN_ORDER = null; renderHome(); }

function homeSecInvestigations() {
  if (INV_OPEN_ORDER) return invOrderDetail(INV_OPEN_ORDER);

  var counts = {
    ordered: invCount("ordered"), in_progress: invCount("in_progress"),
    completed: invCount("completed"), reviewed: invCount("reviewed"), all: invCount("all")
  };
  var h = '<div class="home-hd"><h1>Investigations</h1>' +
    '<div style="font-size:.62rem;color:var(--sv)">Shared queue — order, perform and upload, then review. ' +
    'Orders raised by any clinician in this workspace appear here.</div></div>';

  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
  [["ordered", "To do"], ["in_progress", "In progress"], ["completed", "Results ready"],
   ["reviewed", "Reviewed"], ["all", "All"]].forEach(function (f) {
    var on = INV_QUEUE_FILTER === f[0];
    h += '<button class="btn ' + (on ? "btn-p" : "btn-s") + '" style="font-size:.6rem"' +
      ' onclick="invSetFilter(\'' + f[0] + '\')">' + f[1] + ' (' + (counts[f[0]] || 0) + ')</button>';
  });
  h += '</div>';

  var rows = invAllOrders(INV_QUEUE_FILTER);
  if (!rows.length) {
    return h + '<div class="home-settings"><div class="home-settings-desc">' +
      'Nothing in this list. Orders raised from the <b>Plan / Management</b> step of an exam show up here.' +
      '</div></div>';
  }

  rows.forEach(function (r) {
    var o = r.order, pt = r.patient;
    var nm = ((pt.first_name || "") + " " + (pt.last_name || "")).trim() || "Unnamed";
    var doneN = (o.items || []).filter(function (i) { return i.status === "completed"; }).length;
    h += '<div class="home-settings" style="margin-bottom:8px;cursor:pointer" onclick="invOpenOrder(\'' + o.id + '\')">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<div class="home-settings-title" style="margin:0">' + esc(nm) +
          '<span style="font-weight:400;color:var(--sv);font-size:.6rem"> · ' + esc(pt.age || "?") + 'y · MRN ' + esc(pt.mrn || pt.id || "") + '</span>' +
          invUrgencyPill(o.urgency) + '</div>' +
        invStatusPill(o.status) +
      '</div>' +
      '<div class="home-settings-desc" style="margin-top:3px">' +
        o.items.map(function (i) { return esc(i.name) + (i.eye ? ' (' + i.eye + ')' : ''); }).join(" · ") +
      '</div>' +
      (o.question ? '<div style="font-size:.56rem;color:var(--sv);margin-top:2px">“' + esc(o.question) + '”</div>' : '') +
      '<div style="font-size:.52rem;color:var(--sv);margin-top:3px">' +
        doneN + ' of ' + o.items.length + ' done · raised ' + esc((o.created_at || "").slice(0, 16).replace("T", " ")) +
        (o.created_by ? ' by ' + esc(o.created_by) : '') + '</div>' +
    '</div>';
  });
  return h;
}


/* ── Order detail: perform, record, upload, review ───────────────── */

function invOrderDetail(orderId) {
  var f = invFindOrder(orderId);
  if (!f) return '<div class="home-hd"><h1>Investigations</h1></div><div class="home-settings">Order not found.</div>';
  var o = f.order, pt = f.patient;
  var nm = ((pt.first_name || "") + " " + (pt.last_name || "")).trim() || "Unnamed";

  var h = '<div class="home-hd">' +
      '<button class="btn btn-s" style="font-size:.6rem;margin-bottom:6px" onclick="invCloseOrder()">← Back to queue</button>' +
      '<h1>' + esc(nm) + ' ' + invStatusPill(o.status) + '</h1>' +
      '<div style="font-size:.62rem;color:var(--sv)">' + esc(pt.age || "?") + 'y · MRN ' + esc(pt.mrn || pt.id || "") +
        ' · raised ' + esc((o.created_at || "").slice(0, 16).replace("T", " ")) +
        (o.created_by ? ' by ' + esc(o.created_by) : '') + invUrgencyPill(o.urgency) + '</div>' +
      (o.question ? '<div style="font-size:.62rem;margin-top:4px;padding:6px 8px;background:var(--sn);border-radius:var(--r)"><b>Clinical question:</b> ' + esc(o.question) + '</div>' : '') +
    '</div>';

  (o.items || []).forEach(function (it, idx) {
    var t = invTest(it.code);
    h += '<div class="home-settings" style="margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<div class="home-settings-title" style="margin:0">' + esc(it.name) + (it.eye ? ' <span style="color:var(--sv);font-weight:400">(' + esc(it.eye) + ')</span>' : '') + '</div>' +
        invStatusPill(it.status) +
      '</div>';

    if (it.status !== "completed") {
      h += '<div class="fg" style="margin-top:6px">';
      (t ? t.fields : []).forEach(function (fl) {
        var val = (it.result && it.result[fl.k]) || "";
        var setter = 'invSetItemField(\'' + o.id + '\',' + idx + ',\'' + fl.k + '\',this.value)';
        if (fl.type === "textarea") {
          h += '<div class="fi full"><label>' + esc(fl.l) + '</label><textarea oninput="' + setter + '">' + esc(val) + '</textarea></div>';
        } else if (fl.type === "select") {
          h += '<div class="fi"><label>' + esc(fl.l) + '</label><select oninput="' + setter + '">' +
            (fl.opts || []).map(function (op) {
              return '<option' + (val === op ? " selected" : "") + '>' + esc(op) + '</option>';
            }).join("") + '</select></div>';
        } else {
          h += '<div class="fi"><label>' + esc(fl.l) + '</label><input class="e-in" value="' + esc(val) + '" oninput="' + setter + '"></div>';
        }
      });
      h += '<div class="fi full"><label>Note from the person performing this</label>' +
        '<textarea oninput="invSetItemNote(\'' + o.id + '\',' + idx + ',this.value)" placeholder="Cooperation, media clarity, repeat needed…">' + esc(it.tech_note || "") + '</textarea></div>' +
        '</div>';
    } else {
      /* Completed → read-only summary */
      var lines = [];
      (t ? t.fields : []).forEach(function (fl) {
        var v = it.result && it.result[fl.k];
        if (v) lines.push('<div style="font-size:.58rem"><span style="color:var(--sl)">' + esc(fl.l) + ':</span> ' + esc(v) + '</div>');
      });
      h += '<div style="margin-top:6px">' + (lines.join("") || '<div style="font-size:.58rem;color:var(--sv)">No values recorded — see attached report.</div>') + '</div>';
      if (it.tech_note) h += '<div style="font-size:.56rem;color:var(--sv);margin-top:4px">Note: ' + esc(it.tech_note) + '</div>';
      h += '<div style="font-size:.52rem;color:var(--sv);margin-top:4px">Performed ' +
        esc((it.performed_at || "").slice(0, 16).replace("T", " ")) + (it.performed_by ? ' by ' + esc(it.performed_by) : '') + '</div>';
    }

    /* Reports */
    h += '<div style="margin-top:8px">' +
      '<div style="font-size:.54rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Report / images</div>';
    if (it.files && it.files.length) {
      h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:5px">';
      it.files.forEach(function (fr) {
        h += '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:4px;width:104px;font-size:.5rem;cursor:pointer"' +
          ' onclick="invOpenFile(\'' + o.id + '\',' + idx + ',\'' + fr.id + '\')">' +
          (fr.thumb ? '<img src="' + fr.thumb + '" style="width:100%;height:56px;object-fit:cover;border-radius:2px">'
                    : '<div style="height:56px;display:flex;align-items:center;justify-content:center;background:var(--fg);border-radius:2px;font-size:1.2rem">' + (/pdf/.test(fr.type) ? "📄" : "📎") + '</div>') +
          '<div style="margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(fr.name) + '">' + esc(fr.name) + '</div>' +
          '<div style="color:var(--sv)">' + fsHumanSize(fr.size) + '</div>' +
        '</div>';
      });
      h += '</div>';
    }
    if (it.status !== "completed") {
      h += '<input type="file" multiple accept="image/*,application/pdf" style="font-size:.58rem"' +
        ' onchange="invAttachHandle(this,\'' + o.id + '\',' + idx + ')">';
    }
    h += '</div>';

    /* Item actions */
    if (o.status !== "cancelled" && o.status !== "reviewed") {
      h += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
      if (it.status === "ordered") {
        h += '<button class="btn btn-s" style="font-size:.58rem" onclick="invMarkItem(\'' + o.id + '\',' + idx + ',\'in_progress\')">Start</button>';
      }
      if (it.status !== "completed") {
        h += '<button class="btn btn-p" style="font-size:.58rem" onclick="invMarkItem(\'' + o.id + '\',' + idx + ',\'completed\')">Mark done</button>';
      } else {
        h += '<button class="btn btn-s" style="font-size:.58rem" onclick="invMarkItem(\'' + o.id + '\',' + idx + ',\'in_progress\')">Reopen</button>';
      }
      h += '</div>';
    }
    h += '</div>';
  });

  /* Clinician review / sign-off */
  h += '<div class="home-settings" style="border-color:var(--ink)">' +
    '<div class="home-settings-title">Clinician review &amp; sign-off</div>' +
    '<div class="home-settings-desc">Verify the reports against the working differential, then sign off. ' +
      'Signing off records who reviewed it and when — it is not a diagnosis by itself.</div>';
  if (o.status === "reviewed") {
    h += '<div style="font-size:.6rem;margin-top:6px;color:#2e7d32">✓ Reviewed ' +
      esc((o.reviewed_at || "").slice(0, 16).replace("T", " ")) + (o.reviewed_by ? ' by ' + esc(o.reviewed_by) : '') + '</div>' +
      (o.review_note ? '<div style="font-size:.58rem;margin-top:4px">' + esc(o.review_note) + '</div>' : '');
  } else {
    h += '<div class="fi full" style="margin-top:6px"><label>Review note</label>' +
      '<textarea oninput="invSetReviewNote(\'' + o.id + '\',this.value)" placeholder="What the results show, how they change the plan…">' + esc(o.review_note || "") + '</textarea></div>' +
      '<div style="margin-top:6px"><button class="btn btn-p" style="font-size:.62rem" onclick="invMarkReviewed(\'' + o.id + '\')">Sign off results</button></div>';
  }
  h += '</div>';
  return h;
}


/* ── 3. Results waiting for this patient, shown inside the exam ──── */

function invReviewBlock() {
  if (typeof P === "undefined" || !P || !P.orders || !P.orders.length) return "";
  var ready = P.orders.filter(function (o) { return o.status === "completed"; });
  if (!ready.length) return "";

  var h = '<div class="dv"><span>Investigation results ready for review</span></div>';
  ready.forEach(function (o) {
    h += '<div style="border:1px solid var(--ink);border-radius:var(--r);padding:8px;margin-bottom:6px">' +
      '<div style="font-size:.64rem;font-weight:600">' +
        o.items.map(function (i) { return esc(i.name) + (i.eye ? ' (' + i.eye + ')' : ''); }).join(", ") + '</div>';
    o.items.forEach(function (it) {
      var t = invTest(it.code);
      var vals = [];
      (t ? t.fields : []).forEach(function (fl) {
        var v = it.result && it.result[fl.k];
        if (v) vals.push(esc(fl.l) + ": " + esc(v));
      });
      if (vals.length) h += '<div style="font-size:.56rem;color:var(--md);margin-top:2px">' + vals.join(" · ") + '</div>';
      if (it.files && it.files.length) h += '<div style="font-size:.52rem;color:var(--sv)">' + it.files.length + ' report file(s) attached</div>';
    });
    h += '<div style="margin-top:5px"><button class="btn btn-s" style="font-size:.58rem"' +
      ' onclick="goHome();setHomeTab(\'investigations\');invOpenOrder(\'' + o.id + '\')">Open &amp; review</button></div>' +
    '</div>';
  });
  return h;
}
