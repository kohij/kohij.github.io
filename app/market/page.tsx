"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StockChart, { type ChartCandle } from "./StockChart";

type Instrument = {
  symbol: string; name: string; market: string; currency: string; type: string; unit: string;
  price_won: number; change_percent: number; updated_at: number; candles: ChartCandle[];
};
type Position = { symbol: string; name: string; type: string; unit: string; quantity: string; valueWon: number; profitWon: number };
type Account = {
  id: string; name: string; type: "SAVINGS" | "DEPOSIT"; principalWon: number; installmentWon: number;
  paidCount: number; totalPayments: number; rate: number; nextPaymentAt: number; maturityAt: number;
};
type Command = { id: string; action: string; symbol: string; quantity: string; status: string; message: string };
type Snapshot = {
  authenticated: boolean;
  player?: { player_name: string; cash_won: number; online: boolean; positions: Position[]; accounts: Account[]; updated_at: number };
  instruments?: Instrument[];
  commands?: Command[];
};
type AssetFilter = "ALL" | "EQUITY" | "ETF" | "LEVERAGED_ETF" | "OPTION";
type BankProduct = {
  id: string; action: "bank_savings" | "bank_deposit"; term: string; name: string; kind: string;
  days: number; rate: number; payments: number; description: string;
};
type OptionLeg = { last: number | null; bid: number | null; ask: number | null; volume: number | null; openInterest: number | null };
type OptionContract = { expiry: string; strike: number; call: OptionLeg; put: OptionLeg };
type OptionChain = { symbol: string; name: string; lastTrade: string; contracts: OptionContract[] };
type CommunityPost = {
  id: string; playerName: string; symbol: string; body: string; stance: string;
  holderVerified: number; createdAt: number; reactionCount: number; reacted: number; mine: number;
};
type RankingPlayer = {
  rank: number; playerName: string; online: boolean; mine: boolean; totalAssetWon: number; cashWon: number;
  portfolioWon: number; bankWon: number; profitWon: number; positionCount: number; accountCount: number; updatedAt: number;
};
type PublicAccount = { name: string; type: string; principalWon: number; rate: number; maturityAt: number };
type PublicProfile = RankingPlayer & { positions: Position[]; accounts: PublicAccount[] };

