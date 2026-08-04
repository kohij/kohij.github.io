"use client";

import { useEffect, useMemo, useState } from "react";
import {
  brews,
  currentSystems,
  fish,
  pets,
  questChains,
  type BrewTier,
  type Rarity,
} from "./content";
import patchNotes from "./patch-notes.json";

type PatchNote = (typeof patchNotes)[number];

const address = "taekbyeong-709371ef.nip.io";
const fishFilters: Array<"전체" | Rarity> = [
  "전체",
  "일반",
  "고급",
  "희귀",
  "영웅",
  "전설",
  "신화",
];
const brewFilters: Array<"전체" | BrewTier> = [
  "전체",
  "입문",
  "길드",
  "산업",
  "신화",
];

const number = new Intl.NumberFormat("ko-KR");

function SectionTitle({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="section-heading">
      <span>{kicker}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>;
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [fishFilter, setFishFilter] = useState<(typeof fishFilters)[number]>(
    "전체",
  );
  const [fishQuery, setFishQuery] = useState("");
  const [brewFilter, setBrewFilter] = useState<(typeof brewFilters)[number]>(
    "전체",
  );
  const [questFilter, setQuestFilter] = useState("전체");
  const [livePatchNotes, setLivePatchNotes] = useState<PatchNote[]>(patchNotes);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/patch-notes", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("patch notes unavailable")))
      .then((payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const notes = (payload as { notes?: unknown }).notes;
        if (Array.isArray(notes) && notes.length > 0) setLivePatchNotes(notes as PatchNote[]);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const visibleFish = useMemo(
    () =>
      fish.filter(
        (item) =>
          (fishFilter === "전체" || item.rarity === fishFilter) &&
          `${item.name} ${item.habitat}`
            .toLowerCase()
            .includes(fishQuery.toLowerCase()),
      ),
    [fishFilter, fishQuery],
  );

  const visibleBrews = useMemo(
    () =>
      brews.filter(
        (item) => brewFilter === "전체" || item.tier === brewFilter,
      ),
    [brewFilter],
  );

  const questCategories = [
    "전체",
    ...Array.from(new Set(questChains.map((item) => item.category))),
  ];
  const visibleQuests = questChains.filter(
    (item) => questFilter === "전체" || item.category === questFilter,
  );

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="택병서버 가이드 홈">
          <img src="/server-icon.png" alt="" />
          <span>
            <b>택병서버</b>
            <small>PLAYER GUIDE</small>
          </span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#launcher">런처</a>
          <a href="#start">시작</a>
          <a href="#systems">시스템</a>
          <a href="#economy">경제</a>
          <a href="/market">증권·은행</a>
          <a href="#quests">퀘스트</a>
          <a href="#brewery">양조</a>
          <a href="#fishing">낚시</a>
          <a href="#pets">동료</a>
          <a href="#patch-notes">패치노트</a>
        </nav>
        <button className="nav-connect" onClick={copyAddress}>
          {copied ? "복사 완료" : "주소 복사"}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="live-pill">
              <i />
              화이트리스트 운영 중 · Forge 1.20.1
            </div>
            <p className="overline">기계, 경제, 모험이 한 세계에서 이어지는 곳</p>
            <h1>
              시작부터 특이점까지,
              <br />
              <em>한 장으로 읽는 택병서버.</em>
            </h1>
            <p className="hero-description">
              단순 명령어 목록이 아닙니다. 무엇을 먼저 만들고, 어디서 돈을 벌며,
              어떤 콘텐츠로 이어지는지 플레이 순서대로 정리했습니다.
            </p>
            <div className="connect-card">
              <div>
                <small>SERVER ADDRESS</small>
                <strong>{address}</strong>
                <span>Minecraft 1.20.1 · Forge</span>
              </div>
              <button onClick={copyAddress}>
                {copied ? "복사했습니다" : "접속 주소 복사"}
              </button>
            </div>
            <div className="hero-meta">
              <span>최대 30명</span>
              <span>난이도 보통</span>
              <span>화이트리스트</span>
              <span>통화 단위 원</span>
            </div>
          </div>
          <figure className="spawn-card">
            <img
              src="/spawn-hub-preview.png"
              alt="택병서버 해적섬 스폰 허브 전경"
            />
            <figcaption>
              <span>SPAWN HUB</span>
              <b>해적섬에서 모든 여정이 시작됩니다.</b>
              <p>경제·주식·상점·카지노·랜덤 야생 이동을 한곳에서 이용합니다.</p>
            </figcaption>
          </figure>
        </div>
        <div className="hero-stripe" aria-hidden="true">
          <span>산업</span>
          <i />
          <span>경제</span>
          <i />
          <span>모험</span>
          <i />
          <span>생활</span>
        </div>
      </section>

      <section className="section launcher-section" id="launcher">
        <SectionTitle
          kicker="01 · SERVER LAUNCHER"
          title="설치하고, 바로 택병서버로."
          body="Java·Forge·모드·셰이더·서버 주소를 직접 맞출 필요가 없습니다. 처음 한 번 Microsoft 로그인만 하면 이후 업데이트와 접속은 런처가 처리합니다."
        />
        <div className="launcher-downloads">
          <article>
            <span>macOS 12+</span>
            <h3>Mac용 런처</h3>
            <p>Apple Silicon과 Intel Mac을 한 설치파일로 지원합니다.</p>
            <a href="/downloads/launcher/TaekbyeongLauncher-0.3.3-macOS-Universal.dmg" download>
              macOS 다운로드 <small>DMG · Universal</small>
            </a>
          </article>
          <article>
            <span>Windows 10·11</span>
            <h3>Windows용 런처</h3>
            <p>64비트 Windows 전용. 사용자 계정에 자동 설치합니다.</p>
            <a href="/downloads/launcher/TaekbyeongLauncher-0.3.3-Windows-x64-Setup.exe" download>
              Windows 다운로드 <small>EXE · x64</small>
            </a>
          </article>
        </div>
        <p className="launcher-assurance">
          SHA-256 검증 · 변경 파일만 동기화 · 런처 자동 업데이트 · 택병서버 고정 접속
        </p>
      </section>

      <section className="section start-section" id="start">
        <SectionTitle
          kicker="02 · FIRST DAY"
          title="처음 60분은 이렇게"
          body="서버의 모든 시스템을 한꺼번에 외울 필요는 없습니다. 첫 산업 의뢰까지 따라가면 나머지 길이 자연스럽게 열립니다."
        />
        <div className="timeline">
          {[
            ["01", "클라이언트 맞추기", "Minecraft 1.20.1 Forge와 서버 모드팩, 채팅 분리 알림함을 같이 적용합니다."],
            ["02", "해적섬 도착", "리소스팩을 적용하고 중앙 안내판에서 경제와 이동 방식을 확인합니다."],
            ["03", "야생으로 이동", "첫 2회 쿠폰 이후 현재 잔액의 5%, 최대 3,000원이 듭니다."],
            ["04", "첫 자금 만들기", "채집물을 통합 상점에 판매합니다. 시작금은 10,000원입니다."],
            ["05", "진로 고르기", "Create·Mekanism·탐험·생활 길드 중 하나의 입문 퀘스트를 시작합니다."],
            ["06", "스폰으로 복귀", "첫 산업 의뢰를 납품하고 동료·낚시·양조·주식 콘텐츠를 해금합니다."],
          ].map(([step, title, body]) => (
            <article key={step}>
              <span>{step}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="notice">
          <b>접속이 안 될 때</b>
          <p>
            서버 안내에 있는 모드팩을 그대로 적용한 뒤 다시 접속하세요.
          </p>
          <p>
            <a href="/downloads/TaekbyeongNotices-1.20.1-1.0.6.jar">
              택병 알림함 다운로드
            </a>
            를 <code>mods</code> 폴더에 넣으면 공지를 HUD나 기존 채팅으로 골라 받을 수 있습니다. 비디오 설정에서 크기·위치·등장 방식과 자유 배치를 조절할 수 있습니다.
          </p>
        </aside>
      </section>

      <section className="section dark-section" id="systems">
        <SectionTitle
          kicker="03 · THE WORLD"
          title="서버의 핵심 시스템"
          body="각 시스템은 따로 놀지 않습니다. 산업 생산물이 계약·양조·상점으로 흐르고, 지출은 유물·치장·레이드로 돌아갑니다."
        />
        <div className="system-grid">
          {currentSystems.map((system, index) => (
            <article key={system.title} className="system-card">
              <div>
                <span>{system.eyebrow}</span>
                <b>{String(index + 1).padStart(2, "0")}</b>
              </div>
              <h3>{system.title}</h3>
              <p>{system.body}</p>
            </article>
          ))}
        </div>

        <div className="paths">
          <div className="path-intro">
            <span>PLAY YOUR WAY</span>
            <h3>돈 버는 방법은 하나가 아닙니다.</h3>
            <p>
              한 직업이 모든 수익을 독점하지 않도록 길마다 다른 생산물과
              소비처를 배정합니다.
            </p>
          </div>
          <div className="path-list">
            {[
              ["기계공", "Create → Mekanism → AE2 자동화", "산업 계약·촉매"],
              ["상인", "동적 상점 → 주식 → 개인 워프", "수수료·광고"],
              ["탐험가", "Biomes O' Plenty → 도감 → 보스", "유물·치장"],
              ["생활인", "낚시 → 양조 → 선술집", "수집·플레이어 거래"],
            ].map(([name, route, result]) => (
              <article key={name}>
                <h4>{name}</h4>
                <p>{route}</p>
                <span>{result}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section economy-section" id="economy">
        <SectionTitle
          kicker="04 · ECONOMY"
          title="가격은 살아 움직입니다"
          body="판매가 몰린 품목은 내려가고, 거래가 없으면 24시간을 기준으로 원래 가격에 가까워집니다. 무한 자동화가 경제를 독점하지 못하게 하는 장치입니다."
        />
        <div className="economy-layout">
          <article className="formula-card">
            <span>가격 변동</span>
            <h3>많이 팔린 물건은 잠시 값이 내려갑니다.</h3>
            <p>
              시간이 지나면 가격이 회복되므로 여러 품목을 나눠 파는 편이 유리합니다.
            </p>
          </article>
          <div className="economy-stats">
            <article>
              <strong>348</strong>
              <span>통합 상점 상품</span>
            </article>
            <article>
              <strong>301+</strong>
              <span>주식·ETF 기본 종목</span>
            </article>
            <article>
              <strong>0.30%</strong>
              <span>주식 스프레드</span>
            </article>
            <article>
              <strong>0.25%</strong>
              <span>거래 수수료</span>
            </article>
          </div>
        </div>
        <div className="rules-grid">
          <article>
            <Tag>상점</Tag>
            <h3>싸게 사서 바로 되팔 수 없습니다</h3>
            <p>
              판매가 몰리면 가격이 내려가며, 일부 특수 장비는 판매할 수 없습니다.
            </p>
          </article>
          <article>
            <Tag>주식</Tag>
            <h3>웹 전용 증권으로 거래합니다</h3>
            <p>
              게임에서 <b>/주식</b>을 입력하면 포트폴리오와 로그인 코드가 함께 표시됩니다. 주식·ETF·레버리지·옵션을 한 화면에서 확인합니다.
            </p>
            <a className="economy-market-link" href="/market">웹 증권 열기</a>
          </article>
          <article>
            <Tag>자동화</Tag>
            <h3>더 만들면 더 벌지만 영원하지 않습니다</h3>
            <p>
              고단계 광물 가공은 높은 효율을 주되, 판매가 몰리면 가격이 내려가
              다른 생산 경로가 다시 유리해집니다.
            </p>
          </article>
        </div>
      </section>

      <section className="section quest-section" id="quests">
        <SectionTitle
          kicker="05 · CONTENT ARCHIVE"
          title="196개 통합 퀘스트"
          body="스토리 112장, 발견 24개, 일일 36개, 주간 12개, 시즌 12개가 실제 행동과 거래를 추적합니다."
        />
        <div className="implemented-banner">
          <span>NOW PLAYABLE</span>
          <b>채집 · 제작 · 낚시 · 토벌 · 바이옴 발견 · 주식 · 촉매 · 카지노</b>
          <p>조건을 달성하면 다음 퀘스트와 보상이 차례로 열립니다.</p>
        </div>
        <div className="quest-summary">
          {[
            ["112", "스토리 장"],
            ["24", "발견 퀘스트"],
            ["36", "일일 계약"],
            ["12", "주간 현상금"],
            ["12", "시즌 퀘스트"],
          ].map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="filters" aria-label="퀘스트 분류">
          {questCategories.map((category) => (
            <button
              key={category}
              className={questFilter === category ? "active" : ""}
              onClick={() => setQuestFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="quest-grid">
          {visibleQuests.map((quest) => (
            <article key={quest.name}>
              <div className="quest-top">
                <Tag>{quest.category}</Tag>
                <span>{quest.chapters}장 · {quest.length}</span>
              </div>
              <h3>{quest.name}</h3>
              <dl>
                <div>
                  <dt>시작 조건</dt>
                  <dd>{quest.unlock}</dd>
                </div>
                <div>
                  <dt>핵심 보상</dt>
                  <dd>{quest.reward}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="quest-design">
          <div>
            <span>진행 상태</span>
            <b>잠김 → 시작 가능 → 진행 중 → 완료</b>
          </div>
          <div>
            <span>추적 방식</span>
            <b>홈페이지 콘텐츠 북 + 인게임 나침반</b>
          </div>
          <div>
            <span>반복 보상</span>
            <b>현금 상한 + 재료·평판 중심</b>
          </div>
        </div>
      </section>

      <section className="section brewery-section" id="brewery">
        <SectionTitle
          kicker="06 · BREWERS' GUILD"
          title="술은 마시는 버프가 아니라 산업의 끝입니다"
          body="40종의 술을 계약, 유물 정제, 보스 제물, 박물관, 시즌 의식에 사용합니다. 서버가 되사주지 않으며 플레이어 양조장과 길드 주문이 가치를 만듭니다."
        />
        <div className="brew-loop">
          {[
            ["01", "산업 생산", "Create·Mekanism·AE2·IC2 재료 확보"],
            ["02", "촉매 변환", "모드 아이템을 검증된 양조 촉매로 교환"],
            ["03", "발효·증류·숙성", "시간·증류 횟수·배럴을 맞춰 품질 결정"],
            ["04", "밀봉·일련번호", "양조사·배치·품질·병입일을 기록"],
            ["05", "소비처", "길드 주문·유물·레이드·박물관·플레이어 거래"],
          ].map(([step, title, body]) => (
            <article key={step}>
              <span>{step}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className="brew-sinks">
          <article>
            <b>길드 주문</b>
            <p>매일 3종의 4성 이상 술을 요구하고 평판·촉매·치장 재료를 지급합니다.</p>
          </article>
          <article>
            <b>유물 정제</b>
            <p>산업 술을 소모해 유물 승급·옵션 재설정을 진행합니다.</p>
          </article>
          <article>
            <b>레이드 제물</b>
            <p>특정 신화 술로 보스 제단을 열거나 1회성 퍼즐 보조 효과를 얻습니다.</p>
          </article>
          <article>
            <b>박물관</b>
            <p>완벽한 배치를 영구 귀속 기증하고 전시 병·칭호·파티클을 받습니다.</p>
          </article>
        </div>
        <div className="filters" aria-label="양조 등급">
          {brewFilters.map((tier) => (
            <button
              key={tier}
              className={brewFilter === tier ? "active" : ""}
              onClick={() => setBrewFilter(tier)}
            >
              {tier}
            </button>
          ))}
        </div>
        <div className="brew-grid">
          {visibleBrews.map((brew) => (
            <article key={brew.name} data-tier={brew.tier}>
              <div>
                <Tag>{brew.tier}</Tag>
                <span>{brew.value}</span>
              </div>
              <h3>{brew.name}</h3>
              <p>{brew.purpose}</p>
              <small>촉매 단서 · {brew.catalyst}</small>
            </article>
          ))}
        </div>
        <aside className="secret-note">
          <span>길드 규칙 07</span>
          <p>
            공개 가이드는 재료 범위와 용도만 알려줍니다. 정확한 조리 시간,
            증류 횟수, 배럴과 숙성 기간은 퀘스트와 실험으로 발견하며 완성 레시피는
            양조사의 자산이 됩니다.
          </p>
        </aside>
      </section>

      <section className="section fishing-section" id="fishing">
        <SectionTitle
          kicker="07 · FISHDEX"
          title="72종. 진지함은 낚싯대와 함께 놓고 오세요"
          body="한국 인터넷 밈을 서버 세계관에 맞게 비튼 어종 도감입니다. 구입·거래한 물고기는 최초 발견으로 인정하지 않아 도감 완성을 돈으로 살 수 없습니다."
        />
        <div className="fish-toolbar">
          <label>
            <span className="sr-only">어종 검색</span>
            <input
              value={fishQuery}
              onChange={(event) => setFishQuery(event.target.value)}
              placeholder="어종이나 서식지 검색"
            />
          </label>
          <div className="filters" aria-label="어종 희귀도">
            {fishFilters.map((rarity) => (
              <button
                key={rarity}
                className={fishFilter === rarity ? "active" : ""}
                onClick={() => setFishFilter(rarity)}
              >
                {rarity}
              </button>
            ))}
          </div>
          <span className="result-count">{visibleFish.length}종 표시</span>
        </div>
        <div className="fish-grid">
          {visibleFish.map((item) => (
            <article key={item.name} data-rarity={item.rarity}>
              <div className="fish-icon" aria-hidden="true">◖</div>
              <div>
                <span>{item.rarity} · {item.habitat}</span>
                <h3>{item.name}</h3>
                <p>기준가 {number.format(item.price)}원</p>
              </div>
            </article>
          ))}
        </div>
        <div className="fish-rules">
          <article>
            <strong>일일 20,000원</strong>
            <span>정상 판매 한도</span>
          </article>
          <article>
            <strong>25%</strong>
            <span>한도 이후 판매가</span>
          </article>
          <article>
            <strong>주 2회</strong>
            <span>20분 낚시 대회</span>
          </article>
          <article>
            <strong>자연 획득만</strong>
            <span>도감 최초 발견 인정</span>
          </article>
        </div>
      </section>

      <section className="section pet-section" id="pets">
        <SectionTitle
          kicker="08 · COMPANIONS"
          title="먹이로 교감하고 성장하는 역할형 동료 12종"
          body="소환 중에만 배고픔과 경험치가 쌓이며, Lv.30까지 성장하면 고유 패시브와 먹이 효율이 강화됩니다."
        />
        <figure className="pet-concept">
          <img
            src="/assets/taekbyeong-pet-concepts-v1.png"
            alt="Kenney Cube Pets CC0 원본으로 제작한 택병서버 동료 12종"
          />
          <figcaption>
              <span>동료 12종</span>
              <b>등급별 동료 계약으로 수집하세요.</b>
              <p>일반 52% · 희귀 32% · 영웅 13.5% · 전설 2.5%, 희귀 10회·전설 50회 천장입니다.</p>
          </figcaption>
        </figure>
        <div className="pet-rules">
          <article>
            <strong>1마리</strong>
            <span>동시 소환 상한</span>
          </article>
          <article>
            <strong>200,000원</strong>
            <span>동료 계약 1회</span>
          </article>
          <article>
            <strong>12,000원</strong>
            <span>먹이 1개 · 포만도 25</span>
          </article>
          <article>
            <strong>Lv.30</strong>
            <span>최대 성장·먹이 효율 +30%</span>
          </article>
        </div>
        <div className="pet-grid">
          {pets.map((pet, index) => (
            <article key={pet.name}>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>{pet.name}</h3>
              <p>{pet.role}</p>
              <dl>
                <div>
                  <dt>계약 확률</dt>
                  <dd>{pet.unlock}</dd>
                </div>
                <div>
                  <dt>능력</dt>
                  <dd>{pet.limit}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="section patch-section" id="patch-notes">
        <div className="patch-release">
          <div>
            <span>LIVE PATCH · 2026.08.02</span>
            <h2>8월 2일 업데이트</h2>
            <p>
              플레이하면서 바로 느끼는 변화부터 정리했습니다. 내부 이름이나 개인 기록은
              빼고, 무엇이 달라졌는지와 그렇게 바꾼 이유를 함께 공개합니다.
            </p>
          </div>
          <a href="#top">맨 위로</a>
        </div>
        <div className="patch-toc" aria-label="패치노트 바로가기">
          {livePatchNotes.map((note, index) => (
            <a key={note.title} href={`#patch-${index + 1}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {note.type}
            </a>
          ))}
        </div>
        <div className="patch-list">
          {livePatchNotes.map((note, index) => (
            <article key={note.title} id={`patch-${index + 1}`}>
              <header>
                <div className="patch-number">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <div className="patch-meta">
                    <span>{note.type}</span>
                    <time>{note.date.replaceAll("-", ".")}</time>
                  </div>
                  <h3>{note.title}</h3>
                  <p>{note.summary}</p>
                </div>
              </header>
              <div className="patch-details">
                <div>
                  <h4>변경 내용</h4>
                  <ul>
                    {note.changes.map((change) => <li key={change}>{change}</li>)}
                  </ul>
                </div>
                <aside className="developer-note">
                  <span>개발자 노트</span>
                  <h4>왜 바꿨나요?</h4>
                  <p>{note.reason}</p>
                </aside>
                <div className="patch-evidence">
                  <h4>확인 근거</h4>
                  <ul>
                    {note.evidence.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <small>모든 근거는 개인을 알아볼 수 없도록 이름·계정·주소·보유 내역을 제외했습니다.</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div className="brand footer-brand">
          <img src="/server-icon.png" alt="" />
          <span>
            <b>택병서버</b>
            <small>PLAYER GUIDE</small>
          </span>
        </div>
        <p>
          플레이에 필요한 정보만 정리했습니다.
        </p>
        <button onClick={copyAddress}>{copied ? "복사 완료" : address}</button>
      </footer>
    </main>
  );
}
