/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — OPHTHALMIC DRAWING COLOUR-CODE GUIDE                   */
/*                                                                  */
/* Compiled from multiple published teaching sources (listed in     */
/* DRAW_GUIDE_SOURCES) and cross-checked for agreement. Where the   */
/* sources agree the entry is marked `agreed`; where a convention    */
/* is taught but varies between schools it is marked `varies` so    */
/* the clinician can see which parts are firm and which are local.  */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — this is a DOCUMENTATION convention, not */
/* clinical decision support. Nothing here is scored, interpreted or */
/* fed to the diagnostic engine, and it contains no thresholds or    */
/* diagnostic criteria. Regional and institutional variation is real */
/* — the founder should confirm it against local teaching, and the   */
/* guide is written so single entries can be edited without touching */
/* the drawing tool.                                                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var DRAW_GUIDE_REVIEW_STATUS = "NEEDS_CLINICAL_REVIEW";

/* Sources consulted when compiling the tables below. */
var DRAW_GUIDE_SOURCES = [
  { label: "Retinal drawing — Kerala Journal of Ophthalmology (2019)",
    url: "https://www.ovid.com/jnls/kjop/fulltext/10.4103/kjo.kjo_68_19~retinal-drawing" },
  { label: "Documentation & Drawing in Ophthalmology — eOphtha",
    url: "https://www.eophtha.com/posts/documentation-drawing-in-ophthalmology" },
  { label: "Basics of Fundus Drawing — ShortWhiteCoats",
    url: "https://shortwhitecoats.com/2015/basics-of-fundus-drawing" },
  { label: "Corneal drawings (teaching deck)",
    url: "https://www.slideshare.net/slideshow/corneal-drawings/29684618" },
  { label: "Clinical signs in cornea and ocular surface — Indian J Ophthalmol (PMC5819095)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5819095/" },
  { label: "“It is time for more colors!” — commentary on drawing conventions (PMC9789805)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9789805/" }
];

/* ── FUNDUS / RETINAL DRAWING ──────────────────────────────────── */
var DRAW_GUIDE_FUNDUS = [
  { label: "Red", value: "#cc0000", status: "agreed",
    use: "Attached (normal) retina · retinal arterioles · haemorrhage · neovascularisation (NVD/NVE)",
    detail: "The fundus is conventionally laid down in light red for attached retina; a darker red fills the inner part of a break. Retinal arterioles and any new vessels are red." },
  { label: "Blue", value: "#0044cc", status: "agreed",
    use: "Detached retina · retinal veins · subretinal fluid · retinal / macular oedema · outline of breaks · folds",
    detail: "Blue marks anything raised or fluid-filled: a frank detachment, subretinal fluid around a tear, oedema, and the OUTLINE of every retinal break." },
  { label: "Green", value: "#007700", status: "agreed",
    use: "Pre-retinal and media opacities — vitreous haemorrhage · vitreous membranes · hyaloid ring · asteroid hyalosis · intraocular foreign body",
    detail: "By convention ALL pre-retinal lesions are green, which is what makes anterior-to-the-retina pathology instantly readable on the chart." },
  { label: "Brown", value: "#8B4513", status: "agreed",
    use: "Choroidal and melanocytic lesions — choroidal naevus / melanoma · choroidal detachment · RPE hypertrophy · pigmented choroidal change",
    detail: "Brown is reserved for the choroid and melanocytic lesions, distinguishing them from retinal (red/blue) pathology." },
  { label: "Yellow", value: "#d4a017", status: "agreed",
    use: "Exudates · drusen",
    detail: "Hard and soft exudates and drusen are drawn yellow." },
  { label: "Black", value: "#000000", status: "agreed",
    use: "Pigment · pigmented laser / cryo scars · pigmented chorioretinal scars",
    detail: "Black denotes pigment wherever it sits. Laser scars are commonly drawn with black pigment at the centre of the treated spot." }
];