const won = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("ko-KR", { signDisplay: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const optionPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bankProducts: BankProduct[] = [
  { id: "savings-7", action: "bank_savings", term: "7D", name: "7일 적금", kind: "매일 납입", days: 7, rate: 0.02, payments: 7, description: "같은 금액을 매일 7회 납입" },
  { id: "savings-30", action: "bank_savings", term: "30D", name: "30일 적금", kind: "매일 납입", days: 30, rate: 0.10, payments: 30, description: "같은 금액을 매일 30회 납입" },
  { id: "deposit-30", action: "bank_deposit", term: "30D", name: "30일 예금", kind: "한 번에 예치", days: 30, rate: 0.06, payments: 1, description: "가입할 때 전액 예치" },
  { id: "deposit-90", action: "bank_deposit", term: "90D", name: "90일 예금", kind: "한 번에 예치", days: 90, rate: 0.20, payments: 1, description: "가입할 때 전액 예치" },
];
const leverageProducts: Record<string, { benchmark: string; multiple: string }> = {
  TQQQ: { benchmark: "나스닥100", multiple: "+3배" }, SQQQ: { benchmark: "나스닥100", multiple: "-3배" },
  UPRO: { benchmark: "S&P 500", multiple: "+3배" }, SPXU: { benchmark: "S&P 500", multiple: "-3배" },
  SOXL: { benchmark: "미국 반도체", multiple: "+3배" }, SOXS: { benchmark: "미국 반도체", multiple: "-3배" },
  TECL: { benchmark: "미국 기술주", multiple: "+3배" }, TECS: { benchmark: "미국 기술주", multiple: "-3배" },
  FAS: { benchmark: "미국 금융주", multiple: "+3배" }, FAZ: { benchmark: "미국 금융주", multiple: "-3배" },
  TNA: { benchmark: "러셀2000", multiple: "+3배" }, TZA: { benchmark: "러셀2000", multiple: "-3배" },
  LABU: { benchmark: "미국 바이오", multiple: "+3배" }, LABD: { benchmark: "미국 바이오", multiple: "-3배" },
};

type IconName = "search" | "chart" | "wallet" | "clock" | "logout" | "close" | "bank" | "shield" | "users" | "chevron";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    search: "m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
    chart: "M4 19V9m5 10V5m5 14v-7m5 7V3",
    wallet: "M4 6.5h14a2 2 0 0 1 2 2V18H4a2 2 0 0 1-2-2V6.5m0 0A2.5 2.5 0 0 1 4.5 4H17v2.5m0 5h3",
    clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    logout: "M10 17l5-5-5-5m5 5H3m10-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6",
    close: "M6 6l12 12M18 6 6 18",
    bank: "M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 4H3l9-4Z",
    shield: "M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10Zm-3-10 2 2 4-5",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m0-7.26a4 4 0 0 1 0 7.75",
    chevron: "m9 18 6-6-6-6",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function instrumentType(type: string) {
  return ({ EQUITY: "주식", ETF: "ETF", LEVERAGED_ETF: "레버리지 ETF", OPTION_CALL: "콜옵션", OPTION_PUT: "풋옵션" } as Record<string, string>)[type] ?? type;
}

function riskProfile(type: string) {
  if (type === "LEVERAGED_ETF") return { level: "고위험", text: "일간 수익률 배수를 추종합니다. 보유 기간이 길면 기초지수 누적수익률의 단순 배수와 달라질 수 있습니다." };
  if (type.startsWith("OPTION_")) return { level: "초고위험", text: "만기와 행사가가 있는 계약입니다. 매수 옵션의 최대 손실은 지불한 프리미엄이며 1계약은 100주 기준입니다." };
  if (type === "ETF") return { level: "분산형", text: "여러 자산을 담은 상장지수상품입니다. 구성 종목과 추종 대상에 따라 위험이 달라집니다." };
  return { level: "일반", text: "개별 기업의 주식입니다. 가격 변동과 기업별 위험을 확인하세요." };
}

function formatDeviceCode(value: string) {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

function commandLabel(action: string) {
  return ({ buy: "매수", sell: "매도", search: "조회", option: "옵션 조회", bank_savings: "적금 가입", bank_deposit: "예금 가입", bank_cancel: "중도해지" } as Record<string, string>)[action] ?? action;
}

function statusLabel(status: string) {
  return ({ pending: "전달 대기", dispatched: "처리 중", accepted: "완료", rejected: "거절", offline: "접속 필요" } as Record<string, string>)[status] ?? status;
}

function stanceLabel(stance: string) {
  return ({ watching: "지켜보는 중", holding: "보유 중", positive: "긍정적", cautious: "신중하게" } as Record<string, string>)[stance] ?? "의견";
}

function dateLabel(timestamp: number) {
  return timestamp > 0 ? new Date(timestamp).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "-";
}

function compactQuantity(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function optionContract(underlying: string, expiry: string, strike: string, side: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || !(Number(strike) > 0)) return "계약을 선택하세요.";
  return `${underlying.toUpperCase()} ${expiry.slice(2).replaceAll("-", "")} ${side === "call" ? "C" : "P"} ${Number(strike).toLocaleString("en-US")}`;
}

export default function MarketPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KR" | "US">("ALL");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("ALL");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [notice, setNotice] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [connection, setConnection] = useState<"연결 중" | "연결됨" | "다시 연결 중">("연결 중");
  const [option, setOption] = useState({ underlying: "AAPL", expiry: "", strike: "", side: "call" });
  const [optionChain, setOptionChain] = useState<OptionChain | null>(null);
  const [optionExpiry, setOptionExpiry] = useState("");
  const [optionLoading, setOptionLoading] = useState(false);
  const [bankProductId, setBankProductId] = useState(bankProducts[0].id);
  const [bankAmount, setBankAmount] = useState("10000");
  const [cancelAccountId, setCancelAccountId] = useState("");
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityBody, setCommunityBody] = useState("");
  const [communityStance, setCommunityStance] = useState("watching");
  const [communityLoading, setCommunityLoading] = useState(false);
  const [rankings, setRankings] = useState<RankingPlayer[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const applySnapshot = useCallback((next: Snapshot) => {
    setSnapshot(next);
    setSelected((current) => next.instruments?.find((item) => item.symbol === current?.symbol) ?? next.instruments?.find((item) => item.symbol === "AAPL") ?? next.instruments?.[0] ?? null);
  }, []);

  const loadSnapshot = useCallback(async () => {
    const response = await fetch("/api/market/snapshot", { cache: "no-store" });
    if (!response.ok) { setSnapshot({ authenticated: false }); return; }
    applySnapshot(await response.json() as Snapshot);
  }, [applySnapshot]);

  useEffect(() => {
    const login = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        history.replaceState(null, "", "/market");
        let loggedIn = false;
        for (let attempt = 0; attempt < 6 && !loggedIn; attempt += 1) {
          const response = await fetch("/api/market/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
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
        if (!stopped) { applySnapshot(await response.json() as Snapshot); setConnection("연결됨"); }
      } catch { if (!stopped) setConnection("다시 연결 중"); }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, [snapshot.authenticated, applySnapshot]);

  const loadCommunity = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setCommunityLoading(true);
    try {
      const response = await fetch(`/api/market/community?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const result = await response.json() as { posts?: CommunityPost[] };
      setCommunityPosts(response.ok ? result.posts ?? [] : []);
    } catch { setCommunityPosts([]); }
    finally { setCommunityLoading(false); }
  }, []);

  useEffect(() => {
    if (!snapshot.authenticated || !selected?.symbol) return;
    const timer = window.setTimeout(() => void loadCommunity(selected.symbol), 0);
    return () => window.clearTimeout(timer);
  }, [snapshot.authenticated, selected?.symbol, loadCommunity]);

  const loadRankings = useCallback(async () => {
    setRankingsLoading(true);
    try {
      const response = await fetch("/api/market/rankings", { cache: "no-store" });
      const result = await response.json() as { rankings?: RankingPlayer[] };
      setRankings(response.ok ? result.rankings ?? [] : []);
    } catch { setRankings([]); }
    finally { setRankingsLoading(false); }
  }, []);

  useEffect(() => {
    if (!snapshot.authenticated) return;
    void loadRankings();
    const timer = window.setInterval(() => void loadRankings(), 60_000);
    return () => window.clearInterval(timer);
  }, [snapshot.authenticated, loadRankings]);

  const openPublicProfile = async (playerName: string) => {
    setProfileLoading(true); setPublicProfile(null);
    try {
      const response = await fetch(`/api/market/rankings?player=${encodeURIComponent(playerName)}`, { cache: "no-store" });
      const result = await response.json() as { profile?: PublicProfile };
      if (!response.ok || !result.profile) throw new Error("profile unavailable");
      setPublicProfile(result.profile); setProfileLoading(false);
    } catch { setNotice("프로필을 불러오지 못했습니다."); setProfileLoading(false); }
  };

  const closePublicProfile = useCallback(() => { setPublicProfile(null); setProfileLoading(false); }, []);

  useEffect(() => {
    if (!profileLoading && !publicProfile) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closePublicProfile(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [profileLoading, publicProfile, closePublicProfile]);

  const instruments = useMemo(() => snapshot.instruments ?? [], [snapshot.instruments]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return instruments.filter((item) => {
      const typeMatches = assetFilter === "ALL" || item.type === assetFilter || (assetFilter === "OPTION" && item.type.startsWith("OPTION_"));
      return (marketFilter === "ALL" || item.market === marketFilter) && typeMatches && (!needle || `${item.symbol} ${item.name}`.toLowerCase().includes(needle));
    }).slice(0, 100);
  }, [instruments, marketFilter, assetFilter, query]);
  const positions = snapshot.player?.positions ?? [];
  const accounts = snapshot.player?.accounts ?? [];
  const commands = snapshot.commands ?? [];
  const portfolioWon = positions.reduce((sum, item) => sum + Number(item.valueWon || 0), 0);
  const profitWon = positions.reduce((sum, item) => sum + Number(item.profitWon || 0), 0);
  const totalAssetWon = (snapshot.player?.cash_won ?? 0) + portfolioWon + accounts.reduce((sum, account) => sum + account.principalWon, 0);
  const selectedPosition = positions.find((item) => item.symbol === selected?.symbol);
  const heldQuantity = Number(String(selectedPosition?.quantity ?? "0").replace(/,/g, "")) || 0;
  const quantityStep = selected?.market === "US" && !selected.type.startsWith("OPTION_") ? 0.01 : 1;
  const rawMaxQuantity = selected ? (side === "buy" ? (snapshot.player?.cash_won ?? 0) / (selected.price_won * 1.0055) : heldQuantity) : 0;
  const maxQuantity = Math.floor(rawMaxQuantity / quantityStep) * quantityStep;
  const orderQuantity = Number(quantity) || 0;
  const executionWon = selected ? selected.price_won * orderQuantity * (side === "buy" ? 1.003 : 0.997) : 0;
  const feeWon = orderQuantity > 0 ? Math.max(100, Math.ceil(executionWon * 0.0025)) : 0;
  const orderTotal = side === "buy" ? Math.ceil(executionWon + feeWon) : Math.floor(Math.max(0, executionWon - feeWon));
  const changeAmount = selected ? Math.round(selected.price_won - selected.price_won / (1 + selected.change_percent / 100 || 1)) : 0;
  const selectedRisk = riskProfile(selected?.type ?? "EQUITY");
  const highRisk = selected?.type === "LEVERAGED_ETF" || selected?.type.startsWith("OPTION_");
  const leverage = selected ? leverageProducts[selected.symbol] : undefined;
  const selectedBank = bankProducts.find((item) => item.id === bankProductId) ?? bankProducts[0];
  const bankAmountNumber = Number(bankAmount) || 0;
  const expectedPrincipal = bankAmountNumber * selectedBank.payments;
  const expectedInterest = Math.floor(expectedPrincipal * selectedBank.rate);
  const bankAmountValid = bankAmountNumber >= 1000 && bankAmountNumber <= 10_000_000 && Number.isInteger(bankAmountNumber);
  const optionExpiries = [...new Set((optionChain?.contracts ?? []).map((contract) => contract.expiry))];
  const visibleOptions = (optionChain?.contracts ?? []).filter((contract) => contract.expiry === optionExpiry).slice(0, 40);

  const chooseInstrument = (item: Instrument | null) => { setSelected(item); setRiskAccepted(false); setQuantity("1"); };

  const sendTrade = async (payload: Record<string, string>) => {
    if (connection !== "연결됨") { setNotice("연결된 뒤 다시 시도해 주세요."); return false; }
    setOrdering(true);
    try {
      const response = await fetch("/api/market/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { message?: string };
      setNotice(result.message ?? (response.ok ? "요청을 전달했습니다." : "요청을 처리하지 못했습니다."));
      return response.ok;
    } catch { setNotice("서버 연결을 확인한 뒤 다시 시도해 주세요."); return false; }
    finally { setOrdering(false); }
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || orderQuantity <= 0) { setNotice("주문 수량을 확인해 주세요."); return; }
    if (highRisk && !riskAccepted) { setNotice("고위험 상품 안내를 확인해 주세요."); return; }
    void sendTrade({ action: side, symbol: selected.symbol, quantity });
  };

  const registerSearch = () => {
    const symbol = query.trim().toUpperCase();
    if (/^[A-Z0-9.^=-]{1,32}$/.test(symbol)) void sendTrade({ action: "search", symbol, quantity: "" });
    else setNotice("정확한 종목 심볼을 입력하세요.");
  };

  const registerOption = () => {
    const underlying = option.underlying.trim().toUpperCase();
    if (!/^[A-Z.]{1,10}$/.test(underlying) || !/^\d{4}-\d{2}-\d{2}$/.test(option.expiry) || !(Number(option.strike) > 0)) {
      setNotice("기초자산, 미래 만기일, 행사가를 확인해 주세요."); return;
    }
    if (new Date(`${option.expiry}T23:59:59`).getTime() <= Date.now()) { setNotice("만기일은 오늘 이후여야 합니다."); return; }
    void sendTrade({ action: "option", symbol: underlying, quantity: `${option.expiry}|${option.strike}|${option.side}` });
  };

  const loadOptionChain = async (requested = option.underlying) => {
    const symbol = requested.trim().toUpperCase();
    if (!/^[A-Z]{1,6}(?:-[A-Z])?$/.test(symbol)) { setNotice("미국 주식 또는 ETF 심볼을 입력하세요."); return; }
    setOptionLoading(true); setOptionChain(null);
    try {
      const response = await fetch(`/api/market/options?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "지원하는 미국 주식·ETF를 찾을 수 없습니다." : "옵션 체인을 불러오지 못했습니다.");
      const result = await response.json() as OptionChain;
      setOption({ ...option, underlying: symbol }); setOptionChain(result);
      setOptionExpiry(result.contracts[0]?.expiry ?? "");
      if (!result.contracts.length) setNotice("현재 조회 가능한 옵션 계약이 없습니다.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "옵션 체인을 불러오지 못했습니다."); }
    finally { setOptionLoading(false); }
  };

  const subscribeBank = async () => {
    if (!bankAmountValid) { setNotice("금액은 1,000원부터 10,000,000원까지 입력해 주세요."); return; }
    await sendTrade({ action: selectedBank.action, symbol: selectedBank.term, quantity: String(bankAmountNumber) });
  };

  const cancelBank = async (account: Account) => {
    if (cancelAccountId !== account.id) { setCancelAccountId(account.id); return; }
    if (await sendTrade({ action: "bank_cancel", symbol: account.id, quantity: "" })) setCancelAccountId("");
  };

  const submitCommunityPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || communityBody.trim().length < 2) { setNotice("두 글자 이상 의견을 적어 주세요."); return; }
    setCommunityLoading(true);
    try {
      const response = await fetch("/api/market/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: selected.symbol, body: communityBody, stance: communityStance }) });
      const result = await response.json() as { message?: string };
      setNotice(result.message ?? (response.ok ? "의견을 올렸습니다." : "의견을 올리지 못했습니다."));
      if (response.ok) { setCommunityBody(""); await loadCommunity(selected.symbol); }
    } catch { setNotice("커뮤니티 연결을 확인해 주세요."); }
    finally { setCommunityLoading(false); }
  };

  const reactCommunityPost = async (id: string) => {
    const response = await fetch("/api/market/community/react", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok && selected) await loadCommunity(selected.symbol);
  };

  const deleteCommunityPost = async (id: string) => {
    const response = await fetch("/api/market/community", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok && selected) { setNotice("글을 삭제했습니다."); await loadCommunity(selected.symbol); }
  };

  const logout = async () => { await fetch("/api/market/login", { method: "DELETE" }); location.reload(); };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (loginCode.replace("-", "").length !== 8) { setNotice("8자리 로그인 코드를 입력해 주세요."); return; }
    setSubmittingLogin(true); setNotice("");
    const response = await fetch("/api/market/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: loginCode }) });
    if (!response.ok) { setNotice("코드가 만료됐거나 이미 사용됐습니다. 게임에서 /주식을 다시 입력해 주세요."); setSubmittingLogin(false); return; }
    await loadSnapshot(); setSubmittingLogin(false);
  };

  if (loading) return <main className="market-shell"><div className="market-loading" role="status">로그인 확인 중</div></main>;

  if (!snapshot.authenticated) return (
    <main className="market-shell market-login">
      <Link className="market-wordmark" href="/"><span className="brand-mark">T</span><b>택병증권</b></Link>
      <section className="login-card">
        <span className="login-symbol"><Icon name="chart" /></span><h1>택병증권 로그인</h1>
        <p>게임에서 <code>/주식</code>을 입력한 뒤 표시된 코드를 입력하세요.</p>
        <form className="device-login-form" onSubmit={submitLogin}>
          <label htmlFor="login-code">로그인 코드</label>
          <input id="login-code" autoFocus autoComplete="one-time-code" inputMode="text" placeholder="ABCD-EFGH" value={loginCode} onChange={(event) => setLoginCode(formatDeviceCode(event.target.value))} />
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
        <nav aria-label="증권 메뉴"><a className="active" href="#quotes">종목</a><a href="#ranking">랭킹</a><a href="#portfolio">내 자산</a><a href="#banking">예금 · 적금</a></nav>
        <label className="top-search"><Icon name="search" /><span className="sr-only">종목 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="종목명 또는 심볼 검색" /></label>
        <div className="market-status"><i className={connection === "연결됨" ? "live" : ""} />{connection}</div>
        <button className="icon-button" onClick={logout} aria-label="로그아웃"><Icon name="logout" /></button>
      </header>

      <section className="ticker-strip" aria-label="자산 요약">
        <div><span>총자산</span><strong>{won.format(totalAssetWon)}</strong></div><div><span>보유 현금</span><strong>{won.format(snapshot.player?.cash_won ?? 0)}</strong></div>
        <div><span>투자 평가액</span><strong>{won.format(portfolioWon)}</strong></div><div><span>평가 손익</span><strong className={profitWon >= 0 ? "rise" : "fall"}>{profitWon >= 0 ? "+" : ""}{won.format(profitWon)}</strong></div>
        <span className={snapshot.player?.online ? "session-online" : "session-offline"}>{snapshot.player?.online ? "게임 접속 중" : "게임 접속 필요"}</span>
      </section>

      {notice && <div className="market-alert terminal-alert" role="status" aria-live="polite">{notice}<button onClick={() => setNotice("")} aria-label="알림 닫기"><Icon name="close" /></button></div>}

      {selected && <section className="stock-overview" aria-labelledby="selected-stock-title">
        <div className="stock-identity"><span className="stock-avatar">{selected.name.slice(0, 1)}</span><div><h1 id="selected-stock-title">{selected.name}</h1><p>{selected.symbol} · {selected.market === "KR" ? "국내" : "해외"} · {instrumentType(selected.type)} <span className={`risk-badge ${highRisk ? "high" : ""}`}>{selectedRisk.level}</span></p></div></div>
        <div className="stock-price"><strong>{won.format(selected.price_won)}</strong><span className={selected.change_percent >= 0 ? "rise" : "fall"}>{changeAmount >= 0 ? "+" : ""}{won.format(changeAmount)} ({percent.format(selected.change_percent)}%)</span></div>
        <dl><div><dt>보유 수량</dt><dd>{selectedPosition ? `${selectedPosition.quantity}${selectedPosition.unit}` : "-"}</dd></div><div><dt>평가 금액</dt><dd>{selectedPosition ? won.format(selectedPosition.valueWon) : "-"}</dd></div><div><dt>평가 손익</dt><dd className={(selectedPosition?.profitWon ?? 0) >= 0 ? "rise" : "fall"}>{selectedPosition ? `${selectedPosition.profitWon >= 0 ? "+" : ""}${won.format(selectedPosition.profitWon)}` : "-"}</dd></div></dl>
      </section>}

      {leverage && <section className="leverage-banner" aria-label="레버리지 상품 핵심 정보"><Icon name="shield" /><div><b>{leverage.benchmark} 일간 수익률 {leverage.multiple} 추종</b><span>하루 단위 목표입니다. 변동성과 복리 효과 때문에 며칠 이상 보유하면 기초지수 누적수익률의 단순 {leverage.multiple}와 달라질 수 있습니다.</span></div></section>}

      <div className="market-tabs" aria-label="화면 바로가기"><a className="active" href="#trading">차트 · 주문</a><a href="#ranking">자산 랭킹</a><a href="#community">커뮤니티</a><a href="#portfolio">보유 종목</a><a href="#options">옵션</a><a href="#banking">예금 · 적금</a></div>

      <div className="terminal-grid" id="trading">
        <section className="terminal-panel chart-panel" aria-labelledby="chart-title">
          <div className="terminal-panel-head"><div><Icon name="chart" /><h2 id="chart-title">차트</h2></div><span>{selected ? new Date(selected.updated_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-"} 기준</span></div>
          {selected ? <><StockChart item={selected} /><div className={`product-note ${highRisk ? "danger" : ""}`}><Icon name="shield" /><span><b>{selectedRisk.level} 상품</b>{selectedRisk.text}</span></div></> : <div className="empty-state">종목을 선택하세요.</div>}
        </section>

        <section className="terminal-panel quote-panel" id="quotes" aria-labelledby="quotes-title">
          <div className="terminal-panel-head"><div><Icon name="wallet" /><h2 id="quotes-title">종목</h2></div><span>{filtered.length}</span></div>
          <div className="market-filter" role="group" aria-label="시장 선택">{(["ALL", "KR", "US"] as const).map((value) => <button key={value} className={marketFilter === value ? "active" : ""} onClick={() => setMarketFilter(value)}>{value === "ALL" ? "전체" : value === "KR" ? "국내" : "해외"}</button>)}</div>
          <div className="asset-filter" role="group" aria-label="상품 유형">{(["ALL", "EQUITY", "ETF", "LEVERAGED_ETF", "OPTION"] as AssetFilter[]).map((value) => <button key={value} className={assetFilter === value ? "active" : ""} onClick={() => setAssetFilter(value)}>{value === "ALL" ? "모든 상품" : value === "OPTION" ? "옵션" : instrumentType(value)}</button>)}</div>
          <div className="quote-list" role="list">
            {filtered.map((item) => <button key={item.symbol} role="listitem" className={selected?.symbol === item.symbol ? "selected" : ""} onClick={() => chooseInstrument(item)}>
              <span className="quote-name"><i>{item.name.slice(0, 1)}</i><span><b>{item.name}</b><small>{item.symbol} · {instrumentType(item.type)}</small></span></span><span className="price"><b>{won.format(item.price_won)}</b><small className={item.change_percent >= 0 ? "rise" : "fall"}>{percent.format(item.change_percent)}%</small></span>
            </button>)}
            {!filtered.length && <div className="empty-state"><p>검색 결과가 없습니다.</p><button onClick={registerSearch}>“{query}” 서버 조회</button></div>}
          </div>
        </section>

        <aside className="terminal-panel order-panel" aria-labelledby="order-title">
          <div className="terminal-panel-head"><div><h2 id="order-title">주문</h2></div><span>현재가 주문</span></div>
          {selected ? <form onSubmit={submitOrder}>
            <div className="segmented"><button type="button" className={side === "buy" ? "active buy" : ""} onClick={() => setSide("buy")}>매수</button><button type="button" className={side === "sell" ? "active sell" : ""} onClick={() => setSide("sell")}>매도</button></div>
            <label>기준 가격<div className="input-with-unit readonly"><input value={integer.format(selected.price_won)} readOnly aria-label="주문 기준 가격" /><span>원</span></div></label>
            <label>수량<div className="input-with-unit"><input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/[^0-9.]/g, ""))} aria-label="주문 수량" /><span>{selected.unit}</span></div></label>
            <div className="quick-quantity" aria-label="빠른 수량">{[10, 25, 50, 100].map((value) => <button key={value} type="button" onClick={() => setQuantity(compactQuantity(Math.max(quantityStep, Math.floor(maxQuantity * value / 100 / quantityStep) * quantityStep)))}>{value === 100 ? "최대" : `${value}%`}</button>)}</div>
            <dl className="order-total"><div><dt>예상 체결금액</dt><dd>{won.format(executionWon)}</dd></div><div><dt>예상 수수료</dt><dd>{won.format(feeWon)}</dd></div><div className="total"><dt>{side === "buy" ? "예상 결제금액" : "예상 수령금액"}</dt><dd>{won.format(orderTotal)}</dd></div><div><dt>{side === "buy" ? "주문 가능" : "보유 수량"}</dt><dd>{side === "buy" ? won.format(snapshot.player?.cash_won ?? 0) : `${selectedPosition?.quantity ?? 0}${selected.unit}`}</dd></div></dl>
            <p className="order-helper">현재가에 매수 +0.3%, 매도 -0.3% 스프레드와 0.25% 수수료를 반영한 예상값입니다.</p>
            {highRisk && <label className="risk-confirm"><input type="checkbox" checked={riskAccepted} onChange={(event) => setRiskAccepted(event.target.checked)} /><span><b>{instrumentType(selected.type)} 위험 확인</b>{selectedRisk.text}</span></label>}
            <button className={`primary-order ${side}`} disabled={!snapshot.player?.online || connection !== "연결됨" || ordering || orderQuantity <= 0 || (highRisk && !riskAccepted)}>{ordering ? "전달 중" : `${side === "buy" ? "매수" : "매도"} 주문`}</button>
          </form> : <div className="empty-state">종목을 선택하세요.</div>}
        </aside>
      </div>

      <section className="terminal-panel community-panel" id="community" aria-labelledby="community-title">
        <div className="terminal-panel-head"><div><Icon name="wallet" /><h2 id="community-title">{selected?.name ?? "종목"} 커뮤니티</h2></div><span>{communityPosts.length}개 의견</span></div>
        <div className="community-layout">
          <form className="community-compose" onSubmit={submitCommunityPost}>
            <label htmlFor="community-body">{selected?.symbol ?? "종목"}에 대한 생각</label>
            <textarea id="community-body" maxLength={280} value={communityBody} onChange={(event) => setCommunityBody(event.target.value)} placeholder="다른 플레이어에게 도움이 될 의견을 남겨보세요." />
            <div className="community-compose-actions"><label htmlFor="community-stance">현재 생각</label><select id="community-stance" value={communityStance} onChange={(event) => setCommunityStance(event.target.value)}><option value="watching">지켜보는 중</option><option value="holding">보유 중</option><option value="positive">긍정적</option><option value="cautious">신중하게</option></select><span>{communityBody.length}/280</span><button className="secondary-button" disabled={communityLoading || communityBody.trim().length < 2}>올리기</button></div>
            <p>보유자 표시는 현재 게임 계좌의 보유 종목을 기준으로 자동 확인됩니다.</p>
          </form>
          <div className="community-feed" aria-live="polite">
            {communityLoading && !communityPosts.length ? <div className="empty-state">의견을 불러오는 중입니다.</div> : communityPosts.length ? communityPosts.map((post) => <article key={post.id}>
              <header><button className="community-avatar" type="button" onClick={() => void openPublicProfile(post.playerName)} aria-label={`${post.playerName} 포트폴리오 보기`}>{post.playerName.slice(0, 1).toUpperCase()}</button><div><button className="community-profile-link" type="button" onClick={() => void openPublicProfile(post.playerName)}>{post.playerName}</button><small>{new Date(post.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></div><span className={`stance ${post.stance}`}>{stanceLabel(post.stance)}</span>{Boolean(post.holderVerified) && <span className="holder-badge">보유자</span>}</header>
              <p>{post.body}</p>
              <footer><button type="button" className={post.reacted ? "reacted" : ""} onClick={() => void reactCommunityPost(post.id)} aria-pressed={Boolean(post.reacted)}>공감 {post.reactionCount}</button>{Boolean(post.mine) && <button type="button" className="delete-post" onClick={() => void deleteCommunityPost(post.id)}>삭제</button>}</footer>
            </article>) : <div className="empty-state">아직 의견이 없습니다. 첫 의견을 남겨보세요.</div>}
          </div>
        </div>
      </section>

      <section className="terminal-panel ranking-panel" id="ranking" aria-labelledby="ranking-title">
        <div className="terminal-panel-head"><div><Icon name="users" /><h2 id="ranking-title">자산 랭킹</h2></div><span>전체 {rankings.length}명</span></div>
        <div className="ranking-intro"><div><span>플레이어 랭킹</span><strong>{rankings[0] ? `${rankings[0].playerName} · ${won.format(rankings[0].totalAssetWon)}` : "집계 중"}</strong><p>현금과 투자 평가액, 예금 · 적금 원금을 합산합니다.</p></div><button type="button" onClick={() => void loadRankings()} disabled={rankingsLoading}>{rankingsLoading ? "새로고침 중" : "새로고침"}</button></div>
        <div className="ranking-list" role="list" aria-live="polite">
          {rankings.map((player) => <button className={`ranking-row ${player.mine ? "mine" : ""}`} type="button" role="listitem" key={player.playerName} onClick={() => void openPublicProfile(player.playerName)} aria-label={`${player.rank}위 ${player.playerName} 포트폴리오 보기`}>
            <span className={`ranking-number rank-${Math.min(player.rank, 4)}`}>{player.rank}</span><span className="ranking-avatar">{player.playerName.slice(0, 1).toUpperCase()}</span><span className="ranking-player"><b>{player.playerName}{player.mine && <em>나</em>}</b><small><i className={player.online ? "online" : ""} />{player.online ? "접속 중" : `최근 갱신 ${dateLabel(player.updatedAt)}`} · 보유 {player.positionCount}종목</small></span><span className="ranking-value"><b>{won.format(player.totalAssetWon)}</b><small className={player.profitWon >= 0 ? "rise" : "fall"}>{player.profitWon >= 0 ? "+" : ""}{won.format(player.profitWon)}</small></span><Icon name="chevron" />
          </button>)}
          {!rankingsLoading && !rankings.length && <div className="empty-state">아직 집계된 플레이어가 없습니다.</div>}
          {rankingsLoading && !rankings.length && <div className="empty-state">랭킹을 불러오는 중입니다.</div>}
        </div>
      </section>

      <section className="terminal-panel portfolio-panel" id="portfolio" aria-labelledby="portfolio-title">
        <div className="terminal-panel-head"><div><Icon name="wallet" /><h2 id="portfolio-title">보유 종목</h2></div><span>{positions.length}개</span></div>
        <div className="data-table portfolio-table" role="table"><div className="table-row table-head" role="row"><span>종목</span><span>수량</span><span>평가 금액</span><span>평가 손익</span></div>
          {positions.length ? positions.map((item) => <button className="table-row" role="row" key={item.symbol} onClick={() => chooseInstrument(instruments.find((stock) => stock.symbol === item.symbol) ?? null)}><span><b>{item.name}</b><small>{item.symbol} · {instrumentType(item.type)}</small></span><span>{item.quantity}{item.unit}</span><span>{won.format(item.valueWon)}</span><span className={item.profitWon >= 0 ? "rise" : "fall"}>{item.profitWon >= 0 ? "+" : ""}{won.format(item.profitWon)}</span></button>) : <div className="empty-state">아직 보유 종목이 없습니다.</div>}
        </div>
      </section>

      <div className="terminal-lower-grid">
        <section className="terminal-panel command-panel" aria-labelledby="commands-title">
          <div className="terminal-panel-head"><div><Icon name="clock" /><h2 id="commands-title">최근 요청</h2></div><span>최대 12건</span></div>
          <div className="data-table command-table"><div className="table-row table-head"><span>구분</span><span>대상</span><span>조건</span><span>상태</span></div>
            {commands.slice(0, 12).map((command) => <div className="table-row" key={command.id}><span className={command.action === "buy" ? "rise" : command.action === "sell" ? "fall" : ""}>{commandLabel(command.action)}</span><span>{command.symbol}</span><span>{command.quantity || "-"}</span><span>{statusLabel(command.status)}</span></div>)}
            {!commands.length && <div className="empty-state">최근 요청이 없습니다.</div>}
          </div>
        </section>

        <section className="terminal-panel option-card" id="options" aria-labelledby="option-title">
          <div className="terminal-panel-head"><div><Icon name="chart" /><h2 id="option-title">미국 주식 옵션 체인</h2></div><span>실시간 계약 조회</span></div>
          <form className="option-search" onSubmit={(event) => { event.preventDefault(); void loadOptionChain(); }}><label htmlFor="option-underlying">기초자산</label><div className="option-search-row"><input id="option-underlying" value={option.underlying} onChange={(event) => setOption({ ...option, underlying: event.target.value.toUpperCase().replace(/[^A-Z-]/g, "") })} aria-label="옵션 기초자산 심볼" /><button className="secondary-button" disabled={optionLoading}>{optionLoading ? "조회 중" : "옵션 조회"}</button>{["AAPL", "TSLA", "NVDA"].map((symbol) => <button key={symbol} type="button" onClick={() => { setOption({ ...option, underlying: symbol }); void loadOptionChain(symbol); }}>{symbol}</button>)}</div></form>
          {optionChain ? <>
            <div className="option-chain-meta"><span>{optionChain.name} · {optionChain.symbol}<small>{optionChain.lastTrade}</small></span><label>만기 <select value={optionExpiry} onChange={(event) => setOptionExpiry(event.target.value)}>{optionExpiries.map((expiry) => <option key={expiry} value={expiry}>{expiry}</option>)}</select></label></div>
            <div className="option-chain" role="table" aria-label={`${optionChain.name} 옵션 체인`}><div className="option-chain-row option-chain-head" role="row"><span>콜 · 상승</span><span>행사가</span><span>풋 · 하락</span></div>{visibleOptions.map((contract) => <div className="option-chain-row" role="row" key={`${contract.expiry}-${contract.strike}`}><button type="button" className={option.expiry === contract.expiry && Number(option.strike) === contract.strike && option.side === "call" ? "selected call" : ""} onClick={() => setOption({ underlying: optionChain.symbol, expiry: contract.expiry, strike: String(contract.strike), side: "call" })}><b>{contract.call.last === null ? "-" : optionPrice.format(contract.call.last)}</b><small>매수 {contract.call.bid ?? "-"} · 매도 {contract.call.ask ?? "-"}</small><small>거래 {contract.call.volume ?? "-"} · 미결제 {contract.call.openInterest ?? "-"}</small></button><span><b>{contract.strike.toLocaleString("en-US")}</b><small>{contract.expiry}</small></span><button type="button" className={option.expiry === contract.expiry && Number(option.strike) === contract.strike && option.side === "put" ? "selected put" : ""} onClick={() => setOption({ underlying: optionChain.symbol, expiry: contract.expiry, strike: String(contract.strike), side: "put" })}><b>{contract.put.last === null ? "-" : optionPrice.format(contract.put.last)}</b><small>매수 {contract.put.bid ?? "-"} · 매도 {contract.put.ask ?? "-"}</small><small>거래 {contract.put.volume ?? "-"} · 미결제 {contract.put.openInterest ?? "-"}</small></button></div>)}</div>
            <div className="option-selection"><span>{optionContract(option.underlying, option.expiry, option.strike, option.side)}</span><button className="secondary-button" type="button" disabled={!option.expiry || ordering} onClick={registerOption}>선택 계약 등록</button></div>
          </> : <div className="option-guide"><Icon name="shield" /><p><b>1계약은 기초자산 100주 기준입니다.</b><br />미국 주식·ETF 심볼을 조회하면 만기별 콜·풋, 행사가, 최근가와 호가를 비교할 수 있습니다. 매수 옵션은 프리미엄 전액을 잃을 수 있습니다.</p></div>}
        </section>
      </div>

      <section className="terminal-panel banking-workspace" id="banking" aria-labelledby="bank-title">
        <div className="terminal-panel-head"><div><Icon name="bank" /><h2 id="bank-title">예금 · 적금</h2></div><span>가입 계좌 {accounts.length}개</span></div>
        <div className="banking-grid">
          <div className="bank-products" role="radiogroup" aria-label="예금 적금 상품">{bankProducts.map((product) => <button key={product.id} type="button" role="radio" aria-checked={bankProductId === product.id} className={bankProductId === product.id ? "selected" : ""} onClick={() => setBankProductId(product.id)}><span><small>{product.kind}</small><b>{product.name}</b><em>{product.description}</em></span><strong>{Math.round(product.rate * 100)}<small>%</small><em>만기 이자율</em></strong></button>)}</div>
          <div className="bank-calculator">
            <div><span>선택 상품</span><strong>{selectedBank.name}</strong></div>
            <label htmlFor="bank-amount">{selectedBank.action === "bank_savings" ? "매일 납입액" : "예치 금액"}<div className="input-with-unit"><input id="bank-amount" inputMode="numeric" value={bankAmount} onChange={(event) => setBankAmount(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} /><span>원</span></div></label>
            {!bankAmountValid && <p className="field-error" role="alert">1,000원~10,000,000원을 입력하세요.</p>}
            <dl><div><dt>예상 원금</dt><dd>{won.format(expectedPrincipal)}</dd></div><div><dt>예상 이자</dt><dd>+{won.format(expectedInterest)}</dd></div><div className="total"><dt>예상 만기금액</dt><dd>{won.format(expectedPrincipal + expectedInterest)}</dd></div><div><dt>가입 시 출금</dt><dd>{won.format(bankAmountNumber)}</dd></div></dl>
            <p>{selectedBank.action === "bank_savings" ? `가입 시 1회차 출금 후 매일 자동 납입합니다. 총 ${selectedBank.payments}회.` : "가입 시 전액을 한 번에 예치합니다."} 중도해지 시 원금의 1%가 차감됩니다.</p>
            <button className="secondary-button bank-subscribe" type="button" disabled={!bankAmountValid || ordering || !snapshot.player?.online || connection !== "연결됨"} onClick={() => void subscribeBank()}>{ordering ? "처리 중" : `${selectedBank.name} 가입`}</button>
          </div>
          <div className="account-list"><h3>내 계좌</h3>{accounts.length ? accounts.map((account) => {
            const interest = Math.floor(account.principalWon * account.rate);
            const progress = account.type === "SAVINGS" ? `${account.paidCount}/${account.totalPayments}회 납입` : "예치 완료";
            return <article key={account.id}><div className="account-top"><span><small>{progress} · {account.id}</small><b>{account.name}</b></span><strong>{won.format(account.principalWon)}</strong></div><div className="account-progress"><i style={{ width: `${Math.min(100, account.paidCount / Math.max(1, account.totalPayments) * 100)}%` }} /></div><dl><div><dt>만기</dt><dd>{dateLabel(account.maturityAt)}</dd></div><div><dt>예상 만기금액</dt><dd>{won.format(account.principalWon + interest)}</dd></div>{account.type === "SAVINGS" && account.paidCount < account.totalPayments && <div><dt>다음 납입</dt><dd>{dateLabel(account.nextPaymentAt)} · {won.format(account.installmentWon)}</dd></div>}</dl><div className="account-actions">{cancelAccountId === account.id && <span role="alert">지금 해지하면 원금의 1%가 차감됩니다.</span>}<button type="button" className={cancelAccountId === account.id ? "confirm" : ""} onClick={() => void cancelBank(account)} disabled={ordering}>{cancelAccountId === account.id ? "해지 확정" : "중도해지"}</button>{cancelAccountId === account.id && <button type="button" onClick={() => setCancelAccountId("")}>취소</button>}</div></article>;
          }) : <div className="empty-state">가입한 상품이 없습니다.</div>}</div>
        </div>
      </section>

      {(profileLoading || publicProfile) && <div className="profile-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) closePublicProfile(); }}>
        <section className="public-profile" role="dialog" aria-modal="true" aria-labelledby="public-profile-title">
          {profileLoading && !publicProfile ? <div className="profile-loading" role="status">포트폴리오를 불러오는 중입니다.</div> : publicProfile && <>
            <header><button className="icon-button" type="button" onClick={closePublicProfile} aria-label="프로필 닫기"><Icon name="close" /></button></header>
            <div className="profile-hero"><span className="profile-avatar">{publicProfile.playerName.slice(0, 1).toUpperCase()}</span><div><span className={publicProfile.online ? "profile-online" : "profile-offline"}>{publicProfile.online ? "접속 중" : "오프라인"}</span><h2 id="public-profile-title">{publicProfile.playerName}{publicProfile.mine && <em>나</em>}</h2><p>자산 랭킹 {publicProfile.rank}위</p></div></div>
            <div className="profile-total"><span>총자산</span><strong>{won.format(publicProfile.totalAssetWon)}</strong><small className={publicProfile.profitWon >= 0 ? "rise" : "fall"}>투자 손익 {publicProfile.profitWon >= 0 ? "+" : ""}{won.format(publicProfile.profitWon)}</small></div>
            <div className="allocation-bar" aria-label="자산 구성"><i className="cash" style={{ width: `${publicProfile.totalAssetWon ? publicProfile.cashWon / publicProfile.totalAssetWon * 100 : 0}%` }} /><i className="stocks" style={{ width: `${publicProfile.totalAssetWon ? publicProfile.portfolioWon / publicProfile.totalAssetWon * 100 : 0}%` }} /><i className="bank" style={{ width: `${publicProfile.totalAssetWon ? publicProfile.bankWon / publicProfile.totalAssetWon * 100 : 0}%` }} /></div>
            <dl className="profile-allocation"><div><dt><i className="cash" />현금</dt><dd>{won.format(publicProfile.cashWon)}</dd></div><div><dt><i className="stocks" />투자</dt><dd>{won.format(publicProfile.portfolioWon)}</dd></div><div><dt><i className="bank" />예금 · 적금</dt><dd>{won.format(publicProfile.bankWon)}</dd></div></dl>
            <div className="profile-section"><h3>포트폴리오 <span>{publicProfile.positions.length}종목</span></h3><div className="profile-holdings">{publicProfile.positions.length ? publicProfile.positions.map((position) => <div key={position.symbol}><span className="holding-avatar">{position.name.slice(0, 1)}</span><span><b>{position.name}</b><small>{position.symbol} · {position.quantity}{position.unit}</small></span><span><b>{won.format(position.valueWon)}</b><small className={position.profitWon >= 0 ? "rise" : "fall"}>{position.profitWon >= 0 ? "+" : ""}{won.format(position.profitWon)}</small></span></div>) : <div className="profile-empty">보유 종목이 없습니다.</div>}</div></div>
            <div className="profile-section"><h3>예금 · 적금 <span>{publicProfile.accounts.length}개</span></h3><div className="profile-accounts">{publicProfile.accounts.length ? publicProfile.accounts.map((account, index) => <div key={`${account.name}-${account.maturityAt}-${index}`}><span><b>{account.name}</b><small>{dateLabel(account.maturityAt)} 만기 · 이자율 {Math.round(account.rate * 100)}%</small></span><strong>{won.format(account.principalWon)}</strong></div>) : <div className="profile-empty">가입한 상품이 없습니다.</div>}</div></div>
          </>}
        </section>
      </div>}
    </main>
  );
}
