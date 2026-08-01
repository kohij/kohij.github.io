export type Rarity =
  | "일반"
  | "고급"
  | "희귀"
  | "영웅"
  | "전설"
  | "신화";

export type Fish = {
  name: string;
  rarity: Rarity;
  habitat: string;
  price: number;
};

export type BrewTier = "입문" | "길드" | "산업" | "신화";

export type Brew = {
  name: string;
  tier: BrewTier;
  catalyst: string;
  purpose: string;
  value: string;
};

export type QuestChain = {
  name: string;
  category: "메인" | "산업" | "경제" | "탐험" | "생활" | "엔드게임";
  chapters: number;
  length: string;
  unlock: string;
  reward: string;
};

export type Pet = {
  name: string;
  model: string;
  role: string;
  unlock: string;
  limit: string;
};

const habitats = {
  common: ["강", "평원 연못", "바다", "늪", "비 오는 해안"],
  uncommon: ["깊은 바다", "설원 강", "정글 강", "동굴 수맥", "밤바다"],
  rare: ["폭풍우 바다", "산호초", "지하 호수", "네더 온천", "한밤중의 강"],
  epic: ["심해", "방사능 격리수역", "공허 균열", "기계 냉각수", "해적섬 외해"],
  legendary: ["특이점 해역", "원자로 냉각수", "공허 바다", "고대 용궁"],
  mythic: ["어디에도 없음", "서버 경계", "404 수역", "마지막 청크"],
};

const makeFish = (
  names: string[],
  rarity: Rarity,
  ranges: [number, number],
  habitatPool: string[],
): Fish[] =>
  names.map((name, index) => {
    const step =
      names.length === 1
        ? 0
        : Math.round(((ranges[1] - ranges[0]) * index) / (names.length - 1));
    return {
      name,
      rarity,
      habitat: habitatPool[index % habitatPool.length],
      price: ranges[0] + step,
    };
  });

export const fish: Fish[] = [
  ...makeFish(
    [
      "무야호 송사리",
      "국룰 고등어",
      "퇴근한 멸치",
      "회의중 꽁치",
      "월급루팡 전어",
      "물멍 붕어",
      "아무고토 모타는 피라미",
      "오늘만 사는 새우",
      "집가고싶은 망둥어",
      "라떼는 말이야 미꾸라지",
      "어쩔티라피아",
      "저쩔복어",
      "내일의 나에게 갈치",
      "조용히해 조기",
      "낚였쥬 잉어",
      "아니근데진짜 정어리",
      "그냥그런 가자미",
      "K-급식 연어",
      "눈치챙겨 오징어",
      "대충사는 홍합",
    ],
    "일반",
    [40, 120],
    habitats.common,
  ),
  ...makeFish(
    [
      "맑눈광 광어",
      "중꺾마 참치",
      "오히려좋아 연어",
      "킹받는 킹크랩",
      "냅다낚인 잉어",
      "가보자고 돌돔",
      "머선129 아귀",
      "이왜진 철갑상어",
      "멈춰 개복치",
      "군침싹도는 다랑어",
      "K-직장인 문어",
      "간장게장 원툴 꽃게",
      "숨참고 잠수한 돌고래",
      "주식창보는 청새치",
      "야근중 대왕오징어",
      "민초단 복어",
      "반민초단 복어",
      "알잘딱깔센 가오리",
    ],
    "고급",
    [140, 340],
    habitats.uncommon,
  ),
  ...makeFish(
    [
      "응애 나 아기상어",
      "개같이부활한 실러캔스",
      "존버는승리한다 개복치",
      "풀매수 황새치",
      "손이벌벌 전기뱀장어",
      "RTX 해파리",
      "과몰입한 심해아귀",
      "원화채굴 금붕어",
      "T발 C야 참돔",
      "그잡채 조기",
      "내돈내산 랍스터",
      "이게맞나 산갈치",
      "두둥등장 만타가오리",
      "억까당한 바다거북",
    ],
    "희귀",
    [380, 980],
    habitats.rare,
  ),
  ...makeFish(
    [
      "서킷브레이커 청상아리",
      "100배 레버리지 황새치",
      "풀강화 복어",
      "유체역학전공 오징어",
      "특이점을 본 해마",
      "M4 코어 먹은 참치",
      "원자로 냉각수 연어",
      "스폰섬 지박령 문어",
      "메카수트 씹는 피라냐",
      "오늘도 정상영업 고래상어",
    ],
    "영웅",
    [1_200, 3_400],
    habitats.epic,
  ),
  ...makeFish(
    [
      "공허를 헤엄치는 잉어",
      "특이점을 삼킨 고래",
      "초전도 광어",
      "양자중첩 복어",
      "서버장 몰래 키운 메갈로돈",
      "마지막 남은 용궁갈치",
    ],
    "전설",
    [5_500, 13_000],
    habitats.legendary,
  ),
  ...makeFish(
    [
      "404 피시 낫 파운드",
      "[SYSTEM] 존재하지 않는 어종",
      "???: 물고기",
      "진짜 마지막 한 마리",
    ],
    "신화",
    [32_000, 100_000],
    habitats.mythic,
  ),
];

