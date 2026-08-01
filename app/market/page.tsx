"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Instrument = {
  symbol: string; name: string; market: string; currency: string; type: string; unit: string;
  price_won: number; change_percent: number; updated_at: number;
};
type Position = { symbol: string; name: string; type: string; unit: string; quantity: string; valueWon: number; profitWon: number };
type Account = { id: string; name: string; type: string; principalWon: number; maturityAt: number };
type Snapshot = {
  authenticated: boolean;
  player?: { player_name: string; cash_won: number; online: boolean; positions: Position[]; accounts: Account[]; updated_at: number };
  instruments?: Instrument[];
  commands?: Array<{ id: string; action: string; symbol: string; quantity: string; status: string; message: string }>;
};

const won = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("ko-KR", { signDisplay: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Icon({ name }: { name: "search" | "chart" | "bank" }) {
  const path = name === "search" ? "m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
    : name === "bank" ? "M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 4H3l9-4Z"
    : "M4 19V9m5 10V5m5 14v-7m5 7V3";
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>;
}

function instrumentType(type: string) {
  return ({
    EQUITY: "주식",
    ETF: "ETF",
    LEVERAGED_ETF: "레버리지 ETF",
    OPTION_CALL: "콜옵션",
    OPTION_PUT: "풋옵션",
  } as Record<string, string>)[type] ?? type;
}

function formatDeviceCode(value: string) {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export default function MarketPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [notice, setNotice] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [submittingLogin, setSubmittingLogin] = useState(false);
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
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code }),
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
    return instruments.filter((item) => !needle || `${item.symbol} ${item.name}`.toLowerCase().includes(needle)).slice(0, 80);
  }, [instruments, query]);
  const positions = snapshot.player?.positions ?? [];
  const portfolioWon = positions.reduce((sum, item) => sum + Number(item.valueWon || 0), 0);

  const sendTrade = async (payload: Record<string, string>) => {
    if (connection !== "연결됨") { setNotice("연결된 뒤 다시 시도해 주세요."); return; }
    const response = await fetch("/api/market/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { message?: string };
    setNotice(result.message ?? (response.ok ? "주문을 전달했습니다." : "주문을 처리하지 못했습니다."));
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
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
    if (loginCode.replace("-", "").length !== 8) {
      setNotice("8자리 로그인 코드를 입력해 주세요.");
      return;
    }
    setSubmittingLogin(true);
    setNotice("");
    const response = await fetch("/api/market/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: loginCode }),
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
      <Link className="market-wordmark" href="/"><b>택병증권</b></Link>
      <section className="login-card">
        <h1>로그인</h1>
        <p>게임에서 <code>/주식</code>을 입력한 뒤 표시된 코드를 입력하세요.</p>
        <form className="device-login-form" onSubmit={submitLogin}>
          <label htmlFor="login-code">로그인 코드</label>
          <input
            id="login-code"
            autoFocus
            autoComplete="one-time-code"
            inputMode="text"
            placeholder="ABCD-EFGH"
            value={loginCode}
            onChange={(event) => setLoginCode(formatDeviceCode(event.target.value))}
          />
          <button className="secondary-button" disabled={submittingLogin}>
            {submittingLogin ? "확인 중" : "로그인"}
          </button>
        </form>
        {notice && <div className="market-alert" role="alert">{notice}</div>}
        <Link className="login-back" href="/">서버 가이드로</Link>
      </section>
    </main>
  );

  return (
    <main className="market-shell">
      <header className="market-header">
        <Link className="market-wordmark" href="/"><b>택병증권</b></Link>
        <div className="market-status"><i className={connection === "연결됨" ? "live" : ""} />{connection}</div>
        <button className="text-button" onClick={logout}>로그아웃</button>
      </header>

      <section className="asset-summary" aria-labelledby="asset-title">
        <div><p id="asset-title">{snapshot.player?.player_name}님의 총자산</p><strong>{won.format((snapshot.player?.cash_won ?? 0) + portfolioWon)}</strong></div>
        <dl><div><dt>보유 현금</dt><dd>{won.format(snapshot.player?.cash_won ?? 0)}</dd></div><div><dt>투자 평가액</dt><dd>{won.format(portfolioWon)}</dd></div></dl>
        <span className={snapshot.player?.online ? "online" : "offline"}>{snapshot.player?.online ? "게임 접속 중 · 거래 가능" : "게임 접속 필요"}</span>
      </section>

      {notice && <div className="market-alert" role="status" aria-live="polite">{notice}<button onClick={() => setNotice("")} aria-label="알림 닫기">×</button></div>}

      <div className="market-grid">
        <section className="quote-panel" aria-labelledby="quotes-title">
          <div className="panel-title"><div><Icon name="chart" /><h2 id="quotes-title">종목</h2></div><span>{instruments.length}개</span></div>
          <label className="market-search"><span>종목명 또는 심볼</span><div><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 삼성전자, AAPL, TQQQ" /></div></label>
          <div className="quote-list" role="list">
            {filtered.map((item) => <button key={item.symbol} role="listitem" className={selected?.symbol === item.symbol ? "selected" : ""} onClick={() => setSelected(item)}>
              <span><b>{item.name}</b><small>{item.symbol} · {instrumentType(item.type)}</small></span>
              <span className="price"><b>{won.format(item.price_won)}</b><small className={item.change_percent >= 0 ? "rise" : "fall"}>{percent.format(item.change_percent)}%</small></span>
            </button>)}
            {!filtered.length && <div className="empty-state"><p>활성 종목 없음</p><button onClick={registerSearch}>“{query}” 서버 등록·시세 조회</button></div>}
          </div>
        </section>

        <aside className="order-panel" aria-labelledby="order-title">
          <div className="panel-title"><div><h2 id="order-title">주문</h2></div></div>
          {selected ? <form onSubmit={submitOrder}>
            <div className="selected-stock"><small>{selected.symbol}</small><h3>{selected.name}</h3><strong>{won.format(selected.price_won)}</strong></div>
            <div className="segmented"><button type="button" className={side === "buy" ? "active buy" : ""} onClick={() => setSide("buy")}>매수</button><button type="button" className={side === "sell" ? "active sell" : ""} onClick={() => setSide("sell")}>매도</button></div>
            <label>수량<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
            <button className={`primary-order ${side}`} disabled={!snapshot.player?.online || connection !== "연결됨"}>{side === "buy" ? "매수 주문" : "매도 주문"}</button>
          </form> : <div className="empty-state"><p>종목을 선택하세요</p></div>}
        </aside>
      </div>

      <section className="market-section" aria-labelledby="holdings-title">
        <div className="panel-title"><div><Icon name="chart" /><h2 id="holdings-title">보유 종목</h2></div></div>
        <div className="holdings-list">{positions.length ? positions.map((item) => <button key={item.symbol} onClick={() => setSelected(instruments.find((stock) => stock.symbol === item.symbol) ?? null)}><span><b>{item.name}</b><small>{item.quantity}{item.unit} · {item.symbol}</small></span><span><b>{won.format(item.valueWon)}</b><small className={item.profitWon >= 0 ? "rise" : "fall"}>{item.profitWon >= 0 ? "+" : ""}{won.format(item.profitWon)}</small></span></button>) : <div className="empty-state"><p>아직 보유 종목이 없습니다.</p></div>}</div>
      </section>

      <div className="market-lower-grid">
        <section className="market-section option-card" aria-labelledby="option-title">
          <div className="panel-title"><div><Icon name="chart" /><h2 id="option-title">미국 콜·풋 옵션 등록</h2></div><span>1계약 = 100주</span></div>
          <form onSubmit={submitOption}><label>기초자산<input value={option.underlying} onChange={(event) => setOption({ ...option, underlying: event.target.value })} /></label><label>만기일<input type="date" value={option.expiry} onChange={(event) => setOption({ ...option, expiry: event.target.value })} /></label><label>행사가<input inputMode="decimal" value={option.strike} onChange={(event) => setOption({ ...option, strike: event.target.value })} /></label><label>종류<select value={option.side} onChange={(event) => setOption({ ...option, side: event.target.value })}><option value="call">콜</option><option value="put">풋</option></select></label><button className="secondary-button">계약 조회</button></form>
        </section>
        <section className="market-section bank-card" aria-labelledby="bank-title">
          <div className="panel-title"><div><Icon name="bank" /><h2 id="bank-title">적금·장기예금</h2></div><span>/은행에서 가입</span></div>
          <div className="account-list">{snapshot.player?.accounts?.length ? snapshot.player.accounts.map((account) => <article key={account.id}><span><b>{account.name}</b><small>만기 {new Date(account.maturityAt).toLocaleDateString("ko-KR")}</small></span><strong>{won.format(account.principalWon)}</strong></article>) : <div className="empty-state"><p>가입 상품 없음. 게임에서 <code>/은행 상품</code></p></div>}</div>
        </section>
      </div>
    </main>
  );
}
