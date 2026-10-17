/* ==========================================================================
   DisplayBook 공통 스크립트 — 전역 객체 DB
   - 레이아웃(상단바, 목차, 이전/다음, 테마) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, range, seg, 색/난수/포맷, three.js 씬
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  const CHAPTERS = [
    { slug: "vision",      num: "01", title: "빛과 인간의 시각",           desc: "휘도·조도·광속 같은 측광량, 눈의 해상도와 대비 감도. 디스플레이는 결국 눈을 위한 장치다.", tags: ["기초", "sim"] },
    { slug: "color",       num: "02", title: "색채 과학과 색역",           desc: "등색 함수, CIE xy 색도도, 원색과 색역(sRGB·DCI-P3·BT.2020), 색온도와 ΔE.", tags: ["색", "sim"] },
    { slug: "pixel",       num: "03", title: "화소와 해상도",             desc: "서브픽셀 배열(RGB 스트라이프·펜타일), PPI와 시청 거리, 서브픽셀 렌더링, 모아레.", tags: ["구조", "3d", "sim"] },
    { slug: "tft",         num: "04", title: "TFT 백플레인",              desc: "a-Si·LTPS·산화물·LTPO 트랜지스터. 이동도, 문턱전압, 누설 전류와 I–V 특성.", tags: ["반도체", "3d", "sim"] },
    { slug: "addressing",  num: "05", title: "매트릭스 구동과 드라이버 IC", desc: "패시브/액티브 매트릭스, 게이트·소스 드라이버, RC 지연, 충전 시간과 GOA.", tags: ["회로", "sim"] },
    { slug: "lcd",         num: "06", title: "액정 디스플레이(LCD)",       desc: "액정의 복굴절과 편광, TN·IPS·VA 모드, 전압–투과율 곡선과 시야각.", tags: ["소자", "3d", "sim"] },
    { slug: "backlight",   num: "07", title: "백라이트·미니LED·양자점",     desc: "도광판과 광학 필름, 로컬 디밍과 헤일로, 양자점 색 변환으로 넓히는 색역.", tags: ["광원", "sim"] },
    { slug: "oled",        num: "08", title: "OLED 소자 물리",            desc: "유기 반도체의 HOMO/LUMO, 적층 구조, 형광·인광·TADF, 외부 양자 효율과 마이크로캐비티.", tags: ["소자", "3d", "sim"] },
    { slug: "oledcircuit", num: "09", title: "OLED 픽셀 회로와 보상",       desc: "전류 구동 2T1C, 문턱전압 보상 회로, IR 드롭, 번인과 열화 보상.", tags: ["회로", "sim"] },
    { slug: "microled",    num: "10", title: "마이크로LED와 차세대 발광",    desc: "칩 크기에 따른 효율 저하, 매스 트랜스퍼, QD-OLED, 전계발광 양자점.", tags: ["트렌드", "3d", "sim"] },
    { slug: "motion",      num: "11", title: "시간 응답과 모션 화질",       desc: "주사율, 응답 시간, 홀드형 모션 블러, 오버드라이브, 흑삽입, VRR, PWM 플리커.", tags: ["동작", "sim"] },
    { slug: "hdr",         num: "12", title: "감마·HDR·톤 매핑",           desc: "감마와 EOTF, PQ·HLG, 명암비, 피크 휘도와 ABL, 톤 매핑과 비트 심도·밴딩.", tags: ["영상", "sim"] },
    { slug: "optics",      num: "13", title: "디스플레이 광학",            desc: "편광판과 원편광 반사 억제, 반사 방지, 주변광 명암비, 시야각과 색 변화.", tags: ["광학", "sim"] },
    { slug: "interface",   num: "14", title: "타이밍 컨트롤러와 인터페이스", desc: "픽셀 클록과 블랭킹, MIPI DSI·eDP 대역폭, DSC 압축, 디더링·FRC, 디머라.", tags: ["시스템", "sim"] },
    { slug: "fabrication", num: "15", title: "제조 공정과 수율",           desc: "포토 공정과 마스크 수, FMM 증착, 잉크젯 프린팅, 박막 봉지, 세대별 유리 원장과 수율.", tags: ["공정", "3d", "sim"] },
    { slug: "flexible",    num: "16", title: "플렉서블·폴더블·터치",        desc: "굽힘 변형률과 중립면, 폴더블 힌지, 정전용량 터치, 언더 디스플레이 카메라.", tags: ["응용", "3d", "sim"] },
    { slug: "xr",          num: "17", title: "AR/VR 근안 디스플레이",       desc: "마이크로OLED, 팬케이크 렌즈, 도파관, PPD와 시야각, 수렴–조절 불일치.", tags: ["응용", "3d", "sim"] },
    { slug: "measurement", num: "18", title: "측정과 화질 평가",           desc: "휘도·색도 측정, 균일도와 무라, 감마 측정, 캘리브레이션과 화질 지표.", tags: ["측정", "sim"] },
    { slug: "design",      num: "19", title: "디스플레이 설계 플레이그라운드", desc: "크기·해상도·주사율·기술을 정하고 소비전력, 대역폭, 화질을 한눈에 비교해 보자.", tags: ["종합", "sim"] },
    { slug: "glossary",    num: "20", title: "용어집 & 종합 퀴즈",          desc: "핵심 용어 300여 개를 검색하고, 실력을 점검하자.", tags: ["정리"] },
  ];

  const DB = (window.DB = {});
  DB.CHAPTERS = CHAPTERS;

  /* ------------------------------------------------------------ math utils */
  DB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  DB.lerp = (a, b, t) => a + (b - a) * t;
  DB.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  DB.randn = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  DB.poisson = function (lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * DB.randn()));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  /** 숫자 포맷: 유효 자리 */
  DB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) return x.toExponential(digits - 1).replace("e+", "e");
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** SI 접두사 포맷: DB.si(2.3e-9,'m') → "2.3 nm" */
  DB.si = function (x, unit = "", digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0 " + unit;
    const pre = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]];
    const a = Math.abs(x);
    for (const [v, p] of pre) if (a >= v * 0.9995) return Number((x / v).toPrecision(digits)) + " " + p + unit;
    return x.toExponential(digits - 1) + " " + unit;
  };

  /* ------------------------------------------------------------ physics consts */
  DB.C = { h: 6.62607015e-34, c: 2.99792458e8, q: 1.602176634e-19, k: 1.380649e-23 };

  /** 파장(nm) → [r,g,b] 0..255 (가시광 380~780, 밖은 어두운 색) */
  DB.wl2rgbArr = function (nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490 && nm >= 440) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510 && nm >= 490) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580 && nm >= 510) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645 && nm >= 580) { r = 1; g = -(nm - 645) / 65; }
    else if (nm <= 780 && nm >= 645) { r = 1; }
    let f = 0;
    if (nm >= 380 && nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
    else if (nm >= 420 && nm <= 700) f = 1;
    else if (nm > 700 && nm <= 780) f = 0.3 + (0.7 * (780 - nm)) / 80;
    const gm = 0.8;
    const c = (v) => Math.round(255 * Math.pow(v * f, gm));
    if (nm < 380) return [110, 60, 160];   // UV: 보라 계열 표시용
    if (nm > 780) return [120, 30, 30];    // IR: 어두운 적색 표시용
    return [c(r), c(g), c(b)];
  };
  DB.wl2rgb = function (nm, alpha = 1) {
    const [r, g, b] = DB.wl2rgbArr(nm);
    return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
  };

  /* ------------------------------------------------------------ color science */
  /** CIE 1931 2° 스펙트럼 궤적 색도 (5 nm, [nm, x, y]) */
  const LOCUS_TAB = [[380,.1741,.0050],[385,.1740,.0050],[390,.1738,.0049],[395,.1736,.0049],[400,.1733,.0048],[405,.1730,.0048],[410,.1726,.0048],[415,.1721,.0048],[420,.1714,.0051],[425,.1703,.0058],[430,.1689,.0069],[435,.1669,.0086],[440,.1644,.0109],[445,.1611,.0138],[450,.1566,.0177],[455,.1510,.0227],[460,.1440,.0297],[465,.1355,.0399],[470,.1241,.0578],[475,.1096,.0868],[480,.0913,.1327],[485,.0687,.2007],[490,.0454,.2950],[495,.0235,.4127],[500,.0082,.5384],[505,.0039,.6548],[510,.0139,.7502],[515,.0389,.8120],[520,.0743,.8338],[525,.1142,.8262],[530,.1547,.8059],[535,.1929,.7816],[540,.2296,.7543],[545,.2658,.7243],[550,.3016,.6923],[555,.3373,.6589],[560,.3731,.6245],[565,.4087,.5896],[570,.4441,.5547],[575,.4788,.5202],[580,.5125,.4866],[585,.5448,.4544],[590,.5752,.4242],[595,.6029,.3965],[600,.6270,.3725],[605,.6482,.3514],[610,.6658,.3340],[615,.6801,.3197],[620,.6915,.3083],[625,.7006,.2993],[630,.7079,.2920],[635,.7140,.2859],[640,.7190,.2809],[645,.7230,.2770],[650,.7260,.2740],[655,.7283,.2717],[660,.7300,.2700],[665,.7311,.2689],[670,.7320,.2680],[680,.7334,.2666],[690,.7344,.2656],[700,.7347,.2653]];
  const locXY = (nm) => {
    const T = LOCUS_TAB;
    if (nm <= T[0][0]) return [T[0][1], T[0][2]];
    if (nm >= T[T.length - 1][0]) return [T[T.length - 1][1], T[T.length - 1][2]];
    let i = 0; while (T[i + 1][0] < nm) i++;
    const a = T[i], b = T[i + 1], t = (nm - a[0]) / (b[0] - a[0]);
    return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  /**
   * CIE 1931 2° 등색 함수. nm → [x̄,ȳ,z̄].
   * 크기는 다중 로브 가우시안 근사(Wyman·Sloan·Shirley 2013)의 ȳ(장파장)·z̄(단파장)를 쓰고,
   * 색도(비율)는 CIE 표 값으로 맞춘다 — 궤적 모양이 정확하고 적분값 오차는 수 % 이내.
   */
  DB.cmf = function (nm) {
    const g = (l, mu, s1, s2) => { const t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
    const [x, y] = locXY(nm), z = 1 - x - y;
    const yb = 0.821 * g(nm, 568.8, 46.9, 40.5) + 0.286 * g(nm, 530.9, 16.3, 31.1);
    const zb = 1.217 * g(nm, 437.0, 11.8, 36.0) + 0.681 * g(nm, 459.0, 26.0, 13.8);
    const w = DB.clamp((nm - 460) / 20, 0, 1); // 460–480 nm 사이에서 기준을 z̄ → ȳ로 전환
    const fromY = [(x / y) * yb, yb, (z / y) * yb];
    if (w >= 1) return fromY;
    const fromZ = [(x / z) * zb, (y / z) * zb, zb];
    return [0, 1, 2].map((k) => fromZ[k] * (1 - w) + fromY[k] * w);
  };
  /** 명소시 비시감도 V(λ) ≈ ȳ(λ), 최대 683 lm/W @555 nm */
  DB.V = (nm) => DB.cmf(nm)[1];
  /** 스펙트럼 함수 S(nm) → {X,Y,Z,x,y}. 380~780 nm, step nm 적분 */
  DB.spectrum2xyz = function (S, step = 2) {
    let X = 0, Y = 0, Z = 0;
    for (let l = 380; l <= 780; l += step) { const p = S(l); if (!p) continue; const c = DB.cmf(l); X += p * c[0] * step; Y += p * c[1] * step; Z += p * c[2] * step; }
    const t = X + Y + Z || 1;
    return { X, Y, Z, x: X / t, y: Y / t };
  };
  /** 단색광 스펙트럼 궤적: [[nm,x,y], ...] */
  DB.locus = function (a = 380, b = 700, step = 1) {
    const out = [];
    for (let l = a; l <= b; l += step) { const [X, Y, Z] = DB.cmf(l); const t = X + Y + Z; out.push([l, X / t, Y / t]); }
    return out;
  };
  DB.xyY2XYZ = (x, y, Y = 1) => (y <= 0 ? [0, 0, 0] : [(x * Y) / y, Y, ((1 - x - y) * Y) / y]);
  DB.XYZ2xy = ([X, Y, Z]) => { const t = X + Y + Z || 1; return [X / t, Y / t]; };
  /** xy → CIE 1976 u'v' */
  DB.xy2uv = (x, y) => { const d = -2 * x + 12 * y + 3; return [(4 * x) / d, (9 * y) / d]; };
  DB.uv2xy = (u, v) => { const d = 6 * u - 16 * v + 12; return [(9 * u) / d, (4 * v) / d]; };
  /** XYZ → 선형 sRGB (D65) */
  DB.xyz2rgbLin = ([X, Y, Z]) => [
    3.2406 * X - 1.5372 * Y - 0.4986 * Z,
    -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
    0.0557 * X - 0.204 * Y + 1.057 * Z,
  ];
  DB.rgbLin2xyz = ([r, g, b]) => [
    0.4124 * r + 0.3576 * g + 0.1805 * b,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    0.0193 * r + 0.1192 * g + 0.9505 * b,
  ];
  /** sRGB 전달 함수: 선형(0..1) → 부호화 값(0..1), 그리고 역함수 */
  DB.srgbEnc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055);
  DB.srgbDec = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  /** 선형 RGB 배열 → CSS 색 (범위 밖은 잘라냄) */
  DB.rgbCss = ([r, g, b], alpha = 1) => {
    const c = (v) => Math.round(255 * DB.clamp(DB.srgbEnc(DB.clamp(v, 0, 1)), 0, 1));
    return alpha === 1 ? `rgb(${c(r)},${c(g)},${c(b)})` : `rgba(${c(r)},${c(g)},${c(b)},${alpha})`;
  };
  /** 색도 좌표 xy를 화면에 보이는 대표색(최대 밝기로 정규화)으로 */
  DB.xy2css = function (x, y, alpha = 1) {
    let rgb = DB.xyz2rgbLin(DB.xyY2XYZ(x, y, 1));
    const mn = Math.min(...rgb); if (mn < 0) rgb = rgb.map((v) => v - mn);
    const mx = Math.max(...rgb) || 1;
    return DB.rgbCss(rgb.map((v) => v / mx), alpha);
  };
  /** XYZ → CIELAB (기준 백색 white=[Xn,Yn,Zn], 기본 D65) */
  DB.xyz2lab = function ([X, Y, Z], white = [0.95047, 1, 1.08883]) {
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
    const fx = f(X / white[0]), fy = f(Y / white[1]), fz = f(Z / white[2]);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  DB.deltaE76 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  /** 흑체(플랑크) 궤적 xy. T: 1667~25000 K (Kim 등 3차 근사) */
  DB.planckXY = function (T) {
    const t = 1e3 / T, t2 = t * t, t3 = t2 * t;
    const x = T <= 4000 ? -0.2661239 * t3 - 0.234358 * t2 + 0.8776956 * t + 0.17991 : -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t + 0.24039;
    const x2 = x * x, x3 = x2 * x;
    const y = T <= 2222 ? -1.1063814 * x3 - 1.3481102 * x2 + 2.18555832 * x - 0.20219683
      : T <= 4000 ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
      : 3.081758 * x3 - 5.8733867 * x2 + 3.75112997 * x - 0.37001483;
    return [x, y];
  };
  /** 상관 색온도 CCT (McCamy 근사) */
  DB.cct = (x, y) => { const n = (x - 0.332) / (0.1858 - y); return 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33; };
  /** 플랑크 복사 분광 방사휘도(상대값). nm, K */
  DB.planck = (nm, T) => { const l = nm * 1e-9; return (2 * DB.C.h * DB.C.c ** 2) / (l ** 5 * (Math.exp((DB.C.h * DB.C.c) / (l * DB.C.k * T)) - 1)); };
  /** 표준 색역 원색 (CIE 1931 xy) */
  DB.GAMUTS = {
    srgb:   { name: "sRGB / BT.709", R: [0.64, 0.33], G: [0.30, 0.60], B: [0.15, 0.06], W: [0.3127, 0.3290] },
    p3:     { name: "DCI-P3",        R: [0.680, 0.320], G: [0.265, 0.690], B: [0.150, 0.060], W: [0.3127, 0.3290] },
    bt2020: { name: "BT.2020",       R: [0.708, 0.292], G: [0.170, 0.797], B: [0.131, 0.046], W: [0.3127, 0.3290] },
    adobe:  { name: "Adobe RGB",     R: [0.64, 0.33], G: [0.21, 0.71], B: [0.15, 0.06], W: [0.3127, 0.3290] },
    ntsc:   { name: "NTSC 1953",     R: [0.67, 0.33], G: [0.21, 0.71], B: [0.14, 0.08], W: [0.3101, 0.3162] },
  };
  DB.D65 = [0.3127, 0.329];
  /** 다각형 면적(신발끈 공식). pts=[[x,y],...] */
  DB.polyArea = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
  /** 볼록 다각형 클리핑(Sutherland–Hodgman): subject ∩ clip(볼록) */
  DB.clipPoly = function (subject, clip) {
    let out = subject.slice();
    const area = DB.polyArea(clip), ccw = (() => { let a = 0; for (let i = 0; i < clip.length; i++) { const [x1, y1] = clip[i], [x2, y2] = clip[(i + 1) % clip.length]; a += x1 * y2 - x2 * y1; } return a > 0; })();
    if (!area) return [];
    for (let i = 0; i < clip.length && out.length; i++) {
      const A = clip[i], B = clip[(i + 1) % clip.length];
      const inside = (p) => { const c = (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]); return ccw ? c >= 0 : c <= 0; };
      const inter = (p, q) => { const a1 = B[1] - A[1], b1 = A[0] - B[0], c1 = a1 * A[0] + b1 * A[1]; const a2 = q[1] - p[1], b2 = p[0] - q[0], c2 = a2 * p[0] + b2 * p[1]; const d = a1 * b2 - a2 * b1; return [(b2 * c1 - b1 * c2) / d, (a1 * c2 - a2 * c1) / d]; };
      const inp = out; out = [];
      for (let j = 0; j < inp.length; j++) {
        const P = inp[j], Q = inp[(j + 1) % inp.length];
        if (inside(Q)) { if (!inside(P)) out.push(inter(P, Q)); out.push(Q); }
        else if (inside(P)) out.push(inter(P, Q));
      }
    }
    return out;
  };
  /** 색역 삼각형 g가 기준 색역 ref를 덮는 비율(커버리지)과 면적비. 좌표계 'xy' 또는 'uv' */
  DB.gamutStats = function (g, ref, space = "xy") {
    const tri = (G) => [G.R, G.G, G.B].map((p) => (space === "uv" ? DB.xy2uv(p[0], p[1]) : p));
    const a = tri(g), b = tri(ref);
    return { coverage: DB.polyArea(DB.clipPoly(a, b)) / DB.polyArea(b), ratio: DB.polyArea(a) / DB.polyArea(b) };
  };
  /** PQ (SMPTE ST 2084): 부호값 E'(0..1) → 휘도 nits, 그리고 역함수 */
  DB.pqEOTF = function (E) {
    const m1 = 2610 / 16384, m2 = (2523 / 4096) * 128, c1 = 3424 / 4096, c2 = (2413 / 4096) * 32, c3 = (2392 / 4096) * 32;
    const p = Math.pow(Math.max(0, E), 1 / m2);
    return 10000 * Math.pow(Math.max(p - c1, 0) / (c2 - c3 * p), 1 / m1);
  };
  DB.pqInv = function (L) {
    const m1 = 2610 / 16384, m2 = (2523 / 4096) * 128, c1 = 3424 / 4096, c2 = (2413 / 4096) * 32, c3 = (2392 / 4096) * 32;
    const y = Math.pow(Math.max(0, L) / 10000, m1);
    return Math.pow((c1 + c2 * y) / (1 + c3 * y), m2);
  };

  /**
   * CIE 색도도 그리기. box={x,y,w,h} 또는 null(캔버스 전체).
   * opts: { space:'xy'|'uv', range:{x:[0,0.8], y:[0,0.9]}, fill:true, ticks:true(파장 눈금),
   *         gamuts:[{prims:{R,G,B} 또는 DB.GAMUTS.p3, color, label, dash, fill}], points:[{x,y,color,r,label}],
   *         planck:false(흑체 궤적), axes:true }
   * 입력 좌표는 항상 CIE 1931 xy(space='uv'면 내부에서 u'v'로 변환). 반환 {X(x,y)→[px,py], P(x,y), box}
   */
  const cieCache = {};
  DB.cie = function (ctx, box, opts = {}) {
    const P = DB.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    const uv = opts.space === "uv";
    const rx = (opts.range && opts.range.x) || (uv ? [0, 0.65] : [0, 0.8]);
    const ry = (opts.range && opts.range.y) || (uv ? [0, 0.62] : [0, 0.9]);
    if (!box) {
      const avW = W - 60, avH = H - 50, k = Math.min(avW / (rx[1] - rx[0]), avH / (ry[1] - ry[0]));
      const bw = k * (rx[1] - rx[0]), bh = k * (ry[1] - ry[0]);
      box = { x: 46 + (avW - bw) / 2, y: 12 + (avH - bh) / 2, w: bw, h: bh };
    }
    const tr = (x, y) => (uv ? DB.xy2uv(x, y) : [x, y]);
    const PX = (a, b) => [box.x + ((a - rx[0]) / (rx[1] - rx[0])) * box.w, box.y + box.h - ((b - ry[0]) / (ry[1] - ry[0])) * box.h];
    const X = (x, y) => { const [a, b] = tr(x, y); return PX(a, b); };
    const loc = DB.locus(380, 700, 1).map(([l, x, y]) => [l, ...tr(x, y)]);
    ctx.save();
    ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    // axes / grid
    if (opts.axes !== false) {
      ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim; ctx.lineWidth = 1;
      const step = 0.1;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let v = Math.ceil(rx[0] / step) * step; v <= rx[1] + 1e-9; v += step) { const [px] = PX(v, ry[0]); ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.fillText(v.toFixed(1), px, box.y + box.h + 5); }
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let v = Math.ceil(ry[0] / step) * step; v <= ry[1] + 1e-9; v += step) { const [, py] = PX(rx[0], v); ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); ctx.fillText(v.toFixed(1), box.x - 5, py); }
      ctx.strokeStyle = P.axis; ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = P.dim; ctx.font = "12px " + getComputedStyle(document.body).getPropertyValue("--font");
      ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(uv ? "u′" : "x", box.x + box.w / 2, box.y + box.h + 34);
      ctx.save(); ctx.translate(box.x - 34, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(uv ? "v′" : "y", 0, 0); ctx.restore();
      ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    }
    // filled horseshoe (cached offscreen)
    if (opts.fill !== false) {
      const key = [Math.round(box.w), Math.round(box.h), uv, rx, ry, DB.isDark(), dpr].join("|");
      let off = cieCache[key];
      if (!off) {
        const w = Math.max(1, Math.round(box.w * dpr)), h = Math.max(1, Math.round(box.h * dpr));
        off = document.createElement("canvas"); off.width = w; off.height = h;
        const oc = off.getContext("2d"), img = oc.createImageData(w, h);
        const poly = loc.map(([, a, b]) => [((a - rx[0]) / (rx[1] - rx[0])) * w, h - ((b - ry[0]) / (ry[1] - ry[0])) * h]);
        const fade = DB.isDark() ? 0.85 : 1;
        for (let py = 0; py < h; py++) {
          const yc = py + 0.5, xs = [];
          for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1)); }
          xs.sort((a, b) => a - b);
          const b = ry[0] + ((h - yc) / h) * (ry[1] - ry[0]);
          for (let k = 0; k + 1 < xs.length; k += 2) {
            for (let px = Math.max(0, Math.ceil(xs[k] - 0.5)); px < Math.min(w, Math.floor(xs[k + 1] + 0.5)); px++) {
              const a = rx[0] + ((px + 0.5) / w) * (rx[1] - rx[0]);
              const [x, y] = uv ? DB.uv2xy(a, b) : [a, b];
              let rgb = DB.xyz2rgbLin(DB.xyY2XYZ(x, y, 1));
              const mn = Math.min(...rgb); if (mn < 0) rgb = rgb.map((v) => v - mn);
              const mx = Math.max(...rgb) || 1;
              const o = (py * w + px) * 4;
              for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(255 * fade * DB.srgbEnc(rgb[c] / mx));
              img.data[o + 3] = 255;
            }
          }
        }
        oc.putImageData(img, 0, 0);
        cieCache[key] = off;
      }
      ctx.globalAlpha = opts.fillAlpha != null ? opts.fillAlpha : 0.9;
      ctx.drawImage(off, box.x, box.y, box.w, box.h);
      ctx.globalAlpha = 1;
    }
    // locus outline + wavelength ticks
    ctx.strokeStyle = P.axis; ctx.lineWidth = 1.2;
    ctx.beginPath(); loc.forEach(([, a, b], i) => { const [px, py] = PX(a, b); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.stroke();
    if (opts.ticks !== false) {
      ctx.fillStyle = P.dim; ctx.textBaseline = "middle";
      [460, 480, 490, 500, 510, 520, 540, 560, 580, 600, 620].forEach((l) => {
        const [x, y] = (() => { const [X1, Y1, Z1] = DB.cmf(l); const t = X1 + Y1 + Z1; return [X1 / t, Y1 / t]; })();
        const [px, py] = X(x, y), [qx, qy] = X(0.3127, 0.329);
        const d = Math.hypot(px - qx, py - qy) || 1, ux = (px - qx) / d, uy = (py - qy) / d;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + ux * 5, py + uy * 5); ctx.stroke();
        ctx.textAlign = ux < -0.2 ? "right" : ux > 0.2 ? "left" : "center";
        ctx.fillText(String(l), px + ux * 9, py + uy * 9);
      });
    }
    if (opts.planck) {
      ctx.strokeStyle = P.text; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath();
      for (let T = 1700; T <= 20000; T *= 1.05) { const [x, y] = DB.planckXY(T); const [px, py] = X(x, y); T === 1700 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    (opts.gamuts || []).forEach((g, i) => {
      const G = g.prims || g; const pts = [G.R, G.G, G.B].map((p) => X(p[0], p[1]));
      ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      if (g.fill) { ctx.fillStyle = g.fill; ctx.fill(); }
      ctx.strokeStyle = g.color || P.series[i % P.series.length]; ctx.lineWidth = g.width || 2; ctx.setLineDash(g.dash || []); ctx.stroke(); ctx.setLineDash([]);
      if (g.label) { ctx.fillStyle = g.color || P.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(g.label, pts[0][0] + 6, pts[0][1] - 4 - i * 13); }
    });
    (opts.points || []).forEach((p) => {
      const [px, py] = X(p.x, p.y);
      ctx.fillStyle = p.color || P.text; ctx.strokeStyle = P.bg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, p.r || 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (p.label) { ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(p.label, px + 6, py - 4); }
    });
    ctx.restore();
    return { X, P: PX, box, space: uv ? "uv" : "xy" };
  };

  /** Two-level PWM with requested mean brightness and Michelson modulation (0..1). */
  DB.pwmWave = function (brightness, modulation, mode = "pwm") {
    const b = DB.clamp(brightness, 0, 1), m = DB.clamp(modulation, 0, 1);
    if (!b || b === 1 || m === 0 || mode === "dc" || (mode === "hyb" && b >= 0.3)) return { hi: b, lo: b, D: 1, pwm: false };
    const A = mode === "hyb" ? 0.3 : 1, D = b / A;
    const ratio = (1 - m) / (1 + m), hi = b / (D + ratio * (1 - D));
    return { hi, lo: hi * ratio, D, pwm: true };
  };
  /** IEEE 1789-2015 RP1/RP2 comparison, applied as a lighting reference. */
  DB.flickerLevel = function (frequency, modulationPct) {
    if (modulationPct === 0) return "변조 없음";
    const low = frequency < 90 ? 0.025 * frequency : frequency <= 1250 ? 0.08 * frequency : Infinity;
    const noEffect = frequency < 90 ? 0.01 * frequency : frequency <= 3000 ? 0.0333 * frequency : Infinity;
    return modulationPct < noEffect ? "무영향 권고 구간" : modulationPct < low ? "저위험 권고 구간" : "권고 초과";
  };

  /* ------------------------------------------------------------ theme */
  const themeCbs = [];
  DB.onTheme = (cb) => themeCbs.push(cb);
  DB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  /** CSS 변수 값 읽기: DB.color('accent') */
  DB.color = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  };
  /** 자주 쓰는 색 묶음 (테마 변경 시 다시 호출할 것) */
  DB.palette = function () {
    const c = DB.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"),
      grid: c("grid"), axis: c("axis"), border: c("border"), surface: c("surface"),
      accent: c("accent"), accent2: c("accent-2"), ok: c("ok"), warn: c("warn"), bad: c("bad"),
      red: c("red"), green: c("green"), blue: c("blue"),
      // 데이터 시리즈용 기본 순서
      series: [c("accent"), c("accent-2"), c("warn"), c("ok"), c("bad"), c("text-dim")],
    };
  };
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    themeCbs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }
  try { const saved = localStorage.getItem("semi-theme"); if (saved) document.documentElement.setAttribute("data-theme", saved); } catch (e) {}
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (!document.documentElement.getAttribute("data-theme")) applyTheme(null);
    });
  }

  /* ------------------------------------------------------------ canvas helper */
  /**
   * HiDPI 캔버스. 폭은 부모 폭을 따르고 높이는 aspect(높이/폭) 또는 height(px)로 결정.
   * draw(ctx, w, h)는 리사이즈·테마 변경 시 자동 호출된다. 애니메이션이면 직접 redraw() 호출.
   *   const cv = DB.canvas(el, (ctx,w,h)=>{...}, {aspect:0.5, maxHeight: 420});
   *   cv.redraw(); cv.ctx; cv.w; cv.h
   */
  DB.canvas = function (canvas, draw, opts = {}) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const ctx = canvas.getContext("2d");
    const st = { ctx, w: 0, h: 0, canvas, dpr: 1 };
    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(200, Math.floor(opts.width || parent.clientWidth || 600));
      let h = opts.height || Math.round(w * (opts.aspect || 0.5));
      if (opts.minHeight) h = Math.max(h, opts.minHeight);
      if (opts.maxHeight) h = Math.min(h, opts.maxHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w; st.h = h; st.dpr = dpr;
      st.redraw();
    }
    st.redraw = function () {
      if (!st.w) return;
      ctx.save();
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (!opts.noClear) {
        ctx.clearRect(0, 0, st.w, st.h);
        ctx.fillStyle = DB.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    DB.onTheme(() => st.redraw());
    resize();
    return st;
  };

  /**
   * 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초)
   *   const loop = DB.loop(el, (dt,t)=>{...}); loop.stop(); loop.start();
   */
  DB.loop = function (el, fn) {
    let raf = 0, last = 0, t = 0, visible = true, running = true;
    function frame(ts) {
      raf = 0;
      if (!running || !visible) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts; t += dt;
      fn(dt, t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver && el) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(el);
    }
    kick();
    return {
      start() { running = true; kick(); },
      stop() { running = false; },
      get running() { return running; },
      toggle() { running ? (running = false) : ((running = true), kick()); return running; },
    };
  };

  /* ------------------------------------------------------------ chart helper */
  /**
   * 간단한 선 그래프. box = {x,y,w,h}(생략 시 캔버스 전체에 여백 자동)
   * opts: { x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xTicks, yTicks,
   *         xFmt, yFmt, series:[{data:[[x,y],...], color, width, dash, fill, label}],
   *         vlines:[{x,color,label,dash}], hlines:[{y,color,label,dash}], points:[{x,y,color,r,label}],
   *         bands:[{x0,x1,color}] }
   * 반환: { X(v)->px, Y(v)->px, box }
   */
  DB.chart = function (ctx, box, opts) {
    const P = DB.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    if (!box) box = { x: 58, y: 16, w: W - 58 - 18, h: H - 16 - 46 };
    const [x0, x1] = opts.x, [y0, y1] = opts.y;
    const lx = (v) => (opts.logX ? Math.log10(v) : v);
    const ly = (v) => (opts.logY ? Math.log10(v) : v);
    const X = (v) => box.x + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * box.w;
    const Y = (v) => box.y + box.h - ((ly(v) - ly(y0)) / (ly(y1) - ly(y0))) * box.h;
    const ticks = (a, b, log, n) => {
      if (log) { const out = []; for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.log10(b) + 1e-9; e++) out.push(Math.pow(10, e)); return out; }
      const span = b - a, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= (n || 5) + 0.5) || raw;
      const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
      return out;
    };
    const defFmt = (v) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0).replace("e+", "e") : String(Number(v.toPrecision(4))));
    const xFmt = opts.xFmt || defFmt, yFmt = opts.yFmt || defFmt;
    ctx.save();
    ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    ctx.lineWidth = 1;
    // bands
    (opts.bands || []).forEach((b) => { ctx.fillStyle = b.color; ctx.fillRect(X(b.x0), box.y, X(b.x1) - X(b.x0), box.h); });
    // grid + ticks
    const xt = opts.xTicks || ticks(x0, x1, opts.logX, 6);
    const yt = opts.yTicks || ticks(y0, y1, opts.logY, 5);
    ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => { const px = X(v); if (px < box.x - 1 || px > box.x + box.w + 1) return; ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.fillText(xFmt(v), px, box.y + box.h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach((v) => { const py = Y(v); if (py < box.y - 1 || py > box.y + box.h + 1) return; ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); ctx.fillText(yFmt(v), box.x - 6, py); });
    ctx.strokeStyle = P.axis;
    ctx.beginPath(); ctx.moveTo(box.x, box.y); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    // labels
    ctx.fillStyle = P.dim; ctx.font = "12px " + getComputedStyle(document.body).getPropertyValue("--font");
    if (opts.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(opts.xLabel, box.x + box.w / 2, box.y + box.h + 40); }
    if (opts.yLabel) { ctx.save(); ctx.translate(14, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
    // clip plot area
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 2, box.w + 2, box.h + 4); ctx.clip();
    (opts.series || []).forEach((s, i) => {
      if (!s.data || !s.data.length) return;
      ctx.strokeStyle = s.color || P.series[i % P.series.length];
      ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let started = false;
      s.data.forEach(([x, y]) => { if (!isFinite(y) || (opts.logY && y <= 0) || (opts.logX && x <= 0)) { started = false; return; } const px = X(x), py = Y(y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; });
      ctx.stroke();
      if (s.fill) {
        ctx.lineTo(X(s.data[s.data.length - 1][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.lineTo(X(s.data[0][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.setLineDash([]);
    });
    (opts.vlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(X(l.x), box.y); ctx.lineTo(X(l.x), box.y + box.h); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(l.label, X(l.x) + 4, box.y + 4); } });
    (opts.hlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(box.x, Y(l.y)); ctx.lineTo(box.x + box.w, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(l.label, box.x + box.w - 4, Y(l.y) - 3); } });
    (opts.points || []).forEach((p) => { ctx.fillStyle = p.color || P.accent; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 4, 0, Math.PI * 2); ctx.fill(); if (p.label) { ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(p.label, X(p.x) + 6, Y(p.y) - 4); } });
    ctx.restore();
    ctx.restore();
    return { X, Y, box };
  };

  /* ------------------------------------------------------------ controls */
  /**
   * range 입력 바인딩. output은 id+"-out" 요소 또는 <output for=id>.
   *   const get = DB.range('wl', v => v+' nm', v => redraw());  get() → 현재 값(Number)
   */
  DB.range = function (id, fmt, onInput) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const out = document.getElementById(el.id + "-out") || document.querySelector(`output[for="${el.id}"]`);
    const update = (fire) => {
      const v = Number(el.value);
      const pct = ((v - Number(el.min || 0)) / (Number(el.max || 100) - Number(el.min || 0))) * 100;
      el.style.setProperty("--fill", pct + "%");
      if (out) out.textContent = fmt ? fmt(v) : String(v);
      if (fire && onInput) onInput(v);
    };
    el.addEventListener("input", () => update(true));
    update(false);
    const get = () => Number(el.value);
    get.set = (v) => { el.value = v; update(true); };
    get.el = el;
    return get;
  };
  /**
   * 세그먼트 버튼: <div class="seg" id="mode"><button data-value="a" class="on">A</button>...</div>
   *   const mode = DB.seg('mode', v => redraw());  mode() → 현재 값
   */
  DB.seg = function (id, onChange) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const btns = [...el.querySelectorAll("button")];
    let cur = (btns.find((b) => b.classList.contains("on")) || btns[0]).dataset.value;
    const set = (v, fire = true) => {
      cur = v;
      btns.forEach((b) => { const on = b.dataset.value === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      if (fire && onChange) onChange(v);
    };
    btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.value)));
    set(cur, false);
    const get = () => cur;
    get.set = set;
    return get;
  };
  /** 통계 표시: DB.stat('snr', '32.1 dB') → id 요소의 textContent 설정(HTML 허용) */
  DB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  /* ------------------------------------------------------------ three.js helper */
  /**
   * three.js 씬 준비 (전역 THREE, THREE.OrbitControls 필요).
   *   const T = DB.three(containerEl, { camera:[x,y,z], target:[x,y,z], fov:40, autoRotate:false });
   *   T.scene, T.camera, T.renderer, T.controls, T.THREE
   *   T.onFrame((dt,t)=>{...});   T.label('텍스트', new THREE.Vector3(...)) → HTML 라벨(자동 투영)
   *   T.material(color, opts)  → MeshStandardMaterial 헬퍼
   * 조명(환경광+방향광 2개), 리사이즈, 화면 밖 일시정지, 테마 대응 포함.
   */
  DB.three = function (container, opts = {}) {
    if (typeof container === "string") container = document.querySelector(container);
    if (!window.THREE) { container.innerHTML = '<p style="padding:20px;color:var(--text-dim)">3D 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.</p>'; return null; }
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.01, 2000);
    camera.position.set(...(opts.camera || [6, 5, 8]));
    const controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, renderer.domElement) : null;
    if (controls) {
      controls.target.set(...(opts.target || [0, 0, 0]));
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.autoRotate = !!opts.autoRotate; controls.autoRotateSpeed = opts.autoRotateSpeed || 0.8;
      controls.enablePan = opts.pan !== false;
      if (opts.minDistance) controls.minDistance = opts.minDistance;
      if (opts.maxDistance) controls.maxDistance = opts.maxDistance;
      controls.update();
    } else camera.lookAt(...(opts.target || [0, 0, 0]));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 0.75));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.85); d1.position.set(5, 10, 7); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xbfd7ff, 0.35); d2.position.set(-6, 4, -5); scene.add(d2);

    const labelLayer = document.createElement("div");
    labelLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    container.appendChild(labelLayer);
    const labels = [];
    const frameCbs = [];
    const T = { THREE, scene, camera, renderer, controls, container, labels };
    T.onFrame = (cb) => frameCbs.push(cb);
    T.label = function (text, pos, cls) {
      const el = document.createElement("div");
      el.className = "overlay-label" + (cls ? " " + cls : "");
      el.innerHTML = text;
      labelLayer.appendChild(el);
      const L = { el, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos), visible: true, obj: null };
      L.setVisible = (v) => { L.visible = v; el.style.display = v ? "" : "none"; };
      L.remove = () => { el.remove(); labels.splice(labels.indexOf(L), 1); };
      labels.push(L);
      return L;
    };
    T.material = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.05 }, o));
    function resize() {
      const w = container.clientWidth, h = container.clientHeight || 400;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container); else window.addEventListener("resize", resize);
    resize();
    const v = new THREE.Vector3();
    T.loop = DB.loop(container, (dt, t) => {
      frameCbs.forEach((cb) => cb(dt, t));
      if (controls) controls.update();
      renderer.render(scene, camera);
      const w = container.clientWidth, h = container.clientHeight;
      labels.forEach((L) => {
        if (!L.visible) return;
        v.copy(L.pos); if (L.obj) L.obj.localToWorld(v);
        v.project(camera);
        const behind = v.z > 1;
        L.el.style.display = behind ? "none" : "";
        L.el.style.left = ((v.x + 1) / 2) * w + "px";
        L.el.style.top = ((1 - v.y) / 2) * h + "px";
      });
    });
    return T;
  };

  /* ------------------------------------------------------------ layout build */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="dbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#dbg)"/><rect x="7" y="8" width="5" height="16" rx="1.5" fill="#ff5a5a"/><rect x="13.5" y="8" width="5" height="16" rx="1.5" fill="#4be37a"/><rect x="20" y="8" width="5" height="16" rx="1.5" fill="#5aa0ff"/></svg>`;
  const ICON_MENU = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
  const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);
    const feedbackUrl = "https://books.euiyun.com/feedback.html?book=displaybook&page=" + encodeURIComponent(location.href);

    // top bar
    const bar = document.createElement("header");
    bar.className = "db-topbar";
    bar.innerHTML = `
      <button class="db-btn icon" id="db-menu" aria-label="챕터 목록">${ICON_MENU}</button>
      <a class="db-logo" href="${href("")}">${LOGO}<span>DisplayBook <small>디스플레이 교과서</small></span></a>
      <span class="spacer"></span>
      <a class="db-btn series-link" href="https://books.euiyun.com/" aria-label="전체 책 보기" title="전체 책 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h6v14H4zM10 5.5h6v14h-6zM17 7l3-1 2 13-3 1z"/></svg><span>전체 책</span></a>
      <button class="db-btn icon" id="db-theme" aria-label="테마 전환"></button>
      <div class="db-progress" id="db-progress"></div>`;
    const feedbackButton = document.createElement("a");
    feedbackButton.className = bar.className.replace("-topbar", "-btn") + " icon feedback-button";
    feedbackButton.href = feedbackUrl;
    feedbackButton.target = "_blank";
    feedbackButton.rel = "noopener";
    feedbackButton.setAttribute("aria-label", "독자 의견 보내기");
    feedbackButton.title = "독자 의견 보내기";
    feedbackButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2z"/><path d="M8 9h8M8 13h5"/></svg>';
    bar.querySelector("[id$='-theme']").before(feedbackButton);
    body.prepend(bar);

    // Search chapter metadata immediately; load section and visual titles on demand.
    const progressBar = bar.querySelector("[id$='-progress']");
    const spacer = bar.querySelector(".spacer");
    const leftNav = document.createElement("div");
    leftNav.className = "book-nav-left";
    leftNav.append(bar.querySelector("[id$='-menu']"), bar.querySelector("a[class$='-logo']"));
    const rightNav = document.createElement("div");
    rightNav.className = "book-nav-right";
    [...bar.children].filter((el) => el !== spacer && el !== progressBar).forEach((el) => rightNav.appendChild(el));
    spacer.remove();
    const search = document.createElement("div");
    search.className = "book-search";
    search.innerHTML = '<svg class="book-search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="이 책의 챕터, 섹션, 시뮬레이터, 그림 검색" placeholder="이 책 검색" autocomplete="off"><div class="book-search-results" aria-live="polite"></div>';
    bar.prepend(leftNav);
    bar.insertBefore(search, progressBar);
    bar.insertBefore(rightNav, progressBar);
    const searchInput = search.querySelector("input");
    const searchResults = search.querySelector(".book-search-results");
    const closeSearch = () => { search.classList.remove("open"); searchResults.replaceChildren(); };
    let detailEntries = [];
    let detailsLoaded = false;
    let detailPromise;
    function loadDetails() {
      if (detailPromise) return detailPromise;
      detailPromise = Promise.all(CHAPTERS.map(async (chapter) => {
        try {
          const response = await fetch(href(chapter.slug));
          if (!response.ok) return [];
          const doc = new DOMParser().parseFromString(await response.text(), "text/html");
          const main = doc.querySelector("main.chapter");
          if (!main) return [];
          const entries = [];
          [...main.querySelectorAll("section > h2")].forEach((heading, i) => {
            entries.push({ type: "섹션", title: heading.textContent.trim(), chapter, hash: heading.parentElement.id || `s${i + 1}` });
          });
          [...main.querySelectorAll(".sim")].filter((sim) => sim.querySelector(".sim-head h3")).forEach((sim, i) => {
            entries.push({ type: "시뮬레이터", title: sim.querySelector(".sim-head h3").textContent.trim(), chapter, hash: sim.id || `search-sim-${i + 1}` });
          });
          [...main.querySelectorAll("figure")].filter((figure) => figure.querySelector("figcaption")).forEach((figure, i) => {
            const caption = figure.querySelector("figcaption").textContent.replace(/\s+/g, " ").trim();
            entries.push({ type: "그림", title: caption.slice(0, 140), chapter, hash: figure.id || `search-fig-${i + 1}` });
          });
          return entries;
        } catch (error) { return []; }
      })).then((parts) => { detailEntries = parts.flat(); detailsLoaded = true; renderSearch(); });
      return detailPromise;
    }
    function renderSearch() {
      const words = searchInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      searchResults.replaceChildren();
      if (!words.length) { closeSearch(); return; }
      const includesWords = (value) => words.every((word) => value.toLocaleLowerCase().includes(word));
      const chapterMatches = CHAPTERS.filter((c) => includesWords([c.num, c.title, c.desc, ...(c.tags || [])].join(" ")))
        .map((c) => ({ type: "챕터", title: c.title, chapter: c, hash: "" }));
      const detailMatches = detailEntries.filter((entry) => includesWords(entry.title));
      const matches = [
        ...chapterMatches.slice(0, 4),
        ...detailMatches.filter((entry) => entry.type === "섹션").slice(0, 5),
        ...detailMatches.filter((entry) => entry.type === "시뮬레이터").slice(0, 4),
        ...detailMatches.filter((entry) => entry.type === "그림").slice(0, 4),
      ];
      matches.forEach((entry) => {
        const link = document.createElement("a");
        link.href = href(entry.chapter.slug) + (entry.hash ? `#${entry.hash}` : "");
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const context = document.createElement("small");
        context.textContent = `${entry.chapter.num} · ${entry.chapter.title} · ${entry.type}`;
        link.append(title, context);
        searchResults.appendChild(link);
      });
      if (chapterMatches.length + detailMatches.length > matches.length) {
        const more = document.createElement("p");
        more.textContent = `상위 ${matches.length}개 표시 · 검색어를 더 구체적으로 입력해 보세요`;
        searchResults.appendChild(more);
      }
      if (detailPromise && !detailsLoaded) {
        const status = document.createElement("p");
        status.textContent = "섹션·시뮬레이터·그림 목록을 불러오는 중…";
        searchResults.appendChild(status);
      } else if (!matches.length) {
        const empty = document.createElement("p");
        empty.textContent = "검색 결과가 없습니다";
        searchResults.appendChild(empty);
      }
      search.classList.add("open");
    }
    searchInput.addEventListener("input", () => { if (searchInput.value.trim()) loadDetails(); renderSearch(); });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); searchInput.blur(); }
      else if (e.key === "ArrowDown") { const first = searchResults.querySelector("a"); if (first) { e.preventDefault(); first.focus(); } }
      else if (e.key === "Enter") { const first = searchResults.querySelector("a"); if (first) { e.preventDefault(); first.click(); } }
    });
    searchResults.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); searchInput.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const links = [...searchResults.querySelectorAll("a")];
        const next = links.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1);
        e.preventDefault();
        (links[next] || searchInput).focus();
      }
    });
    document.addEventListener("pointerdown", (e) => { if (!search.contains(e.target)) closeSearch(); });


    // drawer
    const drawer = document.createElement("nav");
    drawer.className = "db-drawer";
    drawer.innerHTML = `<h4>Chapters</h4><ul class="db-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 로드맵</span></a></li>
      ${CHAPTERS.map((c) => `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`).join("")}
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "db-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#db-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    // theme toggle
    const tbtn = bar.querySelector("#db-theme");
    const setIcon = () => (tbtn.innerHTML = DB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = DB.isDark() ? "light" : "dark";
      try { localStorage.setItem("semi-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    // progress
    const prog = bar.querySelector("#db-progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // chapter page extras
    const main = document.querySelector("main.chapter");
    if (main) {
      // Give search results stable anchors even when the source has no id.
      [...main.querySelectorAll(".sim")].filter((sim) => sim.querySelector(".sim-head h3")).forEach((sim, i) => { if (!sim.id) sim.id = `search-sim-${i + 1}`; });
      [...main.querySelectorAll("figure")].filter((figure) => figure.querySelector("figcaption")).forEach((figure, i) => { if (!figure.id) figure.id = `search-fig-${i + 1}`; });
      if (/^#(?:s\d+|search-(?:sim|fig)-)/.test(location.hash)) {
        requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
      }
      // numbered h2 + TOC
      const layout = document.createElement("div");
      layout.className = "db-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "db-toc";
      const h2s = [...main.querySelectorAll("section > h2")];
      let n = 0;
      toc.innerHTML = "<h4>ON THIS PAGE</h4>" + h2s.map((h, i) => {
        const sec = h.parentElement;
        if (!sec.id) sec.id = "s" + (i + 1);
        const numbered = !sec.classList.contains("keypoints") && !sec.classList.contains("quiz-sec") && !sec.hasAttribute("data-nonum");
        if (numbered && !h.querySelector(".h-num")) { n++; h.insertAdjacentHTML("afterbegin", `<span class="h-num">${String(n).padStart(2, "0")}</span>`); }
        return `<a href="#${sec.id}">${h.textContent.replace(/^\d\d/, "").trim()}</a>`;
      }).join("");
      layout.appendChild(toc);
      const links = [...toc.querySelectorAll("a")];
      if (window.IntersectionObserver && h2s.length) {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); } });
        }, { rootMargin: "-20% 0px -70% 0px" });
        h2s.forEach((h) => io.observe(h.parentElement));
      }

      // pager
      const idx = CHAPTERS.findIndex((c) => c.slug === curSlug);
      const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
      const next = idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
      const pager = document.createElement("nav");
      pager.className = "db-pager";
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 로드맵</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }
    const foot = document.createElement("footer");
    foot.className = "db-foot";
    foot.innerHTML = `DisplayBook — 공학도를 위한 인터랙티브 디스플레이 교과서 · 수치는 교육용 근사 모델입니다.
      <br>© 2026 <a href="https://github.com/geniuskey">geniuskey</a> ·
      콘텐츠 <a href="https://creativecommons.org/licenses/by/4.0/deed.ko" rel="license">CC BY 4.0</a> ·
      코드 <a href="https://github.com/geniuskey/displaybook/blob/main/LICENSE-MIT">MIT</a> ·
      <a href="https://github.com/geniuskey/displaybook/blob/main/LICENSE.md">라이선스 안내</a>
      <br>시리즈 · <a href="/sensor/">SensorBook 이미지 센서 교과서</a>`;
    const feedbackLink = document.createElement("a");
    feedbackLink.href = feedbackUrl;
    feedbackLink.target = "_blank";
    feedbackLink.rel = "noopener";
    feedbackLink.textContent = "독자 의견";
    foot.append(" · ", feedbackLink);
    body.appendChild(foot);

    // quiz
    document.querySelectorAll(".quiz-q").forEach((q) => {
      const opts = [...q.querySelectorAll("button.opt")];
      opts.forEach((b) => b.addEventListener("click", () => {
        opts.forEach((o) => { o.disabled = true; if (o.hasAttribute("data-correct")) o.classList.add("right"); });
        if (!b.hasAttribute("data-correct")) b.classList.add("wrong");
        q.classList.add("done");
        q.dispatchEvent(new CustomEvent("answered", { bubbles: true, detail: { correct: b.hasAttribute("data-correct") } }));
      }));
    });

    // KaTeX
    const renderMath = () => {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }],
          throwOnError: false,
          ignoredClasses: ["no-math"],
        });
      }
    };
    if (window.renderMathInElement) renderMath();
    else window.addEventListener("load", renderMath);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

// Simulator deep links: add a shareable # link to each simulator heading.
(function () {
  function addSimulatorLinks() {
    document.querySelectorAll(".sim[id] > .sim-head").forEach((head) => {
      if (head.querySelector(".sim-link")) return;
      const link = document.createElement("a");
      link.className = "sim-link";
      link.href = "#" + head.parentElement.id;
      link.textContent = "#";
      link.title = "이 시뮬레이터로 가는 링크";
      link.setAttribute("aria-label", "이 시뮬레이터로 가는 링크");
      head.appendChild(link);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSimulatorLinks, { once: true });
  } else {
    addSimulatorLinks();
  }
})();

// Series glossary tooltips (same runtime across independently deployed books).
(function () {
  const base = new URL(".", document.currentScript.src);
  window.BOOK_GLOSSARY_CONFIG = { dataUrl: new URL("glossary-data.js", base).href };
  const script = document.createElement("script");
  script.src = new URL("glossary-tooltips.js", base).href;
  document.head.append(script);
})();