export const brews: Brew[] = [
  {
    name: "개척자 라거",
    tier: "입문",
    catalyst: "밀·홉",
    purpose: "첫 양조 퀘스트, 선술집 납품",
    value: "500~900원",
  },
  {
    name: "벚꽃 사이다",
    tier: "입문",
    catalyst: "사과·벚꽃 잎",
    purpose: "봄 축제, 수집 도감",
    value: "700~1,200원",
  },
  {
    name: "벌꿀 미드",
    tier: "입문",
    catalyst: "꿀병",
    purpose: "양조 평판, NPC 선물",
    value: "900~1,500원",
  },
  {
    name: "광부 흑맥주",
    tier: "입문",
    catalyst: "밀·석탄 가루",
    purpose: "광산 의뢰, 성급함 I 체험",
    value: "1,000~1,800원",
  },
  {
    name: "설원 보드카",
    tier: "입문",
    catalyst: "감자·얼음",
    purpose: "설원 탐험 퀘스트",
    value: "1,200~2,000원",
  },
  {
    name: "해적섬 럼",
    tier: "입문",
    catalyst: "사탕수수",
    purpose: "스폰 해적단 연속 퀘스트",
    value: "1,400~2,400원",
  },
  {
    name: "네더 진저",
    tier: "입문",
    catalyst: "황금 당근·네더 사마귀",
    purpose: "네더 탐사 보급품",
    value: "1,600~2,800원",
  },
  {
    name: "청록 토닉",
    tier: "입문",
    catalyst: "달콤한 열매·발광석",
    purpose: "야간시야, 파티 음료",
    value: "1,800~3,000원",
  },
  {
    name: "회전력 IPA",
    tier: "길드",
    catalyst: "Create 황동 판",
    purpose: "기계공 길드 납품",
    value: "6,000~10,000원",
  },
  {
    name: "황동 브랜디",
    tier: "길드",
    catalyst: "황동 증류판",
    purpose: "정밀 양조 면허 시험",
    value: "8,000~14,000원",
  },
  {
    name: "장미수정 로제",
    tier: "길드",
    catalyst: "Create 장미 석영",
    purpose: "명품관 시즌 주문",
    value: "10,000~18,000원",
  },
  {
    name: "초콜릿 기어 리큐르",
    tier: "길드",
    catalyst: "Create 초콜릿 바",
    purpose: "디저트 세트·박물관",
    value: "12,000~20,000원",
  },
  {
    name: "건축가 포터",
    tier: "길드",
    catalyst: "검은석·코코아",
    purpose: "건축 주간 의뢰",
    value: "9,000~16,000원",
  },
  {
    name: "바이옴 블렌드",
    tier: "길드",
    catalyst: "Biomes O' Plenty 식물 표본",
    purpose: "생태 도감·탐험가 길드",
    value: "14,000~24,000원",
  },
  {
    name: "퇴근벨 하이볼",
    tier: "길드",
    catalyst: "시계·꿀",
    purpose: "금요일 선술집 이벤트",
    value: "15,000~25,000원",
  },
  {
    name: "6시 리스타트",
    tier: "길드",
    catalyst: "레드스톤·새벽 물병",
    purpose: "정기 재시작 기념 도전",
    value: "18,000~30,000원",
  },
  {
    name: "정밀기계식 브랜디",
    tier: "산업",
    catalyst: "create:precision_mechanism",
    purpose: "유물 T1→T2 정제",
    value: "28,000~45,000원",
  },
  {
    name: "전자관 진",
    tier: "산업",
    catalyst: "create:electron_tube",
    purpose: "산업 계약 새로고침",
    value: "24,000~40,000원",
  },
  {
    name: "견고판 스타우트",
    tier: "산업",
    catalyst: "create:sturdy_sheet",
    purpose: "보스 장비 수리 의뢰",
    value: "35,000~55,000원",
  },
  {
    name: "오스뮴 블루",
    tier: "산업",
    catalyst: "mekanism:ingot_osmium",
    purpose: "Mekanism 길드 평판",
    value: "22,000~38,000원",
  },
  {
    name: "원자합금 압생트",
    tier: "산업",
    catalyst: "mekanism:alloy_atomic",
    purpose: "고급 유물 재설정",
    value: "55,000~90,000원",
  },
  {
    name: "HDPE 드라이 진",
    tier: "산업",
    catalyst: "mekanism:hdpe_pellet",
    purpose: "산업 박물관·계약 재료",
    value: "45,000~75,000원",
  },
  {
    name: "정제흑요석 보드카",
    tier: "산업",
    catalyst: "mekanism:ingot_refined_obsidian",
    purpose: "공허 레이드 제물",
    value: "70,000~110,000원",
  },
  {
    name: "폴로늄 제로",
    tier: "산업",
    catalyst: "mekanism:pellet_polonium",
    purpose: "밀봉 상태로만 특이점 연구",
    value: "100,000~160,000원",
  },
  {
    name: "플루익스 하이볼",
    tier: "산업",
    catalyst: "ae2:fluix_crystal",
    purpose: "AE2 저장망 연속 퀘스트",
    value: "32,000~50,000원",
  },
  {
    name: "충전석영 샴페인",
    tier: "산업",
    catalyst: "ae2:charged_certus_quartz_crystal",
    purpose: "신년·완공식 의식",
    value: "40,000~65,000원",
  },
  {
    name: "계산프로세서 사케",
    tier: "산업",
    catalyst: "ae2:calculation_processor",
    purpose: "동적가격 연구 퀘스트",
    value: "48,000~75,000원",
  },
  {
    name: "엔지니어링 리저브",
    tier: "산업",
    catalyst: "ae2:engineering_processor",
    purpose: "산업 의뢰 보증금 면제권 제작",
    value: "60,000~95,000원",
  },
  {
    name: "AE 특이점 리저브",
    tier: "산업",
    catalyst: "ae2:singularity",
    purpose: "T3 유물·최종 레이드",
    value: "120,000~200,000원",
  },
  {
    name: "IC2 홉 라거",
    tier: "산업",
    catalyst: "ic2:hops",
    purpose: "양조 길드 승급 시험",
    value: "26,000~42,000원",
  },
  {
    name: "다크커피 리큐르",
    tier: "산업",
    catalyst: "ic2:dark_coffee_mug",
    purpose: "야간 공장 계약",
    value: "38,000~60,000원",
  },
  {
    name: "이리듐 20년산",
    tier: "산업",
    catalyst: "ic2:iridium",
    purpose: "마스터 양조사 승급",
    value: "140,000~240,000원",
  },
  {
    name: "용광로 심장주",
    tier: "신화",
    catalyst: "용광로 수호자 심장",
    purpose: "수호자 장비·박물관",
    value: "180,000~300,000원",
  },
  {
    name: "공허 수확",
    tier: "신화",
    catalyst: "공허 수확자 파편",
    purpose: "공허추적자 펫 해금",
    value: "220,000~360,000원",
  },
  {
    name: "특이점 0호",
    tier: "신화",
    catalyst: "보스 코어·AE 특이점",
    purpose: "T3 유물 최종 정제",
    value: "350,000~550,000원",
  },
  {
    name: "Meka 황혼",
    tier: "신화",
    catalyst: "원자합금·정제흑요석",
    purpose: "MekaSuit 치장 외형 해금",
    value: "300,000~480,000원",
  },
  {
    name: "서버장 비밀금고",
    tier: "신화",
    catalyst: "계절 인장 8종",
    purpose: "숨겨진 칭호·전시용 병",
    value: "500,000~800,000원",
  },
  {
    name: "정적 속의 파동",
    tier: "신화",
    catalyst: "최적화 훈장",
    purpose: "성능 도전 업적",
    value: "250,000~420,000원",
  },
  {
    name: "원자로의 마지막 밤",
    tier: "신화",
    catalyst: "밀봉 폴로늄 촉매",
    purpose: "원자로 스토리 결말 분기",
    value: "420,000~680,000원",
  },
  {
    name: "마지막 백업",
    tier: "신화",
    catalyst: "시즌 최종 보상",
    purpose: "시즌 명예의 전당",
    value: "거래 불가",
  },
];

