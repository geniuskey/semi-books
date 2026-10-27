# AnalogBook — 만져 보며 배우는 반도체 아날로그 회로설계

아날로그는 어렵다. 그래서 읽는 대신 만진다. 공대 학부생과 입문 엔지니어를 위한 한국어 인터랙티브 아날로그 CMOS 회로설계 교과서입니다.
20개 챕터, 170개가 넘는 시뮬레이터, 그리고 모든 장이 같은 소자 모델과 같은 회로 시뮬레이터를 쓰게 하는 회로 엔진(`js/analog.js`)으로 구성됩니다. 엔진 안에는 브라우저에서 도는 작은 SPICE(동작점·DC 스윕·AC·과도·잡음 해석)가 들어 있습니다.
책 전체가 가상의 센서 인터페이스 칩 하나(TARGET AB-1: 가상 공정 AB180, 2단 밀러 OTA, 밴드갭, LDO, 12비트 SAR ADC, ΔΣ, PLL)를 MOSFET 하나에서 시스템까지 설계해 올라가고, 19장 실험실에서는 독자가 회로도를 직접 그려 시뮬레이션합니다.

글을 읽지 않고 시뮬레이터만 쓰는 독자를 위해 두 가지 길을 둡니다.
- **시뮬레이터 갤러리**(`sims.html`): 모든 시뮬레이터를 카드로 모아 검색하고 바로 엽니다.
- **시뮬레이터만 보기**: 챕터 상단 버튼 하나로 글·퀴즈를 숨기고 시뮬레이터만 남깁니다.

반도체 시리즈([ProcessBook](https://semi.euiyun.com/process/), [LithoBook](https://semi.euiyun.com/litho/), [MemoryBook](https://semi.euiyun.com/memory/), [PackagingBook](https://semi.euiyun.com/packaging/), [YieldBook](https://semi.euiyun.com/yield/), [FailureBook](https://semi.euiyun.com/failure/), [SensorBook](https://semi.euiyun.com/sensor/), [TCADBook](https://semi.euiyun.com/tcad/), [ChipIndustryBook](https://semi.euiyun.com/industry/))에 이어지는 권입니다.

배포 주소: https://semi.euiyun.com/analog/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 아날로그는 왜 어려운가: 신호 사슬, 트레이드오프 팔각형 |
| 02 | chapters/mosfet.html | MOSFET: 영역, 채널 길이 변조, 약반전, 바디 효과 |
| 03 | chapters/smallsignal.html | 소신호 모델, 고유 이득, fT, gm/ID 설계법 |
| 04 | chapters/singlestage.html | 공통 소스·게이트·드레인, 캐스코드 |
| 05 | chapters/mirror.html | 전류 미러, 캐스코드 미러, 바이어스 생성 |
| 06 | chapters/diffpair.html | 차동 쌍, CMRR, 5트랜지스터 OTA |
| 07 | chapters/frequency.html | 극점·영점, 보드 선도, 밀러 효과 |
| 08 | chapters/feedback.html | 루프 이득, 이득 둔감화, 피드백 구조 |
| 09 | chapters/opamp.html | 2단 밀러 OTA, 폴디드 캐스코드, 슬루율, CMFB |
| 10 | chapters/stability.html | 위상 여유, 나이퀴스트, 극점 분리, 영점 무효화 |
| 11 | chapters/noise.html | 열잡음, 1/f, kT/C, 입력 환산 잡음, 초핑 |
| 12 | chapters/mismatch.html | 펠그롬 법칙, 오프셋, 몬테카를로, 공통 중심 배치 |
| 13 | chapters/bandgap.html | PTAT·CTAT, 밴드갭 기준 전압, 스타트업 |
| 14 | chapters/ldo.html | LDO: 드롭아웃, 부하 과도, 안정도, PSRR |
| 15 | chapters/switchedcap.html | 샘플-앤-홀드, 전하 주입, SC 적분기 |
| 16 | chapters/adc.html | 양자화, DAC, 비교기, 플래시·SAR·파이프라인 ADC |
| 17 | chapters/sigmadelta.html | 오버샘플링, 잡음 성형, ΔΣ 변조기 |
| 18 | chapters/pll.html | 링·LC 발진기, 지터, 전하 펌프 PLL |
| 19 | chapters/lab.html | 아날로그 실험실: 회로도 편집기 + 브라우저 SPICE |
| 20 | chapters/glossary.html | 용어집, 공식 모음, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 회로도·스코프 색
- `js/common.js` — 내비게이션, 시뮬레이터만 보기, 캔버스·차트·끌기 헬퍼, 전역 `AB`
- `js/analog.js` — 가상 공정 AB180, MOSFET 모델, 브라우저 SPICE(`AN.circuit`), 전달 함수·보드·안정도 여유, FFT·SNDR, 회로도·오실로스코프 그리기, 전역 `AN`
- `js/sims.js` — 시뮬레이터 갤러리 목록(자동 생성)
- `tools/sims.py` — 갤러리 목록 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델(가상 공정 AB180, 제곱 법칙 + 약반전 연속 MOSFET 모델)이며, 타깃 칩 AB-1은 가상입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `analogbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and AnalogBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
