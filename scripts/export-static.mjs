import { copyFile, writeFile } from "node:fs/promises";

const workerUrl = new URL(`../dist/server/index.js?export=${Date.now()}`, import.meta.url);
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("https://taekbyeong-guide.fasho-7.chatgpt.site/", {
    headers: { accept: "text/html" },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`정적 렌더 실패: HTTP ${response.status}`);
}

const html = await response.text();
await writeFile(new URL("../dist/client/index.html", import.meta.url), html);
await copyFile(
  new URL("../dist/client/index.html", import.meta.url),
  new URL("../dist/client/404.html", import.meta.url),
);
await writeFile(new URL("../dist/client/.nojekyll", import.meta.url), "");
console.log(`정적 홈페이지 생성 완료: ${html.length} bytes`);
