const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.author = "APOTEKH";
pptx.company = "APOTEKH";
pptx.subject = "APOTEKH Investor Deck";
pptx.title = "APOTEKH Investor Deck";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  lang: "en-US",
};
pptx.defineLayout({ name: "APOTEKH_WIDE", width: 10, height: 5.625 });
pptx.layout = "APOTEKH_WIDE";
pptx.margin = 0;

const C = {
  navy: "0A2540",
  emerald: "00A878",
  gold: "F7B731",
  light: "F5F7FA",
  body: "4A5568",
  muted: "94A3B8",
  white: "FFFFFF",
  offWhite: "CADCFC",
  red: "D64545",
  paleGold: "FFF3D0",
  paleEmerald: "DDF7EE",
  paleRed: "FCE8E8",
};

const W = 10;
const H = 5.625;

function makeShadow(opacity = 0.13) {
  return { type: "outer", color: "000000", opacity, blur: 1.2, angle: 45, distance: 1 };
}

function addBg(slide, color) {
  slide.background = { color };
}

function text(slide, value, x, y, w, h, options = {}) {
  slide.addText(value, {
    x,
    y,
    w,
    h,
    margin: options.margin ?? 0.03,
    breakLine: false,
    fontFace: "Calibri",
    fit: "shrink",
    valign: options.valign ?? "top",
    ...options,
  });
}

function title(slide, value, subtitle, bg = "light") {
  const color = bg === "dark" ? C.white : C.navy;
  text(slide, value, 0.55, 0.32, 8.9, 0.4, { fontSize: 22, bold: true, color });
  if (subtitle) {
    text(slide, subtitle, 0.57, 0.77, 8.6, 0.25, { fontSize: 10.5, color: bg === "dark" ? C.muted : C.body });
  }
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.06,
    fill: { color: opts.fill ?? C.white, transparency: opts.transparency ?? 0 },
    line: { color: opts.line ?? "E2E8F0", transparency: opts.lineTransparency ?? 0, width: opts.lineWidth ?? 0.7 },
    shadow: opts.shadow === false ? undefined : makeShadow(0.08),
  });
}

function pill(slide, value, x, y, w, color = C.emerald, fill = C.paleEmerald) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.25,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color, transparency: 100 },
  });
  text(slide, value, x + 0.06, y + 0.055, w - 0.12, 0.12, {
    fontSize: 7.2,
    bold: true,
    color,
    align: "center",
    margin: 0,
    charSpace: 0.4,
  });
}

function bullets(slide, items, x, y, w, h, opts = {}) {
  const runs = [];
  items.forEach((item, i) => {
    runs.push({
      text: item,
      options: {
        bullet: { indent: opts.indent ?? 10 },
        hanging: opts.hanging ?? 3,
        breakLine: i !== items.length - 1,
      },
    });
  });
  slide.addText(runs, {
    x,
    y,
    w,
    h,
    fontFace: "Calibri",
    fit: "shrink",
    fontSize: opts.fontSize ?? 8.5,
    color: opts.color ?? C.body,
    margin: 0.04,
    breakLine: true,
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 2,
  });
}

function labeledIcon(slide, label, x, y, color) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x,
    y,
    w: 0.34,
    h: 0.34,
    fill: { color },
    line: { color, transparency: 100 },
  });
  text(slide, label, x + 0.03, y + 0.07, 0.28, 0.12, {
    fontSize: 7,
    bold: true,
    color: C.white,
    align: "center",
    margin: 0,
  });
}

function placeholderBox(slide, label, body, x, y, w, h) {
  card(slide, x, y, w, h, { fill: C.paleGold, line: C.gold, shadow: false });
  const labelH = Math.min(0.24, Math.max(0.14, h * 0.32));
  const bodyY = y + Math.min(0.43, Math.max(0.28, h * 0.52));
  const bodyH = Math.max(0.08, h - (bodyY - y) - 0.08);
  text(slide, label, x + 0.12, y + 0.12, w - 0.24, labelH, {
    fontSize: 10,
    bold: true,
    color: C.navy,
    margin: 0,
  });
  text(slide, body, x + 0.12, bodyY, w - 0.24, bodyH, {
    fontSize: 8.4,
    color: C.body,
    margin: 0,
    fit: "shrink",
  });
}

function notes(slide, note) {
  void slide;
  void note;
}

