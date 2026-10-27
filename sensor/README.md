# SensorBook — 인터랙티브 이미지 센서 교과서

광자에서 사진까지. 공대 학부생을 위한 한국어 이미지 센서 학습 사이트입니다.
19개 챕터, 80여 개의 시뮬레이터, 3D 구조 모델(three.js)로 구성됩니다.

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/light.html | 빛과 광자, 흑체복사, 광자 수 계산 |
| 02 | chapters/photodiode.html | 밴드갭, 흡수 깊이, PN 접합, PPD, QE |
| 03 | chapters/pixel.html | 픽셀 적층 3D(FSI/BSI), 마이크로렌즈, 크로스토크, DTI |
| 04 | chapters/color.html | CFA, 분광 감도, 디모자이킹, OLPF |
| 05 | chapters/optics.html | 결상, F-넘버·심도, 회절, MTF, CRA, 렌즈 쉐이딩 |
| 06 | chapters/readout.html | 4T APS, CDS, 변환 이득, 컬럼 ADC, 칩 구조 |
| 07 | chapters/noise.html | 샷/읽기/암전류 노이즈, SNR, DR, PTC |
| 08 | chapters/characterization.html | 선형성, 암 특성 분포, RTS, 행 노이즈, 래그, 블랙 선, SNR10 |
| 09 | chapters/shutter.html | 롤링/글로벌 셔터, 플리커, HDR |
| 10 | chapters/isp.html | RAW→JPEG ISP 파이프라인, 3A |
| 11 | chapters/computational.html | 버스트 정렬·병합, 야간 모드, 멀티프레임 초해상도, 합성 보케 |
| 12 | chapters/advanced.html | 적층 센서 3D, PDAF, 비닝, SPAD/dToF, 이벤트 센서 |
| 13 | chapters/fabrication.html | 이온 주입, BSI 박막화, DTI, 하이브리드 본딩 공정, 수율, 패키징 |
| 14 | chapters/module.html | VCM AF, OIS, 폴디드 줌, 액티브 얼라인, 모듈 캘리브레이션 |
| 15 | chapters/automotive.html | LED 플리커 억제, 차량용 HDR 픽셀, 고온 동작, 기능 안전, DMS |
| 16 | chapters/space.html | 과학용 CCD, 방사선 손상과 CTE, HgCdTe·up-the-ramp, TDI, 광자 계수 |
| 17 | chapters/invisible.html | 열화상 마이크로볼로미터, X선 검출기, 초분광, 편광 이미징 |
| 18 | chapters/design.html | 센서 설계 플레이그라운드, 스펙시트 읽기 |
| 19 | chapters/glossary.html | 용어집(190개), 종합 퀴즈(34문항) |

공통 코드: `css/style.css`(디자인 토큰, 라이트/다크), `js/common.js`(내비게이션, 캔버스·차트·3D 헬퍼).
챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
챕터 `<head>`의 canonical·OG·JSON-LD와 사이트맵은 SemiBooks 루트의 빌드(`npm run build`, `npm run sitemap`)가 생성합니다.

시뮬레이터의 수치는 교육용 근사 모델입니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

코드는 [MIT](LICENSE-MIT), 교재 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)으로 제공됩니다. 적용 범위와 재사용 조건, 출처 표기 예시는 [라이선스 안내](LICENSE.md)를 참고하세요.
