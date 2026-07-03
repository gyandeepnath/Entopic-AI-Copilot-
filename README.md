# Entopic — Clinical Vision Assessment
## Setup & Usage Guide

---

### What is Entopic?

Entopic is a browser-based ophthalmic clinical workflow copilot. It helps optometrists document patient exams, get real-time diagnostic suggestions based on a 130-condition knowledge base, and generate clinical reports and prescriptions.

**Important:** Entopic is advisory only. All diagnostic suggestions require clinical correlation. The engine does not replace clinical judgment.

---

### How to Set Up (5 minutes)

**Step 1:** Download all the files from Claude.

**Step 2:** Create a folder on your computer called `entopic`.

**Step 3:** Inside that folder, create two sub-folders: `css`, `js`, and `knowledge`.

**Step 4:** Place the files in the correct locations:

```
entopic/
│
├── index.html              ← main file (open this in Chrome)
│
├── css/
│   └── entopic.css
│
├── js/
│   ├── data-model.js
│   ├── storage.js
│   ├── app.js
│   ├── engine.js
│   ├── ui-pages.js
│   ├── ui-pages-2.js
│   ├── ui-sidebar.js
│   ├── ui-advisory.js
│   ├── ui-report.js
│   ├── ui-flowmap.js
│   ├── speech.js
│   ├── claude.js
│   ├── drawing.js
│   ├── risk-calc.js
│   ├── medication-checker.js
│   ├── smart-intake.js
│   └── spectacle-advisor.js
│
└── knowledge/
    ├── surface.js
    ├── corneal.js
    ├── retina.js
    ├── neuro.js
    ├── binocular.js
    ├── refractive.js
    ├── glaucoma.js
    ├── anterior.js
    ├── lens.js
    ├── medications.js
    ├── token-dictionary.js
    ├── finding-token-map.js
    └── loader.js
```

**Step 5:** Open `index.html` in Google Chrome. That is it.

No server needed. No installation. No internet required (except for Claude API features).

---

### First Time Use

1. When Entopic opens, you will see "Create new account"
2. Enter your name, credentials, clinic name, and choose a username/password
3. Click "Create Account"
4. You are now on the Dashboard

---

### Creating a Patient

1. Click "+ New Patient" on the Dashboard
2. The exam opens at Demographics — fill in patient details
3. Use "Continue →" to move through the 22 exam steps
4. The sidebar on the left shows your progress

---

### How the Diagnostic Engine Works

As you enter data, the engine runs automatically:
- Select symptoms → engine analyzes
- Enter IOP values → engine rechecks
- Select slit lamp findings → engine updates
- Fill BV data → engine adjusts

The Advisory Panel on the right shows:
- **Clinical Alerts** — urgent safety warnings
- **Differentials** — ranked list of possible conditions
- **Evidence trails** — what matched, what is missing
- **Nudges** — what to examine next

Click "Show Diagnostic Reasoning" in the Advisory Panel to see the visual flow map showing exactly how the engine reached its conclusions.

---

### Claude API (Optional)

The diagnostic engine works entirely offline. The Claude API adds two optional features:
- **Interpretive remarks** — clinical language explaining the engine's reasoning
- **Speech parsing** — converts spoken complaints into structured clinical data

To enable:
1. Get an API key from console.anthropic.com
2. On the Dashboard, click "Configure API Key"
3. Paste your key and save

Without an API key, the engine works normally. You just will not get interpretive remarks or AI speech parsing.

---

### Voice Input

On the Chief Complaint page, click the "Voice" button next to the text field:
1. Allow microphone access when prompted
2. Speak the patient's complaint naturally
3. Click "Stop" when done
4. If API key is configured: AI parses the speech into structured symptoms
5. If no API key: raw text is placed in the complaint field

**Note:** Speech recognition requires Google Chrome.

---

### Key Features by Page

