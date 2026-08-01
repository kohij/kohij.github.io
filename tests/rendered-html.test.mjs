import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
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
  assert.match(html, /196개 통합 퀘스트/);
  assert.match(html, /황동 톱니 요정/);
  assert.match(html, /5분마다 6종 버프 무작위 교대/);
  assert.match(html, /5,000,000원/);
  assert.match(html, /술은 마시는 버프가 아니라 산업의 끝입니다/);
  assert.match(html, /72종/);
  assert.match(html, /한국·미국 증권/);
  assert.match(html, /웹 증권 열기/);
  assert.doesNotMatch(html, /카나리|MSPT|SERVER OPERATIONS|DESIGN REFERENCES|게임머니 투자/);
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

  assert.doesNotMatch(page, /HYPIXEL SKYBLOCK|STONEWORKS|SHA256|SERVER OPERATIONS/);
  assert.match(content, /404 피시 낫 파운드/);
  assert.match(content, /정밀기계식 브랜디/);
  assert.match(layout, /lang="ko"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

test("renders the device-code securities login", async () => {
  const [marketPage, stockChart, worker, schema, migration, communityMigration, packageJson] = await Promise.all([
    readFile(new URL("app/market/page.tsx", root), "utf8"),
    readFile(new URL("app/market/StockChart.tsx", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0002_market_candles.sql", root), "utf8"),
    readFile(new URL("drizzle/0003_market_community.sql", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(marketPage, /택병증권/);
  assert.match(marketPage, /로그인 코드/);
  assert.match(marketPage, /ABCD-EFGH/);
  assert.match(marketPage, /URLSearchParams/);
  assert.match(marketPage, /LEVERAGED_ETF/);
  assert.match(marketPage, /옵션 체인/);
  assert.match(marketPage, /bank_savings/);
  assert.match(marketPage, /만기 이자/);
  assert.match(marketPage, /중도해지/);
  assert.match(marketPage, /종목.*커뮤니티|커뮤니티/);
  assert.match(marketPage, /보유자 표시/);
  assert.doesNotMatch(marketPage, /게임머니 투자|SECURE GAME LINK|현재 IP/);
  assert.match(stockChart, /CandlestickSeries/);
  assert.match(stockChart, /HistogramSeries/);
  assert.match(stockChart, /1분봉 · 거래량/);
  assert.match(stockChart, /Charts by TradingView/);
  assert.match(stockChart, /\/api\/market\/candles/);
  assert.match(worker, /v8\/finance\/chart/);
  assert.match(worker, /marketCandles/);
  assert.match(worker, /\/api\/market\/options/);
  assert.match(worker, /api\.nasdaq\.com/);
  assert.match(worker, /bank_deposit/);
  assert.match(worker, /\/api\/market\/community/);
  assert.match(worker, /holder_verified/);
  assert.match(schema, /candles: text\("candles"\)/);
  assert.match(migration, /ALTER TABLE `market_instruments` ADD `candles`/);
  assert.match(communityMigration, /CREATE TABLE `market_community_posts`/);
  assert.match(communityMigration, /market_community_reactions/);
  assert.match(packageJson, /lightweight-charts/);
});
