/* Copyright (c) 2026 geniuskey and DesignBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   DesignBook 레이아웃 엔진 — 전역 객체 CELL
   - 교육용 가상 PDK EDU45의 레이어·설계 규칙·표준 셀(INV/NAND2/NOR2)
   - 레이아웃 렌더러(레이어 색·무늬, 핀, 절단선), 히트 테스트
   - 절단선을 따라 만든 공정 단면(ProcessBook 재질색), 공정 단계별 단면
   - DRC(폭·간격·둘러싸기·연장), 추출(트랜지스터·넷), LVS
   좌표는 nm, y는 위로 +. 셀 원점은 왼쪽 아래(VSS 레일 중심선).
   ========================================================================== */
(function () {
  "use strict";
  const PBOOK = "https://semi.euiyun.com/process/chapters/";

  /* ------------------------------------------------------------ 레이어 */
  // style: fill(채움 알파), stroke, dash, hatch(빗금 방향), cross(사각형 X 표시)
  const LAYERS = [
    { key: "nw", name: "N-웰", en: "NWELL", gds: "1/0", color: "#37b24d", fill: 0.10, dash: [6, 4], width: 1.6,
      masks: [2, 3], what: "PMOS가 놓일 n형 우물. 그 밖은 p-웰이 된다.",
      steps: ["웰 노광(감광막으로 반대쪽을 가림)", "인(P) 고에너지 주입 ~110 keV", "웰 어닐 ~1050 °C"],
      pb: [["litho", "4장 노광"], ["implant", "8장 이온 주입"], ["anneal", "9장 열처리"]],
      note: "보통 NW 한 레이어로 마스크 두 장을 만든다. n-웰 마스크는 NW 그대로, p-웰 마스크는 NW를 뒤집은(반전) 무늬다." },
    { key: "od", name: "활성 영역", en: "ACTIVE (OD)", gds: "2/0", color: "#2f9e44", fill: 0.42, width: 1.2,
      masks: [1], what: "트랜지스터가 들어갈 실리콘 섬. 그리지 않은 곳은 모두 STI 산화막이 된다.",
      steps: ["패드 산화막·질화막 하드마스크", "활성 영역 노광", "트렌치 식각 ~210 nm", "갭필 산화막(HDP/FCVD)", "STI CMP(질화막 정지)"],
      pb: [["oxidation", "3장 열산화"], ["etch", "6장 식각"], ["deposition", "7장 증착"], ["cmp", "10장 CMP"]],
      note: "설계자는 OD(산화막 정의, Oxide Definition)를 그리지만 웨이퍼에 실제로 '만들어지는' 것은 그 반전인 STI다." },
    { key: "po", name: "폴리(게이트)", en: "POLY (PO)", gds: "7/0", color: "#e03131", fill: 0.62, width: 1.2,
      masks: [4], what: "게이트 전극과 짧은 배선. 활성 영역과 겹친 부분이 트랜지스터 채널이 된다.",
      steps: ["게이트 절연막(SiON/HfO₂)", "폴리실리콘 증착 ~80 nm", "게이트 노광(가장 미세, OPC가 가장 정교)", "게이트 식각(절연막에서 정지)"],
      pb: [["deposition", "7장 증착"], ["litho", "4장 노광"], ["resist", "5장 감광막·OPC"], ["etch", "6장 식각"], ["advanced", "13장 HKMG·RMG"]],
      note: "폴리 폭이 게이트 길이 L, 활성 영역 폭이 채널 폭 W다. 첨단 공정에서는 폴리를 나중에 금속 게이트로 바꾼다(RMG)." },
    { key: "np", name: "N+ 주입", en: "NPLUS (NP)", gds: "12/0", color: "#4dabf7", fill: 0.07, dash: [3, 3], width: 1.4,
      masks: [5, 7], what: "NMOS의 소스·드레인을 n⁺로 만드는 주입 영역.",
      steps: ["감광막으로 PMOS 쪽을 가림", "n-LDD 주입 As ~4 keV", "스페이서 형성 후 n⁺ S/D 주입 As ~20 keV", "스파이크 어닐"],
      pb: [["implant", "8장 이온 주입"], ["anneal", "9장 열처리"], ["integration", "12장 공정 통합"]],
      note: "게이트와 스페이서가 주입을 막아 주므로(자기 정렬) NP 경계는 게이트 위치와 무관하게 성글게 그려도 된다." },
    { key: "pp", name: "P+ 주입", en: "PPLUS (PP)", gds: "13/0", color: "#ff922b", fill: 0.07, dash: [3, 3], width: 1.4,
      masks: [6, 8], what: "PMOS의 소스·드레인을 p⁺로 만드는 주입 영역.",
      steps: ["감광막으로 NMOS 쪽을 가림", "p-LDD 주입 BF₂ ~5 keV", "p⁺ S/D 주입 B ~4 keV", "스파이크 어닐"],
      pb: [["implant", "8장 이온 주입"], ["anneal", "9장 열처리"]],
      note: "NP와 PP는 서로 겹치면 안 된다. 보통 셀 가운데 한 선에서 맞닿는다." },
    { key: "co", name: "콘택", en: "CONTACT (CO)", gds: "15/0", color: "#495057", fill: 0.85, width: 1, cross: true,
      masks: [9], what: "실리콘(소스·드레인)이나 폴리를 M1에 잇는 텅스텐 기둥.",
      steps: ["CESL 질화막 + PMD 산화막, CMP", "콘택 노광(EUV)", "산화막 식각 → CESL 개방", "Ti/TiN 라이너 + 텅스텐 CVD", "텅스텐 CMP"],
      pb: [["deposition", "7장 증착"], ["etch", "6장 식각"], ["cmp", "10장 CMP"], ["integration", "12장 공정 통합"]],
      note: "콘택은 고정 크기 정사각형만 허용된다. 큰 면적이 필요하면 여러 개를 배열한다." },
    { key: "m1", name: "금속 1", en: "METAL1 (M1)", gds: "19/0", color: "#4263eb", fill: 0.36, width: 1.4, hatch: 1,
      masks: [10], what: "셀 안 배선과 전원 레일, 입출력 핀.",
      steps: ["식각 정지막 + 저유전막", "M1 노광", "트렌치 식각", "배리어·씨드 + 구리 도금", "구리 CMP(다마신)"],
      pb: [["metal", "11장 금속 배선"], ["cmp", "10장 CMP"]],
      note: "구리는 식각이 어려워 '파고 채우고 갈아 내는' 다마신으로 만든다. 그래서 M1 마스크의 열린 곳이 곧 배선이다." },
    { key: "v1", name: "비아 1", en: "VIA1 (V1)", gds: "21/0", color: "#ae3ec9", fill: 0.8, width: 1, cross: true,
      masks: [11], what: "M1과 M2를 잇는 구멍.",
      steps: ["듀얼 다마신: 비아와 M2 트렌치를 함께 파고 한 번에 채움"],
      pb: [["metal", "11장 듀얼 다마신"]],
      note: "ProcessBook 12장의 공정 흐름은 M1(마스크 10)에서 끝난다. 그 위로 비아·금속 쌍이 10~15번 반복된다." },
    { key: "m2", name: "금속 2", en: "METAL2 (M2)", gds: "20/0", color: "#d6336c", fill: 0.30, width: 1.4, hatch: -1,
      masks: [12], what: "셀 사이를 잇는 수직 방향 배선(라우터가 그림).",
      steps: ["저유전막", "비아·트렌치 노광·식각", "구리 채움 + CMP"],
      pb: [["metal", "11장 금속 배선"]],
      note: "표준 셀 안에는 보통 M2를 쓰지 않는다. M2부터는 배선기(7장)의 영역이다." },
  ];
  const LAYER = {};
  LAYERS.forEach((L, i) => { L.z = i; LAYER[L.key] = L; });
  const DRAW_ORDER = ["nw", "np", "pp", "od", "po", "m1", "co", "m2", "v1"];

  /* ------------------------------------------------------------ 공정 단계 (단면용) */
  const STAGES = [
    { key: "sub", name: "p형 웨이퍼", masks: [], layers: [], pb: "wafer", desc: "p형 실리콘 기판. 아직 아무 무늬도 없다." },
    { key: "sti", name: "STI 형성", masks: [1], layers: ["od"], pb: "integration", desc: "OD를 그리지 않은 곳을 파서 산화막으로 채운다. 레이아웃의 OD가 실리콘 섬으로 남는다." },
    { key: "well", name: "웰 주입", masks: [2, 3], layers: ["nw"], pb: "implant", desc: "NW 안은 n-웰(PMOS 자리), 밖은 p-웰(NMOS 자리)로 주입하고 어닐한다." },
    { key: "gate", name: "게이트", masks: [4], layers: ["po"], pb: "etch", desc: "게이트 절연막과 폴리를 입히고 PO 무늬로 깎는다. PO가 OD를 지나는 곳이 채널이다." },
    { key: "ldd", name: "LDD · 스페이서", masks: [5, 6], layers: ["np", "pp"], pb: "implant", desc: "게이트를 마스크 삼아 얕게 주입하고, 질화막 스페이서를 게이트 옆에 남긴다(마스크 없음)." },
    { key: "sd", name: "소스·드레인", masks: [7, 8], layers: ["np", "pp"], pb: "anneal", desc: "스페이서 바깥에 깊고 진한 n⁺/p⁺를 주입하고 스파이크 어닐로 활성화한다." },
    { key: "sil", name: "살리사이드", masks: [], layers: [], pb: "integration", desc: "드러난 실리콘·폴리 위에만 NiSi가 생긴다. 마스크 없이 자기 정렬된다." },
    { key: "co", name: "콘택", masks: [9], layers: ["co"], pb: "deposition", desc: "PMD 산화막을 덮고 CO 위치에 구멍을 뚫어 텅스텐을 채운다." },
    { key: "m1", name: "M1", masks: [10], layers: ["m1"], pb: "metal", desc: "저유전막에 M1 트렌치를 파고 구리를 채워 CMP한다. 여기까지가 ProcessBook 12장의 흐름이다." },
    { key: "m2", name: "V1 · M2", masks: [11, 12], layers: ["v1", "m2"], pb: "metal", desc: "듀얼 다마신으로 비아와 M2를 함께 만든다. 이 위로 같은 구조가 반복된다." },
  ];

  /* ------------------------------------------------------------ 재질 (ProcessBook과 같은 색) */
  const MAT = {
    si: { name: "실리콘", color: "#8f99aa" }, ox: { name: "산화막 (STI·PMD)", color: "#bcd8f0" }, nit: { name: "질화막 (스페이서)", color: "#e2b05a" },
    poly: { name: "폴리실리콘", color: "#c0604a" }, hk: { name: "게이트 절연막", color: "#6fbf9a" }, sil: { name: "실리사이드 NiSi", color: "#6f5f93" },
    w: { name: "텅스텐", color: "#58606e" }, tin: { name: "TiN 라이너", color: "#c9a227" }, cu: { name: "구리", color: "#cc7a3a" },
    lowk: { name: "저유전막", color: "#a8e0d0" }, nwell: { name: "n-웰", color: "#3d7be0" }, pwell: { name: "p-웰", color: "#e0574a" },
    nplus: { name: "n⁺ 소스·드레인", color: "#3d7be0" }, pplus: { name: "p⁺ 소스·드레인", color: "#e0574a" },
  };

  /* ------------------------------------------------------------ 설계 규칙 (EDU45) */
  const RULES = [
    { id: "OD.W.1", type: "width", layer: "od", v: 120, desc: "활성 영역 최소 폭", why: "좁은 실리콘 섬은 STI 식각·갭필에서 무너지거나 응력으로 결함이 생긴다.", pb: "etch" },
    { id: "OD.S.1", type: "space", layer: "od", v: 100, desc: "활성 영역 최소 간격", why: "간격이 STI 트렌치 폭이다. 좁으면 갭필 보이드가 생기고 소자 사이 격리가 약해진다.", pb: "deposition" },
    { id: "PO.W.1", type: "width", layer: "po", v: 50, desc: "폴리 최소 폭 (= 최소 게이트 길이)", why: "게이트 노광 해상도와 단채널 효과가 정한다.", pb: "litho" },
    { id: "PO.S.1", type: "space", layer: "po", v: 80, desc: "폴리 최소 간격", why: "노광 해상도와 식각 잔류물(브리징) 때문에.", pb: "resist" },
    { id: "PO.EX.1", type: "endcap", layer: "po", other: "od", v: 60, desc: "게이트의 활성 영역 밖 연장(엔드캡)", why: "선 끝은 노광에서 짧아진다(선 끝 후퇴). 모자라면 게이트가 활성 영역을 다 덮지 못해 소스와 드레인이 이어진다.", pb: "resist" },
    { id: "PO.S.2", type: "space2", layer: "po", other: "od", v: 40, desc: "필드 폴리와 활성 영역 간격", why: "활성 영역 위로 걸치면 원하지 않는 트랜지스터가 생긴다. 정렬 오차를 흡수할 여유.", pb: "metrology" },
    { id: "CO.W.1", type: "exact", layer: "co", v: 50, desc: "콘택 크기 = 50 × 50 nm 고정", why: "식각·텅스텐 채움 조건이 한 크기에 맞춰져 있다. 크기가 다르면 덜 뚫리거나 보이드가 생긴다.", pb: "etch" },
    { id: "CO.S.1", type: "space", layer: "co", v: 70, desc: "콘택 최소 간격", why: "노광 해상도(콘택은 가장 어려운 무늬 중 하나).", pb: "litho" },
    { id: "CO.EN.1", type: "encl", layer: "co", other: ["od", "po"], v: 15, desc: "활성 영역 또는 폴리의 콘택 둘러싸기", why: "콘택이 활성 영역 가장자리를 벗어나면 STI나 웰에 닿아 누설·단락이 생긴다(오버레이 여유).", pb: "metrology" },
    { id: "CO.S.2", type: "cogate", layer: "co", other: "po", v: 35, desc: "확산 콘택과 게이트 간격", why: "콘택이 게이트에 닿으면 게이트-소스 단락. 스페이서와 정렬 오차가 들어갈 자리.", pb: "integration" },
    { id: "M1.W.1", type: "width", layer: "m1", v: 60, desc: "M1 최소 폭", why: "좁으면 저항이 커지고 전자 이동에 약하며, 노광·CMP에서 끊길 수 있다.", pb: "metal" },
    { id: "M1.S.1", type: "space", layer: "m1", v: 70, desc: "M1 최소 간격", why: "노광 해상도, 구리 CMP 잔류물에 의한 단락, 절연막 신뢰성(TDDB).", pb: "cmp" },
    { id: "M1.EN.1", type: "encl", layer: "co", other: ["m1"], v: 5, desc: "M1의 콘택 둘러싸기", why: "M1과 콘택이 어긋나도 접촉 면적이 유지되도록.", pb: "metrology" },
    { id: "V1.EN.1", type: "encl", layer: "v1", other: ["m1"], v: 5, desc: "M1의 비아 둘러싸기", why: "비아가 아래 금속을 벗어나면 접촉 저항이 커지고 신뢰성이 떨어진다.", pb: "metal" },
    { id: "V1.EN.2", type: "encl", layer: "v1", other: ["m2"], v: 5, desc: "M2의 비아 둘러싸기", why: "위 금속도 같은 이유.", pb: "metal" },
    { id: "M2.W.1", type: "width", layer: "m2", v: 60, desc: "M2 최소 폭", why: "M1과 같은 이유.", pb: "metal" },
    { id: "M2.S.1", type: "space", layer: "m2", v: 70, desc: "M2 최소 간격", why: "M1과 같은 이유.", pb: "metal" },
    { id: "NW.EN.1", type: "nwod", layer: "nw", other: "od", v: 50, desc: "N-웰의 PMOS 활성 영역 둘러싸기", why: "웰 경계 근처는 주입 그림자·측면 확산으로 농도가 흐트러진다.", pb: "implant" },
    { id: "NW.S.1", type: "nwsp", layer: "nw", other: "od", v: 100, desc: "N-웰과 NMOS 활성 영역 간격", why: "n⁺ 확산이 n-웰에 가까우면 격리가 약해지고 래치업 위험이 커진다.", pb: "implant" },
    { id: "IMP.EN.1", type: "encl", layer: "od", other: ["np", "pp"], v: 40, desc: "N+/P+ 주입의 활성 영역 둘러싸기", why: "주입 감광막의 정렬 오차를 흡수해야 소스·드레인이 끝까지 도핑된다.", pb: "implant" },
    { id: "IMP.X.1", type: "overlap", layer: "np", other: "pp", desc: "N+와 P+ 주입 겹침 금지", why: "겹친 곳은 두 번 주입되어 도핑이 상쇄·혼합된다.", pb: "implant" },
    { id: "GATE.TY.1", type: "gatetype", layer: "po", desc: "게이트는 N+ 또는 P+ 영역 안에 있어야 함", why: "주입 영역이 없으면 소스·드레인이 도핑되지 않아 트랜지스터가 아니다.", pb: "implant" },
  ];
  const RULE = {}; RULES.forEach((r) => (RULE[r.id] = r));

  /* ------------------------------------------------------------ 표준 셀 (EDU45, 9 트랙, CPP 190) */
  const H = 1260, CPP = 190, MP = 140;
  const R = (l, x0, y0, x1, y1, net) => ({ l, x0, y0, x1, y1, net });
  function common(W) {
    return [
      R("nw", 0, 630, W, 1340), R("np", 0, 0, W, 630), R("pp", 0, 630, W, 1260),
      R("m1", 0, -45, W, 45, "VSS"), R("m1", 0, 1215, W, 1305, "VDD"),
    ];
  }
  const COLS = (x, ys) => ys.map((y) => R("co", x, y, x + 50, y + 50));
  const NY = [200, 350], PY = [840, 1000];
  const CELLS = {
    INV_X1: {
      name: "INV_X1", fn: "Y = A'", desc: "인버터", w: 2 * CPP,
      rects: [].concat(common(380), [
        R("od", 50, 150, 330, 450), R("od", 50, 780, 330, 1110),
        R("po", 165, 90, 215, 1170, "A"), R("po", 80, 565, 215, 675, "A"),
        ...COLS(80, NY), ...COLS(250, NY), ...COLS(80, PY), ...COLS(250, PY), R("co", 95, 595, 145, 645),
        R("m1", 75, 0, 135, 405, "VSS"), R("m1", 75, 835, 135, 1260, "VDD"),
        R("m1", 245, 195, 305, 1055, "Y"), R("m1", 90, 520, 150, 720, "A"),
      ]),
      pins: [{ name: "A", x: 120, y: 690 }, { name: "Y", x: 275, y: 630 }, { name: "VDD", x: 300, y: 1260 }, { name: "VSS", x: 300, y: 0 }],
      sch: [{ t: "n", g: "A", s: "VSS", d: "Y", w: 300 }, { t: "p", g: "A", s: "VDD", d: "Y", w: 330 }],
    },
    NAND2_X1: {
      name: "NAND2_X1", fn: "Y = (A·B)'", desc: "2입력 NAND", w: 3 * CPP,
      rects: [].concat(common(570), [
        R("od", 50, 150, 520, 450), R("od", 50, 780, 520, 1110),
        R("po", 165, 90, 215, 1170, "A"), R("po", 355, 90, 405, 1170, "B"),
        R("po", 80, 490, 215, 570, "A"), R("po", 295, 490, 405, 570, "B"),
        ...COLS(80, NY), ...COLS(440, NY), ...COLS(80, PY), ...COLS(260, PY), ...COLS(440, PY),
        R("co", 95, 505, 145, 555), R("co", 310, 505, 360, 555),
        R("m1", 75, 0, 135, 405, "VSS"), R("m1", 75, 835, 135, 1260, "VDD"), R("m1", 435, 835, 495, 1260, "VDD"),
        R("m1", 435, 195, 495, 740, "Y"), R("m1", 255, 680, 495, 740, "Y"), R("m1", 255, 680, 315, 1055, "Y"),
        R("m1", 90, 480, 150, 600, "A"), R("m1", 305, 480, 365, 600, "B"),
      ]),
      pins: [{ name: "A", x: 120, y: 585 }, { name: "B", x: 335, y: 585 }, { name: "Y", x: 465, y: 300 }, { name: "VDD", x: 300, y: 1260 }, { name: "VSS", x: 300, y: 0 }],
      sch: [{ t: "n", g: "A", s: "VSS", d: "n1", w: 300 }, { t: "n", g: "B", s: "n1", d: "Y", w: 300 },
        { t: "p", g: "A", s: "VDD", d: "Y", w: 330 }, { t: "p", g: "B", s: "VDD", d: "Y", w: 330 }],
    },
    NOR2_X1: {
      name: "NOR2_X1", fn: "Y = (A+B)'", desc: "2입력 NOR", w: 3 * CPP,
      rects: [].concat(common(570), [
        R("od", 50, 150, 520, 450), R("od", 50, 780, 520, 1110),
        R("po", 165, 90, 215, 1170, "A"), R("po", 355, 90, 405, 1170, "B"),
        R("po", 80, 660, 215, 740, "A"), R("po", 295, 660, 405, 740, "B"),
        ...COLS(80, NY), ...COLS(260, NY), ...COLS(440, NY), ...COLS(80, PY), ...COLS(440, PY),
        R("co", 95, 675, 145, 725), R("co", 310, 675, 360, 725),
        R("m1", 75, 0, 135, 405, "VSS"), R("m1", 435, 0, 495, 405, "VSS"), R("m1", 75, 835, 135, 1260, "VDD"),
        R("m1", 255, 195, 315, 580, "Y"), R("m1", 255, 520, 495, 580, "Y"), R("m1", 435, 520, 495, 1055, "Y"),
        R("m1", 90, 650, 150, 760, "A"), R("m1", 305, 650, 365, 760, "B"),
      ]),
      pins: [{ name: "A", x: 120, y: 745 }, { name: "B", x: 335, y: 745 }, { name: "Y", x: 465, y: 900 }, { name: "VDD", x: 300, y: 1260 }, { name: "VSS", x: 300, y: 0 }],
      sch: [{ t: "p", g: "A", s: "VDD", d: "p1", w: 330 }, { t: "p", g: "B", s: "p1", d: "Y", w: 330 },
        { t: "n", g: "A", s: "VSS", d: "Y", w: 300 }, { t: "n", g: "B", s: "VSS", d: "Y", w: 300 }],
    },
    INV_X2: {
      name: "INV_X2", fn: "Y = A' (구동력 2배)", desc: "두 핑거 인버터", w: 3 * CPP,
      rects: [].concat(common(570), [
        R("od", 50, 150, 520, 450), R("od", 50, 780, 520, 1110),
        R("po", 165, 90, 215, 1170, "A"), R("po", 355, 90, 405, 1170, "A"), R("po", 80, 565, 405, 675, "A"),
        ...COLS(80, NY), ...COLS(260, NY), ...COLS(440, NY), ...COLS(80, PY), ...COLS(260, PY), ...COLS(440, PY), R("co", 95, 595, 145, 645),
        R("m1", 75, 0, 135, 405, "VSS"), R("m1", 435, 0, 495, 405, "VSS"), R("m1", 75, 835, 135, 1260, "VDD"), R("m1", 435, 835, 495, 1260, "VDD"),
        R("m1", 255, 195, 315, 1055, "Y"), R("m1", 90, 520, 150, 720, "A"),
      ]),
      pins: [{ name: "A", x: 120, y: 690 }, { name: "Y", x: 285, y: 300 }, { name: "VDD", x: 300, y: 1260 }, { name: "VSS", x: 300, y: 0 }],
      sch: [{ t: "n", g: "A", s: "VSS", d: "Y", w: 600 }, { t: "p", g: "A", s: "VDD", d: "Y", w: 660 }],
    },
  };
  Object.values(CELLS).forEach((c) => { c.h = H; c.area = c.w * H; c.sch.forEach((d) => (d.l = 50)); c.rects.forEach((r, i) => (r.id = i)); });

  /* ------------------------------------------------------------ 기하 유틸 */
  const ov = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;           // 면적 겹침
  const touch = (a, b) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;   // 겹침 또는 맞닿음
  const inter = (a, b) => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
  const grow = (a, d) => ({ x0: a.x0 - d, y0: a.y0 - d, x1: a.x1 + d, y1: a.y1 + d });
  function dist(a, b) {
    const dx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1), dy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
    return Math.hypot(dx, dy);
  }
  /** 사각형 a에서 사각형 목록을 뺀 나머지 조각들 */
  function subtract(a, list) {
    let pieces = [a];
    for (const b of list) {
      const next = [];
      for (const p of pieces) {
        if (!ov(p, b)) { next.push(p); continue; }
        if (p.y0 < b.y0) next.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: b.y0 });
        if (b.y1 < p.y1) next.push({ x0: p.x0, y0: b.y1, x1: p.x1, y1: p.y1 });
        const y0 = Math.max(p.y0, b.y0), y1 = Math.min(p.y1, b.y1);
        if (p.x0 < b.x0) next.push({ x0: p.x0, y0, x1: b.x0, y1 });
        if (b.x1 < p.x1) next.push({ x0: b.x1, y0, x1: p.x1, y1 });
      }
      pieces = next;
      if (!pieces.length) break;
    }
    return pieces;
  }
  const covered = (a, list) => subtract(a, list).every((p) => (p.x1 - p.x0) * (p.y1 - p.y0) < 1e-6);
  /** 같은 레이어 사각형을 맞닿음 기준으로 묶은 성분 번호 */
  function components(rs) {
    const par = rs.map((_, i) => i);
    const f = (i) => (par[i] === i ? i : (par[i] = f(par[i])));
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (touch(rs[i], rs[j]) && (ov(rs[i], rs[j]) || edgeShare(rs[i], rs[j]))) par[f(i)] = f(j);
    return rs.map((_, i) => f(i));
  }
  function edgeShare(a, b) { // 변을 길이 > 0 으로 공유
    if (a.x1 === b.x0 || b.x1 === a.x0) return Math.min(a.y1, b.y1) > Math.max(a.y0, b.y0);
    if (a.y1 === b.y0 || b.y1 === a.y0) return Math.min(a.x1, b.x1) > Math.max(a.x0, b.x0);
    return false;
  }
  const byLayer = (rects, l) => rects.filter((r) => r.l === l);
  function bbox(rects) {
    if (!rects.length) return { x0: 0, y0: 0, x1: 100, y1: 100 };
    return rects.reduce((b, r) => ({ x0: Math.min(b.x0, r.x0), y0: Math.min(b.y0, r.y0), x1: Math.max(b.x1, r.x1), y1: Math.max(b.y1, r.y1) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  }

  /* ------------------------------------------------------------ DRC */
  function drc(rects, opts = {}) {
    const out = [];
    const on = (id) => !opts.rules || opts.rules.includes(id);
    const add = (rule, mark, rs, msg) => out.push({ rule: RULE[rule], id: rule, mark, rects: rs, msg });
    const L = {}; LAYERS.forEach((l) => (L[l.key] = byLayer(rects, l.key)));
    for (const r of RULES) {
      if (!on(r.id)) continue;
      const A = L[r.layer] || [];
      if (r.type === "width") {
        A.forEach((a) => { const w = Math.min(a.x1 - a.x0, a.y1 - a.y0); if (w < r.v - 1e-6) add(r.id, a, [a], `폭 ${w} nm < ${r.v} nm`); });
      } else if (r.type === "exact") {
        A.forEach((a) => { const w = a.x1 - a.x0, h = a.y1 - a.y0; if (Math.abs(w - r.v) > 1e-6 || Math.abs(h - r.v) > 1e-6) add(r.id, a, [a], `${w} × ${h} nm (허용: ${r.v} × ${r.v})`); });
      } else if (r.type === "space") {
        const comp = components(A);
        for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
          if (comp[i] === comp[j]) continue;
          const d = dist(A[i], A[j]);
          if (d < r.v - 1e-6) add(r.id, gapRect(A[i], A[j]), [A[i], A[j]], d === 0 ? "맞닿아 있음(의도했다면 겹치게 그려야 함)" : `간격 ${Math.round(d)} nm < ${r.v} nm`);
        }
      } else if (r.type === "space2") {
        const B = L[r.other];
        A.forEach((a) => B.forEach((b) => { if (ov(a, b)) return; const d = dist(a, b); if (d < r.v - 1e-6) { if (A.some((a2) => a2 !== a && ov(a2, b) && touch(a2, a))) return; add(r.id, gapRect(a, b), [a, b], `간격 ${Math.round(d)} nm < ${r.v} nm`); } }));
      } else if (r.type === "encl") {
        A.forEach((a) => {
          const need = grow(a, r.v);
          const ok = r.other.some((o) => covered(need, L[o]));
          if (!ok) {
            if (r.id === "CO.EN.1" && !r.other.some((o) => L[o].some((b) => ov(a, b)))) { add(r.id, a, [a], "콘택 아래에 활성 영역도 폴리도 없음"); return; }
            add(r.id, need, [a], `둘러싸기 ${r.v} nm 부족 (${r.other.map((o) => LAYER[o].en.split(" ")[0]).join(" 또는 ")})`);
          }
        });
      } else if (r.type === "endcap") {
        const OD = L.od;
        gates(L.po, OD).forEach((g) => {
          if (g.dir === "x") { add(r.id, g.r, [g.r], "게이트가 활성 영역을 완전히 가로지르지 않음 → 소스·드레인 단락"); return; }
          const need = g.dir === "v" ? { x0: g.r.x0, x1: g.r.x1, y0: g.od.y0 - r.v, y1: g.od.y1 + r.v } : { y0: g.r.y0, y1: g.r.y1, x0: g.od.x0 - r.v, x1: g.od.x1 + r.v };
          if (!covered(need, L.po)) add(r.id, need, [g.r], `엔드캡 ${r.v} nm 미만`);
        });
      } else if (r.type === "cogate") {
        A.forEach((c) => {
          if (!L.od.some((o) => ov(c, o))) return;
          L.po.forEach((p) => {
            const isGate = L.od.some((o) => ov(p, o));
            if (!isGate) return;
            const gp = L.od.filter((o) => ov(p, o)).map((o) => inter(p, o));
            gp.forEach((g) => { const d = dist(c, g); if (d < r.v - 1e-6) add(r.id, ov(c, g) ? c : gapRect(c, g), [c, p], ov(c, g) ? "콘택이 게이트 위에 있음" : `간격 ${Math.round(d)} nm < ${r.v} nm`); });
          });
        });
      } else if (r.type === "nwod") {
        L.od.forEach((o) => {
          const isP = L.pp.some((p) => ov(o, p));
          if (!isP) return;
          if (!covered(grow(o, r.v), L.nw)) add(r.id, grow(o, r.v), [o], L.nw.some((n) => ov(n, o)) ? `웰 둘러싸기 ${r.v} nm 부족` : "PMOS 활성 영역이 N-웰 밖에 있음");
        });
      } else if (r.type === "nwsp") {
        L.od.forEach((o) => {
          const isN = L.np.some((p) => ov(o, p));
          if (!isN) return;
          L.nw.forEach((n) => { const d = ov(n, o) ? 0 : dist(n, o); if (d < r.v - 1e-6) add(r.id, ov(n, o) ? inter(n, o) : gapRect(n, o), [o, n], ov(n, o) ? "NMOS 활성 영역이 N-웰 안에 있음" : `간격 ${Math.round(d)} nm < ${r.v} nm`); });
        });
      } else if (r.type === "overlap") {
        L.np.forEach((a) => L.pp.forEach((b) => { if (ov(a, b)) add(r.id, inter(a, b), [a, b], "N+와 P+가 겹침"); }));
      } else if (r.type === "gatetype") {
        gates(L.po, L.od).forEach((g) => {
          const inN = covered(g.g, L.np), inP = covered(g.g, L.pp);
          if (!inN && !inP) add(r.id, g.g, [g.r], "게이트가 N+/P+ 어느 쪽에도 온전히 속하지 않음");
        });
      }
    }
    return out;
  }
  function gapRect(a, b) {
    const x0 = Math.min(a.x1, b.x1), x1 = Math.max(a.x0, b.x0), y0 = Math.min(a.y1, b.y1), y1 = Math.max(a.y0, b.y0);
    const xs = x0 <= x1 ? [x0, x1] : [Math.max(a.x0, b.x0), Math.min(a.x1, b.x1)];
    const ys = y0 <= y1 ? [y0, y1] : [Math.max(a.y0, b.y0), Math.min(a.y1, b.y1)];
    return { x0: xs[0], x1: Math.max(xs[1], xs[0] + 1), y0: ys[0], y1: Math.max(ys[1], ys[0] + 1) };
  }
  /** 폴리가 활성 영역과 겹치는 곳(게이트) 목록. dir: v(세로 게이트) h(가로 게이트) x(완전히 가로지르지 않음) */
  function gates(PO, OD) {
    const out = [];
    OD.forEach((o) => PO.forEach((p) => {
      if (!ov(p, o)) return;
      const g = inter(p, o);
      const fullV = g.y0 <= o.y0 && g.y1 >= o.y1, fullH = g.x0 <= o.x0 && g.x1 >= o.x1;
      // 같은 게이트를 이루는 다른 폴리 조각(패드 등)은 건너뛰고, 활성 영역을 세로로 지나는 몸통만 본다
      if (!fullV && !fullH) { if (PO.some((q) => q !== p && ov(q, o) && covered(g, [q]) && (inter(q, o).y0 <= o.y0 && inter(q, o).y1 >= o.y1))) return; out.push({ r: p, od: o, g, dir: "x" }); return; }
      out.push({ r: p, od: o, g, dir: fullV ? "v" : "h" });
    }));
    return out;
  }

  /* ------------------------------------------------------------ 추출 (5 nm 래스터) */
  function extract(rects, labels = [], opts = {}) {
    const G = opts.grid || 5;
    const bb = bbox(rects);
    const X0 = Math.floor(bb.x0 / G) * G, Y0 = Math.floor(bb.y0 / G) * G;
    const NX = Math.ceil((bb.x1 - X0) / G), NY = Math.ceil((bb.y1 - Y0) / G), N = NX * NY;
    const bm = {};
    LAYERS.forEach((l) => (bm[l.key] = new Uint8Array(N)));
    rects.forEach((r) => {
      const a = bm[r.l]; if (!a) return;
      const i0 = Math.max(0, Math.round((r.x0 - X0) / G)), i1 = Math.min(NX, Math.round((r.x1 - X0) / G));
      const j0 = Math.max(0, Math.round((r.y0 - Y0) / G)), j1 = Math.min(NY, Math.round((r.y1 - Y0) / G));
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) a[j * NX + i] = 1;
    });
    const gate = new Uint8Array(N), diff = new Uint8Array(N);
    for (let k = 0; k < N; k++) { gate[k] = bm.od[k] & bm.po[k]; diff[k] = bm.od[k] & (1 - bm.po[k]); }
    function label(mask) { // 4-연결 성분
      const lab = new Int32Array(N).fill(-1); let n = 0; const st = [];
      for (let k = 0; k < N; k++) {
        if (!mask[k] || lab[k] >= 0) continue;
        lab[k] = n; st.push(k);
        while (st.length) {
          const q = st.pop(), i = q % NX, j = (q / NX) | 0;
          const nb = [i > 0 ? q - 1 : -1, i < NX - 1 ? q + 1 : -1, j > 0 ? q - NX : -1, j < NY - 1 ? q + NX : -1];
          for (const t of nb) if (t >= 0 && mask[t] && lab[t] < 0) { lab[t] = n; st.push(t); }
        }
        n++;
      }
      return { lab, n };
    }
    const C = { diff: label(diff), po: label(bm.po), m1: label(bm.m1), m2: label(bm.m2), gate: label(gate) };
    // 노드: 층별 성분 → 전역 번호
    const off = { diff: 0 }; off.po = C.diff.n; off.m1 = off.po + C.po.n; off.m2 = off.m1 + C.m1.n;
    const NN = off.m2 + C.m2.n;
    const par = Array.from({ length: NN }, (_, i) => i);
    const f = (i) => (par[i] === i ? i : (par[i] = f(par[i])));
    const uni = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
    const errors = [];
    for (let k = 0; k < N; k++) {
      if (bm.co[k] && bm.m1[k]) {
        if (diff[k]) uni(off.diff + C.diff.lab[k], off.m1 + C.m1.lab[k]);
        else if (bm.po[k] && !bm.od[k]) uni(off.po + C.po.lab[k], off.m1 + C.m1.lab[k]);
      }
      if (bm.v1[k] && bm.m1[k] && bm.m2[k]) uni(off.m1 + C.m1.lab[k], off.m2 + C.m2.lab[k]);
    }
    if ([...bm.co].some((v, k) => v && gate[k])) errors.push("게이트 위 콘택");
    // 라벨 → 넷 이름
    const nodeAt = (x, y, l) => {
      const i = Math.floor((x - X0) / G), j = Math.floor((y - Y0) / G);
      if (i < 0 || j < 0 || i >= NX || j >= NY) return -1;
      const k = j * NX + i, key = l || "m1";
      if (key === "m1" && bm.m1[k]) return off.m1 + C.m1.lab[k];
      if (key === "m2" && bm.m2[k]) return off.m2 + C.m2.lab[k];
      if (key === "po" && bm.po[k]) return off.po + C.po.lab[k];
      if (bm.m1[k]) return off.m1 + C.m1.lab[k];
      return -1;
    };
    const names = {}, shorts = [], opens = [], portRoots = {};
    // 명시된 출력 별칭만 같은 넷 이름으로 정규화한다. 그 밖의 이름 충돌은 단락이다.
    const canonical = (name) => (opts.aliases && opts.aliases[name]) || name;
    labels.forEach((lb) => {
      const n = nodeAt(lb.x, lb.y, lb.l);
      if (n < 0) { opens.push(lb.name + " 라벨 아래에 금속이 없음"); return; }
      const r = f(n);
      const name = canonical(lb.name);
      if (names[r] && names[r] !== name) shorts.push(names[r] + " ↔ " + lb.name);
      else names[r] = name;
      portRoots[lb.name] = r;
    });
    const seen = {}; labels.forEach((lb) => { const n = nodeAt(lb.x, lb.y, lb.l); if (n < 0) return; const r = f(n), name = canonical(lb.name); if (seen[name] != null && seen[name] !== r) opens.push(lb.name + " 이 둘 이상으로 끊겨 있음"); seen[name] = r; });
    let auto = 0;
    const netName = (node) => { const r = f(node); if (!names[r]) names[r] = "n" + ++auto; return names[r]; };
    // 트랜지스터
    const devices = [];
    for (let g = 0; g < C.gate.n; g++) {
      let cnt = 0, i0 = NX, i1 = 0, j0 = NY, j1 = 0, npix = 0, ppix = 0, polyNode = -1;
      const sd = new Set();
      for (let k = 0; k < N; k++) {
        if (C.gate.lab[k] !== g) continue;
        cnt++; const i = k % NX, j = (k / NX) | 0;
        i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
        if (bm.np[k]) npix++; if (bm.pp[k]) ppix++;
        if (polyNode < 0) polyNode = off.po + C.po.lab[k];
        const nb = [i > 0 ? k - 1 : -1, i < NX - 1 ? k + 1 : -1, j > 0 ? k - NX : -1, j < NY - 1 ? k + NX : -1];
        for (const t of nb) if (t >= 0 && diff[t]) sd.add(C.diff.lab[t]);
      }
      const w = (i1 - i0 + 1) * G, h = (j1 - j0 + 1) * G, L = Math.min(w, h), W = (cnt * G * G) / L;
      const t = npix > ppix ? "n" : ppix > 0 ? "p" : "?";
      const ends = [...sd].map((d) => netName(off.diff + d));
      devices.push({ t, g: netName(polyNode), s: ends[0] || "?", d: ends[1] || ends[0] || "?", W: Math.round(W), L: Math.round(L), x: X0 + ((i0 + i1 + 1) / 2) * G, y: Y0 + ((j0 + j1 + 1) / 2) * G, nsd: ends.length });
    }
    devices.forEach((d) => { if (d.nsd !== 2) errors.push(`게이트 (${Math.round(d.x)}, ${Math.round(d.y)})의 소스·드레인이 ${d.nsd}개`); if (d.t === "?") errors.push(`게이트 (${Math.round(d.x)}, ${Math.round(d.y)})에 N+/P+ 주입 없음`); });
    // 확산 면적·둘레 (소스/드레인별, nm² / nm)
    const diffInfo = [];
    for (let d = 0; d < C.diff.n; d++) {
      let a = 0, per = 0;
      for (let k = 0; k < N; k++) if (C.diff.lab[k] === d) {
        a++; const i = k % NX, j = (k / NX) | 0;
        const nb = [i > 0 ? k - 1 : -1, i < NX - 1 ? k + 1 : -1, j > 0 ? k - NX : -1, j < NY - 1 ? k + NX : -1];
        for (const t of nb) if (t < 0 || !bm.od[t]) per++;
      }
      diffInfo.push({ net: netName(off.diff + d), area: a * G * G, perim: per * G });
    }
    const ports = {}; Object.keys(portRoots).forEach((name) => { ports[name] = netName(portRoots[name]); });
    return { devices, errors, shorts, opens, diff: diffInfo, nets: [...new Set(Object.values(names))], ports };
  }

  /** 병렬 소자 합치기 → 서명 목록 */
  function signature(devs) {
    const m = {};
    devs.forEach((d) => {
      const sd = [d.s, d.d].sort();
      const k = d.t + "|" + d.g + "|" + sd.join(",") + "|L=" + (d.L || d.l || 50);
      m[k] = (m[k] || 0) + (d.W || d.w || 1);
    });
    return m;
  }
  /** LVS: 추출 결과와 회로도(sch: [{t,g,s,d,w}]) 비교. 이름 없는 내부 넷(n1…)은 순열로 대응 */
  function lvs(ext, sch) {
    const msgs = [];
    if (ext.shorts.length) msgs.push("단락: " + ext.shorts.join(", "));
    if (ext.opens.length) msgs.push("개방: " + ext.opens.join(", "));
    const cnt = (ds, t) => ds.filter((d) => d.t === t).length;
    const se = signature(ext.devices), ss = signature(sch);
    const pins = new Set(); sch.forEach((d) => [d.g, d.s, d.d].forEach((n) => { if (!/^[np]\d+$/.test(n)) pins.add(n); }));
    const intE = [...new Set(ext.devices.flatMap((d) => [d.g, d.s, d.d]).filter((n) => /^n\d+$/.test(n)))];
    const intS = [...new Set(sch.flatMap((d) => [d.g, d.s, d.d]).filter((n) => /^[np]\d+$/.test(n)))];
    let match = false;
    const keysS = Object.keys(ss).sort().join(";");
    if (intE.length === intS.length && intE.length <= 6) {
      const perm = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perm(arr.slice(0, i).concat(arr.slice(i + 1))).map((p) => [x].concat(p))));
      for (const p of perm(intS)) {
        const map = {}; intE.forEach((n, i) => (map[n] = p[i]));
        const devs = ext.devices.map((d) => ({ t: d.t, g: map[d.g] || d.g, s: map[d.s] || d.s, d: map[d.d] || d.d, W: d.W, L: d.L }));
        const sig = signature(devs);
        if (Object.keys(sig).sort().join(";") === keysS && Object.keys(ss).every((key) => Math.abs(sig[key] - ss[key]) < 1e-6)) { match = true; break; }
      }
    }
    const nE = cnt(ext.devices, "n"), pE = cnt(ext.devices, "p");
    const nS = sch.filter((d) => d.t === "n").length, pS = sch.filter((d) => d.t === "p").length;
    if (!match) {
      if (nE !== nS || pE !== pS) msgs.push(`소자 수 불일치: 레이아웃 NMOS ${nE}·PMOS ${pE} / 회로도 NMOS ${nS}·PMOS ${pS} (병렬 소자는 하나로 합쳐 비교)`);
      else msgs.push("소자 수는 같지만 연결 또는 W/L이 다름");
    }
    return { match: match && !ext.shorts.length && !ext.opens.length && !ext.errors.length, msgs: msgs.concat(ext.errors), pins: [...pins] };
  }

  /** SPICE 부회로 텍스트 */
  function spice(name, ext, pins) {
    const lines = [`.SUBCKT ${name} ${pins.join(" ")}`];
    ext.devices.forEach((d, i) => {
      const bulk = d.t === "n" ? "VSS" : "VDD";
      lines.push(`M${i + 1} ${d.d} ${d.g} ${d.s} ${bulk} ${d.t === "n" ? "nch" : "pch"} W=${d.W}n L=${d.L}n`);
    });
    lines.push(".ENDS");
    return lines.join("\n");
  }

  /* ------------------------------------------------------------ 단면 */
  // 수직 좌표 z (nm): 0 = 실리콘 표면, 위가 +
  const Z = { sub: -300, well: -250, sti: -200, sd: -60, ldd: -24, hk: 3, poly: 83, sil: 8, polysil: 93, spacer: 22, cesl: 12, pmd: 190, m1b: 200, m1t: 290, ild2: 300, v1t: 370, m2t: 460, top: 480 };
  /** 절단선 cut = {dir:'h', y} 또는 {dir:'v', x}. 단면 영역 목록과 범위를 돌려준다. upto: STAGES 인덱스 */
  function xsection(rects, cut, opts = {}) {
    const upto = opts.upto == null ? STAGES.length - 1 : opts.upto;
    const span = opts.span || null;
    const H2 = cut.dir === "h";
    const bb = bbox(rects);
    const s0 = span ? span[0] : (H2 ? bb.x0 : bb.y0) - 40, s1 = span ? span[1] : (H2 ? bb.x1 : bb.y1) + 40;
    const iv = (l) => mergeIv(byLayer(rects, l).filter((r) => (H2 ? r.y0 <= cut.y && cut.y < r.y1 : r.x0 <= cut.x && cut.x < r.x1)).map((r) => [Math.max(s0, H2 ? r.x0 : r.y0), Math.min(s1, H2 ? r.x1 : r.y1)]).filter((a) => a[1] > a[0]));
    const I = {}; LAYERS.forEach((l) => (I[l.key] = iv(l.key)));
    const reg = [];
    const add = (mat, a, b, z0, z1, layer, extra) => { if (b - a > 0.01 && z1 - z0 > 0.01) reg.push(Object.assign({ mat, s0: a, s1: b, z0, z1, layer }, extra || {})); };
    const st = (k) => STAGES.findIndex((s) => s.key === k) <= upto;
    // 기판 + 웰
    add("si", s0, s1, Z.sub, 0, null, { stage: "sub" });
    if (st("well")) {
      const nw = I.nw, pw = complement(nw, s0, s1);
      nw.forEach(([a, b]) => add("nwell", a, b, Z.well, 0, "nw", { tint: true, stage: "well" }));
      pw.forEach(([a, b]) => add("pwell", a, b, Z.well, 0, "nw", { tint: true, stage: "well", inverse: true }));
    }
    // STI
    const od = st("sti") ? I.od : [[s0, s1]];
    if (st("sti")) complement(od, s0, s1).forEach(([a, b]) => add("ox", a, b, Z.sti, 6, "od", { stage: "sti", inverse: true }));
    // 게이트
    const po = st("gate") ? I.po : [];
    const spW = Z.spacer;
    const sp = st("ldd") ? po.flatMap(([a, b]) => [[a - spW, a], [b, b + spW]]) : [];
    const blocked = mergeIv(po.concat(sp));
    const sdIv = intersectIv(od, complement(blocked, s0, s1));
    const typeAt = (a, b) => { const m = (a + b) / 2; return I.np.some(([x, y]) => x <= m && m < y) ? "n" : I.pp.some(([x, y]) => x <= m && m < y) ? "p" : null; };
    if (st("ldd")) intersectIv(od, complement(po, s0, s1)).forEach(([a, b]) => { const t = typeAt(a, b); if (t) add(t === "n" ? "nplus" : "pplus", a, b, Z.ldd, 0, t === "n" ? "np" : "pp", { tint: true, ldd: true, stage: "ldd" }); });
    if (st("sd")) sdIv.forEach(([a, b]) => { const t = typeAt(a, b); if (t) add(t === "n" ? "nplus" : "pplus", a, b, Z.sd, 0, t === "n" ? "np" : "pp", { tint: true, stage: "sd" }); });
    if (st("sil")) sdIv.forEach(([a, b]) => add("sil", a, b, -6, Z.sil, null, { stage: "sil", self: true }));
    po.forEach(([a, b]) => {
      intersectIv([[a, b]], od).forEach(([x, y]) => add("hk", x, y, 0, Z.hk, "po", { stage: "gate", what: "gate-ox" }));
      // 폴리 바닥: 활성 영역 위는 게이트 절연막 위, STI 위는 STI 표면 위
      const base = (m) => (od.some(([x, y]) => x <= m && m < y) ? Z.hk : 6);
      splitAt([a, b], od).forEach(([x, y]) => add("poly", x, y, base((x + y) / 2), Z.poly, "po", { stage: "gate", channel: od.some(([p, q]) => p <= (x + y) / 2 && (x + y) / 2 < q) }));
      if (st("sil")) add("sil", a, b, Z.poly, Z.polysil, null, { stage: "sil", self: true });
    });
    sp.forEach(([a, b]) => add("nit", Math.max(s0, a), Math.min(s1, b), 0, Z.poly, null, { stage: "ldd", self: true, what: "spacer" }));
    // PMD + 콘택
    if (st("co")) {
      add("ox", s0, s1, 0, Z.pmd, null, { stage: "co", fill: true, what: "pmd" });
      I.co.forEach(([a, b]) => {
        const m = (a + b) / 2;
        const onPoly = po.some(([x, y]) => x <= m && m < y), onSD = sdIv.some(([x, y]) => x <= m && m < y);
        const zb = onPoly ? Z.polysil : onSD ? Z.sil : 6;
        add("tin", a, b, zb, Z.pmd, "co", { stage: "co" });
        add("w", a + 4, b - 4, zb + 4, Z.pmd, "co", { stage: "co" });
      });
    }
    if (st("m1")) {
      add("lowk", s0, s1, Z.pmd, Z.m1t, null, { stage: "m1", fill: true });
      I.m1.forEach(([a, b]) => { add("tin", a, b, Z.m1b - 4, Z.m1t, "m1", { stage: "m1" }); add("cu", a + 4, b - 4, Z.m1b, Z.m1t, "m1", { stage: "m1" }); });
    }
    if (st("m2") && (I.m2.length || I.v1.length || opts.always2)) {
      add("lowk", s0, s1, Z.m1t, Z.m2t, null, { stage: "m2", fill: true });
      I.v1.forEach(([a, b]) => { add("tin", a, b, Z.m1t, Z.v1t, "v1", { stage: "m2" }); add("cu", a + 4, b - 4, Z.m1t, Z.v1t, "v1", { stage: "m2" }); });
      I.m2.forEach(([a, b]) => { add("tin", a, b, Z.v1t, Z.m2t, "m2", { stage: "m2" }); add("cu", a + 4, b - 4, Z.v1t + 4, Z.m2t, "m2", { stage: "m2" }); });
    }
    const zTop = st("m2") && reg.some((r) => r.stage === "m2") ? Z.m2t + 20 : st("m1") ? Z.m1t + 20 : st("co") ? Z.pmd + 20 : 140;
    return { regions: reg, s0, s1, z0: Z.sub, z1: Math.max(140, zTop), cut, I };
  }
  function mergeIv(list) {
    const a = list.slice().sort((p, q) => p[0] - q[0]), out = [];
    for (const v of a) { if (out.length && v[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], v[1]); else out.push(v.slice()); }
    return out;
  }
  function complement(iv, s0, s1) {
    const out = []; let c = s0;
    mergeIv(iv).forEach(([a, b]) => { if (a > c) out.push([c, Math.min(a, s1)]); c = Math.max(c, b); });
    if (c < s1) out.push([c, s1]);
    return out.filter((v) => v[1] > v[0]);
  }
  function intersectIv(A, B) {
    const out = [];
    A.forEach(([a, b]) => B.forEach(([c, d]) => { const x = Math.max(a, c), y = Math.min(b, d); if (y > x) out.push([x, y]); }));
    return mergeIv(out);
  }
  function splitAt(iv, by) {
    const pts = [iv[0], iv[1]];
    by.forEach(([a, b]) => { if (a > iv[0] && a < iv[1]) pts.push(a); if (b > iv[0] && b < iv[1]) pts.push(b); });
    pts.sort((p, q) => p - q);
    const out = []; for (let i = 0; i < pts.length - 1; i++) if (pts[i + 1] > pts[i]) out.push([pts[i], pts[i + 1]]);
    return out;
  }

  /** 단면 그리기. 반환: {X, Z, hit(px,py)} */
  function drawXsec(ctx, xs, box, opts = {}) {
    const P = window.PB ? PB.palette() : { text: "#000", dim: "#555", faint: "#999", accent: "#6d3fd1", grid: "#eee", bg: "#fff" };
    const ex = opts.exag || 1;
    const sw = xs.s1 - xs.s0, zh = (xs.z1 - xs.z0) * ex;
    const k = Math.min(box.w / sw, box.h / zh);
    const ox = box.x + (box.w - sw * k) / 2, oy = box.y + (box.h - zh * k) / 2 + zh * k;
    const X = (s) => ox + (s - xs.s0) * k, Zp = (z) => oy - (z - xs.z0) * ex * k;
    const order = (r) => (r.tint ? 1 : 0);
    const hl = opts.highlight;
    const regs = xs.regions.slice().sort((a, b) => order(a) - order(b));
    regs.forEach((r) => {
      const m = MAT[r.mat];
      const x0 = X(r.s0), x1 = X(r.s1), y0 = Zp(r.z1), y1 = Zp(r.z0);
      ctx.globalAlpha = r.tint ? (r.ldd ? 0.32 : r.mat === "nwell" || r.mat === "pwell" ? 0.16 : 0.5) : 1;
      if (hl && !match(r, hl)) ctx.globalAlpha *= 0.28;
      ctx.fillStyle = m.color;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.globalAlpha = 1;
    });
    // 경계선
    ctx.strokeStyle = "rgba(20,26,40,.35)"; ctx.lineWidth = 0.7;
    regs.forEach((r) => { if (r.tint || r.fill) return; ctx.strokeRect(X(r.s0), Zp(r.z1), X(r.s1) - X(r.s0), Zp(r.z0) - Zp(r.z1)); });
    // 강조 테두리
    if (hl) {
      ctx.strokeStyle = P.accent; ctx.lineWidth = 2;
      regs.forEach((r) => { if (match(r, hl) && !(r.mat === "nwell" || r.mat === "pwell")) ctx.strokeRect(X(r.s0) + 1, Zp(r.z1) + 1, X(r.s1) - X(r.s0) - 2, Zp(r.z0) - Zp(r.z1) - 2); });
    }
    // 실리콘 표면 표시
    ctx.strokeStyle = P.faint; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(xs.s0), Zp(0)); ctx.lineTo(X(xs.s1), Zp(0)); ctx.stroke(); ctx.setLineDash([]);
    if (opts.scale !== false) {
      const bar = niceBar(sw / 4);
      ctx.fillStyle = P.dim; ctx.strokeStyle = P.dim; ctx.lineWidth = 2;
      const bx = box.x + 8, by = box.y + box.h - 8;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bar * k, by); ctx.stroke();
      ctx.font = window.PB ? PB.font(11, true) : "11px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(bar + " nm" + (ex !== 1 ? "  (세로 ×" + ex + ")" : ""), bx, by - 3);
    }
    const hit = (px, py) => {
      let best = null;
      for (const r of regs) {
        if (px >= X(r.s0) && px <= X(r.s1) && py >= Zp(r.z1) && py <= Zp(r.z0)) {
          if (!best || (best.tint && !r.tint) || (!!best.tint === !!r.tint && (r.z1 - r.z0) * (r.s1 - r.s0) < (best.z1 - best.z0) * (best.s1 - best.s0))) best = r;
        }
      }
      return best;
    };
    return { X, Z: Zp, hit, k };
  }
  function match(r, hl) {
    if (typeof hl === "function") return hl(r);
    if (hl.layer) return r.layer === hl.layer;
    if (hl.stage) return r.stage === hl.stage;
    return r === hl;
  }
  function niceBar(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 5, 10]) if (m * p >= v * 0.6) return m * p; return p; }

  /* ------------------------------------------------------------ 레이아웃 그리기 */
  const patCache = {};
  function pattern(ctx, color, dir) {
    const key = color + dir;
    if (patCache[key]) return patCache[key];
    const c = document.createElement("canvas"); c.width = c.height = 8;
    const g = c.getContext("2d"); g.strokeStyle = color; g.globalAlpha = 0.9; g.lineWidth = 1;
    g.beginPath();
    if (dir > 0) { g.moveTo(0, 8); g.lineTo(8, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(6, 10); g.lineTo(10, 6); }
    else { g.moveTo(0, 0); g.lineTo(8, 8); g.moveTo(-2, 6); g.lineTo(2, 10); g.moveTo(6, -2); g.lineTo(10, 2); }
    g.stroke();
    return (patCache[key] = ctx.createPattern(c, "repeat"));
  }
  /**
   * rects를 box 안에 그린다. opts: { view:{x0,y0,x1,y1}, visible:{key:bool}, highlight:key|rect|fn, dim:true,
   *   pins:[{name,x,y}], cut:{dir,y|x}, drc:[viol], grid:nm, boundary:{x0,y0,x1,y1}, labels:true, pad:px }
   * 반환: { X, Y, inv(px,py) → [x,y], k }
   */
  function drawLayout(ctx, rects, box, opts = {}) {
    const P = window.PB ? PB.palette() : { text: "#000", dim: "#555", faint: "#999", accent: "#6d3fd1", grid: "#eee", bad: "#d64545", bg: "#fff" };
    const v = opts.view || grow(bbox(rects), 60);
    const pad = opts.pad == null ? 6 : opts.pad;
    const k = Math.min((box.w - 2 * pad) / (v.x1 - v.x0), (box.h - 2 * pad) / (v.y1 - v.y0));
    const ox = box.x + (box.w - (v.x1 - v.x0) * k) / 2, oy = box.y + (box.h + (v.y1 - v.y0) * k) / 2;
    const X = (x) => ox + (x - v.x0) * k, Y = (y) => oy - (y - v.y0) * k;
    const inv = (px, py) => [(px - ox) / k + v.x0, (oy - py) / k + v.y0];
    const vis = opts.visible || {};
    const isOn = (l) => vis[l] !== false;
    const hl = opts.highlight;
    const isHl = (r) => !hl ? true : typeof hl === "function" ? hl(r) : typeof hl === "string" ? r.l === hl : hl === r || (hl.l && hl.id == null && r.l === hl.l);
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    if (opts.grid) {
      ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
      const g = opts.grid;
      for (let x = Math.ceil(v.x0 / g) * g; x <= v.x1; x += g) { ctx.beginPath(); ctx.moveTo(X(x), Y(v.y0)); ctx.lineTo(X(x), Y(v.y1)); ctx.stroke(); }
      for (let y = Math.ceil(v.y0 / g) * g; y <= v.y1; y += g) { ctx.beginPath(); ctx.moveTo(X(v.x0), Y(y)); ctx.lineTo(X(v.x1), Y(y)); ctx.stroke(); }
    }
    if (opts.boundary) {
      const b = opts.boundary;
      ctx.strokeStyle = P.dim; ctx.lineWidth = 1.2; ctx.setLineDash([8, 4, 2, 4]);
      ctx.strokeRect(X(b.x0), Y(b.y1), (b.x1 - b.x0) * k, (b.y1 - b.y0) * k); ctx.setLineDash([]);
    }
    const order = opts.order || DRAW_ORDER;
    order.forEach((key) => {
      if (!isOn(key)) return;
      const L = LAYER[key];
      byLayer(rects, key).forEach((r) => {
        const on = isHl(r);
        const x = X(r.x0), y = Y(r.y1), w = (r.x1 - r.x0) * k, h = (r.y1 - r.y0) * k;
        const a = hl ? (on ? 1 : 0.18) : 1;
        let col = L.color;
        if (L.key === "co") col = opts.coColor || (PB && PB.isDark && PB.isDark() ? "#dee2e6" : "#343a40");
        ctx.globalAlpha = L.fill * a * (opts.fade || 1);
        ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
        if (L.hatch && a > 0.5) { ctx.globalAlpha = 0.5 * a; ctx.fillStyle = pattern(ctx, col, L.hatch); ctx.fillRect(x, y, w, h); }
        ctx.globalAlpha = Math.min(1, 0.95 * a + 0.05);
        ctx.strokeStyle = col; ctx.lineWidth = (L.width || 1) * (on && hl ? 1.6 : 1);
        ctx.setLineDash(L.dash || []); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.setLineDash([]);
        if (L.cross && w > 6) { ctx.beginPath(); ctx.moveTo(x + 1.5, y + 1.5); ctx.lineTo(x + w - 1.5, y + h - 1.5); ctx.moveTo(x + w - 1.5, y + 1.5); ctx.lineTo(x + 1.5, y + h - 1.5); ctx.strokeStyle = L.key === "co" ? (PB.isDark() ? "#343a40" : "#f1f3f5") : "#fff"; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
    });
    if (opts.selected) {
      const r = opts.selected; ctx.strokeStyle = P.accent; ctx.lineWidth = 2.2; ctx.setLineDash([5, 3]);
      ctx.strokeRect(X(r.x0) - 2, Y(r.y1) - 2, (r.x1 - r.x0) * k + 4, (r.y1 - r.y0) * k + 4); ctx.setLineDash([]);
    }
    if (opts.drc) opts.drc.forEach((d) => {
      const m = d.mark; ctx.strokeStyle = P.bad; ctx.lineWidth = 2; ctx.fillStyle = P.bad; ctx.globalAlpha = 0.22;
      const x = X(m.x0), y = Y(m.y1), w = Math.max(4, (m.x1 - m.x0) * k), h = Math.max(4, (m.y1 - m.y0) * k);
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.globalAlpha = 1; ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    });
    if (opts.pins) {
      ctx.font = window.PB ? PB.font(Math.max(10, Math.min(13, k * 40)), true, 700) : "12px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      opts.pins.forEach((p) => {
        const tw = ctx.measureText(p.name).width + 8;
        ctx.fillStyle = PB.isDark() ? "rgba(15,21,34,.82)" : "rgba(255,255,255,.85)";
        ctx.fillRect(X(p.x) - tw / 2, Y(p.y) - 9, tw, 18);
        ctx.fillStyle = P.text; ctx.fillText(p.name, X(p.x), Y(p.y));
      });
    }
    if (opts.cut) {
      const c = opts.cut; ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.setLineDash([7, 4]);
      ctx.beginPath();
      if (c.dir === "h") { ctx.moveTo(box.x, Y(c.y)); ctx.lineTo(box.x + box.w, Y(c.y)); }
      else { ctx.moveTo(X(c.x), box.y); ctx.lineTo(X(c.x), box.y + box.h); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = P.accent; ctx.font = window.PB ? PB.font(12, true, 700) : "12px monospace";
      if (c.dir === "h") { ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("A", box.x + 4, Y(c.y) - 3); ctx.textAlign = "right"; ctx.fillText("A′", box.x + box.w - 4, Y(c.y) - 3); }
      else { ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("A", X(c.x) + 4, box.y + 4); ctx.textBaseline = "bottom"; ctx.fillText("A′", X(c.x) + 4, box.y + box.h - 4); }
    }
    ctx.restore();
    return { X, Y, inv, k, view: v };
  }
  /** 좌표 아래 가장 위 레이어의 사각형 */
  function hit(rects, x, y, visible) {
    const vis = visible || {};
    const order = DRAW_ORDER.slice().reverse();
    for (const key of order) {
      if (vis[key] === false) continue;
      const list = byLayer(rects, key).filter((r) => r.x0 <= x && x < r.x1 && r.y0 <= y && y < r.y1);
      if (list.length) return list[list.length - 1];
    }
    return null;
  }
  /** 레이어 정보 HTML (ProcessBook 링크 포함) */
  function layerInfo(key) {
    const L = LAYER[key]; if (!L) return "";
    return `<b style="color:${L.color}">■</b> <b>${L.name}</b> <span class="en">${L.en} · GDS ${L.gds}</span><br>${L.what}<br>` +
      `<span class="pill">마스크 ${L.masks.join(" · ")}</span> ${L.steps.join(" → ")}<br>` +
      L.pb.map(([s, t]) => `<a href="${PBOOK}${s}.html" target="_blank" rel="noopener">ProcessBook ${t} ↗</a>`).join(" · ");
  }

  /** 다른 셀을 x 방향으로 이어 붙이기(정렬된 행). 각 셀의 rects를 복사해 이동 */
  function place(list) {
    let x = 0; const out = [], pins = [];
    list.forEach((item) => {
      const c = typeof item === "string" ? CELLS[item] : CELLS[item.cell];
      const flip = item.flip;
      c.rects.forEach((r) => {
        const y0 = flip ? H - r.y1 : r.y0, y1 = flip ? H - r.y0 : r.y1;
        out.push({ l: r.l, x0: r.x0 + x, x1: r.x1 + x, y0, y1, net: r.net });
      });
      c.pins.forEach((p) => pins.push({ name: p.name, x: p.x + x, y: flip ? H - p.y : p.y, cell: c.name }));
      x += c.w;
    });
    out.forEach((r, i) => (r.id = i));
    return { rects: out, pins, w: x };
  }

  /* ------------------------------------------------------------ ProcessBook 공정 실험실로 넘기기 */
  /**
   * 절단선에 걸린 레이어 구간을 ProcessBook 2D 공정 엔진(XS)의 레시피로 바꾼다.
   * ProcessBook 12장 CMOS 흐름과 같은 순서이며, 각 노광 단계의 clear/chrome 구간이 레이아웃에서 온다.
   * 반환: { url, steps, dom }  (ProcessBook lab.html#r=base64(JSON{d, s}))
   */
  function toProcessBook(rects, cut, opts = {}) {
    const FIELD = 1600, H2 = cut.dir === "h";
    // 셀은 행 안에서 옆으로 이어 붙고(가로 절단), 위아래 행은 뒤집혀 붙는다(세로 절단). 그 반복을 1.6 µm 영역에 채운다.
    const bb = bbox(rects), P = opts.period || (H2 ? Math.max(bb.x1, 100) : H);
    const xs = xsection(rects, cut, { span: [0, P] });
    const c0 = FIELD / 2 - P / 2, off = c0, n = Math.ceil(FIELD / P / 2) + 1;
    const m = (iv) => {
      const out = [];
      for (let k = -n; k <= n; k++) {
        const flip = !H2 && (k & 1);
        iv.forEach(([a, b]) => { const A = flip ? P - b : a, B = flip ? P - a : b; out.push([A + c0 + k * P, B + c0 + k * P]); });
      }
      return mergeIv(out.map(([a, b]) => [Math.round(Math.max(0, a)), Math.round(Math.min(FIELD, b))]).filter((v) => v[1] > v[0]));
    };
    const I = xs.I;
    const inv = (iv) => complement(m(iv), 0, FIELD);
    const off0 = off;
    const OD = m(I.od), NW = m(I.nw), PO = m(I.po), NP = m(I.np), PP = m(I.pp), CO = m(I.co), M1 = m(I.m1);
    const L = (o) => Object.assign({ op: "litho", thick: 160, wl: 193, NA: 1.35, sigma: 0.6, dose: 24, focus: 0, swing: 0.1, peb: 8, dev: 40, k: "LITH" }, o);
    const EUV = { wl: 13.5, NA: 0.33 }, KRF = { wl: 248, NA: 0.8 };
    const strip = { op: "strip", mat: "pr", k: "STRIP", label: "감광막 제거", desc: "" };
    const tag = cut.dir === "h" ? "y = " + cut.y : "x = " + cut.x;
    const S = [];
    const add = (s) => S.push(s);
    // ① STI (마스크 1)
    add({ op: "depo", mat: "ox", mode: "ald", thick: 10, k: "OX", label: "패드 산화막", desc: "DesignBook 레이아웃(" + tag + " nm 절단선)에서 만든 레시피. 질화막 응력 완충용 얇은 산화막." });
    add({ op: "depo", mat: "nit", mode: "cvd", thick: 50, stick: 0.2, k: "DEP", label: "질화막 하드마스크", desc: "STI CMP의 정지막." });
    if (OD.length) {
      add(L({ chrome: OD, dose: 22, label: "마스크 1 · 활성 영역 (OD)", desc: "레이아웃의 OD 구간만 감광막으로 남긴다. 나머지가 STI가 된다." }));
      add({ op: "etch", sel: { nit: 1, ox: 0.6, pr: 0.25, si: 0.1 }, rate: 5, time: 14, ion: 0.95, sigma: 2, k: "ETCH", label: "하드마스크 식각", desc: "" });
      add({ op: "etch", sel: { si: 1, ox: 0.02, nit: 0.04, pr: 0.25 }, rate: 6, time: 34, ion: 0.88, sigma: 4, k: "ETCH", label: "STI 트렌치 식각", desc: "OD가 없는 곳을 판다." });
      add(strip);
      add({ op: "depo", mat: "ox", mode: "cvd", thick: 170, stick: 0.08, k: "DEP", label: "갭필 산화막", desc: "" });
      add({ op: "cmp", stop: "nit", level: 0, over: 4, dish: { ox: 6 }, k: "CMP", label: "STI CMP (질화막 정지)", desc: "" });
    }
    add({ op: "etch", wet: true, sel: { nit: 1, ox: 0.03 }, rate: 2, time: 30, k: "ETCH", label: "질화막 제거 (인산)", desc: "" });
    add({ op: "etch", wet: true, sel: { ox: 1 }, rate: 2, time: 8, k: "ETCH", label: "패드 산화막 제거 · STI 완성", desc: "" });
    // ② 웰 (마스크 2·3)
    if (inv(I.nw).length) {
      add(L(Object.assign({ thick: 420, chrome: NW, label: "마스크 2 · p-웰 (NW 반전)", desc: "NW 안을 가리고 바깥에 붕소를 넣는다." }, KRF)));
      add({ op: "implant", species: "B", E: 45, dose: 1.5e13, tilt: 0, k: "IMP", label: "p-웰 주입 B 45 keV", desc: "" }); add(strip);
    }
    if (NW.length) {
      add(L(Object.assign({ thick: 420, chrome: inv(I.nw), label: "마스크 3 · n-웰 (NW)", desc: "NW 밖을 가리고 안에 인을 넣는다." }, KRF)));
      add({ op: "implant", species: "P", E: 110, dose: 2e13, tilt: 0, k: "IMP", label: "n-웰 주입 P 110 keV", desc: "" }); add(strip);
    }
    add({ op: "anneal", T: 1050, time: 15, k: "ANL", label: "웰 어닐", desc: "" });
    // ③ 게이트 (마스크 4)
    add({ op: "depo", mat: "hk", mode: "ald", thick: 10, k: "DEP", label: "게이트 절연막 (과장)", desc: "실제 1~2 nm. 셀 크기(10 nm)로 그렸다." });
    add({ op: "depo", mat: "poly", mode: "cvd", thick: 80, stick: 0.15, k: "DEP", label: "폴리실리콘 80 nm", desc: "" });
    add(L(Object.assign({ thick: 100, chrome: PO, label: "마스크 4 · 게이트 (PO)", desc: "레이아웃의 PO 구간만 남긴다." }, EUV)));
    add({ op: "etch", sel: { poly: 1, si: 1, hk: 0.02, ox: 0.02, pr: 0.3 }, rate: 5, time: 20, ion: 0.96, sigma: 2, k: "ETCH", label: "게이트 식각", desc: "" });
    add(strip);
    add({ op: "etch", sel: { hk: 1, poly: 0.02, si: 0.02 }, rate: 2, time: 6, ion: 1, sigma: 1.5, k: "ETCH", label: "게이트 절연막 잔류 제거", desc: "" });
    // ④ LDD · 스페이서 · S/D (마스크 5~8)
    const imp = (iv, no, sp, E, dose, nm) => { if (!iv.length) return; add(L({ thick: 180, chrome: complement(iv, 0, FIELD), label: "마스크 " + no + " · " + nm, desc: "주입 영역 밖을 가린다. 게이트·스페이서가 자기 정렬 마스크." })); add({ op: "implant", species: sp, E, dose, tilt: 0, k: "IMP", label: nm + " " + sp + " " + E + " keV", desc: "" }); add(strip); };
    imp(NP, 5, "As", 4, 8e14, "n-LDD"); imp(PP, 6, "BF2", 5, 8e14, "p-LDD");
    add({ op: "depo", mat: "nit", mode: "ald", thick: 24, k: "DEP", label: "스페이서 질화막 (마스크 없음)", desc: "" });
    add({ op: "etch", sel: { nit: 1, si: 0.05, poly: 0.05, ox: 0.1 }, rate: 4, time: 7, ion: 1, sigma: 1.5, k: "ETCH", label: "스페이서 에치백", desc: "" });
    imp(NP, 7, "As", 20, 3e15, "n⁺ S/D"); imp(PP, 8, "B", 4, 3e15, "p⁺ S/D");
    add({ op: "anneal", T: 1050, time: 2, k: "ANL", label: "스파이크 어닐", desc: "" });
    add({ op: "silicide", depth: 12, k: "SIL", label: "살리사이드 (마스크 없음)", desc: "" });
    // ⑤ 콘택 (마스크 9) · M1 (마스크 10)
    add({ op: "depo", mat: "nit", mode: "ald", thick: 16, k: "DEP", label: "CESL", desc: "" });
    add({ op: "depo", mat: "ox", mode: "cvd", thick: 260, stick: 0.1, k: "DEP", label: "PMD 산화막", desc: "" });
    add({ op: "cmp", stop: "", level: -170, k: "CMP", label: "PMD CMP", desc: "" });
    if (CO.length) {
      add(L(Object.assign({ thick: 100, dose: 30, clear: CO, label: "마스크 9 · 콘택 (CO)", desc: "레이아웃의 CO 구간에 구멍을 연다." }, EUV)));
      add({ op: "etch", sel: { ox: 1, nit: 0.08, pr: 0.25, sil: 0.02 }, rate: 5, time: 38, ion: 0.96, sigma: 2, k: "ETCH", label: "콘택 식각 (CESL 정지)", desc: "" });
      add({ op: "etch", sel: { nit: 1, ox: 0.2, sil: 0.03, pr: 0.2 }, rate: 3, time: 8, ion: 1, sigma: 1.5, k: "ETCH", label: "CESL 개방", desc: "" });
      add(strip);
      add({ op: "depo", mat: "tin", mode: "ald", thick: 10, k: "DEP", label: "Ti/TiN 라이너", desc: "" });
      add({ op: "depo", mat: "w", mode: "cvd", thick: 30, stick: 0.04, k: "DEP", label: "텅스텐 CVD", desc: "" });
      add({ op: "cmp", stop: "", level: -166, k: "CMP", label: "텅스텐 CMP", desc: "" });
    }
    add({ op: "depo", mat: "nit", mode: "cvd", thick: 16, stick: 0.2, k: "DEP", label: "식각 정지막", desc: "" });
    add({ op: "depo", mat: "lowk", mode: "cvd", thick: 90, stick: 0.2, k: "DEP", label: "M1 저유전막", desc: "" });
    if (M1.length) {
      add(L(Object.assign({ thick: 100, dose: 26, clear: M1, label: "마스크 10 · M1", desc: "레이아웃의 M1 구간에 트렌치를 연다." }, EUV)));
      add({ op: "etch", sel: { lowk: 1, nit: 0.05, pr: 0.25 }, rate: 5, time: 20, ion: 0.95, sigma: 2, k: "ETCH", label: "M1 트렌치 식각", desc: "" });
      add({ op: "etch", sel: { nit: 1, lowk: 0.1, ox: 0.1, w: 0.01 }, rate: 3, time: 6, ion: 1, sigma: 1.5, k: "ETCH", label: "정지막 개방", desc: "" });
      add(strip);
      add({ op: "depo", mat: "tin", mode: "pvd", thick: 10, cosn: 3, k: "DEP", label: "배리어", desc: "" });
      add({ op: "depo", mat: "cu", mode: "cvd", thick: 70, stick: 0.02, k: "DEP", label: "구리 채움", desc: "" });
      add({ op: "cmp", stop: "", level: -272, dish: { cu: 4 }, k: "CMP", label: "구리 CMP · M1 완성", desc: "DesignBook 레이아웃의 절단선 단면이 ProcessBook 공정 엔진으로 완성되었다." });
    }
    const data = JSON.stringify({ d: "wide", s: S });
    const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(data))) : Buffer.from(data, "utf8").toString("base64");
    return { url: (opts.base || PBOOK) + "lab.html#r=" + b64, steps: S, dom: "wide", off: off0, period: P };
  }

  window.CELL = { LAYERS, LAYER, DRAW_ORDER, STAGES, MAT, RULES, RULE, CELLS, H, CPP, MP, PBOOK,
    drc, extract, lvs, spice, xsection, drawXsec, drawLayout, hit, layerInfo, place, bbox, gates, toProcessBook,
    util: { ov, touch, inter, grow, dist, subtract, covered, mergeIv, complement } };
})();
