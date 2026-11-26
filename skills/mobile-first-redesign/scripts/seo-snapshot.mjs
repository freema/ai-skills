// SEO output of key paths, normalised for a diff between two builds.
//
//   node seo-snapshot.mjs <baseUrl> <out.txt> [path ...]
//   node seo-snapshot.mjs http://localhost:4173 before.txt / /products /products/42 /sitemap.xml
//   (switch the branch, rebuild)  node seo-snapshot.mjs http://localhost:4173 after.txt ...same paths
//   diff before.txt after.txt     # expected: no output
//
// Per page: <title>, every <meta>, canonical and alternate links, and every JSON-LD
// block. XML paths are kept whole. The base URL is replaced with BASE so a branch
// build can be compared with production. Node 18+ (global fetch), no dependencies.
import fs from "node:fs";

const [, , base, out, ...args] = process.argv;
if (!base || !out) {
  console.error("usage: node seo-snapshot.mjs <baseUrl> <out.txt> [path ...]");
  process.exit(2);
}
const paths = args.length ? args : ["/", "/sitemap.xml"];

let txt = "";
for (const p of paths) {
  const res = await fetch(base + p, { redirect: "manual" });
  const body = await res.text();
  txt += `=== ${p} ${res.status}${res.headers.get("location") ? " -> " + res.headers.get("location") : ""}\n`;
  if (p.endsWith(".xml")) {
    txt += body + "\n";
    continue;
  }
  const head = body.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const tags = [...head.matchAll(/<title>[^<]*<\/title>|<meta\s[^>]*>|<link\s[^>]*rel="(?:canonical|alternate)"[^>]*>/gi)].map((m) => m[0]);
  const jsonLd = [...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  const h1 = [...body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => "h1: " + m[1].replace(/<[^>]+>/g, "").trim());
  txt += [...tags, ...h1, ...jsonLd].join("\n") + "\n";
}

fs.writeFileSync(out, txt.replaceAll(base, "BASE"));
console.log(`${out}: ${paths.length} paths, ${txt.length} chars`);
