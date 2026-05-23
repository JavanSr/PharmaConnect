const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const deckPath = path.resolve("APOTEKH_Investor_Deck.pptx");
const outDir = path.resolve("qa", "apotekh-investor-deck");
fs.mkdirSync(outDir, { recursive: true });
const unzipDir = path.join(outDir, "unzipped");
const zipPath = path.join(outDir, "APOTEKH_Investor_Deck.zip");

function run(command, args) {
  const result = cp.spawnSync(command, args, { encoding: "utf8", shell: false });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

if (!fs.existsSync(deckPath)) {
  throw new Error(`Missing deck: ${deckPath}`);
}

fs.rmSync(unzipDir, { recursive: true, force: true });
fs.copyFileSync(deckPath, zipPath);

const unzip = run("powershell.exe", [
  "-NoProfile",
  "-Command",
  `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${unzipDir.replace(/'/g, "''")}' -Force`,
]);
if (!unzip.ok) {
  throw new Error(unzip.stderr || unzip.stdout || "Could not unzip pptx for QA");
}

const slideDir = path.join(unzipDir, "ppt", "slides");
const slideFiles = fs.readdirSync(slideDir).filter((name) => /^slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const allXml = slideFiles.map((file) => fs.readFileSync(path.join(slideDir, file), "utf8")).join("\n");
const checks = [];
checks.push(["Deck file exists", fs.statSync(deckPath).size > 100000]);
checks.push(["Slide count is 16", slideFiles.length === 16]);
checks.push(["APOTEKH comparison row present", /APOTEKH/.test(allXml) && /Generic POS/.test(allXml)]);
checks.push(["Dark slide text markers present", /THE ASK/.test(allXml) && /clinical layer no competitor has/.test(allXml)]);
checks.push(["Financial chart data labels present", /~\$26K/.test(allXml) && /~\$7\.2M/.test(allXml)]);
checks.push(["Ask amount clearly marked", /\$ TO FILL/.test(allXml)]);
checks.push(["Team bios clearly marked", /TEAM BIOS TO FILL/.test(allXml)]);
checks.push(["Traction metrics clearly marked", /TRACTION METRICS TO FILL/.test(allXml)]);
checks.push(["Contact details clearly marked", /CONTACT DETAILS TO FILL/.test(allXml)]);

const overflowRisks = [];
for (const file of slideFiles) {
  const xml = fs.readFileSync(path.join(slideDir, file), "utf8");
  const shapes = xml.match(/<a:t>[^<]{220,}<\/a:t>/g) || [];
  if (shapes.length) overflowRisks.push(`${file}: ${shapes.length} long text runs`);
}
checks.push(["No very long unbroken text runs", overflowRisks.length === 0]);

const failures = checks.filter(([, ok]) => !ok);
const report = [
  "# APOTEKH Investor Deck QA",
  "",
  `Deck: ${deckPath}`,
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Automated structure checks",
  ...checks.map(([name, ok]) => `- ${ok ? "PASS" : "FAIL"}: ${name}`),
  "",
  "## Visual QA",
  "Manual visual inspection required if PowerPoint/LibreOffice PDF export is available on the workstation.",
  "This run verified slide count, required markers, text-run risk, APOTEKH comparison row, dark-slide markers, and chart labels from the generated PPTX XML.",
  "",
];
if (overflowRisks.length) {
  report.push("## Text overflow risk notes", ...overflowRisks.map((item) => `- ${item}`), "");
}
fs.writeFileSync(path.join(outDir, "QA_REPORT.md"), report.join("\n"), "utf8");

console.log(report.join("\n"));
if (failures.length) process.exit(1);