// 1. Vision
{
  const s = pptx.addSlide();
  addBg(s, C.navy);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: H, fill: { color: C.emerald }, line: { color: C.emerald } });
  text(s, "APOTEKH", 0.5, 1.35, 9, 0.7, { fontSize: 48, bold: true, color: C.white, align: "center", margin: 0 });
  text(s, "The Operating System for African Pharmacy", 1.1, 2.25, 7.8, 0.35, { fontSize: 21, color: C.white, align: "center", margin: 0 });
  s.addShape(pptx.ShapeType.line, { x: 3, y: 3.02, w: 4, h: 0, line: { color: C.gold, width: 1.3 } });
  text(s, "PHARMACY INFRASTRUCTURE  |  HEALTHCARE COMMERCE  |  CLINICAL SAFETY", 1.2, 3.27, 7.6, 0.25, {
    fontSize: 9.2,
    bold: true,
    color: C.offWhite,
    align: "center",
    margin: 0,
    charSpace: 0.5,
  });
  text(s, "Confidential - Seed Round 2026", 3.6, 5.12, 2.8, 0.18, { fontSize: 8, color: C.muted, align: "center", margin: 0 });
  notes(s, "Open with the infrastructure thesis: APOTEKH is not generic software. It is the operating system for compliant, clinical, intelligent pharmacy.");
}

// 2. Problem
{
  const s = pptx.addSlide();
  addBg(s, C.white);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 3.78, h: H, fill: { color: C.navy }, line: { color: C.navy } });
  text(s, "THE PROBLEM", 0.42, 0.55, 1.8, 0.2, { fontSize: 8.5, bold: true, color: C.emerald, margin: 0, charSpace: 0.6 });
  text(s, "Pharmacies are running critical healthcare on tools built for a grocery shop.", 0.42, 1.07, 2.85, 1.22, { fontSize: 19, bold: true, color: C.white, margin: 0 });
  text(s, "Or nothing at all.", 0.42, 2.55, 2.7, 0.35, { fontSize: 16, italic: true, color: C.gold, margin: 0 });
  const stats = [
    ["40%+", "of dispensing days affected by stock-outs", C.emerald],
    ["0", "pharmacy systems in TZ with interaction checking at point of sale", C.gold],
    ["3%", "of Tanzania's 16,000 outlets using purpose-built systems", C.emerald],
    ["Tsh M+", "lost annually to expired stock and manual reconciliation errors", C.gold],
  ];
  stats.forEach(([num, label, color], i) => {
    const x = 4.25 + (i % 2) * 2.65;
    const y = 0.72 + Math.floor(i / 2) * 2.05;
    card(s, x, y, 2.25, 1.58, { fill: C.light });
    text(s, num, x + 0.15, y + 0.24, 1.95, 0.48, { fontSize: i === 3 ? 29 : 36, bold: true, color, margin: 0, align: "center" });
    text(s, label, x + 0.2, y + 0.96, 1.85, 0.32, { fontSize: 9.2, color: C.body, align: "center", margin: 0 });
  });
  notes(s, "Frame the problem as systemic: inventory, clinical safety, compliance, and financial control all fail at once.");
}

// 3. Stakeholder gaps
{
  const s = pptx.addSlide();
  addBg(s, C.light);
  title(s, "Three stakeholders. One broken operating layer.", "Pharmacy owners, patients, and regulators each lose when pharmacy operations stay informal.");
  const cols = [
    ["P", "THE PHARMACY", C.emerald, ["Stockouts and dead stock", "Expired inventory losses", "Manual daily close", "No supplier performance view", "Compliance work after the fact"]],
    ["R", "THE PATIENT", C.gold, ["Drug interactions missed", "Cold chain history unknown", "Counselling depends on memory", "Unsafe antibiotic use invisible", "No adverse reaction pathway"]],
    ["G", "REGULATORS", C.navy, ["No real-time visibility", "Paper inspection records", "Antibiotic stewardship data absent", "ADR reports rarely reach TMDA", "Cold chain compliance unverifiable"]],
  ];
  cols.forEach(([icon, head, color, items], i) => {
    const x = 0.55 + i * 3.12;
    card(s, x, 1.25, 2.72, 3.55, { fill: C.white });
    labeledIcon(s, icon, x + 0.18, 1.5, color);
    text(s, head, x + 0.62, 1.55, 1.65, 0.2, { fontSize: 9.5, bold: true, color: C.navy, margin: 0, charSpace: 0.6 });
    bullets(s, items, x + 0.25, 2.02, 2.15, 2.15, { fontSize: 8.5 });
  });
  s.addShape(pptx.ShapeType.line, { x: 0.55, y: 5.05, w: 8.9, h: 0, line: { color: C.emerald, width: 1.3 } });
  text(s, "APOTEKH closes all three gaps simultaneously.", 2.45, 5.15, 5.1, 0.2, { fontSize: 10.5, italic: true, color: C.navy, align: "center", margin: 0 });
}