export const questChains: QuestChain[] = [
  {
    name: "난파선에서 깨어나다",
    category: "메인",
    chapters: 5,
    length: "40분",
    unlock: "첫 접속",
    reward: "RTP 쿠폰·진로 선택",
  },
  {
    name: "기계의 첫 톱니",
    category: "산업",
    chapters: 6,
    length: "1시간",
    unlock: "Create 안산암 합금 제작",
    reward: "Create 계약 해금",
  },
  {
    name: "오스뮴의 푸른 불꽃",
    category: "산업",
    chapters: 6,
    length: "1시간 20분",
    unlock: "오스뮴 주괴 획득",
    reward: "Mekanism 계약 해금",
  },
  {
    name: "저장망의 유령",
    category: "산업",
    chapters: 6,
    length: "1시간",
    unlock: "ME 컨트롤러 제작",
    reward: "AE2 유물 연구",
  },
  {
    name: "산업도시의 계약서",
    category: "경제",
    chapters: 8,
    length: "2시간",
    unlock: "일일 계약 5회 완료",
    reward: "계약 등급·정밀 촉매",
  },
  {
    name: "해적섬의 검은 장부",
    category: "메인",
    chapters: 6,
    length: "1시간 30분",
    unlock: "스폰 NPC 조사",
    reward: "개인 워프·해적 칭호",
  },
  {
    name: "주식왕 김풀매수",
    category: "경제",
    chapters: 5,
    length: "45분",
    unlock: "주식 최초 매수",
    reward: "거래 수수료 쿠폰",
  },
  {
    name: "양조사와 6시 재시작",
    category: "생활",
    chapters: 8,
    length: "3일",
    unlock: "기초 양조 면허",
    reward: "산업 양조 면허",
  },
  {
    name: "낚시꾼의 404번째 어종",
    category: "생활",
    chapters: 8,
    length: "3시간",
    unlock: "어종 20종 등록",
    reward: "신화 미끼·404 칭호",
  },
  {
    name: "고대 유물 연구소",
    category: "탐험",
    chapters: 8,
    length: "2시간 30분",
    unlock: "유물 파편 10개",
    reward: "가상 유물 슬롯",
  },
  {
    name: "카지노의 확률은 거짓말하지 않는다",
    category: "경제",
    chapters: 6,
    length: "1시간",
    unlock: "카지노 입장",
    reward: "확률 공개 도감·치장",
  },
  {
    name: "공허에 열린 송장",
    category: "엔드게임",
    chapters: 8,
    length: "2시간",
    unlock: "공허 수확자 처치",
    reward: "공허 장비·펫 권한",
  },
  {
    name: "마지막 백업",
    category: "엔드게임",
    chapters: 10,
    length: "4시간",
    unlock: "세 보스 주간 최초 처치",
    reward: "시즌 최종 칭호",
  },
  {
    name: "펫 조련사 시험",
    category: "생활",
    chapters: 6,
    length: "1시간",
    unlock: "펫 면허 구매",
    reward: "첫 종 해금·보관 슬롯",
  },
  {
    name: "비밀 박물관",
    category: "탐험",
    chapters: 8,
    length: "상시",
    unlock: "도감 10% 달성",
    reward: "전시대·박물관 배지",
  },
  {
    name: "택병 시즌: 특이점",
    category: "메인",
    chapters: 12,
    length: "8주",
    unlock: "시즌 자동 시작",
    reward: "시즌 휘장·명예의 전당",
  },
];