- **Demographics (01):** Patient registration
- **Chief Complaint (02):** Free text + voice input + temporal selectors + 150+ symptom chips with search
- **Ocular History (03):** Structured flags (CL wear, trauma, surgery, etc.)
- **Medical History (04):** 10 medical condition flags + medication entry (auto-checks for ocular side effects)
- **Family History (05):** 7 family condition flags
- **Visual Acuity (06):** Click-to-select VA values, age-adaptive chart recommendations
- **Refraction (07):** Full Rx table with PD options
- **Dilation (08):** Drug, time, eye, drops
- **Slit Lamp (09):** Per-eye grading (SUN cells/flare, LOCS III, Van Herick, TBUT, Schirmer) + 109 selectable findings + drawing tool
- **IOP (10):** IOP with method, CCT, auto-alerts for elevated values
- **Pupils (11):** Size, reactions, RAPD with grading
- **Motility (12):** Versions, ductions, saccades, pursuits, Hirschberg
- **Binocular Vision (13):** Cover test, NPC, vergence ranges, AC/A, accommodation with Hofstetter, MAF/BAF, NRA/PRA, MEM, stereo, W4D
- **Gonioscopy (14):** Shaffer grading per quadrant
- **Fundus (15):** Per-eye disc/macula/vessels/periphery + 62 selectable findings + drawing tool
- **Neuro (16):** Colour vision, confrontation VF, Amsler grid
- **Investigations (17):** OCT (RNFL, CST, GCC), Visual field (MD, PSD), topography, pachymetry
- **Diagnosis (18):** Full differential with evidence trails, risk calculators, nudges
- **Plan (19):** Management with quick-add chips, referral with urgency
- **ICD-10 Coding (20):** Auto-suggested from differential
- **Report (21):** Print-ready clinical report + referral letter generator
- **Prescription (22):** Print-ready Rx with lens specifications + Complete Visit button

---

### Drawing Tool

On the Slit Lamp and Fundus pages, click "Draw" to open the canvas:
- Anterior segment template (cornea, iris, pupil diagram)
- Fundus template (disc, macula, arcades diagram)
- 6 colors, 3 line widths, pen and eraser
- Drawings are saved to the visit record

---

### Printing

- On the Report page: click "Print Report"
- On the Prescription page: click "Print Prescription"
- The print view automatically hides UI elements and shows proper headers with clinic name and signature blocks

---

### Data Safety

- All data is stored in your browser's localStorage
- Data never leaves your computer unless you export it
- **Export:** Dashboard → Export button → downloads a JSON backup file
- **Import:** Dashboard → Data Management → select a backup file
- **Recommendation:** Export your data regularly as a backup

---

### Knowledge Base

Entopic includes 130 clinical conditions across 9 domains:
- Surface & Lids (29 conditions)
- Cornea (25 conditions)
- Retina (22 conditions)
- Neuro-Ophthalmic (13 conditions)
- Binocular Vision (10 conditions)
- Refractive (5 conditions)
- Glaucoma (8 conditions)
- Anterior / Uveitis (10 conditions)
- Lens (8 conditions)

17 conditions are flagged as urgent requiring immediate attention.

View the full knowledge base: Dashboard → Knowledge Base → View Details

---

### Troubleshooting

**"Page is blank or nothing loads"**
- Make sure all files are in the correct folders
- Open Chrome Developer Tools (F12) → Console tab → check for red errors
- The most common issue is a missing file — verify all 32 files exist

**"No diagnostic suggestions appear"**
- Enter at least one symptom on the Chief Complaint page
- The engine requires clinical evidence — no symptoms means no suggestions

**"Voice button does not work"**
- Use Google Chrome (other browsers may not support Speech Recognition)
- Allow microphone permission when prompted

**"API key error"**
- Verify your key starts with "sk-ant-"
- Get a key from console.anthropic.com
- The diagnostic engine works without an API key — it only affects interpretive remarks

**"Storage is full"**
- Export your data, then clear old patients you no longer need
- localStorage has a ~5MB limit per domain

---

### Technical Details

- **Total:** 12,000+ lines of code across 32 files
- **Engine:** 130 conditions, 12-stage diagnostic pipeline
- **Tokens:** 184 token dictionary entries, 171 finding-to-token mappings
- **Works offline:** No server required
- **Browser:** Google Chrome recommended
- **Platform:** Windows, Mac, Linux, ChromeOS — any device with Chrome

---

### Version

Entopic v1.0.0
Knowledge Base v1.0.0

---

*Generated by Entopic — Advisory clinical decision support.*
*All diagnoses require clinical correlation.*
