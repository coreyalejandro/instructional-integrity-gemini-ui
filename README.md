<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f3044324-acc0-459a-9e0e-afbc921b286c

## OC Instructional Integrity Studio

This app implements the **AI-Augmented Instructional Integrity Framework** for Odessa College — a 4-step wizard that evaluates instructional materials for cognitive safety and AI-use tier compliance.

**Live OC Demo:** Append `?mode=odessa` to any deployment URL to open the OC Rubric Templates modal immediately.

### What the OC Mode Shows

- **OC Rubric Templates modal** — 4 pre-built rubrics from the AI-Augmented Instructional Integrity Framework (AI-Enhanced, AI-Assisted, AI-Free tiers)
- **OC Navy/Gold Theme** — Odessa College institutional colors overlaid on the dark studio aesthetic
- **One-click rubric loading** — select any template to pre-fill the analysis textarea and run a full cognitive safety evaluation

### Screenshots

| Step 1 — Input | OC Rubric Templates (`?mode=odessa`) |
|---|---|
| *(Dark studio interface with gold "Browse OC Rubric Templates" button)* | *(Modal with 4 rubric templates, AI-use tier badges)* |

### OC Brand Files

| File | Purpose |
|------|---------|
| `src/components/RubricPresets.tsx` | 4 AI-tier rubric templates |
| `src/index.oc-theme.css` | Navy/gold theme override layer |

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