/* Composite conventions — how colours combine for particular lesions. */
var DRAW_GUIDE_FUNDUS_RULES = [
  { rule: "Retinal break (hole / tear)", status: "agreed",
    how: "Outline the break in BLUE and fill the inner part with (darker) RED. For an inner-layer hole, outline blue and cross-line the inside in red." },
  { rule: "Retinal detachment", status: "agreed",
    how: "Shade the detached area BLUE, leaving attached retina red. The blue/red border is the extent of the detachment." },
  { rule: "Lattice degeneration", status: "varies",
    how: "Drawn between the ora serrata and the equator (between the outer and middle circles of the chart). Commonly outlined in blue with cross-hatching; some schools hatch in blue, others add the reddish base — confirm locally." },
  { rule: "Thin / atrophic retina", status: "varies",
    how: "Usually outlined in blue without full blue fill, to separate it from frank detachment. Conventions differ — confirm locally." },
  { rule: "Position on the chart", status: "agreed",
    how: "Draw to the clock hour and to the correct zone: posterior pole inside the inner circle, equatorial between inner and middle, peripheral / ora between middle and outer." }
];

/* ── ANTERIOR SEGMENT / SLIT-LAMP DRAWING ──────────────────────── */
var DRAW_GUIDE_ANTERIOR = [
  { label: "Green", value: "#007700", status: "agreed",
    use: "Epithelial defect · fluorescein staining · superficial punctate keratopathy · filaments",
    detail: "Green is what fluoresces: any epithelial break or stain. Stipple green for SPK, outline and fill for a frank defect." },
  { label: "Yellow", value: "#d4a017", status: "agreed",
    use: "Infiltrate · hypopyon",
    detail: "Stromal infiltrate and a hypopyon level are drawn yellow, which is why an ulcer reads as a yellow infiltrate under a green defect." },
  { label: "Blue", value: "#0044cc", status: "agreed",
    use: "Corneal / stromal oedema · Descemet's folds · striae",
    detail: "Blue for oedema and folds, in the same spirit as the retinal chart (blue = fluid / swelling)." },
  { label: "Red", value: "#cc0000", status: "agreed",
    use: "Blood vessels · neovascularisation (superficial & deep) · hyphaema · injection",
    detail: "Anything vascular or blood: limbal injection, corneal vessels, a hyphaema level." },
  { label: "Brown", value: "#8B4513", status: "agreed",
    use: "Pigment · iris detail · pupil · posterior / peripheral synechiae · pigmented keratic precipitates",
    detail: "Brown carries iris architecture and any pigment deposited on cornea, lens or angle." },
  { label: "Black", value: "#000000", status: "agreed",
    use: "Scars · sutures · limbus outline · foreign body",
    detail: "Black is structural outline: the limbus, corneal scars, sutures and foreign bodies." }
];

var DRAW_GUIDE_ANTERIOR_RULES = [
  { rule: "Draw it twice", status: "agreed",
    how: "Corneal pathology is conventionally documented as a FRONTAL view plus a CROSS-SECTION, so depth (epithelial / stromal / endothelial) is recorded as well as position and size." },
  { rule: "Corneal ulcer", status: "agreed",
    how: "Yellow infiltrate, green overlying epithelial defect, plus depth on the cross-section; add red for vessels and yellow for any hypopyon." },
  { rule: "Measure it", status: "agreed",
    how: "Record the size in mm on the drawing (horizontal × vertical) so follow-up drawings are comparable." },
  { rule: "Scars vs infiltrate", status: "agreed",
    how: "A scar is black outline (± hatching); an active infiltrate is yellow. Drawing them differently is what makes progression readable across visits." }
];

function drawGuideFor(type) {
  return type === "fundus"
    ? { colours: DRAW_GUIDE_FUNDUS, rules: DRAW_GUIDE_FUNDUS_RULES, title: "Fundus / retinal drawing" }
    : { colours: DRAW_GUIDE_ANTERIOR, rules: DRAW_GUIDE_ANTERIOR_RULES, title: "Anterior segment drawing" };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DRAW_GUIDE_FUNDUS: DRAW_GUIDE_FUNDUS,
    DRAW_GUIDE_ANTERIOR: DRAW_GUIDE_ANTERIOR,
    DRAW_GUIDE_FUNDUS_RULES: DRAW_GUIDE_FUNDUS_RULES,
    DRAW_GUIDE_ANTERIOR_RULES: DRAW_GUIDE_ANTERIOR_RULES,
    DRAW_GUIDE_SOURCES: DRAW_GUIDE_SOURCES,
    drawGuideFor: drawGuideFor
  };
}
