# CMPBook — 인터랙티브 반도체 CMP·세정 교과서

갈아서 평평하게, 씻어서 깨끗하게. 공대 학부생과 신입 공정 엔지니어를 위한 한국어 반도체 CMP·세정 학습 사이트입니다.
18개 챕터, 140여 개의 시뮬레이터, 3D 장비·구조 모델(three.js)로 구성되며, 가상 기준 공정 CP-300의 숫자로 직접 깎고 씻어 봅니다.

배포 주소: https://semi.euiyun.com/cmp/

## 실행
원본은 빌드 없이 동작하는 정적 사이트입니다. 저장소 루트에서 실행하세요.

```bash
python3 -m http.server 8000   # → http://localhost:8000/cmp/
```
배포할 때는 저장소 루트의 `npm run build`가 head 메타데이터와 KaTeX 수식을 미리 렌더링합니다. three.js와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 왜 평탄화인가 — 다층 배선과 초점 심도, CMP가 공정 흐름의 어디에 끼는지, 장비 한 대의 구조와 이 책의 지도. |
| 02 | chapters/preston.html | 프레스턴 방정식과 재료 제거 — 제거율은 압력×속도. 프레스턴 계수의 뜻, 화학과 기계의 시너지, 접촉 역학으로 본 한계. |
| 03 | chapters/kinematics.html | 운동학과 균일도 — 헤드·정반 회전수 비, 상대 속도장, 스윕과 궤적 밀도, 다중 구역 헤드와 리테이너 링, 가장자리 효과. |
| 04 | chapters/pad.html | 연마 패드 — 폴리우레탄 기공과 그루브, 경도·압축률, 돌기 접촉 모델, 슬러리 수송과 글레이징. |
| 05 | chapters/conditioning.html | 패드 컨디셔닝 — 다이아몬드 디스크가 패드를 다시 살리는 법. 절삭률, 스윕 프로파일, 패드 수명과 마모 균일도. |
| 06 | chapters/slurry.html | 슬러리 화학 — 실리카·세리아 연마입자, 제타 전위와 응집, pH·산화제·부식 방지제, 큰 입자와 필터링. |
| 07 | chapters/tribology.html | 마찰·윤활·온도 — 스트리벡 곡선과 윤활 영역, 마찰 계수, 패드 온도 상승과 아레니우스, 마찰로 공정을 읽는 법. |
| 08 | chapters/pattern.html | 패턴 의존성과 평탄화 — 단차 제거, 평탄화 길이, 패턴 밀도 모델, 디싱과 이로전, 더미 필과 레이아웃 규칙. |
| 09 | chapters/oxide.html | 산화막·STI CMP — ILD 평탄화와 STI. 세리아 슬러리의 질화막 선택비, 자기 정지, 잔막 산포를 줄이는 법. |
| 10 | chapters/copper.html | 구리 다마신 CMP — 벌크·클리어·배리어 3단계, BTA 부식 방지, 갈바닉 부식, 저유전막 손상과 디싱 관리. |
| 11 | chapters/metals.html | 텅스텐·게이트·신소재 CMP — W 플러그, 메탈 게이트(RMG)와 폴리, 코발트·루테늄·몰리브덴, 선택비 설계의 일반 원리. |
| 12 | chapters/endpoint.html | 종점 검출과 공정 제어 — 모터 토크, 광학 반사율, 와전류 센서로 끝을 안다. 인시투 계측과 런투런(R2R) 제어. |
| 13 | chapters/defects.html | CMP 결함 — 스크래치·잔류 입자·부식·패드 잔해·디싱. 결함 지도로 원인을 찾고 수율로 환산한다. |
| 14 | chapters/cleanbasics.html | 세정의 기초 — 입자·금속·유기물·자연 산화막. 부착력과 제거력, RCA 세정(SC1·SC2), HF와 표면 종단. |
| 15 | chapters/postclean.html | CMP 후 세정 — PVA 브러시 스크러빙, 메가소닉과 캐비테이션, 세정 화학, 마랑고니·IPA 건조와 물반점. |
| 16 | chapters/wetclean.html | 습식 세정 장비와 첨단 세정 — 배치 vs 매엽, 고종횡비 패턴 붕괴, 초임계 CO₂·에어로졸·건식 세정, 물·약품 사용량. |
| 17 | chapters/advanced.html | 하이브리드 본딩과 미래 CMP — 구리 리세스 나노미터 관리, 웨이퍼 박화와 후면 공정, 공정 비용(CoO)과 앞으로의 과제. |
| 18 | chapters/glossary.html | 용어집 & 종합 퀴즈 — CMP·세정 핵심 용어를 검색하고, 종합 퀴즈로 실력을 점검하자. |

공통 코드: `css/style.css`(디자인 토큰, 라이트/다크), `js/common.js`(내비게이션, 캔버스·차트·3D 헬퍼, 전역 `CB`).
챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

시뮬레이터의 수치는 교육용 근사 모델입니다. 실제 수치는 공개 자료 기준의 대략값이며 특정 회사의 내부 값이 아닙니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다.

## 라이선스

Copyright (c) 2026 geniuskey and CMPBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

HTML 및 JS 안의 교육 콘텐츠에도 CC BY 4.0을 적용합니다. 적용 범위, 출처 표시 예시 및 외부 자료에 대한 안내는 [라이선스 안내](LICENSE.md)를 참고하세요.
