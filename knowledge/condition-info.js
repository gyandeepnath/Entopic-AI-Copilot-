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
  },

  /* ═══ Retina — batch B (Session 10e) ═══ */

  "Vitreomacular Traction": {
    summary: "Persistent adhesion of the vitreous to the macula that exerts tractional pull on the fovea, distorting its architecture. It causes central distortion, blurred or reduced vision and sometimes micropsia.",
    facts: [
      "OCT is the key test — it shows the attached, tenting vitreous and any resulting foveal distortion or cyst.",
      "Some cases release spontaneously; others progress to macular hole or persistent oedema.",
      "Distinguished from an epiretinal membrane, though the two can coexist."
    ],
    review: true
  },

  "Solar (Photic) Retinopathy": {
    summary: "Photochemical injury to the foveal photoreceptors from staring at the sun (e.g. an eclipse) or other intense light. It causes a small central scotoma, blurred vision or distortion, usually in both eyes, hours after exposure.",
    facts: [
      "History of sun-gazing or intense light exposure is the diagnostic clue.",
      "OCT may show a focal outer-retinal/foveal defect.",
      "Vision often partially recovers, but a small central deficit can persist."
    ],
    review: true
  },

  "Hemiretinal Vein Occlusion": {
    summary: "Occlusion of a vein draining one half (superior or inferior) of the retina, intermediate between a branch and a central vein occlusion. It causes painless loss of the corresponding half-field with haemorrhages confined to that hemiretina.",
    facts: [
      "Assess for systemic vascular risk factors as with other vein occlusions.",
      "Macular oedema is the main driver of central vision loss.",
      "Watch for later neovascular complications if the occlusion is ischaemic."
    ],
    review: true
  },

  "Retinal Vasculitis": {
    summary: "Inflammation of the retinal vessels — arteriolar, venular (periphlebitis) or both — with sheathing, leakage and sometimes occlusion. It may cause floaters, blurred vision or field loss, and can be isolated or part of systemic/infective disease.",
    facts: [
      "Warrants a work-up for systemic inflammatory and infective causes.",
      "Fluorescein angiography demonstrates the leakage/occlusion and its extent.",
      "Ischaemia can drive neovascularisation and vitreous haemorrhage."
    ],
    review: true
  },

  "Retinopathy of Prematurity (Cicatricial)": {
    summary: "The late, scarring phase of retinopathy of prematurity, where abnormal vascular proliferation has regressed leaving fibrous traction, dragging of the macula/disc, and in severe cases tractional retinal detachment. It affects children born prematurely.",
    facts: [
      "A consequence of prior active ROP — birth history (prematurity, low birth weight, oxygen) is central.",
      "Traction can drag the macula and distort vision or cause strabismus/amblyopia.",
      "Lifelong retinal-detachment risk warrants ongoing surveillance."
    ],
    review: true
  },

  "Choroidal Hemangioma": {
    summary: "A benign vascular tumour of the choroid. The circumscribed form is a solitary orange-red mound that can leak and cause overlying serous fluid and blurred/distorted vision; the diffuse form is associated with Sturge-Weber syndrome.",
    facts: [
      "Vision loss comes from secondary serous subretinal fluid at the macula, not the mass itself.",
      "Imaging (ultrasound, OCT, angiography) helps distinguish it from a choroidal melanoma.",
      "Diffuse ('tomato-ketchup' fundus) hemangioma should prompt evaluation for Sturge-Weber."
    ],
    review: true
  },

  "Gyrate Atrophy": {
    summary: "A rare inherited metabolic retinal-choroidal degeneration caused by a deficiency of the enzyme ornithine aminotransferase, with high blood ornithine. It causes progressive night blindness and constricting peripheral field from characteristic scalloped areas of chorioretinal atrophy.",
    facts: [
      "Associated with elevated plasma ornithine — a biochemical clue.",
      "Sharply demarcated, coalescing patches of chorioretinal atrophy are typical.",
      "Dietary arginine restriction is used in management — a metabolic condition, so systemic input matters."
    ],
    review: true
  },

  "Birdshot Chorioretinopathy": {
    summary: "A chronic bilateral posterior uveitis with scattered cream-coloured 'birdshot' choroidal lesions radiating from the disc. It causes floaters, nyctalopia, and difficulty with contrast and colour, often out of proportion to a relatively preserved Snellen acuity.",
    facts: [
      "Strongly associated with HLA-A29 — a useful supportive test.",
      "Vision and field loss can be significant despite good central acuity; monitoring includes fields and ERG.",
      "A chronic condition needing long-term immunomodulatory control."
    ],
    review: true
  },

  "Choroidal Rupture": {
    summary: "A break in the choroid, Bruch's membrane and RPE after blunt ocular trauma, classically a crescent-shaped streak concentric to the disc. Vision depends on whether the rupture or its haemorrhage involves the fovea.",
    facts: [
      "Follows blunt trauma — assess the whole eye for associated injury.",
      "Late choroidal neovascularisation at the rupture site can threaten vision months to years later.",
      "A sub-macular rupture or haemorrhage carries a guarded visual prognosis."
    ],
    review: true
  },

  "Ocular Siderosis (Retained IOFB)": {
    summary: "Progressive iron toxicity to ocular tissues from a retained iron-containing intraocular foreign body. It develops insidiously with iris heterochromia, pupil changes, cataract, and pigmentary retinopathy causing night blindness and field loss.",
    facts: [
      "Always suspect a retained foreign body after a high-velocity injury (hammering metal on metal).",
      "The electroretinogram characteristically declines over time and helps monitor toxicity.",
      "Early foreign-body removal can prevent or limit the retinopathy."
    ],
    review: true
  },

  "Malignant Hypertensive Retinopathy": {
    summary: "The severe end of hypertensive retinopathy from acutely and markedly raised blood pressure, with flame haemorrhages, cotton-wool spots, macular exudate (a 'macular star') and optic-disc swelling. It signals a hypertensive emergency.",
    facts: [
      "Disc swelling with severe hypertension is a medical emergency needing urgent blood-pressure management.",
      "The ocular findings reflect systemic end-organ damage — coordinate with medical care.",
      "Vision can recover as blood pressure is controlled, though some deficit may remain."
    ],
    review: true
  },

  "Purtscher Retinopathy": {
    summary: "A rare occlusive microvasculopathy causing sudden vision loss after severe trauma (classically chest compression), or in Purtscher-like form with pancreatitis, childbirth or renal failure. The fundus shows cotton-wool spots and polygonal retinal whitening (Purtscher flecken) around the disc.",
    facts: [
      "Look for the precipitating systemic event — trauma, pancreatitis, embolic states.",
      "Often bilateral; vision loss can be marked.",
      "Largely a supportive-care diagnosis; recovery is variable."
    ],
    review: true
  },

  "Optic Pit Maculopathy": {
    summary: "A congenital excavation (pit) of the optic disc that can allow fluid to track under the macula, producing a serous maculopathy with central blur and distortion — typically in a young adult with no other cause.",
    facts: [
      "The disc pit itself is congenital and often asymptomatic until maculopathy develops.",
      "OCT shows the schisis-like and subretinal fluid tracking from the pit.",
      "Vision declines when the macula detaches; the fluid source is the pit, not a retinal break."
    ],
    review: true
  },

  /* ═══ Retina — batch C (Session 10f) ═══ */

  "Coats Disease": {
    summary: "A sporadic, usually unilateral retinal vascular anomaly with telangiectatic vessels that leak, producing heavy yellowish (lipid) exudation and, in advanced cases, exudative retinal detachment. It typically presents in young males, sometimes with leukocoria or strabismus.",
    facts: [
      "Leukocoria in a child is a red flag — it must be distinguished from retinoblastoma.",
      "Massive intra- and subretinal lipid exudation is the hallmark.",
      "Early treatment of the leaking vessels aims to prevent exudative detachment."
    ],
    review: true
  },

  "Sickle Cell Retinopathy": {
    summary: "Retinal vascular damage from sickling of red cells causing peripheral capillary occlusion and, in proliferative disease, sea-fan neovascularisation that can bleed or cause tractional detachment. It is often asymptomatic until a vitreous haemorrhage occurs.",
    facts: [
      "Proliferative change is commoner in HbSC and sickle-thalassaemia than in homozygous SS disease.",
      "Peripheral, so central vision is often preserved until a bleed or detachment.",
      "A systemic haemoglobinopathy — coordinate with haematology."
    ],
    review: true
  },

  "Angioid Streaks": {
    summary: "Irregular, reddish-brown crack-like lines radiating from the optic disc, caused by breaks in a brittle, calcified Bruch's membrane. They are often symptomless but predispose to choroidal neovascularisation and to macular bleeding after minor trauma.",
    facts: [
      "Frequently associated with systemic disease — pseudoxanthoma elasticum, Paget's, sickle-cell — so look beyond the eye.",
      "New distortion suggests choroidal neovascularisation needing prompt referral.",
      "The fragile Bruch's membrane means even mild ocular trauma can cause a sight-threatening bleed."
    ],
    review: true
  },

  "Ocular Histoplasmosis Syndrome (POHS)": {
    summary: "A presumed sequela of prior histoplasma exposure, with the triad of punched-out chorioretinal 'histo' scars, peripapillary atrophy, and a quiet vitreous. Vision is threatened when choroidal neovascularisation develops at a macular scar.",
    facts: [
      "The vitreous is characteristically clear — inflammation is not seen, distinguishing it from active uveitis.",
      "Central vision loss comes from macular CNV, which needs prompt treatment.",
      "Associated with residence in histoplasma-endemic regions."
    ],
    review: true
  },

  "Multiple Evanescent White Dot Syndrome (MEWDS)": {
    summary: "An acute, usually unilateral white-dot syndrome in young (often female) patients, with transient grey-white outer-retinal dots and foveal granularity. It causes acute blur, photopsia and an enlarged blind spot, frequently after a viral prodrome.",
    facts: [
      "Typically self-limiting with good visual recovery over weeks.",
      "The dots are evanescent — they fade, so timing of examination matters.",
      "A diagnosis of exclusion among the white-dot syndromes."
    ],
    review: true
  },

  "APMPPE (Acute Posterior Multifocal Placoid Pigment Epitheliopathy)": {
    summary: "An acute, usually bilateral inflammatory condition with multiple flat, cream-coloured placoid lesions at the level of the RPE/outer retina, often after a viral illness. It causes rapid central or paracentral vision loss that commonly recovers.",
    facts: [
      "Usually bilateral (though eyes may be involved sequentially) with a fairly good prognosis.",
      "Rarely associated with cerebral vasculitis — ask about headache/neurological symptoms.",
      "The placoid lesions fade to leave RPE pigmentary changes."
    ],
    review: true
  },

  "Punctate Inner Choroidopathy (PIC)": {
    summary: "A white-dot syndrome of young myopic women, with small punched-out yellow-white inner-choroidal/outer-retinal spots at the posterior pole and a quiet vitreous. It causes blur, scotomata and photopsia, and can be complicated by choroidal neovascularisation.",
    facts: [
      "Occurs typically in young, myopic women with a quiet anterior chamber and vitreous.",
      "CNV is the main threat to central vision and warrants monitoring.",
      "Distinguished from other white-dot syndromes by lesion size, distribution and course."
    ],
    review: true
  },

  "Asteroid Hyalosis": {
    summary: "A benign degenerative change in which calcium-lipid 'asteroid bodies' are suspended throughout the vitreous, seen as numerous bright, spherical opacities that move with eye movement. It is usually unilateral and rarely affects vision.",
    facts: [
      "Often an incidental finding; patients are frequently asymptomatic despite a striking view.",
      "The opacities can obscure the clinician's view of the retina more than they trouble the patient.",
      "Associated with older age and, in some series, diabetes."
    ],
    review: true
  },

  "Vitreous Amyloidosis": {
    summary: "Deposition of amyloid fibrils in the vitreous, classically in hereditary transthyretin amyloidosis, producing 'glass-wool' or veil-like opacities and progressive painless blur that spectacles do not correct.",
    facts: [
      "Can be the presenting feature of systemic hereditary amyloidosis — prompts systemic evaluation.",
      "The opacities are bilateral and progressive, unlike simple floaters.",
      "Vitrectomy can clear vision, though deposits may recur."
    ],
    review: true
  },

  "Familial Exudative Vitreoretinopathy (FEVR)": {
    summary: "An inherited disorder of retinal vascular development in which the peripheral retina fails to vascularise, leading to a spectrum from asymptomatic avascular periphery to traction, exudation and retinal detachment — resembling ROP but without prematurity.",
    facts: [
      "Unlike ROP, it occurs in full-term infants — birth history is normal.",
      "Highly variable within families; examining relatives can reveal mild avascular periphery.",
      "Peripheral traction and detachment are the main threats and may present at any age."
    ],
    review: true
  },

  "Retinoblastoma": {
    summary: "The commonest primary intraocular malignancy of childhood, arising from the developing retina. It most often presents with leukocoria (a white pupillary reflex) or a new squint in a young child, and is life-threatening if not treated.",
    facts: [
      "Leukocoria or new strabismus in a child demands urgent referral — this is a sight- and life-threatening cancer.",
      "Can be unilateral (usually sporadic) or bilateral/hereditary (germline RB1), which carries second-cancer risk.",
      "Management is by a specialist ocular-oncology team; early diagnosis is critical to survival."
    ],
    review: true
  },

  "Acute Retinal Necrosis (ARN)": {
    summary: "A fulminant, usually herpesvirus-driven necrotising retinitis, with peripheral confluent retinal whitening, occlusive arteritis and vitritis. It causes rapidly progressive vision loss and carries a high risk of retinal detachment.",
    facts: [
      "A sight-threatening emergency needing urgent antiviral therapy and specialist care.",
      "Usually caused by VZV or HSV; can occur in immunocompetent patients.",
      "The fellow eye is at risk, so prompt treatment protects both eyes."
    ],
    review: true
  },

  "Cytomegalovirus (CMV) Retinitis": {
    summary: "An opportunistic necrotising retinitis caused by cytomegalovirus, occurring in immunocompromised patients (notably advanced HIV or transplant immunosuppression). It shows granular retinal whitening with haemorrhage ('pizza-pie' fundus) and threatens vision as it spreads.",
    facts: [
      "Its presence signals significant immunosuppression — coordinate systemic evaluation and treatment.",
      "Often painless with few early symptoms until the macula or optic nerve is threatened.",
      "Immune recovery (e.g. starting antiretrovirals) can trigger a secondary uveitis."
    ],
    review: true
  },

  /* ═══ Retina — batch D, completes the domain (Session 10f) ═══ */

  "Chorioretinal Coloboma": {
    summary: "A congenital gap in the retina and choroid from incomplete closure of the embryonic fissure, typically inferonasal, exposing bare sclera. It causes a corresponding field defect and, depending on macular involvement, variable central vision.",
    facts: [
      "Often part of a wider spectrum (iris/lens/disc coloboma) and can be associated with syndromes (e.g. CHARGE).",
      "Retinal detachment can arise from breaks within the coloboma — a lifelong risk.",
      "Vision depends on whether the macula and disc are involved."
    ],
    review: true
  },

  "Ocular Albinism": {
    summary: "A predominantly X-linked disorder of ocular melanin with iris transillumination, foveal hypoplasia and fundus hypopigmentation. It causes reduced acuity, nystagmus and photophobia, with relatively normal skin and hair pigment.",
    facts: [
      "Foveal hypoplasia and nystagmus limit best-corrected acuity from infancy.",
      "Iris transillumination and a blond fundus are characteristic signs.",
      "Distinguished from oculocutaneous albinism, which also affects skin and hair."
    ],
    review: true
  },

  "Achromatopsia": {
    summary: "A congenital, usually complete absence of cone function, causing markedly reduced acuity, absent colour vision, pronounced photophobia (day blindness) and nystagmus from early life. The fundus often looks near-normal.",
    facts: [
      "Colour vision is absent and light sensitivity is severe — tinted lenses often help symptomatically.",
      "A stationary (non-progressive) cone disorder, unlike progressive cone dystrophy.",
      "The ERG shows absent cone responses with preserved rod responses."
    ],
    review: true
  },

  "Terson Syndrome": {
    summary: "Intraocular (vitreous, sub-hyaloid or intraretinal) haemorrhage occurring in association with acute intracranial haemorrhage or a sudden rise in intracranial pressure. It presents with sudden reduced vision or floaters in a patient with a severe headache or reduced consciousness.",
    facts: [
      "A marker of serious intracranial pathology — the systemic emergency takes priority.",
      "Often bilateral; vision usually recovers as the blood clears, sometimes needing vitrectomy.",
      "May be discovered on eye examination of an obtunded patient after subarachnoid haemorrhage."
    ],
    review: true
  },

  "Serpiginous Choroiditis": {
    summary: "A chronic, recurrent inflammation of the choroid and RPE that spreads in a geographic, snake-like pattern outward from the disc. It causes scotomata and central vision loss when the macula is involved, with active grey-white edges and atrophic older areas.",
    facts: [
      "Recurrences extend from the edges of old scars — a characteristic serpiginous progression.",
      "Macular involvement and secondary CNV are the main threats to central vision.",
      "An infective mimic (e.g. tuberculous serpiginous-like choroiditis) should be considered before immunosuppression."
    ],
    review: true
  },

  "Leber Congenital Amaurosis": {
    summary: "A group of severe inherited retinal dystrophies presenting in infancy with profound vision loss, nystagmus, sluggish pupils and the eye-poking (oculodigital) sign. The fundus can look near-normal early despite a severely abnormal ERG.",
    facts: [
      "One of the most severe inherited retinal dystrophies, presenting in the first months of life.",
      "The ERG is severely reduced or extinguished even when the fundus looks unremarkable.",
      "Genetic subtype matters — some forms are now gene-therapy targets, so genetic testing is important."
    ],
    review: true
  },

  "Uveal Effusion Syndrome": {
    summary: "An idiopathic condition, typically in middle-aged hyperopic (nanophthalmic) men, with serous detachment of the choroid, ciliary body and retina from impaired scleral fluid outflow. It causes gradual, sometimes shifting, painless vision loss.",
    facts: [
      "Shifting subretinal fluid and 'leopard-spot' RPE changes are characteristic.",
      "Associated with short, thick-sclera (nanophthalmic) eyes.",
      "A diagnosis of exclusion — rule out inflammatory, hydrostatic and neoplastic causes of effusion first."
    ],
    review: true
  },

  "Choroidal Effusion (Post-operative)": {
    summary: "Serous (or haemorrhagic) accumulation in the suprachoroidal space after intraocular surgery, often related to ocular hypotony. It presents as reduced vision and a smooth, dome-shaped peripheral elevation in the early post-operative period.",
    facts: [
      "Commonly follows a period of low intraocular pressure (over-filtration or a wound leak).",
      "Serous effusions frequently settle as the pressure normalises; large or 'kissing' effusions may need drainage.",
      "A sudden painful haemorrhagic choroidal detachment is a different, more urgent entity."
    ],
    review: true
  },

  "Multifocal Choroiditis & Panuveitis": {
    summary: "A chronic inflammatory white-dot syndrome with multiple choroidal lesions plus anterior-chamber and vitreous inflammation (panuveitis), typically in myopic women. It causes blurred vision, floaters and scotomata, and can be complicated by CNV.",
    facts: [
      "Distinguished from PIC by the presence of anterior-chamber/vitreous inflammation.",
      "Recurrent and often needs long-term immunomodulatory control.",
      "Choroidal neovascularisation is the main threat to central vision."
    ],
    review: true
  },

  "Acute Zonal Occult Outer Retinopathy (AZOOR)": {
    summary: "An uncommon condition, often in young myopic women, in which zones of outer-retinal dysfunction cause acute photopsia and scotomata with a normal-looking fundus early on. The field loss corresponds to the affected outer-retinal zones.",
    facts: [
      "Photopsia with field loss but a near-normal fundus is the classic mismatch — imaging and ERG reveal the outer-retinal loss.",
      "Often begins near the blind spot and enlarges.",
      "Course is variable; some stabilise while others progress."
    ],
    review: true
  },

  "Cancer-Associated Retinopathy (CAR)": {
    summary: "A paraneoplastic retinopathy in which anti-retinal autoantibodies (classically anti-recoverin) cause progressive, usually bilateral photoreceptor loss. It presents with subacute vision loss, photopsia, night blindness and a ring scotoma, sometimes before the cancer is known.",
    facts: [
      "Can be the presenting sign of an occult malignancy (often small-cell lung) — prompts systemic work-up.",
      "The ERG is markedly reduced, reflecting widespread photoreceptor dysfunction.",
      "Distinguished from melanoma-associated retinopathy (MAR), which has a different antibody and ERG pattern."
    ],
    review: true
  },

  "Eales Disease": {
    summary: "An idiopathic occlusive peripheral retinal periphlebitis, typically in young adult men, causing peripheral non-perfusion and neovascularisation. It often presents with sudden floaters or vision loss from a vitreous haemorrhage.",
    facts: [
      "A diagnosis of exclusion — rule out other causes of retinal vasculitis (including tuberculosis, with which it is associated in endemic areas).",
      "Peripheral, so it is often silent until neovascular bleeding occurs.",
      "Management targets the ischaemia and neovascularisation to prevent recurrent haemorrhage."
    ],
    review: true
  },

  "Hypotony Maculopathy": {
    summary: "Macular dysfunction from chronically low intraocular pressure, in which the eye wall and choroid fold and the macula develops chorioretinal striae. It causes blurred, distorted vision and is usually reversible if the pressure is restored.",
    facts: [
      "Common causes are over-filtration after glaucoma surgery, a wound leak, or ciliary-body shutdown.",
      "Chorioretinal folds radiating through the macula are the characteristic sign.",
      "Vision typically improves once the intraocular pressure is normalised, especially if treated early."
    ],
    review: true
  },

  /* ═══ Cornea — batch A (Session 10g) ═══ */

  "Acanthamoeba Keratitis": {
    summary: "A severe, often contact-lens-associated corneal infection by the free-living Acanthamoeba protozoon. It causes disproportionately severe pain, redness and photophobia, sometimes with a ring-shaped stromal infiltrate and perineural inflammation.",
    facts: [
      "Pain out of proportion to signs in a contact-lens wearer is a classic warning.",
      "Strongly linked to water exposure in lenses (showering, swimming, tap-water rinsing).",
      "A sight-threatening emergency — often misdiagnosed early as herpetic keratitis, delaying treatment."
    ],
    review: true
  },

  "Fungal Keratitis": {
    summary: "A corneal infection by filamentary fungi or yeasts, classically after vegetative/organic trauma or in contact-lens wearers. It causes a grey-white infiltrate with feathery margins, satellite lesions and sometimes a hypopyon, often with a more indolent course than bacterial keratitis.",
    facts: [
      "Ask about organic trauma (a branch, plant matter) or agricultural work.",
      "Feathery-edged infiltrate and satellite lesions are suggestive; corneal scraping/culture guides treatment.",
      "A sight-threatening infection that can be slow to respond and may need prolonged therapy."
    ],
    review: true
  },

  "Filamentary Keratitis": {
    summary: "A surface disorder in which strands of mucus and degenerated epithelium (filaments) adhere to the cornea, causing a sharp foreign-body sensation, pain on blinking and photophobia. It is a sign of an underlying problem, most often severe dry eye.",
    facts: [
      "Nearly always secondary — look for the driver (dry eye, superior limbic keratoconjunctivitis, prolonged patching).",
      "The filaments stain and tug painfully with each blink.",
      "Removing filaments relieves symptoms, but treating the underlying cause prevents recurrence."
    ],
    review: true
  },

  "Map-Dot-Fingerprint Dystrophy": {
    summary: "The commonest anterior corneal dystrophy (epithelial basement membrane dystrophy), with map-like, dot and fingerprint patterns in the epithelium. It is often asymptomatic but can cause recurrent corneal erosions and intermittent blur.",
    facts: [
      "A frequent cause of recurrent erosion syndrome — painful episodes, often on waking.",
      "Usually bilateral, though the patterns can be subtle and shift over time.",
      "Vision fluctuates when the irregular epithelium involves the visual axis."
    ],
    review: true
  },

  "Lattice Corneal Dystrophy": {
    summary: "An inherited stromal dystrophy in which amyloid deposits form branching, lattice-like refractile lines in the cornea. It progressively reduces vision and can cause recurrent erosions, typically becoming symptomatic in the first decades of life.",
    facts: [
      "Bilateral and progressive; the lattice lines are amyloid.",
      "Recurrent erosions are common and painful.",
      "Can recur in a corneal graft, which is relevant when planning surgery."
    ],
    review: true
  },

  "Granular Corneal Dystrophy": {
    summary: "An inherited stromal dystrophy with discrete white granular (hyaline) deposits in a clear intervening stroma. Vision declines slowly as deposits accumulate; recurrent erosions can occur but are less prominent than in lattice dystrophy.",
    facts: [
      "Bilateral, symmetric, and slowly progressive.",
      "Clear stroma between the deposits is characteristic early on.",
      "Like other stromal dystrophies, it can recur after corneal grafting."
    ],
    review: true
  },

  "Terrien Marginal Degeneration": {
    summary: "A slowly progressive, usually painless thinning of the peripheral cornea, often superior, with lipid deposition at the leading edge and intact overlying epithelium. It induces marked astigmatism and, rarely, perforation after minor trauma.",
    facts: [
      "Progressive against-the-rule or oblique astigmatism is the main visual effect.",
      "The epithelium stays intact, distinguishing it from an ulcerative marginal process.",
      "The thinned cornea is vulnerable to perforation from minor trauma."
    ],
    review: true
  },

  "Superior Limbic Keratoconjunctivitis": {
    summary: "A chronic, recurrent inflammation of the superior bulbar conjunctiva and upper limbus, with fine papillae, superior corneal filaments and injection. It causes foreign-body sensation, burning and photophobia, often bilaterally.",
    facts: [
      "Redness and staining are concentrated superiorly — lift the upper lid to see it.",
      "Associated with thyroid dysfunction and dry eye — worth screening.",
      "A relapsing course; treatment targets the mechanical/tear-film contribution."
    ],
    review: true
  },

  "Contact Lens Corneal Warpage": {
    summary: "Reversible distortion of corneal shape from long-term (often rigid) contact-lens wear, causing blurred or fluctuating vision and unstable refraction/keratometry. It can mimic early keratoconus on topography.",
    facts: [
      "Suspect it with unstable topography and spectacle blur in a long-term lens wearer.",
      "Ceasing lens wear allows the cornea to recover over weeks — a key distinction from keratoconus.",
      "Important to exclude before diagnosing ectasia or planning refractive surgery."
    ],
    review: true
  },

  "Corneal Foreign Body (Metallic)": {
    summary: "A metallic particle embedded in the cornea, typically from grinding or hammering, causing sharp pain, watering and photophobia. Iron-containing particles leave a rust ring in the surrounding stroma.",
    facts: [
      "Ask about high-velocity metal-on-metal work and always consider an intraocular foreign body.",
      "A rust ring often remains after removing the particle and may need separate removal.",
      "Evert the lid and check for additional particles; update tetanus status as appropriate."
    ],
    review: true
  },

  "Vortex Keratopathy (Drug-Induced)": {
    summary: "A whorl-like pattern of fine golden-brown deposits in the corneal epithelium (cornea verticillata), most often from certain systemic medications. It is usually asymptomatic and rarely affects vision.",
    facts: [
      "Commonly caused by drugs such as amiodarone and some antimalarials — review the medication list.",
      "The whorl pattern sweeps from a point below the pupil, a characteristic appearance.",
      "Usually reversible on stopping the drug and rarely a reason to change essential therapy by itself."
    ],
    review: true
  },

  "Iron Line (Corneal)": {
    summary: "A linear deposition of iron in the corneal epithelium at sites of surface irregularity or tear pooling (e.g. Hudson-Stähli line, Fleischer ring in keratoconus, Stocker line at a pterygium). It is usually an incidental, harmless finding.",
    facts: [
      "The location is a clue — a Fleischer ring around a cone suggests keratoconus.",
      "Typically asymptomatic and does not itself require treatment.",
      "Marks chronic surface topography changes rather than active disease."
    ],
    review: true
  },

  "Limbal Stem Cell Deficiency": {
    summary: "Loss or dysfunction of the limbal stem cells that renew the corneal epithelium, allowing conjunctival tissue to encroach onto the cornea. It causes chronic irritation, recurrent epithelial breakdown, vascularisation and progressive vision loss.",
    facts: [
      "Suspect it with a persistent epithelial defect, conjunctivalisation and superficial vascularisation.",
      "Causes include chemical burns, aniridia, contact-lens overwear and Stevens-Johnson syndrome.",
      "Management is complex and may require limbal stem-cell grafting — specialist referral is appropriate."
    ],
    review: true
  },

  /* ═══ Cornea — batch B (Session 10g) ═══ */

  "Chemical Eye Burn": {
    summary: "Ocular-surface injury from a chemical splash. Alkalis penetrate deeply and are the most dangerous; acids tend to be more superficial. Severity ranges from mild epithelial loss to limbal ischaemia and corneal opacification.",
    facts: [
      "A true emergency — copious immediate irrigation until the pH normalises takes priority over everything else, including detailed history.",
      "Limbal (perilimbal) blanching signals ischaemia and a worse prognosis.",
      "Alkali burns are typically worse than acid because they keep penetrating."
    ],
    review: true
  },

  "Open Globe Injury": {
    summary: "A full-thickness wound of the eye wall (cornea and/or sclera) from penetrating or blunt trauma. It presents with reduced vision, a peaked or irregular pupil, a shallow chamber, or extruded intraocular contents.",
    facts: [
      "A surgical emergency — shield the eye (do not pad or press), give nothing by mouth, and refer urgently.",
      "Avoid any pressure on the globe and defer tonometry and manipulation.",
      "Always consider a retained intraocular foreign body and update tetanus cover."
    ],
    review: true
  },

  "Intraocular Foreign Body": {
    summary: "A foreign body that has penetrated into the eye, most often a high-velocity metal fragment. It may cause surprisingly little pain, so a high index of suspicion after hammering or grinding is essential.",
    facts: [
      "A penetrating-injury emergency — imaging (CT; avoid MRI if metallic) localises the fragment.",
      "Retained iron or copper causes long-term toxicity (siderosis/chalcosis) if not removed.",
      "Entry wounds can be tiny and self-sealing, so the history drives the suspicion."
    ],
    review: true
  },

  "Corneal Laceration": {
    summary: "A cut in the cornea, which may be partial-thickness (the globe stays sealed) or full-thickness (an open globe). It causes pain, watering and reduced vision, sometimes with a distorted pupil or shallow chamber if full-thickness.",
    facts: [
      "Assess whether the globe is open — a positive Seidel test (aqueous leak) means an open globe and surgical emergency.",
      "Shield rather than pad, and avoid pressure, until an open globe is excluded.",
      "Look for an associated foreign body and check tetanus status."
    ],
    review: true
  },

  "Mooren Ulcer": {
    summary: "A painful, idiopathic, progressive peripheral ulcerative keratitis that spreads circumferentially and centrally with an overhanging leading edge. It is a diagnosis of exclusion once systemic and infective causes are ruled out.",
    facts: [
      "Severe pain and relentless peripheral thinning are characteristic; it can perforate.",
      "By definition there is no associated systemic disease — that must be excluded first.",
      "Often needs aggressive immunosuppression; a sight-threatening condition."
    ],
    review: true
  },

  "Peripheral Ulcerative Keratitis": {
    summary: "Inflammatory thinning and ulceration of the peripheral cornea, frequently a marker of systemic autoimmune disease (e.g. rheumatoid arthritis, granulomatosis with polyangiitis). It causes a painful red eye with a crescentic peripheral infiltrate and thinning.",
    facts: [
      "Often the eye's warning of active, potentially life-threatening systemic vasculitis — prompt systemic work-up matters.",
      "The thinned cornea can perforate, so it is sight-threatening.",
      "Management usually requires systemic immunosuppression alongside ocular care."
    ],
    review: true
  },

  "Vernal Shield Ulcer": {
    summary: "A sterile, sharply defined epithelial ulcer of the upper cornea that complicates vernal keratoconjunctivitis, caused by inflammatory mediators and mechanical trauma from giant tarsal papillae. It causes pain, photophobia and blurred vision in a young atopic patient.",
    facts: [
      "Occurs on a background of severe vernal keratoconjunctivitis with giant upper-tarsal papillae.",
      "The ulcer is sterile — but secondary infection must be excluded.",
      "A plaque of deposited mucus/fibrin can delay healing and may need removal."
    ],
    review: true
  },

  "Contact Lens Acute Red Eye (CLARE)": {
    summary: "An acute, sterile inflammatory reaction to contact-lens wear (often overnight wear), producing a sudden painful red eye with peripheral corneal infiltrates but an intact epithelium. It typically settles quickly once lenses are stopped.",
    facts: [
      "A diagnosis of exclusion — microbial keratitis must be ruled out before assuming it is sterile.",
      "Classically wakes the patient with a unilateral red, watering eye after sleeping in lenses.",
      "Infiltrates are usually peripheral with no overlying epithelial defect."
    ],
    review: true
  },

  "Corneal Graft Rejection": {
    summary: "An immune attack on a corneal transplant, presenting with the warning symptoms of redness, photophobia, reduced vision and discomfort in a previously clear graft. Signs include an endothelial rejection line, keratic precipitates and graft oedema.",
    facts: [
      "A graft emergency — prompt intensive steroid treatment can reverse rejection if caught early.",
      "Educate transplant patients on the 'RSVP' warning symptoms (Redness, Sensitivity, Vision, Pain) to present early.",
      "Untreated rejection can progress to irreversible graft failure."
    ],
    review: true
  },

  "Corneal Dermoid": {
    summary: "A congenital choristoma — normal tissue (skin, hair, fat) in an abnormal location — usually straddling the inferotemporal limbus. It appears as a rounded, sometimes hair-bearing white lesion and can induce astigmatism and amblyopia in childhood.",
    facts: [
      "Often part of the Goldenhar (oculo-auriculo-vertebral) spectrum — check for ear/facial anomalies.",
      "Induced astigmatism can cause amblyopia, so refraction and amblyopia management matter.",
      "Excision is considered for visual or cosmetic reasons, weighing the depth of the lesion."
    ],
    review: true
  },

  "Descemetocele": {
    summary: "A herniation of Descemet's membrane through a severely thinned or melting cornea, meaning perforation is imminent. It appears as a clear, blister-like protrusion at the base of a deep ulcer or thinned area.",
    facts: [
      "An emergency — the eye is one small step from perforating.",
      "Avoid any pressure on the globe and refer urgently for protective/surgical measures.",
      "Signals severe underlying corneal disease (infection, melt, exposure) that also needs treating."
    ],
    review: true
  },

  "Peters Anomaly": {
    summary: "A congenital anterior-segment dysgenesis with a central corneal opacity (leukoma) and a defect in the posterior cornea, sometimes with iris or lens adhesions. It presents at birth with a white central cornea and can be associated with glaucoma.",
    facts: [
      "A cause of congenital corneal opacity/leukocoria — needs prompt paediatric ophthalmology assessment.",
      "Frequently associated with glaucoma, which must be sought and managed.",
      "May be unilateral or bilateral and can be part of a systemic (Peters-plus) syndrome."
    ],
    review: true
  },

  "Corneal Hydrops (Acute)": {
    summary: "A sudden break in Descemet's membrane, usually in advanced keratoconus or another ectasia, allowing aqueous to flood the stroma and cause abrupt corneal oedema. It presents with sudden pain, marked blur and a white, swollen cornea.",
    facts: [
      "Typically occurs in known keratoconus/ectasia, sometimes after vigorous eye rubbing.",
      "Most cases resolve over weeks to months as the break heals, often leaving some scarring.",
      "Distinguished from infection by the abrupt onset of diffuse oedema without an infiltrate."
    ],
    review: true
  },

  /* ═══ Cornea — batch C, completes the domain (Session 10g) ═══ */

  "Posterior Polymorphous Corneal Dystrophy": {
    summary: "An inherited dystrophy of the corneal endothelium and Descemet's membrane, with vesicular, band or geographic lesions. It is often asymptomatic and found incidentally, but can occasionally cause corneal oedema or be associated with glaucoma.",
    facts: [
      "Usually bilateral and frequently symptomless — many cases never need treatment.",
      "Can be associated with iridocorneal adhesions and raised intraocular pressure — check for glaucoma.",
      "Distinguished from other endothelial dystrophies by its characteristic vesicular/band appearance."
    ],
    review: true
  },

  "Schnyder Corneal Dystrophy": {
    summary: "A rare inherited stromal dystrophy with abnormal deposition of cholesterol and lipids in the cornea, producing central crystalline haze, a dense arcus and stromal clouding. It causes glare and slowly progressive blur.",
    facts: [
      "Associated with systemic dyslipidaemia — a lipid profile and cardiovascular-risk review are worthwhile.",
      "Only about half of cases show the obvious corneal crystals; a dense arcus at a young age is a clue.",
      "Glare and reduced contrast often trouble the patient more than Snellen acuity."
    ],
    review: true
  },

  "Meesmann Corneal Dystrophy": {
    summary: "An inherited epithelial dystrophy presenting in early childhood with myriad tiny clear intraepithelial cysts. It is often mild, causing intermittent irritation, mild glare and occasional recurrent erosions.",
    facts: [
      "Bilateral and lifelong, but frequently only mildly symptomatic.",
      "The countless small epithelial microcysts are best seen in retroillumination.",
      "Vision is usually well preserved; management is largely of surface symptoms."
    ],
    review: true
  },

  "Macular Corneal Dystrophy": {
    summary: "The rarest but most severe of the classic stromal dystrophies, with cloudy grey-white deposits and diffuse haze extending between them right to the periphery. It causes progressive vision loss, often significant by early adulthood.",
    facts: [
      "Unlike granular/lattice dystrophy, the stroma between deposits is also cloudy — and the opacity reaches the periphery.",
      "Autosomal recessive and associated with abnormal keratan sulphate metabolism.",
      "Frequently progresses to needing corneal transplantation."
    ],
    review: true
  },

  "Congenital Hereditary Endothelial Dystrophy (CHED)": {
    summary: "An inherited failure of the corneal endothelium present from birth, causing a diffusely cloudy, oedematous cornea in both eyes. It presents in infancy with bilateral corneal haze and, depending on severity, reduced vision and nystagmus.",
    facts: [
      "A cause of bilateral congenital corneal opacity — needs paediatric ophthalmology assessment.",
      "The cornea can be markedly thickened and hazy without the pain of childhood glaucoma (which must be excluded).",
      "Severe cases may require corneal transplantation to allow visual development."
    ],
    review: true
  },

  "Corneal Dellen": {
    summary: "A shallow, saucer-like area of corneal thinning caused by localised drying next to an adjacent surface elevation (such as a swollen conjunctiva, filtering bleb or limbal mass) that disrupts the tear film. It causes mild irritation and stains faintly.",
    facts: [
      "A secondary, mechanical problem — find and address the adjacent elevation that is drying the cornea.",
      "The stroma is thinned but the epithelium is usually intact; it is not an infection.",
      "Rehydration and lubrication typically resolve it quickly once the cause is managed."
    ],
    review: true
  },

  "Gelatinous Drop-like Corneal Dystrophy": {
    summary: "A rare inherited dystrophy with subepithelial amyloid deposits that form mulberry-like gelatinous nodules on the cornea. It causes progressive photophobia, watering, foreign-body sensation and declining vision from a young age.",
    facts: [
      "Autosomal recessive and commoner in some East-Asian populations.",
      "The amyloid deposits recur readily, including on the surface of a corneal graft.",
      "Prominent surface symptoms (photophobia, watering) reflect the raised, irregular deposits."
    ],
    review: true
  },

  "Spheroidal Degeneration (Climatic Droplet Keratopathy)": {
    summary: "An age- and exposure-related degeneration in which golden-yellow spherules accumulate in the superficial peripheral cornea (and conjunctiva), linked to chronic ultraviolet and environmental exposure. It is often asymptomatic but can reduce vision if it reaches the visual axis.",
    facts: [
      "Associated with outdoor life and cumulative UV/wind/dust exposure — hence 'climatic droplet keratopathy'.",
      "Usually bilateral, starting peripherally in the interpalpebral zone.",
      "Only reduces vision when the deposits encroach centrally; UV protection is sensible advice."
    ],
    review: true
  },

  /* ═══ Neuro-Ophthalmic — batch A (Session 10h) ═══ */

  "Giant Cell Arteritis (Arteritic AION)": {
    summary: "Ischaemic damage to the optic nerve head from inflammation of the posterior ciliary arteries in giant cell (temporal) arteritis. It causes sudden, often severe, painless vision loss in an older patient, frequently with headache, scalp tenderness, jaw claudication and malaise.",
    facts: [
      "A sight- and life-threatening emergency — start high-dose corticosteroids immediately on suspicion, before temporal-artery biopsy.",
      "The fellow eye is at high risk within days if untreated.",
      "Inflammatory markers (ESR/CRP) are usually markedly raised and support urgent treatment."
    ],
    review: true
  },

  "Idiopathic Intracranial Hypertension": {
    summary: "Raised intracranial pressure without a mass or hydrocephalus, typically in young overweight women. It causes headache, transient visual obscurations, pulsatile tinnitus and bilateral disc swelling (papilloedema), with the threat of permanent field loss.",
    facts: [
      "Papilloedema with progressive field loss is the sight-threatening element — fields must be monitored.",
      "A diagnosis of exclusion — neuroimaging (with venography) and a lumbar puncture with high opening pressure are needed to rule out other causes.",
      "Weight loss and pressure-lowering treatment protect vision; a rapidly worsening field is an emergency."
    ],
    review: true
  },

  "Pituitary Adenoma (Chiasmal Compression)": {
    summary: "A benign pituitary tumour that, as it grows upward, compresses the optic chiasm and produces a classically bitemporal (peripheral) field defect. Central acuity is often preserved until late, so the field loss can be insidious.",
    facts: [
      "A bitemporal hemianopia respecting the vertical midline points to the chiasm — image the pituitary.",
      "May present with endocrine features (or apoplexy — a sudden, painful, sight-threatening event).",
      "Field loss often recovers after decompression, especially if treated early."
    ],
    review: true
  },

  "Ocular Myasthenia Gravis": {
    summary: "An autoimmune disorder of the neuromuscular junction, presenting in the eye with variable, fatigable ptosis and diplopia that worsen through the day and with sustained effort. Pupils are spared.",
    facts: [
      "Fatigability and diurnal variation are the hallmarks — symptoms worsen with use and improve with rest.",
      "Pupil involvement argues against myasthenia and points elsewhere.",
      "Can generalise to bulbar/respiratory muscles, so a positive diagnosis warrants neurology involvement."
    ],
    review: true
  },

  "Nutritional / Toxic Optic Neuropathy": {
    summary: "Bilateral, symmetric optic-nerve dysfunction from a nutritional deficiency (e.g. B12/folate) or a toxin (e.g. tobacco-alcohol, methanol, certain drugs). It causes gradual, painless, symmetric central vision loss with reduced colour vision and central/caecocentral scotomas.",
    facts: [
      "Symmetry and central colour-vision loss distinguish it from most compressive/inflammatory causes.",
      "Identifying and removing the toxin or replacing the deficiency can halt or reverse it — history is everything.",
      "Methanol poisoning is an emergency and a very different, acute picture."
    ],
    review: true
  },

  "Leber Hereditary Optic Neuropathy": {
    summary: "A mitochondrially-inherited optic neuropathy, typically in young men, causing subacute, painless, sequential loss of central vision in both eyes over weeks to months. The disc may look hyperaemic with peripapillary telangiectasia acutely, then pale.",
    facts: [
      "Maternal (mitochondrial) inheritance — family history on the mother's side is a key clue.",
      "The second eye is usually affected within weeks to months of the first.",
      "Genetic confirmation matters for counselling and emerging therapies."
    ],
    review: true
  },

  "Idiopathic Orbital Inflammation (Pseudotumor)": {
    summary: "A non-infective, non-neoplastic inflammatory process of the orbit that presents acutely with painful proptosis, lid swelling, redness and restricted, painful eye movements. It is a diagnosis of exclusion.",
    facts: [
      "Painful ophthalmoplegia with proptosis warrants urgent imaging and exclusion of infection and tumour.",
      "Often responds dramatically to corticosteroids, which supports the diagnosis.",
      "Can involve specific structures (myositis, dacryoadenitis) or the orbital apex, where vision is threatened."
    ],
    review: true
  },

  "Adie Tonic Pupil": {
    summary: "A benign disorder of the parasympathetic supply to the iris, giving a dilated pupil that reacts poorly to light but slowly (tonically) to near, with sector palsy and light-near dissociation. It is often noticed as anisocoria or difficulty focusing.",
    facts: [
      "Light-near dissociation with slow, tonic near response is characteristic.",
      "The pupil is hypersensitive to dilute pilocarpine, which constricts it — a useful confirmatory test.",
      "Usually benign; combined with absent deep-tendon reflexes it is called Holmes-Adie syndrome."
    ],
    review: true
  },

  "Downbeat Nystagmus": {
    summary: "A form of nystagmus with the fast phase beating downward, present in primary gaze and often worse on lateral and down gaze. It causes oscillopsia and blurred vision and usually localises to the cranio-cervical junction or cerebellum.",
    facts: [
      "Its presence points to structural pathology at the cranio-cervical junction (e.g. Chiari) or the cerebellum — image accordingly.",
      "Can also be caused by drugs (e.g. lithium, anticonvulsants) and some metabolic states.",
      "Oscillopsia (the world appearing to move) is often the main complaint."
    ],
    review: true
  },

  "Skew Deviation": {
    summary: "A vertical misalignment of the eyes from disturbed prenuclear (otolithic) input, typically due to a brainstem or cerebellar lesion. It causes vertical double vision and is part of the ocular tilt reaction (head tilt, eye torsion, skew).",
    facts: [
      "A vertical strabismus that does not fit a single cranial-nerve palsy should raise suspicion of a central cause.",
      "Often accompanies other posterior-fossa signs — image the brainstem/cerebellum.",
      "Distinguishing it from a fourth-nerve palsy can be subtle (upright-supine testing helps)."
    ],
    review: true
  },

  "Chronic Progressive External Ophthalmoplegia": {
    summary: "A mitochondrial disorder causing slowly progressive, symmetric limitation of eye movements with bilateral ptosis. Because it progresses symmetrically and slowly, patients often have little diplopia despite marked restriction.",
    facts: [
      "Symmetric, slowly progressive ophthalmoplegia with ptosis and little diplopia is characteristic.",
      "Part of a mitochondrial spectrum — consider Kearns-Sayre syndrome (retinopathy, cardiac conduction block) and screen the heart.",
      "Ptosis surgery is undertaken cautiously given reduced eye movement and Bell's phenomenon."
    ],
    review: true
  },

  "Convergence-Retraction Nystagmus (Dorsal Midbrain)": {
    summary: "A disorder of the dorsal midbrain (Parinaud syndrome) in which attempted upgaze triggers co-contraction of the extraocular muscles, producing convergence and globe-retraction movements, along with upgaze palsy and light-near dissociation.",
    facts: [
      "Localises to the dorsal midbrain — image the midbrain and pineal region (e.g. tumour, hydrocephalus).",
      "Best elicited with an upward-moving optokinetic target.",
      "Accompanied by the other Parinaud features: upgaze palsy, lid retraction and light-near dissociation."
    ],
    review: true
  },

  "Hemianopic Field Loss (Occipital Stroke)": {
    summary: "Loss of the same half of the visual field in both eyes (homonymous hemianopia) from damage to the retrochiasmal pathway, most often an occipital-lobe stroke. Central acuity is preserved, and macular sparing may occur.",
    facts: [
      "A congruous homonymous hemianopia respecting the vertical midline localises behind the chiasm.",
      "An isolated hemianopia from an occipital stroke can occur with otherwise normal examination — treat as an acute stroke.",
      "Patients often bump into things on the affected side; formal fields confirm and map it."
    ],
    review: true
  },

  /* ═══ Neuro-Ophthalmic — batch B (Session 10h) ═══ */

  "Orbital Blowout Fracture": {
    summary: "A fracture of the thin orbital floor (or medial wall) from blunt trauma, which can trap the inferior rectus and orbital tissue. It causes vertical double vision, restricted upgaze, cheek numbness (infraorbital) and later enophthalmos.",
    facts: [
      "Vertical diplopia with limited upgaze after a blunt injury suggests muscle entrapment.",
      "In children a 'trapdoor' fracture with entrapment can look deceptively normal but is a surgical urgency (with a marked oculo-cardiac reflex).",
      "Always examine the whole eye for associated globe injury and infraorbital numbness."
    ],
    review: true
  },

  "Traumatic Optic Neuropathy": {
    summary: "Damage to the optic nerve from head or orbital trauma, typically indirect force transmitted to the canalicular nerve. It causes sudden vision loss with a relative afferent pupillary defect, often with an initially normal-looking disc.",
    facts: [
      "A relative afferent pupillary defect after trauma is the crucial sign — the disc may look normal at first.",
      "Vision loss may be immediate or progressive; imaging assesses the canal and excludes a compressive haematoma.",
      "Occurs in the context of significant trauma, so manage the whole injured patient."
    ],
    review: true
  },

  "Traumatic Mydriasis": {
    summary: "A dilated, poorly reactive pupil after blunt ocular trauma from tearing of the iris sphincter. It causes glare and difficulty focusing, and the pupil may be irregular with visible sphincter tears.",
    facts: [
      "A history of blunt trauma and an irregular pupil margin distinguish it from a neurological cause.",
      "Often accompanies other blunt-injury findings (hyphema, angle recession, commotio) — examine thoroughly.",
      "The dilation may be permanent if the sphincter is significantly torn."
    ],
    review: true
  },

  "Giant Cell Arteritis (Occult / Systemic)": {
    summary: "Giant cell arteritis presenting with systemic features (headache, jaw claudication, scalp tenderness, polymyalgia, weight loss, fever) with or without overt visual loss. Even without current visual symptoms, the eye is at imminent risk.",
    facts: [
      "A medical emergency in the over-50s — raised ESR/CRP and typical symptoms justify starting steroids immediately.",
      "Vision can be lost suddenly and irreversibly, and the fellow eye follows quickly if untreated.",
      "Temporal-artery biopsy confirms but must not delay treatment."
    ],
    review: true
  },

  "Acquired Pendular Nystagmus": {
    summary: "A nystagmus with smooth, to-and-fro (pendular) oscillations of roughly equal speed in each direction, acquired later in life. It causes troublesome oscillopsia and blurred vision and usually reflects brainstem/cerebellar or demyelinating disease.",
    facts: [
      "Acquired (as opposed to congenital) pendular nystagmus warrants neuroimaging for a central cause.",
      "Commonly associated with demyelination and with the syndrome of oculopalatal tremor.",
      "Oscillopsia is the dominant, disabling symptom."
    ],
    review: true
  },

  "Spasmus Nutans": {
    summary: "A benign triad of infancy — fine, rapid, often asymmetric nystagmus, head nodding and a head turn/tilt — that typically appears in the first year and resolves in early childhood. It is usually harmless but can be mimicked by serious pathology.",
    facts: [
      "A monocular or very asymmetric infantile nystagmus must be imaged to exclude a chiasmal/optic-pathway glioma.",
      "The characteristic head nodding and turn accompany the nystagmus.",
      "Genuine spasmus nutans is self-limiting, resolving over months to a few years."
    ],
    review: true
  },

  "Superior Oblique Myokymia": {
    summary: "A benign disorder in which spontaneous, brief bursts of contraction of the superior oblique muscle cause monocular, torsional/vertical micro-oscillations. Patients describe intermittent shimmering, tremulous vision or transient double vision in one eye.",
    facts: [
      "The oscillopsia is monocular and torsional — a distinctive symptom.",
      "Episodes are brief and intermittent; the eye looks normal between them.",
      "Usually benign, though a subset are attributed to neurovascular contact of the fourth nerve."
    ],
    review: true
  },

  "Carotid-Cavernous Fistula": {
    summary: "An abnormal communication between the carotid arterial system and the cavernous sinus, raising venous pressure in the orbit. It causes a red eye with dilated, tortuous 'corkscrew' episcleral vessels, proptosis, a bruit, raised intraocular pressure and sometimes diplopia.",
    facts: [
      "Dilated corkscrew conjunctival/episcleral vessels with raised IOP and proptosis are the classic triad — think of it in an unexplained chronic red eye.",
      "High-flow (direct) fistulae often follow trauma; low-flow (dural) ones arise spontaneously in older patients.",
      "Vision can be threatened by raised pressure or venous congestion, so it needs neuro-vascular assessment."
    ],
    review: true
  },

  "Neuroretinitis": {
    summary: "Inflammation involving the optic disc and the peripapillary retina, producing disc swelling with a fan/star of hard exudate at the macula. It causes subacute painless central vision loss, often after a viral illness or an animal (cat) contact.",
    facts: [
      "The macular star may appear a week or two after the disc swelling — timing matters for recognition.",
      "Cat-scratch disease (Bartonella) is a classic cause worth asking about.",
      "Usually has a good visual prognosis and, unlike typical optic neuritis, is not itself a strong MS marker."
    ],
    review: true
  },

  "Papillophlebitis": {
    summary: "A benign optic-disc vasculitis of young, otherwise healthy adults — essentially a mild, non-ischaemic central retinal venous congestion. It causes mild blur or an enlarged blind spot with disc swelling and dilated veins, and usually resolves with good vision.",
    facts: [
      "A diagnosis of exclusion in a young patient — distinguish it from a true ischaemic vein occlusion and from papilloedema.",
      "Generally has a good prognosis with spontaneous recovery.",
      "Assess for the (uncommon) associated systemic hypercoagulable or inflammatory conditions."
    ],
    review: true
  },

  "Tolosa-Hunt Syndrome": {
    summary: "A granulomatous inflammation of the cavernous sinus/superior orbital fissure causing painful ophthalmoplegia — a severe peri-orbital ache with palsies of the nerves running through the sinus (III, IV, VI and V1). It is a diagnosis of exclusion that responds to steroids.",
    facts: [
      "Painful ophthalmoplegia warrants imaging to exclude a compressive, vascular or neoplastic cause first.",
      "A dramatic response to corticosteroids supports the diagnosis.",
      "It can recur and may involve either side over time."
    ],
    review: true
  },

  "Cavernous Sinus Thrombosis": {
    summary: "Thrombosis of the cavernous sinus, most often from spreading facial or paranasal-sinus infection. It causes a rapidly progressive painful red eye with proptosis, chemosis, ophthalmoplegia and reduced vision, often with fever and systemic upset.",
    facts: [
      "A life-threatening emergency — urgent imaging, systemic antibiotics/anticoagulation and admission are required.",
      "Signs can become bilateral as thrombus spreads across the sinus — a key warning feature.",
      "Look for the source (a facial 'danger triangle' infection, sinusitis, dental focus)."
    ],
    review: true
  },

  "Infantile (Congenital) Nystagmus": {
    summary: "A nystagmus that appears in the first months of life, typically horizontal, conjugate and worsening with fixation but damping at a 'null' point and on convergence. Oscillopsia is usually absent, and there may be an associated head turn.",
    facts: [
      "A null zone (a gaze position where the nystagmus quietens) often drives a compensatory head posture.",
      "May be idiopathic or a sign of an underlying sensory visual deficit (e.g. albinism, retinal dystrophy) — examine for one.",
      "Unlike acquired nystagmus, oscillopsia is characteristically absent."
    ],
    review: true
  },

  /* ═══ Neuro-Ophthalmic — batch C, completes the domain (Session 10h) ═══ */

  "Optic Nerve Hypoplasia": {
    summary: "A congenital underdevelopment of the optic nerve with a small, pale disc surrounded by a 'double-ring' sign. Vision ranges from near-normal to severe, and there may be nystagmus and field defects, often present from birth.",
    facts: [
      "Look for the small disc with a double-ring sign and reduced vision/nystagmus in a child.",
      "Can be part of septo-optic dysplasia — screen for midline brain malformations and pituitary/endocrine dysfunction.",
      "Vision is stable (non-progressive); amblyopia therapy helps unilateral cases."
    ],
    review: true
  },

  "Diabetic Papillopathy": {
    summary: "A usually benign disc swelling in diabetic patients, thought to be a mild microvascular optic-nerve disturbance. It causes little or mild vision loss with disc oedema, and typically resolves spontaneously over months.",
    facts: [
      "A diagnosis of exclusion — it must be distinguished from ischaemic optic neuropathy and from papilloedema.",
      "Can be unilateral or bilateral and often has surprisingly preserved vision for the degree of swelling.",
      "Occurs across both type 1 and type 2 diabetes; optimising glycaemic control is sensible."
    ],
    review: true
  },

  "Foster Kennedy Syndrome": {
    summary: "The combination of optic atrophy in one eye (from direct compression) and papilloedema in the other (from raised intracranial pressure), classically caused by a frontal-lobe or olfactory-groove mass. There may be anosmia and personality change.",
    facts: [
      "Asymmetric disc appearances — pale on one side, swollen on the other — should prompt urgent neuroimaging.",
      "The classic cause is a frontal/olfactory-groove tumour; a 'pseudo-Foster-Kennedy' from sequential ischaemic optic neuropathy is commoner.",
      "Associated anosmia is a useful localising clue."
    ],
    review: true
  },

  "Tilted Disc Syndrome": {
    summary: "A congenital anomaly in which the optic disc is obliquely inserted, giving a tilted appearance with an inferonasal crescent and situs inversus of the vessels. It can produce a superotemporal field defect and myopic astigmatism that mimic neurological disease.",
    facts: [
      "Its field defect (often superotemporal) does not respect the vertical midline the way a true chiasmal defect does — a key distinction.",
      "Usually an incidental, non-progressive finding needing reassurance rather than treatment.",
      "Associated with myopic astigmatism and, occasionally, secondary maculopathy."
    ],
    review: true
  },

  "Susac Syndrome": {
    summary: "A rare autoimmune microangiopathy affecting the retina, inner ear and brain, giving the triad of branch retinal artery occlusions, sensorineural hearing loss and encephalopathy. Ocular presentation is with painless field defects or blurred vision from the arterial occlusions.",
    facts: [
      "Suspect it when branch retinal artery occlusions occur with hearing loss and/or neurological/cognitive symptoms.",
      "Characteristic arterial-wall hyperfluorescence (away from occlusion sites) supports the diagnosis on angiography.",
      "A multidisciplinary (neurology, ENT) condition requiring immunosuppression."
    ],
    review: true
  },

  "Orbital Rhabdomyosarcoma": {
    summary: "The commonest primary orbital malignancy of childhood, arising from primitive mesenchyme. It presents with rapidly progressive, painless proptosis and globe displacement in a young child, sometimes with lid swelling.",
    facts: [
      "Rapidly progressive proptosis in a child is a red flag demanding urgent imaging and biopsy — this is a life-threatening cancer.",
      "Early diagnosis and treatment markedly improve survival.",
      "Managed by a specialist paediatric oncology and orbital team."
    ],
    review: true
  },

  "Orbital Lymphoma": {
    summary: "A lymphoid malignancy of the orbit/ocular adnexa, usually a low-grade B-cell (often MALT) lymphoma in older adults. It presents with a slowly progressive, painless mass, proptosis, or a characteristic salmon-pink conjunctival patch.",
    facts: [
      "A painless, slowly enlarging orbital mass or salmon-pink conjunctival lesion in an older patient should prompt biopsy.",
      "Ranges from indolent local disease to a manifestation of systemic lymphoma — staging is needed.",
      "Generally responds well to treatment, but requires oncological assessment."
    ],
    review: true
  },

  /* ═══ Surface & Lids — batch A (Session 10i) ═══ */

  "Floppy Eyelid Syndrome": {
    summary: "A condition in which the upper eyelids are unusually lax and rubbery, everting easily during sleep so the tarsal conjunctiva rubs on the pillow. It causes chronic irritation, redness, mucous discharge and a papillary conjunctivitis, typically worse on waking and often worse in one eye (the sleeping side).",
    facts: [
      "Strongly associated with obstructive sleep apnoea and obesity — screening for OSA is important and may be the main health gain.",
      "The upper lid everts with minimal upward traction — a simple bedside sign.",
      "Symptoms are often worst in the morning and on the side the patient sleeps on."
    ],
    review: true
  },

  "Blepharospasm": {
    summary: "An involuntary, bilateral, forceful closure of the eyelids from sustained contraction of the orbicularis muscle — a focal dystonia. It causes increasing, involuntary blinking and lid closure that can become functionally blinding, often aggravated by light and stress.",
    facts: [
      "Bilateral and involuntary — distinguish it from hemifacial spasm (unilateral) and from reflex blinking due to ocular surface disease.",
      "Rule out an ocular-surface trigger (dry eye, blepharitis) that can drive or worsen it.",
      "Botulinum toxin injections are the mainstay of symptomatic control."
    ],
    review: true
  },

  "Canaliculitis": {
    summary: "Infection of the lacrimal canaliculus, classically by Actinomyces, causing a red, tender, 'pouting' punctum with a chronically watering, discharging eye. Concretions (sulphur granules) are often expressible from the canaliculus.",
    facts: [
      "A pouting punctum with expressible concretions is characteristic and often missed as chronic conjunctivitis.",
      "Curettage/removal of the concretions is usually needed for cure, not antibiotics alone.",
      "Suspect it in unilateral chronic watering with recurrent discharge."
    ],
    review: true
  },

  "Sebaceous Gland Carcinoma": {
    summary: "An aggressive malignancy of the meibomian or other sebaceous glands of the eyelid, notorious for masquerading as a recurrent chalazion or a chronic unilateral blepharitis. It can present as a firm lid nodule or diffuse lid thickening with lash loss.",
    facts: [
      "A 'recurrent chalazion' or unilateral chronic blepharitis that does not settle must be biopsied — this cancer is frequently diagnosed late.",
      "It can spread within the epithelium (pagetoid spread), so mapping biopsies may be needed.",
      "Requires urgent oculoplastic/oncology referral; it can metastasise."
    ],
    review: true
  },

  "Conjunctival Melanoma": {
    summary: "A malignant melanocytic tumour of the conjunctiva, usually appearing as a raised, variably pigmented, vascularised lesion in an adult. It may arise from primary acquired melanosis, from a pre-existing nevus, or de novo.",
    facts: [
      "A new, growing or vascularised pigmented conjunctival lesion warrants urgent referral and biopsy.",
      "Primary acquired melanosis with atypia is a key precursor — document and monitor pigmented lesions.",
      "Has metastatic potential (regional nodes, distant), so it needs oncological staging."
    ],
    review: true
  },

  "Ocular Surface Squamous Neoplasia": {
    summary: "A spectrum of squamous epithelial dysplasia of the conjunctiva/cornea, from intraepithelial neoplasia to invasive squamous cell carcinoma. It typically appears as a fleshy, gelatinous or leukoplakic vascularised lesion near the limbus in older, sun-exposed or immunosuppressed patients.",
    facts: [
      "A persistent, vascularised limbal lesion should be referred for assessment and biopsy.",
      "Associated with UV exposure, HPV, and immunosuppression (including HIV) — consider the context.",
      "Ranges from surface intraepithelial disease to invasive carcinoma; early treatment is usually curative."
    ],
    review: true
  },

  "Conjunctival Nevus": {
    summary: "A common benign melanocytic lesion of the conjunctiva, usually a well-defined, slightly raised pigmented spot with characteristic clear cysts, present from childhood or adolescence. It is typically stable but can occasionally change.",
    facts: [
      "Intralesional clear cysts are a reassuring benign feature.",
      "Document size and photograph it — significant growth or new vascularity warrants review for malignant change.",
      "Pigmentation can fluctuate (e.g. at puberty) without meaning malignancy."
    ],
    review: true
  },

  "Giant Papillary Conjunctivitis": {
    summary: "A chronic immune/mechanical inflammation of the upper tarsal conjunctiva producing large (giant) papillae, most often from contact-lens wear, an ocular prosthesis or an exposed suture. It causes itching, mucous discharge, lens intolerance and blurred vision.",
    facts: [
      "Almost always has a mechanical trigger — find and remove or modify it (lens, prosthesis, suture).",
      "Evert the upper lid to see the giant papillae.",
      "Improving lens hygiene/material and reducing wear time are central to management."
    ],
    review: true
  },

  "Ligneous Conjunctivitis": {
    summary: "A rare chronic conjunctivitis in which firm, woody ('ligneous') fibrin-rich pseudomembranes form on the tarsal conjunctiva, usually in children. It causes a chronically red, discharging eye with characteristic hard, whitish-yellow membranes that recur after removal.",
    facts: [
      "Associated with systemic (type 1) plasminogen deficiency — it can affect other mucous membranes too.",
      "The membranes recur readily after excision, which is characteristic.",
      "A rare condition best managed with specialist input, sometimes including plasminogen replacement."
    ],
    review: true
  },

  "Punctal Stenosis": {
    summary: "Narrowing or closure of the lacrimal punctum, obstructing tear drainage at its entry point. It causes a chronically watering eye (epiphora), often with secondary skin irritation, in an otherwise comfortable eye.",
    facts: [
      "A common, easily overlooked cause of a watering eye — inspect the punctum directly.",
      "Causes include chronic blepharitis, prior infection, drugs and age-related change.",
      "Often treatable with simple punctal dilation or a minor procedure."
    ],
    review: true
  },

  "Nasolacrimal Duct Obstruction (Congenital)": {
    summary: "A blocked nasolacrimal duct present from birth, usually from a persistent membrane at its lower end, causing a watering, sticky eye in an infant from the early weeks of life. The eye itself is white and comfortable.",
    facts: [
      "The great majority resolve spontaneously in the first year — reassurance and lacrimal-sac massage are first-line.",
      "A white eye with watering/discharge distinguishes it from conjunctivitis and (importantly) from infantile glaucoma.",
      "Persistent cases beyond about a year may need probing."
    ],
    review: true
  },

  "Dacryoadenitis": {
    summary: "Inflammation of the lacrimal gland, presenting with pain, swelling and redness over the outer third of the upper lid, giving a characteristic S-shaped lid margin. It may be infective (acute) or part of a systemic inflammatory/infiltrative process (chronic).",
    facts: [
      "The tender swelling is in the outer upper lid, producing an S-shaped ptosis.",
      "Acute cases are often infective; chronic bilateral gland enlargement suggests systemic disease (e.g. sarcoid, IgG4, Sjögren, lymphoma).",
      "Imaging and work-up are guided by whether it is acute-infective or chronic-infiltrative."
    ],
    review: true
  },

  "Involutional Ptosis": {
    summary: "The commonest form of acquired drooping upper eyelid, from age-related stretching or dehiscence of the levator aponeurosis. It causes a gradually lowering lid with a high or absent lid crease and preserved levator function, sometimes obscuring the upper field.",
    facts: [
      "A high skin crease with good levator function points to an aponeurotic (involutional) mechanism.",
      "Exclude neurogenic (third-nerve, Horner) and myogenic (myasthenia) causes before attributing it to age.",
      "Surgical repair is effective when the droop is functionally or cosmetically significant."
    ],
    review: true
  },

  /* ═══ Surface & Lids — batch B, completes the domain (Session 10i) ═══ */

  "Eyelid Basal Cell Carcinoma": {
    summary: "The commonest eyelid malignancy, a slow-growing skin cancer that favours the lower lid and medial canthus. It typically appears as a pearly, rolled-edge nodule with fine surface vessels, often with central ulceration and loss of lashes.",
    facts: [
      "A pearly nodule with telangiectasia, ulceration or lash loss should be referred for biopsy — especially at the medial canthus, where spread is harder to manage.",
      "It rarely metastasises but is locally destructive and can invade the orbit if neglected.",
      "Sun exposure is the main risk factor; complete excision (often margin-controlled) is the goal."
    ],
    review: true
  },

  "Thermal Eyelid Burn": {
    summary: "A burn of the eyelid and periocular skin from heat or flame. Severity ranges from superficial redness to full-thickness skin loss, and the main ocular danger is corneal exposure if the lids cannot close.",
    facts: [
      "The priority is protecting the cornea — assess lid closure and treat exposure aggressively with lubrication.",
      "Full-thickness lid burns risk cicatricial retraction and lagophthalmos.",
      "Always check the ocular surface for an associated corneal or conjunctival burn."
    ],
    review: true
  },

  "Ocular Rosacea": {
    summary: "The ocular manifestation of rosacea, with meibomian gland dysfunction, lid-margin telangiectasia, recurrent chalazia and an unstable tear film. It causes chronic burning, grittiness and redness, and can cause peripheral corneal inflammation and scarring.",
    facts: [
      "Ocular symptoms can precede or outweigh the skin changes — ask about flushing and look at the cheeks/nose.",
      "Lid-margin telangiectasia and recurrent styes/chalazia are characteristic.",
      "Peripheral corneal involvement threatens vision, so it is more than a cosmetic problem."
    ],
    review: true
  },

  "Chlamydial (Adult Inclusion) Conjunctivitis": {
    summary: "A chronic follicular conjunctivitis caused by genital serotypes of Chlamydia trachomatis, usually in sexually active young adults. It causes a persistent red eye with a stringy discharge, large follicles and a tender pre-auricular node, often unresponsive to standard drops.",
    facts: [
      "Think of it in a 'conjunctivitis' that drags on for weeks with prominent follicles.",
      "It is a sexually transmitted infection — the patient (and partners) need systemic treatment and STI screening.",
      "Concurrent genital infection is common even when asymptomatic."
    ],
    review: true
  },

  "Ocular Cicatricial Pemphigoid": {
    summary: "An autoimmune, scarring (cicatrising) conjunctivitis — the ocular form of mucous membrane pemphigoid — causing progressive conjunctival shrinkage. It presents with chronic redness and irritation, then fornix shortening, symblepharon, trichiasis and, ultimately, a dry, keratinised, sight-threatening surface.",
    facts: [
      "Progressive fornix shortening and symblepharon signal a cicatrising process needing urgent systemic immunosuppression to halt it.",
      "It can be triggered or worsened by topical medications, so review the drop history.",
      "A systemic autoimmune disease — other mucous membranes may be involved, warranting multidisciplinary care."
    ],
    review: true
  },

  "Toxic Keratoconjunctivitis (Medicamentosa)": {
    summary: "A chronic irritation of the ocular surface caused by the very drops (or their preservatives) used to treat it. It causes persistent redness, a follicular reaction, and inferior corneal/conjunctival staining that paradoxically worsens the longer treatment continues.",
    facts: [
      "Suspect it when a 'red eye' fails to improve or worsens despite escalating topical treatment.",
      "Common culprits include aminoglycosides, antivirals, preserved glaucoma drops and chronic decongestant/anaesthetic misuse.",
      "The treatment is to stop the offending agent and simplify to preservative-free lubrication."
    ],
    review: true
  },

  "Molluscum Contagiosum (Lid)": {
    summary: "A viral (poxvirus) skin infection producing small, dome-shaped, umbilicated nodules on the eyelid margin. A lid-margin lesion can shed virus into the eye and cause a chronic follicular conjunctivitis and superficial keratitis.",
    facts: [
      "A chronic unilateral follicular conjunctivitis should prompt a careful search of the lid margin for the umbilicated nodule.",
      "Removing or treating the lid lesion resolves the secondary conjunctivitis.",
      "Numerous or widespread lesions raise the question of immunocompromise (e.g. HIV)."
    ],
    review: true
  },

  "Conjunctivochalasis": {
    summary: "Loose, redundant folds of bulbar conjunctiva — usually along the lower lid margin — that interfere with the tear film and tear drainage. It causes variable irritation, foreign-body sensation and either watering or dryness that changes with gaze and blinking.",
    facts: [
      "A very common, under-recognised cause of irritation and epiphora in older patients.",
      "The redundant fold can be seen draping over the lid margin and shifting with eye movement.",
      "Managed conservatively first; persistent symptomatic cases can be treated surgically."
    ],
    review: true
  },

  "Xerophthalmia (Vitamin A Deficiency)": {
    summary: "The spectrum of ocular disease from vitamin A deficiency, ranging from night blindness and conjunctival dryness with Bitot's spots to sight-destroying corneal melting (keratomalacia). It is a leading cause of preventable childhood blindness worldwide.",
    facts: [
      "Night blindness is the earliest symptom; keratomalacia is a blinding emergency needing urgent vitamin A.",
      "Bitot's spots (foamy conjunctival patches) are a classic sign of deficiency.",
      "A nutritional/systemic disease — treatment is vitamin A replacement and addressing the underlying cause (malnutrition, malabsorption)."
    ],
    review: true
  },

  "Giant Fornix Syndrome": {
    summary: "A cause of chronic, relapsing purulent conjunctivitis in elderly patients with a deep (capacious) superior fornix that harbours a coagulated protein/biofilm reservoir. It presents as a recurrent copious mucopurulent discharge that keeps returning after standard treatment.",
    facts: [
      "Suspect it in an older patient with a recurrent, treatment-resistant purulent conjunctivitis.",
      "A deep upper fornix (often with enophthalmos/levator dehiscence) hides the reservoir — evert and sweep the fornix.",
      "Clearing the reservoir, not just antibiotics, is what breaks the relapsing cycle."
    ],
    review: true
  },

  "Blepharochalasis": {
    summary: "A rare condition of recurrent, painless episodes of upper-eyelid swelling that, over time, leave the lid skin thin, lax, wrinkled and sometimes discoloured. It usually begins in adolescence or young adulthood, unlike age-related lid laxity.",
    facts: [
      "The history of recurrent self-limiting lid swelling in a young person distinguishes it from involutional dermatochalasis.",
      "Repeated episodes can stretch the levator and cause ptosis and lacrimal-gland prolapse.",
      "Surgery is best deferred until the episodes have quietened."
    ],
    review: true
  },

  "Eyelid Capillary Hemangioma": {
    summary: "The commonest orbital/periocular tumour of infancy — an infantile haemangioma — appearing in the first weeks as a red, raised ('strawberry') lid lesion that grows then slowly involutes over years. Its importance is the visual risk during the growth phase.",
    facts: [
      "A rapidly growing periocular haemangioma can cause amblyopia by inducing astigmatism, ptosis or occluding the pupil — refract and monitor closely.",
      "Deeper lesions may look bluish rather than red.",
      "Many involute spontaneously, but vision-threatening lesions are treated (e.g. with beta-blockers) during infancy."
    ],
    review: true
  },

  "Stevens-Johnson Syndrome (Ocular)": {
    summary: "The ocular involvement of Stevens-Johnson syndrome / toxic epidermal necrolysis — a severe, usually drug-induced mucocutaneous reaction. Acutely it causes a severe bilateral conjunctivitis with membranes and epithelial loss; late sequelae are cicatrisation, dry eye, trichiasis and corneal scarring.",
    facts: [
      "A systemic emergency — the acute ocular surface must be managed aggressively (and often with amniotic membrane) to limit blinding scarring.",
      "Usually triggered by a drug — identifying and stopping it is critical.",
      "Long-term follow-up is needed because cicatricial complications can progress for years."
    ],
    review: true
  },

  "Trachoma": {
    summary: "A chronic keratoconjunctivitis caused by ocular serotypes of Chlamydia trachomatis, spread in conditions of poverty and poor sanitation. Repeated infection scars the upper tarsal conjunctiva, turning the lashes inward (trichiasis) so they abrade the cornea and eventually blind.",
    facts: [
      "The world's leading infectious cause of blindness — a public-health as much as an individual diagnosis.",
      "Active disease shows follicles/inflammation of the upper tarsus; chronic disease shows scarring, entropion and trichiasis.",
      "Managed on the WHO 'SAFE' strategy (Surgery, Antibiotics, Facial cleanliness, Environmental improvement)."
    ],
    review: true
  },

  "Ophthalmia Neonatorum": {
    summary: "Conjunctivitis in the first month of life, acquired around birth. The cause and timing matter enormously: gonococcal infection is hyperacute and sight-threatening, chlamydial is subacute, and chemical/other causes are milder.",
    facts: [
      "A hyperacute, profusely purulent neonatal conjunctivitis is gonococcal until proven otherwise — a corneal-perforation emergency needing urgent systemic treatment.",
      "Chlamydial disease appears a little later and needs systemic (not just topical) therapy, plus maternal treatment.",
      "Timing of onset and discharge character guide the likely organism while cultures are awaited."
    ],
    review: true
  },

  "Conjunctival Lymphoma": {
    summary: "A lymphoid malignancy of the conjunctiva, usually a low-grade B-cell (MALT) lymphoma in older adults, appearing as a slowly growing, painless, salmon-pink patch in the fornix or bulbar conjunctiva. It is often surprisingly asymptomatic.",
    facts: [
      "A diffuse, mobile 'salmon-pink' conjunctival lesion should be biopsied.",
      "May be localised or a sign of systemic lymphoma, so systemic staging is required.",
      "Usually indolent and treatment-responsive, but needs oncological/haematological assessment."
    ],
    review: true
  },

  "Conjunctival Pyogenic Granuloma": {
    summary: "A benign, rapidly growing, fleshy red vascular nodule (a lobular capillary haemangioma) that arises on the conjunctiva in response to inflammation or injury — classically after a chalazion, surgery or trauma. It bleeds easily and can cause irritation.",
    facts: [
      "A history of a recent chalazion, operation or injury at the site is the usual clue.",
      "Despite the alarming name it is neither infective (pyogenic) nor a true granuloma.",
      "Often settles with topical steroids; a persistent lesion can be excised."
    ],
    review: true
  },

  "Dacryolithiasis": {
    summary: "The formation of a stone (dacryolith) within the lacrimal drainage system, usually the lacrimal sac. It causes intermittent watering and episodes of painful sac swelling that can come and go as the stone shifts, sometimes precipitating acute dacryocystitis.",
    facts: [
      "Suspect it in intermittent epiphora with recurrent, self-resolving sac swelling.",
      "A stone can act as a ball-valve, giving a distended but non-infected sac between episodes.",
      "Definitive treatment usually involves surgical drainage (dacryocystorhinostomy) to remove the stone and relieve obstruction."
    ],
    review: true
  },

  /* ═══ Lens (Session 10j — completing all conditions) ═══ */

  "Traumatic Cataract": {
    summary: "Lens opacity following blunt or penetrating ocular trauma, sometimes appearing immediately and sometimes months to years later. It can take a classic rosette (flower-shaped) form and may be accompanied by lens subluxation or capsule rupture.",
    facts: [
      "Always assess the whole eye — associated angle recession, retinal damage and raised pressure are common.",
      "A ruptured capsule can cause rapid lens swelling and lens-induced inflammation or glaucoma.",
      "Timing of surgery depends on the cataract, capsule integrity and coexisting injuries."
    ],
    review: true
  },

  "Congenital Cataract": {
    summary: "A lens opacity present at or shortly after birth, which may be unilateral or bilateral. Because it can prevent normal visual development, it is a leading treatable cause of childhood blindness and demands prompt recognition.",
    facts: [
      "Leukocoria or an absent red reflex in an infant needs urgent referral — retinoblastoma must also be excluded.",
      "Visually significant cataract needs early surgery to prevent deprivation amblyopia.",
      "Bilateral cases warrant a work-up for metabolic, infective (TORCH) and genetic causes."
    ],
    review: true
  },

  "Drug-induced Cataract (Steroid)": {
    summary: "A posterior subcapsular cataract caused by corticosteroid exposure — topical, inhaled, or systemic. It sits in the visual axis, so it disproportionately affects near vision and vision in bright light, and can develop relatively quickly.",
    facts: [
      "Ask specifically about steroids in every form, including inhalers and skin creams.",
      "The posterior subcapsular location explains near-vision and glare complaints out of proportion to distance acuity.",
      "Risk relates to dose and duration; the cataract does not reverse when the steroid stops."
    ],
    review: true
  },

  "Posterior Capsular Opacification (PCO)": {
    summary: "Clouding of the lens capsule left in place after cataract surgery, from residual lens cells proliferating across it. It causes a gradual return of glare and blur months to years after a successful operation — the commonest late 'complication' of cataract surgery.",
    facts: [
      "A patient whose vision was good after cataract surgery and has slowly deteriorated again is the classic story.",
      "Treated quickly and painlessly with a YAG laser capsulotomy.",
      "It is not a 'cataract coming back' — worth reassuring patients about."
    ],
    review: true
  },

  "Lens Subluxation / Dislocation": {
    summary: "Partial (subluxation) or complete (dislocation) displacement of the lens from its normal position, due to weak or broken zonules from trauma or a systemic connective-tissue disorder. It causes fluctuating vision, marked astigmatism, monocular double vision and sometimes a trembling iris (iridodonesis).",
    facts: [
      "Can precipitate acute glaucoma if the lens blocks the pupil or falls forward — potentially an emergency.",
      "Non-traumatic (especially superotemporal) subluxation should prompt a search for Marfan, homocystinuria or Weill-Marchesani syndrome.",
      "The edge of the displaced lens may be visible across the pupil."
    ],
    review: true
  },

  "Anterior Polar Cataract": {
    summary: "A small, usually congenital opacity at the front centre of the lens, often bilateral and visually insignificant. It is commonly an incidental finding that remains stable through life.",
    facts: [
      "Usually stationary and rarely affects vision, so it is often just monitored.",
      "In children even a small central opacity can occasionally cause amblyopia — check the refraction and vision.",
      "Can be associated with other developmental lens/anterior-segment changes."
    ],
    review: true
  },

  "Phacomorphic Angle Closure": {
    summary: "Acute angle closure caused by an intumescent (swollen) cataractous lens pushing the iris forward and blocking the drainage angle. It presents like acute angle-closure glaucoma — a painful red eye, haloes, blurred vision and a very high pressure — usually in an eye with an advanced cataract.",
    facts: [
      "A sight-threatening emergency — lower the pressure urgently, then definitive treatment is cataract removal.",
      "Suspect it when acute angle closure occurs in an eye with a large, mature lens.",
      "The mechanism is the swollen lens, so removing it addresses the cause."
    ],
    review: true
  },

  "Ectopia Lentis (Marfan)": {
    summary: "Displacement of the lens due to congenitally weak zonules, classically superotemporal in Marfan syndrome. It causes reduced and fluctuating vision, high astigmatism and monocular diplopia, often in a tall young patient with other Marfan features.",
    facts: [
      "Superotemporal lens displacement is characteristic of Marfan (inferonasal suggests homocystinuria).",
      "A systemic diagnosis with major implications — Marfan carries aortic-root risk needing cardiology.",
      "Refraction through the phakic or aphakic portion, and specialist lens surgery, are management options."
    ],
    review: true
  },

  "Posterior Polar Cataract": {
    summary: "A well-demarcated opacity at the back centre of the lens, often congenital and sometimes with a fragile or absent posterior capsule. Its central position affects vision more than its size suggests, and it carries a higher surgical risk of capsule rupture.",
    facts: [
      "Positioned in the visual axis, so it causes glare and blur relatively early.",
      "The posterior capsule is often weak or dehiscent — a key surgical caution.",
      "Frequently bilateral and may be inherited."
    ],
    review: true
  },

  "Microspherophakia": {
    summary: "A congenitally small, spherical lens with a steeper curvature, causing high (lenticular) myopia. The abnormal shape and lax zonules predispose to lens dislocation and to pupillary-block angle closure.",
    facts: [
      "Suspect it with unexplained high myopia and a visibly small, round lens with a wide zonular gap.",
      "Associated with Weill-Marchesani syndrome (and sometimes other systemic conditions).",
      "Pupillary-block glaucoma is a risk, and miotics can paradoxically worsen it."
    ],
    review: true
  },

  /* ═══ Refractive (Session 10j) ═══ */

  "Myopia": {
    summary: "Short-sightedness — the eye is too long (or too powerful) for its focal length, so distant objects focus in front of the retina and look blurred while near vision is clear. It usually begins in childhood/adolescence and can progress.",
    facts: [
      "Corrected with concave (minus) lenses, contact lenses or refractive surgery.",
      "High myopia carries increased lifetime risk of retinal detachment, myopic maculopathy and glaucoma — worth a dilated check.",
      "Childhood progression can sometimes be slowed with specific optical/pharmacological strategies."
    ],
    review: true
  },

  "Hyperopia": {
    summary: "Long-sightedness — the eye is too short (or too weak), so light focuses behind the retina. Younger patients can compensate by accommodating, but this causes eye strain and, with age, increasing blur for near and then distance.",
    facts: [
      "Corrected with convex (plus) lenses; symptoms often emerge as accommodation weakens with age.",
      "Uncorrected hyperopia in children can drive accommodative esotropia and amblyopia.",
      "Short, hyperopic eyes are anatomically predisposed to angle-closure glaucoma."
    ],
    review: true
  },

  "Astigmatism": {
    summary: "A refractive error in which the eye's optics are not perfectly spherical (usually the cornea), so light focuses at two different points and images are blurred or distorted at all distances. It commonly coexists with myopia or hyperopia.",
    facts: [
      "Corrected with cylindrical (toric) lenses aligned to the astigmatic axis.",
      "A sudden increase or irregular astigmatism should prompt assessment for keratoconus or other corneal disease.",
      "Regular astigmatism is optical; irregular astigmatism (from corneal disease/scarring) needs different management."
    ],
    review: true
  },

  "Presbyopia": {
    summary: "The age-related loss of the lens's ability to change shape and focus for near, becoming noticeable in the mid-forties. It causes gradually worsening difficulty with reading and close work, relieved by holding things further away or by reading correction.",
    facts: [
      "A universal, normal ageing change — not a disease.",
      "Managed with reading glasses, bifocals/varifocals, multifocal contact lenses or lens-based surgery.",
      "Its onset can unmask previously latent hyperopia."
    ],
    review: true
  },

  "Anisometropia": {
    summary: "A significant difference in refractive error between the two eyes. It can cause difficulty fusing the two images (from unequal image size), eye strain, and — importantly in children — amblyopia in the more blurred eye.",
    facts: [
      "In children it is a leading cause of amblyopia and must be corrected early.",
      "Large differences can cause troublesome image-size disparity (aniseikonia) with spectacles; contact lenses often help.",
      "Detected on a routine refraction comparing the two eyes."
    ],
    review: true
  },

  "Anisometropic Refractive Error": {
    summary: "A meaningful mismatch in the spectacle prescription between the eyes, producing unequal focus and often unequal image size. Symptoms include asthenopia, difficulty with binocular vision, and — in the young — amblyopia risk.",
    facts: [
      "Correct early in childhood to protect binocular development and prevent amblyopia.",
      "Contact lenses reduce the image-size disparity that spectacles can create.",
      "Adults may tolerate a partial correction better than a full one initially."
    ],
    review: true
  },

  "Pseudomyopia (Accommodative Spasm)": {
    summary: "A functional, reversible over-activity of accommodation that mimics myopia, causing intermittent distance blur, eye strain and headaches — often in young people doing prolonged near work. The 'myopia' fluctuates and relaxes with cycloplegia.",
    facts: [
      "A cycloplegic refraction reveals the true (usually much smaller) refractive error — the key diagnostic step.",
      "Associated with intense sustained near work and sometimes stress.",
      "Management addresses near-work habits and any genuine underlying error, not a full minus correction."
    ],
    review: true
  },

  "Post-Refractive-Surgery Ectasia": {
    summary: "Progressive corneal thinning and steepening (like keratoconus) that develops after laser refractive surgery, usually LASIK, from a biomechanically weakened cornea. It causes increasing, unstable myopic astigmatism and blur months to years after surgery.",
    facts: [
      "Suspect it with worsening, irregular astigmatism and topographic steepening after previous refractive surgery.",
      "Risk factors include thin residual stromal beds and unrecognised pre-operative forme-fruste keratoconus.",
      "Corneal cross-linking can stabilise it; specialist contact lenses restore vision."
    ],
    review: true
  },

  /* ═══ Glaucoma (Session 10j) ═══ */

  "Normal Tension Glaucoma (NTG)": {
    summary: "Glaucomatous optic-nerve damage and field loss occurring despite intraocular pressures that stay within the statistically 'normal' range. It is painless and progressive, and highlights that glaucoma is an optic neuropathy, not simply a pressure disease.",
    facts: [
      "Diagnosis rests on characteristic disc and field changes with pressures never measured as high — a diurnal pressure curve helps.",
      "Disc haemorrhages and vascular risk factors (low blood pressure, migraine, sleep apnoea) are relevant.",
      "Lowering pressure still slows progression, even from a 'normal' baseline."
    ],
    review: true
  },

  "Glaucoma Suspect / Ocular Hypertension": {
    summary: "A person with a risk factor for glaucoma — raised intraocular pressure, a suspicious optic disc, or a borderline field — but without definite glaucomatous damage yet. The task is to weigh risk and monitor rather than over-treat.",
    facts: [
      "Not everyone with raised pressure develops glaucoma; central corneal thickness affects both risk and pressure readings.",
      "Baseline disc imaging and fields allow progression to be detected over time.",
      "Treatment is offered based on overall risk, not the pressure number alone."
    ],
    review: true
  },

  "Pigmentary Glaucoma": {
    summary: "A secondary open-angle glaucoma in which pigment shed from the back of the iris clogs the drainage meshwork, raising pressure. It typically affects young myopic men and can cause pressure spikes after exercise or pupil dilation.",
    facts: [
      "Look for the triad: a mid-peripheral iris transillumination pattern, pigment on the corneal endothelium (Krukenberg spindle) and a heavily pigmented angle.",
      "Exercise or dilation can release a shower of pigment and spike the pressure.",
      "Pigment dispersion may lessen with age as the process 'burns out'."
    ],
    review: true
  },

  "Pseudoexfoliation Glaucoma": {
    summary: "A secondary open-angle glaucoma caused by a systemic fibrillar material that deposits on the lens, pupil margin and drainage angle, obstructing outflow. It tends to affect older patients, is often asymmetric, and can run higher and more resistant pressures than primary open-angle glaucoma.",
    facts: [
      "Look for greyish-white flakes on the anterior lens capsule (classically a target pattern) and at the pupil margin.",
      "Associated with weak zonules — a warning of higher cataract-surgery risk (lens dislocation).",
      "A systemic condition also linked to cardiovascular and other associations."
    ],
    review: true
  },

  "Neovascular Glaucoma": {
    summary: "An aggressive secondary glaucoma in which new vessels grow on the iris and drainage angle (in response to retinal ischaemia), scarring the angle shut. It presents with a painful red eye, very high pressure and reduced vision, usually after a vein occlusion, diabetic retinopathy or ocular ischaemia.",
    facts: [
      "A sight-threatening emergency — find and treat the underlying retinal ischaemia (laser/anti-VEGF) as well as the pressure.",
      "New vessels on the iris (rubeosis) are the warning sign before the angle closes.",
      "Often difficult to control and can lead to a blind, painful eye if neglected."
    ],
    review: true
  },

  "Steroid-Induced Glaucoma": {
    summary: "A rise in intraocular pressure caused by corticosteroid exposure (topical, periocular, inhaled or systemic) reducing outflow, in susceptible 'steroid responders'. It is usually open-angle and painless, so it can silently damage the nerve if pressure is not checked.",
    facts: [
      "Anyone on ocular or systemic steroids should have their pressure monitored.",
      "Often reverses when the steroid is stopped, but chronic exposure can cause permanent damage.",
      "Ask about all steroid routes, including skin creams and inhalers."
    ],
    review: true
  },

  "Angle Recession Glaucoma": {
    summary: "A late secondary open-angle glaucoma developing after blunt ocular trauma tore the ciliary body, leaving a recessed angle and damaged outflow. It can appear years after the injury, is often unilateral, and is easily missed unless the trauma history is sought.",
    facts: [
      "Gonioscopy shows a widened, torn ciliary-body band — the footprint of old trauma.",
      "The glaucoma can present many years after the original injury.",
      "A unilateral glaucoma should always prompt a question about past eye trauma."
    ],
    review: true
  },

  "Juvenile Open Angle Glaucoma": {
    summary: "An early-onset primary open-angle glaucoma presenting in older children and young adults, with an open angle but often high pressures and rapid nerve damage. It is frequently inherited and can be aggressive.",
    facts: [
      "Consider it in a young person with unexplained high pressure or a suspicious disc; family history is common.",
      "Pressures can be very high and the course more aggressive than adult-onset disease.",
      "Often needs surgical rather than purely medical management."
    ],
    review: true
  },

  "Neovascular Glaucoma (Diabetic)": {
    summary: "Neovascular glaucoma driven specifically by the retinal ischaemia of advanced (proliferative) diabetic retinopathy. Iris and angle new vessels raise the pressure, giving a painful eye with rubeosis in a diabetic patient.",
    facts: [
      "Signals severe posterior-segment ischaemia — treat the retina (panretinal laser / anti-VEGF) as well as the pressure.",
      "Rubeosis iridis is the early warning; the angle closes as the vessels fibrose.",
      "Prevention through good diabetic retinopathy control is far better than treating established disease."
    ],
    review: true
  },

  "Aphakic Glaucoma": {
    summary: "A secondary glaucoma occurring in an eye that has had the lens removed (often after childhood cataract surgery), through several mechanisms including angle changes and inflammation. It can appear years later, so aphakic eyes need lifelong pressure surveillance.",
    facts: [
      "Common after congenital-cataract surgery — these children need long-term monitoring.",
      "Onset can be delayed by years, so vigilance must be sustained.",
      "Mechanisms vary, which affects the choice of treatment."
    ],
    review: true
  },

  "Uveitis-Glaucoma-Hyphema (UGH) Syndrome": {
    summary: "A syndrome caused by an intraocular lens implant chafing adjacent tissue, producing recurrent uveitis, raised pressure and bleeding (hyphema/microhyphema). It presents with intermittent blurring, redness and pressure spikes after cataract surgery.",
    facts: [
      "Suspect it with recurrent post-cataract-surgery inflammation, pressure spikes and transient blood in the eye.",
      "The mechanism is mechanical lens-implant chafe — imaging of the lens position helps.",
      "Definitive treatment may require repositioning or exchanging the implant."
    ],
    review: true
  },

  "Posner-Schlossman Syndrome (Glaucomatocyclitic Crisis)": {
    summary: "Recurrent attacks of markedly raised intraocular pressure with mild anterior-chamber inflammation, typically unilateral in young to middle-aged adults. Attacks cause haloes and mild discomfort with a very high pressure but surprisingly few inflammatory signs.",
    facts: [
      "The striking mismatch — very high pressure with only mild inflammation — is characteristic.",
      "Attacks are self-limiting but recurrent, and repeated episodes can cause glaucomatous damage over time.",
      "An association with cytomegalovirus has been described in some cases."
    ],
    review: true
  },

  "Iridocorneal Endothelial (ICE) Syndrome": {
    summary: "A spectrum of disorders in which abnormal corneal endothelial cells proliferate across the angle and iris, causing angle closure, iris distortion (corectopia, holes) and corneal oedema. It is usually unilateral in middle-aged women.",
    facts: [
      "The combination of secondary angle-closure glaucoma with a distorted, holed iris and corneal oedema is characteristic.",
      "The abnormal 'ICE' membrane contracts, dragging the iris and closing the angle.",
      "Both the glaucoma and the corneal decompensation may need treatment."
    ],
    review: true
  },

  "Malignant Glaucoma (Aqueous Misdirection)": {
    summary: "A rare, dangerous form of angle closure in which aqueous is misdirected posteriorly into/behind the vitreous, pushing the lens-iris diaphragm forward and shallowing the whole anterior chamber despite a patent iridotomy. It often follows intraocular surgery.",
    facts: [
      "A uniformly shallow anterior chamber with high pressure after surgery, despite a patent iridotomy, is the clue.",
      "Standard angle-closure treatments (and miotics) can paradoxically worsen it — management differs.",
      "A sight-threatening emergency needing specialist care."
    ],
    review: true
  },

  "Phacolytic Glaucoma": {
    summary: "An acute secondary glaucoma in which leaked protein from a hypermature (advanced) cataract clogs the drainage meshwork. It presents with a sudden painful red eye, very high pressure and a dense white cataract, usually in an eye with long-neglected vision loss.",
    facts: [
      "Suspect it with acute high pressure in an eye that already had a mature, vision-obscuring cataract.",
      "Definitive treatment is removing the offending lens once the pressure is controlled.",
      "The anterior chamber may show floating white (lens-protein) material."
    ],
    review: true
  },

  "Plateau Iris Syndrome": {
    summary: "An angle-closure mechanism in which the peripheral iris is held forward by an anteriorly positioned ciliary body, so the angle can close despite a patent iridotomy and a reasonably deep central chamber. It causes angle closure, often in younger patients than typical primary angle closure.",
    facts: [
      "Angle closure that persists after a patent laser iridotomy points to a plateau-iris configuration.",
      "The central chamber can look relatively deep while the peripheral angle is dangerously narrow.",
      "Often managed with laser iridoplasty rather than iridotomy alone."
    ],
    review: true
  },

  "Primary Congenital Glaucoma": {
    summary: "Glaucoma present from birth or early infancy due to abnormal development of the drainage angle. It classically presents with the triad of watering, light sensitivity and blepharospasm, plus an enlarging, hazy cornea (buphthalmos) as the soft infant eye stretches.",
    facts: [
      "Tearing, photophobia and an enlarging cloudy cornea in an infant is a red flag needing urgent specialist care.",
      "The infant eye enlarges under pressure (buphthalmos), unlike the adult eye.",
      "Primarily a surgical disease — early treatment is essential to save vision."
    ],
    review: true
  },

  "Ghost Cell Glaucoma": {
    summary: "A secondary open-angle glaucoma in which degenerated ('ghost') red blood cells from an old vitreous haemorrhage pass forward and obstruct the drainage meshwork. It causes raised pressure weeks after a vitreous bleed, often with khaki-coloured cells visible in the anterior chamber.",
    facts: [
      "Occurs a few weeks after a vitreous haemorrhage, as rigid ghost cells reach the angle.",
      "Tan/khaki cells in the anterior chamber (and layered in the angle) are characteristic.",
      "Usually settles as the cells clear, but the pressure may need controlling meanwhile."
    ],
    review: true
  },

  "Schwartz-Matsuo Syndrome": {
    summary: "A rare secondary open-angle glaucoma associated with a chronic rhegmatogenous retinal detachment, in which photoreceptor outer segments pass forward and block the drainage meshwork. It causes raised pressure with mild anterior-chamber cells in an eye with a detachment.",
    facts: [
      "Raised pressure with a chronic retinal detachment and mild anterior-chamber activity is the clue.",
      "Repairing the retinal detachment typically resolves the glaucoma.",
      "The 'cells' are shed photoreceptor material, not true inflammation."
    ],
    review: true
  },

  /* ═══ Retina (curated) — Session 10j ═══ */

  "Central Serous Chorioretinopathy": {
    summary: "A serous (fluid) detachment of the neurosensory retina at the macula from focal leakage at the retinal pigment epithelium, typically in stressed, 'type A' middle-aged men. It causes a fairly sudden central blur, a dark or dim central patch, micropsia and reduced colour saturation in one eye.",
    facts: [
      "Ask about corticosteroids (any route) and stress — both are strongly associated.",
      "The acute form usually resolves spontaneously over a few months with good vision.",
      "OCT shows the subretinal fluid; recurrent or chronic disease can leave lasting deficit."
    ],
    review: true
  },

  "Macular Hole": {
    summary: "A full-thickness defect at the centre of the macula, usually from vitreous traction in older adults. It causes central blur, distortion and a central grey spot, with reduced acuity that depends on the hole's size and duration.",
    facts: [
      "Central metamorphopsia and a positive Watzke-Allen sign (a break in a slit beam) are suggestive.",
      "OCT confirms and stages it and guides surgical timing.",
      "Surgery (vitrectomy with gas) closes most holes, with better results the earlier it is done."
    ],
    review: true
  },

  "Epiretinal Membrane (ERM)": {
    summary: "A sheet of fibrocellular tissue that grows on the macular surface and contracts, wrinkling the retina ('macular pucker'). It causes gradual central blur and distortion, ranging from a symptomless cellophane sheen to marked visual loss.",
    facts: [
      "Often idiopathic and age-related, but can follow retinal tears, surgery or inflammation.",
      "OCT shows the membrane and the degree of retinal wrinkling/thickening.",
      "Surgical peeling helps when distortion or vision loss is significant."
    ],
    review: true
  },

  "Cystoid Macular Edema (CME)": {
    summary: "Fluid-filled cystic spaces in the central macula, most often after cataract surgery (Irvine-Gass), or from diabetes, vein occlusion or uveitis. It causes blurred and distorted central vision, classically a few weeks after otherwise-successful cataract surgery.",
    facts: [
      "A common cause of disappointing vision after cataract surgery — think of it when acuity dips at 4-6 weeks.",
      "OCT shows the characteristic petaloid cystic spaces at the fovea.",
      "Treat the cause; post-surgical CME often responds to topical anti-inflammatory therapy."
    ],
    review: true
  },

  "Macular Edema (General)": {
    summary: "Thickening of the central macula from fluid accumulation, a final common pathway of many retinal diseases (diabetes, vein occlusion, uveitis, post-surgery). It causes central blur and distortion and is a leading cause of vision loss across these conditions.",
    facts: [
      "OCT quantifies the thickening and fluid and is central to monitoring treatment.",
      "Management is directed at the underlying cause as well as the oedema itself.",
      "Persistent oedema can cause permanent photoreceptor damage, so timely treatment matters."
    ],
    review: true
  },

  "Vitreous Hemorrhage": {
    summary: "Bleeding into the vitreous cavity, causing sudden floaters, haze or profound painless vision loss depending on the amount. Common causes are proliferative diabetic retinopathy, a retinal tear/detachment, vein occlusion or trauma.",
    facts: [
      "A dense haemorrhage that obscures the retina mandates urgent ultrasound to exclude a retinal tear/detachment behind it.",
      "New floaters with a bleed should be treated as a possible retinal break until proven otherwise.",
      "Management depends on the cause; many clear spontaneously, others need laser or surgery."
    ],
    review: true
  },

  "Retinitis Pigmentosa": {
    summary: "A group of inherited progressive photoreceptor (rod-then-cone) dystrophies causing night blindness and gradually constricting peripheral fields ('tunnel vision'), with eventual central involvement. The classic fundus shows bone-spicule pigment, attenuated vessels and a waxy pale disc.",
    facts: [
      "Night blindness and progressive peripheral field loss over years is the typical history.",
      "The ERG is reduced/extinguished and helps confirm and monitor it.",
      "Can be isolated or part of a syndrome (e.g. Usher with hearing loss) — genetic and systemic assessment matters."
    ],
    review: true
  },

  "Hypertensive Retinopathy": {
    summary: "Retinal vascular changes from chronic (or acute severe) systemic hypertension — arteriolar narrowing, arteriovenous nicking, flame haemorrhages, cotton-wool spots and, when severe, disc swelling. It is usually asymptomatic but a valuable window on systemic vascular health.",
    facts: [
      "The retinal findings mirror systemic vascular damage — a reason to check and manage blood pressure.",
      "Disc swelling (malignant/accelerated hypertension) is an emergency.",
      "Graded by severity; changes can partly reverse with blood-pressure control."
    ],
    review: true
  },

  "Branch Retinal Vein Occlusion (BRVO)": {
    summary: "Occlusion of a branch of the retinal venous system, typically at an arteriovenous crossing, causing sector haemorrhages and oedema in the drained territory. It presents with painless partial visual field loss or central blur if the macula is involved.",
    facts: [
      "The haemorrhages are confined to one sector, pointing to the occluded branch.",
      "Macular oedema is the main cause of vision loss and is treatable.",
      "Associated with hypertension and vascular risk factors — assess and manage them."
    ],
    review: true
  },

  "Lattice Degeneration": {
    summary: "A common peripheral retinal thinning with characteristic criss-cross ('lattice') lines and overlying vitreous changes. It is usually asymptomatic but predisposes to retinal tears and detachment, especially in myopic eyes.",
    facts: [
      "Often an incidental finding, but it is a recognised risk factor for retinal breaks.",
      "New flashes, floaters or a shadow in someone with lattice warrant prompt dilated examination.",
      "Frequently bilateral and commoner in myopes."
    ],
    review: true
  },

  "Choroidal Nevus": {
    summary: "A common, usually flat, slate-grey pigmented lesion of the choroid — the eye's equivalent of a skin mole. Most are benign and stable, but a minority can transform, so documented surveillance matters.",
    facts: [
      "Reassuring features include being flat, small and having drusen on the surface.",
      "Warning features (thickness, orange pigment, subretinal fluid, symptoms, margin near the disc) raise concern for melanoma.",
      "Photograph and measure it so growth can be detected over time."
    ],
    review: true
  },

  "Choroidal Melanoma": {
    summary: "The commonest primary intraocular malignancy in adults, arising from choroidal melanocytes. It may be asymptomatic or cause blurred vision, field loss, floaters or photopsia, appearing as an elevated pigmented (sometimes amelanotic) choroidal mass, often with orange pigment and subretinal fluid.",
    facts: [
      "A thick pigmented choroidal lesion with orange pigment and subretinal fluid is suspicious and needs urgent ocular-oncology referral.",
      "It can metastasise, characteristically to the liver, so systemic surveillance is part of care.",
      "Ultrasound and imaging distinguish it from a benign nevus and guide treatment."
    ],
    review: true
  },

  "Macular Telangiectasia": {
    summary: "A bilateral disorder of the small parafoveal retinal capillaries (most often 'type 2', in middle age) causing gradual, usually mild central vision loss, blurring and subtle distortion. Early signs are subtle — a loss of retinal transparency and right-angled venules temporal to the fovea.",
    facts: [
      "Subtle bilateral parafoveal changes with a mild central deficit are typical; OCT/angiography help.",
      "Can be complicated by neovascularisation, which threatens more significant vision loss.",
      "Distinct from the unilateral, exudative type 1 (aneurysmal) form."
    ],
    review: true
  },

  "Central Retinal Artery Occlusion (Transient / Amaurosis Fugax)": {
    summary: "A transient, painless loss of vision in one eye — often described as a curtain or shade coming down and then lifting over minutes — from temporary retinal arterial insufficiency, usually embolic from the carotid or heart. It is a warning of impending stroke.",
    facts: [
      "Treat it like a transient ischaemic attack (a retinal TIA) — urgent vascular work-up (carotids, heart, and in older patients giant cell arteritis).",
      "Vision returns fully between episodes, unlike a completed artery occlusion.",
      "Prompt evaluation can prevent a subsequent, permanent stroke or artery occlusion."
    ],
    review: true
  },

  /* ═══ Neuro-Ophthalmic (curated) — Session 10j ═══ */

  "Ischemic Optic Neuropathy (AION)": {
    summary: "Sudden, painless loss of vision (often altitudinal — a horizontal half of the field) from infarction of the front of the optic nerve. The non-arteritic form occurs in patients with vascular risk factors and a small, crowded 'disc at risk'; the arteritic form is due to giant cell arteritis.",
    facts: [
      "Always distinguish arteritic (giant cell arteritis) from non-arteritic — the arteritic form is an emergency threatening the other eye, so check ESR/CRP and symptoms in the over-50s.",
      "An altitudinal field defect with disc swelling and an afferent pupillary defect is typical.",
      "The non-arteritic form is managed by addressing vascular risk factors; there is no proven acute cure."
    ],
    review: true
  },

  "Compressive Optic Neuropathy": {
    summary: "Slowly progressive optic-nerve dysfunction from a compressive lesion (tumour, thyroid eye disease, aneurysm) along its course. It causes gradual painless vision and colour loss with an afferent pupillary defect, and may show optic-disc pallor or swelling and, sometimes, proptosis.",
    facts: [
      "Progressive unexplained optic neuropathy, especially with proptosis or optic-disc shunt vessels, warrants urgent imaging.",
      "Vision can recover after timely decompression — the key reason not to miss it.",
      "Colour vision and the afferent pupillary defect are sensitive early markers."
    ],
    review: true
  },

  "Papilledema": {
    summary: "Swelling of both optic discs specifically due to raised intracranial pressure. Vision is often preserved early, with transient visual obscurations, headache and pulsatile tinnitus; chronic papilloedema threatens the fields and eventually acuity.",
    facts: [
      "By convention 'papilloedema' means disc swelling from raised intracranial pressure — it is bilateral and demands urgent neuroimaging.",
      "Enlarged blind spots and, later, constricted fields are the visual footprint.",
      "Distinguish it from other causes of a swollen disc (pseudopapilloedema, optic neuritis, ischaemia)."
    ],
    review: true
  },

  "Third Cranial Nerve Palsy": {
    summary: "Palsy of the oculomotor nerve, causing a 'down-and-out' eye, ptosis and (if the pupil is involved) a dilated pupil, with double vision. Pupil involvement is the crucial branch point in assessing the cause.",
    facts: [
      "A painful, pupil-involving third-nerve palsy is a posterior communicating artery aneurysm until proven otherwise — an emergency needing urgent imaging.",
      "A pupil-sparing palsy in an older vasculopath is often ischaemic (microvascular).",
      "The ptosis and 'down-and-out' position are characteristic."
    ],
    review: true
  },

  "Sixth Cranial Nerve Palsy": {
    summary: "Palsy of the abducens nerve, weakening the lateral rectus so the eye cannot fully abduct, causing horizontal double vision worse in the direction of the weak muscle and at distance. Its long intracranial course makes it a sensitive but non-specific localiser.",
    facts: [
      "Often microvascular and self-limiting in older vasculopaths, but can be a false-localising sign of raised intracranial pressure.",
      "In children or with other signs, image to exclude a compressive/inflammatory cause.",
      "Horizontal diplopia worst on gaze toward the affected side is typical."
    ],
    review: true
  },

  "Fourth Cranial Nerve Palsy": {
    summary: "Palsy of the trochlear nerve, weakening the superior oblique, causing vertical/torsional double vision that is worse on looking down and toward the nose — so patients struggle reading or on stairs and adopt a compensatory head tilt away from the affected side.",
    facts: [
      "The head tilt (away from the palsy) and a positive Bielschowsky head-tilt test are characteristic.",
      "Commonly congenital (decompensating in adulthood) or from head trauma.",
      "Look at old photographs for a long-standing head tilt suggesting a congenital cause."
    ],
    review: true
  },

  "Internuclear Ophthalmoplegia (INO)": {
    summary: "A disorder of horizontal gaze from a lesion of the medial longitudinal fasciculus in the brainstem, causing failure of adduction of one eye with nystagmus of the abducting fellow eye. It produces horizontal double vision on lateral gaze.",
    facts: [
      "In a young patient, especially if bilateral, it strongly suggests demyelination (multiple sclerosis); in older patients, a brainstem stroke.",
      "Convergence may be preserved, helping localise the lesion.",
      "Warrants neuroimaging to identify the cause."
    ],
    review: true
  },

  "Homonymous Hemianopia": {
    summary: "Loss of the same half of the visual field in both eyes, from a lesion of the retrochiasmal visual pathway (optic tract to occipital cortex). It preserves central acuity but causes people to miss things and bump into objects on the affected side.",
    facts: [
      "A field defect respecting the vertical midline localises behind the chiasm; the more congruous, the more posterior.",
      "An acute hemianopia is usually a stroke and should be managed as such.",
      "Formal perimetry maps it and helps with rehabilitation and driving advice."
    ],
    review: true
  },

  "Bitemporal Hemianopia": {
    summary: "Loss of both temporal (outer) half-fields from compression of the optic chiasm, classically by a pituitary tumour growing upward. Central vision is preserved until late, so the defect can go unnoticed by the patient.",
    facts: [
      "A field defect respecting the vertical midline that affects both temporal fields localises to the chiasm — image the pituitary/sella.",
      "May come with endocrine symptoms or, acutely and painfully, pituitary apoplexy.",
      "Often recovers after decompression if treated before optic atrophy sets in."
    ],
    review: true
  },

  "Quadrantanopia": {
    summary: "Loss of one quarter of the visual field in both eyes, from a lesion of the optic radiations — temporal-lobe lesions give a superior ('pie in the sky') quadrantanopia, parietal lesions an inferior one. Central acuity is preserved.",
    facts: [
      "The quadrant affected helps localise the lesion (temporal vs parietal radiation).",
      "Usually reflects a stroke, tumour or other structural lesion — image accordingly.",
      "Congruity and associated signs refine the localisation."
    ],
    review: true
  },

  "Optic Atrophy": {
    summary: "Pallor of the optic disc reflecting loss of nerve fibres — the final common endpoint of many optic neuropathies (compressive, ischaemic, inflammatory, hereditary, toxic, glaucomatous). It signals established, usually irreversible, damage with reduced acuity, colour vision and an afferent pupillary defect.",
    facts: [
      "Optic atrophy is a sign, not a diagnosis — the task is to find and treat any ongoing/treatable cause.",
      "Reduced colour vision and a relative afferent pupillary defect accompany unilateral cases.",
      "The pattern of pallor and history guide the cause (e.g. temporal pallor in some hereditary/toxic causes)."
    ],
    review: true
  },

  "Cortical Visual Impairment": {
    summary: "Reduced vision from damage to the brain's visual pathways/cortex rather than the eyes, so the eye examination and pupils are often normal. In children it commonly follows hypoxic or developmental brain injury; in adults it follows stroke or trauma.",
    facts: [
      "Normal-looking eyes with markedly reduced or variable visual behaviour point to a cortical cause.",
      "Vision can fluctuate and is often better for familiar or moving/coloured targets, especially in children.",
      "Management is rehabilitative and multidisciplinary."
    ],
    review: true
  },

  "Thyroid Eye Disease": {
    summary: "An autoimmune orbital inflammation associated with thyroid dysfunction (usually Graves'), causing lid retraction, proptosis, restrictive double vision and surface irritation. In its active phase it can threaten sight through corneal exposure or optic-nerve compression at the orbital apex.",
    facts: [
      "Lid retraction and proptosis are the classic signs; asymmetric or unilateral cases still need imaging.",
      "Reduced colour vision or acuity suggests compressive optic neuropathy — a sight-threatening emergency.",
      "Smoking markedly worsens it; disease activity and thyroid status both guide management."
    ],
    review: true
  },

  "Horner Syndrome": {
    summary: "Interruption of the sympathetic supply to the eye, giving the triad of a mild ptosis, a small pupil (miosis) and reduced facial sweating on the same side. The pupils are more unequal in the dark, and the small pupil dilates slowly.",
    facts: [
      "A painful, acute Horner (especially with neck pain) can signal carotid dissection — an emergency.",
      "The lesion can be anywhere along a long sympathetic pathway; associated signs and pharmacological testing help localise it.",
      "A Horner with a lung apex history raises the question of a Pancoast tumour."
    ],
    review: true
  },

  "Migraine with Visual Aura": {
    summary: "A transient, fully reversible visual disturbance — classically a shimmering, expanding zigzag (fortification) or a scintillating scotoma — lasting up to about an hour and often followed by headache. It reflects a spreading wave of cortical activity, affecting both eyes' fields together.",
    facts: [
      "The aura builds and moves over minutes and resolves completely — a key distinction from a fixed vascular field loss.",
      "It is binocular (a hemifield phenomenon), even though patients often perceive it as one eye.",
      "New, atypical or persistent visual symptoms, or a first aura in an older patient, warrant assessment to exclude other causes."
    ],
    review: true
  },

  /* ═══ Anterior / Uveitis (Session 10j) ═══ */

  "Anterior Uveitis (Chronic / Recurrent)": {
    summary: "Anterior-chamber inflammation that is persistent or repeatedly recurrent, sometimes with few symptoms between episodes. Chronic disease risks complications — posterior synechiae, cataract, raised pressure and macular oedema — even when the eye is relatively white.",
    facts: [
      "Recurrent or bilateral disease warrants a systemic work-up for an underlying cause.",
      "Chronic low-grade inflammation can be surprisingly quiet yet still damaging — monitor for complications.",
      "Look for posterior synechiae, band keratopathy and pressure changes over time."
    ],
    review: true
  },

  "Intermediate Uveitis": {
    summary: "Inflammation centred on the vitreous and peripheral retina (the pars plana), with vitreous cells, 'snowballs' and inferior 'snowbanking'. It typically causes floaters and blurred vision with a relatively white, painless eye, often in younger patients.",
    facts: [
      "Floaters and blur with minimal redness or pain are characteristic.",
      "Cystoid macular oedema is the main cause of vision loss and needs monitoring.",
      "Often idiopathic but can be associated with sarcoidosis and multiple sclerosis."
    ],
    review: true
  },

  "Posterior Uveitis": {
    summary: "Inflammation of the choroid and/or retina (chorioretinitis, retinitis), causing floaters, blurred vision and scotomata, usually with a quiet anterior segment. Because the retina and choroid are involved, it can directly and permanently threaten central vision.",
    facts: [
      "The pattern and distribution of lesions guide the (often infective or systemic) cause — imaging and targeted tests are key.",
      "Infective causes (e.g. toxoplasma, viral, tuberculous, syphilitic) must be considered before immunosuppression.",
      "Macular and optic-nerve involvement carry the greatest visual risk."
    ],
    review: true
  },

  "Panuveitis": {
    summary: "Inflammation involving the anterior chamber, vitreous and retina/choroid together — the whole uveal tract. It causes a red, painful, photophobic eye with floaters and marked vision loss, and often reflects a significant systemic or infective disease.",
    facts: [
      "Whole-eye inflammation warrants a thorough systemic and infective work-up (e.g. sarcoid, Behçet, VKH, tuberculosis, syphilis).",
      "Vision is threatened from multiple directions, so treatment is often aggressive.",
      "Exclude infective causes before starting immunosuppression."
    ],
    review: true
  },

  "HLA-B27 Associated Uveitis": {
    summary: "A recurrent, typically unilateral, acute anterior uveitis associated with the HLA-B27 tissue type and the seronegative spondyloarthropathies. Attacks are often sudden and severe, with intense redness, pain, photophobia and sometimes a hypopyon or fibrin.",
    facts: [
      "Ask about back stiffness, joint and bowel symptoms — it links to ankylosing spondylitis, reactive arthritis and inflammatory bowel disease.",
      "Attacks are acute and recurrent, often alternating between eyes over time.",
      "Usually responds well to prompt topical treatment, but recurrences are the rule."
    ],
    review: true
  },

  "Herpetic Anterior Uveitis": {
    summary: "Anterior-chamber inflammation caused by herpes simplex or zoster virus, often with raised intraocular pressure, patchy iris atrophy and sometimes reduced corneal sensation or a history of corneal disease. It is typically unilateral and recurrent.",
    facts: [
      "Uveitis with raised pressure and sectoral iris atrophy strongly suggests a herpetic cause.",
      "Look for associated corneal scarring/dendrites and reduced corneal sensation.",
      "Needs antiviral cover — treating it as a simple uveitis with steroids alone can worsen it."
    ],
    review: true
  },

  "Traumatic Iritis": {
    summary: "Anterior-chamber inflammation following blunt ocular trauma, causing an aching, photophobic eye with tenderness and a small pupil a day or two after the injury. It is a common, usually self-limiting consequence of a knock to the eye.",
    facts: [
      "Examine for other blunt-trauma damage (hyphema, angle recession, commotio, retinal breaks).",
      "Photophobia and pain on accommodation/convergence are typical.",
      "Usually settles with cycloplegia and topical anti-inflammatory treatment."
    ],
    review: true
  },

  "Lens-induced Uveitis": {
    summary: "Inflammation triggered by exposure of the immune system to lens proteins, from a leaking hypermature cataract, a ruptured lens capsule after trauma or retained lens material after surgery. It causes a red, painful eye, sometimes with raised pressure.",
    facts: [
      "Suspect it with uveitis in an eye that has an advanced cataract, recent trauma or recent lens surgery.",
      "Definitive treatment is removing the offending lens material.",
      "Can be mistaken for endophthalmitis, which must be excluded."
    ],
    review: true
  },

  "Hypopyon Uveitis": {
    summary: "Anterior uveitis severe enough to layer white cells as a visible fluid level (hypopyon) in the anterior chamber. It signals intense inflammation and demands a search for a specific cause — notably Behçet disease, HLA-B27 disease, or infection.",
    facts: [
      "A hypopyon is a sign of severe inflammation or infection — endophthalmitis and infective keratitis must be excluded urgently.",
      "A mobile, shifting hypopyon is classically described in Behçet disease.",
      "The underlying cause dictates urgent versus routine management."
    ],
    review: true
  },

  "Endophthalmitis": {
    summary: "A sight-threatening infection of the inside of the eye, most often after intraocular surgery or a penetrating injury, or spread from the bloodstream. It causes rapidly worsening pain, redness, reduced vision and a hypopyon, with intense vitreous inflammation.",
    facts: [
      "An emergency — rapidly increasing pain and vision loss after eye surgery or injury is endophthalmitis until proven otherwise.",
      "Needs urgent sampling and intravitreal antibiotics; delay costs vision.",
      "Endogenous cases point to a systemic source (e.g. bloodstream infection) needing systemic work-up."
    ],
    review: true
  },

  "Fuchs Heterochromic Uveitis": {
    summary: "A chronic, low-grade, usually unilateral anterior uveitis characterised by diffuse stellate keratic precipitates, iris atrophy causing heterochromia (the affected eye often lighter), and few symptoms. Cataract and glaucoma are the main long-term issues.",
    facts: [
      "A quiet chronic uveitis with iris heterochromia and no synechiae is characteristic.",
      "It responds poorly to (and generally does not need) intensive steroid treatment.",
      "Cataract surgery is common but carries a higher risk of intraoperative bleeding (Amsler sign)."
    ],
    review: true
  },

  "Sarcoid Uveitis": {
    summary: "Ocular inflammation caused by sarcoidosis, a multisystem granulomatous disease. It can affect any part of the eye — granulomatous anterior uveitis with 'mutton-fat' precipitates, intermediate uveitis with snowballs, or retinal periphlebitis with 'candle-wax' exudates.",
    facts: [
      "Granulomatous inflammation with mutton-fat keratic precipitates and iris nodules is suggestive.",
      "Look beyond the eye — chest imaging and blood tests support the systemic diagnosis.",
      "Frequently bilateral and chronic, often needing systemic immunosuppression."
    ],
    review: true
  },

  "Toxoplasma Retinochoroiditis": {
    summary: "The commonest cause of infectious posterior uveitis, from the Toxoplasma parasite. A new focus of retinitis (a fuzzy white lesion) typically flares up next to an old pigmented scar, with overlying vitritis giving a 'headlight in the fog' appearance and causing floaters and blur.",
    facts: [
      "A focal retinitis beside a pigmented chorioretinal scar is highly characteristic.",
      "Lesions near the fovea or optic nerve threaten vision and warrant treatment.",
      "Usually a reactivation of congenital disease; can be more severe in the immunocompromised."
    ],
    review: true
  },

  "Sympathetic Ophthalmia": {
    summary: "A rare bilateral granulomatous panuveitis that follows penetrating injury or surgery to one eye, when the immune system attacks uveal antigens in both eyes. The uninjured ('sympathising') eye develops inflammation weeks to months (occasionally years) after the trigger.",
    facts: [
      "Any new inflammation in the fellow eye after a penetrating injury/surgery is sympathetic ophthalmia until proven otherwise.",
      "Early recognition and immunosuppression protect the sympathising eye's vision.",
      "Very early removal of a blind, severely injured eye can prevent it, but this is a difficult judgement."
    ],
    review: true
  },

  "Pars Planitis": {
    summary: "The idiopathic subset of intermediate uveitis, with prominent inferior 'snowbanking' over the pars plana and vitreous 'snowballs'. It typically affects children and young adults with floaters and blurred vision in a white, painless eye.",
    facts: [
      "Snowbanking and snowballs with a quiet anterior segment are the hallmark.",
      "Cystoid macular oedema is the leading cause of vision loss.",
      "A diagnosis of exclusion within intermediate uveitis — consider sarcoid and MS."
    ],
    review: true
  },

  "Posterior Scleritis": {
    summary: "Inflammation of the sclera behind the equator, causing a deep, boring pain (often with pain on eye movement) and variable vision loss. It can produce disc swelling, choroidal folds, exudative retinal detachment and proptosis, and is easily missed.",
    facts: [
      "Deep pain out of proportion to visible signs, with disc swelling or choroidal folds, should raise suspicion — ultrasound (a thickened sclera with fluid) confirms it.",
      "Frequently associated with systemic inflammatory disease.",
      "Can masquerade as other causes of disc swelling or a mass, so imaging matters."
    ],
    review: true
  },

  "Traumatic Hyphema": {
    summary: "Blood in the anterior chamber after blunt or penetrating ocular trauma, seen as a red fluid level or diffuse haze, with reduced vision and often raised pressure. The main dangers are a pressure spike, corneal blood-staining and — most feared — a rebleed a few days later.",
    facts: [
      "Assess and control the intraocular pressure and warn about the rebleed risk over the first several days.",
      "Sickle-cell status matters — even trait raises the risk of pressure complications and influences treatment.",
      "Rest, a shield and avoidance of anticoagulants/NSAIDs are usual; large hyphemas may need surgery."
    ],
    review: true
  },

  "Toxic Anterior Segment Syndrome": {
    summary: "A sterile, acute inflammation of the anterior segment after cataract or other anterior-segment surgery, caused by a non-infectious toxic agent (a contaminant on instruments/solutions). It presents within a day of surgery with blurred vision, diffuse corneal oedema and anterior-chamber reaction — but characteristically little pain.",
    facts: [
      "Very early onset (12-24 h) with limbus-to-limbus corneal oedema and minimal pain distinguishes it from infective endophthalmitis.",
      "Endophthalmitis must still be excluded because the treatment is completely different.",
      "It usually responds to intensive topical steroids; the priority is ruling out infection."
    ],
    review: true
  },

  "Vogt-Koyanagi-Harada Disease": {
    summary: "A bilateral granulomatous panuveitis with systemic features (headache, meningism, hearing changes, and later skin/hair depigmentation), thought to be an autoimmune attack on melanocytes. It classically causes bilateral serous retinal detachments and marked vision loss.",
    facts: [
      "Bilateral panuveitis with exudative retinal detachments and meningeal/auditory symptoms is characteristic.",
      "Early, aggressive and sustained immunosuppression improves the visual outcome.",
      "Later 'sunset-glow' fundus and poliosis/vitiligo reflect melanocyte loss."
    ],
    review: true
  },

  "Behcet Disease (Ocular)": {
    summary: "The ocular manifestation of Behçet disease, a systemic vasculitis, typically an explosive recurrent panuveitis with occlusive retinal vasculitis and sometimes a shifting hypopyon. Repeated attacks cause cumulative, sight-threatening damage.",
    facts: [
      "Ask about recurrent oral and genital ulcers and skin lesions — the systemic clues.",
      "Occlusive retinal vasculitis is what makes the ocular disease so damaging; prompt systemic immunosuppression is key.",
      "Attacks can be recurrent and severe, so early aggressive control matters."
    ],
    review: true
  },

  "Ocular Toxocariasis": {
    summary: "Eye disease from the larvae of the dog/cat roundworm Toxocara, usually in children, producing a granuloma at the posterior pole or periphery, or a chronic endophthalmitis-like picture. It typically causes unilateral vision loss, a squint or leukocoria.",
    facts: [
      "Leukocoria or a white retinal granuloma in a child must be distinguished from retinoblastoma and Coats disease.",
      "Usually unilateral and linked to a history of contact with puppies or soil (pica).",
      "Tractional complications rather than the live larva often threaten vision."
    ],
    review: true
  },

  "Aniridia": {
    summary: "A congenital, usually bilateral, near-total absence of the iris (a rudimentary stump remains), part of a pan-ocular developmental disorder. It causes glare, photophobia and reduced vision from associated foveal hypoplasia and nystagmus, and carries lifelong risks of glaucoma, cataract and corneal surface failure.",
    facts: [
      "A systemic and genetic diagnosis — sporadic aniridia in a child mandates screening for Wilms tumour (WAGR / PAX6).",
      "Foveal hypoplasia and nystagmus limit vision, not just the missing iris.",
      "Lifelong surveillance for glaucoma, cataract and limbal stem-cell failure is needed."
    ],
    review: true
  },

  "Juvenile Idiopathic Arthritis (JIA) Uveitis": {
    summary: "A chronic, typically bilateral, non-granulomatous anterior uveitis complicating juvenile idiopathic arthritis. It is notoriously silent — the eye stays white and the child asymptomatic — so it is detected by screening, yet it can cause severe complications if missed.",
    facts: [
      "The eye is white and painless despite active inflammation — regular slit-lamp screening of at-risk children is essential.",
      "Highest risk in young girls with oligoarticular, ANA-positive disease.",
      "Untreated it causes band keratopathy, cataract, glaucoma and vision loss."
    ],
    review: true
  },

  "Tubulointerstitial Nephritis & Uveitis (TINU)": {
    summary: "A syndrome combining acute tubulointerstitial nephritis with (usually bilateral) anterior uveitis, most often in adolescents and young women. The uveitis can precede, accompany or follow the kidney disease and may recur.",
    facts: [
      "Consider it in a young patient with bilateral anterior uveitis — check renal function and urinalysis.",
      "The kidney and eye disease may not appear at the same time, so keep the link in mind.",
      "The uveitis can be recurrent or chronic even after the nephritis settles."
    ],
    review: true
  },

  "Syphilitic Uveitis": {
    summary: "Ocular inflammation from syphilis — 'the great masquerader' — which can mimic almost any uveitis pattern (anterior, posterior with placoid lesions, panuveitis, optic neuritis). It is an important, treatable and often bilateral cause that must be actively excluded.",
    facts: [
      "Because it imitates so many patterns, syphilis serology is part of the routine uveitis work-up.",
      "It is treatable with appropriate antibiotics, and neurosyphilis must be considered/tested.",
      "A public-health diagnosis — partner notification and screening for co-infection (including HIV) apply."
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
