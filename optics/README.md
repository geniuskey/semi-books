# OpticsBook — 이미지 센서를 위한 인터랙티브 광학 교과서

렌즈를 지나 실리콘에 닿기까지. 이미지 센서 픽셀 개발자를 위한 한국어 광학 학습 사이트입니다.
[SensorBook](https://github.com/geniuskey/sensorbook)의 후속편으로, 기하광학에서 파동광학, 박막 TMM, PSF·MTF, CRA와 마이크로렌즈, RCWA·FDTD까지 18개 챕터와 120여 개의 시뮬레이터로 구성됩니다.

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/wave.html | 맥스웰 방정식, 평면파, 복소 굴절률과 분산, 실리콘 흡수 깊이 |
| 02 | chapters/geometric.html | 페르마 원리, 스넬 법칙, 전반사, 프리즘 분산, ABCD 행렬 |
| 03 | chapters/imaging.html | 주요점, 조리개, 입사·출사 동공, 주광선·주변 광선, F/#·NA, 에텐듀, 텔레센트릭 |
| 04 | chapters/aberration.html | 실제 광선 추적, 자이델 수차, 색수차, 스팟 다이어그램, 제르니케 |
| 05 | chapters/interference.html | 영의 실험, 마이컬슨, 결맞음, 패브리–페로, 박막 간섭 |
| 06 | chapters/diffraction.html | 프레넬·프라운호퍼 회절, 에어리 디스크, 격자, 각스펙트럼 전파, 가우시안 빔 |
| 07 | chapters/fourier.html | 4f 시스템, 동공 함수 → PSF, 결맞는/결맞지 않는 결상, 스트렐 비 |
| 08 | chapters/mtf.html | OTF·MTF, 픽셀 개구 MTF, 나이퀴스트·앨리어싱, OLPF, 슬랜티드 엣지 |
| 09 | chapters/polarization.html | 존스·스토크스, 파장판, 복굴절, 와이어 그리드, 편광 센서 |
| 10 | chapters/fresnel.html | 프레넬 방정식, 브루스터 각, 전반사·소멸파, 흡수 매질 반사 |
| 11 | chapters/thinfilm.html | 반사 방지막, 전달 행렬법(TMM), 브래그 미러, IR 컷 필터, 센서 AR 스택 |
| 12 | chapters/cra.html | CRA 곡선, cos⁴ 법칙, 비네팅, 렌즈·컬러 쉐이딩 |
| 13 | chapters/microlens.html | 마이크로렌즈 초점·높이, 각도 응답, ML 시프트, 2×2 OCL·PDAF |
| 14 | chapters/pixelstack.html | 컬러 필터, 광학 그리드, DTI 도파, 크로스토크, 광 트래핑, 컬러 라우터 |
| 15 | chapters/rcwa.html | RCWA 원리와 수렴, FDTD, 픽셀 전자기 시뮬레이션 실무 |
| 16 | chapters/stray.html | 고스트, 꽃잎 플레어, 산란, 반사 방지 구조 |
| 17 | chapters/system.html | 렌즈+픽셀 공동 설계 플레이그라운드 |
| 18 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드: `css/style.css`(디자인 토큰, 라이트/다크), `js/common.js`(내비게이션, 캔버스·차트·3D 헬퍼), `js/optics.js`(복소수, FFT, 베셀·MTF, 재료 굴절률, 프레넬, TMM).
챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
챕터 `<head>`의 canonical·OG·JSON-LD와 사이트맵은 SemiBooks 루트의 빌드(`npm run build`, `npm run sitemap`)가 생성합니다.
`NODE_PATH=$(npm root -g) node tools/check.cjs`로 모든 페이지의 JS 오류와 모바일 가로 넘침을 점검합니다.

시뮬레이터의 수치는 교육용 근사 모델입니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

코드는 [MIT](LICENSE-MIT), 교재 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)으로 제공됩니다. 적용 범위와 재사용 조건, 출처 표기 예시는 [라이선스 안내](LICENSE.md)를 참고하세요.