// 4. Alternatives
{
  const s = pptx.addSlide();
  addBg(s, C.white);
  title(s, "What exists is not enough.", "Every alternative fails on at least two of the five dimensions pharmacies need.");
  const rows = [
    ["Generic POS", "No", "No", "Partial", "No", "No"],
    ["Supply Chains", "No", "Partial", "Partial", "Partial", "No"],
    ["Public Sector", "No", "Partial", "No", "No", "No"],
    ["Imported SW", "Partial", "No", "Partial", "No", "No"],
    ["Excel / WhatsApp", "No", "No", "No", "No", "Yes"],
    ["APOTEKH", "Yes", "Yes", "Yes", "Yes", "Yes"],
  ];
  const headers = ["System", "Clinical", "Compliance", "Inventory", "Wholesale", "TZ-Native"];
  const x = 0.48, y = 1.16, widths = [2.1, 1.25, 1.35, 1.35, 1.25, 1.25], rowH = 0.48;
  let cx = x;
  headers.forEach((h, i) => {
    card(s, cx, y, widths[i], rowH, { fill: C.navy, line: C.navy, shadow: false });
    text(s, h, cx + 0.05, y + 0.15, widths[i] - 0.1, 0.12, { fontSize: 8.5, bold: true, color: C.white, align: "center", margin: 0 });
    cx += widths[i];
  });
  rows.forEach((row, r) => {
    cx = x;
    const isApotekh = row[0] === "APOTEKH";
    row.forEach((cell, i) => {
      const fill = isApotekh ? C.emerald : r % 2 ? C.white : C.light;
      card(s, cx, y + rowH * (r + 1), widths[i], rowH, { fill, line: isApotekh ? C.emerald : "E2E8F0", shadow: false });
      const valueColor = isApotekh ? C.white : cell === "Yes" ? C.emerald : cell === "No" ? C.red : C.body;
      text(s, cell, cx + 0.05, y + rowH * (r + 1) + 0.15, widths[i] - 0.1, 0.13, {
        fontSize: 8.3,
        bold: isApotekh || cell === "Yes",
        color: valueColor,
        align: i === 0 ? "left" : "center",
        margin: 0,
      });
      cx += widths[i];
    });
  });
  text(s, "This is a category comparison: only APOTEKH combines clinical safety, compliance, inventory intelligence, wholesale workflows, and Tanzania-native operating logic.", 0.65, 4.95, 8.7, 0.25, { fontSize: 10, color: C.body, align: "center" });
}

// 5. Solution
{
  const s = pptx.addSlide();
  addBg(s, C.light);
  title(s, "Five integrated layers. One operating system.", "Built for TMDA compliance, NHIF integration, and Tanzania's drug formulary from day one.");
  const pillars = [
    ["Dispensing Engine", C.emerald, "AWaRe classification, interaction checking, FEFO batch enforcement, prescription management, PIC PIN authorization."],
    ["Inventory Intelligence", C.gold, "Stockout forecasting, dead stock scoring, cold chain logs, expiry tracking, real-time stock levels."],
    ["Compliance Infrastructure", C.emerald, "TMDA audit trail, NHIF claims, Pharmacy Council documentation, ADR reporting, GSDP records."],
    ["Wholesale Network", C.gold, "B2B ordering, purchase orders, delivery manifests, credit notes, per-client price overrides."],
    ["Clinical Safety AI", C.emerald, "AI counselling, interaction alerts, pregnancy flags, RESERVE antibiotic warnings, no patient data stored."],
  ];
  pillars.forEach(([head, color, body], i) => {
    const x = 0.45 + i * 1.9;
    card(s, x, 1.35, 1.58, 3.45, { fill: C.white });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.35, w: 1.58, h: 0.12, fill: { color }, line: { color } });
    labeledIcon(s, String(i + 1), x + 0.15, 1.72, color);
    text(s, head, x + 0.15, 2.23, 1.28, 0.35, { fontSize: 10.2, bold: true, color: C.navy, margin: 0 });
    text(s, body, x + 0.15, 2.82, 1.25, 1.35, { fontSize: 8.2, color: C.body, margin: 0, fit: "shrink" });
  });
}

