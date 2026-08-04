import { readFile, readdir, rm, writeFile } from "node:fs/promises";

const configUrl = new URL("../dist/server/wrangler.json", import.meta.url);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
const config = JSON.parse(await readFile(configUrl, "utf8"));
const worker = await readFile(workerUrl, "utf8");

const forbiddenRuntimeImports = ["node:", "vinext/server", "react-dom", "react-server"];
for (const dependency of forbiddenRuntimeImports) {
  if (worker.includes(dependency)) {
    throw new Error(`Production Worker contains a Node runtime dependency: ${dependency}`);
  }
}

// Sites currently injects nodejs_compat. Keep the date before the flag became
// implicit so Cloudflare accepts the generated deployment configuration.
config.compatibility_date = "2026-08-03";
delete config.compatibility_flags;
await writeFile(configUrl, `${JSON.stringify(config)}\n`);

const serverUrl = new URL("../dist/server/", import.meta.url);
for (const entry of await readdir(serverUrl)) {
  if (entry !== "index.js" && entry !== "wrangler.json") {
    await rm(new URL(entry, serverUrl), { recursive: true, force: true });
  }
}

const verified = JSON.parse(await readFile(configUrl, "utf8"));
if (verified.compatibility_date !== "2026-08-03" || "compatibility_flags" in verified) {
  throw new Error("Sites production compatibility metadata was not normalized");
}
const productionFiles = (await readdir(serverUrl)).sort();
if (JSON.stringify(productionFiles) !== JSON.stringify(["index.js", "wrangler.json"])) {
  throw new Error("Sites production package still contains vinext server runtime files");
}

console.log("Sites 경량 Worker·호환성 메타데이터 검증 완료");
