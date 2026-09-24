/* ═══════════════════════════════════════════════════════════════ */
/* CHIEF-COMPLAINT PARSER — WHAT A SENTENCE DOES AND DOES NOT SAY    */
/*                                                                  */
/* parseComplaintText matched SUBSTRINGS. Measured against 38        */
/* ordinary complaints it produced 21 false tokens: "routine eye     */
/* tesTING" → burning, "eyelid twITCHing" → itching, "KEYBOARD" →    */
/* distance blur, "THOUSANDs" → grittiness, "retinal TEAR" →         */
/* watering, "near-sighted" → near blur, "doesn't MATTER" →          */
/* discharge, "welder's FLASH burn" → photopsia (and with "spots",   */
/* an urgent flashes + floaters banner), "since last NIGHT" →        */
/* worse in the evening, a HEADache → eye pain.                      */
/*                                                                  */
/* TUNED is the table the rewrite was built against. HELD_OUT was    */
/* written afterwards and never tuned on — it is the honest measure, */
/* and it leans on red-flag SENSITIVITY: losing a true positive is   */
/* the worse error, so every urgent symptom phrase must still parse. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const parse = (s) => vm.runInContext("parseComplaintText(" + JSON.stringify(s.toLowerCase()) + ")", eng.context);

/* [phrase, tokens it MUST produce, tokens it must NOT produce] */
const TUNED = [
  ["came in for routine eye testing", [], ["burning"]],
  ["new glasses, existing ones scratched", [], ["burning", "grittiness"]],
  ["eyelid twitching for a week", [], ["itching_dominant"]],
  ["itchy eyes every spring", ["itching_dominant"], []],
  ["can't see the board at school", ["distance_blur"], []],
  ["neck pain from keyboard work", [], ["distance_blur"]],
  ["red eye since this morning", ["redness"], ["morning_blur"]],
  ["blurry in the morning, clears by lunch", ["blur", "morning_blur"], []],
  ["painful red eye since last night", ["pain", "redness"], ["worse_evening"]],
  ["eyes tired and worse in the evening", ["asthenopia", "worse_evening"], []],
  ["trouble with night vision", ["night_blindness"], ["worse_evening"]],
  ["referred with a retinal tear", [], ["watering"]],
  ["watery eyes outdoors", ["watering"], []],
  ["eyes tearing constantly", ["watering"], []],
  ["headaches after reading", ["headache", "near_blur"], ["pain"]],
  ["eye ache behind the right eye", ["pain"], []],
  ["short-sighted, want contact lenses", [], []],
  ["near-sighted since childhood, glasses broken", [], ["near_blur"]],
  ["nearly walked into a door, missing vision on left", ["field_loss"], ["near_blur"]],
  ["it doesn't matter which eye, both blurry", ["blur"], ["purulent_discharge"]],
  ["yellow sticky matter in the mornings", ["purulent_discharge"], []],
  ["got a welder's flash burn yesterday, painful", ["pain"], ["flashes"]],
  ["flashes of light and new floaters", ["flashes", "floaters"], []],
  ["thousands of floaters", ["floaters"], ["grittiness"]],
  ["sand-like feeling in both eyes", ["grittiness"], []],
  ["double-checked my old prescription, just want a test", [], ["diplopia"]],
  ["double vision when tired", ["diplopia"], []],
  ["headphones cause no problem, vision fine", [], ["near_blur", "screen_use_exacerbation"]],
  ["struggling to read my phone", ["near_blur"], []],
  ["hazy vision", ["blur"], []],
  ["no pain, no redness, just blurry", ["blur"], ["pain", "redness"]],
  ["closed eyes and saw flashes", ["flashes"], ["near_blur"]],
  ["watching the whiteboard at work is blurry", ["distance_blur", "blur"], []],
  ["noticed a shadow in my vision", ["field_loss"], []],
  ["pus from the eye", ["purulent_discharge"], []],
  ["pushing on the eye hurts", ["pain"], ["purulent_discharge"]],
  ["sunburnt eyelids, stinging", ["burning"], []],
  ["facebook all day, eyes strained", ["asthenopia"], ["near_blur"]]
];

