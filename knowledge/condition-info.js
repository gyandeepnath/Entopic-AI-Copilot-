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
