// Copies the committed sample reports (api/samples) into public/reports, so the website serves them itself
// and opening a sample never has to wake the API, which sleeps when idle.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(web, "..", "api", "samples");
const target = join(web, "public", "reports");

function copyTree(from, to) {
  for (const name of readdirSync(from)) {
    const path = join(from, name);
    if (statSync(path).isDirectory()) copyTree(path, join(to, name));
    else if (/\.(json|jpe?g|png)$/i.test(name) && name !== "personas.json") {
      mkdirSync(to, { recursive: true });
      copyFileSync(path, join(to, name));
    }
  }
}

rmSync(target, { recursive: true, force: true });
const samples = [];
if (existsSync(source)) {
  for (const id of readdirSync(source)) {
    const dir = join(source, id);
    if (!existsSync(join(dir, "sample.json")) || !existsSync(join(dir, "report.json"))) continue;
    copyTree(dir, join(target, id));
    samples.push(JSON.parse(readFileSync(join(dir, "sample.json"), "utf-8")));
  }
}
samples.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
mkdirSync(target, { recursive: true });
writeFileSync(join(target, "index.json"), JSON.stringify(samples, null, 1));
console.log(`sync-samples: ${samples.length} sample reports -> ${relative(web, target)}`);