export const currentSystems = [
  {
    title: "동적 통합 상점",
    eyebrow: "현재 운영",
    body: "10개 카테고리 348개 상품. 많이 팔면 가격이 내려가고, 거래가 없으면 24시간 기준가로 회복합니다.",
  },
  {
    title: "한국·미국 증권",
    eyebrow: "현재 운영",
    body: "한국·미국 주식과 ETF를 조회하고 거래합니다. 검색한 종목은 바로 추가됩니다.",
  },
  {
    title: "산업 자동화",
    eyebrow: "현재 운영",
    body: "Create, Mekanism, AE2, IC2를 한 경제권으로 묶었습니다. 자동화 단계가 올라갈수록 계약과 연구가 열립니다.",
  },
  {
    title: "mcMMO·커스텀 강화",
    eyebrow: "현재 운영",
    body: "스킬 성장과 장비 강화, 호퍼 업그레이드에 따라 보상과 새 목표가 열립니다.",
  },
  {
    title: "해적섬 스폰",
    eyebrow: "현재 운영",
    body: "상점·카지노·주식·랜덤 야생 이동 NPC가 모인 독립 허브입니다.",
  },
  {
    title: "동료·레이드·생활 길드",
    eyebrow: "현재 운영",
    body: "양조 40종·물고기 72종·동료 12종·보스 3종·퀘스트 196개가 서로 이어집니다.",
  },
];