// 6. Product
{
  const s = pptx.addSlide();
  addBg(s, C.white);
  title(s, "The platform. In production. Right now.", null);
  const features = [
    ["Smart Dispensing Interface", C.emerald, "Search by generic or brand name. AWaRe badges appear instantly. Interactions checked before confirmation."],
    ["Stockout Forecasting", C.gold, "30-day demand averaging, lead-time modeling, RISK and OUT status flags, urgent items surfaced."],
    ["Wholesale Order Management", C.emerald, "Purchase orders, supplier catalogues, delivery manifests, driver assignment, stock receipt confirmation."],
    ["AI Clinical Counselling", C.gold, "Drug-specific counselling at dispensing. Interaction and contraindication alerts. Session-only data handling."],
    ["Daily Close & Reconciliation", C.emerald, "Daily close, revenue, items dispensed, payment mix, and one close per outlet per calendar day."],
    ["Tiered Access Control", C.gold, "ADDO to Enterprise feature gates enforced at API level with role-based access controls."],
  ];
  features.forEach(([head, color, body], i) => {
    const x = 0.55 + (i % 2) * 4.6;
    const y = 1.1 + Math.floor(i / 2) * 1.35;
    card(s, x, y, 4.05, 0.98, { fill: C.light });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.11, h: 0.98, fill: { color }, line: { color } });
    text(s, head, x + 0.26, y + 0.16, 3.4, 0.18, { fontSize: 10.5, bold: true, color: C.navy, margin: 0 });
    text(s, body, x + 0.26, y + 0.44, 3.55, 0.32, { fontSize: 8.2, color: C.body, margin: 0 });
  });
}

// 7. Clinical safety
{
  const s = pptx.addSlide();
  addBg(s, C.navy);
  title(s, "The clinical layer no competitor has.", "Built to WHO standards. Enforced at the point of dispensing.", "dark");
  const rows = [
    ["A", C.emerald, "AWaRe Antibiotic Classification", "WATCH and RESERVE antibiotics flagged at dispensing with NEMLIT-aligned guardrails."],
    ["I", C.gold, "Drug Interaction Engine", "Checks dispensing against a local interaction dataset and escalates high-risk combinations."],
    ["T", C.emerald, "Cold Chain Temperature Logging", "GSDP-compliant records by storage unit, excursion flagging, and audit-ready history."],
    ["R", C.gold, "Pharmacovigilance & ADR Reporting", "Structured adverse reaction forms, TMDA reference tracking, and submission status management."],
    ["AI", C.emerald, "AI Patient Counselling", "Session-based counselling at dispensing, with graceful rule-based fallback when AI is unavailable."],
  ];
  rows.forEach(([icon, color, head, body], i) => {
    const y = 1.35 + i * 0.74;
    labeledIcon(s, icon, 0.72, y, color);
    text(s, head, 1.25, y + 0.03, 2.85, 0.18, { fontSize: 11, bold: true, color: C.white, margin: 0 });
    text(s, body, 4.15, y + 0.02, 4.9, 0.24, { fontSize: 9.2, color: C.offWhite, margin: 0 });
  });
}

// 8. Business model
{
  const s = pptx.addSlide();
  addBg(s, C.white);
  title(s, "Subscription tiers built for the real market.", "From rural ADDO outlets to multi-branch wholesale pharmacies in Dar es Salaam.");
  const tiers = [
    ["ADDO", "Tsh 25,000 /mo", C.muted, ["Dispensing", "Basic inventory", "Daily close", "ADDO drug list"]],
    ["STANDARD", "Tsh 50,000 /mo", C.emerald, ["ADDO plus", "Patient safety tools", "Analytics", "NHIF basic"]],
    ["PREMIUM", "Tsh 100,000 /mo", C.navy, ["Standard plus", "Forecasting", "AI counselling", "Multi-user roles"]],
    ["ENTERPRISE", "Tsh 200,000+ /mo", C.gold, ["Premium plus", "Wholesale module", "Multi-branch", "API access"]],
  ];
  tiers.forEach(([name, price, color, items], i) => {
    const x = 0.52 + i * 2.33;
    card(s, x, 1.22, 2.0, 3.3, { fill: C.light });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.22, w: 2.0, h: 0.5, fill: { color }, line: { color } });
    text(s, name, x + 0.1, 1.39, 1.8, 0.13, { fontSize: 9, bold: true, color: color === C.gold ? C.navy : C.white, align: "center", margin: 0 });
    if (name === "PREMIUM") pill(s, "MOST POPULAR", x + 0.42, 0.93, 1.15, C.gold, C.paleGold);
    text(s, price, x + 0.13, 1.98, 1.74, 0.35, { fontSize: 15, bold: true, color: C.navy, align: "center", margin: 0 });
    bullets(s, items, x + 0.28, 2.63, 1.35, 1.15, { fontSize: 8.2 });
  });
  text(s, "Additional revenue: NHIF facilitation fees, wholesale marketplace commission, drug database API licensing, anonymised sector intelligence reports.", 0.75, 4.9, 8.5, 0.27, { fontSize: 9.5, color: C.body, align: "center" });
}

