import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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
}

test("server-renders the Korean player guide", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ko"/i);
  assert.match(html, /택병서버 플레이어 가이드/);
  assert.match(html, /taekbyeong-709371ef\.nip\.io/);
  assert.match(html, /4개로 시작해 196개까지/);
  assert.match(html, /BreweryX 3\.4\.4/);
  assert.match(html, /황동 톱니 요정/);
  assert.match(html, /술은 마시는 버프가 아니라 산업의 끝입니다/);
  assert.match(html, /72종/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/i);
});

test("ships required social and server assets", async () => {
  await Promise.all([
    access(new URL("public/og.png", root)),
    access(new URL("public/server-icon.png", root)),
    access(new URL("public/spawn-hub-preview.png", root)),
  ]);

  const [page, content, layout, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/content.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /HYPIXEL SKYBLOCK/);
  assert.match(page, /STONEWORKS/);
  assert.match(content, /404 피시 낫 파운드/);
  assert.match(content, /정밀기계식 브랜디/);
  assert.match(layout, /lang="ko"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});
