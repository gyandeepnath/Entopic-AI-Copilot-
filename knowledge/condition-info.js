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