// 9. Market size
{
  const s = pptx.addSlide();
  addBg(s, C.light);
  title(s, "A market large enough to build on. Underserved enough to win.", null);
  const nums = [
    ["TAM - AFRICA", "$500M+", "1M+ pharmacy outlets across 54 countries at $40/month avg", C.emerald, 37],
    ["SAM - EAST AFRICA", "$50M", "~100,000 regulated outlets across six target markets", C.gold, 32],
    ["SOM - TANZANIA Y3", "$5M ARR", "2,000 outlets at Tsh 65K avg/month; ~12.5% penetration", C.emerald, 27],
  ];
  nums.forEach(([label, num, sub, color, size], i) => {
    const y = 1.05 + i * 1.28;
    text(s, label, 0.62, y, 2.5, 0.16, { fontSize: 8.5, bold: true, color, margin: 0, charSpace: 0.5 });
    text(s, num, 0.62, y + 0.22, 2.8, 0.45, { fontSize: size, bold: true, color: C.navy, margin: 0 });
    text(s, sub, 0.65, y + 0.82, 3.45, 0.22, { fontSize: 8.5, color: C.body, margin: 0 });
  });
  s.addShape(pptx.ShapeType.ellipse, { x: 5.05, y: 0.92, w: 3.9, h: 3.9, fill: { color: C.gold, transparency: 36 }, line: { color: C.gold, transparency: 30 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 5.65, y: 1.52, w: 2.7, h: 2.7, fill: { color: C.emerald, transparency: 23 }, line: { color: C.emerald, transparency: 20 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 6.32, y: 2.2, w: 1.35, h: 1.35, fill: { color: C.navy }, line: { color: C.navy } });
  text(s, "$500M+ TAM", 5.9, 1.1, 2.1, 0.25, { fontSize: 12, bold: true, color: C.navy, align: "center", margin: 0 });
  text(s, "$50M SAM", 6.05, 1.82, 1.9, 0.25, { fontSize: 12, bold: true, color: C.white, align: "center", margin: 0 });
  text(s, "$5M SOM", 6.45, 2.74, 1.1, 0.18, { fontSize: 9, bold: true, color: C.white, align: "center", margin: 0 });
}

// 10. GTM
{
  const s = pptx.addSlide();
  addBg(s, C.white);
  title(s, "Market entry. Network density. Regional expansion.", null);
  s.addShape(pptx.ShapeType.line, { x: 1.15, y: 1.62, w: 7.55, h: 0, line: { color: C.emerald, width: 1.5 } });
  const phases = [
    ["1", C.emerald, "Months 1-18", "Tanzania Foundation", ["Direct sales to pharmacy groups", "TMDA inspection-readiness positioning", "NHIF as pull factor", "Target: 500 outlets, Tsh 30M+ MRR"]],
    ["2", C.gold, "Months 18-36", "East Africa Expansion", ["Kenya market entry", "Uganda pilot", "Cross-border wholesale workflows", "Target: 2,000 outlets across 3 markets"]],
    ["3", C.navy, "Months 36-60", "Network Scale", ["Rwanda, Ethiopia, Mozambique", "Manufacturer and distributor APIs", "Sector intelligence data product", "Target: 10,000+ outlets"]],
  ];
  phases.forEach(([num, color, label, head, items], i) => {
    const x = 0.72 + i * 3.1;
    s.addShape(pptx.ShapeType.ellipse, { x: x + 1.1, y: 1.36, w: 0.52, h: 0.52, fill: { color }, line: { color } });
    text(s, num, x + 1.25, 1.51, 0.2, 0.1, { fontSize: 10, bold: true, color: color === C.gold ? C.navy : C.white, align: "center", margin: 0 });
    card(s, x, 2.0, 2.55, 2.55, { fill: C.light });
    text(s, label, x + 0.18, 2.22, 1.6, 0.16, { fontSize: 8.5, bold: true, color, margin: 0 });
    text(s, head, x + 0.18, 2.48, 2.1, 0.28, { fontSize: 12, bold: true, color: C.navy, margin: 0 });
    bullets(s, items, x + 0.25, 3.03, 1.9, 1.0, { fontSize: 7.8 });
  });
}

// 11. Competition
{
  const s = pptx.addSlide();
  addBg(s, C.light);
  title(s, "The competitive landscape has a gap. We're in it.", null);
  const mx = 0.65, my = 1.12, mw = 5.25, mh = 3.75;
  card(s, mx, my, mw, mh, { fill: C.white, shadow: false });
  s.addShape(pptx.ShapeType.line, { x: mx + 0.55, y: my + mh - 0.5, w: mw - 1.05, h: 0, line: { color: C.muted, width: 1 } });
  s.addShape(pptx.ShapeType.line, { x: mx + 0.55, y: my + 0.4, w: 0, h: mh - 0.9, line: { color: C.muted, width: 1 } });
  text(s, "Compliance Depth", mx + 1.9, my + mh - 0.25, 1.5, 0.12, { fontSize: 8, color: C.body, align: "center", margin: 0 });
  text(s, "Clinical Safety Depth", mx + 0.03, my + 1.45, 0.28, 0.42, { fontSize: 8, color: C.body, rotate: 270, align: "center", margin: 0 });
  const dots = [
    ["Excel / Paper", 1.25, 4.1, C.muted],
    ["Generic POS", 2.55, 4.0, C.muted],
    ["Supply Chains", 2.0, 2.95, C.muted],
    ["Imported SW", 2.45, 2.45, C.muted],
    ["DHIS2", 1.7, 2.3, C.muted],
    ["APOTEKH", 4.65, 1.58, C.emerald],
  ];
  dots.forEach(([label, dx, dy, color]) => {
    const large = label === "APOTEKH";
    s.addShape(pptx.ShapeType.ellipse, { x: mx + dx, y: dy, w: large ? 0.42 : 0.2, h: large ? 0.42 : 0.2, fill: { color }, line: { color } });
    text(s, label, mx + dx + (large ? 0.48 : 0.25), dy + 0.02, 1.1, 0.16, { fontSize: large ? 9 : 7.5, bold: large, color: large ? C.emerald : C.body, margin: 0 });
  });
  card(s, 6.25, 1.12, 3.05, 3.75, { fill: C.white, shadow: false });
  text(s, "What they miss", 6.47, 1.38, 1.8, 0.18, { fontSize: 12, bold: true, color: C.navy, margin: 0 });
  bullets(s, ["mPharma: no dispensing OS or clinical layer", "Generic POS: no pharmacy-specific logic", "DHIS2/iHRIS: not built for retail pharmacy", "Imported SW: no TMDA, NHIF, ADDO localization", "Excel/WhatsApp: no intelligence or audit trail"], 6.55, 1.85, 2.28, 2.35, { fontSize: 8 });
}

// 12. Why win
{
  const s = pptx.addSlide();
  addBg(s, C.white);
  title(s, "Five advantages that compound over time.", "These are structural positions, not loose features.");
  const wins = [
    ["01", "Built Compliant", C.emerald, "TMDA, NHIF, NEMLIT AWaRe, and GSDP embedded from day one."],
    ["02", "PIC Trust", C.gold, "APOTEKH protects the Pharmacist in Charge's licence at the dispensing decision."],
    ["03", "Network Effects", C.emerald, "Every pharmacy becomes a node in the wholesale network."],
    ["04", "Zero Localization Debt", C.gold, "Tsh pricing, ADDO tiers, local formulary, and supplier workflows built in."],
    ["05", "Already Built", C.emerald, "Funding scales a production platform, not a concept deck."],
  ];
  wins.forEach(([num, head, color, body], i) => {
    const x = 0.43 + i * 1.9;
    card(s, x, 1.36, 1.58, 3.35, { fill: C.light });
    text(s, num, x + 0.14, 1.66, 0.78, 0.35, { fontSize: 24, bold: true, color, margin: 0 });
    text(s, head, x + 0.14, 2.28, 1.23, 0.35, { fontSize: 10.5, bold: true, color: C.navy, margin: 0 });
    text(s, body, x + 0.14, 2.95, 1.22, 0.95, { fontSize: 8.1, color: C.body, margin: 0 });
  });
}

// 13. Traction
{
  const s = pptx.addSlide();
  addBg(s, C.light);
  title(s, "What we've built. What's next.", "Current live-business metrics are intentionally marked for update before investor delivery.");
  s.addShape(pptx.ShapeType.line, { x: 0.83, y: 1.25, w: 0, h: 3.62, line: { color: C.emerald, width: 1.5 } });
  const milestones = [
    "LIVE: Full-stack platform architecture deployed",
    "LIVE: Tanzanian formulary and AWaRe drug database seed",
    "LIVE: Dispensing engine with PIC PIN authorization",
    "LIVE: Drug interaction checking and FEFO inventory",
    "LIVE: Wholesale orders, manifests, and credit notes",
    "LIVE: Stockout, dead stock, and AI counselling modules",
    "READY: Pharmacovigilance and cold chain schemas",
    "IN PROGRESS: NHIF electronic claims integration",
    "ROADMAP: TMDA digital inspection and Kenya localization",
  ];
  milestones.forEach((m, i) => {
    const y = 1.2 + i * 0.39;
    s.addShape(pptx.ShapeType.ellipse, { x: 0.74, y: y + 0.04, w: 0.18, h: 0.18, fill: { color: m.startsWith("LIVE") ? C.emerald : m.startsWith("READY") ? C.gold : C.muted }, line: { color: C.white } });
    text(s, m, 1.05, y, 4.5, 0.17, { fontSize: 8.3, color: C.body, margin: 0 });
  });
  placeholderBox(s, "TRACTION METRICS TO FILL", "Outlets on platform: TO FILL\nDispensing transactions processed: TO FILL\nProducts in drug database: TO FILL\nMRR: Tsh TO FILL\nSubscription tier breakdown: TO FILL", 6.05, 1.22, 3.25, 2.7);
  text(s, "Use live numbers before investor presentation; do not replace these with estimates.", 6.18, 4.25, 2.95, 0.3, { fontSize: 8.2, italic: true, color: C.body, align: "center" });
}

// 14. Team
{
  const s = pptx.addSlide();
  addBg(s, C.white);
  title(s, "The team that built it.", "Pharmacy operations, software engineering, healthcare regulation, and African market knowledge.");
  const slots = [
    ["Founder / CEO", "Name: TO FILL", "Bio: TO FILL with 2-3 lines covering pharmacy ops, regulatory insight, and market credibility."],
    ["Technical Lead", "Name: TO FILL", "Bio: TO FILL with product, engineering, and platform delivery credibility."],
    ["Clinical / Regulatory", "Name: TO FILL", "Bio: TO FILL with TMDA, NHIF, NEMLIT, clinical safety, or pharmacy council credentials."],
  ];
  slots.forEach(([role, name, bio], i) => {
    const x = 0.65 + i * 3.05;
    card(s, x, 1.35, 2.55, 3.1, { fill: C.light });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.85, y: 1.65, w: 0.85, h: 0.85, fill: { color: C.paleEmerald }, line: { color: C.emerald, width: 1 } });
    text(s, "PHOTO", x + 1.02, 1.97, 0.5, 0.1, { fontSize: 7, bold: true, color: C.emerald, align: "center", margin: 0 });
    text(s, name, x + 0.22, 2.72, 2.1, 0.2, { fontSize: 12.5, bold: true, color: C.navy, align: "center", margin: 0 });
    text(s, role, x + 0.22, 3.02, 2.1, 0.18, { fontSize: 9.2, bold: true, color: C.emerald, align: "center", margin: 0 });
    text(s, bio, x + 0.25, 3.42, 2.05, 0.6, { fontSize: 8.2, color: C.body, align: "center", margin: 0 });
  });
  placeholderBox(s, "TEAM BIOS TO FILL", "Replace every team card with confirmed names, titles, photos, credentials, LinkedIn/contact details, and advisor or partner logos only if they are approved for use.", 1.25, 4.72, 7.5, 0.48);
}

