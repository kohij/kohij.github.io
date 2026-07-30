"use client";

import { useMemo, useState } from "react";
import {
  brews,
  currentSystems,
  fish,
  questChains,
  type BrewTier,
  type Rarity,
} from "./content";

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
          <a href="#start">시작</a>
          <a href="#systems">시스템</a>
          <a href="#quests">퀘스트</a>
          <a href="#brewery">양조</a>
          <a href="#fishing">낚시</a>
          <a href="#reference">설계 기준</a>
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
                <span>기본 포트 25565 · 2026.08.29 20:57 KST까지</span>
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
          <span>CREATE</span>
          <i />
          <span>MEKANISM</span>
          <i />
          <span>AE2</span>
          <i />
          <span>IC2</span>
          <i />
          <span>PLAYER ECONOMY</span>
        </div>
      </section>

      <section className="section start-section" id="start">
        <SectionTitle
          kicker="01 · FIRST DAY"
          title="처음 60분은 이렇게"
          body="서버의 모든 시스템을 한꺼번에 외울 필요는 없습니다. 첫 산업 의뢰까지 따라가면 나머지 길이 자연스럽게 열립니다."
        />
        <div className="timeline">
          {[
            ["01", "클라이언트 맞추기", "Minecraft 1.20.1 Forge와 서버와 동일한 모드 버전을 준비합니다."],
            ["02", "해적섬 도착", "리소스팩을 적용하고 중앙 안내판에서 경제와 이동 방식을 확인합니다."],
            ["03", "야생으로 이동", "첫 2회 쿠폰 이후 현재 잔액의 5%, 최대 3,000원이 듭니다."],
            ["04", "첫 자금 만들기", "채집물을 통합 상점에 판매합니다. 시작금은 10,000원입니다."],
            ["05", "진로 고르기", "Create·Mekanism·탐험·생활 길드 중 하나의 입문 퀘스트를 시작합니다."],
            ["06", "스폰으로 복귀", "첫 산업 의뢰를 납품하고 펫·낚시·양조·주식 콘텐츠를 해금합니다."],
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
            권한보다 모드 불일치부터 확인하세요. 특히 Create 6.0.8과 Mekanism
            10.4.16.80이 서버와 같아야 데이터팩 레지스트리 오류가 나지 않습니다.
          </p>
        </aside>
      </section>

      <section className="section dark-section" id="systems">
        <SectionTitle
          kicker="02 · THE WORLD"
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
          kicker="03 · ECONOMY"
          title="가격은 살아 움직입니다"
          body="판매가 몰린 품목은 내려가고, 거래가 없으면 24시간을 기준으로 원래 가격에 가까워집니다. 무한 자동화가 경제를 독점하지 못하게 하는 장치입니다."
        />
        <div className="economy-layout">
          <article className="formula-card">
            <span>DYNAMIC PRICE MODEL</span>
            <code>
              price = clamp(e<sup>-0.20 × pressure</sup>, 0.55, 1.45)
            </code>
            <p>
              50스택 집중 판매 시 약 18% 하락. 구매는 반대로 가격을 회복시키며
              통화정책은 하루 최대 ±2%만 움직입니다.
            </p>
          </article>
          <div className="economy-stats">
            <article>
              <strong>348</strong>
              <span>통합 상점 상품</span>
            </article>
            <article>
              <strong>201</strong>
              <span>한국·미국 종목</span>
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
              구매·판매가, 수급 압력, 품목별 거래량이 함께 기록됩니다. 변형된
              장비와 NBT 아이템은 판매가 거부됩니다.
            </p>
          </article>
          <article>
            <Tag>주식</Tag>
            <h3>실제 장 운영시간을 따릅니다</h3>
            <p>
              휴장·조기 종료·3분 이상 지연 시 체결이 중지됩니다. 현금화할 수
              없는 게임 내부 모의투자입니다.
            </p>
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
          kicker="04 · CONTENT ARCHIVE"
          title="196개의 이유를 만들겠습니다"
          body="메인 체인 112장, 발견 퀘스트 24개, 일일 계약 36개, 주간 현상금 12개, 시즌 퀘스트 12개로 구성합니다. 현금보다 지역·상점·레시피·치장을 해금합니다."
        />
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
          kicker="05 · BREWERS' GUILD"
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
          kicker="06 · FISHDEX"
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

      <section className="section reference-section" id="reference">
        <SectionTitle
          kicker="07 · DESIGN REFERENCES"
          title="유명 서버의 장점만 가져왔습니다"
          body="콘텐츠를 그대로 복제하지 않고, 오래 운영된 서버가 복잡한 시스템을 플레이어에게 설명하고 순환시키는 방식을 참고했습니다."
        />
        <div className="reference-grid">
          <a href="https://wiki.hypixel.net/Collections" target="_blank" rel="noreferrer">
            <span>HYPIXEL SKYBLOCK</span>
            <h3>수집 진행도와 자연 획득 판정</h3>
            <p>구매가 아닌 실제 플레이로 도감을 올리고 단계별 보상을 받는 구조.</p>
          </a>
          <a href="https://wynncraft.wiki.gg/wiki/Content_Book" target="_blank" rel="noreferrer">
            <span>WYNNCRAFT</span>
            <h3>모든 콘텐츠를 한 권에</h3>
            <p>퀘스트·발견·동굴·레이드의 조건과 진행 상태를 한곳에서 확인하는 방식.</p>
          </a>
          <a href="https://monumenta.wiki.gg/wiki/Quests" target="_blank" rel="noreferrer">
            <span>MONUMENTA</span>
            <h3>장기 퀘스트와 목표 추적</h3>
            <p>도시별 이야기와 나침반 추적을 결합해 다음 행동을 잃지 않게 하는 방식.</p>
          </a>
          <a href="https://www.stoneworks.gg/" target="_blank" rel="noreferrer">
            <span>STONEWORKS</span>
            <h3>플레이어가 만드는 직업 경제</h3>
            <p>희귀 양조법과 길드·상점·역할극이 플레이어 사이에서 가치를 만드는 방식.</p>
          </a>
          <a href="https://www.ecocitycraft.com/" target="_blank" rel="noreferrer">
            <span>ECOCITYCRAFT</span>
            <h3>여러 진로가 공존하는 경제</h3>
            <p>채집·상점·도시·거래 중 어느 길을 골라도 경제에 참여할 수 있는 구조.</p>
          </a>
        </div>
      </section>

      <section className="section operation-section">
        <div>
          <span>SERVER OPERATIONS</span>
          <h2>오래 켜져 있어야 좋은 서버입니다.</h2>
          <p>
            4시간 간격 최대 10개 백업, 크래시 자동 복구, 매일 오전 6시 재시작,
            AntiXray, CoreProtect, 화이트리스트를 기본으로 운영합니다.
          </p>
        </div>
        <dl>
          <div>
            <dt>RAM</dt>
            <dd>2GB → 6GB G1GC</dd>
          </div>
          <div>
            <dt>거리</dt>
            <dd>시야 10 · 시뮬레이션 6</dd>
          </div>
          <div>
            <dt>성능</dt>
            <dd>TPS 19.97 · p95 4.6ms</dd>
          </div>
          <div>
            <dt>외부 포트</dt>
            <dd>TCP 25565만 허용</dd>
          </div>
        </dl>
      </section>

      <footer>
        <div className="brand footer-brand">
          <img src="/server-icon.png" alt="" />
          <span>
            <b>택병서버</b>
            <small>FORGE 1.20.1</small>
          </span>
        </div>
        <p>
          이 페이지는 현재 운영 상태와 개발 예정 콘텐츠를 구분해 표시합니다.
          실제 업데이트 시 변경 내역을 함께 갱신합니다.
        </p>
        <button onClick={copyAddress}>{copied ? "복사 완료" : address}</button>
      </footer>
    </main>
  );
}
