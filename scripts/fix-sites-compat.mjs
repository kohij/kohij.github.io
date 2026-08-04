import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(url, "utf8"));
config.compatibility_date = "2026-08-03";
config.compatibility_flags = ["nodejs_compat"];
await writeFile(url, `${JSON.stringify(config)}\n`);

const verified = JSON.parse(await readFile(url, "utf8"));
if (verified.compatibility_date !== "2026-08-03" ||
    JSON.stringify(verified.compatibility_flags) !== JSON.stringify(["nodejs_compat"])) {
  throw new Error("Sites Worker compatibility configuration was not preserved");
}
console.log("Sites Worker 호환성 기준일·Node 런타임 고정 완료");
