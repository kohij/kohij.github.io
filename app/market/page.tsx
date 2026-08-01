"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function Icon({ name }: { name: "shield" | "search" | "chart" | "bank" }) {
  const path = name === "shield" ? "M12 3 5 6v5c0 4.8 3 8 7 10 4-2 7-5.2 7-10V6l-7-3Zm-3 9 2 2 4-5"
    : name === "search" ? "m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
    : name === "bank" ? "M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 4H3l9-4Z"
    : "M4 19V9m5 10V5m5 14v-7m5 7V3";
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>;
}

export default function MarketPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [notice, setNotice] = useState("");
  const [connection, setConnection] = useState<"연결 중" | "실시간 연결" | "재연결 중">("연결 중");
  const [option, setOption] = useState({ underlying: "AAPL", expiry: "", strike: "", side: "call" });
  const socketRef = useRef<WebSocket | null>(null);

  const loadSnapshot = useCallback(async () => {
    const response = await fetch("/api/market/snapshot", { cache: "no-store" });
    if (!response.ok) { setSnapshot({ authenticated: false }); return; }
    const next = await response.json() as Snapshot;
    setSnapshot(next);
    if (!selected && next.instruments?.length) setSelected(next.instruments[0]);
  }, [selected]);

  useEffect(() => {
    const login = async () => {
      const match = window.location.hash.match(/^#login=(.+)$/);
      if (match) {
        history.replaceState(null, "", "/market");
        const response = await fetch("/api/market/login", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: match[1] }),
        });
        if (!response.ok) {
          const body = await response.json() as { error?: string };
          setNotice(body.error === "ip_mismatch" ? "게임과 같은 인터넷 연결에서 다시 여세요." : "로그인 링크가 만료됐거나 이미 사용됐습니다.");
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
    let timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${location.host}/api/market/ws`);
      socketRef.current = socket;
      socket.onopen = () => { setConnection("실시간 연결"); socket.send(JSON.stringify({ type: "poll" })); };
      socket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as Snapshot & { type?: string; message?: string };
        if (message.type === "snapshot") setSnapshot(message);
        if (message.message) setNotice(message.message);
      };
      socket.onclose = () => {
        if (!stopped) { setConnection("재연결 중"); timer = setTimeout(connect, 2500); }
      };
    };
    connect();
    const poll = setInterval(() => socketRef.current?.readyState === WebSocket.OPEN &&
      socketRef.current.send(JSON.stringify({ type: "poll" })), 2500);
    return () => { stopped = true; clearInterval(poll); clearTimeout(timer); socketRef.current?.close(); };
  }, [snapshot.authenticated]);

  const instruments = useMemo(() => snapshot.instruments ?? [], [snapshot.instruments]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return instruments.filter((item) => !needle || `${item.symbol} ${item.name}`.toLowerCase().includes(needle)).slice(0, 80);
  }, [instruments, query]);
  const positions = snapshot.player?.positions ?? [];
  const portfolioWon = positions.reduce((sum, item) => sum + Number(item.valueWon || 0), 0);

  const sendTrade = (payload: Record<string, string>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) { setNotice("실시간 연결 후 다시 시도하세요."); return; }
    socket.send(JSON.stringify({ type: "trade", ...payload }));
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    sendTrade({ action: side, symbol: selected.symbol, quantity });
  };

  const registerSearch = () => {
    const symbol = query.trim().toUpperCase();
    if (/^[A-Z0-9.^=-]{1,32}$/.test(symbol)) sendTrade({ action: "search", symbol, quantity: "" });
    else setNotice("정확한 종목 심볼을 입력하세요.");
  };

  const submitOption = (event: FormEvent) => {
    event.preventDefault();
    sendTrade({ action: "option", symbol: option.underlying.toUpperCase(), quantity: `${option.expiry}|${option.strike}|${option.side}` });
  };

  const logout = async () => { await fetch("/api/market/login", { method: "DELETE" }); location.reload(); };

  if (loading) return <main className="market-shell"><div className="market-loading" role="status">보안 세션 확인 중</div></main>;

  if (!snapshot.authenticated) return (
    <main className="market-shell market-login">
      <Link className="market-wordmark" href="/"><b>택병증권</b><span>게임머니 투자</span></Link>
      <section className="login-card">
        <div className="secure-icon"><Icon name="shield" /></div>
        <p className="eyebrow">SECURE GAME LINK</p>
        <h1>게임에서 로그인하세요</h1>
        <p>Minecraft 채팅에 <code>/주식</code> 입력. 포트폴리오와 함께 뜨는 링크는 5분·1회·현재 IP에서만 유효합니다.</p>
        {notice && <div className="market-alert" role="alert">{notice}</div>}
        <div className="login-steps"><span>1</span><b>/주식</b><i /><span>2</span><b>링크 클릭</b><i /><span>3</span><b>웹 거래</b></div>
        <Link className="secondary-button" href="/">서버 가이드로</Link>
      </section>
    </main>
  );

  return (
    <main className="market-shell">
      <header className="market-header">
        <Link className="market-wordmark" href="/"><b>택병증권</b><span>게임머니 투자</span></Link>
        <div className="market-status"><i className={connection === "실시간 연결" ? "live" : ""} />{connection}</div>
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
          <div className="panel-title"><div><Icon name="chart" /><h2 id="quotes-title">종목</h2></div><span>{instruments.length}개 활성</span></div>
          <label className="market-search"><span>종목명 또는 심볼</span><div><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 삼성전자, AAPL, TQQQ" /></div></label>
          <div className="quote-list" role="list">
            {filtered.map((item) => <button key={item.symbol} role="listitem" className={selected?.symbol === item.symbol ? "selected" : ""} onClick={() => setSelected(item)}>
              <span><b>{item.name}</b><small>{item.symbol} · {item.type.replaceAll("_", " ")}</small></span>
              <span className="price"><b>{won.format(item.price_won)}</b><small className={item.change_percent >= 0 ? "rise" : "fall"}>{percent.format(item.change_percent)}%</small></span>
            </button>)}
            {!filtered.length && <div className="empty-state"><p>활성 종목 없음</p><button onClick={registerSearch}>“{query}” 서버 등록·시세 조회</button></div>}
          </div>
        </section>

        <aside className="order-panel" aria-labelledby="order-title">
          <div className="panel-title"><div><h2 id="order-title">주문</h2></div><span>WebSocket</span></div>
          {selected ? <form onSubmit={submitOrder}>
            <div className="selected-stock"><small>{selected.symbol}</small><h3>{selected.name}</h3><strong>{won.format(selected.price_won)}</strong></div>
            <div className="segmented"><button type="button" className={side === "buy" ? "active buy" : ""} onClick={() => setSide("buy")}>매수</button><button type="button" className={side === "sell" ? "active sell" : ""} onClick={() => setSide("sell")}>매도</button></div>
            <label>수량<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
            <button className={`primary-order ${side}`} disabled={!snapshot.player?.online || connection !== "실시간 연결"}>{side === "buy" ? "매수 주문" : "매도 주문"}</button>
            <p className="order-note">실제 시세 기반 게임머니 모의거래. 현금화·출금 불가.</p>
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
          <form onSubmit={submitOption}><label>기초자산<input value={option.underlying} onChange={(event) => setOption({ ...option, underlying: event.target.value })} /></label><label>만기일<input type="date" value={option.expiry} onChange={(event) => setOption({ ...option, expiry: event.target.value })} /></label><label>행사가<input inputMode="decimal" value={option.strike} onChange={(event) => setOption({ ...option, strike: event.target.value })} /></label><label>종류<select value={option.side} onChange={(event) => setOption({ ...option, side: event.target.value })}><option value="call">콜</option><option value="put">풋</option></select></label><button className="secondary-button">실제 계약 조회·등록</button></form>
        </section>
        <section className="market-section bank-card" aria-labelledby="bank-title">
          <div className="panel-title"><div><Icon name="bank" /><h2 id="bank-title">적금·장기예금</h2></div><span>/은행에서 가입</span></div>
          <div className="account-list">{snapshot.player?.accounts?.length ? snapshot.player.accounts.map((account) => <article key={account.id}><span><b>{account.name}</b><small>{account.id} · 만기 {new Date(account.maturityAt).toLocaleDateString("ko-KR")}</small></span><strong>{won.format(account.principalWon)}</strong></article>) : <div className="empty-state"><p>가입 상품 없음. 게임에서 <code>/은행 상품</code></p></div>}</div>
        </section>
      </div>
    </main>
  );
}
