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
  assert.match(html, /전설 · 2.5%/);
  assert.match(html, /200,000원/);
  assert.match(html, /술은 마시는 버프가 아니라 산업의 끝입니다/);
  assert.match(html, /72종/);
  assert.match(html, /한국·미국 증권/);
  assert.match(html, /웹 증권 열기/);
  assert.match(html, /macOS 다운로드/);
  assert.match(html, /DMG · Universal/);
  assert.match(html, /Windows 다운로드/);
  assert.match(html, /EXE · x64/);
  assert.match(html, /런처 자동 업데이트/);
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

test("ships launcher installers and a signed updater feed", async () => {
  const downloadRoot = new URL("public/downloads/launcher/", root);
  await Promise.all([
    access(new URL("TaekbyeongLauncher-0.3.0-macOS-Universal.dmg", downloadRoot)),
    access(new URL("TaekbyeongLauncher-0.3.0-Windows-x64-Setup.exe", downloadRoot)),
  ]);

  const feed = JSON.parse(await readFile(new URL("latest.json", downloadRoot), "utf8"));
  assert.equal(feed.version, "0.3.0");
  assert.ok(feed.platforms["darwin-aarch64"].signature);
  assert.ok(feed.platforms["darwin-x86_64"].signature);
  assert.ok(feed.platforms["windows-x86_64"].signature);
});

test("ships a dedicated Taekbyeong Securities brand and install metadata", async () => {
  await Promise.all([
    access(new URL("public/securities-favicon-32.png", root)),
    access(new URL("public/securities-favicon-64.png", root)),
    access(new URL("public/securities-apple-touch-icon.png", root)),
    access(new URL("public/securities-icon-192.png", root)),
    access(new URL("public/securities-icon.png", root)),
    access(new URL("public/securities.webmanifest", root)),
  ]);

  const [marketLayout, marketPage, manifest] = await Promise.all([
    readFile(new URL("app/market/layout.tsx", root), "utf8"),
    readFile(new URL("app/market/page.tsx", root), "utf8"),
    readFile(new URL("public/securities.webmanifest", root), "utf8"),
  ]);

  assert.match(marketLayout, /securities-favicon-32\.png/);
  assert.match(marketLayout, /securities-apple-touch-icon\.png/);
  assert.match(marketLayout, /securities\.webmanifest/);
  assert.match(marketPage, /securities-favicon-64\.png/);
  assert.match(marketPage, /securities-icon-192\.png/);
  assert.equal(JSON.parse(manifest).start_url, "/market");
});

test("renders the device-code securities login", async () => {
  const [marketPage, stockChart, worker, schema, migration, communityMigration, communityGlobalMigration, packageJson] = await Promise.all([
    readFile(new URL("app/market/page.tsx", root), "utf8"),
    readFile(new URL("app/market/StockChart.tsx", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0002_market_candles.sql", root), "utf8"),
    readFile(new URL("drizzle/0003_market_community.sql", root), "utf8"),
    readFile(new URL("drizzle/0004_market_community_global.sql", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(marketPage, /택병증권/);
  assert.match(marketPage, /로그인 코드/);
  assert.match(marketPage, /ABCD-EFGH/);
  assert.match(marketPage, /URLSearchParams/);
  assert.match(marketPage, /LEVERAGED_ETF/);
  assert.match(marketPage, /옵션 체인/);
  assert.match(marketPage, /현재가 주변/);
  assert.match(marketPage, /option-chain-table/);
  assert.match(marketPage, /행사가.*전체/);
  assert.match(marketPage, /bank_savings/);
  assert.match(marketPage, /15분 적금/);
  assert.match(marketPage, /1시간 예금/);
  assert.match(marketPage, /만기 수익률/);
  assert.match(marketPage, /bankTimeLabel/);
  assert.match(marketPage, /중도해지/);
  assert.match(marketPage, /종목.*커뮤니티|커뮤니티/);
  assert.match(marketPage, /커뮤니티 새글/);
  assert.match(marketPage, /전체 종목 · 최신순/);
  assert.match(marketPage, /fetch\("\/api\/market\/community", \{ cache: "no-store" \}\)/);
  assert.match(marketPage, /자산 랭킹/);
  assert.match(marketPage, /포트폴리오/);
  assert.match(marketPage, /InstrumentIcon/);
  assert.match(marketPage, /PlayerHead/);
  assert.match(marketPage, /\/api\/market\/player-head\?name=/);
  assert.match(marketPage, /instrument-product-badge/);
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
  assert.match(worker, /limit", "5000"/);
  assert.match(worker, /fromdate/);
  assert.match(worker, /todate/);
  assert.match(worker, /bank_deposit/);
  assert.match(worker, /15m\|1h/);
  assert.match(worker, /\/api\/market\/community/);
  assert.match(worker, /symbol \? "WHERE p\.symbol = \?" : ""/);
  assert.match(worker, /'community_notice'/);
  assert.match(worker, /인게임 커뮤니티 알림 대기/);
  assert.match(worker, /noticeCutoff/);
  assert.match(worker, /action <> 'community_notice'/);
  assert.match(worker, /\/api\/market\/rankings/);
  assert.match(worker, /\/api\/market\/logo/);
  assert.match(worker, /assets\.parqet\.com\/logos\/symbol/);
  assert.match(worker, /\/api\/market\/player-head/);
  assert.match(worker, /mc-heads\.net\/avatar/);
  assert.match(worker, /publicProfile/);
  assert.match(worker, /holder_verified/);
  assert.match(schema, /candles: text\("candles"\)/);
  assert.match(migration, /ALTER TABLE `market_instruments` ADD `candles`/);
  assert.match(communityMigration, /CREATE TABLE `market_community_posts`/);
  assert.match(communityMigration, /market_community_reactions/);
  assert.match(communityGlobalMigration, /market_community_created_idx/);
  assert.match(packageJson, /lightweight-charts/);
});
