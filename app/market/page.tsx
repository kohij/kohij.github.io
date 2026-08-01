"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Instrument = {
  symbol: string; name: string; market: string; currency: string; type: string; unit: string;
  price_won: number; change_percent: number; updated_at: number;
};
type Position = { symbol: string; name: string; type: string; unit: string; quantity: string; valueWon: number; profitWon: number };
type Account = { id: string; name: string; type: string; principalWon: number; maturityAt: number };
type Command = { id: string; action: string; symbol: string; quantity: string; status: string; message: string };
type Snapshot = {
  authenticated: boolean;
  player?: { player_name: string; cash_won: number; online: boolean; positions: Position[]; accounts: Account[]; updated_at: number };
  instruments?: Instrument[];
  commands?: Command[];
};

const won = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("ko-KR", { signDisplay: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type IconName = "search" | "chart" | "wallet" | "clock" | "logout" | "close" | "bank";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    search: "m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
    chart: "M4 19V9m5 10V5m5 14v-7m5 7V3",
    wallet: "M4 6.5h14a2 2 0 0 1 2 2V18H4a2 2 0 0 1-2-2V6.5m0 0A2.5 2.5 0 0 1 4.5 4H17v2.5m0 5h3",
    clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    logout: "M10 17l5-5-5-5m5 5H3m10-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6",
    close: "M6 6l12 12M18 6 6 18",
    bank: "M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 4H3l9-4Z",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function instrumentType(type: string) {
  return ({
    EQUITY: "주식", ETF: "ETF", LEVERAGED_ETF: "레버리지 ETF", OPTION_CALL: "콜옵션", OPTION_PUT: "풋옵션",
  } as Record<string, string>)[type] ?? type;
}

function formatDeviceCode(value: string) {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

function commandLabel(action: string) {
  return ({ buy: "매수", sell: "매도", search: "조회", option: "옵션" } as Record<string, string>)[action] ?? action;
}

function statusLabel(status: string) {
  return ({ pending: "전달 대기", dispatched: "처리 중", accepted: "완료", rejected: "거절", offline: "접속 필요" } as Record<string, string>)[status] ?? status;
}

function StockChart({ item }: { item: Instrument }) {
  const rising = item.change_percent >= 0;
  const points = useMemo(() => {
    const drift = Math.max(-22, Math.min(22, item.change_percent));
    return Array.from({ length: 42 }, (_, index) => {
      const progress = index / 41;
      const wave = Math.sin(index * 0.82) * 3.8 + Math.sin(index * 0.31 + 1.3) * 2.4;
      return 54 - drift * progress - wave;
    });
  }, [item.change_percent]);
  const line = points.map((value, index) => `${(index / 41) * 100},${Math.max(12, Math.min(88, value))}`).join(" ");
  const area = `0,100 ${line} 100,100`;
  const previousClose = item.price_won / (1 + item.change_percent / 100 || 1);

  return (
    <div className="price-chart" data-trend={rising ? "rise" : "fall"}>
      <div className="chart-toolbar">
        <div className="chart-periods" aria-label="차트 기간"><button className="active">1일</button><button>1주</button><button>1달</button><button>1년</button></div>
        <span>현재가 기준 흐름</span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${item.name} 가격 흐름`}>
        <defs><linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopOpacity="0.28" /><stop offset="1" stopOpacity="0" /></linearGradient></defs>
        <g className="chart-grid"><path d="M0 20H100M0 40H100M0 60H100M0 80H100" /><path d="M20 0V100M40 0V100M60 0V100M80 0V100" /></g>
        <polygon points={area} className="chart-area" />
        <polyline points={line} className="chart-line" />
      </svg>
      <div className="chart-axis"><span>전일 종가 {won.format(previousClose)}</span><span>현재 {won.format(item.price_won)}</span></div>
    </div>
  );
}

export default function MarketPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KR" | "US">("ALL");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [notice, setNotice] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [connection, setConnection] = useState<"연결 중" | "연결됨" | "다시 연결 중">("연결 중");
  const [option, setOption] = useState({ underlying: "AAPL", expiry: "", strike: "", side: "call" });

  const loadSnapshot = useCallback(async () => {
    const response = await fetch("/api/market/snapshot", { cache: "no-store" });
    if (!response.ok) { setSnapshot({ authenticated: false }); return; }
    const next = await response.json() as Snapshot;
    setSnapshot(next);
    setSelected((current) => current ?? next.instruments?.[0] ?? null);
  }, []);

  useEffect(() => {
    const login = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        history.replaceState(null, "", "/market");
        let loggedIn = false;
        for (let attempt = 0; attempt < 6 && !loggedIn; attempt += 1) {
          const response = await fetch("/api/market/login", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }),
          });
          loggedIn = response.ok;
          if (!loggedIn && attempt < 5) await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (!loggedIn) {
          setLoginCode(formatDeviceCode(code));
          setNotice("코드가 만료됐거나 이미 사용됐습니다. 게임에서 /주식을 다시 입력해 주세요.");
        }
      }
      await loadSnapshot();
      setLoading(false);
    };
    void login();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!snapshot.authenticated) return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch("/api/market/snapshot", { cache: "no-store" });
        if (!response.ok) throw new Error("snapshot unavailable");
        const next = await response.json() as Snapshot;
        if (!stopped) {
          setSnapshot(next);
          setSelected((current) => current ?? next.instruments?.[0] ?? null);
          setConnection("연결됨");
        }
      } catch {
        if (!stopped) setConnection("다시 연결 중");
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, [snapshot.authenticated]);

  const instruments = useMemo(() => snapshot.instruments ?? [], [snapshot.instruments]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return instruments.filter((item) => (marketFilter === "ALL" || item.market === marketFilter) &&
      (!needle || `${item.symbol} ${item.name}`.toLowerCase().includes(needle))).slice(0, 80);
  }, [instruments, marketFilter, query]);
  const positions = snapshot.player?.positions ?? [];
  const commands = snapshot.commands ?? [];
  const portfolioWon = positions.reduce((sum, item) => sum + Number(item.valueWon || 0), 0);
  const profitWon = positions.reduce((sum, item) => sum + Number(item.profitWon || 0), 0);
  const totalAssetWon = (snapshot.player?.cash_won ?? 0) + portfolioWon;
  const selectedPosition = positions.find((item) => item.symbol === selected?.symbol);
  const heldQuantity = Number(String(selectedPosition?.quantity ?? "0").replace(/,/g, "")) || 0;
  const maxQuantity = selected ? (side === "buy" ? Math.floor((snapshot.player?.cash_won ?? 0) / selected.price_won) : Math.floor(heldQuantity)) : 0;
  const orderQuantity = Number(quantity) || 0;
  const orderTotal = selected ? selected.price_won * orderQuantity : 0;
  const changeAmount = selected ? Math.round(selected.price_won - selected.price_won / (1 + selected.change_percent / 100 || 1)) : 0;

  const sendTrade = async (payload: Record<string, string>) => {
    if (connection !== "연결됨") { setNotice("연결된 뒤 다시 시도해 주세요."); return; }
    setOrdering(true);
    try {
      const response = await fetch("/api/market/order", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { message?: string };
      setNotice(result.message ?? (response.ok ? "주문을 전달했습니다." : "주문을 처리하지 못했습니다."));
    } catch {
      setNotice("서버 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setOrdering(false);
    }
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || orderQuantity <= 0) { setNotice("주문 수량을 확인해 주세요."); return; }
    void sendTrade({ action: side, symbol: selected.symbol, quantity });
  };

  const registerSearch = () => {
    const symbol = query.trim().toUpperCase();
    if (/^[A-Z0-9.^=-]{1,32}$/.test(symbol)) void sendTrade({ action: "search", symbol, quantity: "" });
    else setNotice("정확한 종목 심볼을 입력하세요.");
  };

  const submitOption = (event: FormEvent) => {
    event.preventDefault();
    void sendTrade({ action: "option", symbol: option.underlying.toUpperCase(), quantity: `${option.expiry}|${option.strike}|${option.side}` });
  };

  const logout = async () => { await fetch("/api/market/login", { method: "DELETE" }); location.reload(); };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (loginCode.replace("-", "").length !== 8) { setNotice("8자리 로그인 코드를 입력해 주세요."); return; }
    setSubmittingLogin(true);
    setNotice("");
    const response = await fetch("/api/market/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: loginCode }),
    });
    if (!response.ok) {
      setNotice("코드가 만료됐거나 이미 사용됐습니다. 게임에서 /주식을 다시 입력해 주세요.");
      setSubmittingLogin(false);
      return;
    }
    await loadSnapshot();
    setSubmittingLogin(false);
  };

  if (loading) return <main className="market-shell"><div className="market-loading" role="status">로그인 확인 중</div></main>;

  if (!snapshot.authenticated) return (
    <main className="market-shell market-login">
      <Link className="market-wordmark" href="/"><span className="brand-mark">T</span><b>택병증권</b></Link>
      <section className="login-card">
        <span className="login-symbol"><Icon name="chart" /></span>
        <h1>택병증권 로그인</h1>
        <p>게임에서 <code>/주식</code>을 입력한 뒤 표시된 코드를 입력하세요.</p>
        <form className="device-login-form" onSubmit={submitLogin}>
          <label htmlFor="login-code">로그인 코드</label>
          <input id="login-code" autoFocus autoComplete="one-time-code" inputMode="text" placeholder="ABCD-EFGH"
            value={loginCode} onChange={(event) => setLoginCode(formatDeviceCode(event.target.value))} />
          <button className="secondary-button" disabled={submittingLogin}>{submittingLogin ? "확인 중" : "로그인"}</button>
        </form>
        {notice && <div className="market-alert" role="alert">{notice}</div>}
        <Link className="login-back" href="/">홈으로 돌아가기</Link>
      </section>
    </main>
  );

  return (
    <main className="market-shell terminal-shell">
      <header className="market-header">
        <Link className="market-wordmark" href="/"><span className="brand-mark">T</span><b>택병증권</b></Link>
        <nav aria-label="증권 메뉴"><button className="active">홈</button><a href="#quotes">종목</a><a href="#portfolio">내 자산</a></nav>
        <label className="top-search"><Icon name="search" /><span className="sr-only">종목 검색</span><input value={query}
          onChange={(event) => setQuery(event.target.value)} placeholder="종목명 또는 심볼 검색" /></label>
        <div className="market-status"><i className={connection === "연결됨" ? "live" : ""} />{connection}</div>
        <button className="icon-button" onClick={logout} aria-label="로그아웃"><Icon name="logout" /></button>
      </header>

      <section className="ticker-strip" aria-label="자산 요약">
        <div><span>총자산</span><strong>{won.format(totalAssetWon)}</strong></div>
        <div><span>보유 현금</span><strong>{won.format(snapshot.player?.cash_won ?? 0)}</strong></div>
        <div><span>투자 평가액</span><strong>{won.format(portfolioWon)}</strong></div>
        <div><span>평가 손익</span><strong className={profitWon >= 0 ? "rise" : "fall"}>{profitWon >= 0 ? "+" : ""}{won.format(profitWon)}</strong></div>
        <span className={snapshot.player?.online ? "session-online" : "session-offline"}>{snapshot.player?.online ? "게임 접속 중" : "게임 접속 필요"}</span>
      </section>

      {notice && <div className="market-alert terminal-alert" role="status" aria-live="polite">{notice}<button onClick={() => setNotice("")} aria-label="알림 닫기"><Icon name="close" /></button></div>}

      {selected && <section className="stock-overview" aria-labelledby="selected-stock-title">
        <div className="stock-identity"><span className="stock-avatar">{selected.name.slice(0, 1)}</span><div><h1 id="selected-stock-title">{selected.name}</h1><p>{selected.symbol} · {selected.market === "KR" ? "국내" : "해외"} · {instrumentType(selected.type)}</p></div></div>
        <div className="stock-price"><strong>{won.format(selected.price_won)}</strong><span className={selected.change_percent >= 0 ? "rise" : "fall"}>{changeAmount >= 0 ? "+" : ""}{won.format(changeAmount)} ({percent.format(selected.change_percent)}%)</span></div>
        <dl><div><dt>보유 수량</dt><dd>{selectedPosition ? `${selectedPosition.quantity}${selectedPosition.unit}` : "-"}</dd></div><div><dt>평가 금액</dt><dd>{selectedPosition ? won.format(selectedPosition.valueWon) : "-"}</dd></div><div><dt>평가 손익</dt><dd className={(selectedPosition?.profitWon ?? 0) >= 0 ? "rise" : "fall"}>{selectedPosition ? `${selectedPosition.profitWon >= 0 ? "+" : ""}${won.format(selectedPosition.profitWon)}` : "-"}</dd></div></dl>
      </section>}

      <div className="market-tabs" role="tablist" aria-label="종목 메뉴"><button className="active" role="tab" aria-selected="true">차트 · 주문</button><a href="#portfolio" role="tab">보유 종목</a><a href="#options" role="tab">옵션</a><a href="#banking" role="tab">예금</a></div>

      <div className="terminal-grid">
        <section className="terminal-panel chart-panel" aria-labelledby="chart-title">
          <div className="terminal-panel-head"><div><Icon name="chart" /><h2 id="chart-title">차트</h2></div><span>{selected ? new Date(selected.updated_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-"} 기준</span></div>
          {selected ? <StockChart item={selected} /> : <div className="empty-state">종목을 선택하세요.</div>}
        </section>

        <section className="terminal-panel quote-panel" id="quotes" aria-labelledby="quotes-title">
          <div className="terminal-panel-head"><div><Icon name="wallet" /><h2 id="quotes-title">종목</h2></div><span>{filtered.length}</span></div>
          <div className="market-filter" role="group" aria-label="시장 선택"><button className={marketFilter === "ALL" ? "active" : ""} onClick={() => setMarketFilter("ALL")}>전체</button><button className={marketFilter === "KR" ? "active" : ""} onClick={() => setMarketFilter("KR")}>국내</button><button className={marketFilter === "US" ? "active" : ""} onClick={() => setMarketFilter("US")}>해외</button></div>
          <div className="quote-list" role="list">
            {filtered.map((item) => <button key={item.symbol} role="listitem" className={selected?.symbol === item.symbol ? "selected" : ""} onClick={() => setSelected(item)}>
              <span className="quote-name"><i>{item.name.slice(0, 1)}</i><span><b>{item.name}</b><small>{item.symbol}</small></span></span>
              <span className="price"><b>{won.format(item.price_won)}</b><small className={item.change_percent >= 0 ? "rise" : "fall"}>{percent.format(item.change_percent)}%</small></span>
            </button>)}
            {!filtered.length && <div className="empty-state"><p>검색 결과가 없습니다.</p><button onClick={registerSearch}>“{query}” 서버 조회</button></div>}
          </div>
        </section>

        <aside className="terminal-panel order-panel" aria-labelledby="order-title">
          <div className="terminal-panel-head"><div><h2 id="order-title">일반주문</h2></div><span>{side === "buy" ? "구매" : "판매"}</span></div>
          {selected ? <form onSubmit={submitOrder}>
            <div className="segmented"><button type="button" className={side === "buy" ? "active buy" : ""} onClick={() => setSide("buy")}>매수</button><button type="button" className={side === "sell" ? "active sell" : ""} onClick={() => setSide("sell")}>매도</button></div>
            <label>가격<div className="input-with-unit"><input value={integer.format(selected.price_won)} readOnly aria-label="주문 가격" /><span>원</span></div></label>
            <label>수량<div className="input-with-unit"><input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/[^0-9.]/g, ""))} aria-label="주문 수량" /><span>{selected.unit}</span></div></label>
            <div className="quick-quantity" aria-label="빠른 수량"><button type="button" onClick={() => setQuantity(String(Math.max(1, Math.floor(maxQuantity * 0.1))))}>10%</button><button type="button" onClick={() => setQuantity(String(Math.max(1, Math.floor(maxQuantity * 0.25))))}>25%</button><button type="button" onClick={() => setQuantity(String(Math.max(1, Math.floor(maxQuantity * 0.5))))}>50%</button><button type="button" onClick={() => setQuantity(String(Math.max(1, maxQuantity)))}>최대</button></div>
            <dl className="order-total"><div><dt>총 주문 금액</dt><dd>{won.format(orderTotal)}</dd></div><div><dt>{side === "buy" ? "주문 가능" : "보유 수량"}</dt><dd>{side === "buy" ? won.format(snapshot.player?.cash_won ?? 0) : `${selectedPosition?.quantity ?? 0}${selected.unit}`}</dd></div></dl>
            <button className={`primary-order ${side}`} disabled={!snapshot.player?.online || connection !== "연결됨" || ordering}>{ordering ? "전달 중" : `${side === "buy" ? "매수" : "매도"} 주문`}</button>
          </form> : <div className="empty-state">종목을 선택하세요.</div>}
        </aside>
      </div>

      <section className="terminal-panel portfolio-panel" id="portfolio" aria-labelledby="portfolio-title">
        <div className="terminal-panel-head"><div><Icon name="wallet" /><h2 id="portfolio-title">보유 종목</h2></div><span>{positions.length}개</span></div>
        <div className="data-table portfolio-table" role="table">
          <div className="table-row table-head" role="row"><span>종목</span><span>수량</span><span>평가 금액</span><span>평가 손익</span></div>
          {positions.length ? positions.map((item) => <button className="table-row" role="row" key={item.symbol} onClick={() => setSelected(instruments.find((stock) => stock.symbol === item.symbol) ?? null)}><span><b>{item.name}</b><small>{item.symbol}</small></span><span>{item.quantity}{item.unit}</span><span>{won.format(item.valueWon)}</span><span className={item.profitWon >= 0 ? "rise" : "fall"}>{item.profitWon >= 0 ? "+" : ""}{won.format(item.profitWon)}</span></button>) : <div className="empty-state">아직 보유 종목이 없습니다.</div>}
        </div>
      </section>

      <div className="terminal-lower-grid">
        <section className="terminal-panel command-panel" aria-labelledby="commands-title">
          <div className="terminal-panel-head"><div><Icon name="clock" /><h2 id="commands-title">최근 주문</h2></div><span>최대 12건</span></div>
          <div className="data-table command-table">
            <div className="table-row table-head"><span>구분</span><span>종목</span><span>수량</span><span>상태</span></div>
            {commands.slice(0, 12).map((command) => <div className="table-row" key={command.id}><span className={command.action === "buy" ? "rise" : command.action === "sell" ? "fall" : ""}>{commandLabel(command.action)}</span><span>{command.symbol}</span><span>{command.quantity || "-"}</span><span>{statusLabel(command.status)}</span></div>)}
            {!commands.length && <div className="empty-state">최근 주문이 없습니다.</div>}
          </div>
        </section>

        <section className="terminal-panel option-card" id="options" aria-labelledby="option-title">
          <div className="terminal-panel-head"><div><Icon name="chart" /><h2 id="option-title">미국 옵션 조회</h2></div><span>1계약 = 100주</span></div>
          <form onSubmit={submitOption}><label>기초자산<input value={option.underlying} onChange={(event) => setOption({ ...option, underlying: event.target.value })} /></label><label>만기일<input type="date" value={option.expiry} onChange={(event) => setOption({ ...option, expiry: event.target.value })} /></label><label>행사가<input inputMode="decimal" value={option.strike} onChange={(event) => setOption({ ...option, strike: event.target.value })} /></label><label>종류<select value={option.side} onChange={(event) => setOption({ ...option, side: event.target.value })}><option value="call">콜</option><option value="put">풋</option></select></label><button className="secondary-button">계약 조회</button></form>
        </section>

        <section className="terminal-panel bank-card" id="banking" aria-labelledby="bank-title">
          <div className="terminal-panel-head"><div><Icon name="bank" /><h2 id="bank-title">예금 · 적금</h2></div><span>{snapshot.player?.accounts?.length ?? 0}개</span></div>
          <div className="account-list">{snapshot.player?.accounts?.length ? snapshot.player.accounts.map((account) => <article key={account.id}><span><b>{account.name}</b><small>만기 {new Date(account.maturityAt).toLocaleDateString("ko-KR")}</small></span><strong>{won.format(account.principalWon)}</strong></article>) : <div className="empty-state">가입한 상품이 없습니다.</div>}</div>
        </section>
      </div>
    </main>
  );
}
