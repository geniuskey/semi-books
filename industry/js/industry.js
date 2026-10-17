/* Copyright (c) 2026 geniuskey and ChipIndustryBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and data tables: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   ChipIndustryBook 산업 엔진 — 전역 객체 IND
   모든 장이 같은 숫자와 같은 모델을 쓰게 하는 공통 데이터·계산부.
   - 데이터: 지역, 가치사슬 단계, 회사, 시장 연표, 노드, 거점, 이어지는 타깃 AX-1
   - 모델: 웨이퍼당 다이 수, 수율, 다이 원가, 팹 경제학, 칩렛, 집중도, 사이클
   - 지도: 거친 세계 지도(점묘·채움), 경위도 투영
   수치는 공개 자료(WSTS, SIA·BCG, 각 사 연차 보고서, IBS, CSET 등)를 반올림한 교육용 근사치다.
   ========================================================================== */
(function () {
  "use strict";
  const IND = (window.IND = {});

  /* ------------------------------------------------------------ 지역 */
  // 색은 CSS --rg-<key>, CB.regionColor(key)
  IND.REGIONS = {
    us:    { name: "미국",     en: "United States", lon: -98,  lat: 39 },
    tw:    { name: "대만",     en: "Taiwan",        lon: 121,  lat: 23.7 },
    kr:    { name: "한국",     en: "South Korea",   lon: 127.8, lat: 36.4 },
    jp:    { name: "일본",     en: "Japan",         lon: 138,  lat: 36.5 },
    cn:    { name: "중국",     en: "China",         lon: 108,  lat: 34 },
    eu:    { name: "유럽",     en: "Europe",        lon: 10,   lat: 50 },
    sea:   { name: "동남아",   en: "Southeast Asia", lon: 104, lat: 8 },
    other: { name: "기타",     en: "Other",         lon: 40,   lat: 25 },
  };
  IND.REGION_KEYS = ["us", "tw", "kr", "jp", "cn", "eu", "sea", "other"];

  /* ------------------------------------------------------------ 가치사슬 */
  // va: 산업 전체 부가가치에서 차지하는 비중(약). capex·rnd: 산업 설비투자·R&D에서 차지하는 비중(원자료 그대로라 합이 100을 조금 넘는다). share: 그 단계의 지역별 부가가치 점유(약, 합 100).
  // 근거: SIA·BCG "Strengthening the Global Semiconductor Supply Chain"(2021)의 2019년 수치를 반올림. 동남아는 '기타'에서 분리한 근사.
  IND.SEGMENTS = [
    { key: "ip",     name: "EDA·핵심 IP",  en: "EDA & core IP",            stage: 0, va: 4,  capex: 1, rnd: 33,
      share: { us: 74, eu: 20, jp: 3, cn: 2, tw: 0, kr: 0, sea: 0, other: 1 } },
    { key: "design", name: "로직 설계",     en: "Logic design",             stage: 1, va: 29, capex: 4, rnd: 20,
      share: { us: 67, tw: 9, eu: 8, cn: 6, kr: 4, jp: 4, sea: 0, other: 2 } },
    { key: "dao",    name: "아날로그·개별 소자 설계", en: "DAO design",        stage: 1, va: 17, capex: 10, rnd: 15,
      share: { us: 37, jp: 22, eu: 19, cn: 9, tw: 6, kr: 3, sea: 1, other: 3 } },
    { key: "mem",    name: "메모리 설계",   en: "Memory design",            stage: 1, va: 9,  capex: 15, rnd: 9,
      share: { kr: 58, us: 29, jp: 10, tw: 2, cn: 1, eu: 0, sea: 0, other: 0 } },
    { key: "equip",  name: "장비",          en: "Equipment",                stage: 2, va: 11, capex: 3, rnd: 15,
      share: { us: 41, jp: 31, eu: 18, kr: 3, cn: 2, tw: 1, sea: 1, other: 3 } },
    { key: "mat",    name: "소재",          en: "Materials",                stage: 2, va: 5,  capex: 8, rnd: 5,
      share: { tw: 22, kr: 16, jp: 14, cn: 13, us: 11, eu: 6, sea: 10, other: 8 } },
    { key: "fab",    name: "웨이퍼 제조",   en: "Wafer fabrication",        stage: 3, va: 19, capex: 64, rnd: 5,
      share: { tw: 20, kr: 19, jp: 17, cn: 16, us: 12, eu: 8, sea: 6, other: 2 } },
    { key: "atp",    name: "패키징·테스트", en: "Assembly, packaging & test", stage: 4, va: 6,  capex: 13, rnd: 3,
      share: { cn: 38, tw: 19, sea: 21, kr: 9, jp: 6, us: 2, eu: 3, other: 2 } },
  ];
  IND.segment = (key) => IND.SEGMENTS.find((s) => s.key === key);
  // 전체 부가가치의 지역별 점유(약, 2019): 위 표를 va로 가중 평균한 값과 거의 같다.
  IND.totalShare = function () {
    const out = {}; IND.REGION_KEYS.forEach((k) => (out[k] = 0));
    const tot = IND.SEGMENTS.reduce((a, s) => a + s.va, 0);
    IND.SEGMENTS.forEach((s) => IND.REGION_KEYS.forEach((k) => (out[k] += ((s.share[k] || 0) * s.va) / tot)));
    return out;
  };

  /* ------------------------------------------------------------ 회사 */
  // seg: ip design mem equip mat fab atp (fab = 파운드리, idm = 자체 팹을 가진 종합 반도체)
  // rev: 2024년(회계연도 기준) 매출 약, 십억 달러. 반도체·해당 사업부 중심으로 반올림한 근사. 순위 비교용으로만 쓴다.
  // model: fabless | foundry | idm | osat | equip | mat | eda | ip
  IND.COMPANIES = [
    // 설계 도구·IP
    { id: "synopsys", name: "Synopsys", ko: "시놉시스", rg: "us", country: "미국", seg: "ip", model: "eda", rev: 6.1, note: "EDA 1위. 합성·검증·인터페이스 IP" },
    { id: "cadence", name: "Cadence", ko: "케이던스", rg: "us", country: "미국", seg: "ip", model: "eda", rev: 4.6, note: "EDA 2위. 아날로그·배치배선·검증" },
    { id: "siemens-eda", name: "Siemens EDA", ko: "지멘스 EDA", rg: "eu", country: "독일", seg: "ip", model: "eda", rev: 2.0, note: "옛 멘토 그래픽스. 물리 검증(DRC) 강자" },
    { id: "arm", name: "Arm", ko: "Arm", rg: "eu", country: "영국", seg: "ip", model: "ip", rev: 4.0, note: "CPU 명령어 구조와 코어 IP. 라이선스 + 로열티" },
    { id: "imagination", name: "Imagination", ko: "이매지네이션", rg: "eu", country: "영국", seg: "ip", model: "ip", rev: 0.15, note: "GPU IP" },
    { id: "sifive", name: "SiFive", ko: "사이파이브", rg: "us", country: "미국", seg: "ip", model: "ip", rev: 0.1, note: "RISC-V 코어 IP" },
    { id: "empyrean", name: "Empyrean", ko: "엠피리언", rg: "cn", country: "중국", seg: "ip", model: "eda", rev: 0.15, note: "중국 최대 EDA" },
    // 팹리스 (로직 설계)
    { id: "nvidia", name: "NVIDIA", ko: "엔비디아", rg: "us", country: "미국", seg: "design", model: "fabless", rev: 124, note: "GPU·AI 가속기. 데이터센터 매출이 대부분" },
    { id: "broadcom", name: "Broadcom", ko: "브로드컴", rg: "us", country: "미국", seg: "design", model: "fabless", rev: 30, note: "네트워크 칩·맞춤형 AI 칩(ASIC). 반도체 부문" },
    { id: "qualcomm", name: "Qualcomm", ko: "퀄컴", rg: "us", country: "미국", seg: "design", model: "fabless", rev: 33, note: "스마트폰 AP·모뎀. 특허 라이선스 별도" },
    { id: "amd", name: "AMD", ko: "AMD", rg: "us", country: "미국", seg: "design", model: "fabless", rev: 25.8, note: "CPU·GPU. 2009년 팹을 분사(현 GlobalFoundries)" },
    { id: "apple", name: "Apple (Silicon)", ko: "애플 실리콘", rg: "us", country: "미국", seg: "design", model: "fabless", rev: 0, note: "자체 칩(A·M 시리즈)을 설계하지만 외부에 팔지 않는다" },
    { id: "mediatek", name: "MediaTek", ko: "미디어텍", rg: "tw", country: "대만", seg: "design", model: "fabless", rev: 16.6, note: "스마트폰 AP 출하량 1위권" },
    { id: "marvell", name: "Marvell", ko: "마벨", rg: "us", country: "미국", seg: "design", model: "fabless", rev: 5.8, note: "데이터센터 네트워크·맞춤형 칩" },
    { id: "realtek", name: "Realtek", ko: "리얼텍", rg: "tw", country: "대만", seg: "design", model: "fabless", rev: 3.5, note: "네트워크·오디오 칩" },
    { id: "novatek", name: "Novatek", ko: "노바텍", rg: "tw", country: "대만", seg: "design", model: "fabless", rev: 3.1, note: "디스플레이 구동칩" },
    { id: "hisilicon", name: "HiSilicon", ko: "하이실리콘", rg: "cn", country: "중국", seg: "design", model: "fabless", rev: 4, note: "화웨이 자회사. AP·AI 칩" },
    { id: "lx-semicon", name: "LX Semicon", ko: "LX세미콘", rg: "kr", country: "한국", seg: "design", model: "fabless", rev: 1.4, note: "디스플레이 구동칩. 한국 팹리스 1위" },
    { id: "rebellions", name: "Rebellions", ko: "리벨리온", rg: "kr", country: "한국", seg: "design", model: "fabless", rev: 0.02, note: "AI 추론 칩 스타트업" },
    // 종합 반도체(IDM)·메모리
    { id: "samsung", name: "Samsung Electronics", ko: "삼성전자", rg: "kr", country: "한국", seg: "mem", model: "idm", rev: 81, note: "메모리 1위권 + 파운드리 + 시스템LSI. DS 부문" },
    { id: "skhynix", name: "SK hynix", ko: "SK하이닉스", rg: "kr", country: "한국", seg: "mem", model: "idm", rev: 48, note: "DRAM 2위권, HBM 선두" },
    { id: "micron", name: "Micron", ko: "마이크론", rg: "us", country: "미국", seg: "mem", model: "idm", rev: 25, note: "미국 유일의 대형 메모리 회사" },
    { id: "kioxia", name: "Kioxia", ko: "키옥시아", rg: "jp", country: "일본", seg: "mem", model: "idm", rev: 11, note: "NAND. 옛 도시바 메모리" },
    { id: "sandisk", name: "Sandisk", ko: "샌디스크", rg: "us", country: "미국", seg: "mem", model: "idm", rev: 7, note: "NAND. 키옥시아와 팹을 함께 운영" },
    { id: "cxmt", name: "CXMT", ko: "CXMT", rg: "cn", country: "중국", seg: "mem", model: "idm", rev: 3.5, note: "중국 DRAM" },
    { id: "ymtc", name: "YMTC", ko: "YMTC", rg: "cn", country: "중국", seg: "mem", model: "idm", rev: 3, note: "중국 3D NAND" },
    { id: "intel", name: "Intel", ko: "인텔", rg: "us", country: "미국", seg: "design", model: "idm", rev: 53, note: "x86 CPU. 파운드리 사업(인텔 파운드리) 병행" },
    { id: "ti", name: "Texas Instruments", ko: "텍사스 인스트루먼트", rg: "us", country: "미국", seg: "dao", model: "idm", rev: 15.6, note: "아날로그 1위. 300 mm 아날로그 팹" },
    { id: "infineon", name: "Infineon", ko: "인피니언", rg: "eu", country: "독일", seg: "dao", model: "idm", rev: 16, note: "전력 반도체·차량용 MCU" },
    { id: "st", name: "STMicroelectronics", ko: "ST마이크로", rg: "eu", country: "프랑스·이탈리아", seg: "dao", model: "idm", rev: 13.3, note: "MCU·전력·센서" },
    { id: "nxp", name: "NXP", ko: "NXP", rg: "eu", country: "네덜란드", seg: "dao", model: "idm", rev: 12.6, note: "차량용 반도체·보안 칩" },
    { id: "adi", name: "Analog Devices", ko: "아날로그 디바이스", rg: "us", country: "미국", seg: "dao", model: "idm", rev: 9.4, note: "고성능 아날로그·데이터 변환" },
    { id: "renesas", name: "Renesas", ko: "르네사스", rg: "jp", country: "일본", seg: "dao", model: "idm", rev: 8.8, note: "차량용 MCU" },
    { id: "onsemi", name: "onsemi", ko: "온세미", rg: "us", country: "미국", seg: "dao", model: "idm", rev: 7.1, note: "전력(SiC)·이미지 센서" },
    { id: "microchip", name: "Microchip", ko: "마이크로칩", rg: "us", country: "미국", seg: "dao", model: "idm", rev: 4.4, note: "MCU" },
    { id: "sony-ss", name: "Sony Semiconductor", ko: "소니 반도체", rg: "jp", country: "일본", seg: "dao", model: "idm", rev: 11, note: "이미지 센서 1위" },
    // 파운드리
    { id: "tsmc", name: "TSMC", ko: "TSMC", rg: "tw", country: "대만", seg: "fab", model: "foundry", rev: 90, note: "파운드리 점유율 약 2/3. 선단 공정 거의 독점" },
    { id: "samsung-foundry", name: "Samsung Foundry", ko: "삼성 파운드리", rg: "kr", country: "한국", seg: "fab", model: "foundry", rev: 13, note: "GAA 3 nm를 먼저 양산. 삼성전자 DS 부문 안" },
    { id: "smic", name: "SMIC", ko: "SMIC", rg: "cn", country: "중국", seg: "fab", model: "foundry", rev: 8.0, note: "중국 최대 파운드리" },
    { id: "umc", name: "UMC", ko: "UMC", rg: "tw", country: "대만", seg: "fab", model: "foundry", rev: 7.3, note: "성숙 공정 파운드리" },
    { id: "gf", name: "GlobalFoundries", ko: "글로벌파운드리", rg: "us", country: "미국", seg: "fab", model: "foundry", rev: 6.8, note: "성숙·특수 공정. 선단 경쟁에서 2018년 철수" },
    { id: "huahong", name: "Hua Hong", ko: "화훙", rg: "cn", country: "중국", seg: "fab", model: "foundry", rev: 2.0, note: "중국 성숙 공정" },
    { id: "vis", name: "VIS", ko: "VIS", rg: "tw", country: "대만", seg: "fab", model: "foundry", rev: 1.4, note: "8인치 중심" },
    { id: "tower", name: "Tower Semiconductor", ko: "타워", rg: "other", country: "이스라엘", seg: "fab", model: "foundry", rev: 1.4, note: "아날로그·RF 특수 공정" },
    { id: "dbhitek", name: "DB HiTek", ko: "DB하이텍", rg: "kr", country: "한국", seg: "fab", model: "foundry", rev: 0.9, note: "8인치 아날로그·전력 파운드리" },
    { id: "rapidus", name: "Rapidus", ko: "라피더스", rg: "jp", country: "일본", seg: "fab", model: "foundry", rev: 0, note: "2 nm 양산을 목표로 2022년 설립" },
    // 장비
    { id: "asml", name: "ASML", ko: "ASML", rg: "eu", country: "네덜란드", seg: "equip", model: "equip", rev: 30.6, note: "노광 장비. EUV는 유일한 공급사" },
    { id: "amat", name: "Applied Materials", ko: "어플라이드 머티어리얼즈", rg: "us", country: "미국", seg: "equip", model: "equip", rev: 27.2, note: "증착·식각·이온 주입·CMP 등 가장 넓은 제품군" },
    { id: "lam", name: "Lam Research", ko: "램리서치", rg: "us", country: "미국", seg: "equip", model: "equip", rev: 14.9, note: "식각 1위, 증착" },
    { id: "tel", name: "Tokyo Electron", ko: "도쿄 일렉트론", rg: "jp", country: "일본", seg: "equip", model: "equip", rev: 16, note: "코터·현상기(트랙) 독점에 가깝다, 식각·증착" },
    { id: "kla", name: "KLA", ko: "KLA", rg: "us", country: "미국", seg: "equip", model: "equip", rev: 9.8, note: "검사·계측 1위" },
    { id: "advantest", name: "Advantest", ko: "어드밴테스트", rg: "jp", country: "일본", seg: "equip", model: "equip", rev: 5.1, note: "테스트 장비(ATE)" },
    { id: "teradyne", name: "Teradyne", ko: "테라다인", rg: "us", country: "미국", seg: "equip", model: "equip", rev: 2.8, note: "테스트 장비" },
    { id: "screen", name: "SCREEN", ko: "스크린", rg: "jp", country: "일본", seg: "equip", model: "equip", rev: 3.5, note: "세정 장비 1위" },
    { id: "asmi", name: "ASM International", ko: "ASM 인터내셔널", rg: "eu", country: "네덜란드", seg: "equip", model: "equip", rev: 3.2, note: "원자층 증착(ALD)" },
    { id: "kokusai", name: "Kokusai Electric", ko: "고쿠사이", rg: "jp", country: "일본", seg: "equip", model: "equip", rev: 1.5, note: "배치형 증착로" },
    { id: "disco", name: "DISCO", ko: "디스코", rg: "jp", country: "일본", seg: "equip", model: "equip", rev: 2.6, note: "웨이퍼 절단·연삭" },
    { id: "lasertec", name: "Lasertec", ko: "레이저텍", rg: "jp", country: "일본", seg: "equip", model: "equip", rev: 1.6, note: "EUV 마스크 검사" },
    { id: "naura", name: "NAURA", ko: "나우라", rg: "cn", country: "중국", seg: "equip", model: "equip", rev: 4.1, note: "중국 최대 장비사" },
    { id: "amec", name: "AMEC", ko: "AMEC", rg: "cn", country: "중국", seg: "equip", model: "equip", rev: 1.3, note: "식각 장비" },
    { id: "semes", name: "SEMES", ko: "세메스", rg: "kr", country: "한국", seg: "equip", model: "equip", rev: 2.0, note: "삼성전자 자회사. 세정·트랙" },
    { id: "hanmi", name: "Hanmi Semiconductor", ko: "한미반도체", rg: "kr", country: "한국", seg: "equip", model: "equip", rev: 0.4, note: "HBM용 열압착(TC) 본더" },
    { id: "wonik", name: "Wonik IPS", ko: "원익IPS", rg: "kr", country: "한국", seg: "equip", model: "equip", rev: 0.6, note: "증착 장비" },
    { id: "zeiss", name: "ZEISS SMT", ko: "자이스 SMT", rg: "eu", country: "독일", seg: "equip", model: "equip", rev: 4.5, note: "EUV 거울을 만드는 ASML의 단독 협력사" },
    // 소재
    { id: "shinetsu", name: "Shin-Etsu Chemical", ko: "신에쓰화학", rg: "jp", country: "일본", seg: "mat", model: "mat", rev: 7, note: "실리콘 웨이퍼 1위, 포토레지스트. 매출은 반도체 소재 부문 근사치" },
    { id: "sumco", name: "SUMCO", ko: "섬코", rg: "jp", country: "일본", seg: "mat", model: "mat", rev: 2.6, note: "실리콘 웨이퍼 2위" },
    { id: "globalwafers", name: "GlobalWafers", ko: "글로벌웨이퍼스", rg: "tw", country: "대만", seg: "mat", model: "mat", rev: 2.0, note: "실리콘 웨이퍼 3위" },
    { id: "sksiltron", name: "SK siltron", ko: "SK실트론", rg: "kr", country: "한국", seg: "mat", model: "mat", rev: 1.6, note: "실리콘 웨이퍼" },
    { id: "jsr", name: "JSR", ko: "JSR", rg: "jp", country: "일본", seg: "mat", model: "mat", rev: 1.5, note: "포토레지스트. 2024년 정부 펀드가 인수" },
    { id: "tok", name: "TOK", ko: "도쿄오카공업", rg: "jp", country: "일본", seg: "mat", model: "mat", rev: 1.3, note: "포토레지스트 1위권" },
    { id: "entegris", name: "Entegris", ko: "엔테그리스", rg: "us", country: "미국", seg: "mat", model: "mat", rev: 3.2, note: "필터·특수 화학·소모품" },
    { id: "linde", name: "Linde (Electronics)", ko: "린데", rg: "eu", country: "독일·영국", seg: "mat", model: "mat", rev: 2.5, note: "산업·특수 가스. 매출은 전자 부문 근사치" },
    { id: "airliquide", name: "Air Liquide (Electronics)", ko: "에어리퀴드", rg: "eu", country: "프랑스", seg: "mat", model: "mat", rev: 2.6, note: "특수 가스. 매출은 전자 부문 근사치" },
    { id: "soulbrain", name: "Soulbrain", ko: "솔브레인", rg: "kr", country: "한국", seg: "mat", model: "mat", rev: 0.6, note: "식각액(불산)" },
    { id: "dongjin", name: "Dongjin Semichem", ko: "동진쎄미켐", rg: "kr", country: "한국", seg: "mat", model: "mat", rev: 1.1, note: "포토레지스트·습식 화학" },
    { id: "photronics", name: "Photronics", ko: "포트로닉스", rg: "us", country: "미국", seg: "mat", model: "mat", rev: 0.87, note: "포토마스크(외부 판매)" },
    { id: "ajinomoto", name: "Ajinomoto (ABF)", ko: "아지노모토", rg: "jp", country: "일본", seg: "mat", model: "mat", rev: 0.5, note: "패키지 기판 절연 필름(ABF) 사실상 독점" },
    { id: "ibiden", name: "Ibiden", ko: "이비덴", rg: "jp", country: "일본", seg: "mat", model: "mat", rev: 2.4, note: "고성능 패키지 기판" },
    { id: "semco", name: "Samsung Electro-Mechanics", ko: "삼성전기", rg: "kr", country: "한국", seg: "mat", model: "mat", rev: 1.6, note: "패키지 기판(FC-BGA). 매출은 기판 부문 근사치" },
    // 패키징·테스트(OSAT)
    { id: "ase", name: "ASE", ko: "ASE", rg: "tw", country: "대만", seg: "atp", model: "osat", rev: 12, note: "OSAT 1위. 매출은 패키징·테스트 부문 근사치(EMS 제외)" },
    { id: "amkor", name: "Amkor", ko: "앰코", rg: "us", country: "미국(본사)·한국 출신", seg: "atp", model: "osat", rev: 6.3, note: "OSAT 2위. 한국·필리핀·베트남 공장" },
    { id: "jcet", name: "JCET", ko: "JCET", rg: "cn", country: "중국", seg: "atp", model: "osat", rev: 5.0, note: "OSAT 3위. 싱가포르 STATS ChipPAC 인수" },
    { id: "tfme", name: "Tongfu (TFME)", ko: "퉁푸", rg: "cn", country: "중국", seg: "atp", model: "osat", rev: 3.3, note: "AMD 물량 비중이 크다" },
    { id: "pti", name: "Powertech (PTI)", ko: "PTI", rg: "tw", country: "대만", seg: "atp", model: "osat", rev: 2.2, note: "메모리 패키징" },
    { id: "hanamicron", name: "Hana Micron", ko: "하나마이크론", rg: "kr", country: "한국", seg: "atp", model: "osat", rev: 0.9, note: "메모리 패키징·테스트" },
  ];
  IND.company = (id) => IND.COMPANIES.find((c) => c.id === id);
  IND.bySeg = (seg) => IND.COMPANIES.filter((c) => c.seg === seg).sort((a, b) => b.rev - a.rev);

  /* ------------------------------------------------------------ 시장 */
  // 세계 반도체 매출(WSTS, 십억 달러, 반올림). 2025는 추정(e).
  IND.MARKET = [
    [1986, 26], [1987, 33], [1988, 51], [1989, 57], [1990, 50], [1991, 55], [1992, 60], [1993, 77], [1994, 102], [1995, 144],
    [1996, 132], [1997, 137], [1998, 126], [1999, 149], [2000, 204], [2001, 139], [2002, 141], [2003, 166], [2004, 213], [2005, 228],
    [2006, 248], [2007, 256], [2008, 249], [2009, 226], [2010, 298], [2011, 300], [2012, 292], [2013, 306], [2014, 336], [2015, 335],
    [2016, 339], [2017, 412], [2018, 469], [2019, 412], [2020, 440], [2021, 556], [2022, 574], [2023, 527], [2024, 630], [2025, 750],
  ];
  IND.MARKET_EST_FROM = 2025;
  // 메모리 매출(약, 십억 달러). 사이클 진폭이 전체보다 훨씬 크다.
  IND.MEMORY = [
    [2010, 69], [2011, 61], [2012, 57], [2013, 67], [2014, 79], [2015, 77], [2016, 77], [2017, 124], [2018, 158], [2019, 106],
    [2020, 117], [2021, 154], [2022, 130], [2023, 92], [2024, 165], [2025, 200],
  ];
  // 2024년 제품별 매출(약, 십억 달러, WSTS 분류)
  IND.PRODUCTS = [
    { key: "logic",  name: "로직",       en: "Logic",       v: 215, note: "CPU·GPU·AP·ASIC·FPGA 등" },
    { key: "memory", name: "메모리",     en: "Memory",      v: 165, note: "DRAM·NAND·HBM" },
    { key: "analog", name: "아날로그",   en: "Analog",      v: 79,  note: "전원 관리·신호 변환·증폭" },
    { key: "micro",  name: "마이크로",   en: "Micro",       v: 77,  note: "MCU·MPU·DSP" },
    { key: "opto",   name: "광소자",     en: "Optoelectronics", v: 43, note: "이미지 센서·LED·레이저" },
    { key: "disc",   name: "개별 소자",  en: "Discretes",   v: 34,  note: "전력 트랜지스터·다이오드" },
    { key: "sensor", name: "센서",       en: "Sensors",     v: 19,  note: "MEMS·압력·관성 센서" },
  ];
  // 응용(최종 시장)별 비중(약, 2024)
  IND.END_MARKETS = [
    { key: "dc",    name: "데이터센터·PC", en: "Computing", share: 0.36, units: "서버 약 1,300만 대, PC 약 2.6억 대" },
    { key: "comm",  name: "통신(스마트폰 포함)", en: "Communication", share: 0.30, units: "스마트폰 약 12억 대" },
    { key: "auto",  name: "자동차",        en: "Automotive", share: 0.12, units: "차량 약 9천만 대" },
    { key: "ind",   name: "산업",          en: "Industrial", share: 0.11, units: "공장 자동화·전력망·의료" },
    { key: "cons",  name: "소비자 가전",   en: "Consumer",   share: 0.10, units: "TV·가전·게임기·웨어러블" },
    { key: "gov",   name: "정부·국방",     en: "Government", share: 0.01, units: "" },
  ];
  // 지역별 판매(칩을 사 가는 곳, 약 2024). 중국은 조립 공장이 많아 '사 가는 곳'으로 크게 잡힌다.
  IND.SALES_BY_REGION = { cn: 0.30, us: 0.31, sea: 0.22, eu: 0.08, jp: 0.07, other: 0.02 };

  /* ------------------------------------------------------------ 공정 노드 */
  // wafer: 300 mm 웨이퍼 판매가 추정(달러, 양산 초기 기준), design: 첨단 SoC 하나의 설계비 추정(백만 달러, IBS 계열 추정),
  // density: 로직 트랜지스터 밀도 약(백만 개/mm²), masks: 마스크 장수 약, maskSet: 마스크 세트 가격 약(백만 달러)
  IND.NODES = [
    { node: "90 nm", year: 2004, wafer: 1650,  design: 15,  density: 1.5, masks: 35, maskSet: 0.6 },
    { node: "65 nm", year: 2006, wafer: 1940,  design: 28,  density: 2.5, masks: 40, maskSet: 0.9 },
    { node: "40 nm", year: 2008, wafer: 2270,  design: 38,  density: 5,   masks: 45, maskSet: 1.5 },
    { node: "28 nm", year: 2011, wafer: 2890,  design: 51,  density: 14,  masks: 50, maskSet: 2.5 },
    { node: "16 nm", year: 2015, wafer: 3980,  design: 106, density: 29,  masks: 60, maskSet: 5 },
    { node: "10 nm", year: 2017, wafer: 5990,  design: 174, density: 52,  masks: 70, maskSet: 8 },
    { node: "7 nm",  year: 2018, wafer: 9350,  design: 297, density: 91,  masks: 80, maskSet: 12 },
    { node: "5 nm",  year: 2020, wafer: 16990, design: 542, density: 138, masks: 85, maskSet: 18 },
    { node: "3 nm",  year: 2022, wafer: 20000, design: 590, density: 200, masks: 90, maskSet: 25 },
    { node: "2 nm",  year: 2025, wafer: 30000, design: 725, density: 240, masks: 95, maskSet: 30 },
  ];
  IND.node = (name) => IND.NODES.find((n) => n.node === name);

  /* ------------------------------------------------------------ 거점(지도용) */
  // kind: fab | mem | equip | design | atp | mat | hq
  IND.HUBS = [
    { name: "신주(新竹)", rg: "tw", lon: 121.0, lat: 24.8, kind: "fab", note: "TSMC 본사·연구소, 과학단지" },
    { name: "타이난",     rg: "tw", lon: 120.3, lat: 23.0, kind: "fab", note: "TSMC 선단 공정 기가팹" },
    { name: "가오슝",     rg: "tw", lon: 120.3, lat: 22.6, kind: "atp", note: "ASE 패키징, TSMC 2 nm 팹" },
    { name: "평택",       rg: "kr", lon: 127.0, lat: 37.0, kind: "mem", note: "삼성전자 최대 생산 단지" },
    { name: "화성·기흥",  rg: "kr", lon: 127.05, lat: 37.2, kind: "fab", note: "삼성전자 메모리·파운드리" },
    { name: "이천",       rg: "kr", lon: 127.45, lat: 37.27, kind: "mem", note: "SK하이닉스 본사 팹" },
    { name: "청주",       rg: "kr", lon: 127.5, lat: 36.65, kind: "mem", note: "SK하이닉스 낸드·HBM 패키징" },
    { name: "용인",       rg: "kr", lon: 127.2, lat: 37.15, kind: "mem", note: "반도체 클러스터 건설 중" },
    { name: "구마모토",   rg: "jp", lon: 130.7, lat: 32.8, kind: "fab", note: "TSMC·소니 합작 JASM" },
    { name: "기타카미·욧카이치", rg: "jp", lon: 136.6, lat: 35.0, kind: "mem", note: "키옥시아 NAND" },
    { name: "도쿄",       rg: "jp", lon: 139.7, lat: 35.7, kind: "equip", note: "도쿄 일렉트론, 소재 회사 본사" },
    { name: "홋카이도 지토세", rg: "jp", lon: 141.65, lat: 42.8, kind: "fab", note: "라피더스 2 nm 시범 팹" },
    { name: "벨트호번",   rg: "eu", lon: 5.4,  lat: 51.4, kind: "equip", note: "ASML 본사, EUV 조립" },
    { name: "오버코헨",   rg: "eu", lon: 10.1, lat: 48.8, kind: "equip", note: "자이스 SMT, EUV 광학" },
    { name: "드레스덴",   rg: "eu", lon: 13.7, lat: 51.05, kind: "fab", note: "실리콘 색소니: 인피니언·GF·TSMC 합작" },
    { name: "케임브리지", rg: "eu", lon: 0.12, lat: 52.2, kind: "design", note: "Arm 본사" },
    { name: "실리콘밸리", rg: "us", lon: -122.0, lat: 37.4, kind: "design", note: "엔비디아·AMD·애플·어플라이드·램 본사" },
    { name: "피닉스",     rg: "us", lon: -112.1, lat: 33.4, kind: "fab", note: "TSMC 애리조나, 인텔 챈들러" },
    { name: "힐스버러",   rg: "us", lon: -122.9, lat: 45.5, kind: "fab", note: "인텔 연구개발 팹" },
    { name: "오스틴·테일러", rg: "us", lon: -97.6, lat: 30.5, kind: "fab", note: "삼성 파운드리 미국 팹" },
    { name: "보이시",     rg: "us", lon: -116.2, lat: 43.6, kind: "mem", note: "마이크론 본사" },
    { name: "뉴욕주 몰타", rg: "us", lon: -73.8, lat: 43.0, kind: "fab", note: "GlobalFoundries" },
    { name: "상하이",     rg: "cn", lon: 121.5, lat: 31.2, kind: "fab", note: "SMIC·화훙" },
    { name: "우한",       rg: "cn", lon: 114.3, lat: 30.6, kind: "mem", note: "YMTC" },
    { name: "허페이",     rg: "cn", lon: 117.3, lat: 31.8, kind: "mem", note: "CXMT" },
    { name: "우시",       rg: "cn", lon: 120.3, lat: 31.5, kind: "atp", note: "JCET, SK하이닉스 DRAM 팹" },
    { name: "시안",       rg: "cn", lon: 108.9, lat: 34.3, kind: "mem", note: "삼성전자 NAND 팹" },
    { name: "선전",       rg: "cn", lon: 114.1, lat: 22.5, kind: "design", note: "전자 제품 조립·팹리스" },
    { name: "페낭",       rg: "sea", lon: 100.3, lat: 5.4, kind: "atp", note: "말레이시아 후공정 허브" },
    { name: "싱가포르",   rg: "sea", lon: 103.8, lat: 1.35, kind: "fab", note: "마이크론 NAND, GF, UMC" },
    { name: "베트남 박닌", rg: "sea", lon: 106.1, lat: 21.2, kind: "atp", note: "앰코·삼성 조립" },
    { name: "필리핀 마닐라", rg: "sea", lon: 121.0, lat: 14.6, kind: "atp", note: "후공정·테스트" },
    { name: "벵갈루루",   rg: "other", lon: 77.6, lat: 12.97, kind: "design", note: "글로벌 설계 센터 밀집" },
    { name: "키르야트 갓", rg: "other", lon: 34.8, lat: 31.6, kind: "fab", note: "인텔 이스라엘 팹" },
  ];

  /* ------------------------------------------------------------ 이어지는 타깃 AX-1 */
  // 가상의 팹리스 '노바실리콘'이 설계하는 데이터센터용 AI 가속기. 실제 회사·제품과 무관하다.
  IND.AX1 = {
    name: "AX-1",
    company: "노바실리콘(가상)",
    die: { w: 26, h: 31 },             // mm → 806 mm² (레티클 한계 26 × 33 mm 안)
    node: "3 nm",
    waferCost: 20000,                  // 달러
    D0: 0.1,                           // 결함 밀도, 개/cm²
    yieldModel: "murphy",
    hbm: { stacks: 6, gb: 24, usdPerGB: 12 },   // 144 GB, HBM 원가 약 1,728 달러
    pkg: { interposer: 2400, cost: 900, yield: 0.95 },   // 2.5D 인터포저 mm², 패키징 원가(기판·인터포저·조립), 패키징 수율
    test: 150,                         // 테스트 원가(달러)
    board: 600,                        // 모듈 기판·전원·방열 등(달러)
    price: 25000,                      // 판매가(달러)
    nre: 500,                          // 설계비(백만 달러, 마스크 세트 포함)
    units: 400000,                     // 첫해 판매 목표(개)
    perf: { fp8: 2000, fp16: 1000, bitsFp8: 8 },  // dense TFLOPS
    power: 1000,                       // W
    route: [
      { step: "설계 도구·IP", rg: "us", who: "EDA(미국), CPU 코어 IP(영국 → eu)" },
      { step: "칩 설계", rg: "us", who: "노바실리콘 본사(미국), 설계 센터(인도)" },
      { step: "장비", rg: "eu", who: "EUV(네덜란드), 식각·증착(미국), 트랙·세정(일본)" },
      { step: "소재", rg: "jp", who: "웨이퍼·레지스트(일본), 가스(유럽·미국)" },
      { step: "웨이퍼 제조", rg: "tw", who: "3 nm 파운드리(대만)" },
      { step: "HBM", rg: "kr", who: "HBM 스택(한국)" },
      { step: "2.5D 패키징", rg: "tw", who: "인터포저 패키징(대만)" },
      { step: "최종 테스트", rg: "tw", who: "테스트(대만·동남아)" },
      { step: "서버 조립", rg: "tw", who: "서버 보드·랙 조립(대만·멕시코)" },
      { step: "데이터센터", rg: "us", who: "클라우드 고객(미국)" },
    ],
  };

  /* ------------------------------------------------------------ 모델: 웨이퍼와 다이 */
  /**
   * 웨이퍼 위에 다이 격자를 놓고 실제로 센다(시각화와 같은 결과).
   * w, h: 다이 크기(mm). opt: { d: 300(웨이퍼 지름), edge: 3(가장자리 제외), scribe: 0.1(절단 폭), offset: [dx, dy] 격자 원점 이동(mm) }
   * → { dies: [{x, y, w, h, full}], gross(온전한 다이 수), partial(잘린 다이 수), pitchX, pitchY, R }
   *   x, y는 웨이퍼 중심 기준 다이의 왼쪽 아래(mm, y 위쪽 +)
   */
  IND.waferMap = function (w, h, opt = {}) {
    const d = opt.d || 300, edge = opt.edge == null ? 3 : opt.edge, sc = opt.scribe == null ? 0.1 : opt.scribe;
    const R = d / 2, Rin = R - edge, px = w + sc, py = h + sc;
    const off = opt.offset || [((Math.ceil((2 * R) / px) % 2) ? -px / 2 : 0), ((Math.ceil((2 * R) / py) % 2) ? -py / 2 : 0)];
    const dies = []; let gross = 0, partial = 0;
    const nx = Math.ceil(R / px) + 1, ny = Math.ceil(R / py) + 1;
    for (let i = -nx; i <= nx; i++) for (let j = -ny; j <= ny; j++) {
      const x = i * px + off[0], y = j * py + off[1];
      const cs = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
      const inside = cs.filter(([a, b]) => a * a + b * b <= Rin * Rin).length;
      const touch = cs.some(([a, b]) => a * a + b * b <= R * R) || (Math.abs(x + w / 2) < R && Math.abs(y + h / 2) < R && (x + w / 2) ** 2 + (y + h / 2) ** 2 < R * R);
      if (inside === 4) { dies.push({ x, y, w, h, full: true }); gross++; }
      else if (touch) { dies.push({ x, y, w, h, full: false }); partial++; }
    }
    return { dies, gross, partial, pitchX: px, pitchY: py, R, Rin };
  };
  /** 웨이퍼당 다이 수 근사식: π r²/A − π d/√(2A) (A = 다이 면적 mm², 가장자리 제외 반영) */
  IND.dpw = function (area, opt = {}) {
    const d = (opt.d || 300) - 2 * (opt.edge == null ? 3 : opt.edge);
    return Math.max(0, Math.floor((Math.PI * d * d) / (4 * area) - (Math.PI * d) / Math.sqrt(2 * area)));
  };
  /**
   * 수율 모델. area: cm², D0: 개/cm². model: "poisson" | "murphy" | "negbin"(alpha 군집 계수, 기본 3) | "seeds"
   */
  IND.yield = function (area, D0, model = "murphy", alpha = 3) {
    const AD = area * D0;
    if (AD <= 0) return 1;
    switch (model) {
      case "poisson": return Math.exp(-AD);
      case "seeds": return 1 / (1 + AD);
      case "negbin": return Math.pow(1 + AD / alpha, -alpha);
      default: { const t = -Math.expm1(-AD) / AD; return t * t; }
    }
  };
  IND.YIELD_MODELS = { poisson: "푸아송", murphy: "머피", negbin: "음이항", seeds: "시즈" };
  /**
   * 다이·칩 원가. o: { w, h (mm) 또는 area (mm²), waferCost, D0, model, alpha, d, edge, scribe,
   *   test(좋은 다이 하나당 테스트 원가), pkg(패키지 원가), pkgYield(패키징 수율) }
   * → { area, gross, yield, good, dieCost(좋은 다이 하나), chipCost(패키징·테스트 후 좋은 칩 하나), waferCost }
   */
  IND.dieCost = function (o) {
    const area = o.area || o.w * o.h;
    const gross = o.w && o.h && o.exact ? IND.waferMap(o.w, o.h, o).gross : IND.dpw(area, o);
    const y = IND.yield(area / 100, o.D0 == null ? 0.1 : o.D0, o.model, o.alpha);
    const good = gross * y;
    const dieCost = good > 0 ? o.waferCost / good : Infinity;
    const chipCost = (dieCost + (o.test || 0) + (o.pkg || 0)) / (o.pkgYield == null ? 1 : o.pkgYield);
    return { area, gross, yield: y, good, dieCost, chipCost, waferCost: o.waferCost };
  };

  /* ------------------------------------------------------------ 모델: 팹 경제학 */
  /**
   * 팹 한 동의 웨이퍼 원가. o: { capex(십억 달러), wspm(월 웨이퍼 투입, 장), depYears(감가상각 연수, 5),
   *   equipShare(장비 비중 0.75, 장비만 depYears로 상각하고 건물은 20년), opex(웨이퍼당 변동비, 달러), fixedOpex(연 고정 운영비, 십억 달러),
   *   util(가동률 0~1), price(웨이퍼 판매가, 달러) }
   * → { wafersYear, depYear(연 감가상각, 십억 달러), costPerWafer, revenue, profit(연, 십억 달러), margin, breakevenUtil }
   */
  IND.fab = function (o) {
    const capex = o.capex, eq = o.equipShare == null ? 0.75 : o.equipShare, dep = o.depYears || 5;
    const depYear = (capex * eq) / dep + (capex * (1 - eq)) / 20;
    const fixed = depYear + (o.fixedOpex == null ? capex * 0.04 : o.fixedOpex);
    const util = o.util == null ? 0.9 : o.util;
    const wafersYear = (o.wspm || 50000) * 12 * util;
    const varCost = ((o.opex == null ? 2500 : o.opex) * wafersYear) / 1e9;
    const costPerWafer = wafersYear > 0 ? ((fixed + varCost) * 1e9) / wafersYear : Infinity;
    const revenue = ((o.price || 0) * wafersYear) / 1e9;
    const profit = revenue - fixed - varCost;
    const unitMargin = (o.price || 0) - (o.opex == null ? 2500 : o.opex);
    const breakevenUtil = unitMargin > 0 ? (fixed * 1e9) / (unitMargin * (o.wspm || 50000) * 12) : Infinity;
    return { wafersYear, depYear, fixed, varCost, costPerWafer, revenue, profit, margin: revenue > 0 ? profit / revenue : -Infinity, breakevenUtil };
  };

  /* ------------------------------------------------------------ 모델: 칩렛 */
  /**
   * 한 덩어리(모놀리식) 다이를 n개 칩렛으로 쪼갰을 때 원가 비교.
   * o: { area(전체 로직 면적 mm²), n, overhead(칩렛마다 늘어나는 연결 회로 면적 비율, 0.1), waferCost, D0, model,
   *      bondYield(칩렛 하나를 붙이는 수율, 0.99), pkgBase(기본 패키지 원가), pkgPer(칩렛 하나당 추가 패키징 원가), kgd(칩렛을 미리 시험하는가, true) }
   * → { mono: {dieCost, yield, chipCost}, chiplet: {area, yield, dieCost, chipCost}, saving }
   */
  IND.chiplet = function (o) {
    const n = Math.max(1, o.n | 0), model = o.model || "murphy", D0 = o.D0 == null ? 0.1 : o.D0;
    const mono = IND.dieCost({ area: o.area, waferCost: o.waferCost, D0, model });
    const monoChip = mono.dieCost + (o.pkgBase || 0);
    const a = (o.area / n) * (1 + (n > 1 ? (o.overhead == null ? 0.1 : o.overhead) : 0));
    const c = IND.dieCost({ area: a, waferCost: o.waferCost, D0, model });
    const by = n > 1 ? Math.pow(o.bondYield == null ? 0.99 : o.bondYield, n) : 1;
    const kgd = o.kgd !== false;
    const siliconPerGood = kgd ? n * c.dieCost : (n * o.waferCost) / c.gross; // 미리 시험하지 않으면 나쁜 칩렛도 붙는다
    const asmYield = kgd ? by : by * Math.pow(c.yield, n);
    const pkg = (o.pkgBase || 0) + (n > 1 ? n * (o.pkgPer == null ? 20 : o.pkgPer) : 0);
    const chipCost = (siliconPerGood + pkg) / asmYield;
    return { mono: { area: o.area, yield: mono.yield, gross: mono.gross, dieCost: mono.dieCost, chipCost: monoChip },
             chiplet: { area: a, yield: c.yield, gross: c.gross, dieCost: c.dieCost, asmYield, chipCost }, saving: 1 - chipCost / monoChip };
  };

  /* ------------------------------------------------------------ 모델: 시장 집중도 */
  /** 허핀달-허쉬만 지수. shares: 점유율(%) 배열 → 0~10000. 색 구간은 2010년 지침(2500 초과). 2023년 지침은 1800 초과 */
  IND.hhi = (shares) => shares.reduce((a, s) => a + s * s, 0);
  /** 상위 n개사 점유율 합 (CRn) */
  IND.cr = (shares, n = 3) => [...shares].sort((a, b) => b - a).slice(0, n).reduce((a, s) => a + s, 0);
  // 품목별 상위 회사 점유율(약, %). 집중도·공급 차질 시뮬레이터용.
  IND.CHOKEPOINTS = [
    { key: "euv",     name: "EUV 노광기",       seg: "equip", shares: [["ASML", 100]] },
    { key: "litho",   name: "노광 장비 전체",   seg: "equip", shares: [["ASML", 83], ["Nikon", 10], ["Canon", 7]] },
    { key: "etch",    name: "식각 장비",        seg: "equip", shares: [["Lam", 45], ["TEL", 27], ["AMAT", 18], ["기타", 10]] },
    { key: "dep",     name: "증착 장비",        seg: "equip", shares: [["AMAT", 40], ["Lam", 20], ["TEL", 15], ["ASMI", 10], ["기타", 15]] },
    { key: "track",   name: "코터·현상기",      seg: "equip", shares: [["TEL", 88], ["SCREEN", 6], ["SEMES", 4], ["기타", 2]] },
    { key: "inspect", name: "검사·계측",        seg: "equip", shares: [["KLA", 55], ["AMAT", 12], ["Hitachi HT", 10], ["Lasertec", 6], ["기타", 17]] },
    { key: "wafer",   name: "실리콘 웨이퍼",    seg: "mat",   shares: [["Shin-Etsu", 30], ["SUMCO", 23], ["GlobalWafers", 17], ["Siltronic", 12], ["SK siltron", 13], ["기타", 5]] },
    { key: "euvpr",   name: "EUV 포토레지스트", seg: "mat",   shares: [["JSR", 30], ["TOK", 30], ["Shin-Etsu", 25], ["기타", 15]] },
    { key: "abf",     name: "ABF 기판 필름",    seg: "mat",   shares: [["Ajinomoto", 95], ["기타", 5]] },
    { key: "foundry", name: "파운드리 전체",    seg: "fab",   shares: [["TSMC", 64], ["Samsung", 10], ["SMIC", 6], ["UMC", 5], ["GF", 5], ["기타", 10]] },
    { key: "adv",     name: "7 nm 이하 로직 제조", seg: "fab", shares: [["TSMC", 90], ["Samsung", 8], ["Intel·기타", 2]] },
    { key: "dram",    name: "DRAM",             seg: "mem",   shares: [["Samsung", 40], ["SK hynix", 33], ["Micron", 23], ["CXMT 등", 4]] },
    { key: "hbm",     name: "HBM",              seg: "mem",   shares: [["SK hynix", 55], ["Samsung", 30], ["Micron", 15]] },
    { key: "nand",    name: "NAND",             seg: "mem",   shares: [["Samsung", 35], ["SK hynix·Solidigm", 20], ["Kioxia", 15], ["Micron", 13], ["Sandisk", 12], ["기타", 5]] },
    { key: "eda",     name: "EDA",              seg: "ip",    shares: [["Synopsys", 32], ["Cadence", 30], ["Siemens", 13], ["기타", 25]] },
    { key: "osat",    name: "OSAT",             seg: "atp",   shares: [["ASE", 28], ["Amkor", 15], ["JCET", 12], ["TFME", 8], ["기타", 37]] },
  ];

  /* ------------------------------------------------------------ 모델: 실리콘 사이클 */
  /**
   * 수요·생산능력·가격의 지연 피드백 모델(분기 단위). 가격이 오르면 증설을 주문하고, 그 설비는 lag 분기 뒤에야 돌아간다.
   * 지연(lag)이 길거나 반응(aggress)이 세면 저절로 호황·불황이 반복된다.
   * o: { quarters(60), growth(분기 수요 성장률, 0.02), lag(증설 지연 분기, 6), aggress(증설 반응 세기, 1.2), steep(가격의 수급 민감도, 4),
   *      shock: [{t, size}](t 분기에 수요를 size 비율만큼 한 번 바꾼다), noise(분기 수요 잡음 폭, 0), seed(1) }
   * → { t[], demand[], capacity[], price[], util[], inventory[], orders[] }
   *   demand·capacity는 시작 1 기준, price는 균형 1 기준(0.3~3), util은 가동률(0.6~1), inventory는 재고 지표(분기 수요 대비),
   *   orders는 그 분기에 주문한 증설(생산능력 대비 비율, lag 뒤 도착)
   */
  IND.cycle = function (o = {}) {
    const N = o.quarters || 60, g = o.growth == null ? 0.02 : o.growth, lag = Math.max(1, Math.round(o.lag == null ? 6 : o.lag));
    const ag = o.aggress == null ? 1.2 : o.aggress, k = o.steep == null ? 4 : o.steep;
    let a = (o.seed || 1) >>> 0;
    const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = { t: [], demand: [], capacity: [], price: [], util: [], inventory: [], orders: [] };
    let B = 1, K = 1, inv = 0.3;
    const pipe = new Array(lag).fill(g);
    for (let t = 0; t < N; t++) {
      B *= 1 + g + (o.noise ? (rnd() - 0.5) * 2 * o.noise : 0);
      (o.shock || []).forEach((s) => { if (s.t === t) B *= 1 + s.size; });
      K *= 1 + pipe.shift() - 0.005;
      const p = Math.max(0.3, Math.min(3, Math.pow(B / K, k)));
      const u = Math.max(0.6, Math.min(1, B / K));
      inv = Math.max(0.05, 0.75 * inv + 0.25 * (0.3 + 2.5 * (K - B) / K));
      const add = Math.max(-0.005, g + 0.05 * ag * (p - 1) + 0.005);
      pipe.push(add);
      out.t.push(t); out.demand.push(B); out.capacity.push(K); out.price.push(p); out.util.push(u); out.inventory.push(inv); out.orders.push(add);
    }
    return out;
  };

  /* ------------------------------------------------------------ 세계 지도 */
  // 거친 대륙 윤곽([lon, lat]). 점묘(dot) 지도로 그리면 거칠기가 드러나지 않는다.
  IND.WORLD = [
    // 북아메리카
    [[-166,68.5],[-163,70.3],[-156,71.3],[-148,70.3],[-141,69.6],[-135,69.3],[-128,70],[-117,68.9],[-108,68],[-98,67.8],[-94,69],[-87,64],[-93,61],[-94.5,59],[-92.5,57],[-87.5,55.5],[-82.3,55],[-82,52.5],[-79,51.5],[-78.6,55],[-77,58.5],[-78,60.8],[-74.5,62.3],[-70,61],[-65,60.3],[-64.4,58.5],[-61.6,56],[-57.5,54],[-55.8,51.5],[-59,48],[-64.5,48.5],[-60,47.5],[-61,45.6],[-63.5,44.6],[-66,43.8],[-70,43.7],[-70.7,42],[-72,41],[-74,40.6],[-74,39.5],[-76,37],[-75.5,35.5],[-77,34.5],[-79,33.5],[-81,31.8],[-81.4,30],[-80.1,26.8],[-80.4,25.2],[-81.1,25.1],[-81.8,26.4],[-82.7,28],[-83.7,29.9],[-85.3,29.7],[-86.5,30.4],[-88.5,30.3],[-89.6,29.3],[-91,29.2],[-93.8,29.7],[-95,29.2],[-97.3,27.5],[-97.6,25],[-97.7,21.9],[-96.2,19.3],[-94.5,18.2],[-92,18.6],[-90.5,19.9],[-90.3,21],[-87.1,21.5],[-87.6,18.9],[-88.2,16],[-86,15.9],[-83.5,15.2],[-83.6,11],[-81.8,9],[-79.5,9.6],[-77.4,8.6],[-78.4,8],[-79.6,7.4],[-80.5,8.2],[-82,8.3],[-83.6,9],[-85.7,9.9],[-85.8,11.2],[-87.6,13],[-89.6,13.5],[-91.4,13.9],[-94.4,16.1],[-96.5,15.7],[-99.6,16.7],[-103.5,18.3],[-105.5,20.4],[-105.3,21.8],[-106.9,23.7],[-109.1,25.6],[-112.2,29.1],[-114.7,31.6],[-114.2,30],[-112.7,27.8],[-110,24],[-110.3,23.2],[-111.6,24.6],[-113,26],[-114.6,27.9],[-115.6,29.9],[-116.8,32],[-117.2,32.7],[-118.4,34],[-120.6,34.6],[-121.9,36.6],[-122.5,37.8],[-123.7,39],[-124.3,40.4],[-124.1,42.8],[-124,46.2],[-124.7,48.4],[-123,49],[-125,50],[-128,51.5],[-130,54.7],[-133,57.5],[-137,58.7],[-140,59.8],[-144,60],[-148,60.7],[-152,59],[-157,57.8],[-162,55],[-158.5,58.7],[-162,58.8],[-164.8,60.5],[-165.3,62.5],[-161,64.4],[-166,64.6],[-168,65.6],[-164,66.5]],
    // 캐나다 북극 섬들, 배핀 섬, 그린란드
    [[-125,72],[-118,76.5],[-100,79],[-85,82.5],[-63,82.5],[-75,78],[-80,76],[-90,74.5],[-100,73],[-108,73],[-115,73.5],[-120,71.5]],
    [[-80,73.5],[-72,71],[-67,69],[-61.8,66.6],[-64.5,63.5],[-68,63.2],[-73,64.5],[-78,64.5],[-73.5,68],[-85,70]],
    [[-73,78],[-66,81],[-50,82.5],[-30,83.5],[-20,82],[-18,77],[-20,72],[-24,69.5],[-32,68],[-40,65],[-43,60],[-48,61],[-52,65],[-54,69.5],[-56,72],[-60,75.5],[-68,76.5]],
    // 남아메리카
    [[-80,8],[-76,9],[-72,12],[-68,10.5],[-62,10.7],[-58,7],[-52,5],[-50,0],[-44,-2.5],[-35,-6],[-37,-11],[-39,-14],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-39],[-65,-42],[-68,-50],[-70,-55],[-74,-50],[-74,-40],[-72,-30],[-70,-18],[-76,-13],[-81,-5],[-80,0],[-78,3]],
    // 유라시아
    [[-8.9,37],[-8.8,41.5],[-9.2,43],[-8,43.7],[-2,43.4],[-1.4,44.5],[-1.2,46.2],[-2.5,47.3],[-4.7,48.4],[-1.5,48.7],[0.2,49.7],[1.6,50.9],[3.5,51.4],[4.8,53],[7,53.5],[8.5,54],[8.3,55.5],[8.1,56.8],[10.5,57.7],[10.5,56.2],[9.8,54.9],[11,54],[14,54],[18.5,54.6],[21,55.5],[21,57],[23.5,57],[24,58.5],[28,59.5],[30,60],[25,60.3],[22.5,60],[21.4,61],[21.5,63],[25,65],[24,65.8],[21.5,64.5],[19,63.5],[17.5,62],[17.2,60.7],[18.8,60],[16.5,57],[16,56.2],[14.2,55.4],[12.8,55.5],[12.5,56.5],[11.2,58.5],[10.5,59.5],[9.5,59],[7,58],[5.5,58.8],[5,61],[5.3,62.5],[8,63.5],[10.5,64.5],[12.5,66],[14,67.5],[16,68.5],[19,70],[23,70.8],[26,71],[30,70],[33,69.3],[37,68.5],[41,67.7],[44,68.5],[46,68],[53,68.5],[57,68.5],[60,69.8],[66,69.5],[69,73],[73,72.5],[80,73.5],[87,74.5],[100,77.7],[105,77.4],[112,74],[113,73.6],[125,73.6],[130,71],[140,72.5],[150,71.5],[160,70],[170,69.8],[178,69.3],[180,68.8],[180,65],[178,64.5],[177,62.5],[173,61],[170,60],[164,59.9],[162,57.8],[163,56],[160,53],[156.5,51],[156,57],[155,59.2],[151,59.2],[148,59.4],[143,59.3],[140,58],[137,54.5],[141.4,52.2],[140.5,48.8],[138,46],[135.5,43.5],[133,42.8],[131.5,43],[130.7,42.3],[129.7,41],[128,39],[128.8,38],[129.4,36.8],[129.2,35.3],[128.4,34.9],[127,34.6],[126.3,34.6],[126.5,35.8],[126.7,37],[126.1,37.7],[125.2,37.9],[125.4,38.6],[124.7,39.6],[122.5,40.3],[121.2,38.9],[121.5,40.8],[119.5,39.9],[118,39.2],[117.6,38.6],[118.8,37.3],[121.5,37.5],[122.5,36.9],[120.3,36],[119.2,34.8],[120.3,34.3],[120.9,32.5],[121.9,31],[121.9,30],[121.4,28.3],[120,26.6],[119.5,25.4],[118,24.5],[116.5,23],[114.2,22.3],[113.5,22.2],[111,21.4],[110.3,20.3],[109.8,21.5],[108.4,21.6],[106.7,20.7],[105.8,19],[106.6,17.4],[108.8,15.2],[109.3,12],[107.5,10.5],[105.1,8.6],[104.8,10.3],[103,11],[102.3,12.2],[100.9,12.7],[100.5,13.5],[99.2,10.9],[99.9,9.2],[100.4,7.4],[101.3,6.9],[102.1,6.2],[103.4,4.9],[103.5,2.7],[104.2,1.4],[103.5,1.3],[102.2,2.1],[101.3,3.3],[100.4,4.6],[100.3,6.3],[99.7,6.9],[98.3,8.3],[98.6,10.2],[98.3,13.2],[97.7,16.5],[97.2,16.9],[95.4,15.8],[94.3,16.4],[94.5,18.3],[93.5,19.5],[92.3,20.8],[91.8,22.4],[90.5,22.8],[89,21.8],[86.9,21],[86.5,20],[85,19.3],[82.3,16.6],[80.3,15.8],[80.2,13.4],[79.8,10.3],[78.9,9.4],[77.5,8.1],[76.6,8.9],[75.7,11.3],[74.8,12.9],[73.5,16],[72.8,19.3],[72.6,21.4],[70.5,20.8],[69,22.4],[68.4,23.6],[67.3,24.6],[66.4,25.4],[61.5,25.2],[57.4,25.7],[56.7,27.1],[54.7,26.5],[53.5,26.8],[51.5,27.9],[50.1,30.2],[48.6,29.9],[48,29.5],[48.5,28.2],[49.6,26.8],[50.2,26.1],[51.5,24.4],[54,24.1],[55.5,25.5],[56.3,26.2],[56.4,24.9],[57.4,23.8],[58.8,23.6],[59.8,22.4],[58.5,20.4],[57.8,19],[55.3,17.4],[52,16],[48.7,14],[45,12.8],[43.4,12.7],[42.7,15.6],[41.2,18.6],[39,21.5],[38.4,23.6],[36.5,26],[35.1,28],[34.9,29.5],[34.5,31.5],[35.1,33.1],[35.9,35.2],[36.1,36.6],[34.7,36.8],[32.5,36.1],[30.6,36.7],[29.5,36.2],[28,36.8],[27.3,37.8],[26.4,38.6],[26.7,39.6],[26.2,40.1],[24,40.8],[22.9,40.6],[24,38.2],[23.1,36.5],[21.7,36.8],[21.1,38.3],[20.2,39.6],[19.4,40.4],[19.5,41.8],[18.5,42.5],[16,43.5],[14.5,45.2],[13.6,45.7],[12.3,45.3],[12.4,44.2],[13.6,43.5],[14.7,42],[16.1,41.4],[18.5,40.1],[17,39.4],[16.6,38.4],[15.7,38],[15.7,40],[14.9,40.2],[13,41.3],[11.2,42.4],[10.5,43],[10.2,43.9],[8.8,44.4],[7.5,43.8],[6.2,43.1],[4.6,43.4],[3.2,43.1],[3.1,41.9],[2.1,41.3],[0.8,40.7],[-0.3,39.4],[0.2,38.7],[-0.7,37.6],[-2.1,36.7],[-4.4,36.7],[-5.6,36],[-6.4,36.8],[-7.4,37.2]],
    // 아프리카
    [[-17,21],[-16,28],[-10,30],[-9,32.5],[-5.5,35.8],[3,37],[10,37.2],[11,33.5],[15,32],[20,31],[20,32.8],[25,32],[29,31],[32.3,31.2],[34.2,31.3],[34.9,29.5],[32.5,30],[35,24],[37,18],[39.5,15],[43.3,12.5],[51,11.8],[51,10],[48,4],[41.5,-1.5],[39.5,-5],[40.5,-11],[40.5,-15],[35,-20],[35.5,-24],[32.5,-26],[32.5,-29],[30,-31],[27,-33.5],[22,-34],[18.5,-34],[18,-31.5],[15,-27],[14.5,-23],[11.8,-17],[13.5,-11],[12,-6],[9.5,-2],[9.5,3.5],[8.5,4.5],[5.5,4.3],[2,6.3],[-2,4.8],[-7.5,4.4],[-11.5,7],[-13.3,9],[-16.7,12.5],[-17.5,14.7],[-16.5,19.5]],
    [[43.5,-12],[50.5,-15.5],[47,-25],[44,-24],[43.5,-20],[44.5,-16]],
    // 영국·아일랜드·아이슬란드
    [[-5.5,50],[1.5,51],[1.7,52.7],[0,53.5],[-1.5,55.5],[-2,57.5],[-3.5,58.6],[-5,58.6],[-6,56.5],[-4.8,54.8],[-3.3,54.4],[-3,53.4],[-4.5,52.8],[-5,51.6]],
    [[-10,51.6],[-6,52.1],[-6,54],[-7.5,55.3],[-10,54.2]],
    [[-24,65.5],[-18,66.5],[-13.5,65.2],[-18,63.4],[-22.5,63.8]],
    // 일본
    [[130.9,34],[132.5,35.4],[135.5,35.6],[137,37],[139.5,38.3],[140,40.5],[141.5,41.3],[142,39.5],[141,37],[140.8,35.7],[139.8,35],[138.5,34.6],[137,34.6],[135.2,33.6],[133,34.2],[131,33.9]],
    [[129.7,33.5],[131,33.9],[131.8,32.5],[131,31.2],[130.2,31.3],[129.8,32.7]],
    [[132.6,34.2],[134.6,34.2],[134.2,33.2],[132.9,32.8]],
    [[140,41.5],[140,43.2],[141.6,45.4],[145.4,43.4],[143.3,42],[141,41.8]],
    // 대만, 하이난, 스리랑카, 사할린
    [[120.1,23],[121,25.2],[121.9,25],[121.4,22.7],[120.8,21.9],[120.2,22.6]],
    [[108.6,19.2],[110.2,20.1],[111,19.6],[109.6,18.2]],
    [[79.9,6],[81.8,7.5],[80.2,9.8]],
    [[142,46],[143.5,49],[143,53.5],[142.2,54.2],[141.8,51],[142,48]],
    // 동남아 섬들
    [[95.3,5.6],[98,4],[104,-1],[106,-5.9],[102,-4],[100,-1],[98.5,1.5]],
    [[105,-6.8],[106,-5.9],[111,-6.5],[114.5,-7.7],[114.4,-8.7],[108,-7.8]],
    [[109,1.5],[111,2.5],[114,4.5],[116.5,7],[119,5],[118,1],[116,-4],[111,-3],[109.5,-1]],
    [[119.5,0.5],[123,1],[121.5,-1],[123,-4],[121,-5.5],[119.5,-3.5]],
    [[131,-1],[138,-1.5],[145,-4],[150,-10.5],[143,-9],[138,-8],[132,-4]],
    [[120,18.5],[122.3,18.4],[121.5,16],[124,13],[121,13.8],[120.5,15]],
    [[122,7],[125.5,9.6],[126.5,7],[125.5,5.8],[123.8,7.8]],
    // 오세아니아
    [[114,-22],[114,-26],[115,-34],[118,-35],[123,-33.8],[129,-31.6],[131,-31.5],[135,-34.5],[138,-35.6],[140,-38],[146,-39],[150,-37.5],[153,-31],[153,-25],[150,-22],[146,-19],[145.5,-15],[142.5,-10.7],[141.5,-17],[139,-17.5],[136,-15],[136.8,-12],[131,-11.3],[129,-15],[126,-14],[122,-17.5],[120,-20],[116,-21]],
    [[172.7,-34.5],[178.5,-37.7],[176.8,-40],[174.6,-41.3],[172,-41],[170.5,-43.5],[166.5,-46],[169,-46.6],[173,-43.8],[174.3,-41.7],[175,-39.5],[173.8,-39]],
  ];
  /**
   * 경위도 → 화면 좌표 (등장방형 투영). view: {lon0, lon1, lat0, lat1} 기본은 전 세계(남극 제외).
   * 반환 함수 P(lon, lat) → [x, y]와 역함수 P.inv(x, y) → [lon, lat], 실제 그려지는 영역 P.box
   * 경도 1도와 위도 1도가 같은 길이가 되도록 box 안에서 가운데 정렬한다.
   */
  IND.projector = function (box, view = {}) {
    const lon0 = view.lon0 == null ? -170 : view.lon0, lon1 = view.lon1 == null ? 180 : view.lon1;
    const lat0 = view.lat0 == null ? -50 : view.lat0, lat1 = view.lat1 == null ? 78 : view.lat1;
    const s = Math.min(box.w / (lon1 - lon0), box.h / (lat1 - lat0));
    const ox = box.x + (box.w - s * (lon1 - lon0)) / 2, oy = box.y + (box.h - s * (lat1 - lat0)) / 2;
    const P = (lon, lat) => [ox + (lon - lon0) * s, oy + (lat1 - lat) * s];
    P.inv = (x, y) => [lon0 + (x - ox) / s, lat1 - (y - oy) / s];
    P.scale = s;
    P.box = { x: ox, y: oy, w: s * (lon1 - lon0), h: s * (lat1 - lat0) };
    return P;
  };
  function inPoly(lon, lat, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  IND.isLand = (lon, lat) => IND.WORLD.some((p) => inPoly(lon, lat, p));
  const dotCache = {};
  /** step(도) 간격 점묘용 육지 격자 [[lon, lat], ...] (캐시) */
  IND.landDots = function (step = 2) {
    if (dotCache[step]) return dotCache[step];
    const out = [];
    for (let lat = 78 - step / 2; lat > -56; lat -= step) for (let lon = -170 + step / 2; lon < 180; lon += step) if (IND.isLand(lon, lat)) out.push([lon, lat]);
    return (dotCache[step] = out);
  };
  /**
   * 세계 지도를 그린다. P = IND.projector(box, view).
   * o: { style: "dots"|"fill", step(점 간격 도, 자동), color, r(점 반지름) }
   */
  IND.drawWorld = function (ctx, P, o = {}) {
    const pal = window.CB ? CB.palette() : { grid: "#ccc", surface: "#eee", border: "#ccc" };
    if (o.style === "fill") {
      ctx.fillStyle = o.color || pal.surface; ctx.strokeStyle = o.stroke || pal.border; ctx.lineWidth = 1;
      IND.WORLD.forEach((poly) => { ctx.beginPath(); poly.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      return;
    }
    const step = o.step || (P.scale > 6 ? 1 : P.scale > 3 ? 1.5 : 2.5);
    const r = o.r || Math.max(0.7, Math.min(2.4, P.scale * step * 0.32));
    ctx.fillStyle = o.color || pal.grid.replace(/[\d.]+\)$/, "0.22)");
    IND.landDots(step).forEach(([lo, la]) => { const [x, y] = P(lo, la); if (x < P.box.x - 2 || x > P.box.x + P.box.w + 2 || y < P.box.y - 2 || y > P.box.y + P.box.h + 2) return; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); });
    // 점 간격보다 가는 섬(일본·대만·영국 등)은 점이 빠지므로 윤곽을 채워 둔다
    IND.WORLD.forEach((poly) => {
      let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
      poly.forEach(([lo, la]) => { a = Math.min(a, lo); b = Math.max(b, lo); c = Math.min(c, la); d = Math.max(d, la); });
      if (Math.min(b - a, d - c) > step * 3) return;
      ctx.beginPath(); poly.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
    });
  };
  /** 두 점 사이 활 모양 선(무역 흐름). bend: 휨 비율(0.2) */
  IND.arc = function (ctx, x0, y0, x1, y1, bend = 0.2) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0;
    const cx = mx - dy * bend * 0.3, cy = my - Math.hypot(dx, dy) * bend;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
    return (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
  };
})();
