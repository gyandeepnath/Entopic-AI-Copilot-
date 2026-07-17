/* ═══════════════════════════════════════════════════════════════ */
/* CONDITION INFO — plain-language reference summaries              */
/*                                                                  */
/* Powers the "ⓘ About this condition" toggle in the advisory panel. */
/* This is REFERENCE PROSE for the clinician's convenience — it is    */
/* deliberately kept OUT of the diagnostic knowledge base so it can   */
/* never influence the deterministic engine (scoring/routing/alerts   */
/* read only the structured req/sup/con tokens, never this text).     */
/*                                                                    */
/* ⚠ NEEDS_CLINICAL_REVIEW — every entry here is AI-authored and       */
/*   PROVISIONAL until the founder verifies it. To honour the hard     */
/*   no-fabrication guardrail this content is intentionally            */
/*   QUALITATIVE: no invented statistics, likelihood ratios,           */
/*   sensitivity/specificity, numeric thresholds, drug names/doses,    */
/*   citations, or guideline claims. It describes, in general terms,   */
/*   what the condition is, how it typically presents, and why it      */
/*   matters — the kind of orientation a clinician already knows and   */
/*   can confirm at a glance. Anything requiring a specific figure is  */
/*   left to the clinician's own references.                          */
/*                                                                    */
/* Each entry: { summary, facts[], review }. `review:true` renders a   */
/* visible "provisional — pending clinician verification" badge. Once  */
/* the founder verifies an entry, set review:false.                   */
/*                                                                    */
/* Keys MUST match the condition `name` exactly. Conditions without an */
/* entry show a neutral "no verified summary yet" state (never         */
/* fabricated on the fly).                                            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CONDITION_INFO = {

  "Anterior Uveitis (Acute)": {
    summary: "Inflammation of the anterior chamber (iris and ciliary body), seen as white cells and protein (flare) in the aqueous. It typically presents with a painful, photophobic, red eye and often a small or sluggish pupil.",
    facts: [
      "Graded clinically by the number of anterior-chamber cells and the density of flare.",
      "May be idiopathic or linked to systemic inflammatory disease; recurrent or bilateral cases warrant a systemic work-up.",
      "Look for keratic precipitates, posterior synechiae, and any raised intraocular pressure."
    ],
    review: true
  },

  "Nuclear Sclerotic Cataract": {
    summary: "Age-related hardening and yellowing of the central (nuclear) part of the lens, causing a gradual, painless blur that is usually worse for distance. It can transiently improve near vision (a 'second sight' myopic shift) before overall vision declines.",
    facts: [
      "Progression is slow and symmetric between eyes is common but not required.",
      "Glare and reduced contrast often bother the patient before acuity falls markedly.",
      "Graded at the slit lamp; management is spectacle update early and cataract surgery when vision limits function."
    ],
    review: true
  },

  "Cortical Cataract": {
    summary: "Opacification of the outer (cortical) lens fibres, classically in radial spoke-like wedges from the periphery inward. Glare — especially against oncoming headlights — is often the dominant complaint.",
    facts: [
      "Symptoms depend heavily on whether the opacities reach the visual axis.",
      "Glare and light scatter can be prominent even when Snellen acuity is preserved.",
      "Often coexists with nuclear change in the ageing lens."
    ],
    review: true
  },

  "Posterior Subcapsular Cataract (PSC)": {
    summary: "Opacity just in front of the posterior lens capsule, sitting right in the visual axis. Because it lies at the nodal point, it disproportionately affects near vision and vision in bright light when the pupil constricts.",
    facts: [
      "Tends to progress faster than nuclear cataract and can appear in younger patients.",
      "Associated with steroid exposure, diabetes, and prior intraocular inflammation.",
      "Near-vision and reading complaints out of proportion to distance acuity are characteristic."
    ],
    review: true
  },

  "Primary Open Angle Glaucoma (POAG)": {
    summary: "A chronic, progressive optic neuropathy with an open drainage angle, causing gradual loss of retinal nerve fibres and corresponding visual-field defects. It is typically painless and asymptomatic until advanced, which is why screening matters.",
    facts: [
      "Diagnosis rests on the optic nerve (cupping, rim thinning, notching) and matching field loss, not on pressure alone.",
      "Raised intraocular pressure is the main modifiable risk factor but is not required for the diagnosis.",
      "Usually bilateral though often asymmetric; peripheral field is affected before central vision."
    ],
    review: true
  },

  "Acute Angle Closure Crisis": {
    summary: "A sudden, large rise in intraocular pressure when the drainage angle closes acutely. It presents with a severely painful red eye, blurred vision with coloured haloes around lights, a mid-dilated non-reactive pupil, and often nausea or vomiting.",
    facts: [
      "A sight-threatening emergency — prompt pressure-lowering and referral are required.",
      "The cornea often looks hazy from oedema; the eye feels hard.",
      "The fellow eye is usually anatomically narrow and at risk."
    ],
    review: true
  },

  "Primary Angle Closure Glaucoma (PACG)": {
    summary: "Glaucomatous optic-nerve damage arising in an eye with an anatomically narrow or closed drainage angle. It may develop insidiously with intermittent or chronic angle closure rather than a single dramatic attack.",
    facts: [
      "Gonioscopy is central to identifying the closed or appositional angle.",
      "Hyperopic and shorter eyes are anatomically predisposed.",
      "Intermittent haloes or brow-ache in dim light can be early clues."
    ],
    review: true
  },

  "Dry Eye Disease - Evaporative (MGD)": {
    summary: "Tear-film instability driven by meibomian gland dysfunction, where a poor lipid layer lets the tears evaporate too quickly. Patients report grittiness, burning, fluctuating vision and, paradoxically, reflex watering.",
    facts: [
      "Lid margins often show capping, telangiectasia or thickened, turbid gland secretions.",
      "Symptoms frequently exceed signs and worsen with screens, wind and low humidity.",
      "Commonly overlaps with anterior blepharitis and ocular rosacea."
    ],
    review: true
  },

  "Dry Eye Disease - Aqueous Deficient": {
    summary: "Insufficient aqueous tear production by the lacrimal glands, reducing tear volume and stability. It causes grittiness, foreign-body sensation and blur that clears momentarily on blinking.",
    facts: [
      "Can be age-related or associated with autoimmune (e.g. Sjögren-type) disease.",
      "Look for reduced tear meniscus and reduced wetting on tear-volume testing.",
      "Surface staining reflects the degree of ocular-surface damage."
    ],
    review: true
  },

  "Blepharitis - Anterior": {
    summary: "Chronic inflammation of the anterior lid margin around the lash bases, often with crusting or collarettes. It causes burning, itching and morning gluey lids and tends to relapse.",
    facts: [
      "Staphylococcal and seborrhoeic patterns are common and may coexist.",
      "Lid hygiene is the mainstay; it is a control-not-cure condition.",
      "Can drive secondary dry eye and marginal corneal changes."
    ],
    review: true
  },

  "Bacterial Conjunctivitis": {
    summary: "Bacterial infection of the conjunctiva producing a red eye with mucopurulent discharge that makes the lids stick together, usually starting in one eye. Vision is typically preserved.",
    facts: [
      "Discharge is characteristically thick and purulent rather than watery.",
      "Usually self-limiting in otherwise healthy adults but contagious.",
      "Contact-lens wearers with a red eye need keratitis excluded before assuming conjunctivitis."
    ],
    review: true
  },

  "Viral Conjunctivitis": {
    summary: "Usually adenoviral infection of the conjunctiva with a red eye, watery discharge, a gritty foreign-body sensation and often a tender pre-auricular node. It frequently follows a recent cold and spreads readily.",
    facts: [
      "Commonly starts in one eye then involves the fellow eye a few days later.",
      "Highly contagious — hand and towel hygiene is central advice.",
      "Follicles on the tarsal conjunctiva are typical; corneal infiltrates can follow."
    ],
    review: true
  },

  "Allergic Conjunctivitis": {
    summary: "A hypersensitivity response of the conjunctiva, with itching as the hallmark symptom, along with redness, watering and lid swelling. It is often seasonal and bilateral.",
    facts: [
      "Itch is the discriminating symptom — its absence argues against allergy.",
      "Papillae on the upper tarsal conjunctiva and stringy mucus are characteristic.",
      "Frequently accompanies rhinitis and other atopic disease."
    ],
    review: true
  },

  "Diabetic Retinopathy": {
    summary: "Microvascular damage to the retina from chronic hyperglycaemia, producing microaneurysms, haemorrhages, exudates and, in advanced disease, new vessels. It is often asymptomatic until vision is threatened by macular oedema or complications of neovascularisation.",
    facts: [
      "Systemic glycaemic and blood-pressure control drives long-term risk.",
      "Macular oedema is the commonest cause of vision loss and can occur at any stage.",
      "New vessels, vitreous haemorrhage or tractional detachment mark sight-threatening disease."
    ],
    review: true
  },

  "Age-related Macular Degeneration (Dry)": {
    summary: "Age-related degeneration of the macula with drusen and changes in the retinal pigment epithelium, causing slowly progressive central blur and difficulty reading. Advanced (geographic) atrophy can cause dense central scotomas.",
    facts: [
      "The most common form of AMD; progression is usually gradual.",
      "Any new distortion or sudden change should prompt assessment for conversion to the wet form.",
      "Home monitoring of central vision helps flag progression."
    ],
    review: true
  },

  "Age-related Macular Degeneration (Wet)": {
    summary: "AMD complicated by choroidal neovascularisation, where abnormal new vessels leak or bleed under the macula. It typically causes fairly sudden central distortion, a central blur or a dark central patch.",
    facts: [
      "Sudden metamorphopsia or central vision change is a red flag needing prompt referral.",
      "Timely treatment aims to preserve remaining central vision.",
      "OCT and retinal imaging confirm fluid or new-vessel activity."
    ],
    review: true
  },

  "Posterior Vitreous Detachment (PVD)": {
    summary: "Age-related separation of the vitreous gel from the retina, commonly experienced as new floaters and brief flashes of light. It is usually benign but shares its early symptoms with a retinal tear.",
    facts: [
      "A sudden shower of floaters, new flashes, or a shadow/curtain warrants urgent dilated examination to exclude a tear or detachment.",
      "A Weiss ring may be visible where the vitreous separated from the disc.",
      "Symptoms typically settle over weeks as the brain adapts."
    ],
    review: true
  },

  "Retinal Tear": {
    summary: "A full-thickness break in the peripheral retina, often at the edge of vitreous traction. It can present with new flashes and floaters and, if fluid passes through the break, can progress to retinal detachment.",
    facts: [
      "Flashes and floaters with a tear are a warning of possible detachment.",
      "Prompt sealing of the break aims to prevent progression to detachment.",
      "Horseshoe (flap) tears carry ongoing traction and higher risk."
    ],
    review: true
  },

  "Retinal Detachment": {
    summary: "Separation of the neurosensory retina from the underlying pigment epithelium. The classic story is flashes and floaters followed by a progressing curtain or shadow across the field, with central vision lost once the macula is involved.",
    facts: [
      "A sight-threatening emergency — urgent referral, especially before the macula detaches.",
      "The visual-field defect corresponds to the opposite quadrant of retina involved.",
      "Rhegmatogenous detachment follows a retinal break; other mechanisms include traction and exudation."
    ],
    review: true
  },

  "Central Retinal Artery Occlusion (CRAO)": {
    summary: "Blockage of the central retinal artery causing sudden, profound, painless loss of vision in one eye. The retina looks pale from ischaemia, often with a cherry-red spot at the fovea.",
    facts: [
      "A retinal-stroke emergency — treat as an acute vascular event and refer immediately.",
      "Investigate the source (carotid, cardiac, and in older patients giant cell arteritis).",
      "An afferent pupillary defect is usually present."
    ],
    review: true
  },

  "Central Retinal Vein Occlusion (CRVO)": {
    summary: "Blockage of the central retinal vein causing variable, usually painless vision loss with widespread retinal haemorrhages, dilated tortuous veins and often disc swelling — the 'blood and thunder' fundus.",
    facts: [
      "Vision loss ranges from mild to severe depending on ischaemia and macular oedema.",
      "Assess for systemic vascular risk factors and raised intraocular pressure.",
      "Watch for later neovascular complications, including neovascular glaucoma."
    ],
    review: true
  },

  "Optic Neuritis": {
    summary: "Inflammation of the optic nerve causing subacute vision loss over hours to days, usually with pain on eye movement, reduced colour vision and an afferent pupillary defect. The disc may look normal (retrobulbar) or swollen.",
    facts: [
      "Colour desaturation and pain on movement are characteristic early features.",
      "Often associated with demyelinating disease and warrants neurological assessment.",
      "Vision commonly recovers substantially over subsequent weeks."
    ],
    review: true
  },

  "Corneal Abrasion": {
    summary: "A defect in the corneal epithelium, usually from trauma, that causes sharp pain, watering, light sensitivity and a foreign-body sensation. It stains with fluorescein.",
    facts: [
      "Always ask about the mechanism, including high-speed particles and contact-lens wear.",
      "Evert the lid to exclude a retained foreign body.",
      "Contact-lens-related defects need infection excluded before patching."
    ],
    review: true
  },

  "Microbial Keratitis": {
    summary: "Infection of the cornea, seen as a painful red eye with a focal white infiltrate or ulcer, often with an epithelial defect and sometimes an anterior-chamber reaction or hypopyon. Contact-lens wear is a major risk factor.",
    facts: [
      "A sight-threatening emergency requiring urgent assessment, often with corneal scraping.",
      "A central or enlarging infiltrate with an overlying epithelial defect is high risk.",
      "Never treat a contact-lens-related red eye as simple conjunctivitis without excluding this."
    ],
    review: true
  },

  "Subconjunctival Hemorrhage": {
    summary: "Blood beneath the conjunctiva from a small ruptured vessel, appearing as a flat, bright-red patch with an otherwise white, comfortable eye and normal vision. It is usually benign and self-limiting.",
    facts: [
      "Vision, pupil and cornea are normal — the eye does not hurt beyond mild awareness.",
      "Ask about anticoagulants, valsalva, and recurrent episodes.",
      "Clears over one to two weeks as the blood reabsorbs, often changing colour."
    ],
    review: true
  },

  "Pterygium": {
    summary: "A wing-shaped fibrovascular growth of conjunctival tissue encroaching onto the cornea, usually nasally, linked to sun and dust exposure. It can cause irritation, redness and, if it reaches the visual axis, induced astigmatism.",
    facts: [
      "Growth across the cornea can distort the surface and blur vision.",
      "UV protection is central to slowing progression.",
      "Distinguish from a pinguecula, which does not cross onto the cornea."
    ],
    review: true
  },

  "Chalazion": {
    summary: "A firm, usually painless lid lump from a blocked and inflamed meibomian gland. It develops over weeks and is a sterile granulomatous reaction rather than an acute infection.",
    facts: [
      "Warm compresses and lid massage help many resolve over weeks.",
      "A recurrent or atypical lid lesion in one spot should raise suspicion of other lid pathology.",
      "Often occurs on a background of meibomian gland dysfunction."
    ],
    review: true
  },

  "Hordeolum (Stye)": {
    summary: "An acute, tender, localised infection of a lid gland or lash follicle producing a red, painful swelling that may point to a head. Unlike a chalazion it is acutely inflamed and sore.",
    facts: [
      "Warm compresses encourage drainage; most settle without antibiotics.",
      "An external stye points at the lash line; an internal one points on the inner lid.",
      "Spreading lid or orbital signs would change the picture and need urgent review."
    ],
    review: true
  },

  "Keratoconus": {
    summary: "Progressive thinning and cone-shaped bulging of the cornea, usually starting in adolescence, causing increasing irregular astigmatism and blur that spectacles correct poorly. Frequent, unstable refractive change is a clue.",
    facts: [
      "Suspect it with steep or asymmetric corneal shape and scissoring on retinoscopy.",
      "Eye rubbing and atopy are associated; corneal topography confirms and monitors it.",
      "Early recognition matters because cross-linking can slow progression."
    ],
    review: true
  },

  "Scleritis": {
    summary: "Inflammation of the sclera causing a deep, boring, often severe ache that can wake the patient, with a bluish-red congestion that does not blanch with topical vasoconstrictors. It is frequently linked to systemic inflammatory disease.",
    facts: [
      "Pain is typically severe and deep, unlike the milder discomfort of episcleritis.",
      "Warrants a systemic work-up and can threaten vision.",
      "Distinguished from episcleritis by depth of vessels and response to vasoconstrictors."
    ],
    review: true
  },

  "Episcleritis": {
    summary: "Inflammation of the superficial episcleral tissue producing a localised or diffuse redness with mild discomfort and a white, comfortable-enough eye overall. It is usually benign and self-limiting.",
    facts: [
      "Discomfort is mild and vision is normal, unlike scleritis.",
      "The redness typically blanches with topical vasoconstrictor.",
      "Often recurrent but not sight-threatening."
    ],
    review: true
  },

  /* ═══ Retina — batch A (Session 10e) ═══ */

  "Diabetic Macular Edema": {
    summary: "Fluid accumulation and thickening at the macula from leaky retinal capillaries in diabetes. It is the commonest cause of vision loss in diabetic eye disease and can occur at any stage of retinopathy, causing gradual central blur or distortion.",
    facts: [
      "Systemic glycaemic and blood-pressure control underpin long-term risk.",
      "OCT is central to detecting and monitoring the fluid.",
      "Can be present with only mild background retinopathy — screening matters even when the fundus looks quiet."
    ],
    review: true
  },

  "Proliferative Diabetic Retinopathy": {
    summary: "Advanced diabetic eye disease in which retinal ischaemia drives new, fragile vessels on the disc or retina. These can bleed into the vitreous or contract to cause tractional detachment — the sight-threatening end of the spectrum.",
    facts: [
      "New vessels, vitreous haemorrhage or tractional detachment mark high-risk disease needing prompt referral.",
      "Often asymptomatic until a bleed or detachment occurs.",
      "Neovascularisation can also involve the iris/angle and lead to neovascular glaucoma."
    ],
    review: true
  },

  "Retinal Artery Macroaneurysm": {
    summary: "A focal, balloon-like dilation of a retinal arteriole, usually in older hypertensive patients. It may be silent, or cause sudden vision loss if it leaks or bleeds at the macula (which can bleed at multiple retinal levels).",
    facts: [
      "Strongly associated with systemic hypertension.",
      "Many are self-limiting once the aneurysm involutes.",
      "Macular haemorrhage or exudate is what threatens central vision."
    ],
    review: true
  },

  "Valsalva Retinopathy": {
    summary: "A pre-retinal (sub-hyaloid or sub-ILM) haemorrhage caused by a sudden rise in intrathoracic/intra-abdominal pressure — coughing, straining, lifting — that ruptures superficial retinal capillaries. It typically causes an abrupt central or paracentral blur or a floater.",
    facts: [
      "Classically a well-demarcated dome of blood at the macula in an otherwise healthy eye.",
      "Usually clears spontaneously over weeks to months with good prognosis.",
      "Ask about a recent Valsalva-type event."
    ],
    review: true
  },

  "Central Serous Chorioretinopathy (Chronic)": {
    summary: "Persistent or recurrent serous detachment of the neurosensory retina at the macula from leakage at the retinal pigment epithelium. The chronic form causes lasting central blur, micropsia, and reduced contrast, often in middle-aged patients.",
    facts: [
      "Associated with corticosteroid exposure and a 'type A' stress pattern — ask about steroids in any form.",
      "Chronic disease can leave RPE atrophy and lasting visual deficit, unlike the usually self-limiting acute form.",
      "OCT shows the subretinal fluid; imaging identifies the leak."
    ],
    review: true
  },

  "Myopic Macular Degeneration": {
    summary: "Degenerative changes at the macula in high (pathological) myopia, from progressive stretching of a long eye — lacquer cracks, chorioretinal atrophy, and the risk of myopic choroidal neovascularisation. It causes gradual central blur, and sudden distortion if CNV develops.",
    facts: [
      "New distortion or a sudden central change suggests myopic CNV and needs prompt referral.",
      "Occurs in highly myopic eyes and can affect relatively young patients.",
      "Also predisposes to macular hole, retinal detachment, and glaucoma."
    ],
    review: true
  },

  "Stargardt Disease": {
    summary: "The commonest inherited macular dystrophy, usually presenting in childhood or young adulthood with progressive central vision loss and difficulty reading. The fundus may show yellow flecks and a macula that looks less affected than the vision suggests.",
    facts: [
      "Colour vision and central acuity decline while peripheral vision is typically preserved.",
      "Vision loss can precede obvious fundus changes early on.",
      "A hereditary condition — family history and genetic counselling are relevant."
    ],
    review: true
  },

  "Best Vitelliform Dystrophy": {
    summary: "An inherited macular dystrophy in which a round, egg-yolk-like (vitelliform) lesion sits at the fovea, later breaking up and potentially reducing central vision. It often has surprisingly good acuity in the early ('previtelliform'/vitelliform) stages.",
    facts: [
      "Autosomal dominant with variable expression; both eyes are usually involved.",
      "Vision may stay good for years, then decline as the lesion degenerates or CNV develops.",
      "The electro-oculogram is characteristically abnormal even when the fundus looks near-normal."
    ],
    review: true
  },

  "Cone Dystrophy": {
    summary: "An inherited degeneration predominantly of the cone photoreceptors, causing reduced central acuity, marked light sensitivity (photophobia/day blindness) and colour-vision loss, usually with a relatively preserved peripheral field.",
    facts: [
      "Photophobia and colour-vision disturbance are prominent, unlike rod-predominant dystrophies.",
      "May be stationary or progressive; some progress to cone-rod dystrophy.",
      "A bull's-eye maculopathy is a classic (but non-specific) sign."
    ],
    review: true
  },

  "Choroideremia": {
    summary: "An X-linked degeneration of the choroid, retinal pigment epithelium and photoreceptors, affecting males and causing childhood night blindness followed by progressive peripheral field loss and, later, central vision decline.",
    facts: [
      "Night blindness is typically the earliest symptom.",
      "The fundus shows progressive scalloped choroidal/RPE atrophy exposing the underlying sclera.",
      "Carrier females may show patchy pigmentary changes but are usually asymptomatic."
    ],
    review: true
  },

  "Degenerative Retinoschisis": {
    summary: "An age-related splitting of the peripheral retina into layers, usually inferotemporal and often bilateral. It is typically asymptomatic and found incidentally, producing a smooth, dome-shaped elevation that does not move like a detachment.",
    facts: [
      "Usually benign and non-progressive — distinguished from retinal detachment, which it can mimic.",
      "An absolute field defect corresponds to the schisis, unlike the relative defect of early detachment.",
      "Occasionally complicated by outer-layer breaks and a secondary detachment."
    ],
    review: true
  },

  "Ocular Ischemic Syndrome": {
    summary: "Chronic ocular hypoperfusion from severe carotid occlusive disease, causing dull ocular or peri-ocular ache and gradual or episodic vision loss. Signs include mid-peripheral retinal haemorrhages, dilated (but not tortuous) veins, and sometimes neovascularisation.",
    facts: [
      "A marker of significant carotid disease — carries systemic stroke/cardiac risk and warrants vascular work-up.",
      "Can be mistaken for a vein occlusion, but the haemorrhages are typically mid-peripheral and the veins dilated without marked tortuosity.",
      "Neovascular glaucoma is a feared complication."
    ],
    review: true
  },

  "Commotio Retinae": {
    summary: "Transient retinal opacification (whitening) after blunt ocular trauma, from disruption of the photoreceptor outer segments — 'Berlin's oedema' when it involves the macula. Vision may be reduced acutely and often recovers as the whitening fades.",
    facts: [
      "Follows blunt trauma — always look for coexisting injury (hyphema, angle recession, retinal breaks, globe rupture).",
      "Macular involvement carries a more guarded visual prognosis than peripheral commotio.",
      "The retinal whitening is not a true haemorrhage and usually resolves over days to weeks."
    ],
    review: true
  }

};

