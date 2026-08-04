import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const workerUrl = new URL(`../dist/server/index.js?export=${Date.now()}`, import.meta.url);
const { default: worker } = await import(workerUrl.href);
const routes = [
  { path: "/", output: "../public/index.html" },
  { path: "/market", output: "../public/market/index.html" },
];

const renderAssets = new URL("../public/render-assets/", import.meta.url);
await rm(renderAssets, { recursive: true, force: true });
await mkdir(renderAssets, { recursive: true });
await cp(new URL("../dist/client/assets/", import.meta.url), renderAssets, {
  recursive: true,
});

for (const route of routes) {
  const response = await worker.fetch(
    new Request(`https://taekbyeong-guide.fasho-7.chatgpt.site${route.path}`, {
      headers: { accept: "text/html" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  if (!response.ok) throw new Error(`${route.path} 정적 렌더 실패: HTTP ${response.status}`);
  const target = new URL(route.output, import.meta.url);
  await mkdir(new URL("./", target), { recursive: true });
  const html = (await response.text()).replaceAll("/assets/", "/render-assets/");
  await writeFile(target, html);
  console.log(`${route.path} 정적 생성 완료: ${html.length} bytes`);
}
