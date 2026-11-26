// Compare two first-screen rect snapshots (from first-screen-rects.mjs).
//
//   node rect-diff.mjs before.json after.json [tolerancePx]
//
// Elements are matched in document order per tag (the n-th DIV before vs the n-th DIV
// after), which is what "nothing moved" means for a change that must not touch this
// viewport. Prints per page: viewport and page height changes, elements that moved or
// resized beyond the tolerance, and elements only on one side. Exit code 1 when anything
// differs, so it can gate a script.
import fs from "node:fs";

const [, , beforeFile, afterFile, tol = "0.5"] = process.argv;
if (!beforeFile || !afterFile) {
  console.error("usage: node rect-diff.mjs before.json after.json [tolerancePx]");
  process.exit(2);
}
const before = JSON.parse(fs.readFileSync(beforeFile, "utf8"));
const after = JSON.parse(fs.readFileSync(afterFile, "utf8"));
const tolerance = Number(tol);

const byTag = (rects) => {
  const m = new Map();
  for (const line of rects) {
    const [tag, box] = line.split(" ");
    if (!m.has(tag)) m.set(tag, []);
    m.get(tag).push(box.split(",").map(Number));
  }
  return m;
};

let differs = false;
for (const path of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const a = before[path];
  const b = after[path];
  if (!a || !b) {
    console.log(`${path}: only in ${a ? "before" : "after"}`);
    differs = true;
    continue;
  }
  const notes = [];
  if (a.viewport !== b.viewport) notes.push(`viewport ${a.viewport} -> ${b.viewport}`);
  if (a.docH !== b.docH) notes.push(`page height ${a.docH} -> ${b.docH}`);
  const ma = byTag(a.rects);
  const mb = byTag(b.rects);
  for (const tag of new Set([...ma.keys(), ...mb.keys()])) {
    const xa = ma.get(tag) || [];
    const xb = mb.get(tag) || [];
    const n = Math.max(xa.length, xb.length);
    for (let i = 0; i < n; i++) {
      if (!xa[i]) notes.push(`+ ${tag}[${i}] ${xb[i].join(",")}`);
      else if (!xb[i]) notes.push(`- ${tag}[${i}] ${xa[i].join(",")}`);
      else if (xa[i].some((v, k) => Math.abs(v - xb[i][k]) > tolerance))
        notes.push(`~ ${tag}[${i}] ${xa[i].join(",")} -> ${xb[i].join(",")}`);
    }
  }
  if (notes.length) differs = true;
  console.log(`${path}: ${notes.length ? notes.length + " differences" : "identical"}`);
  for (const line of notes.slice(0, 40)) console.log("  " + line);
  if (notes.length > 40) console.log(`  … ${notes.length - 40} more`);
}
process.exit(differs ? 1 : 0);
