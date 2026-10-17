# DisplayBook — 인터랙티브 디스플레이 교과서

전자에서 빛나는 화면까지. 공대 학부생을 위한 한국어 디스플레이 학습 사이트입니다.
[SensorBook](https://semi.euiyun.com/sensor/)(이미지 센서 교과서)의 시리즈물로, 20개 챕터와 170여 개의 시뮬레이터, 180여 개의 SVG 도해, 3D 구조 모델(three.js)로 구성됩니다.

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/vision.html | 측광량(휘도·조도), 시감 효율, 시력과 대비 감도, 플리커 지각 |
| 02 | chapters/color.html | 등색 함수, CIE 색도도, 색역과 커버리지, 색온도, ΔE |
| 03 | chapters/pixel.html | 해상도와 PPI, 서브픽셀 배열 3D, 서브픽셀 렌더링, 모아레 |
| 04 | chapters/tft.html | a-Si·LTPS·산화물·LTPO TFT, I–V 특성, 누설, 신뢰성 |
| 05 | chapters/addressing.html | 패시브/액티브 매트릭스, 주사, RC 지연, 킥백, 드라이버 IC |
| 06 | chapters/lcd.html | 액정과 편광, 복굴절, TN·IPS·VA, V–T 곡선, 시야각 |
| 07 | chapters/backlight.html | 도광판, 로컬 디밍과 헤일로, 미니LED, 양자점 |
| 08 | chapters/oled.html | OLED 적층 3D, 밴드 다이어그램, 형광·인광·TADF, EQE, 마이크로캐비티 |
| 09 | chapters/oledcircuit.html | 2T1C, Vth 보상 회로, IR 드롭, 번인과 열화 보상 |
| 10 | chapters/microled.html | 칩 크기와 효율, 매스 트랜스퍼, 전사 수율, QD-OLED |
| 11 | chapters/motion.html | 홀드형 모션 블러, 응답 시간, 오버드라이브, VRR, PWM 플리커 |
| 12 | chapters/hdr.html | 감마·EOTF, PQ·HLG, 톤 매핑, ABL, 비트 심도와 밴딩 |
| 13 | chapters/optics.html | 프레넬 반사, AR 코팅, 원편광판, 주변광 명암비, 시야각 |
| 14 | chapters/interface.html | 비디오 타이밍, 대역폭, MIPI·eDP·DP, DSC, FRC, 디머라 |
| 15 | chapters/fabrication.html | 포토 공정, 원장 면취, FMM 증착, 박막 봉지, 수율 |
| 16 | chapters/flexible.html | 중립면과 변형률, 폴더블 3D, 정전용량 터치, UDC |
| 17 | chapters/xr.html | 마이크로OLED, 팬케이크 렌즈, 도파관, VAC, 포비티드 렌더링 |
| 18 | chapters/measurement.html | 휘도·색도 측정, 균일도와 무라, 감마 측정, 캘리브레이션 |
| 19 | chapters/design.html | 디스플레이 설계 플레이그라운드, 스펙시트 읽기 |
| 20 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드: `css/style.css`(디자인 토큰, 라이트/다크), `js/common.js`(내비게이션, 캔버스·차트·3D 헬퍼, 색채 과학·CIE 색도도 헬퍼).
챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
챕터를 추가하거나 제목·설명을 바꾼 뒤에는 `python tools/seo.py`로 canonical/OG/JSON-LD 태그와 `sitemap.xml`을 다시 만듭니다.

시뮬레이터의 수치는 교육용 근사 모델입니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

코드는 [MIT](LICENSE-MIT), 교재 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)으로 제공됩니다. 적용 범위와 재사용 조건, 출처 표기 예시는 [라이선스 안내](LICENSE.md)를 참고하세요.