export const pets: Pet[] = [
  {
    name: "황동 톱니 요정",
    model: "자체 ItemDisplay",
    role: "Create 기술자 · 자석 회수",
    unlock: "600,000원",
    limit: "Lv에 따라 4.2~10블록 아이템 흡수",
  },
  {
    name: "오스뮴 경비견",
    model: "자체 ItemDisplay",
    role: "Mekanism 기술자 · 경비 장갑",
    unlock: "900,000원",
    limit: "저항 I, Lv.20부터 흡수 I",
  },
  {
    name: "공허추적자",
    model: "자체 ItemDisplay",
    role: "공허 탐험가 · 공허의 눈",
    unlock: "1,200,000원",
    limit: "야간 투시, Lv.20부터 야간 신속",
  },
  {
    name: "광산 구조 드론",
    model: "자체 ItemDisplay",
    role: "광산 기술자 · 채광 보조",
    unlock: "800,000원",
    limit: "성급함 I, Lv.20부터 II",
  },
  {
    name: "플루익스 정령",
    model: "자체 ItemDisplay",
    role: "AE2 기술자 · 양자 공명",
    unlock: "1,400,000원",
    limit: "행운 I, Lv.20부터 II",
  },
  {
    name: "해적 앵무",
    model: "자체 ItemDisplay",
    role: "해적섬 탐험가 · 순풍",
    unlock: "650,000원",
    limit: "신속 I, Lv.20부터 II",
  },
  {
    name: "404 복어",
    model: "자체 ItemDisplay",
    role: "낚시 명예 · 404 잠수",
    unlock: "1,600,000원",
    limit: "수중 호흡·돌고래의 우아함",
  },
  {
    name: "용궁 아홀로틀",
    model: "자체 ItemDisplay",
    role: "수중 탐험 · 용궁의 축복",
    unlock: "1,500,000원",
    limit: "물속에서 수중 호흡·재생 I",
  },
  {
    name: "벌꿀 슬라임",
    model: "자체 ItemDisplay",
    role: "농업·양조 · 달콤한 대사",
    unlock: "950,000원",
    limit: "펫 배고픔 소모 50% 감소",
  },
  {
    name: "원자로 반딧불",
    model: "자체 ItemDisplay",
    role: "원자로 기술자 · 차폐막",
    unlock: "2,200,000원",
    limit: "상시 화염 저항",
  },
  {
    name: "설원 여우",
    model: "자체 ItemDisplay",
    role: "설원 탐험가 · 설상 보행",
    unlock: "1,300,000원",
    limit: "저속 낙하·점프 강화",
  },
  {
    name: "특이점 감시자",
    model: "자체 ItemDisplay",
    role: "특이점 명예 · 혼돈 순환",
    unlock: "5,000,000원",
    limit: "5분마다 6종 버프 무작위 교대",
  },
];