/* Lookup helper — returns the info entry for a condition name, or null. */
function getConditionInfo(name) {
  if (!name || typeof CONDITION_INFO === "undefined") return null;
  return Object.prototype.hasOwnProperty.call(CONDITION_INFO, name) ? CONDITION_INFO[name] : null;
}


/* ═══════════════════════════════════════════════════════════════ */
/* DERIVED PROFILE — content for the ~90% of conditions that have    */
/* no hand-authored summary yet.                                     */
/*                                                                  */
/* This is NOT fabricated: it is a faithful, plain-language          */
/* restatement of the condition's OWN definition already in the      */
/* knowledge base — its domain, ICD code, and the required /         */
/* supportive / contradicting findings the deterministic engine      */
/* already scores on. Because it is generated from the same          */
/* structured fields the engine reads, it is inherently consistent   */
/* with the engine (that is the "connect the info to the engine"     */
/* link at the definition level; the live per-patient link is added  */
/* by the advisory panel from the engine's evidence trail).          */
/*                                                                  */
/* It never invents statistics, thresholds, doses, or citations —    */
/* it only rephrases tokens. `prettify` maps a token to a readable   */
/* label (kbPrettyToken at runtime); falls back to de-underscoring.  */
/* Returns { summary, facts[], derived:true, icdStatus }.            */
/* ═══════════════════════════════════════════════════════════════ */
function buildConditionProfile(cond, prettify) {
  if (!cond) return null;
  var pretty = (typeof prettify === "function") ? prettify : function (t) { return String(t).replace(/_/g, " "); };
  function list(arr, cap) {
    if (!arr || !arr.length) return "";
    var out = [];
    for (var i = 0; i < arr.length && i < (cap || 6); i++) out.push(pretty(arr[i]));
    if (arr.length > (cap || 6)) out.push("…");
    return out.join(", ");
  }

  var domain = cond._domain || cond.route || "";
  /* Vowel-aware article for the word that actually follows it. */
  var firstWord = cond.urgent ? "urgent" : (domain || "condition");
  var article = /^[aeiou]/i.test(firstWord) ? "an" : "a";
  var summary = cond.name + " is " + article + " " +
    (cond.urgent ? "urgent " : "") +
    (domain ? (domain + "-related ") : "") +
    "condition in Entopic's knowledge base." +
    (cond.urgent ? " It carries an urgent flag — treat suspected cases as time-critical." : "");

  var facts = [];
  var reqs = list(cond.req, 6);
  if (reqs) facts.push("Recognised when present: " + reqs + ".");
  var sups = list(cond.sup, 6);
  if (sups) facts.push("Findings that support it: " + sups + ".");
  var cons = list(cond.con, 6);
  if (cons) facts.push("Findings that argue against it: " + cons + ".");
  var tests = list(cond.tests, 4);
  if (tests) facts.push("Helpful to confirm: " + tests + ".");
  if (cond.icd) {
    facts.push("ICD-10: " + cond.icd + (cond.icd_label ? " — " + cond.icd_label : "") + ".");
  }

  return {
    summary: summary,
    facts: facts,
    derived: true,
    icdStatus: cond.icd_status || ""
  };
}

/* Resolve the best available content for a condition: hand-authored rich entry
   if one exists, otherwise a derived profile built from the KB definition.
   `findCond` and `prettify` are injected so this stays dependency-free (the
   browser passes findCondition + kbPrettyToken; tests pass their own).        */
function resolveConditionInfo(name, findCond, prettify) {
  var rich = getConditionInfo(name);
  if (rich) return { kind: "authored", summary: rich.summary, facts: rich.facts || [], review: !!rich.review };
  var cond = (typeof findCond === "function") ? findCond(name) : null;
  var prof = buildConditionProfile(cond, prettify);
  if (prof) return { kind: "derived", summary: prof.summary, facts: prof.facts, icdStatus: prof.icdStatus };
  return null;
}

/* Node/UMD export for tooling & tests (browser ignores this). */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONDITION_INFO: CONDITION_INFO,
    getConditionInfo: getConditionInfo,
    buildConditionProfile: buildConditionProfile,
    resolveConditionInfo: resolveConditionInfo
  };
}