// 15. Financial projections
{
  const s = pptx.addSlide();
  addBg(s, C.light);
  title(s, "The financial trajectory.", "Conservative projections based on 12.5% Tanzania market penetration by Year 3.");
  const data = [
    ["Y1", 0.026, "~$26K", "100 outlets"],
    ["Y2", 0.163, "~$163K", "500 outlets"],
    ["Y3", 0.75, "~$750K", "2,000 outlets"],
    ["Y4", 2.6, "~$2.6M", "6,000 outlets"],
    ["Y5", 7.2, "~$7.2M", "15,000 outlets"],
  ];
  const baseX = 0.75, baseY = 4.35, chartW = 5.25, maxH = 2.75, max = 7.2;
  s.addShape(pptx.ShapeType.line, { x: baseX, y: baseY, w: chartW, h: 0, line: { color: C.muted, width: 1 } });
  data.forEach(([year, val, label, outlets], i) => {
    const bw = 0.55, gap = 0.43;
    const h = Math.max((val / max) * maxH, 0.12);
    const x = baseX + 0.35 + i * (bw + gap);
    const y = baseY - h;
    const color = year === "Y5" ? C.gold : C.emerald;
    s.addShape(pptx.ShapeType.rect, { x, y, w: bw, h, fill: { color }, line: { color } });
    text(s, label, x - 0.12, y - 0.28, 0.8, 0.14, { fontSize: 8, bold: true, color: C.navy, align: "center", margin: 0 });
    text(s, year, x, baseY + 0.15, bw, 0.12, { fontSize: 8, color: C.body, align: "center", margin: 0 });
    text(s, outlets, x - 0.22, baseY + 0.38, 1.0, 0.12, { fontSize: 6.5, color: C.body, align: "center", margin: 0 });
  });
  card(s, 6.35, 1.3, 2.9, 3.25, { fill: C.white });
  text(s, "Key projection metrics", 6.58, 1.58, 2.1, 0.18, { fontSize: 12, bold: true, color: C.navy, margin: 0 });
  bullets(s, ["Gross Margin: ~78%", "Net Revenue Retention: ~115%", "CAC Target: Tsh 150,000 (~$60)", "LTV Target: Tsh 3,600,000+ (~$1,440)", "LTV:CAC Ratio: 24:1", "Payback Period: ~3 months"], 6.62, 2.02, 2.1, 1.82, { fontSize: 8.2 });
  text(s, "Exchange rate assumption: Tsh 2,500 = $1. Adjust to current rate before presenting.", 0.9, 5.08, 5.1, 0.17, { fontSize: 7.6, italic: true, color: C.body, margin: 0 });
}

