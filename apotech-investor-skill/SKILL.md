---
name: apotech-investor-skill
description: Prepare APOTEKH investor materials, pitch narratives, one-line positioning, fundraising slides, speaker notes, and PptxGenJS deck implementation guidance. Use when Codex needs to write, revise, critique, or build investor-facing APOTEKH content from the APOTEKH investor package, especially for African pharmacy infrastructure, Tanzania pharmacy software, TMDA/NHIF compliance, clinical safety, wholesale network, market sizing, go-to-market, competition, financial projections, or seed round pitch decks.
---

# APOTEKH Investor Skill

## Core Rule

Position APOTEKH as pharmacy operating infrastructure, not as a POS, app, or generic pharmacy software. Preserve the infrastructure thesis: APOTEKH is the compliance, clinical safety, inventory intelligence, wholesale, and healthcare commerce layer for African pharmacy.

## Source Reference

Load `references/apotekh-investor-package.md` when the task requires:

- Exact investor narrative, slide-by-slide content, or speaker notes.
- Audience-specific one-line pitches or positioning layers.
- Market size, go-to-market, competition, traction, team, financial projections, or ask details.
- PptxGenJS implementation specs for the 16-slide investor deck.
- QA rules for generated PowerPoint output.

Use the reference as the canonical source. Do not invent new facts, traction numbers, team members, ask amount, partner names, or live metrics unless the user provides them.

## Positioning Guardrails

Use these category terms:

- Pharmacy operating infrastructure.
- Healthcare commerce layer.
- Compliance engine.
- Clinical safety platform.
- Supply chain intelligence layer.
- Pharmacy OS for Africa.

Avoid these terms unless explicitly contrasting against weaker alternatives:

- POS system.
- Pharmacy software.
- Inventory management tool.
- EHR or EMR.
- Dispensing app.

When writing for investors, emphasize regulatory-native infrastructure, network effects, switching costs, clinical credibility, wholesale density, and the data layer. When writing for pharmacy owners, emphasize running the pharmacy day to day: dispensing, stock, orders, compliance, finances, and less paperwork.

## Workflow

1. Identify the audience: venture investor, development finance, strategic partner, pharmacy owner, regulator, or general pitch audience.
2. Load the source reference if exact content or deck structure is needed.
3. Choose the strongest positioning layer for that audience.
4. Preserve Tanzania and East Africa localization: TMDA, NHIF, NEMLIT, WHO AWaRe, GSDP, ADDO, Tanzanian Shilling pricing, and local wholesale workflows.
5. Mark missing facts clearly with placeholders instead of fabricating them. Common placeholders include outlet count, transactions processed, drug database size, MRR, subscription mix, team bios, ask amount, and contact details.
6. Keep investor copy confident, specific, and infrastructure-oriented. Avoid generic SaaS fluff.

## Deck Guidance

For investor decks, follow the 16-slide architecture in the reference unless the user asks for a shorter format. Keep the visual identity:

- Deep navy: `0A2540`.
- Emerald: `00A878`.
- Gold: `F7B731`.
- Light background: `F5F7FA`.
- Body text: `4A5568`.
- Muted: `94A3B8`.
- Font: Calibri.
- Dark slides: 1, 7, and 16.

For PptxGenJS implementation, follow the implementation notes in the reference:

- Use hex colors without `#`.
- Use a fresh shadow object factory rather than reusing shadow objects.
- Use PptxGenJS bullets instead of unicode bullet characters.
- Use `opacity` separately instead of 8-character hex colors.
- Use `breakLine: true` between rich text array items when needed.
- Run deck QA before delivery when generating files.

## Common Outputs

For a one-line pitch, select the reference version by audience and tighten only if the user requests a specific tone or length.

For a memo or narrative, structure the argument around: why pharmacies fail, why current systems are weak, why Tanzania and Africa are underserved, why APOTEKH is infrastructure, why now, and why this team.

For a shorter deck, compress the canonical deck into: vision, problem, solution, product, business model, market, go-to-market, competition, traction, financials, team, and ask.

For a critique, check first for category dilution, unsupported metrics, weak localization, missing regulatory moat, placeholder values, and claims that sound like generic SaaS rather than pharmacy infrastructure.
