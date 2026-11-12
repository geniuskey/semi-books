/* Copyright (c) 2026 geniuskey and euiyun books contributors. MIT. 원본은 books 저장소 js/covers.js이며,
   서가에는 tools/sync-shelf-kit.py가 shared/js/covers.js로 복사한다. */
/* 책 표지 일러스트. books.json의 motif 이름 → SVG 문자열 (viewBox 0 0 200 130, 흰 선 위주).
   애니메이션은 css의 .cv-* 클래스가 담당하고, 카드에 마우스를 올렸을 때만 움직인다. */
(function () {
  "use strict";
  const W = "currentColor";
  const svg = (body) => `<svg class="cover-art" viewBox="0 0 200 130" aria-hidden="true" focusable="false">${body}</svg>`;
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  // 결정적 의사난수: 새로고침해도 같은 그림
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const M = {
    // 이하 guitar·piano·drums는 MusicBooks 악기 표지다. 움직임은 .gt-·.pn-·.dr- 클래스가 맡고, 멈춘 첫 프레임도 완성된 그림이다.
    // 기타: 비스듬히 놓인 어쿠스틱 기타. 프렛은 너트에서 줄 길이 × (1 − 2^(−n/12))만큼 떨어진 12평균율 자리에 놓인다.
    // 피크는 8분음표로 쉬지 않고 오르내리며 오른쪽 아래의 ↓ ↓↑ ↑↓↑ 패턴을 치고, 친 박마다 여섯 줄의 진동 폭이 부풀었다 잦아든다.
    guitar() {
      const L = 101.5, nut = 136.3, saddle = nut - L, end = 73.5, f = (v) => +v.toFixed(2);
      const fret = (n) => nut - L * (1 - 2 ** (-n / 12)), half = (x) => 4.7 - (1.1 * (x - end)) / (nut - end);
      const lo = (k) => -6.25 + 2.5 * k, hi = (k) => -3 + 1.2 * k; // 새들·너트 위 k번째 줄(0: 저음 E)
      const edge = (x) => 3.9 + (2.9 * (x - 137.7)) / 24.8; // 헤드 가장자리
      let g = `<path d="M0 0C0-19 9-31 24-31C36-31 40-21 47-21C53-21 57-26 65-26C74-26 80-18 80-9V9C80 18 74 26 65 26C57 26 53 21 47 21C40 21 36 31 24 31C9 31 0 19 0 0Z" fill="url(#gt-top)" stroke="#fff4e0" stroke-width="1.5"/>`;
      // 사운드홀과 로제트, 픽가드, 브리지와 새들
      g += `<circle cx="61" cy="0" r="8.6" fill="#2b170c"/><circle cx="61" cy="0" r="10.6" fill="none" stroke="#fff4e0" stroke-width="1.1"/><circle cx="61" cy="0" r="11.8" fill="none" stroke="#7a3d17" stroke-dasharray=".9 .9"/><circle cx="61" cy="0" r="12.8" fill="none" stroke="#fff4e0" stroke-opacity=".7" stroke-width=".5"/>`;
      g += `<path d="M71.3 8.7C72.5 16 67 23 58 23C51 23 46.5 18 47.5 12C48 9.8 48.6 8.2 49.3 6.75A13.5 13.5 0 0 0 71.3 8.7Z" fill="#4a230e" fill-opacity=".55"/>`;
      g += `<rect x="${f(saddle - 5.2)}" y="-12" width="7" height="24" rx="3" fill="#2b170c"/><path d="M${f(saddle)} -8.2V8.2" stroke="#fff8ea" stroke-width="1.1" stroke-linecap="round"/>`;
      range(6).forEach((k) => { g += `<circle cx="${f(saddle - 2.9)}" cy="${lo(k)}" r=".75" fill="#fff4e0"/>`; });
      // 지판: 반음마다 좁아지는 프렛, 3·5·7·9·12·15 프렛 자리표
      g += `<path d="M${end} ${-half(end)}L${nut} ${f(-half(nut))}V${f(half(nut))}L${end} ${half(end)}Z" fill="#2b170c" stroke="#fff4e0" stroke-width=".6"/>`;
      range(16).forEach((i) => { const x = f(fret(i + 1)), h = f(half(x)); g += `<path d="M${x} ${-h}V${h}" stroke="#e9dcc8" stroke-width=".55"/>`; });
      [3, 5, 7, 9, 12, 15].forEach((n) => {
        const x = f((fret(n - 1) + fret(n)) / 2);
        g += (n === 12 ? [-1.9, 1.9] : [0]).map((y) => `<circle cx="${x}" cy="${y}" r=".9" fill="#f6ecd9"/>`).join("");
      });
      // 너트와 헤드, 줄감개
      g += `<path d="M137.7-3.9 162.5-6.8Q165.5-7.1 165.5-4V4Q165.5 7.1 162.5 6.8L137.7 3.9Z" fill="#2b170c" stroke="#fff4e0" stroke-width=".7"/><rect x="${nut}" y="-4" width="1.5" height="8" rx=".4" fill="#fff8ea"/>`;
      [145, 152, 159].forEach((x) => [-1, 1].forEach((s) => {
        const e = edge(x);
        g += `<path d="M${x} ${f(s * e)}V${f(s * (e + 2.2))}" stroke="#e9dcc8"/><ellipse cx="${x}" cy="${f(s * (e + 3.4))}" rx="1.6" ry="1.9" fill="#f6ecd9"/><circle cx="${x}" cy="${f(s * (e - 1.7))}" r=".85" fill="#e9dcc8"/>`;
      }));
      // 여섯 줄은 새들에서 너트를 지나 줄감개로 간다. 줄마다 새들~너트 사이에 기본 진동의 폭(배 모양)을 겹쳐 둔다.
      const posts = [145, 152, 159, 159, 152, 145];
      range(6).forEach((k) => {
        const px = posts[k], py = f((k < 3 ? -1 : 1) * (edge(px) - 1.7)), m = f((saddle + nut) / 2), y = (lo(k) + hi(k)) / 2;
        g += `<path d="M${f(saddle)} ${lo(k)}L${nut} ${f(hi(k))}L${px} ${py}" fill="none" stroke="#fff6e4" stroke-width="${[1, 0.88, 0.76, 0.64, 0.54, 0.46][k]}" stroke-linejoin="round"/>`;
        g += `<path class="gt-ring" opacity="0" style="animation-delay:${(0.13 + k * 0.012).toFixed(3)}s" d="M${f(saddle)} ${lo(k)}Q${m} ${f(y - 3.2)} ${nut} ${f(hi(k))}Q${m} ${f(y + 3.2)} ${f(saddle)} ${lo(k)}Z" fill="#fff6e4" fill-opacity=".45"/>`;
      });
      g += `<g transform="translate(58 -17.5)"><path class="gt-pick" style="--dy:35px" d="M-3.9-3Q0-5.1 3.9-3 3.9.9 0 4.8-3.9.9-3.9-3Z" fill="#e8590c" stroke="#fff4e0" stroke-width=".6"/></g>`;
      let s = `<defs><radialGradient id="gt-top" cx=".5" cy=".5" r=".58"><stop offset="0" stop-color="#fff2d2"/><stop offset=".55" stop-color="#f4cd86"/><stop offset=".82" stop-color="#d0843b"/><stop offset="1" stop-color="#7a3d17"/></radialGradient></defs>`;
      s += `<g transform="translate(19.8 93.2) rotate(-24) scale(1.08)">${g}</g>`;
      // 왼쪽 위로 떠오르는 음표
      const note = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.9" ry="2.9" transform="rotate(-20 ${x} ${y})"/><path d="M${x + 3.5} ${y - 0.8}V${y - 15}" stroke="${W}" stroke-width="1.3"/>`;
      s += `<g class="cv-bob" fill="${W}" fill-opacity=".92">${note(24, 36)}${note(40, 31)}<path d="M27 20.4 44.1 15.2V18L27 23.2Z"/></g>`;
      s += `<g class="cv-bob" style="animation-delay:.6s" fill="${W}" fill-opacity=".92">${note(66, 22)}<path d="M69.5 7c.6 4 5.6 5 5 10.5c-.7-3.2-2.8-4.5-5-4.9z"/></g>`;
      // 오른쪽 아래 스트로크 패턴: 피크가 지나는 박마다 화살표가 빛난다
      [..."D-DU-UDU"].forEach((c, i) => {
        const x = 122 + i * 10;
        if (c === "-") { s += `<circle cx="${x}" cy="111" r="1.1" fill="${W}" fill-opacity=".45"/>`; return; }
        const [a, b] = c === "D" ? [104, 118] : [118, 104], t = c === "D" ? -4 : 4;
        s += `<path class="gt-beat" style="animation-delay:${(0.13 + i * 0.3).toFixed(2)}s" d="M${x} ${a}V${b}M${x - 3} ${b + t}L${x} ${b}L${x + 3} ${b + t}" fill="none" stroke="${W}" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      });
      return svg(s);
    },
    // 피아노: 두 옥타브(C3–C5) 건반을 앞에서 살짝 내려다본 모습. 왼손은 C–Am–F–G 화음을 금빛으로 한 박씩 짚고,
    // 오른손 선율은 하늘빛으로 8분음표마다 옮겨 가며 위 오선에서 같은 음표가 함께 빛난다. 멈춰 있을 때는 C 화음과 첫 음 E4.
    piano() {
      const x0 = 14, x1 = 186, w = (x1 - x0) / 15, top = 64, front = 112, f = (v) => +v.toFixed(1);
      const X = (x, y) => f(100 + (x - 100) * (0.9 + (0.1 * (y - top)) / (front - top))); // 앞쪽이 넓은 원근
      const quad = (a, b, y0, y1) => `M${X(a, y0)} ${y0}L${X(b, y0)} ${y0}L${X(b, y1)} ${y1}L${X(a, y1)} ${y1}Z`;
      const wave = (x) => 3 * Math.sin(((x - 8) / 184) * Math.PI * 2);
      const gold = "#ffd27a", sky = "#8fd3ff";
      const melody = [[9, 8], [11, 6], [12, 5], [14, 3], [12, 5], [10, 7], [11, 6], [8, 9]]; // [흰 건반 번호, 오선 위치(위 줄 F5=0)]
      let s = `<defs><linearGradient id="pn-fade" gradientUnits="userSpaceOnUse" x1="8" x2="192" y1="0" y2="0"><stop offset="0" stop-color="${W}" stop-opacity="0"/><stop offset=".15" stop-color="${W}" stop-opacity=".6"/><stop offset=".85" stop-color="${W}" stop-opacity=".6"/><stop offset="1" stop-color="${W}" stop-opacity="0"/></linearGradient></defs>`;
      // 물결치는 오선과 선율
      range(5).forEach((k) => { s += `<path d="M${range(37).map((i) => { const x = 8 + (i * 184) / 36; return `${f(x)} ${f(12 + k * 4.4 + wave(x))}`; }).join("L")}" fill="none" stroke="url(#pn-fade)" stroke-width=".7"/>`; });
      const heads = melody.map(([, p], i) => { const x = 44 + i * 17.5; return [x, f(12 + p * 2.2 + wave(x))]; });
      heads.forEach(([x, y], i) => {
        const head = (fill, extra = "") => `<ellipse${extra} cx="${x}" cy="${y}" rx="2.8" ry="2" transform="rotate(-20 ${x} ${y})" fill="${fill}"/>`;
        s += head(W) + `<path d="M${f(x + 2.5)} ${f(y - 0.6)}V${f(y - 12)}" stroke="${W}"/>` + head(sky, ` class="pn-note"${i ? ' opacity="0"' : ""} style="animation-delay:${(i * 0.4).toFixed(1)}s"`);
        if (i % 2 === 0) { const [x2, y2] = heads[i + 1]; s += `<path d="M${f(x + 2)} ${f(y - 12)}L${f(x2 + 3)} ${f(y2 - 12)}V${f(y2 - 10.2)}L${f(x + 2)} ${f(y - 10.2)}Z" fill="${W}"/>`; }
      });
      // 케이스(뒤판·양옆·앞 레일), 금색 띠와 붉은 펠트
      s += `<ellipse cx="100" cy="${front + 9}" rx="94" ry="2.6" fill="#000" fill-opacity=".22"/><path d="${quad(x0 - 7, x1 + 7, 54, front + 7)}" fill="#1d1631"/>`;
      s += `<path d="M${X(x0 - 4, 57.5)} 57.5H${X(x1 + 4, 57.5)}" stroke="${gold}" stroke-opacity=".75" stroke-width=".6"/><path d="${quad(x0, x1, 62, top)}" fill="#b3214f"/>`;
      const key = (i) => [x0 + i * w + 0.35, x0 + (i + 1) * w - 0.35];
      range(15).forEach((i) => { const [a, b] = key(i); s += `<path d="${quad(a, b, top, front)}" fill="#fbf8f1"/><path d="${quad(a, b, front, front + 4.5)}" fill="#d6cce2"/>`; });
      const press = (i, color, cls, delay, on) => { const [a, b] = key(i); return `<path class="${cls}"${on ? "" : ' opacity="0"'} style="animation-delay:${delay}s" d="${quad(a + 0.4, b - 0.4, top + 0.5, front - 0.4)}" fill="${color}" fill-opacity=".9"/>`; };
      [[0, 2, 4], [0, 2, 5], [0, 3, 5], [1, 4, 6]].forEach((keys, j) => keys.forEach((i) => { s += press(i, gold, "pn-chord", (j * 0.8).toFixed(1), !j); }));
      melody.forEach(([i], k) => { s += press(i, sky, "pn-note", (k * 0.4).toFixed(1), !k); });
      // 검은 건반: 앞면이 보이도록 몸통 위에 밝은 윗면을 얹는다
      const back = top + 0.62 * (front - top);
      [0, 7].forEach((o) => [[1, -0.12], [2, 0.12], [4, -0.15], [5, 0], [6, 0.15]].forEach(([j, d]) => {
        const c = x0 + (o + j + d) * w, h = 0.29 * w;
        s += `<path d="${quad(c - h, c + h, top, back + 2.6)}" fill="#1d1631"/><path d="${quad(c - h + 0.7, c + h - 0.7, top, back - 0.4)}" fill="#3b3157"/>`;
        s += `<path d="M${X(c - h + 1.3, top)} ${top}L${X(c - h + 1.3, back - 1.4)} ${f(back - 1.4)}" stroke="${W}" stroke-opacity=".3" stroke-width=".5"/>`;
      }));
      return svg(s);
    },
    // 드럼: 객석에서 본 드럼 세트. 오른손잡이 기준이라 하이햇·스네어·크래시는 오른쪽, 플로어 탐·라이드는 왼쪽에 놓이고
    // 베이스 드럼 앞면에는 책 이름을 새겼다. 한 마디 2.4초(100 BPM)의 8비트: 하이햇은 8분음표마다, 킥은 1·3박,
    // 스네어는 2·4박, 4박 뒤 두 탐으로 필인하고 다음 1박에 크래시가 흔들린다.
    drums() {
      const f = (v) => +v.toFixed(2), metal = "#c9ced6";
      const ring = (shape, delay, dur = 2.4, stroke = 'stroke="#fff"') => `<${shape} class="dr-ring" opacity="0" style="animation-delay:${delay}s;animation-duration:${dur}s" fill="none" ${stroke} stroke-width="1.3"/>`;
      const head = (cx, y, rx, ry) => `cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}"`;
      // 원통형 북: 셸, 아래 후프, 러그 세 개, 위 헤드와 후프
      const drum = (cx, y, rx, ry, h) => `<path d="M${cx - rx} ${y}V${y + h}A${rx} ${ry} 0 0 0 ${cx + rx} ${y + h}V${y}Z" fill="url(#dr-shell)"/>`
        + `<path d="M${cx - rx} ${y + h}A${rx} ${ry} 0 0 0 ${cx + rx} ${y + h}" fill="none" stroke="${metal}" stroke-width="1.1"/>`
        + [-0.71, 0, 0.71].map((u) => `<rect x="${f(cx + u * rx - 0.8)}" y="${f(y + h * 0.3)}" width="1.6" height="${f(h * 0.42)}" rx=".8" fill="${metal}"/>`).join("")
        + `<ellipse ${head(cx, y, rx, ry)} fill="#fffaf2" stroke="${metal}" stroke-width="1.4"/><ellipse ${head(cx, y, f(rx * 0.8), f(ry * 0.8))} fill="none" stroke="#000" stroke-opacity=".07"/>`;
      const cymbal = (cx, cy, rx, ry) => `<ellipse ${head(cx, cy, rx, ry)} fill="url(#dr-brass)" stroke="#7a4c0c" stroke-opacity=".5" stroke-width=".5"/>`
        + [0.72, 0.46].map((u) => `<ellipse ${head(cx, cy, f(rx * u), f(ry * u))} fill="none" stroke="#7a4c0c" stroke-opacity=".3" stroke-width=".5"/>`).join("")
        + `<ellipse ${head(cx, f(cy - ry * 0.25), f(rx * 0.2), f(ry * 0.55))} fill="#ffe9a8"/><circle cx="${cx}" cy="${f(cy - ry * 0.45)}" r=".9" fill="#5c3a0a"/>`;
      let s = `<defs><linearGradient id="dr-shell"><stop offset="0" stop-color="#3a0a14"/><stop offset=".22" stop-color="#7d1d2e"/><stop offset=".42" stop-color="#c44a5d"/><stop offset=".6" stop-color="#8d2536"/><stop offset="1" stop-color="#2e0810"/></linearGradient>`
        + `<linearGradient id="dr-brass"><stop offset="0" stop-color="#a8741a"/><stop offset=".3" stop-color="#f2c14e"/><stop offset=".5" stop-color="#fff0b3"/><stop offset=".7" stop-color="#e6aa2e"/><stop offset="1" stop-color="#96620f"/></linearGradient></defs>`;
      s += `<ellipse cx="100" cy="123" rx="92" ry="2.5" fill="#000" fill-opacity=".18"/><path d="M8 123H192" stroke="${W}" stroke-opacity=".25"/>`;
      // 스탠드와 다리: 북보다 먼저 그려 뒤로 숨긴다
      s += `<path d="M44 34 40 123M30 123 40 111 50 123M152 26 158 123M150 123 158 111 166 123M182 48V123M174 123 182 109 190 123M150 86V123M141 123 150 108 159 123M31 80 27 123M65 80 69 123M100 60V51M100 54 89 49M100 54 111 49M77 108 67 123M123 108 133 123" fill="none" stroke="${metal}" stroke-width="1.3" stroke-linecap="round"/>`;
      // 라이드와 크래시: 기울기는 바깥 g가, 흔들림은 안쪽 g가 맡는다
      s += `<g transform="rotate(-10 44 32)">${cymbal(44, 32, 25, 5.4)}</g>`;
      s += `<g transform="rotate(14 152 24)"><g class="dr-crash" style="animation-delay:.01s">${cymbal(152, 24, 21, 4.8)}${ring(`ellipse ${head(152, 24, 21, 4.8)}`, 0.01, 2.4, 'stroke="#ffe9a8"')}</g></g>`;
      // 랙 탐 둘: 바깥으로 살짝 기울고, 마디 끝 필인에서 차례로 울린다
      [[84, -7, 2.1], [116, 7, 2.25]].forEach(([cx, a, t]) => { s += `<g transform="rotate(${a} ${cx} 52)">${drum(cx, 44, 14, 4.6, 15)}${ring(`ellipse ${head(cx, 44, 14, 4.6)}`, t)}</g>`; });
      // 베이스 드럼: 나무 후프와 크롬 인레이, 클로, 검은 앞면 헤드의 금색 고리와 책 이름, 포트 구멍
      let bd = `<circle cx="100" cy="90" r="30" fill="url(#dr-shell)"/>`;
      range(8).forEach((k) => { bd += `<rect x="98.9" y="57.5" width="2.2" height="4.5" rx=".6" fill="${metal}" transform="rotate(${22.5 + k * 45} 100 90)"/>`; });
      bd += `<circle cx="100" cy="90" r="27.6" fill="none" stroke="${metal}" stroke-width=".8"/><circle cx="100" cy="90" r="26.2" fill="#1d0b10"/>`;
      bd += `<circle cx="100" cy="90" r="20.6" fill="none" stroke="#ffd27a" stroke-width="1.2"/><circle cx="100" cy="90" r="19" fill="none" stroke="#ffd27a" stroke-opacity=".6" stroke-width=".5"/>`;
      bd += `<text x="100" y="92.4" text-anchor="middle" font-size="7" font-weight="800" font-style="italic" fill="#fffaf2">DrumBook</text><path d="M86 95.6H114" stroke="#ffd27a" stroke-width=".7"/>`;
      bd += `<circle cx="116.7" cy="106.7" r="2.2" fill="#000" fill-opacity=".5" stroke="${metal}" stroke-width=".7"/>`;
      s += `<g class="dr-kick" style="animation-delay:.01s">${bd}</g>${ring('circle cx="100" cy="90" r="13"', 0.01, 1.2, 'stroke="#ffd27a"')}`;
      // 플로어 탐(왼쪽), 스네어(오른쪽)
      s += drum(48, 72, 17, 5, 28) + drum(150, 76, 15, 4.5, 10) + ring(`ellipse ${head(150, 76, 15, 4.5)}`, 0.6, 1.2);
      // 하이햇: 아래 심벌은 고정, 위 심벌은 8분음표마다 살짝 눌렸다 올라온다
      s += cymbal(182, 61, 14, 2.4) + `<g class="dr-hat" style="animation-delay:.01s">${cymbal(182, 57.5, 14, 2.6)}</g>`;
      return svg(s);
    },
    // 베이스: 비스듬히 놓인 4현 일렉 베이스(더블 컷어웨이 솔리드 바디, 34″ 롱 스케일).
    // 프렛은 너트에서 줄 길이 × (1 − 2^(−n/12))만큼 떨어진 자리에 놓이고, 굵은 줄일수록 선이 두껍고 진폭도 크다.
    // 오른손 두 손가락이 번갈아 뜯으며(0.3초마다 = 100 BPM의 8분음표), 뜯긴 줄의 진동 폭이 부풀었다 잦아든다.
    // 오른쪽 아래에는 뜯는 음의 도수 R·5·8·5가 박마다 차례로 켜진다.
    bass() {
      const nut = 124, L = 124, f = (v) => +v.toFixed(2);
      const fret = (n) => f(nut * 2 ** (-n / 12));
      const half = (x) => 4.9 + (2.6 * (nut - x)) / (nut - 38); // 너트 4.9 → 힐 7.5
      const lo = (k) => f(-4.5 + 3 * k); // 브리지 위 k번째 줄(0: 4번 줄 E)
      const hi = (k) => f(-2.7 + 1.8 * k); // 너트 위
      const chrome = "#c9ced6";
      let g = "";
      // 바디: 위·아래 컷어웨이가 있는 솔리드 바디. 넥이 지나는 구간은 직선으로 두고 넥이 덮는다.
      g += `<path d="M-36 2C-37-15-27-28-11-29C-1-30 5-26 13-25C21-24 27-30 37-31C48-32 57-27 58-19C58-14 54-11 48-10L40-9V9L46 11C51 12 53 15 51 19C47 25 40 27 32 26C24 25 19 22 11 23C2 24-3 29-13 28C-28 27-36 16-36 2Z" fill="url(#bs-body)" stroke="#dff5ee" stroke-width="1.4"/>`;
      // 픽업 둘과 브리지, 컨트롤 노브 셋
      [[9, 11], [27, 9]].forEach(([x, h]) => {
        g += `<rect x="${x - 3.2}" y="${-h}" width="6.4" height="${h * 2}" rx="1.6" fill="#17110f" stroke="${chrome}" stroke-width=".6"/>`;
        range(4).forEach((k) => { g += `<circle cx="${x}" cy="${f(lo(k) * (h / 9))}" r=".9" fill="${chrome}"/>`; });
      });
      g += `<rect x="-5" y="-7.5" width="9" height="15" rx="1.4" fill="${chrome}"/>`;
      range(4).forEach((k) => { g += `<path d="M-4 ${lo(k)}H3" stroke="#6d737c" stroke-width=".7"/>`; });
      [[-7, 17], [-15, 20], [-23, 22]].forEach(([x, y]) => { g += `<circle cx="${x}" cy="${y}" r="2.9" fill="#1b1512" stroke="${chrome}" stroke-width=".7"/><path d="M${x} ${y - 2.4}V${y - .6}" stroke="#eef4f2" stroke-width=".8" stroke-linecap="round"/>`; });
      // 지판: 20프렛과 3·5·7·9·12(쌍)·15·17·19 자리표
      g += `<path d="M38 ${f(-half(38))}L${nut} ${f(-half(nut))}V${f(half(nut))}L38 ${f(half(38))}Z" fill="#2a1a12" stroke="#dff5ee" stroke-width=".6"/>`;
      range(20).forEach((i) => { const x = fret(i + 1), h = f(half(x)); g += `<path d="M${x} ${-h}V${h}" stroke="#e9dcc8" stroke-width=".55"/>`; });
      [3, 5, 7, 9, 12, 15, 17, 19].forEach((n) => {
        const x = f((fret(n - 1) + fret(n)) / 2);
        g += (n === 12 ? [-2.1, 2.1] : [0]).map((y) => `<circle cx="${x}" cy="${y}" r=".95" fill="#f6ecd9"/>`).join("");
      });
      // 너트와 헤드스톡(튜너 넷이 한쪽에), 큰 튜닝 키
      g += `<rect x="${nut}" y="-5" width="1.6" height="10" rx=".4" fill="#fff8ea"/>`;
      g += `<path d="M${nut} -5 154-8.4Q161-8.9 161-4V4.6Q161 7.6 156 7.2L${nut} 5Z" fill="#20362f" stroke="#dff5ee" stroke-width=".7"/>`;
      const posts = [131, 139.5, 148, 156.5];
      posts.forEach((x) => {
        g += `<circle cx="${x}" cy="-5" r="1.5" fill="${chrome}"/><path d="M${x} -6.5V-10" stroke="${chrome}" stroke-width="1.1"/><ellipse cx="${x}" cy="-12.4" rx="2.1" ry="2.6" fill="#e3e8ee" stroke="#8d939b" stroke-width=".5"/>`;
      });
      // 네 줄: 브리지에서 너트를 지나 튜너로. 줄마다 기본 진동의 배(腹)를 겹쳐 둔다.
      const widths = [1.7, 1.35, 1.05, 0.8], amp = [4.6, 4, 3.4, 2.8];
      range(4).forEach((k) => {
        const px = posts[3 - k], m = f(nut / 2), y = f((lo(k) + hi(k)) / 2);
        g += `<path d="M0 ${lo(k)}L${nut} ${hi(k)}L${px} -5" fill="none" stroke="#fff6e4" stroke-width="${widths[k]}" stroke-linejoin="round"/>`;
        g += `<path class="bs-ring" opacity="0" style="animation-delay:${(k * 0.3).toFixed(2)}s" d="M0 ${lo(k)}Q${m} ${f(y - amp[k])} ${nut} ${hi(k)}Q${m} ${f(y + amp[k])} 0 ${lo(k)}Z" fill="#aef0dc" fill-opacity=".5"/>`;
      });
      // 오른손 두 손가락이 픽업 위에서 번갈아 줄을 뜯는다
      [0, 0.3].forEach((d, i) => {
        g += `<g class="bs-finger" style="animation-delay:${d}s"><path d="M${13 + i * 7.4} 20V8.6a3.2 3.2 0 0 1 6.4 0V20Z" fill="#f6d9c2" stroke="#b9876a" stroke-width=".7" stroke-linejoin="round"/></g>`;
      });
      let s = `<defs><linearGradient id="bs-body" gradientUnits="userSpaceOnUse" x1="-30" y1="-28" x2="40" y2="26"><stop offset="0" stop-color="#0d2e28"/><stop offset=".35" stop-color="#2f7d6b"/><stop offset=".62" stop-color="#6fd8bb"/><stop offset=".85" stop-color="#2a6f5f"/><stop offset="1" stop-color="#0b2620"/></linearGradient></defs>`;
      s += `<g transform="translate(40.4 90.4) rotate(-20) scale(.78)">${g}</g>`;
      // 왼쪽 위로 떠오르는 낮은 음표와 낮은음자리표
      const note = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.9" ry="2.9" transform="rotate(-20 ${x} ${y})"/><path d="M${x - 3.5} ${y + 0.8}V${y - 13}" stroke="${W}" stroke-width="1.3"/>`;
      s += `<g class="cv-bob" fill="${W}" fill-opacity=".92">${note(22, 30)}${note(38, 25)}<path d="M18.5 15.6 41.6 8.6V11.4L18.5 18.4Z"/></g>`;
      s += `<g class="cv-bob" style="animation-delay:.6s" fill="${W}" fill-opacity=".92"><path d="M62 10a6 6 0 0 1 6 6c0 7-6 12-12 15 5-5 9-9 9-14a3 3 0 0 0-3-4 2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 1 0-7.8Z"/><circle cx="72" cy="14" r="1.4"/><circle cx="72" cy="19" r="1.4"/></g>`;
      // 오른쪽 아래: 뜯는 음의 도수가 박마다 켜진다 (R 5 8 5)
      ["R", "5", "8", "5"].forEach((c, i) => {
        const x = 128 + i * 19;
        s += `<g class="bs-beat" style="animation-delay:${(i * 0.6).toFixed(1)}s"><circle cx="${x}" cy="112" r="7.6" fill="none" stroke="${W}" stroke-opacity=".55" stroke-width="1.4"/><text x="${x}" y="115.4" text-anchor="middle" font-size="9" font-weight="700" fill="${W}" fill-opacity=".8">${c}</text></g>`;
      });
      return svg(s);
    },
    // DRAM 셀 어레이: 워드라인·비트라인 위에서 비트가 깜박인다
    memory() {
      const r = rnd(7); let s = "";
      range(5).forEach((j) => { s += `<line x1="18" x2="196" y1="${18 + j * 22}" y2="${18 + j * 22}" stroke="${W}" stroke-opacity=".25"/>`; });
      range(9).forEach((i) => { s += `<line y1="6" y2="124" x1="${26 + i * 20}" x2="${26 + i * 20}" stroke="${W}" stroke-opacity=".18"/>`; });
      range(5).forEach((j) => range(9).forEach((i) => {
        const on = r() > 0.45, x = 26 + i * 20, y = 18 + j * 22;
        s += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2.5" fill="${W}" fill-opacity="${on ? 0.85 : 0.12}" stroke="${W}" stroke-opacity=".5"${on && r() > 0.5 ? ` class="cv-blink" style="animation-delay:${(r() * 2).toFixed(2)}s"` : ""}/>`;
      }));
      return svg(s);
    },
    // 베이어 컬러 필터 + 마이크로렌즈, 위에서 광자가 떨어진다
    pixel() {
      const C = { R: "#ff8a8a", G: "#7deaa0", B: "#8ab4ff" }; let s = "";
      range(4).forEach((j) => range(7).forEach((i) => {
        const k = j % 2 ? (i % 2 ? "B" : "G") : (i % 2 ? "G" : "R");
        const x = 34 + i * 22, y = 40 + j * 22;
        s += `<rect x="${x}" y="${y}" width="20" height="20" rx="2" fill="${C[k]}" fill-opacity=".8"/><circle cx="${x + 10}" cy="${y + 10}" r="8.5" fill="${W}" fill-opacity=".14" stroke="${W}" stroke-opacity=".55"/>`;
      }));
      [52, 96, 140, 118, 74, 162].forEach((x, k) => {
        s += `<circle class="cv-fall" style="animation-delay:${k * 0.35}s" cx="${x}" cy="14" r="2.6" fill="${W}"/>`;
      });
      return svg(s);
    },
    // FinFET 단면: 기판·핀·게이트가 한 층씩 쌓인다
    layers() {
      let s = `<rect x="10" y="100" width="190" height="30" fill="${W}" fill-opacity=".22"/>`;
      s += `<rect x="10" y="86" width="190" height="14" fill="${W}" fill-opacity=".12"/>`;
      [44, 92, 140].forEach((x) => { s += `<rect x="${x}" y="46" width="16" height="54" rx="2" fill="${W}" fill-opacity=".7"/>`; });
      s += `<path class="cv-grow" d="M30 86 V38 Q30 30 38 30 H164 Q172 30 172 38 V86 H162 V42 H150 V86 H134 V42 H118 V86 H102 V42 H86 V86 H70 V42 H58 V86 Z" fill="${W}" fill-opacity=".32" stroke="${W}" stroke-opacity=".7"/>`;
      s += `<rect x="20" y="14" width="162" height="8" rx="2" fill="${W}" fill-opacity=".45"/>`;
      range(6).forEach((i) => { s += `<rect x="${30 + i * 26}" y="22" width="6" height="8" fill="${W}" fill-opacity=".5"/>`; });
      return svg(s);
    },
    // 이하 fab·process·etch·cmp·film·plasma·power는 SemiBooks에서 만들어 books 포털과 함께 쓰는 표지다. 움직임은 .fb-·.pr-·.et- 클래스가 맡고,
    // 애니메이션이 없을 때(동작 줄이기)도 그 자체로 완성된 그림이 되도록 기본 도형을 첫 프레임과 같게 그린다.
    // 팹 인프라 단면: FFU가 내려보낸 공기는 바닥 구멍을 지나 양쪽 샤프트를 타고 천장으로 돌아가고,
    // 천장 레일의 OHT는 FOUP을 장비 앞 로드 포트에 내려놓는다. 바닥 아래 배관은 초순수와 가스를 장비로 올려 보낸다.
    fab() {
      const flow = (d, k, o, dur) => `<path class="cv-flow" style="animation-duration:${dur}s;animation-delay:-${(k * 0.19).toFixed(2)}s" d="${d}" fill="none" stroke="${W}" stroke-opacity="${o}" stroke-width="1.2" stroke-dasharray="4 6"/>`;
      let s = `<rect x="6" y="121" width="194" height="5" rx="1" fill="${W}" fill-opacity=".3"/>`;
      s += `<rect x="22" y="12" width="168" height="109" rx="2" fill="${W}" fill-opacity=".06" stroke="${W}" stroke-opacity=".5" stroke-width="1.3"/>`;
      s += `<rect x="23" y="86" width="166" height="34.4" fill="#000" fill-opacity=".16"/>`;
      s += `<rect x="18" y="8" width="176" height="5" rx="1.5" fill="${W}" fill-opacity=".6"/>`;
      [40, 150].forEach((x) => { s += `<rect x="${x}" y="2" width="22" height="6" rx="1" fill="${W}" fill-opacity=".42"/>`; });
      // 되돌아가는 공기: 바닥 아래에서 양쪽 샤프트를 타고 천장 플레넘으로
      s += flow("M100 91 H27 V17 H98", 0, ".3", 2.4) + flow("M112 91 H185 V17 H114", 3, ".3", 2.4);
      range(6).forEach((i) => { s += `<rect x="${36 + i * 24}" y="20" width="20" height="5" rx="1" fill="${W}" fill-opacity=".62"/>`; });
      s += `<path d="M32 25 V80 M180 25 V80" stroke="${W}" stroke-opacity=".35" stroke-width="1.2"/>`;
      // 장비 세 대: 낮은 장비, 노광기처럼 높은 장비와 그 앞 로드 포트, 작은 장비
      s += `<rect x="40" y="52" width="32" height="28" rx="1.5" fill="${W}" fill-opacity=".5"/>`;
      s += `<rect x="112" y="42" width="34" height="38" rx="1.5" fill="${W}" fill-opacity=".62"/>`;
      s += `<rect x="96" y="58" width="16" height="2.5" fill="${W}" fill-opacity=".85"/><rect x="102" y="60.5" width="4" height="19.5" fill="${W}" fill-opacity=".3"/>`;
      s += `<rect x="154" y="56" width="22" height="24" rx="1.5" fill="${W}" fill-opacity=".48"/>`;
      [[44, 47, 0], [158, 51, 0.8]].forEach(([x, y, d]) => { s += `<rect class="cv-blink" style="animation-delay:-${d}s" x="${x}" y="${y}" width="4" height="4" rx="1" fill="#9be7ff"/>`; });
      // 층류: 장비 윗면이나 바닥까지 곧게 내려간다
      [[36, 79], [56, 51], [84, 79], [129, 41], [150, 79], [177, 79]].forEach(([x, y], k) => { s += flow(`M${x} 26 V${y}`, k, ".62", 1.3); });
      s += `<path d="M34 31 H178" stroke="${W}" stroke-opacity=".7" stroke-width="1.6"/>`;
      [50, 90, 130, 170].forEach((x) => { s += `<path d="M${x} 25 V31" stroke="${W}" stroke-opacity=".35"/>`; });
      // OHT: 레일을 따라 가다 로드 포트 위에서 멈추고 FOUP을 내렸다 올린다
      const oht = "animation-delay:-1.2s";
      s += `<g class="fb-oht" style="--dx:120px;${oht}"><rect x="36" y="31.5" width="16" height="6.5" rx="1.4" fill="${W}"/>`;
      s += `<path class="fb-belt" style="${oht}" d="M39.5 38h.8v2h-.8zM47.7 38h.8v2h-.8z" fill="${W}" fill-opacity=".85"/>`;
      s += `<rect class="fb-hoist" style="${oht}" x="38" y="40" width="12" height="8" rx="1.6" fill="${W}" fill-opacity=".9"/></g>`;
      // 이중 바닥과 서브팹: 초순수·가스 헤더, 장비로 올라가는 배관, 진공 펌프와 스크러버
      s += `<rect x="32" y="80" width="148" height="6" fill="${W}" fill-opacity=".38"/>`;
      range(21).forEach((i) => { s += `<rect x="${35 + i * 7}" y="81.5" width="3" height="3" fill="#000" fill-opacity=".28"/>`; });
      [["#9be7ff", 100, [58, 166]], ["#ffd27a", 106, [128]]].forEach(([c, y, risers]) => {
        [`M36 ${y} H176`, ...risers.map((x) => `M${x} ${y} V80`)].forEach((d) => {
          s += `<path d="${d}" stroke="${c}" stroke-opacity=".4" stroke-width="2" fill="none"/><path class="cv-flow" style="animation-duration:1.7s" d="${d}" stroke="${c}" stroke-width="2" stroke-dasharray="3 7" fill="none"/>`;
        });
      });
      [[44, 16], [118, 18]].forEach(([x, w]) => { s += `<rect x="${x}" y="110" width="${w}" height="10" rx="2.5" fill="${W}" fill-opacity=".5"/>`; });
      s += `<rect x="148" y="108" width="22" height="12" rx="1.5" fill="${W}" fill-opacity=".4"/>`;
      return svg(s);
    },
    // 제조 공정: 막을 쌓고(증착) 빛으로 무늬를 옮기고(노광) 깎고(식각) 이온을 심고(주입) 배선을 이으면(배선)
    // 트랜지스터 하나가 완성된다. 위의 다섯 점이 지금 단계를 따라가고, 멈춰 있을 때는 완성된 단면을 보여 준다.
    process() {
      const T = 7, at = (o) => `animation-delay:-${(T - o).toFixed(2)}s`;
      let s = `<rect x="58" y="9" width="120" height="2" rx="1" fill="${W}" fill-opacity=".28"/>`;
      s += `<rect class="pr-progress" x="58" y="9" width="120" height="2" rx="1" fill="${W}" fill-opacity=".9"/>`;
      range(5).forEach((i) => { s += `<circle cx="${58 + i * 30}" cy="10" r="3.6" fill="${W}" fill-opacity=".45"/>`; });
      s += `<circle class="pr-node" cx="178" cy="10" r="5.2" fill="${W}"/>`;
      // 기판과 소자 분리막, 소스·드레인, 마지막 단계에 덮이는 층간 절연막
      s += `<rect x="36" y="88" width="160" height="36" fill="${W}" fill-opacity=".22"/>`;
      s += `<path d="M36 88h14v16h-14zM182 88h14v16h-14z" fill="${W}" fill-opacity=".45"/>`;
      s += `<path class="pr-sd" d="M50 88 H98 V94 A5 5 0 0 1 93 99 H50 Z M182 88 H134 V94 A5 5 0 0 0 139 99 H182 Z" fill="${W}" fill-opacity=".6"/>`;
      s += `<rect class="pr-ild" x="36" y="58" width="160" height="30" fill="${W}" fill-opacity=".1"/>`;
      // 막: 양옆은 식각으로 사라지고 가운데만 게이트로 남는다
      s += `<path class="pr-film" opacity="0" d="M50 76 H100 V88 H50 Z M132 76 H182 V88 H132 Z" fill="${W}" fill-opacity=".7"/>`;
      s += `<rect class="pr-gate" x="100" y="76" width="32" height="12" fill="${W}" fill-opacity=".7"/>`;
      s += `<path class="pr-spacer" d="M100 77 Q95 80 94 88 H100 Z M132 77 Q137 80 138 88 H132 Z" fill="${W}" fill-opacity=".42"/>`;
      s += `<path class="pr-contact" d="M70 58 H76 V88 H70 Z M156 58 H162 V88 H156 Z" fill="${W}" fill-opacity=".85"/><rect class="pr-contact" x="113" y="58" width="6" height="18" fill="${W}" fill-opacity=".85"/>`;
      s += `<path class="pr-metal" d="M60 52 H86 V58 H60 Z M104 52 H128 V58 H104 Z M146 52 H172 V58 H146 Z" fill="${W}" fill-opacity=".95"/>`;
      // 감광막과 마스크, 마스크의 투명한 부분을 지나는 빛
      s += `<path class="pr-resist-s" opacity="0" d="M50 70 H100 V76 H50 Z M132 70 H182 V76 H132 Z" fill="#ffe8a3" fill-opacity=".9"/>`;
      s += `<rect class="pr-resist-c" opacity="0" x="100" y="70" width="32" height="6" fill="#ffe8a3" fill-opacity=".9"/>`;
      s += `<g class="pr-mask" opacity="0"><rect x="50" y="34" width="132" height="5" fill="${W}" fill-opacity=".16" stroke="${W}" stroke-opacity=".55" stroke-width=".8"/><rect x="100" y="34" width="32" height="5" fill="${W}"/></g>`;
      [58, 70, 82, 94, 138, 150, 162, 174].forEach((x, k) => { s += `<path class="pr-ray" opacity="0" style="animation-delay:0s,-${((k % 4) * 0.2).toFixed(1)}s" d="M${x} 16 V69" stroke="#fff3bf" stroke-width="1.6" stroke-dasharray="4 6" fill="none"/>`; });
      // 식각 이온은 열린 곳만, 주입 이온은 게이트 양옆에만 떨어진다(자기 정렬)
      [64, 80, 152, 168].forEach((x, k) => [0, 0.36].forEach((o) => { s += `<rect class="pr-etch" opacity="0" style="${at(o + k * 0.09)}" x="${x - 0.7}" y="40" width="1.4" height="7" rx=".7" fill="${W}"/>`; }));
      [60, 74, 88, 144, 158, 172].forEach((x, k) => [0, 0.4].forEach((o) => { s += `<circle class="pr-ion" opacity="0" style="${at(o + (k % 3) * 0.12 + (k > 2 ? 0.06 : 0))}" cx="${x}" cy="18" r="2" fill="${W}"/>`; }));
      return svg(s);
    },
    // 플라스마 식각: 빛나는 플라스마의 이온이 시스를 지나 수직으로 내리꽂혀 마스크 사이를 깎는다.
    // 좁은 구멍일수록 덜 깎이고(ARDE), 옆벽에는 보호막이 쌓이며, 휘발성 부산물은 위로 빠져나간다.
    etch() {
      const open = [[60, 16, 1], [98, 12, 0.82], [132, 9, 0.64], [163, 6, 0.45]]; // x, 폭, 최종 깊이 비율
      const mask = [[38, 60], [76, 98], [110, 132], [141, 163], [169, 196]];
      let s = `<rect x="38" y="3" width="158" height="5" rx="1.5" fill="${W}" fill-opacity=".55"/>`;
      s += `<g class="et-glow"><ellipse cx="117" cy="22" rx="80" ry="12" fill="${W}" fill-opacity=".1"/><ellipse cx="117" cy="22" rx="62" ry="8.5" fill="${W}" fill-opacity=".12"/><ellipse class="cv-pulse" cx="117" cy="22" rx="40" ry="5" fill="#f3d9fa" fill-opacity=".5"/></g>`;
      [[70, 20], [96, 27], [128, 17], [150, 26], [172, 21]].forEach(([x, y], k) => { s += `<circle class="et-drift" style="animation-delay:-${(k * 0.5).toFixed(1)}s" cx="${x}" cy="${y}" r="1.6" fill="${W}" fill-opacity=".85"/>`; });
      s += `<path d="M38 40 H196" stroke="${W}" stroke-opacity=".28" stroke-dasharray="2 3"/>`;
      s += `<rect x="38" y="102" width="158" height="19" fill="${W}" fill-opacity=".2"/><rect x="34" y="121" width="166" height="5" rx="1.5" fill="${W}" fill-opacity=".5"/>`;
      mask.forEach(([a, b]) => { s += `<rect x="${a}" y="62" width="${b - a}" height="40" fill="${W}" fill-opacity=".4"/><rect x="${a}" y="56" width="${b - a}" height="6" fill="${W}" fill-opacity=".9"/>`; });
      // 열린 곳의 남은 막은 위에서부터 깎이고, 깎인 만큼 옆벽 보호막이 따라 내려간다. 기본 도형은 70% 깎인 모습이고
      // 키프레임은 그 높이에 대한 배율이다: --k1은 다 깎였을 때, --kf는 새 막을 채웠을 때.
      open.forEach(([x, w, d]) => {
        const s0 = 1 - 0.7 * d, h = 40 * s0;
        s += `<rect class="et-front" style="--k1:${((1 - d) / s0).toFixed(3)};--kf:${(1 / s0).toFixed(3)}" x="${x}" y="${(102 - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" fill="${W}" fill-opacity=".4"/>`;
        [x, x + w - 1.2].forEach((wx) => { s += `<rect class="et-wall" x="${wx}" y="62" width="1.2" height="${(28 * d).toFixed(1)}" fill="${W}" fill-opacity=".8"/>`; });
      });
      s += `<g class="et-gate">`;
      open.forEach(([x, w, d], i) => [0, 0.45].forEach((o) => {
        s += `<rect class="et-ion" style="--dy:${(62 + 40 * d * 0.85 - 35).toFixed(1)}px;animation-delay:-${(o + i * 0.21).toFixed(2)}s" x="${x + w / 2 - 0.7}" y="28" width="1.4" height="7" rx=".7" fill="${W}"/>`;
      }));
      s += `</g>`;
      open.forEach(([x, w], i) => { s += `<circle class="et-out" opacity="0" style="--ox:${i % 2 ? 6 : -6}px;animation-delay:-${(i * 0.55).toFixed(2)}s" cx="${x + w / 2}" cy="74" r="1.8" fill="#ffe8a3"/>`; });
      return svg(s);
    },
    // CMP: 회전하는 정반 위 패드에 헤드가 웨이퍼를 눌러 돌리고, 노즐이 슬러리를 떨어뜨리며, 컨디셔너가 패드를 쓸고 지나간다.
    // 왼쪽 위 단면에서는 울퉁불퉁한 막의 볼록한 곳부터 깎여 평평해진다.
    cmp() {
      const ring = (ry, o, k) => `<ellipse class="cv-flow" style="animation-duration:${(1.6 + k * 0.5).toFixed(1)}s" cx="104" cy="96" rx="${(ry * 3.6).toFixed(1)}" ry="${ry}" fill="none" stroke="${W}" stroke-opacity="${o}" stroke-dasharray="5 5"/>`;
      let s = `<ellipse cx="104" cy="104" rx="94" ry="24" fill="${W}" fill-opacity=".18"/>`;
      s += `<path d="M10 96 V104 A94 24 0 0 0 198 104 V96" fill="${W}" fill-opacity=".14"/>`;
      s += `<ellipse cx="104" cy="96" rx="94" ry="24" fill="${W}" fill-opacity=".3" stroke="${W}" stroke-opacity=".55"/>`;
      [6, 11, 16, 21].forEach((r, k) => { s += ring(r, ".35", k); });
      // 슬러리 노즐과 방울
      s += `<path d="M8 40 H62 V58" fill="none" stroke="${W}" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`;
      [0, 0.45, 0.9].forEach((d) => { s += `<circle class="cm-drop" style="animation-delay:-${d}s" cx="62" cy="62" r="2.2" fill="#ffd8e4"/>`; });
      s += `<ellipse cx="60" cy="96" rx="14" ry="3.6" fill="#ffd8e4" fill-opacity=".5"/>`;
      // 컨디셔너 팔
      s += `<g class="cm-sweep"><path d="M196 64 L162 90" stroke="${W}" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/><ellipse cx="160" cy="92" rx="11" ry="3.4" fill="${W}" fill-opacity=".75"/></g>`;
      // 헤드
      s += `<g class="cm-head"><rect x="113" y="50" width="6" height="22" fill="${W}" fill-opacity=".6"/><path d="M96 72 H136 V84 A20 5 0 0 1 96 84 Z" fill="${W}" fill-opacity=".7"/><ellipse cx="116" cy="72" rx="20" ry="5" fill="${W}" fill-opacity=".9"/></g>`;
      // 단면 삽화: 볼록한 곳이 먼저 깎인다
      s += `<rect x="110" y="8" width="84" height="34" rx="4" fill="#000" fill-opacity=".12" stroke="${W}" stroke-opacity=".35"/>`;
      s += `<rect x="116" y="30" width="72" height="7" fill="${W}" fill-opacity=".35"/>`;
      s += `<rect x="116" y="22" width="72" height="8" fill="${W}" fill-opacity=".55"/><path class="cm-flat" d="M130 22 V14 H146 V22 Z M160 22 V14 H176 V22 Z" fill="${W}" fill-opacity=".55"/>`;
      s += `<path d="M116 22 H188" stroke="#ffd8e4" stroke-opacity=".8" stroke-dasharray="3 2"/>`;
      return svg(s);
    },
    // 박막 증착: 샤워헤드에서 전구체 분자가 내려와 트렌치 두 개가 패인 기판을 덮고, 컨포멀한 막이 한 겹씩 쌓인다.
    film() {
      // 표면에서 t만큼 바깥(기체 쪽)으로 옮긴 선. 두 선 사이가 막 한 겹이다.
      const off = (t) => [[6, 74 - t], [58 + t, 74 - t], [58 + t, 116 - t], [86 - t, 116 - t], [86 - t, 74 - t], [118 + t, 74 - t], [118 + t, 116 - t], [146 - t, 116 - t], [146 - t, 74 - t], [200, 74 - t]];
      const band = (a, b) => "M" + off(b).concat(off(a).reverse()).map((p) => p.join(" ")).join(" L") + " Z";
      let s = `<rect x="14" y="6" width="176" height="9" rx="2.5" fill="${W}" fill-opacity=".5"/>`;
      range(11).forEach((i) => { s += `<rect x="${24 + i * 15.6}" y="15" width="3" height="3" fill="${W}" fill-opacity=".45"/>`; });
      [[34, 0], [72, 0.55], [104, 1.1], [132, 0.3], [166, 0.85], [52, 1.35], [150, 1.6]].forEach(([x, d]) => {
        s += `<circle class="cv-fall" style="animation-delay:-${d}s" cx="${x}" cy="30" r="2.4" fill="${W}" fill-opacity=".9"/>`;
      });
      s += `<path d="M${off(0).map((p) => p.join(" ")).join(" L")} V128 H6 Z" fill="#000" fill-opacity=".2" stroke="${W}" stroke-opacity=".6"/>`;
      [[0, 4, ".85"], [4, 8, ".55"], [8, 11, ".3"]].forEach(([a, b, o], k) => {
        s += `<path class="fl-layer" style="animation-delay:${(k * 1.2).toFixed(1)}s" d="${band(a, b)}" fill="${W}" fill-opacity="${o}"/>`;
      });
      return svg(s);
    },
    // 플라즈마: RF 전원이 위아래 전극 사이에 글로를 켜고, 전자는 떠돌며 이온은 시스를 지나 웨이퍼로 떨어진다.
    plasma() {
      let s = `<rect x="40" y="8" width="150" height="7" rx="2" fill="${W}" fill-opacity=".6"/>`;
      s += `<rect x="40" y="108" width="150" height="7" rx="2" fill="${W}" fill-opacity=".6"/><rect x="52" y="104" width="126" height="4" rx="1" fill="${W}" fill-opacity=".85"/>`;
      s += `<path d="M8 62 q6 -14 12 0 t12 0" fill="none" stroke="${W}" stroke-opacity=".8" stroke-width="1.6"/><path d="M20 62 H30 M30 62 V111.5 H40" fill="none" stroke="${W}" stroke-opacity=".45"/><circle cx="20" cy="62" r="13" fill="none" stroke="${W}" stroke-opacity=".45"/>`;
      s += `<ellipse class="pl-glow" cx="115" cy="56" rx="70" ry="28" fill="${W}" fill-opacity=".14"/><ellipse class="cv-pulse" cx="115" cy="56" rx="50" ry="18" fill="#f3d9fa" fill-opacity=".4"/><ellipse cx="115" cy="56" rx="26" ry="9" fill="#fff" fill-opacity=".3"/>`;
      s += `<path d="M44 90 H186" stroke="${W}" stroke-opacity=".35" stroke-dasharray="2 3"/><rect x="44" y="90" width="142" height="14" fill="#000" fill-opacity=".14"/>`;
      [[66, 40, 0], [92, 66, 0.3], [118, 38, 0.6], [140, 70, 0.9], [162, 48, 1.2], [80, 58, 1.5], [150, 34, 1.8], [106, 74, 2.1]].forEach(([x, y, d]) => {
        s += `<circle class="pl-e" style="animation-delay:-${d}s" cx="${x}" cy="${y}" r="1.5" fill="#cfe3ff"/>`;
      });
      [72, 96, 120, 144, 166].forEach((x, k) => {
        s += `<rect class="pl-ion" style="animation-delay:-${(k * 0.27).toFixed(2)}s" x="${x - 0.8}" y="80" width="1.6" height="7" rx=".8" fill="#ffd8a8"/>`;
      });
      return svg(s);
    },
    // 전력 반도체: 사인파 기준을 따라 폭이 변하는 PWM 펄스(위상 전압)가 차례로 켜지고, 그 위를 부드러운 부하 전류가 지난다.
    // 왼쪽 아래는 스위치(MOSFET) 기호, 오른쪽 아래는 냉각판 위 다이 세 개다.
    power() {
      let s = `<path d="M14 66 H192" stroke="${W}" stroke-opacity=".3" stroke-dasharray="2 3"/>`;
      const n = 14, x0 = 16, p = 12.5;
      for (let k = 0; k < n; k++) {
        const d = 0.5 * (1 + 0.86 * Math.sin((2 * Math.PI * (k + 0.5)) / n)), w = Math.max(1.2, d * p), x = x0 + k * p + (p - w) / 2;
        s += `<rect class="pw-sw" style="animation-delay:${(k * 0.1).toFixed(1)}s" x="${x.toFixed(1)}" y="30" width="${w.toFixed(1)}" height="36" fill="${W}" fill-opacity=".34"/>`;
      }
      let d = "";
      for (let i = 0; i <= 60; i++) { const x = x0 + (i / 60) * n * p, y = 48 - 24 * Math.sin((2 * Math.PI * i) / 60 - 0.45); d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
      s += `<path class="pw-i" d="${d}" fill="none" stroke="#ffd8a8" stroke-width="2.4" stroke-linecap="round"/>`;
      s += `<path d="M22 96 V122 M28 98 V120 M28 102 H40 V92 M28 116 H40 V126 M28 109 H40" fill="none" stroke="${W}" stroke-opacity=".75" stroke-width="1.6"/><path d="M34 106 l5 3 -5 3z" fill="${W}" fill-opacity=".75"/>`;
      s += `<rect x="96" y="114" width="96" height="7" rx="1.5" fill="${W}" fill-opacity=".45"/>`;
      [104, 134, 164].forEach((x, k) => { s += `<rect class="cv-pulse" style="animation-delay:${(k * 0.4).toFixed(1)}s" x="${x}" y="104" width="18" height="10" rx="1" fill="#ffc9a8" fill-opacity=".55"/>`; });
      s += `<path d="M150 82 l-8 12 h6 l-3 10 10 -14 h-6 z" fill="${W}" fill-opacity=".8"/>`;
      return svg(s);
    },
    // 인과적 어텐션 히트맵
    attention() {
      const r = rnd(11); let s = ""; const n = 7, p = 15, x0 = 74, y0 = 14;
      range(n).forEach((i) => range(n).forEach((j) => {
        const x = x0 + j * p, y = y0 + i * p;
        if (j > i) { s += `<rect x="${x}" y="${y}" width="13" height="13" rx="2" fill="none" stroke="${W}" stroke-opacity=".18"/>`; return; }
        const a = j === i ? 0.9 : 0.15 + r() * 0.6;
        s += `<rect class="cv-pulse" style="animation-delay:${((i + j) * 0.12).toFixed(2)}s" x="${x}" y="${y}" width="13" height="13" rx="2" fill="${W}" fill-opacity="${a.toFixed(2)}"/>`;
      }));
      return svg(s);
    },
    // 조리개 날개: 육각형 개구가 열리고 닫힌다
    aperture() {
      const cx = 132, cy = 65; let s = "";
      s += `<circle cx="${cx}" cy="${cy}" r="56" fill="none" stroke="${W}" stroke-opacity=".3" stroke-width="6"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="46" fill="${W}" fill-opacity=".28"/>`;
      const hex = range(6).map((k) => { const a = (Math.PI / 3) * k + 0.3; return `${(cx + 22 * Math.cos(a)).toFixed(1)},${(cy + 22 * Math.sin(a)).toFixed(1)}`; }).join(" ");
      let blades = "";
      range(6).forEach((k) => {
        const a = (Math.PI / 3) * k + 0.3, b = a + 1.25;
        blades += `<line x1="${(cx + 22 * Math.cos(a)).toFixed(1)}" y1="${(cy + 22 * Math.sin(a)).toFixed(1)}" x2="${(cx + 46 * Math.cos(b)).toFixed(1)}" y2="${(cy + 46 * Math.sin(b)).toFixed(1)}" stroke="${W}" stroke-opacity=".75" stroke-width="1.4"/>`;
      });
      s += `<g class="cv-iris" style="transform-origin:${cx}px ${cy}px"><polygon points="${hex}" fill="#000" fill-opacity=".35" stroke="${W}" stroke-width="1.4"/>${blades}</g>`;
      return svg(s);
    },
    // 논리 게이트 회로: 신호가 선을 따라 흐른다
    logic() {
      const and = (x, y) => `<path d="M${x} ${y} h14 a14 14 0 0 1 0 28 h-14 z" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-width="1.5"/>`;
      const or = (x, y) => `<path d="M${x} ${y} q10 14 0 28 q24 2 34 -14 q-10 -16 -34 -14 z" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-width="1.5"/>`;
      let s = and(70, 18) + and(70, 84) + or(126, 51);
      const wires = ["M20 24 H70", "M20 40 H70", "M20 90 H70", "M20 106 H70", "M98 32 H112 V58 H128", "M98 98 H112 V72 H128", "M160 65 H196"];
      wires.forEach((d) => { s += `<path d="${d}" fill="none" stroke="${W}" stroke-opacity=".35" stroke-width="1.5"/><path class="cv-flow" d="${d}" fill="none" stroke="${W}" stroke-width="2" stroke-dasharray="6 14"/>`; });
      [24, 40, 90, 106].forEach((y) => { s += `<circle cx="20" cy="${y}" r="3" fill="${W}"/>`; });
      return svg(s);
    },
    // 표준 셀 배치와 배선
    circuit() {
      const r = rnd(5); let s = "";
      range(4).forEach((j) => {
        let x = 40;
        while (x < 190) { const w = 10 + Math.round(r() * 22); if (x + w > 196) break; s += `<rect x="${x}" y="${16 + j * 28}" width="${w}" height="16" rx="1.5" fill="${W}" fill-opacity="${(0.15 + r() * 0.35).toFixed(2)}" stroke="${W}" stroke-opacity=".4"/>`; x += w + 4; }
      });
      ["M44 32 V44 H120 V60", "M88 60 V72 H170 V88", "M60 88 V100 H140 V116"].forEach((d) => { s += `<path class="cv-flow" d="${d}" fill="none" stroke="${W}" stroke-width="1.6" stroke-dasharray="5 8"/>`; });
      return svg(s);
    },
    // 2.5D 패키지: 기판·인터포저 위에 HBM이 쌓인다
    package() {
      let s = `<rect x="16" y="108" width="180" height="12" rx="2" fill="${W}" fill-opacity=".3"/><rect x="30" y="94" width="152" height="9" rx="1.5" fill="${W}" fill-opacity=".45"/>`;
      range(18).forEach((i) => { s += `<circle cx="${36 + i * 8.4}" cy="105.5" r="2" fill="${W}" fill-opacity=".7"/>`; });
      s += `<rect x="40" y="62" width="58" height="30" rx="2" fill="${W}" fill-opacity=".55"/>`;
      range(6).forEach((k) => { s += `<rect class="cv-drop" style="animation-delay:${(5 - k) * 0.12}s" x="114" y="${84 - k * 11}" width="54" height="8" rx="1.5" fill="${W}" fill-opacity="${(0.35 + k * 0.08).toFixed(2)}"/>`; });
      [126, 141, 156].forEach((x) => { s += `<line x1="${x}" x2="${x}" y1="20" y2="92" stroke="#000" stroke-opacity=".25" stroke-width="1.5"/>`; });
      return svg(s);
    },
    // 자동차와 레이더 파면
    car() {
      let s = `<path d="M20 92 h18 a10 10 0 0 1 20 0 h50 a10 10 0 0 1 20 0 h12 v-18 l-14 -6 l-18 -18 h-46 l-22 22 l-20 4 z" fill="${W}" fill-opacity=".45" stroke="${W}" stroke-width="1.5"/>`;
      s += `<circle cx="48" cy="94" r="8" fill="${W}" fill-opacity=".8"/><circle cx="118" cy="94" r="8" fill="${W}" fill-opacity=".8"/>`;
      [0, 1, 2].forEach((k) => { s += `<path class="cv-wave" style="animation-delay:${k * 0.5}s" d="M150 ${58 - k * 12} q${14 + k * 10} ${18 + k * 12} 0 ${36 + k * 24}" fill="none" stroke="${W}" stroke-width="2"/>`; });
      return svg(s);
    },
    // 웨이퍼 맵: 가장자리 고리 모양으로 불량 다이가 몰려 있다
    wafermap() {
      const cx = 130, cy = 65, r = 58, p = 11; let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${W}" fill-opacity=".14" stroke="${W}" stroke-opacity=".6"/>`;
      for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
        const x = cx + i * p, y = cy + j * p, far = Math.hypot(Math.abs(i * p) + p / 2, Math.abs(j * p) + p / 2);
        if (far > r - 2) continue;
        const ring = Math.hypot(i, j) > 3.6;
        s += `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" rx="1.5" fill="${ring ? "#ff6b6b" : W}" fill-opacity="${ring ? 0.9 : 0.55}"${ring ? ` class="cv-blink" style="animation-delay:${((i + j + 10) * 0.07).toFixed(2)}s"` : ""}/>`;
      }
      return svg(s);
    },
    // 노광: 마스크를 지난 빛이 렌즈에 모여 웨이퍼에 선을 새긴다
    litho() {
      let s = `<rect x="60" y="10" width="130" height="7" rx="1.5" fill="${W}" fill-opacity=".85"/>`;
      [72, 104, 136, 168].forEach((x) => { s += `<rect x="${x}" y="10" width="14" height="7" fill="#000" fill-opacity=".35"/>`; });
      s += `<ellipse cx="125" cy="52" rx="58" ry="9" fill="${W}" fill-opacity=".3" stroke="${W}" stroke-opacity=".7"/>`;
      [70, 98, 125, 152, 180].forEach((x, k) => {
        s += `<path class="cv-flow" style="animation-delay:${k * 0.15}s" d="M${x} 18 L${x} 46 L${100 + k * 12.5} 98" fill="none" stroke="${W}" stroke-opacity=".7" stroke-width="1.4" stroke-dasharray="5 7"/>`;
      });
      s += `<rect x="60" y="100" width="130" height="22" fill="${W}" fill-opacity=".22"/>`;
      [92, 108, 124, 140, 156].forEach((x) => { s += `<rect class="cv-grow" x="${x}" y="90" width="7" height="10" rx="1" fill="${W}" fill-opacity=".85"/>`; });
      return svg(s);
    },
    // 이온 주입: 빔이 실리콘 격자로 쏟아지고, 박힌 도펀트가 깊이 방향 종 모양 분포를 이룬다
    implant() {
      const r = rnd(11); let s = "";
      s += `<rect x="78" y="6" width="64" height="10" rx="3" fill="${W}" fill-opacity=".6"/>`;
      s += `<path d="M84 16 L66 60 H154 L136 16 Z" fill="${W}" fill-opacity=".1"/>`;
      range(5).forEach((k) => {
        const x = 90 + k * 10;
        s += `<path class="cv-flow" style="animation-delay:${k * 0.2}s" d="M${x} 18 L${x + (x - 110) * 0.8} 58" fill="none" stroke="${W}" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="4 6"/>`;
      });
      s += `<rect x="10" y="62" width="190" height="68" fill="${W}" fill-opacity=".12"/>`;
      range(5).forEach((j) => range(14).forEach((i) => {
        s += `<circle cx="${18 + i * 13.5}" cy="${70 + j * 12}" r="1.6" fill="${W}" fill-opacity=".35"/>`;
      }));
      range(26).forEach(() => {
        const g = (r() + r() + r() - 1.5) * 2;
        s += `<circle cx="${(62 + r() * 96).toFixed(1)}" cy="${(84 + g * 9).toFixed(1)}" r="2.6" fill="${W}" fill-opacity=".85"/>`;
      });
      [76, 98, 120, 142].forEach((x, k) => {
        s += `<circle class="cv-fall" style="animation-delay:${k * 0.45}s" cx="${x}" cy="30" r="2.4" fill="${W}"/>`;
      });
      return svg(s);
    },
    // 불량 분석: 배선 위를 훑는 돋보기와 빛나는 결함 한 점
    probe() {
      let s = "";
      [26, 50, 74, 98].forEach((y, k) => { s += `<rect x="${60 + (k % 2) * 14}" y="${y}" width="${118 - (k % 2) * 20}" height="7" rx="2" fill="${W}" fill-opacity=".35"/>`; });
      [84, 118, 152].forEach((x) => { s += `<rect x="${x}" y="26" width="7" height="79" fill="${W}" fill-opacity=".22"/>`; });
      s += `<circle class="cv-pulse" cx="121" cy="77" r="6" fill="#ff6b6b"/><circle cx="121" cy="77" r="13" fill="#ff6b6b" fill-opacity=".25"/>`;
      s += `<g class="cv-scan-lens"><circle cx="121" cy="77" r="24" fill="none" stroke="${W}" stroke-width="3"/><line x1="138" y1="94" x2="156" y2="112" stroke="${W}" stroke-width="5" stroke-linecap="round"/></g>`;
      return svg(s);
    },
    // SoC: 다이 평면도 위의 블록들, 블록 사이로 데이터가 오간다
    soc() {
      const blocks = [[64, 10, 40, 34, 0.75], [108, 10, 30, 34, 0.5], [142, 10, 46, 52, 0.85], [64, 48, 74, 14, 0.35], [64, 66, 50, 34, 0.6], [118, 66, 70, 16, 0.45], [118, 86, 70, 14, 0.3], [64, 104, 124, 16, 0.4]];
      let s = `<rect x="58" y="4" width="136" height="122" rx="4" fill="#000" fill-opacity=".18" stroke="${W}" stroke-opacity=".6"/>`;
      blocks.forEach(([x, y, w, h, o], k) => { s += `<rect class="cv-pulse" style="animation-delay:${(k * 0.25).toFixed(2)}s" x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${W}" fill-opacity="${o}"/>`; });
      s += `<path class="cv-flow" d="M84 44 V56 H165 V62 M89 100 V112 H150" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 6"/>`;
      return svg(s);
    },
    // 디스플레이: RGB 서브픽셀이 켜졌다 꺼진다
    subpixel() {
      const C = ["#ff7a8a", "#7deaa0", "#8ab4ff"]; let s = "";
      range(4).forEach((j) => range(6).forEach((i) => range(3).forEach((k) => {
        const x = 62 + i * 21 + k * 6.5, y = 10 + j * 28;
        s += `<rect class="cv-pulse" style="animation-delay:${(((i + j) % 4) * 0.3 + k * 0.1).toFixed(2)}s" x="${x}" y="${y}" width="5" height="24" rx="1.5" fill="${C[k]}" fill-opacity=".85"/>`;
      })));
      return svg(s);
    },
    // 테스트: 프로브 바늘이 내려와 닿으면 셔무 플롯의 열이 하나씩 판정된다
    shmoo() {
      const x0 = 74, y0 = 16, p = 12, cols = 10, rows = 8; let s = "";
      s += `<path d="M${x0 - 5} ${y0 - 4}V${y0 + rows * p + 2}H${x0 + cols * p + 4}" fill="none" stroke="${W}" stroke-opacity=".6" stroke-width="1.2"/>`;
      s += `<text x="${x0 - 12}" y="${y0 + 4}" fill="${W}" fill-opacity=".75" font-size="8" font-family="monospace">V</text><text x="${x0 + cols * p - 10}" y="${y0 + rows * p + 11}" fill="${W}" fill-opacity=".75" font-size="8" font-family="monospace">F</text>`;
      range(cols).forEach((i) => range(rows).forEach((j) => {
        const v = 1 - j / (rows - 1), f = i / (cols - 1);
        const pass = v > 0.12 + 0.75 * f ** 1.7 && !(v > 0.9 && f > 0.75);
        s += `<rect class="cv-hit" style="animation-delay:${(0.15 + i * 0.24).toFixed(2)}s" x="${x0 + i * p}" y="${y0 + j * p}" width="10" height="10" rx="1.5" fill="${pass ? "#7deaa0" : "#ff7a8a"}" fill-opacity="${pass ? 0.85 : 0.5}"/>`;
      }));
      s += `<g class="cv-sweep" style="--dx:${cols * p}px"><rect x="${x0 - 1}" y="${y0 - 2}" width="12" height="${rows * p + 2}" rx="2" fill="${W}" fill-opacity=".16" stroke="${W}" stroke-opacity=".8"/>`;
      s += `<path d="M${x0 + 5} ${y0 - 14}V${y0 - 4}" stroke="${W}" stroke-width="1.6"/><path d="M${x0 - 1} ${y0 - 14}h12" stroke="${W}" stroke-width="2.4" stroke-linecap="round"/></g>`;
      return svg(s);
    },
    // 스마트폰: 유리·디스플레이·보드·배터리·뒷판이 비스듬히 분해되어 떠 있다
    phone() {
      let s = "";
      const layers = [[0.28, "none"], [0.5, "screen"], [0.4, "board"], [0.55, "battery"], [0.22, "back"]];
      layers.forEach(([o, kind], k) => {
        const x = 70 + k * 18, y = 6 + k * 12;
        s += `<g class="cv-drop" style="animation-delay:${(k * 0.12).toFixed(2)}s"><rect x="${x}" y="${y}" width="62" height="96" rx="9" fill="${W}" fill-opacity="${o}" stroke="${W}" stroke-opacity=".7"/>`;
        if (kind === "board") s += `<rect x="${x + 8}" y="${y + 8}" width="20" height="14" rx="2" fill="#000" fill-opacity=".3"/><rect x="${x + 34}" y="${y + 8}" width="18" height="30" rx="2" fill="#000" fill-opacity=".2"/>`;
        if (kind === "battery") s += `<rect x="${x + 10}" y="${y + 30}" width="42" height="52" rx="4" fill="#000" fill-opacity=".18"/>`;
        if (kind === "back") s += `<rect x="${x + 6}" y="${y + 6}" width="20" height="20" rx="5" fill="#000" fill-opacity=".3"/>`;
        s += `</g>`;
      });
      return svg(s);
    },
    // 카메라: 미러리스 바디 정면. 렌즈 속 조리개 날개가 열리고 닫히고, 빛줄기가 렌즈로 흘러든다
    camera() {
      const cx = 128, cy = 72; let s = "";
      // 왼쪽에서 들어오는 빛줄기
      [44, 60, 76, 92].forEach((y, k) => {
        const d = `M8 ${y}L${cx - 40} ${(cy + (y - cy) * 0.55).toFixed(1)}`;
        s += `<path d="${d}" stroke="${W}" stroke-opacity=".18" stroke-width="1.2"/><path class="cv-flow" style="animation-delay:-${(k * 0.23).toFixed(2)}s" d="${d}" stroke="#ffd27a" stroke-width="1.6" stroke-dasharray="4 10" stroke-linecap="round"/>`;
      });
      // 바디: 뷰파인더 혹, 그립, 셔터 버튼과 다이얼
      s += `<path d="M66 34H104L110 22H146L152 34H190Q196 34 196 40V114Q196 120 190 120H72Q66 120 66 114Z" fill="${W}" fill-opacity=".26" stroke="${W}" stroke-opacity=".75" stroke-width="1.3" stroke-linejoin="round"/>`;
      s += `<path d="M176 34V120" stroke="${W}" stroke-opacity=".35"/><rect x="178" y="28" width="12" height="6" rx="2" fill="${W}" fill-opacity=".85"/><rect x="160" y="29" width="13" height="5" rx="1.5" fill="${W}" fill-opacity=".5"/>`;
      s += `<circle class="cv-blink" cx="84" cy="44" r="2.6" fill="#ff8a8a"/>`;
      // 렌즈: 마운트 링, 경통, 앞 유리
      s += `<circle cx="${cx}" cy="${cy}" r="40" fill="#000" fill-opacity=".22" stroke="${W}" stroke-width="2.4"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${W}" stroke-opacity=".45" stroke-dasharray="2 3"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="27" fill="${W}" fill-opacity=".14" stroke="${W}" stroke-opacity=".6"/>`;
      const hex = range(7).map((k) => { const a = ((2 * Math.PI) / 7) * k + 0.3; return `${(cx + 13 * Math.cos(a)).toFixed(1)},${(cy + 13 * Math.sin(a)).toFixed(1)}`; }).join(" ");
      let blades = "";
      range(7).forEach((k) => {
        const a = ((2 * Math.PI) / 7) * k + 0.3, b = a + 1.15;
        blades += `<line x1="${(cx + 13 * Math.cos(a)).toFixed(1)}" y1="${(cy + 13 * Math.sin(a)).toFixed(1)}" x2="${(cx + 26 * Math.cos(b)).toFixed(1)}" y2="${(cy + 26 * Math.sin(b)).toFixed(1)}" stroke="${W}" stroke-opacity=".7" stroke-width="1.2"/>`;
      });
      s += `<g class="cv-iris" style="transform-origin:${cx}px ${cy}px"><polygon points="${hex}" fill="#000" fill-opacity=".45" stroke="${W}" stroke-width="1.3"/>${blades}</g>`;
      s += `<path d="M${cx - 18} ${cy - 16}A24 24 0 0 1 ${cx + 4} ${cy - 24}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>`;
      return svg(s);
    },
    // 소자 물리: pn 접합의 에너지 밴드가 휘고, 전자와 정공이 떠 있다
    band() {
      let s = "";
      [[30, "Ec"], [74, "Ev"]].forEach(([y, label]) => {
        s += `<path class="cv-grow" d="M64 ${y} H112 C130 ${y} 134 ${y + 26} 152 ${y + 26} H196" fill="none" stroke="${W}" stroke-width="2.5"/>`;
        s += `<text x="62" y="${y - 5}" fill="${W}" fill-opacity=".7" font-size="9" font-family="monospace">${label}</text>`;
      });
      s += `<line x1="64" y1="60" x2="196" y2="60" stroke="${W}" stroke-opacity=".6" stroke-dasharray="4 4"/>`;
      [160, 172, 184].forEach((x, k) => { s += `<circle class="cv-pulse" style="animation-delay:${k * 0.3}s" cx="${x}" cy="49" r="3.2" fill="#8ab4ff"/>`; });
      [72, 86, 100].forEach((x, k) => { s += `<circle class="cv-pulse" style="animation-delay:${k * 0.3 + 0.15}s" cx="${x}" cy="82" r="3.2" fill="none" stroke="#ff8a8a" stroke-width="1.6"/>`; });
      s += `<rect x="112" y="16" width="40" height="104" fill="${W}" fill-opacity=".1"/>`;
      return svg(s);
    },
    // TCAD: 접합 근처가 촘촘한 격자 위의 MOSFET 단면, 드레인 쪽 등전위선이 숨 쉬고 채널로 전자가 흐른다
    tcad() {
      const xs = [64, 76, 86, 94, 99, 102, 105, 110, 118, 130, 142, 150, 155, 158, 161, 166, 174, 184, 196];
      const ys = [30, 32, 35, 39, 44, 51, 60, 72, 88, 106, 124];
      let s = `<rect x="64" y="30" width="132" height="94" fill="${W}" fill-opacity=".08"/>`;
      s += `<path d="M64 30H104C104 48 97 56 82 56H64Z" fill="${W}" fill-opacity=".34"/><path d="M196 30H156C156 48 163 56 178 56H196Z" fill="${W}" fill-opacity=".34"/>`;
      xs.forEach((x) => { s += `<path d="M${x} 30V124" stroke="${W}" stroke-opacity=".2" stroke-width=".6"/>`; });
      ys.forEach((y) => { s += `<path d="M64 ${y}H196" stroke="${W}" stroke-opacity=".2" stroke-width=".6"/>`; });
      s += `<svg x="64" y="30" width="132" height="94" viewBox="64 30 132 94" overflow="hidden">`;
      [34, 46, 58].forEach((r, k) => {
        const dy = (Math.sqrt(r * r - 24 * 24) * 0.9).toFixed(1);
        s += `<path class="cv-breathe" style="animation-delay:${(k * 0.25).toFixed(2)}s" d="M${172 - r} 30A${r} ${(r * 0.9).toFixed(1)} 0 0 0 196 ${(30 + +dy).toFixed(1)}" fill="none" stroke="#ffd27a" stroke-opacity="${(0.9 - k * 0.2).toFixed(2)}" stroke-width="1.3"/>`;
      });
      s += `</svg><rect x="104" y="26" width="52" height="4" fill="${W}" fill-opacity=".5"/><rect x="108" y="12" width="44" height="14" rx="1.5" fill="${W}" fill-opacity=".9"/>`;
      s += `<rect x="70" y="21" width="24" height="9" rx="1.5" fill="${W}" fill-opacity=".7"/><rect x="166" y="21" width="24" height="9" rx="1.5" fill="${W}" fill-opacity=".7"/>`;
      range(4).forEach((k) => { s += `<circle class="cv-run" style="--dx:50px;animation-delay:-${(k * 0.4).toFixed(1)}s" cx="105" cy="33.5" r="2.2" fill="#8ab4ff"/>`; });
      return svg(s);
    },
    // 아날로그: 비반전 증폭기, 작은 입력 사인파가 큰 출력 사인파로 흘러 나간다
    analog() {
      const zig = (dx, dy, n = 4) => range(n).map((k) => `l${(dx / n / 2).toFixed(1)} ${k % 2 ? -dy : dy} l${(dx / n / 2).toFixed(1)} ${k % 2 ? dy : -dy}`).join(" ");
      let s = "";
      range(5).forEach((i) => { s += `<path d="M140 ${30 + i * 20}H196" stroke="${W}" stroke-opacity=".14"/>`; });
      s += `<path d="M92 56H80V20H100 ${zig(24, 5)} H136V70" fill="none" stroke="${W}" stroke-width="1.4"/>`;
      s += `<path d="M80 56H74 ${zig(-16, 4)} H52V64M46 64H64M49 68H61M53 72H57" fill="none" stroke="${W}" stroke-width="1.3" stroke-opacity=".85"/>`;
      s += `<path d="M44 84H92M130 70H140" stroke="${W}" stroke-width="1.4"/>`;
      s += `<path d="M92 42V98L130 70Z" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += `<path d="M96 56h6M96 84h6M99 81v6" stroke="${W}" stroke-width="1.3"/>`;
      [[80, 56], [136, 70]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="2.4" fill="${W}"/>`; });
      const wave = (x, y, w, h, amp, per, color, sw) => {
        const cyc = Math.ceil(w / per) + 2; let d = `M${-per} ${h / 2}`;
        range(cyc * 2).forEach((k) => { d += k ? ` t${per / 2} 0` : ` q${per / 4} ${-2 * amp} ${per / 2} 0`; });
        return `<svg x="${x}" y="${y}" width="${w}" height="${h}" overflow="hidden"><path class="cv-slide" style="--dx:${per}px" d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/></svg>`;
      };
      s += wave(46, 74, 42, 20, 5, 14, "#ffd27a", 1.6);
      s += wave(140, 42, 56, 56, 22, 28, "#ffd27a", 2);
      return svg(s);
    },
    // 반도체 산업: 도는 지구 위에서 설계·장비·소재·파운드리 거점을 잇는 공급망
    globe() {
      const cx = 138, cy = 66, R = 54; let s = "";
      s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${W}" fill-opacity=".1" stroke="${W}" stroke-opacity=".6" stroke-width="1.2"/>`;
      [-36, -18, 0, 18, 36].forEach((d) => { s += `<ellipse cx="${cx}" cy="${cy + d}" rx="${Math.sqrt(R * R - d * d).toFixed(1)}" ry="${(4 - Math.abs(d) / 12).toFixed(1)}" fill="none" stroke="${W}" stroke-opacity=".22"/>`; });
      range(4).forEach((k) => { s += `<ellipse class="cv-turn" style="transform-origin:${cx}px ${cy}px;animation-delay:-${(k * 1.5).toFixed(1)}s" cx="${cx}" cy="${cy}" rx="${R}" ry="${R}" fill="none" stroke="${W}" stroke-opacity=".3"/>`; });
      const N = { us: [100, 52], nl: [128, 34], jp: [178, 50], kr: [166, 58], tw: [160, 84], cn: [140, 64] };
      [["us", "tw", -26], ["nl", "tw", -30], ["jp", "kr", -10], ["kr", "cn", -8], ["tw", "us", 30], ["cn", "nl", -14]].forEach(([a, b, bend], k) => {
        const [x1, y1] = N[a], [x2, y2] = N[b];
        const d = `M${x1} ${y1}Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + bend} ${x2} ${y2}`;
        s += `<path d="${d}" fill="none" stroke="${W}" stroke-opacity=".25" stroke-width="1.2"/><path class="cv-flow" style="animation-delay:-${(k * 0.17).toFixed(2)}s" d="${d}" fill="none" stroke="#ffd27a" stroke-width="1.8" stroke-dasharray="3 9" stroke-linecap="round"/>`;
      });
      Object.values(N).forEach(([x, y], k) => {
        s += `<circle class="cv-ping" style="transform-origin:${x}px ${y}px;animation-delay:${(k * 0.3).toFixed(1)}s" cx="${x}" cy="${y}" r="7" fill="${W}" fill-opacity=".3"/><circle cx="${x}" cy="${y}" r="3" fill="${W}"/>`;
      });
      s += `<g transform="translate(160 84)"><rect x="-7" y="-7" width="14" height="14" rx="2" fill="${W}" stroke="#000" stroke-opacity=".3"/><rect x="-3.5" y="-3.5" width="7" height="7" fill="#000" fill-opacity=".3"/></g>`;
      return svg(s);
    },
    // 선박: 컨테이너선이 겹친 물결 위에서 흔들리고 굴뚝에서 연기가 오른다
    ship() {
      const sea = (y, amp, per, o, dx, dur) => {
        let d = `M${-per} ${amp * 2}`;
        range(Math.ceil(220 / per) * 2 + 4).forEach((k) => { d += k ? ` t${per / 2} 0` : ` q${per / 4} ${-2 * amp} ${per / 2} 0`; });
        return `<svg x="0" y="${y}" width="200" height="${130 - y}" overflow="hidden"><path class="cv-slide" style="--dx:${dx * per}px;animation-duration:${dur}s" d="${d}V60H${-per}Z" fill="${W}" fill-opacity="${o}"/></svg>`;
      };
      let s = sea(88, 3, 30, 0.16, 1, 3);
      s += `<g class="cv-bob" style="transform-origin:130px 96px">`;
      s += `<path d="M66 80H194L184 100H84Q72 98 66 80Z" fill="${W}" fill-opacity=".85"/><path d="M70 90H190" stroke="#ff8a8a" stroke-opacity=".8" stroke-width="3"/>`;
      s += `<rect x="74" y="50" width="20" height="30" rx="1.5" fill="${W}" fill-opacity=".75"/><rect x="72" y="46" width="24" height="5" rx="1" fill="${W}"/>`;
      range(3).forEach((k) => { s += `<rect x="${77 + k * 6}" y="54" width="4" height="3" fill="#000" fill-opacity=".35"/>`; });
      s += `<rect x="80" y="36" width="8" height="10" fill="${W}" fill-opacity=".6"/><rect x="80" y="36" width="8" height="3" fill="#ff8a8a" fill-opacity=".9"/>`;
      const C = ["#ff8a8a", "#ffd27a", "#8ab4ff", "#7deaa0", "#ffffff"]; const r = rnd(3);
      range(7).forEach((i) => range(3 - (i === 6 ? 1 : 0)).forEach((j) => {
        s += `<rect x="${100 + i * 12.5}" y="${71 - j * 9}" width="11.5" height="8" rx="1" fill="${C[Math.floor(r() * C.length)]}" fill-opacity=".85" stroke="#000" stroke-opacity=".2" stroke-width=".6"/>`;
      }));
      s += `</g>`;
      [0, 1, 2].forEach((k) => { s += `<circle class="cv-rise" style="animation-delay:${(k * 0.8).toFixed(1)}s" cx="84" cy="30" r="${3 + k}" fill="${W}" fill-opacity=".45"/>`; });
      s += sea(96, 4, 40, 0.3, -1, 2.4);
      return svg(s);
    },
    // 돈: 복리로 불어나는 동전 탑, 위로 동전이 떨어지고 지수 곡선이 그려진다
    coins() {
      const n = [1, 2, 3, 4, 6, 8, 11, 14], base = 118, step = 5; let s = "";
      s += `<path d="M66 ${base + 4}H196M66 ${base + 4}V14" stroke="${W}" stroke-opacity=".45" stroke-width="1.1"/>`;
      const tops = [];
      n.forEach((c, k) => {
        const x = 80 + k * 15;
        range(c).forEach((j) => {
          const y = base - j * step, top = j === c - 1;
          s += `<g${top ? ` class="cv-coin" style="animation-delay:${(0.15 + k * 0.22).toFixed(2)}s"` : ""}><rect x="${x - 6.5}" y="${y - 2}" width="13" height="4" fill="#ffd27a" fill-opacity=".75"/><ellipse cx="${x}" cy="${y + 2}" rx="6.5" ry="2.2" fill="#ffd27a" fill-opacity=".75"/><ellipse cx="${x}" cy="${y - 2}" rx="6.5" ry="2.2" fill="#ffe7a8" stroke="#000" stroke-opacity=".18" stroke-width=".6"/></g>`;
          if (top) tops.push([x, y - 8]);
        });
      });
      const d = "M" + tops.map(([x, y]) => `${x} ${y}`).join(" L");
      s += `<path class="cv-draw" pathLength="1" d="${d}" fill="none" stroke="${W}" stroke-width="1.8" stroke-linejoin="round" stroke-dasharray="1"/>`;
      s += `<path d="M${tops[7][0] - 4} ${tops[7][1] + 1}l4 -6 3 7" fill="none" stroke="${W}" stroke-width="1.6" stroke-linejoin="round"/>`;
      return svg(s);
    },
    // 주식: 흘러가는 캔들 차트와 오른쪽의 출렁이는 호가창
    candles() {
      const r = rnd(29), N = 16, gap = 8; let walk = [0];
      range(N).forEach(() => walk.push(walk[walk.length - 1] + (r() - 0.46) * 14));
      const drift = walk[N] / N; walk = walk.map((v, i) => v - drift * i);
      const lo = Math.min(...walk), hi = Math.max(...walk), Y = (v) => 96 - ((v - lo) / (hi - lo || 1)) * 62;
      let chart = "";
      range(2).forEach((rep) => range(N).forEach((i) => {
        const o = walk[i], c = walk[i + 1], x = (rep * N + i) * gap + 4, up = c >= o;
        const wt = Math.max(o, c) + r() * 5, wb = Math.min(o, c) - r() * 5, col = up ? "#7deaa0" : "#ff7a8a";
        chart += `<path d="M${x} ${Y(wt).toFixed(1)}V${Y(wb).toFixed(1)}" stroke="${col}" stroke-width="1"/><rect x="${x - 2.5}" y="${Y(Math.max(o, c)).toFixed(1)}" width="5" height="${Math.max(1.5, Math.abs(Y(o) - Y(c))).toFixed(1)}" rx=".8" fill="${col}" fill-opacity=".9"/>`;
      }));
      const ma = range(2 * N).map((k) => { const i = k % N, a = walk.slice(Math.max(0, i - 2), i + 2); return `${k * gap + 4} ${Y(a.reduce((p, q) => p + q, 0) / a.length).toFixed(1)}`; });
      chart += `<path d="M${ma.join(" L")}" fill="none" stroke="${W}" stroke-opacity=".6" stroke-width="1.2"/>`;
      let s = "";
      range(5).forEach((k) => { s += `<path d="M60 ${18 + k * 22}H160" stroke="${W}" stroke-opacity=".14"/>`; });
      s += `<svg x="60" y="0" width="100" height="130" overflow="hidden"><g class="cv-slide" style="--dx:-${N * gap}px;animation-duration:8s">${chart}</g></svg>`;
      s += `<path d="M164 10V120" stroke="${W}" stroke-opacity=".35"/>`;
      [26, 18, 22, 12, 8].forEach((w, k) => { s += `<rect class="cv-depth" style="animation-delay:${(k * 0.35).toFixed(2)}s" x="${194 - w}" y="${14 + k * 9}" width="${w}" height="7" rx="1" fill="#ff7a8a" fill-opacity=".7"/>`; });
      s += `<rect x="168" y="61" width="26" height="8" rx="1.5" fill="${W}" fill-opacity=".9"/>`;
      [10, 16, 24, 20, 28].forEach((w, k) => { s += `<rect class="cv-depth" style="animation-delay:${(0.2 + k * 0.35).toFixed(2)}s" x="${194 - w}" y="${72 + k * 9}" width="${w}" height="7" rx="1" fill="#7deaa0" fill-opacity=".7"/>`; });
      return svg(s);
    },
    // 심장 박동과 심전도: 심장이 뛰고 파형이 흘러간다
    heart() {
      const beat = "h14l4-6 4 10 5-40 6 52 4-16 6 0 8-6 8 6h14";
      let s = "";
      range(4).forEach((k) => { s += `<path d="M10 ${30 + k * 24}H196" stroke="${W}" stroke-opacity=".1"/>`; });
      s += `<svg x="92" y="0" width="108" height="130" overflow="hidden"><g class="cv-slide" style="--dx:-73px;animation-duration:1.6s"><path d="M0 104${(beat + " ").repeat(4)}" fill="none" stroke="#ff8a9a" stroke-width="2" stroke-linejoin="round"/></g></svg>`;
      s += `<path class="cv-hit" d="M140 64 116 40c-14-14 4-34 18-20l6 6 6-6c14-14 32 6 18 20Z" fill="${W}" fill-opacity=".75" stroke="${W}" stroke-width="1.4"/>`;
      return svg(s);
    },
    // 해부학: 뼈대 위로 CT 단면선이 오르내리고, 오른쪽에 가슴 높이 가로 단면이 보인다
    skeleton() {
      const A = ANATOMY, rest = 1, [px, py, pw, ph] = A.panel, y = A.slices[rest].y, scan = "#7ee0ec";
      const ct = (v) => "#" + [3, 24, 30].map((c) => Math.round(c + (255 - c) * v).toString(16).padStart(2, "0")).join(""); // 검은 화면 → 흰 뼈
      let s = `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="4" fill="${ct(0)}" fill-opacity=".9"/>`;
      s += `<g transform="scale(${A.q})"><path d="${A.skin}" fill="${W}" fill-opacity=".16" stroke="${W}" stroke-opacity=".55" stroke-width="${0.7 / A.q}"/><path d="${A.bones}" fill="${W}" fill-opacity=".88"/>`;
      A.slices.forEach((sl, k) => {
        s += `<g class="an-slice" style="--k:${k - rest}"${k === rest ? "" : ' opacity="0"'}>`;
        s += sl.layers.map(([v, d]) => `<path d="${d}" fill="${ct(v)}" fill-rule="evenodd"/>`).join("") + "</g>";
      });
      s += "</g>";
      const to = A.slices.map((sl, k) => `;--y${k}:${(sl.y - y).toFixed(1)}px`).join("");
      s += `<g class="an-scan" style="--k:${-rest}${to}"><path d="M${A.fig[0] - 5} ${y}H${px - 4}" stroke="${scan}" stroke-opacity=".3" stroke-width="4"/>`;
      s += `<path d="M${A.fig[0] - 5} ${y}H${px - 4}" stroke="${scan}" stroke-width="1.3"/><circle cx="${px - 4}" cy="${y}" r="2" fill="${scan}"/></g>`;
      return svg(s);
    },
    // 오선과 음표, 아래에서 스펙트럼 막대가 출렁인다
    music() {
      const r = rnd(11); let s = "";
      range(5).forEach((k) => { s += `<path d="M60 ${30 + k * 9}H196" stroke="${W}" stroke-opacity=".4"/>`; });
      [[78, 61], [100, 52.5], [122, 43.5], [144, 48], [166, 39], [186, 52.5]].forEach(([x, y], k) => {
        s += `<g class="cv-bob" style="animation-delay:${(k * 0.3).toFixed(1)}s"><ellipse cx="${x}" cy="${y}" rx="5.4" ry="4" transform="rotate(-20 ${x} ${y})" fill="${W}" fill-opacity=".9"/><path d="M${x + 5} ${y}V${y - 24}" stroke="${W}" stroke-width="1.4"/></g>`;
      });
      range(16).forEach((i) => {
        const h = 8 + r() * 30;
        s += `<rect class="cv-grow" style="animation-delay:${(r() * 2).toFixed(2)}s;animation-duration:${(0.8 + r()).toFixed(2)}s" x="${62 + i * 8.4}" y="${124 - h}" width="5.6" height="${h.toFixed(1)}" rx="1.4" fill="#7dd3fc" fill-opacity=".75"/>`;
      });
      return svg(s);
    },
    // 볼록 렌즈가 광선을 모으고 초점에서 에어리 고리가 맥동한다
    lens() {
      const fx = 176, fy = 65; let s = "";
      s += `<path d="M58 65H198" stroke="${W}" stroke-opacity=".2" stroke-dasharray="3 4"/>`;
      [-36, -22, -8, 8, 22, 36].forEach((h, k) => {
        s += `<path class="cv-flow" style="animation-delay:${(k * 0.12).toFixed(2)}s" d="M60 ${fy + h}H112L${fx} ${fy}" fill="none" stroke="#ffd38a" stroke-opacity=".85" stroke-width="1.3" stroke-dasharray="6 4"/>`;
      });
      s += `<path d="M112 20Q132 65 112 110Q92 65 112 20Z" fill="${W}" fill-opacity=".3" stroke="${W}" stroke-opacity=".8" stroke-width="1.4"/>`;
      [14, 9, 4.5].forEach((r, k) => {
        s += `<circle class="cv-pulse" style="animation-delay:${(k * 0.3).toFixed(1)}s" cx="${fx}" cy="${fy}" r="${r}" fill="${W}" fill-opacity="${(0.12 + k * 0.3).toFixed(2)}"/>`;
      });
      return svg(s);
    },
    // 네트워크: 라우터 그물망의 링크를 따라 패킷이 흐른다
    // AI 전환: 흩어진 파일·메일이 표 한 장으로 정리되고, 그 위 AI 노드로 신호가 흐른다
    transform() {
      const r = rnd(11); let s = "";
      range(7).forEach((k) => {
        const x = 10 + r() * 46, y = 14 + k * 15 + r() * 4, a = (r() - 0.5) * 30;
        s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="22" height="10" rx="2" fill="${W}" fill-opacity=".14" stroke="${W}" stroke-opacity=".55" transform="rotate(${a.toFixed(1)} ${(x + 11).toFixed(1)} ${(y + 5).toFixed(1)})"/>`;
      });
      s += `<path class="cv-flow" d="M74 70H96" stroke="${W}" stroke-width="2" stroke-dasharray="4 4" fill="none"/><path d="M94 65l6 5-6 5" fill="none" stroke="${W}" stroke-width="2"/>`;
      s += `<rect x="108" y="56" width="84" height="64" rx="4" fill="none" stroke="${W}" stroke-opacity=".5"/>`;
      range(4).forEach((j) => range(3).forEach((i) => {
        s += `<rect x="${113 + i * 26}" y="${61 + j * 14.5}" width="22" height="10" rx="2" fill="${W}" fill-opacity="${0.35 + 0.15 * ((i + j) % 3)}"${(i + j) % 4 === 0 ? ` class="cv-blink" style="animation-delay:${((i + j) * 0.3).toFixed(1)}s"` : ""}/>`;
      }));
      [124, 150, 176].forEach((x, k) => {
        s += `<path class="cv-flow" style="animation-delay:-${(k * 0.3).toFixed(1)}s" d="M150 26L${x} 56" stroke="${W}" stroke-width="1.6" stroke-dasharray="3 6" fill="none"/>`;
      });
      s += `<circle class="cv-pulse" cx="150" cy="22" r="13" fill="${W}" fill-opacity=".85"/><text x="150" y="26.5" text-anchor="middle" font-size="12" font-weight="700" fill="#000" fill-opacity=".55" font-family="sans-serif">AI</text>`;
      return svg(s);
    },
    network() {
      const N = [[28, 34], [30, 98], [74, 64], [116, 26], [118, 104], [160, 62], [186, 24], [184, 106]];
      const L = [[0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [3, 4], [5, 6], [5, 7], [0, 3], [1, 4]];
      let s = "";
      L.forEach(([a, b], k) => {
        const d = `M${N[a][0]} ${N[a][1]}L${N[b][0]} ${N[b][1]}`;
        s += `<path d="${d}" stroke="${W}" stroke-opacity=".3" stroke-width="1.4"/>`;
        if (k % 2 === 0) s += `<path class="cv-flow" style="animation-delay:-${(k * 0.15).toFixed(2)}s" d="${d}" fill="none" stroke="${W}" stroke-width="2.2" stroke-dasharray="4 12" stroke-linecap="round"/>`;
      });
      N.forEach(([x, y], k) => {
        s += k === 2 || k === 5
          ? `<rect x="${x - 9}" y="${y - 7}" width="18" height="14" rx="3" fill="${W}" fill-opacity=".85"/><path d="M${x - 5} ${y}H${x + 5}M${x} ${y - 4}V${y + 4}" stroke="#000" stroke-opacity=".35" stroke-width="1.4"/>`
          : `<circle cx="${x}" cy="${y}" r="5.5" fill="${W}" fill-opacity=".3" stroke="${W}" stroke-width="1.4"/>`;
      });
      return svg(s);
    },
    // 행렬 = 변환: 기저 벡터 î·ĵ가 기울면 격자 전체가 따라 휜다
    matrix() {
      const cx = 128, cy = 74, u = 22; let s = "", g = "";
      range(9).forEach((k) => {
        const d = (k - 4) * u;
        s += `<path d="M${cx + d} 4V126M44 ${cy + d}H200" stroke="${W}" stroke-opacity=".1"/>`;
        g += `<path d="M${cx + d} -40V170M20 ${cy + d}H236" stroke="${W}" stroke-opacity=".38"/>`;
      });
      g += `<rect x="${cx}" y="${cy - u}" width="${u}" height="${u}" fill="${W}" fill-opacity=".25"/>`;
      g += `<path d="M${cx} ${cy}h${u - 3}" stroke="#7deaa0" stroke-width="2.4"/><path d="M${cx + u + 2} ${cy}l-6 -3.5v7Z" fill="#7deaa0"/>`;
      g += `<path d="M${cx} ${cy}v${3 - u}" stroke="#ff8a8a" stroke-width="2.4"/><path d="M${cx} ${cy - u - 2}l-3.5 6h7Z" fill="#ff8a8a"/>`;
      s += `<g class="cv-shear" style="transform-origin:${cx}px ${cy}px">${g}</g>`;
      return svg(s);
    },
    // 세금: 누진세율의 계단 위로 소득 막대가 차오르고, 옆의 원천징수 영수증에 줄이 그어진다
    brackets() {
      const steps = [[60, 6], [74, 15], [90, 24], [106, 35], [122, 38], [136, 42], [150, 45]]; let s = "";
      s += `<path d="M52 118H160M52 118V14" stroke="${W}" stroke-opacity=".45" stroke-width="1.1"/>`;
      let x0 = 52;
      steps.forEach(([x1, r], k) => {
        const h = r * 2.1;
        s += `<rect x="${x0 + 0.8}" y="${118 - h}" width="${x1 - x0 - 1.6}" height="${h}" fill="${W}" fill-opacity=".18" stroke="${W}" stroke-opacity=".55" stroke-width=".9"/>`;
        s += `<rect class="cv-blink" style="animation-delay:${(k * 0.22).toFixed(2)}s" x="${x0 + 0.8}" y="${118 - h}" width="${x1 - x0 - 1.6}" height="${h}" fill="#ffd27a" fill-opacity=".7"/>`;
        x0 = x1;
      });
      s += `<path class="cv-draw" pathLength="1" d="M54 112 C80 104 104 86 150 64" fill="none" stroke="${W}" stroke-width="1.8" stroke-dasharray="1"/>`;
      s += `<rect x="168" y="20" width="28" height="92" rx="3" fill="${W}" fill-opacity=".85"/>`;
      range(7).forEach((j) => { s += `<path d="M173 ${34 + j * 10}h${j % 3 === 2 ? 12 : 18}" stroke="#000" stroke-opacity=".28" stroke-width="1.6" stroke-linecap="round"/>`; });
      s += `<circle cx="188" cy="100" r="6" fill="none" stroke="#ff8a8a" stroke-width="1.6"/>`;
      return svg(s);
    },
    // 보험: 우산이 집들을 가리고, 우산 밖으로만 빗방울이 떨어진다
    house() {
      const r = rnd(7); let s = "";
      s += `<path d="M40 118H216" stroke="${W}" stroke-opacity=".4"/>`;
      [[52, 46], [74, 70], [168, 58], [192, 40]].forEach(([x, h]) => {
        s += `<rect x="${x}" y="${118 - h}" width="18" height="${h}" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-opacity=".6" stroke-width="1.1"/>`;
        range(Math.floor(h / 12)).forEach((j) => [0, 1].forEach((i) => {
          s += `<rect x="${x + 4 + i * 6}" y="${118 - h + 5 + j * 12}" width="3.5" height="5" fill="#ffe7a8" fill-opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`;
        }));
      });
      s += `<path d="M100 118V78l28 -24 28 24V118Z" fill="${W}" fill-opacity=".85"/>`;
      s += `<path d="M94 82l34 -30 34 30" fill="none" stroke="${W}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="M121 118V96h14V118Z" fill="#000" fill-opacity=".22"/>`;
      s += `<path d="M44 22C90 26 120 40 150 62S200 96 214 100" fill="none" stroke="#ffd27a" stroke-width="2" stroke-dasharray="4 4" stroke-opacity=".8"/>`;
      return svg(s);
    },
    // 경제 뉴스: 가운데 기준금리에서 물결이 퍼지고, 점선을 따라 대출·주가·집값·환율 칸으로 신호가 번진다
    ripple() {
      const cx = 68, cy = 66; let s = "";
      [0, 0.6, 1.2].forEach((d) => { s += `<circle class="cv-ping" style="animation-delay:${d}s;transform-box:fill-box;transform-origin:center" cx="${cx}" cy="${cy}" r="14" fill="none" stroke="${W}" stroke-opacity=".7"/>`; });
      const nodes = [[150, 22, "loan"], [176, 54, "stock"], [168, 92, "house"], [132, 116, "fx"]];
      nodes.forEach(([x, y]) => { s += `<path class="cv-flow" d="M${cx + 16} ${cy}L${x - 14} ${y}" stroke="${W}" stroke-opacity=".55" stroke-width="1.3" stroke-dasharray="3 3"/>`; });
      nodes.forEach(([x, y, k]) => {
        s += `<rect x="${x - 14}" y="${y - 11}" width="28" height="22" rx="5" fill="${W}" fill-opacity=".14" stroke="${W}" stroke-opacity=".6"/>`;
        if (k === "loan") s += `<text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="#ffe7a8">%</text>`;
        if (k === "stock") s += `<path d="M${x - 9} ${y + 5}l5 -5 4 3 8 -8" fill="none" stroke="#7deaa0" stroke-width="1.8" stroke-linejoin="round"/>`;
        if (k === "house") s += `<path d="M${x - 8} ${y + 6}V${y - 1}l8 -6 8 6V${y + 6}Z" fill="${W}" fill-opacity=".85"/>`;
        if (k === "fx") s += `<text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="11" font-weight="700" fill="#ffd27a">₩$</text>`;
      });
      s += `<circle cx="${cx}" cy="${cy}" r="15" fill="${W}" fill-opacity=".9"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle" font-size="12.5" font-weight="800" fill="#000" fill-opacity=".55">%</text>`;
      s += `<path d="M14 112H44M14 112V88" stroke="${W}" stroke-opacity=".35"/><path class="cv-draw" pathLength="1" stroke-dasharray="1" d="M16 106l7 -4 6 3 7 -9 7 2" fill="none" stroke="${W}" stroke-width="1.5" stroke-linejoin="round"/>`;
      return svg(s);
    },
    umbrella() {
      const r = rnd(5), cx = 128; let s = "";
      range(14).forEach((k) => {
        const x = 52 + k * 11 + r() * 4;
        if (Math.abs(x - cx) < 54) return;
        s += `<path class="cv-fall" style="animation-delay:${(r() * 1.8).toFixed(2)}s;animation-duration:${(1.4 + r() * 0.6).toFixed(2)}s" d="M${x.toFixed(1)} ${(8 + r() * 30).toFixed(1)}v9" stroke="#8ab4ff" stroke-width="1.6" stroke-linecap="round"/>`;
      });
      s += `<path d="M${cx - 52} 54Q${cx} -4 ${cx + 52} 54Q${cx + 39} 46 ${cx + 26} 54Q${cx + 13} 46 ${cx} 54Q${cx - 13} 46 ${cx - 26} 54Q${cx - 39} 46 ${cx - 52} 54Z" fill="${W}" fill-opacity=".85"/>`;
      s += `<path d="M${cx} 54V110q0 7 -7 7" fill="none" stroke="${W}" stroke-width="2.2" stroke-linecap="round"/>`;
      [-38, -19, 19, 38].forEach((dx, k) => {
        const x = cx + dx, h = 14 + (k % 2) * 4;
        s += `<path d="M${x - 8} 118V${118 - h}l8 -7 8 7V118Z" fill="${W}" fill-opacity=".28" stroke="${W}" stroke-opacity=".7" stroke-width="1.2"/>`;
      });
      s += `<path d="M44 118H212" stroke="${W}" stroke-opacity=".35"/>`;
      return svg(s);
    },
    // 디지털: CMOS 인버터(pMOS 위·nMOS 아래)와 뒤집혀 나오는 사각파
    digital() {
      let s = `<path d="M110 14V30M110 116V100M110 58V72M84 65H96M96 46V84" stroke="${W}" stroke-opacity=".7" stroke-width="1.6"/>`;
      s += `<path d="M98 14H122M98 116H122" stroke="${W}" stroke-width="2"/>`;
      s += `<rect x="102" y="30" width="16" height="28" rx="2" fill="${W}" fill-opacity=".22" stroke="${W}" stroke-opacity=".6"/>`;
      s += `<rect x="102" y="72" width="16" height="28" rx="2" fill="${W}" fill-opacity=".55" stroke="${W}" stroke-opacity=".6"/>`;
      s += `<path d="M110 65H124" stroke="${W}" stroke-opacity=".7" stroke-width="1.6"/>`;
      s += `<path class="cv-flow" d="M44 82H54V48H64V82H74V48H84" fill="none" stroke="${W}" stroke-opacity=".8" stroke-width="1.6" stroke-dasharray="5 4"/>`;
      s += `<path class="cv-flow" style="animation-delay:.2s" d="M124 48H140V82H158V48H172V82H190" fill="none" stroke="${W}" stroke-opacity=".8" stroke-width="1.6" stroke-dasharray="5 4"/>`;
      return svg(s);
    },
    // 기본: 다이 격자
    // 팔레트: 색상환 고리 위에 손잡이가 맥동하고, 가운데 같은 회색 두 칸이 서로 다른 바탕에 놓인다(ArtBook 색채)
    palette() {
      let s = "";
      const cx = 132, cy = 65, R = 48, r = 30, n = 18;
      range(n).forEach((i) => {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
        const p = (rr, a) => `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
        s += `<path d="M${p(r, a0)}L${p(R, a0)}A${R} ${R} 0 0 1 ${p(R, a1)}L${p(r, a1)}A${r} ${r} 0 0 0 ${p(r, a0)}Z" fill="hsl(${Math.round((i / n) * 360)} 70% 62%)" fill-opacity=".9"/>`;
      });
      s += `<circle class="cv-pulse" cx="${cx + ((R + r) / 2) * Math.cos(-0.5)}" cy="${cy + ((R + r) / 2) * Math.sin(-0.5)}" r="7" fill="none" stroke="${W}" stroke-width="2.4"/>`;
      s += `<rect x="${cx - 18}" y="${cy - 10}" width="18" height="20" fill="#2a2a2a"/><rect x="${cx}" y="${cy - 10}" width="18" height="20" fill="#e6e6e6"/>`;
      s += `<rect x="${cx - 13}" y="${cy - 5}" width="8" height="10" fill="#808080"/><rect x="${cx + 5}" y="${cy - 5}" width="8" height="10" fill="#808080"/>`;
      [0.92, 0.7, 0.48, 0.26].forEach((l, k) => { s += `<rect x="36" y="${22 + k * 22}" width="18" height="18" rx="3" fill="${W}" fill-opacity="${l}"/>`; });
      return svg(s);
    },
    // 황금 직사각형을 정사각형으로 나누고 나선을 잇는다, 초점이 맥동한다(ArtBook 구도)
    spiral() {
      const phi = (1 + Math.sqrt(5)) / 2, H = 96, Wd = H * phi, x0 = (200 - Wd) / 2, y0 = 17;
      let s = `<rect x="${x0.toFixed(1)}" y="${y0}" width="${Wd.toFixed(1)}" height="${H}" fill="none" stroke="${W}" stroke-opacity=".7"/>`, d = "";
      let x = x0, y = y0, w = Wd, h = H;
      range(8).forEach((i) => {
        const k = i % 4; let q, rx, ry, ex, ey;
        if (k === 0) { q = h; rx = x; ry = y; d += (i ? "" : `M${x} ${y + q}`) + ` A${q} ${q} 0 0 1 ${x + q} ${y}`; x += q; w -= q; }
        else if (k === 1) { q = w; rx = x; ry = y; d += ` A${q} ${q} 0 0 1 ${x + q} ${y + q}`; y += q; h -= q; }
        else if (k === 2) { q = h; rx = x + w - q; ry = y; d += ` A${q} ${q} 0 0 1 ${x + w - q} ${y + q}`; w -= q; }
        else { q = w; rx = x; ry = y + h - q; d += ` A${q} ${q} 0 0 1 ${x} ${y + h - q}`; h -= q; }
        s += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${q.toFixed(1)}" height="${q.toFixed(1)}" fill="none" stroke="${W}" stroke-opacity=".28"/>`;
      });
      s += `<path d="${d}" fill="none" stroke="#ffc46b" stroke-width="2"/>`;
      s += `<circle class="cv-pulse" cx="${(x0 + Wd * 0.618).toFixed(1)}" cy="${(y0 + H * 0.382).toFixed(1)}" r="5" fill="#ffc46b"/>`;
      return svg(s);
    },
    // 2점 투시 상자: 눈높이 위 두 소실점으로 모서리가 모인다(ArtBook 드로잉)
    vanish() {
      const hy = 52, L = [8, hy], R = [192, hy], t = [100, 22], b = [100, 112];
      const on = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
      const lt = on(t, L, 0.42), lb = on(b, L, 0.42), rt = on(t, R, 0.38), rb = on(b, R, 0.38);
      const P = (a) => `${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
      let s = `<line x1="0" x2="200" y1="${hy}" y2="${hy}" stroke="${W}" stroke-opacity=".55" stroke-dasharray="4 3"/>`;
      [t, b, lt, lb, rt, rb].forEach((p) => { const v = p[0] < 100 || p === t || p === b ? L : R; s += `<line x1="${p[0]}" y1="${p[1]}" x2="${v[0]}" y2="${v[1]}" stroke="${W}" stroke-opacity=".18"/>`; });
      [t, b].forEach((p) => { s += `<line x1="${p[0]}" y1="${p[1]}" x2="${R[0]}" y2="${R[1]}" stroke="${W}" stroke-opacity=".18"/>`; });
      s += `<path d="M${P(lt)}L${P(t)}L${P(rt)}L${P(rb)}L${P(b)}L${P(lb)}Z M${P(t)}L${P(b)}" fill="${W}" fill-opacity=".12" stroke="${W}" stroke-width="1.8" stroke-linejoin="round"/>`;
      s += `<circle class="cv-pulse" cx="${L[0]}" cy="${hy}" r="4" fill="#ffc46b"/><circle class="cv-pulse" style="animation-delay:.6s" cx="${R[0]}" cy="${hy}" r="4" fill="#ffc46b"/>`;
      return svg(s);
    },
    // 글자의 뼈대: 기준선·x높이·어센더 선 위의 큰 글자와 한글 한 자(ArtBook 타이포그래피)
    letter() {
      let s = "";
      [[30, ".35"], [52, ".55"], [96, ".8"], [112, ".35"]].forEach(([y, o]) => { s += `<line x1="10" x2="190" y1="${y}" y2="${y}" stroke="${W}" stroke-opacity="${o}" stroke-dasharray="${y === 96 ? "" : "3 3"}"/>`; });
      s += `<text x="22" y="96" font-family="Georgia, serif" font-size="86" fill="${W}" fill-opacity=".9">Ag</text>`;
      s += `<text x="122" y="96" font-family="sans-serif" font-weight="700" font-size="62" fill="#ffc46b">&#xD55C;</text>`;
      s += `<rect class="cv-pulse" x="118" y="40" width="66" height="60" fill="none" stroke="${W}" stroke-opacity=".6" stroke-dasharray="2 3"/>`;
      return svg(s);
    },
    // 연대표 위의 작품들: 시대마다 색과 크기가 다른 화면이 늘어선다(ArtBook 미술사)
    timeline() {
      let s = `<line x1="8" x2="192" y1="100" y2="100" stroke="${W}" stroke-opacity=".7"/>`;
      const F = [["#c9a227", 26, 34], ["#8a5a3c", 22, 30], ["#3f6e8c", 30, 24], ["#a8442e", 20, 28], ["#e2b04a", 28, 22], ["#4f8a62", 24, 30], ["#d06a8c", 22, 22]];
      let x = 12;
      F.forEach(([c, w, h], i) => {
        s += `<line x1="${x + w / 2}" x2="${x + w / 2}" y1="${96 - h}" y2="100" stroke="${W}" stroke-opacity=".3"/><rect x="${x}" y="${88 - h - (i % 2) * 14}" width="${w}" height="${h}" fill="${c}" fill-opacity=".85" stroke="${W}" stroke-opacity=".6"/>`;
        s += `<circle cx="${x + w / 2}" cy="100" r="2.5" fill="${W}"/>`;
        x += w + 4;
      });
      s += `<circle class="cv-pulse" cx="${12 + 26 + 4 + 22 + 4 + 15}" cy="100" r="6" fill="none" stroke="#ffc46b" stroke-width="2"/>`;
      return svg(s);
    },
    // 히스토그램과 조리개: 노출을 바꾸면 봉우리가 옮겨 간다(ArtBook 사진과 이미지)
    histogram() {
      let s = "";
      range(40).forEach((i) => {
        const u = i / 39, h = 70 * Math.exp(-((u - 0.42) ** 2) / 0.03) + 18 * Math.exp(-((u - 0.85) ** 2) / 0.004) + 4;
        s += `<rect x="${14 + i * 3.4}" y="${(108 - h).toFixed(1)}" width="2.6" height="${h.toFixed(1)}" fill="${W}" fill-opacity="${(0.35 + 0.5 * u).toFixed(2)}"/>`;
      });
      s += `<line x1="12" x2="152" y1="108" y2="108" stroke="${W}" stroke-opacity=".6"/>`;
      const cx = 172, cy = 40, R = 20; let d = "";
      range(6).forEach((k) => { const a = (k / 6) * Math.PI * 2, b = a + Math.PI / 3; d += `M${(cx + R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}L${(cx + 9 * Math.cos(b + 0.5)).toFixed(1)} ${(cy + 9 * Math.sin(b + 0.5)).toFixed(1)}`; });
      s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${W}" stroke-width="1.6"/><path class="cv-pulse" d="${d}" stroke="#ffc46b" stroke-width="1.6" fill="none"/>`;
      return svg(s);
    },
    // 브라우저 창 안의 열 그리드와 카드, 오른쪽 가장자리 손잡이가 맥동한다(ArtBook 웹)
    browser() {
      let s = `<rect x="22" y="14" width="156" height="102" rx="7" fill="none" stroke="${W}" stroke-opacity=".8" stroke-width="1.4"/><line x1="22" x2="178" y1="28" y2="28" stroke="${W}" stroke-opacity=".5"/>`;
      [0, 1, 2].forEach((i) => { s += `<circle cx="${31 + i * 7}" cy="21" r="2.2" fill="${W}" fill-opacity=".6"/>`; });
      range(12).forEach((i) => { s += `<rect x="${32 + i * 11.7}" y="34" width="8.5" height="76" fill="${W}" fill-opacity=".08"/>`; });
      s += `<rect x="32" y="38" width="138" height="10" rx="2" fill="#ffc46b" fill-opacity=".85"/>`;
      [0, 1, 2, 3].forEach((i) => { s += `<rect x="${32 + i * 35.1}" y="54" width="32" height="48" rx="3" fill="${W}" fill-opacity="${0.18 + i * 0.12}" stroke="${W}" stroke-opacity=".5"/>`; });
      s += `<circle class="cv-pulse" cx="178" cy="65" r="5" fill="none" stroke="#ffc46b" stroke-width="2"/>`;
      return svg(s);
    },
    // 사용자 흐름도와 줄어드는 퍼널(ArtBook 제품 디자인)
    userflow() {
      let s = "";
      const N = [[30, 30], [78, 30], [126, 30], [174, 30]];
      N.forEach(([x, y], i) => { s += `<rect x="${x - 16}" y="${y - 10}" width="32" height="20" rx="${i === 3 ? 10 : 3}" fill="${W}" fill-opacity="${i === 3 ? 0.85 : 0.18}" stroke="${W}" stroke-opacity=".7"/>`; if (i < 3) s += `<path class="cv-flow" d="M${x + 17} ${y}H${x + 31}" stroke="${W}" stroke-width="1.6" stroke-dasharray="4 3" fill="none"/>`; });
      [100, 82, 61, 46].forEach((w, i) => { s += `<rect x="${100 - w * 0.8}" y="${66 + i * 13}" width="${w * 1.6}" height="9" rx="2" fill="#ffc46b" fill-opacity="${0.95 - i * 0.15}"/>`; });
      return svg(s);
    },
    // 클립형 독서등의 측면도와 무게중심(ArtBook 산업디자인)
    lamp() {
      let s = `<line x1="20" x2="180" y1="112" y2="112" stroke="${W}" stroke-opacity=".5"/>`;
      s += `<rect x="70" y="92" width="44" height="20" rx="4" fill="${W}" fill-opacity=".2" stroke="${W}" stroke-opacity=".8"/>`;
      s += `<path d="M92 92 L112 40" stroke="${W}" stroke-width="5" stroke-linecap="round"/>`;
      s += `<rect x="100" y="28" width="62" height="14" rx="5" fill="${W}" fill-opacity=".85" transform="rotate(8 112 40)"/>`;
      s += `<path d="M118 44 L104 92 M150 50 L160 98" stroke="#ffc46b" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="3 3"/>`;
      s += `<circle class="cv-pulse" cx="100" cy="84" r="4.5" fill="#ffc46b"/><line x1="100" x2="100" y1="88" y2="112" stroke="#ffc46b" stroke-dasharray="2 2"/>`;
      return svg(s);
    },
    grid() {
      let s = "";
      range(4).forEach((j) => range(8).forEach((i) => { s += `<rect x="${36 + i * 20}" y="${14 + j * 26}" width="16" height="22" rx="2" fill="${W}" fill-opacity=".2" stroke="${W}" stroke-opacity=".4"/>`; }));
      return svg(s);
    },
  };

  // 이하는 SciBook(science-books) 서가 표지를 그대로 옮긴 것이다. 책 id를 motif로 쓰고, 움직임은 .sc-* 클래스가 맡는다.
  const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  // 함수 y=f(x)를 x0..x1 구간에서 꺾은선 점 목록으로 (B파처럼 비스듬히 누이려면 skew)
  const pts = (f, x0, x1, step = 2, skew = 0) => { const out = []; for (let x = x0; x <= x1; x += step) { const y = f(x); out.push(`${(x + (skew * (y - 68)) / 16).toFixed(1)},${y.toFixed(1)}`); } return out.join(" "); };
  const CYCLE = "M122 24Q134 48 156 54Q172 66 184 92Q160 88 142 78Q128 58 122 24Z";
  const CURVE = "M108 110L126 44Q132 36 144 33Q162 28 172 34Q182 42 186 56";
  const SCI = {
    // 삼각 플라스크와 피어오르는 기포, 옆에는 분자 고리
    "general-chemistry": () => svg(
      `<path d="M70 14h28M76 14v34l-30 58a6 6 0 0 0 5 9h66a6 6 0 0 0 5-9l-30-58V14" fill="none" stroke="${W}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M56 86h56l11 20a6 6 0 0 1-5 9H50a6 6 0 0 1-5-9z" fill="${W}" fill-opacity=".3"/>` +
      [[70, 98, 4, 0], [88, 92, 3, .5], [80, 76, 2.6, 1], [86, 58, 2.2, 1.4]].map(([x, y, r, d]) => `<circle class="sc-pulse" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${r}" fill="${W}"/>`).join("") +
      `<polygon points="${hex(158, 48, 20)}" fill="none" stroke="${W}" stroke-width="2.4" stroke-opacity=".85"/><circle cx="158" cy="48" r="10" fill="none" stroke="${W}" stroke-opacity=".5" stroke-width="1.6"/>` +
      `<path d="M158 28V12M175 58l12 7M141 58l-12 7" stroke="${W}" stroke-width="2" stroke-opacity=".6"/>`),
    // 행성 둘레를 도는 위성과 던진 공의 포물선
    "general-physics": () => svg(
      `<ellipse cx="100" cy="65" rx="58" ry="58" fill="none" stroke="${W}" stroke-opacity=".35" stroke-dasharray="3 5"/>` +
      `<circle cx="100" cy="65" r="22" fill="${W}" fill-opacity=".85"/><path d="M80 58q20 8 40 0M82 74q18 6 36 0" stroke="#0003" stroke-width="3" fill="none"/>` +
      `<g class="sc-spin"><circle cx="158" cy="65" r="5.5" fill="${W}"/><path d="M158 65v-26" stroke="${W}" stroke-width="2.2"/><path d="M154 44l4-7 4 7" fill="${W}"/></g>` +
      `<path class="sc-flow" d="M14 122q34-80 68 0" fill="none" stroke="${W}" stroke-width="2" stroke-dasharray="4 6" stroke-opacity=".7"/>`),
    // 골격 구조식: 벤젠 고리에 이어진 사슬과 굽은 전자 화살표
    "organic-chemistry": () => svg(
      `<polygon points="${hex(62, 70, 26)}" fill="none" stroke="${W}" stroke-width="3"/><circle cx="62" cy="70" r="14" fill="none" stroke="${W}" stroke-width="2" stroke-opacity=".7"/>` +
      `<path d="M84.5 57l22 13 22-13 22 13 22-13" fill="none" stroke="${W}" stroke-width="3" stroke-linejoin="round"/><path d="M128.5 57V34M126 57V34" stroke="${W}" stroke-width="2.4"/>` +
      `<text x="121" y="28" fill="${W}" font-size="13" font-weight="700" font-family="sans-serif">O</text>` +
      `<path class="sc-pulse" d="M150 88q14 22-12 26" fill="none" stroke="${W}" stroke-width="2.2"/><path d="M142 108l-6 6 9 2" fill="none" stroke="${W}" stroke-width="2.2"/>`),
    // 원기둥을 돌아 흐르는 유선
    "fluid-mechanics": () => svg(
      [-46, -30, -16, -6, 6, 16, 30, 46].map((d) => { const y = (65 + Math.sign(d) * Math.hypot(d, 22)).toFixed(1); return `<path class="sc-flow" d="M4 ${65 + d}C60 ${65 + d} 70 ${y} 100 ${y}S140 ${65 + d} 196 ${65 + d}" fill="none" stroke="${W}" stroke-width="2" stroke-dasharray="10 10" stroke-opacity="${(0.4 + 12 / (Math.abs(d) + 20)).toFixed(2)}"/>`; }).join("") +
      `<circle cx="100" cy="65" r="17" fill="${W}" fill-opacity=".85"/>`),
    // 수소 원자 에너지 준위: 위 준위에서 떨어지는 전자와 튀어나가는 광자, 위에는 파속
    "modern-physics": () => svg(
      [1, 2, 3, 4, 99].map((n) => { const y = (112 - 72 * (1 - 1 / (n * n))).toFixed(1); return `<path d="M16 ${y}h76" stroke="${W}" stroke-width="${n === 1 ? 3 : 2}" stroke-opacity="${n === 99 ? .35 : .85}"${n === 99 ? ' stroke-dasharray="3 4"' : ""}/>`; }).join("") +
      `<g class="sc-pulse"><path d="M54 52v52" stroke="${W}" stroke-width="2.2"/><path d="M48 98l6 10 6-10z" fill="${W}"/></g><circle cx="54" cy="48" r="4.5" fill="${W}"/>` +
      `<polyline points="${pts((x) => 82 - 8 * Math.sin((x - 64) / 4.2), 64, 186)}" fill="none" stroke="${W}" stroke-width="1.6" stroke-opacity=".3"/>` +
      `<polyline class="sc-run" pathLength="100" points="${pts((x) => 82 - 8 * Math.sin((x - 64) / 4.2), 64, 186)}" fill="none" stroke="${W}" stroke-width="2.6"/>` +
      `<polyline points="${pts((x) => 34 - 20 * Math.exp(-((x - 150) ** 2) / 420) * Math.cos((x - 150) / 3.4), 108, 192)}" fill="none" stroke="${W}" stroke-width="2" stroke-opacity=".8"/>` +
      `<path d="M108 34h84" stroke="${W}" stroke-opacity=".3" stroke-dasharray="2 4"/>`),
    // 원자 격자를 지나가는 격자 진동(포논)과 띠 간격을 뛰어넘는 전자
    "solid-state": () => svg(
      `<path d="${[0, 1, 2, 3].map((j) => `M18 ${28 + 24 * j}h112`).join("")}${[0, 1, 2, 3, 4, 5].map((i) => `M${20 + 22 * i} 26v76`).join("")}" stroke="${W}" stroke-opacity=".25" stroke-width="1.4"/>` +
      [0, 1, 2, 3, 4, 5].map((i) => `<g class="sc-sway" style="animation-delay:${(-i * 0.27).toFixed(2)}s">${[0, 1, 2, 3].map((j) => `<circle cx="${20 + 22 * i}" cy="${28 + 24 * j}" r="${(i + j) % 2 ? 4.2 : 6}" fill="${W}" fill-opacity="${(i + j) % 2 ? .6 : .95}"/>`).join("")}</g>`).join("") +
      `<rect x="148" y="18" width="44" height="26" rx="2" fill="${W}" fill-opacity=".18" stroke="${W}" stroke-width="2"/><rect x="148" y="84" width="44" height="26" rx="2" fill="${W}" fill-opacity=".7"/>` +
      `<path d="M140 46v36M137 49l3-5 3 5M137 79l3 5 3-5" fill="none" stroke="${W}" stroke-width="1.4" stroke-opacity=".6"/>` +
      `<path d="M170 80V48" stroke="${W}" stroke-width="1.6" stroke-dasharray="2 4" stroke-opacity=".6"/><circle class="sc-hop" cx="170" cy="78" r="4.5" fill="${W}"/>`),
    // 진행하는 평면 전자기파: 세로로 출렁이는 E, 비스듬히 누운 B
    electromagnetics: () => svg(
      `<defs><clipPath id="sc-em-clip"><rect x="10" y="0" width="180" height="130"/></clipPath></defs>` +
      `<path d="M10 68h182M186 63l8 5-8 5" fill="none" stroke="${W}" stroke-width="2" stroke-opacity=".7"/>` +
      `<g clip-path="url(#sc-em-clip)"><g class="sc-travel">` +
      `<path d="${Array.from({ length: 30 }, (_, i) => { const x = -46 + i * 8; return `M${x} 68V${(68 - 40 * Math.sin((x - 10) * Math.PI / 28)).toFixed(1)}`; }).join("")}" stroke="${W}" stroke-width="1.2" stroke-opacity=".35"/>` +
      `<polyline points="${pts((x) => 68 - 40 * Math.sin((x - 10) * Math.PI / 28), -46, 196)}" fill="none" stroke="${W}" stroke-width="2.6"/>` +
      `<polyline points="${pts((x) => 68 + 16 * Math.sin((x - 10) * Math.PI / 28), -46, 196, 2, 14)}" fill="none" stroke="${W}" stroke-width="2" stroke-opacity=".6" stroke-dasharray="4 3"/>` +
      `</g></g>` +
      `<text x="14" y="20" fill="${W}" font-size="13" font-weight="700" font-style="italic" font-family="serif">E</text><text x="14" y="118" fill="${W}" fill-opacity=".7" font-size="13" font-weight="700" font-style="italic" font-family="serif">B</text>`),
    // 쌓여 가는 히스토그램과 그 위의 정규 분포 곡선, 위에서 떨어지는 표본
    "probability-statistics": () => svg(
      Array.from({ length: 11 }, (_, i) => { const h = 76 * Math.exp(-((i - 5) ** 2) / (2 * 2.1 ** 2)); return `<rect class="sc-grow" style="animation-delay:${(-Math.abs(i - 5) * 0.25 - i * 0.07).toFixed(2)}s" x="${23 + i * 14}" y="${(112 - h).toFixed(1)}" width="12" height="${h.toFixed(1)}" fill="${W}" fill-opacity=".42"/>`; }).join("") +
      `<path d="M14 112h172" stroke="${W}" stroke-width="2.4"/>` +
      `<polyline points="${pts((x) => 112 - 82 * Math.exp(-((x - 100) ** 2) / (2 * 30 ** 2)), 14, 186)}" fill="none" stroke="${W}" stroke-width="2.6"/>` +
      `<path d="M100 30v82" stroke="${W}" stroke-opacity=".45" stroke-dasharray="3 4"/>` +
      [[86, 0], [100, .6], [114, 1.2], [93, 1.8]].map(([x, d]) => `<circle class="sc-fall" style="animation-delay:${d}s" cx="${x}" cy="14" r="3.2" fill="${W}"/>`).join("")),
    // 기체를 가둔 실린더와 피스톤, 옆에는 P–V 그림 위를 도는 열기관 순환
    "thermal-physics": () => svg(
      `<path d="M18 30v82h62V30" fill="none" stroke="${W}" stroke-width="3" stroke-linejoin="round"/>` +
      `<g class="sc-piston"><rect x="21" y="38" width="56" height="9" rx="1.5" fill="${W}"/><path d="M49 38V8" stroke="${W}" stroke-width="3.4"/></g>` +
      [[30, 66, 0], [52, 60, .3], [68, 74, .6], [38, 88, .9], [60, 94, .2], [28, 102, .5], [70, 102, .8], [48, 80, .4]].map(([x, y, d]) => `<circle class="sc-jit" style="animation-delay:-${d}s" cx="${x}" cy="${y}" r="3.2" fill="${W}" fill-opacity=".85"/>`).join("") +
      `<path class="sc-pulse" d="M28 124q4-6 0-10M44 124q4-6 0-10M60 124q4-6 0-10M76 124q4-6 0-10" fill="none" stroke="${W}" stroke-width="1.8" stroke-opacity=".7"/>` +
      `<path d="M106 10v100h88" fill="none" stroke="${W}" stroke-width="2" stroke-opacity=".7"/>` +
      `<path d="${CYCLE}" fill="${W}" fill-opacity=".14" stroke="${W}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<circle class="sc-fly" style="offset-path:path('${CYCLE}');animation-duration:4s;animation-timing-function:linear" r="4.5" fill="${W}"/>` +
      `<text x="110" y="18" fill="${W}" fill-opacity=".8" font-size="11" font-style="italic" font-family="serif">P</text><text x="184" y="124" fill="${W}" fill-opacity=".8" font-size="11" font-style="italic" font-family="serif">V</text>`),
    // 체심입방 단위 격자와 응력–변형률 곡선을 따라 끝내 끊어지는 시편
    "materials-science": () => svg(
      `<path d="M16 54h50v50H16zM38 36h50v50M16 54l22-18M66 54l22-18M66 104l22-18" fill="none" stroke="${W}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M38 36v50h50M16 104l22-18" fill="none" stroke="${W}" stroke-width="1.6" stroke-opacity=".45" stroke-dasharray="3 3"/>` +
      `<path d="M16 54L88 86M66 54L38 86M16 104L88 36M66 104L38 36" stroke="${W}" stroke-width="1" stroke-opacity=".25"/>` +
      [[16, 54], [66, 54], [16, 104], [66, 104], [38, 36], [88, 36], [38, 86], [88, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="${W}" fill-opacity="${x === 38 && y === 86 ? .55 : .95}"/>`).join("") +
      `<circle class="sc-pulse" cx="52" cy="70" r="7.5" fill="${W}"/>` +
      `<path d="M108 10v100h86" fill="none" stroke="${W}" stroke-width="2" stroke-opacity=".7"/>` +
      `<path d="${CURVE}" fill="none" stroke="${W}" stroke-width="2.6" stroke-linejoin="round"/><path d="M182 52l8 8M190 52l-8 8" stroke="${W}" stroke-width="2"/>` +
      `<path d="M126 44v66" stroke="${W}" stroke-opacity=".35" stroke-dasharray="2 4"/>` +
      `<circle class="sc-fly" style="offset-path:path('${CURVE}');animation-duration:3.4s" r="4.5" fill="${W}"/>` +
      `<text x="112" y="18" fill="${W}" fill-opacity=".8" font-size="11" font-style="italic" font-family="serif">σ</text><text x="184" y="124" fill="${W}" fill-opacity=".8" font-size="11" font-style="italic" font-family="serif">ε</text>`),
    // 블로흐 구 위에서 세차하는 스핀과, 장벽에 부딪혀 투과·반사로 갈라지는 파속
    "quantum-mechanics": () => svg(
      `<circle cx="50" cy="66" r="40" fill="none" stroke="${W}" stroke-width="2.4"/>` +
      `<ellipse cx="50" cy="66" rx="40" ry="11" fill="none" stroke="${W}" stroke-width="1.4" stroke-opacity=".45" stroke-dasharray="3 3"/>` +
      `<path d="M50 20v92" stroke="${W}" stroke-width="1.2" stroke-opacity=".4" stroke-dasharray="2 4"/>` +
      `<path d="M50 66L22 38M50 66L78 38" stroke="${W}" stroke-width="1.2" stroke-opacity=".35"/>` +
      `<ellipse cx="50" cy="38" rx="28" ry="7" fill="none" stroke="${W}" stroke-width="1.8" stroke-opacity=".7"/>` +
      `<circle class="sc-fly" style="offset-path:path('M22 38a28 7 0 1 0 56 0a28 7 0 1 0 -56 0');animation-duration:2.4s;animation-timing-function:linear" r="5" fill="${W}"/>` +
      `<circle cx="50" cy="66" r="3.4" fill="${W}"/>` +
      `<path d="M104 104h88" stroke="${W}" stroke-width="2" stroke-opacity=".7"/><rect x="146" y="48" width="7" height="56" fill="${W}" fill-opacity=".55"/>` +
      `<polyline points="${pts((x) => 82 - 26 * Math.exp(-((x - 124) ** 2) / 70) * Math.cos((x - 124) / 2.6), 104, 144, 1.5)}" fill="none" stroke="${W}" stroke-width="2.4"/>` +
      `<polyline class="sc-pulse" points="${pts((x) => 82 - 13 * Math.exp(-((x - 174) ** 2) / 60) * Math.cos((x - 174) / 2.6), 156, 194, 1.5)}" fill="none" stroke="${W}" stroke-width="2"/>`),
  };
  Object.assign(M, SCI);

  // MathBooks covers (math-books), MIT: linear, calculus, ode, numerical.
  const poly = (f, x0, x1, step = 2) => { const out = []; for (let x = x0; x <= x1 + 1e-9; x += step) out.push(`${+x.toFixed(1)},${+f(x).toFixed(1)}`); return out; };
  const MATH = {
    linear() {
      // 단위원이 대칭 행렬 [[2,1],[1,2]]로 타원이 된다. 화면 좌표(y 아래)에서는 matrix(2,-1,-1,2)이고,
      // 격자·단위원·벡터가 함께 변환되는 동안 두 고유벡터만 제 방향을 지킨 채 3배·1배로 늘어난다.
      const cx = 112, cy = 66, u = 20, c = Math.SQRT1_2, ns = ' vector-effect="non-scaling-stroke"';
      let s = "", g = "";
      range(11).forEach((k) => { const d = (k - 5) * u; s += `<path d="M${cx + d} -10V140M10 ${cy + d}H214" stroke="${W}" stroke-opacity=".08"/>`; });
      const ell = range(73).map((i) => { const t = (i / 72) * 2 * Math.PI, x = Math.cos(t), y = Math.sin(t); return `${(cx + u * (2 * x + y)).toFixed(1)},${(cy - u * (x + 2 * y)).toFixed(1)}`; }).join(" ");
      s += `<polygon points="${ell}" fill="${W}" fill-opacity=".1" stroke="${W}" stroke-opacity=".45" stroke-dasharray="3 3"/>`;
      s += `<path d="M${cx - 64 * c} ${cy + 64 * c}L${cx + 64 * c} ${cy - 64 * c}M${cx - 30 * c} ${cy - 30 * c}L${cx + 30 * c} ${cy + 30 * c}" stroke="${W}" stroke-opacity=".3" stroke-dasharray="5 4"/>`;
      range(5).forEach((k) => { const d = (k - 2) * u; g += `<path d="M${cx + d} ${cy - 2 * u}V${cy + 2 * u}M${cx - 2 * u} ${cy + d}H${cx + 2 * u}" stroke="${W}" stroke-opacity=".28"${ns}/>`; });
      g += `<circle cx="${cx}" cy="${cy}" r="${u}" fill="${W}" fill-opacity=".14" stroke="${W}" stroke-width="1.8"${ns}/>`;
      const arrow = (x, y, col, w = 2.6) => `<path d="M${cx} ${cy}L${x} ${y}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${ns}/><circle cx="${x}" cy="${y}" r="2.4" fill="${col}"/>`;
      g += arrow(cx + u * c, cy - u * c, "#ffd43b") + arrow(cx + u * c, cy + u * c, "#7deaa0") + arrow(cx + u, cy, W, 1.6);
      s += `<g class="mt-map" style="transform-origin:${cx}px ${cy}px">${g}</g>`;
      s += `<text x="${cx + 3 * u * c + 6}" y="${cy - 3 * u * c - 2}" fill="${W}" font-size="10" font-family="monospace">λ=3</text><text x="${cx + u * c + 8}" y="${cy + u * c + 12}" fill="${W}" font-size="10" font-family="monospace">λ=1</text>`;
      return svg(s);
    },
    calculus() {
      // 접선이 곡선을 따라 미끄러지며 기울기(f′)를 바꾸고, 그 아래 리만 합 막대가 차례로 넓이(∫)를 채운다.
      const f = (x) => 104 - 62 * Math.exp(-((x - 112) ** 2) / 1800) - 0.12 * (x - 40);
      let s = `<path d="M24 108H190M30 112V16" stroke="${W}" stroke-opacity=".45"/>`;
      s += `<polygon points="70,108 ${poly(f, 70, 132).join(" ")} 132,108" fill="${W}" fill-opacity=".1"/>`;
      range(8).forEach((i) => { const x = 70 + i * 8, y = f(x + 4); s += `<rect class="mt-sum" style="animation-delay:${(i * 0.18 - 1.6).toFixed(2)}s" x="${x}" y="${y.toFixed(1)}" width="7" height="${(108 - y).toFixed(1)}" fill="${W}" fill-opacity=".22"/>`; });
      const curve = poly(f, 30, 188);
      s += `<polyline points="${curve.join(" ")}" fill="none" stroke="${W}" stroke-width="2.4"/>`;
      // 수평 접선 조각을 곡선 경로 위에 얹고 offset-rotate:auto로 곡선 방향을 따라 돌린다.
      const track = "M" + poly(f, 40, 182).join("L");
      s += `<g class="mt-tangent" style="offset-path:path('${track}')"><path d="M-30 0H30" stroke="#ffd43b" stroke-width="2"/><circle r="3.4" fill="#ffd43b"/></g>`;
      s += `<text x="86" y="122" fill="${W}" font-size="10" font-family="monospace">∫f dx</text><text x="168" y="${(f(160) - 14).toFixed(1)}" fill="${W}" font-size="10" font-family="monospace">f′</text>`;
      return svg(s);
    },
    ode() {
      // 감쇠 진동자의 방향장과 궤적: x′ = y, y′ = −x − 0.35y. 점이 방향장을 따라 평형점으로 감겨 들어간다.
      const cx = 100, cy = 65, k = 13 * 1.25; let s = "";
      for (let i = -6; i <= 6; i++) for (let j = -4; j <= 4; j++) {
        const x = i * 0.6, y = j * 0.6, dx = y, dy = -x - 0.35 * y, n = Math.hypot(dx, dy) || 1;
        const px = cx + x * k, py = cy - y * k, L = 5;
        s += `<path d="M${(px - L * dx / n).toFixed(1)} ${(py + L * dy / n).toFixed(1)}L${(px + L * dx / n).toFixed(1)} ${(py - L * dy / n).toFixed(1)}" stroke="${W}" stroke-opacity=".32" stroke-width="1.2"/>`;
      }
      let x = 3.2, y = 0; const path = [];
      for (let n = 0; n < 900; n++) { if (n % 3 === 0) path.push(`${(cx + x * k).toFixed(1)},${(cy - y * k).toFixed(1)}`); const dx = y, dy = -x - 0.35 * y; x += dx * 0.02; y += dy * 0.02; }
      const d = "M" + path.join("L");
      s += `<path d="${d}" fill="none" stroke="#ffd43b" stroke-opacity=".3" stroke-width="1.6"/>`;
      s += `<path class="mt-trace" style="animation-delay:-4.6s" pathLength="1" stroke-dasharray="1" d="${d}" fill="none" stroke="#ffd43b" stroke-width="2.2"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="2.6" fill="${W}"/>`;
      s += `<circle class="mt-ride" style="offset-path:path('${d}');animation-delay:-4.6s" r="3.4" fill="#ffd43b"/>`;
      return svg(s);
    },
    numerical() {
      // 뉴턴 방법으로 √2 찾기: f(x) = x² − 2의 접선이 x축과 만나는 곳이 다음 근삿값이다. 2.8 → 1.76 → 1.45 → 1.414.
      const X = (x) => 30 + 66 * (x - 0.6), Y = (v) => 92 - 11 * v, f = (x) => x * x - 2;
      let s = `<path d="M22 ${Y(0)}H194M${X(0.8)} 124V10" stroke="${W}" stroke-opacity=".45"/>`;
      s += `<polyline points="${range(48).map((i) => { const x = 0.6 + i * 0.05; return `${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`; }).join(" ")}" fill="none" stroke="${W}" stroke-width="2.4"/>`;
      let x = 2.8; const zig = [[X(x), Y(0)]], xs = [x];
      for (let n = 0; n < 3; n++) { const nx = x - f(x) / (2 * x); zig.push([X(x), Y(f(x))], [X(nx), Y(0)]); x = nx; xs.push(x); }
      const d = "M" + zig.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join("L");
      // 접선은 곡선 위 점에서 x축 너머까지 조금 더 그어 둔다.
      xs.slice(0, 3).forEach((x0) => { const m = 2 * x0, x1 = x0 - f(x0) / m - 0.25; s += `<path d="M${X(x0).toFixed(1)} ${Y(f(x0)).toFixed(1)}L${X(x1).toFixed(1)} ${Y(f(x0) + m * (x1 - x0)).toFixed(1)}" stroke="${W}" stroke-opacity=".3"/>`; });
      s += `<path d="${d}" fill="none" stroke="#ffd43b" stroke-opacity=".3" stroke-width="1.4"/>`;
      s += `<path class="mt-trace" style="animation-delay:-4.6s" pathLength="1" stroke-dasharray="1" d="${d}" fill="none" stroke="#ffd43b" stroke-width="2" stroke-linejoin="round"/>`;
      xs.forEach((x0, i) => { s += `<circle cx="${X(x0).toFixed(1)}" cy="${Y(0)}" r="${i === 3 ? 3.2 : 2}" fill="${i === 3 ? "#7deaa0" : W}"/>`; });
      s += `<circle class="mt-ride" style="offset-path:path('${d}');animation-delay:-4.6s" r="3.4" fill="#ffd43b"/>`;
      s += `<text x="${X(Math.SQRT2) - 10}" y="${Y(0) + 15}" fill="${W}" font-size="10" font-family="monospace">√2</text>`;
      s += `<text x="${X(xs[0]) - 8}" y="${Y(0) + 15}" fill="${W}" fill-opacity=".8" font-size="9" font-family="monospace">x₀</text>`;
      s += `<text x="${X(0.8) + 6}" y="20" fill="${W}" fill-opacity=".85" font-size="10" font-family="monospace">x−f/f′</text>`;
      return svg(s);
    },
  };
  Object.assign(M, MATH);
  // ConstructionBooks covers (construction-books), MIT: beam, concrete, soil, tower, rebar, bridge, crane, bim.
  const CY = "#ffd43b";
  const cf = (v) => +v.toFixed(1);
  const CONSTRUCTION = {
    // 구조역학: 등분포 하중이 내리누르는 단순보와 그 아래 포물선 휨모멘트도(wL²/8).
    beam() {
      const x0 = 22, x1 = 178, y = 58;
      let s = `<g class="cs-press">`;
      range(9).forEach((i) => { const x = cf(x0 + ((x1 - x0) * i) / 8); s += `<path d="M${x} 22V${y - 6}" stroke="${W}" stroke-width="1.6"/><path d="M${x - 3.5} ${y - 9}L${x} ${y - 3}L${x + 3.5} ${y - 9}" fill="${W}"/>`; });
      s += `<path d="M${x0} 22H${x1}" stroke="${W}" stroke-width="1.6"/></g>`;
      s += `<path d="M${x0} ${y}H${x1}" stroke="${W}" stroke-width="4.5" stroke-linecap="round"/>`;
      s += `<path d="M${x0} ${y + 2}l-8 13h16z" fill="none" stroke="${W}" stroke-width="1.8"/><path d="M${x1} ${y + 2}l-8 11h16z" fill="none" stroke="${W}" stroke-width="1.8"/><circle cx="${x1 - 4}" cy="${y + 16}" r="2.4" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="${x1 + 4}" cy="${y + 16}" r="2.4" fill="none" stroke="${W}" stroke-width="1.4"/>`;
      const pts = range(41).map((i) => { const t = i / 40, x = x0 + (x1 - x0) * t; return `${cf(x)},${cf(y + 24 + 34 * 4 * t * (1 - t))}`; }).join(" ");
      s += `<path d="M${x0} ${y + 24}H${x1}" stroke="${W}" stroke-opacity=".45"/>`;
      s += `<polygon class="cs-bmd" points="${x0},${y + 24} ${pts} ${x1},${y + 24}" fill="${CY}" fill-opacity=".28" stroke="${CY}" stroke-width="2"/>`;
      s += `<text x="100" y="${y + 52}" text-anchor="middle" fill="${W}" font-size="10" font-family="monospace">M = wL²/8</text>`;
      return svg(s);
    },
    // 건설재료: 공시체 압축 시험. 위아래 가압판이 누르고 원기둥에 사선 균열이 번쩍인다.
    concrete() {
      let s = `<g class="cs-squeeze"><rect x="62" y="12" width="76" height="9" rx="2" fill="${W}" fill-opacity=".85"/><path d="M100 2V12" stroke="${W}" stroke-width="3"/></g>`;
      s += `<rect x="62" y="110" width="76" height="9" rx="2" fill="${W}" fill-opacity=".85"/>`;
      s += `<rect x="72" y="22" width="56" height="88" rx="4" fill="${W}" fill-opacity=".1" stroke="${W}" stroke-width="2"/>`;
      const rnd = ((seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(7);
      range(26).forEach(() => { const x = 76 + rnd() * 48, y = 27 + rnd() * 78, r = 1.4 + rnd() * 3; s += `<circle cx="${cf(x)}" cy="${cf(y)}" r="${cf(r)}" fill="${W}" fill-opacity="${cf(0.25 + rnd() * 0.35)}"/>`; });
      s += `<path class="cs-crack" d="M84 30L96 52L90 66L104 88L100 104M118 34L108 58L116 78" fill="none" stroke="${CY}" stroke-width="2" stroke-linejoin="round"/>`;
      s += `<text x="150" y="70" fill="${W}" font-size="10" font-family="monospace">f<tspan font-size="7" dy="2">ck</tspan></text>`;
      return svg(s);
    },
    // 지반공학: 흙의 층 위에 놓인 기초가 내려앉고, 그 아래로 압력 구근이 퍼진다.
    soil() {
      let s = "";
      [56, 76, 98].forEach((y, k) => { s += `<path d="M8 ${y}${range(8).map((i) => `Q${12 + i * 24} ${y - 4 + (k % 2) * 3} ${20 + i * 24} ${y}`).join("")}" fill="none" stroke="${W}" stroke-opacity="${0.55 - k * 0.12}" stroke-width="1.4"/>`; });
      const rnd = ((seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(3);
      range(40).forEach(() => { s += `<circle cx="${cf(10 + rnd() * 180)}" cy="${cf(60 + rnd() * 64)}" r="${cf(0.8 + rnd() * 1.4)}" fill="${W}" fill-opacity=".35"/>`; });
      [[16, 10], [30, 19], [46, 30]].forEach(([ry, dy], k) => { s += `<ellipse class="cs-bulb" style="animation-delay:${-k * 0.5}s" cx="100" cy="${52 + dy}" rx="${cf(ry * 1.25)}" ry="${ry}" fill="none" stroke="${CY}" stroke-width="1.6" stroke-opacity="${0.9 - k * 0.22}"/>`; });
      s += `<g class="cs-settle"><rect x="78" y="34" width="44" height="18" fill="${W}" fill-opacity=".9"/><path d="M100 4V30" stroke="${W}" stroke-width="2.4"/><path d="M95 24L100 33L105 24" fill="${W}"/></g>`;
      s += `<path d="M8 52H78M122 52H192" stroke="${W}" stroke-width="2"/>`;
      return svg(s);
    },
    // 건축구조: 바람을 받아 흔들리는 고층 라멘 골조와 코어.
    tower() {
      let s = `<g class="cs-wind">`;
      [30, 52, 74].forEach((y, k) => { s += `<path d="M6 ${y}H44" stroke="${W}" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="7 5"/><path d="M40 ${y - 4}L47 ${y}L40 ${y + 4}" fill="none" stroke="${W}" stroke-opacity=".6" stroke-width="1.6"/>`; });
      s += `</g><g class="cs-sway">`;
      const xs = [70, 100, 130], ys = range(11).map((i) => 120 - i * 10.5);
      ys.forEach((y) => { s += `<path d="M70 ${cf(y)}H130" stroke="${W}" stroke-width="1.6"/>`; });
      xs.forEach((x) => { s += `<path d="M${x} 120V${cf(ys[10])}" stroke="${W}" stroke-width="2.2"/>`; });
      s += `<rect x="92" y="${cf(ys[10])}" width="16" height="${cf(120 - ys[10])}" fill="${CY}" fill-opacity=".3" stroke="${CY}" stroke-width="1.4"/>`;
      s += `</g><path d="M50 121H150" stroke="${W}" stroke-width="2.4"/>`;
      s += `<path d="M152 120Q160 70 172 18" fill="none" stroke="${W}" stroke-opacity=".5" stroke-dasharray="3 3"/><text x="156" y="12" fill="${W}" font-size="9" font-family="monospace">Δ</text>`;
      return svg(s);
    },
    // 철근콘크리트: 보 단면의 철근·스터럽과 압축측 등가 응력 블록.
    rebar() {
      let s = `<rect x="56" y="12" width="64" height="106" rx="2" fill="${W}" fill-opacity=".1" stroke="${W}" stroke-width="2.2"/>`;
      s += `<rect x="63" y="19" width="50" height="92" rx="5" fill="none" stroke="${W}" stroke-width="1.6" stroke-opacity=".8"/>`;
      [70, 82, 94, 106].forEach((x) => { s += `<circle cx="${x}" cy="103" r="4.6" fill="${W}"/>`; });
      s += `<circle cx="70" cy="27" r="3" fill="${W}" fill-opacity=".8"/><circle cx="106" cy="27" r="3" fill="${W}" fill-opacity=".8"/>`;
      s += `<path d="M132 12V118" stroke="${W}" stroke-opacity=".5"/>`;
      s += `<rect class="cs-block" x="132" y="12" width="30" height="30" fill="${CY}" fill-opacity=".35" stroke="${CY}" stroke-width="1.6"/>`;
      s += `<path d="M132 103H176" stroke="${W}" stroke-width="2"/><path d="M170 99L177 103L170 107" fill="${W}"/>`;
      s += `<text x="140" y="56" fill="${W}" font-size="9" font-family="monospace">0.85f<tspan font-size="6.5" dy="2">ck</tspan></text><text x="150" y="96" fill="${W}" font-size="9" font-family="monospace">T</text>`;
      return svg(s);
    },
    // 교량: 사장교. 주탑에서 내려온 케이블이 상판을 잡고, 차 한 대가 건너간다.
    bridge() {
      let s = `<path d="M4 92H196" stroke="${W}" stroke-width="4" stroke-linecap="round"/>`;
      s += `<path d="M100 92V14M100 92V122" stroke="${W}" stroke-width="5"/>`;
      range(6).forEach((i) => { const d = 14 + i * 14; s += `<path d="M100 ${20 + i * 4}L${100 - d * 1.15} 92M100 ${20 + i * 4}L${100 + d * 1.15} 92" stroke="${W}" stroke-width="1.2" stroke-opacity=".85"/>`; });
      s += `<path d="M4 118Q50 108 100 118T196 118" fill="none" stroke="${W}" stroke-opacity=".35" stroke-width="1.4"/>`;
      s += `<g class="cs-drive"><rect x="8" y="80" width="20" height="9" rx="3" fill="${CY}"/><circle cx="13" cy="90" r="2.4" fill="${W}"/><circle cx="23" cy="90" r="2.4" fill="${W}"/></g>`;
      return svg(s);
    },
    // 시공: 타워크레인의 트롤리가 지브를 오가고 갈고리가 부재를 들어 올린다.
    crane() {
      let s = `<path d="M58 124V22M70 124V22" stroke="${W}" stroke-width="2"/>`;
      range(10).forEach((i) => { const y = 124 - i * 10.2; s += `<path d="M58 ${cf(y)}L70 ${cf(y - 10.2)}M70 ${cf(y)}L58 ${cf(y - 10.2)}" stroke="${W}" stroke-width="1" stroke-opacity=".7"/>`; });
      s += `<path d="M30 22H190M30 30H190" stroke="${W}" stroke-width="2"/>`;
      range(16).forEach((i) => { const x = 30 + i * 10; s += `<path d="M${x} 30L${x + 10} 22" stroke="${W}" stroke-width="1" stroke-opacity=".7"/>`; });
      s += `<path d="M64 22L64 6L30 22M64 6L190 22" stroke="${W}" stroke-width="1.2" stroke-opacity=".8"/>`;
      s += `<rect x="30" y="32" width="18" height="12" fill="${W}" fill-opacity=".8"/>`;
      s += `<g class="cs-trolley"><rect x="118" y="30" width="12" height="5" fill="${W}"/><path class="cs-hoist" d="M124 35V78" stroke="${W}" stroke-width="1.2"/><g class="cs-load"><path d="M118 80H130L124 74z" fill="${W}"/><rect x="104" y="80" width="40" height="7" fill="${CY}"/></g></g>`;
      s += `<path d="M20 125H180" stroke="${W}" stroke-width="2.4"/>`;
      return svg(s);
    },
    // BIM·디지털 건설: 아이소메트릭 건물 모델의 층이 차례로 켜지고 스캔선이 지나간다.
    bim() {
      const iso = (x, y, z) => [100 + (x - y) * 0.87 * 1, 104 + (x + y) * 0.5 - z];
      const P = (x, y, z) => iso(x, y, z).map(cf).join(",");
      let s = "";
      const w = 44, d = 34;
      range(5).forEach((k) => {
        const z = k * 16;
        s += `<polygon class="cs-floor" style="animation-delay:${k * 0.35}s" points="${P(0, 0, z)} ${P(w, 0, z)} ${P(w, d, z)} ${P(0, d, z)}" fill="${CY}" fill-opacity=".12" stroke="${W}" stroke-width="1.3"/>`;
      });
      [[0, 0], [w, 0], [w, d], [0, d]].forEach(([x, y]) => { s += `<path d="M${P(x, y, 0)}L${P(x, y, 64)}" stroke="${W}" stroke-width="1.8"/>`; });
      s += `<polygon points="${P(14, 10, 0)} ${P(28, 10, 0)} ${P(28, 22, 0)} ${P(14, 22, 0)}" fill="${W}" fill-opacity=".25"/>`;
      s += `<path class="cs-scan" d="M18 70H182" stroke="${CY}" stroke-width="2" stroke-opacity=".9"/>`;
      s += `<text x="150" y="18" fill="${W}" font-size="9" font-family="monospace">IFC</text>`;
      return svg(s);
    },
  };
  Object.assign(M, CONSTRUCTION);

  // skeleton 표지의 몸·뼈·CT 단면 좌표. node tools/anatomy-cover.mjs가 이 줄을 다시 쓴다(직접 고치지 않음).
  // Data: BodyParts3D, © The Database Center for Life Science, CC BY 4.0.
  const ANATOMY = {"q":0.5,"fig":[17.1,62.9],"panel":[78,34,118,62],"skin":"M34 138l3-8 4-5 1-6 0-18 5-28 0-11 1-4 4-4 15-7 4-3 1-6-3-15 1-5 2-3 4-3 7 0 5 4 3 4-1 7-2 11 0 5 2 2 5 3 13 6 4 6 1 13 5 29 0 16 1 7 4 5 3 8-2 1-2-3 2 10-1 1-2-1-2-6 0 8-2-1-1-6-1 4 0 2-2-1-1-6-1 5-1-1 1-18-6-20-1-13-3-7-2 17 4 19 0 19-2 23-3 15 1 20-5 35 1 4 4 5 4 2 1 2-2 1-13 0-4-2 1-24-3-24 1-9-2-9 0-14-1-23-1 0-2 23 0 13-2 10 1 10-3 23 1 24-1 1-3 1-13 0-2-1 1-2 4-2 3-5 2-7-5-33 1-19-3-15-2-23 0-19 4-19-2-17-2 7-2 12-6 21 1 18-1 1-1-5-1 6-2 1 0-2-1-4-1 6-2 1 0-8-2 6-2 1-1-1 2-10-3 3z","bones":"M70 26l0-7 2-3 4-3 7 0 5 3 2 3 0 7-1 6-2 2-1 5-1 2-3 1-4 0-3-1-2-7-2-2zM76 36l2 2 4 0 3-4-2 2zM72 117l0-5 1-2 3 2 0-2-3-3 3 1 1-2-3-2 2 0 1-2-2-1 0-1 2 0 0-3-3 0 3-1 0-2-2-1 2-1 0-6-1-1 2-1-1-2-1 0 1-4-2-1 3-1-1-2-1 0 0-1 2-1-1-2-2 0 2-1 1-2-3-1 0-2 3 0 0-1-3-2 3-1-3-3 3 0-2-2 0-1 2 0-1-1-2-1 2-2-2-1 1-3 0-6 1-3 1-1-4-1 4-1 5 0 3 2-4 0 2 4-1 5 2 4-2 2 2 0 0 1-3 2 2 0 0 1-2 2 2 0 1 1-2 1-1 1 3 1 0 1-3 1 0 1 3 0 0 2-2 0-1 2 3 1 0 1-2 0-1 2 2 1 0 1-1 0-1 2 3 1-2 1 1 4-1 1 1 2-1 0 0 7 2 0 0 1-2 1 0 2 2 1-2 1 0 2 2 0 0 1-2 1 1 2 2 0-3 2 1 2 3-1-3 3 0 2 2-2 1 1 1 5-4 7-3 2 1 2-2 3-2-3 1-2zM61 80l2-11 2-9 4-6 6-5 3 1 0 1-2 0 2 1 0 1-5 0 0 1 4 0 3 2 2-1 0-1 4 0 0-1-4 0 0-1 2-1-2 0 0-1 3-1 8 6 4 13 2 12-1 3 0 4-2 10 0-4-13-13-2-3-1 0-1-1-2 4-13 13 0 4-1-2-1-12zM97 81l0-2-1 1zM97 84l-1 1 1 1zM97 75l0-2-1 1zM94 86l-2 0 4 5 1-1-2 0 1-3zM96 68l-1-1-1 1 2 2zM92 76l2 1 2 0-2-2zM91 70l3 2 1-1-2-2zM92 81l2 2 1-1-1-2zM90 66l2 1 2-1-2-1zM93 60l0-2-1 1zM91 60l-2 2 2 0 2-1zM88 76l-4-3 3 4 4 1zM83 70l4 4 4 0zM88 57l2 1 1-1-2-1zM83 67l3 2 4-1-3-1zM84 63l-1 0 2 1 4 0-3-1zM84 59l-1 1 2 1 4-2-3 0zM82 56l1 1 3-1zM74 56l2 1 2-1zM71 64l7 0 0-1-4 0zM70 68l4 1 3-2-4 0zM73 71l-4 3 6-2 2-2zM71 59l3 1 3 0-3-2zM69 78l3 0 5-5zM69 83l3-1 1-2zM69 57l1 1 2-1-1-1zM66 66l2 1 2-1-2-1zM69 62l1 0-1-2-2 1zM65 71l1 1 3-2-2-1zM65 90l-2-1 1 2 4-5-3 0-1 1zM64 77l2 1 2-2-2-1zM67 60l1-1-1-1zM65 82l1 1 2-2-2-1zM63 86l1-1-1-1zM63 79l0 2 1-1zM82 85l1-2 1 1 5 4 5 7 1 3-1 1-2-5zM82 88l6 4 4 6-5-5-4-3zM65 98l1-3 4-7 7-5 1 2-6 4-6 8 0 2zM68 98l4-6 6-4-1 2-4 3zM36 138l2-7 5-4-1-1 2-7 3-21 0-2 3 0-2-1-1-3 4-12 4-26 2 0 1-2 2 1 0-1 1-1 5 1 5 2 7 0 1 2-1 2-7-2 1 3 0 6-2 5-3 5-2-2-3-10-2-3-1 0-2 2-2 11-2 15 3 5-1 2-2 0-1 4-4 26-1 2 1 1 0 1 1 8 1 7-2-3-1-10-1 15-1-1 0-14-3 17-1-2 2-15-2 8-3 7-1 0 1-1 4-15-3 2-2 5-1 2zM61 53l4 1 1 2 2-1-1-1zM46 125l2-6 1-17-3 15zM81 56l1-2 7 0 8-3 3 0-1 2 1-1 2 0 1 2 2 0 4 27 4 12-1 2-2 1 3 0 0 3 5 27-1 0 6 5 2 7-2-1-3-6-2-1 0 2 5 14-4-7-2-8 1 17-2-9-1-8 0 15-1-1-1-2 0-12-2 12-1 1 1-7 2-8-1-1 1-1-1-2-3-26-2-4-2-2 2-5-2-17-3-10-1-1-2 2-4 11-2 2-2-3-2-6-1-7 1-3-4 0-3 2zM114 125l0-9-2-14 0 16zM94 54l-2 0 2 2 2-2 3-1zM80 128l1-1 3-1 4-4 0-3-2 0 0-3-1-2 3-6 3-2 3 0 4 1 2 3 0 1-5 11-4 6-1 5-5 1-3-3zM84 129l0 1 2 1 1-4zM60 111l2-3 2-2 5 0 3 2 3 6-1 2 0 3-2 0 0 3 3 4 5 1-1 3-2 3-4 1-3-2-1-4-4-6zM73 128l1 3 2-1-1-2-2-1zM57 247l5-2 4-5-1-47-1-3 2-4-1-3 1-5 0-9-4-31-3-8 2-4 3 0 2-3 2 0 3 1 0 2-3 5-1 4-1 2 2 17 4 20 1 4 3 4-1 3-1 2 1 1-3 7-1 7 0 25 1 5 2 4-2 5 2 4-1 1-1 1-2-1-1-1-1 1-1 1zM84 182l4-6 2-10 4-29-1-1 0-5-4-5 1-2 3-1 1 1 2 2 3 0 2 4-3 9-4 30 0 9 2 5-2 3 3 4-2 4-1 42 0 4 5 5 4 2-9 0-2-1 0-1-2 2-4-1 1-3 1-2-2-5 2-4 1-6 0-24-1-7-3-6 2-2-2-1zM78 27l-1-1-2 0-1 1-1 2 1 1 1 1 2 0 1-1 1-1zM86 27l-1-1-2 0-1 1-1 2 1 1 1 1 2 0 1-1 1-1z","slices":[{"z":1560,"y":11.6,"layers":[[0.24,"M260 96l-6 6-3 5-7 26-1 11 3 11 7 12 7 5 10 3 18-2 6-4 5-8 4-6 2-11-2-16-6-21-6-9-9-4-15-1z"],[0.96,"M264 97l-4 1-3 3-6 10 0 4-5 12-2 15 3 12 4 7 5 6 3 3 2-1-1 2 14 1 13-1 1 0 0-1 1 1 2-2 7-9 5-15 1-4-1-6-5-19 0-6-8-10-4-3-8-2zM261 169l-7-7-4-7-4-9-1-10 4-14 2-5 2-1 0-6 2-4 5-5 7-4 4 0 3 2 4-2 5 1 6 3 7 8-1 6 1 2 1-1 0 1 2 5 1 6 3 7 0 5-2 8-3 8-4 6-6 7-4 1-14 0-7 1-1-1-1 0 1 0-1-1 0 1z"],[0.5,"M265 103l6-2 1 1-2 3 2 2-4 1 2-3 0-2-6 8-1 4-2 0-2-5 3-1-3 0 0-3 1 0-4 1-2 5-1 9 3 1 4-3-3 3 0 4 1 8 2 3 1-15 2-2-1-2 4 1 5-5-3-2 1-4 0 2 4-1-1-9-4-1zM257 113l2 4-2-2-1 1 1-6zM269 110l3 5 0-5zM271 122l1 4 2-7-6-3zM266 122l1 5-5 10-1-4-1 6-5-10-3-1 1 2-2 3 1 4-2 1 2 2-2 2 7 2 1 2-5 2 6 3-10-2 0 2 9 13 4 2 0-3 1 2 5 0-1 2 1 2 6-4-1-16-9 2-2-3 0-4 5-13 3-3-4-10zM257 154l0 2 2 0-1 5 2 2-2-2 0-4-4-2 2-2-3-1 6 0zM261 157l4 4 2-2 2 2-1-1-3 3zM272 157l-3 3-4-3 1-2 2 3zM275 134l0-4-2 0 0 3zM264 142l1 3 2 0 3-3 0-3zM276 100l0 15 4-6-2 5 2 0 2 5-4 8 4 4 4 13-2 6-9-1 0 17 5 3 3-1-1-2 3-1 1-3 1 4 5-4 8-12-11 1 6-4-4-1 0-2 7-2-2-2 2-1-3-9 1-2-3 0-4 10-2 0 0-3 1 2 2-1 2-6-1-8-3-3 6 3 2-2-4-13-4-1 1 3-3 0 3 1-2 5-2 0 0-4-5-7-2-2 0 3-2-3 4-1 3 2-2-4zM286 136l-4-13 0-4 4-2 1 0-2 3 3 6-1 8 0-2zM291 113l0-3 1 6-1-1-2 2zM280 107l-4 0 2-2zM281 158l-1 1 2 2-3-1-2-3zM289 159l0-3 2-2-2-3 8 1-5 1 2 2-5 2 2 4zM275 119l1 7 4-10zM278 141l4 4 2-1-3-5-3 0z"],[0.34,"M279 116l-4 3 0 7 5-10zM268 116l5 10 1-6-3-4zM273 130l0 4 2 0 0-4zM271 139l-4 0-3 3 1 3 5-3zM278 139l1 4 4 2 1-3-3-3z"]]},{"z":1220,"y":34.9,"layers":[[0.24,"M180 140l0 11 7 8 5 4 6 1 5 1 5-2 7 9 7 5 8 4 9 1 15-1 20-7 24 8 10 0 10-1 13-7 9-11 9 2 11-5 6-5 3-10-2-10-4-8-9-8-5-1-9 0-5-15-9-14-14-7-19-4-9 1-10 3-14-4-9 0-15 4-10 4-5 5-6 8-7 19-9 0-7 2-8 9z"],[0.03,"M300 99l-4 4-8 29-1 12 2 7 9 5 5-1 8-4 8-16 1-6 0-8-3-8-10-10zM253 100l-8 1-15 21-1 5 4 15 3 7 5 7 20-4 9-24 0-3-7-18-4-7z"],[0.46,"M237 102l-5 6-5 12zM228 106l0 3 6-6-2-1zM231 107l-6 12 6-11 9-9zM220 115l4-8 23-15 13-2-10 3 12-3 8 2-8-3 10-1-8-6-7-2-19 3-14 11zM194 128l0 4-4 3 2 2-4 7 0 5 11 7 2-2 2-9-2-3-8 0 3-8-1-2 15 0 0-5-7-2 0 4-4-5zM204 138l4-1 2-4zM229 145l-3-16 0 11zM224 139l3 6-3-16zM201 140l7 1-3-2zM219 124l0 13 3 9 14 15-1 2-4-3-9-10-4 2 3 7 25 9 16-3-3-3-10 2 3 1-6 2-1-2 3-1-1-1-4 0 9-3-9 1-11-6-6-8-3-9 3-25-4 2zM205 154l8-1-3-9-5-1-2 2-1 6zM277 88l10 1-8 3 8-2 11 3-9-3 7 1 15 6 14 10 4 8-5-22-11-9-21-4-9 2zM278 163l3 1 3-2zM287 165l16 3 25-9 3-7-4-2-9 10-4 3-1-2 15-16 2-10 0-11-5-10-2-1 3 21-2 11-8 11 2-3-13 8-8-1 9 3-5 1 3 1-1 2-6-2 3-1-10-2zM270 166l-26 6 1 3 29-8 0-3-3 0zM278 165l-4-1 1 3 29 7 1-2zM311 102l11 18-6-14zM315 103l5 6 0-4-3-3zM345 129l0-3-7 1 1 5 8 1 8-1 0-4-5-4-5 4 1 3zM358 134l-5 0 3 8-2-2-7 2 0 11 3 3 8-7 2 1 1-4 0-4-5-6 2 2zM325 137l-1-7-1 11zM341 134l-2-1 1 3 5 2zM343 139l-2 1 2 2 5-1zM339 154l5 0 2-2-2-9-6 1-1 2-2 5z"],[0.96,"M251 89l1 1-1-1-3 2-6 5-4 5 1 0 8-6 6-2-1-2 1 1 5-2 7 0 1-1 2 2 3 1 11-1 1-2-1 0 1 0 8 1 10 4 8 7 1 0-6-7-12-6-9 0-5-2-8 0-3 1-1 1-1-1-9 1zM224 125l1 6 2-3 0-8-1-2-1 1zM194 138l3 4 5-2 1-4-1-2-5-2-2 2zM271 141l-2 3-1 12-6 1-2 2 0 1 1 1 7-3 6 2 8-2 5 3 2-1-3-3-3 0-3-2 0-11-2-2-2-2zM278 154l0 2-4 2-3-1-1-3 2-2 3-1zM227 145l3 8 4 4-2-9-4-4-1 0zM257 156l-6 2-1 2 8 1 2-2-1-3zM229 158l2 3 14 6 1 0-16-10zM273 162l1 3 1-3zM321 119l0 7 2 5 1-3 0-8-1-2zM351 132l-5 3 0 3 3 3 3 0 2-1 1-2-1-4zM318 145l-3 6-1 5 1 1 3-4 3-7 0-2zM288 158l2 3 8-1-1-2-6-2-1 0zM311 163l-8 4 15-6 2-1-1-3z"],[0.56,"M281 96l-13 7 0-1-1 0-6 9-1 10 1 4 2 2 6 0-3 5 1 0 4-5 9-4 1-5 16-13 2 1 2 4 0 5-1 5-5 6-6 3-2 3 0 3-19-1-2 0 0 2 23 0 3-4-1 0 8-4 4-4 1-4 1-9-1-5-3-3-2-2-3 0-7-5zM266 110l2-1 3-7 9-5 7 0 6 4 0 1-20 18 2 2-2 3-4 1-6 0-2-3 1-12 3-3z"],[0.6,"M282 97l-12 6-3 9-1-4-2 1-2 3-1 10 3 6 5 1 3-1 3-4-5-9 3 5 3-1 17-18-4-3zM296 105l-15 13-1 6 7 7 9-5 4-6 1-11-2-3zM278 125l-6 6 1 2 5 2 10-1-1-2-8-7z"],[0.8,"M210 134l-1 2 2 0 1-2zM338 134l-1 2 2 0 1-2zM279 136l-1 2 1 6 2 1 4 0 1-3 0-3z"],[0.7,"M270 139l-1 1 1 2 2-2z"],[0.02,"M253 118l1 3 2 1 0-4zM252 120l-9 3 7-1 3 2 1-1zM251 134l1 2 3 0-1-2zM255 138l2 2 2-1-1-3zM256 140l2-2-1-1 2 0-1 3zM307 121l2 1 1-2-2-1zM302 136l-1 2 2 0 2-1-2-2zM300 140l2 2 1-1 0-2z"],[0.45,"M275 134l-4 2 4 2 3 0 0-2z"]]},{"z":1060,"y":45.9,"layers":[[0.24,"M217 110l-2 12 3 10 5 12 7 12 7 7 6 4 6 2 13 0 14-4 8 4 12 0 11-3 9-7 8-12 9-24-2-12-12-17-16-10-12-5-18 1-14-1-11 3-17 10zM353 124l-5 3-4 5-2 6-1 6 2 6 5 6 6 3 6 0 5-1 5-5 7-9 1-4-4-9-5-6-7-2zM170 139l1 5 7 9 4 4 6 2 7 0 5-2 4-4 3-8 0-6-4-8-5-6-5-1-10 0-4 2-5 5z"],[0.46,"M233 97l-7 17 12-22zM253 81l-18 10-7 6-4 9-3 20 1 7 5 6-4-15 3-17 5-9 10-10 14-6 9-1 7 3-3-4zM230 110l-3 18 5 16-4-2 10 7-6-4 16 7 7-1 2-2-8 2-13-6-7-13 0-17 6-11 11-12-11 9zM225 121l0 10 3 6-1-17-1 4zM187 132l5 0-3-2zM183 134l4 4 10-3-1-3-13 0zM175 134l2 9 5 2-4-5 5-3-1-6-4-1zM193 142l-7 3 7 2-6-1 3 4 7-1 4-5-1-4zM281 124l1 7 4 6 1-6zM263 140l7-14-9 6zM259 153l-2 4 5 2-15 1-7-11 7 13 11 1 17-5 20 5 9-2 5-12-8 11-14-1 4-2-3-5 1-2-8 2-2 3 2 3-5-2-8 2 1-3-1-3-8-2-1 1 2 1zM316 98l6 16-4-13-7-9zM280 81l-2 3 11-3 13 4 16 14 7 15 0 16-3 9 5-5 1-9-3-19-5-9-24-16zM318 109l3 14-1 7-7 13-7 6-7 3-5-1 8 3-2-1 14-9 8-20-5-20-11-13zM322 126l-1 11 2-4 1-12-1 3-1-5zM359 132l-6 0-1 4 11 2 3-6-5 0 0-2-4 1 0 1zM367 130l-1 7 6 3-5 5 5-2 2-8-3-5zM317 146l3-4-5 3 4-3-12 7zM353 147l-3 0 2 2 4 2 5-5-6 1 8-2-14-5-2 5z"],[0.96,"M225 115l-1 5 1 2 2-2 2-6-3-2zM227 139l3 5 2 2-2-8-3-3zM190 138l-1-1-4 3-3-1-2 4 5 2 3-1 1-3 2-1 4 2 5-1 1-1 0-1-6-3zM268 144l0 3-2 0 2 0 2-4-1-1zM270 147l2 5 1 5 2 0 1-5 3-5-1-3-4 3-3-3zM257 150l-5 2 1 1 3 0 2-1 0-1zM240 151l5 4-1-3-5-3zM322 112l-2 2 2 6 2 2 0-7zM272 124l-4 4-2 3 2 7 2 2 1-2 4-1 4 3 3-7-1-5-6-4zM321 135l-5 9 0 2 6-7zM353 136l-6 3 1 2 5 1 4-2 4 4 3 1 5-3-2-3-4 0-2-1-4 0zM278 142l2 5 2 1-2-1 0-3-1-2zM307 149l-4 6 1 0 4-4 1-2zM291 153l4 1 2-2-6-2z"],[0.8,"M277 117l-3 3 0 3 3 1 3-1 2-2-2-3z"],[0.7,"M270 116l-3 2-1 2 1 2 2 2 3-1 1-3-1-3z"],[0.56,"M253 93l-7 2-7 6-6 10-2 8 1 8 4 10 4 5 3 0 2-9-2-6-1-18 3-3-1-1 2 0 3-6 6-5z"],[0.36,"M255 95l-5 4 0 7 2 3 3-2 4-8 0-3z"],[0.47,"M291 89l-13 2-7 2-8 12 3 4 3 0 3-4 11 2 11 6 11-3 3-5-2-6-7-7-3-2z"],[0.55,"M314 110l-1 1 0 10-6 7 4 12 7-7 1-5 0-6z"],[0.5,"M274 109l-8 4-4 6 13-3 3 1 10 7 7 2 4 0 0-2-7-3-9-9z"],[0.58,"M259 126l-6 1-5 4-2 3 1 3 5 0 6-4 3-5zM296 129l-8 3 0 2 2 4 4 3 6 1 4 0 3-2 2-4-3-4-4-3z"],[0.5,"M261 126l-3 0 1 6 3-3z"],[0.48,"M264 104l-13 13 0 3 4 3 4-1 10-13z"],[0.42,"M300 114l-1 5 4 4 3-3 0-3-3-3zM307 121l-3 3 4-1z"]]},{"z":880,"y":58.2,"layers":[[0.24,"M164 128l4 8 4 4 5 1 5 0 5-2 4-5 1-4-1-5-4-7-8-3-5 0-6 3-4 5zM369 115l-5 1-4 3-4 11 2 5 3 3 4 3 6 0 9-5 4-5 0-6-1-4-4-4-5-2zM228 98l-7 4-6 8-4 11 0 9 5 13 9 17 7 8 11 6 14 2 14-4 6 0 11 4 6 1 12-3 9-5 7-7 8-13 6-14 2-10-3-11-7-11-8-6-22-4-16-5-9 0z"],[0.46,"M176 118l-2 4 3 0 0 3 8 0 0-3-7-2 2-1 5 3 1-3-7-1 3-2-3 0-3 0 2 2zM215 126l8-13-6 2zM186 129l4-3-2-4zM180 127l0 3 3 0zM173 133l1 2 4-1-2-2 3-2-7 0zM181 131l1 3 3-1 0-4zM264 90l-30 11-8 6 9-6 27-9 10 3zM281 91l-4 3 11-2 34 15-6-5-29-12zM318 116l-8 5-5 15 7-4 13-17-3-2 1 2zM226 117l1-4-3 1zM238 133l6 2-1-5 2 5 5-1-3-11-5-1 0 5-5-8-11-4zM299 130l4 6 4-14-6 1zM317 132l-14 15 11 0-11 0-4 10 10 1 8-1 15-15 0-10-13-5zM222 129l-1 3-5 0-1 5 7 12 7 6 8 3 12-1-4-10-10 0 11 0-14-14-2-6zM245 168l14-4 3 3 6 2 4-7-4-1-2 1 4 1-3 2-3-1-4-1 1-3-3-2-4 4-10 1-17-9 3 6zM299 163l-8-5-3 2 1 3-4 1-6-1 3-1-2-1-3 2 5 6 6-2 1-4 14 5 15-8 4-6zM369 118l-6 2 2 2-1 3 10-2 0-3-4-2 2-2-5 0zM333 125l-1-10-6-2zM359 126l2 3 2 0-3-2 1-5zM372 125l6 2-4-4zM369 130l0-3-2 0-2 3zM376 130l-6 0 3 3-3 1 6 0-1-1 5-4zM364 133l4 0 0-2-5-2z"],[0.96,"M182 125l0 3 2 2 1-1 1-2-1-2zM363 127l2 3 2-2 0-2-3-1zM372 127l2 2 2 1 3-2-3-2zM170 127l1 2 1 1 4-3-4-1zM223 115l7 18 11 9 12 16 3 0 1-5 2 6 1 1 5-2 2-3 2 1 1 5 4 2 4-1 1-1 0-5 2 0 3 3 4 1 1 0 1-3 1-6 0-4 6-5-1-4-5 4-4 2-2 4-1 1-4 0-2-3-3-1-5 0-2 4-3 0-1 0-2-5-5-3-4-3-2 1 0 2 0-3-9-1-4-3-5-5-6-12-1-2zM257 149l-5-6 5 4zM323 115l-7 13-4 5-3 3-10 2-2 5-4 7 0 7 0 2 4-1 12-17 10-9 6-17z"],[0.48,"M278 97l-13 0-2 2 1 5-11-3-2 3 4 5 8-1 1-3 2 2 22-2 3-2 6 6 6 1 2 2 5-2-2-4-4 0-2-3-13-5-9 0zM278 106l0 3 2 1 2-3zM244 116l6 0 0-5-2-1-3 1z"],[0.42,"M314 114l-12-4-7 3-1 3 5 10 3 3 9 0 7-6-1-7zM244 111l1 6 5-1 0-5-3-1zM241 115l-7-3-6 4 1 6 4 6 4 0 6-4 0-4 2 0z"]]},{"z":620,"y":76.1,"layers":[[0.24,"M221 98l-5 5-4 6-3 11 3 13 8 18 5 6 10 6 11 2 11-4 7-6 6-11 2-10-3-10-9-14-8-8-9-4-8-2-7 0zM311 97l-12 3-8 6-12 19-2 5 0 11 5 10 9 10 8 3 15-1 11-8 7-11 7-19-1-13-3-5-5-6-8-5z"],[0.46,"M223 107l-5 2-6 13 1 10 4 4 11 6-1 4 2 4 7 7 12 1 2-8 3 6 7-2 2-5-4-3 9-2 1-8-18 4 1 7 2 0-2 2-2-7-8-4-8 2 2-8-5 0-4-3 3 1 0-2 6-5 2-4 1 13 7-5-10 7 20 4 13-3-1-3 3-2-3-6-3-4-7 2 1-4-2-1-5-1-7 4 2-7-9-3 1-2zM223 117l14-6 0 5-5-2-10 5-1-3zM247 113l9 0-11-3zM315 106l-4 2 0 2-2-1-6 4 0-3-10 2 10 1 1 7-5-4-6 1-2 1 0 4-6-2-3 3-3 7 3 6-2 3 2 6 11 1-7 1 4 8 6 1 3-4-2-5 2-6-16-5 9 2 18-2 4-2-11-7 8 5 1-12 1 4 7 4 0 2 6-6-8 8-4 0 1 7-11 0-4 3-2 5 1 9 4 2 8-1 9-7 2-5-2-3 12-6 5-6 0-8-7-13-5-3zM312 117l-1-6 11 4-6-1z"],[0.96,"M313 124l-3 2 0 4 1 2 4 2 5-4 0-4-2-2zM236 123l-5 1-2 2 0 4 4 4 2 0 4-4 0-3z"],[0.8,"M291 114l-2 2 3 2 2-2-1-2zM258 114l-3 1 0 2 3 1 1-3z"],[0.7,"M257 118l-2 1 1 3 3-1zM291 118l-1 3 3 1 1-3z"]]},{"z":300,"y":98.1,"layers":[[0.24,"M237 117l-8 4-5 5-4 11-1 12 2 7 5 7 8 5 8 2 8-2 7-6 7-13 1-9-3-7-12-11-6-4zM305 117l-5 3-14 13-2 5 0 6 2 10 6 9 6 5 9 2 9-3 9-8 4-7 0-8-1-9-6-11-6-5z"],[0.46,"M249 127l-2 11-5-4-1 2-4-1 0 3 4-1-2 8-10-1 2-3-3-4-2 1-1 4 2 5 2-1-1 4 5 11 8 0 7-1 1-3 6 1 8-6-3-14-4-5-5 6-3 13-2-5-3 1 4-9 3-2zM230 132l2 8 2-1-2-6 5-1 0-9-3 0zM301 126l-4 6 2-1 0 6 3 2 0 5 5 6-4-4 0 3-2 3-2-12-6-7-2 2-4 9-1 7 2 5 7 3 4-2 4 3 12 1 3-4 2-11 2 1 2-5-3-5-3 4 1 3-9 1-3-8 4 1 0-3-4 1 0-2-4 4 0-5-4-2zM311 132l5 1-1 6 1 1 4-8-5-8-4-1z"],[0.96,"M302 126l-3 4 2 4 2 2 6 0 2-4 2-7-1-3-4-1zM237 122l-1 2 1 8 2 2 3 2 7-2 1-2-2-6-7-5zM232 140l-1 3 2 1 2 0 0-4-2-1zM315 139l-2 3 1 2 1 1 3-1-1-4z"]]}]};

  window.coverArt = (motif) => (M[motif] || M.grid)();
})();