// 16. Ask
{
  const s = pptx.addSlide();
  addBg(s, C.navy);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: H, fill: { color: C.emerald }, line: { color: C.emerald } });
  text(s, "THE ASK", 0.65, 0.63, 1.2, 0.16, { fontSize: 9, bold: true, color: C.emerald, margin: 0, charSpace: 0.7 });
  text(s, "$ TO FILL", 0.65, 1.04, 3.6, 0.7, { fontSize: 44, bold: true, color: C.white, margin: 0 });
  text(s, "Seed Round", 0.72, 1.86, 1.8, 0.25, { fontSize: 16, color: C.gold, margin: 0 });
  s.addShape(pptx.ShapeType.line, { x: 0.72, y: 2.33, w: 2.7, h: 0, line: { color: C.gold, width: 1 } });
  text(s, "To scale Tanzania, enter East Africa, and complete NHIF + TMDA integrations.", 0.72, 2.62, 3.55, 0.45, { fontSize: 12.5, color: C.white, margin: 0 });
  bullets(s, ["500 outlets onboarded - Month 18", "NHIF integration live - Month 12", "Kenya market entry - Month 24", "Series A ready - Month 30"], 0.83, 3.42, 3.1, 1.0, { fontSize: 8.7, color: C.offWhite });
  card(s, 5.3, 0.78, 3.9, 3.45, { fill: "102F50", line: "244B70", shadow: false });
  text(s, "Use of Funds", 5.6, 1.1, 1.8, 0.22, { fontSize: 14, bold: true, color: C.white, margin: 0 });
  const funds = [["Engineering & Product", "30%", C.emerald], ["Sales & GTM", "35%", C.gold], ["Regulatory & Compliance", "15%", C.emerald], ["Operations & Team", "20%", C.gold]];
  funds.forEach(([label, pct, color], i) => {
    const y = 1.65 + i * 0.55;
    text(s, label, 5.65, y, 1.9, 0.13, { fontSize: 9.5, color: C.offWhite, margin: 0 });
    s.addShape(pptx.ShapeType.rect, { x: 7.5, y: y + 0.02, w: 1.0, h: 0.1, fill: { color, transparency: 70 }, line: { color, transparency: 100 } });
    s.addShape(pptx.ShapeType.rect, { x: 7.5, y: y + 0.02, w: Number(pct.replace("%", "")) / 35, h: 0.1, fill: { color }, line: { color, transparency: 100 } });
    text(s, pct, 8.62, y - 0.01, 0.35, 0.12, { fontSize: 8.5, bold: true, color: C.white, margin: 0 });
  });
  placeholderBox(s, "CONTACT DETAILS TO FILL", "Name: TO FILL | Email: TO FILL | Phone: TO FILL", 5.3, 4.55, 3.9, 0.52);
  text(s, "APOTEKH - The Operating System for African Pharmacy", 0.72, 5.12, 4.3, 0.16, { fontSize: 8.8, color: C.offWhite, margin: 0 });
  notes(s, "Replace the ask amount and contact details with confirmed values before sending to investors.");
}

async function main() {
  await pptx.writeFile({ fileName: "APOTEKH_Investor_Deck.pptx" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