const HELD_OUT = [
  ["Sudden onset of flashing lights and a shower of floaters in the left eye", ["flashes", "floaters", "sudden_onset"], []],
  ["a dark curtain came down over my right eye", ["field_loss"], []],
  ["lost half my vision suddenly", ["sudden_onset"], []],
  ["severe eye pain with halos around lights and vomiting", ["pain", "halos"], []],
  ["Pain when I move my eye, colours look washed out", ["pain", "pain_eye_movement"], []],
  ["Straight lines look wavy when reading", ["distortion", "near_blur"], []],
  ["seeing double since the fall", ["diplopia"], []],
  ["my eyelid is drooping", ["ptosis"], []],
  ["Sticky eyes stuck shut in the morning with green discharge", ["purulent_discharge", "lid_crusting"], []],
  ["Gritty, burning eyes worse at end of the day", ["grittiness", "burning", "worse_evening"], []],
  ["Very sensitive to bright light, eye is red and sore", ["photophobia", "redness", "pain"], []],
  ["Feels like something in my eye after grinding metal", ["foreign_body_sensation"], []],
  ["My eyes keep watering in the wind", ["watering"], []],
  ["Blurred distance vision gradually over a year", ["blur", "distance_blur", "gradual_onset"], []],
  ["Struggling with small print on medicine bottles", [], []],
  ["itchy watery eyes with sneezing", ["itching_dominant", "watering"], []],
  ["Glare from headlights when driving at night", ["glare", "distance_blur"], []],
  ["Eyes feel tired after long hours on the computer", ["asthenopia", "screen_use_exacerbation"], []],
  ["Floaters for years, no change", ["floaters"], []],
  ["no flashes, no floaters, no curtain", [], ["flashes", "floaters", "field_loss"]],
  ["Denies pain; mild redness", ["redness"], ["pain"]],
  ["Existing presbyope wants varifocals", [], ["burning"]],
  ["Twitching lower lid", [], ["itching_dominant"]],
  ["Came for contact lens aftercare, no issues", [], []],
  ["Hazy vision around lights", ["blur"], []],
  ["Ghost images when watching TV", ["ghosting"], []],
  ["Headache over the eyes when reading", ["headache", "near_blur"], []],
  ["Sore red eye after swimming", ["pain", "redness"], []],
  ["Tearing and mattering both eyes", ["watering", "purulent_discharge"], []],
  ["Nothing wrong, just a routine check", [], []]
];

function check(table) {
  const wrong = [];
  for (const [s, must, mustNot] of table) {
    const got = parse(s);
    const miss = must.filter((t) => !got.includes(t));
    const bad = mustNot.filter((t) => got.includes(t));
    if (miss.length || bad.length) {
      wrong.push(JSON.stringify(s) + (bad.length ? "  FALSE: " + bad.join(",") : "") +
                 (miss.length ? "  MISSED: " + miss.join(",") : "") + "  (got " + got.join(",") + ")");
    }
  }
  return wrong;
}

test("the tuned phrases parse to exactly what they say", () => {
  assert.deepStrictEqual(check(TUNED), []);
});

test("held-out phrases parse to exactly what they say", () => {
  assert.deepStrictEqual(check(HELD_OUT), []);
});

test("negation still removes a symptom, and every red-flag phrase still parses", () => {
  /* .length, not deepStrictEqual: the array comes from the engine's VM realm */
  assert.strictEqual(parse("no flashes, no floaters, no curtain").length, 0);
  const rf = parse("sudden flashes and a shower of floaters with a shadow over the vision");
  for (const t of ["flashes", "floaters", "field_loss", "sudden_onset"]) {
    assert.ok(rf.includes(t), "red-flag symptom lost: " + t);
  }
});
