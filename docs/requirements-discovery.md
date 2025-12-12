# SBI Calculator Discovery Worksheet

Use this worksheet to capture what the calculator needs to support. It focuses on client-side inputs, outputs, and presentation since there is no runtime API or database.

## 1) Inputs & Ranges
- List each input, label, unit, default, min/max/step, and validation rules.
- Note any copy changes for labels or hints (e.g., Salvo Size wording).

## 2) Outputs & Formulas
- Document each derived metric, how it is calculated, and expected units/formatting.
- Identify guardrails or warnings (e.g., invalid flyout range messages) that should surface to users.

## 3) Downloads & Sharing
- Confirm which exports are required (PNG, XLSX) and the fields/columns to include.
- Specify filename conventions and whether metadata (timestamp, assumptions) should appear.

## 4) Visual & UX Requirements
- Branding: colors, typography, imagery to retain.
- Layout: desktop/mobile breakpoints, spacing, and control grouping.
- Accessibility: keyboard focus, color contrast, descriptive labels/hints.

## 5) Hosting & Build
- Target base path (currently `/SBI/` for GitHub Pages).
- Any CDN or caching considerations for static assets.

## 6) Optional Data Imports
- If you plan to pre-seed `src/data/` via SQL exports, list the JSON files and schemas you expect.
- Note who runs the export script and how often; remember the app does not query SQL at runtime.

Fill this in as a living document and update when assumptions or labels change.
