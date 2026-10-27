# TestBook — 인터랙티브 반도체 테스트 교과서

좋은 칩과 나쁜 칩을 가르는 기술. 공대 학부생을 위한 한국어 반도체 테스트 학습 사이트입니다.
테스트 장비(ATE), 테스트 용이성 설계(DFT·BIST), 번인, 빈 분류, 테스트 비용을 다루며, 패키징과 수율 사이를 잇습니다.
16개 챕터, 87개 시뮬레이터, 118개 그림으로 구성되고, 책 전체가 가상의 모바일 SoC **TB-7**의 테스트 계획서를 한 장씩 채워 갑니다. 15장에서는 독자가 직접 테스트 계획을 짜는 실험실(샌드박스·미션)을 합니다.

[ProcessBook](https://semi.euiyun.com/process/)(반도체 제조 공정), [PackagingBook](https://semi.euiyun.com/packaging/)(반도체 패키징), [YieldBook](https://semi.euiyun.com/yield/)(반도체 수율 분석)과 같은 시리즈입니다.

배포 주소: https://semi.euiyun.com/test/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
흐름은 왜 테스트하나 → 장비와 접촉 → 폴트와 DFT → 측정과 한계 → 번인과 분류 → 비용과 흐름 입니다.

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 결함·폴트·고장, 테스트 흐름, 10배 법칙, 윌리엄스–브라운 결함 수준, 과잉 불량과 유출 |
| 02 | chapters/ate.html | ATE 구조, 핀 일렉트로닉스, 타이밍과 엣지 배치, 파형 포맷, 스트로브, DPS, 테스트 프로그램 |
| 03 | chapters/interface.html | 프로브 카드, 오버드라이브와 접촉 저항, 멀티 사이트 터치다운, 로드보드 신호 무결성, 핸들러 |
| 04 | chapters/dc.html | 연속성, 누설, VOH/VOL, 전원 전류, IDDQ와 ΔIDDQ, PMU 정착 시간 |
| 05 | chapters/faults.html | 고착 폴트와 축약, 경로 민감화, D 알고리즘, 폴트 시뮬레이션, 천이·브리지·셀 인식 폴트 |
| 06 | chapters/scan.html | 스캔 체인, 시프트·캡처, LOC·LOS, 스캔 압축과 X 마스킹, 시프트 전력, 체인 진단 |
| 07 | chapters/bist.html | LFSR·MISR, 로직 BIST, 메모리 폴트와 March 알고리즘, 메모리 리페어 |
| 08 | chapters/jtag.html | IEEE 1149.1 TAP, 보드 연결 테스트, IEEE 1500·1687(IJTAG), 칩렛·3D 테스트 접근 |
| 09 | chapters/mixed.html | ADC 히스토그램 테스트, 코히런트 샘플링 FFT, SNR·ENOB, 지터, 아이 다이어그램과 BER |
| 10 | chapters/limits.html | 셔무 플롯, Vmin·Fmax, 게이지 R&R, 가드밴드, 과잉 불량과 유출 |
| 11 | chapters/burnin.html | 욕조 곡선, 와이블, 가속 계수, 번인 최적화, 열폭주, HTOL과 FIT |
| 12 | chapters/binning.html | 하드·소프트 빈, 테스트 순서, 속도 등급 빈닝, PAT·DPAT, GDBN, 다변량 이상치 |
| 13 | chapters/cost.html | 테스트 셀 원가, 멀티 사이트 효율, 최적 커버리지, 적응형 테스트 |
| 14 | chapters/flow.html | 테스트 단계 분담, KGD와 칩렛, SLT, SDC와 인필드 테스트, STDF |
| 15 | chapters/lab.html | 테스트 엔지니어 실험실: 샌드박스, 미션, 민감도, 파레토 프런티어 |
| 16 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크)
- `js/common.js` — 내비게이션, 단계 띠, 목차, 퀴즈, 캔버스·차트 헬퍼, 전역 `TB`
- `js/wafer.js` — 웨이퍼 맵 엔진(YieldBook과 같은 모델), 전역 `WM`

도구
- `python3 tools/check.py [slug…] [--shots 폴더]` — Playwright로 페이지를 넓은 화면·라이트, 좁은 화면(360px)·다크로 열어 콘솔 오류, 가로 넘침, 그려지지 않은 캔버스를 점검합니다.

챕터 작성 규칙과 예제 제품 TB-7의 숫자는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델입니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

코드는 [MIT](LICENSE-MIT), 교재 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)으로 제공됩니다. 적용 범위와 재사용 조건, 출처 표기 예시는 [라이선스 안내](LICENSE.md)를 참고하세요.
