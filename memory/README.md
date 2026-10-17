# MemoryBook — 인터랙티브 메모리 반도체 교과서

비트 하나에서 테라바이트까지. 공대 학부생을 위한 한국어 메모리 반도체 학습 사이트입니다.
17개 챕터, 90여 개의 시뮬레이터, 3D 구조 모델(three.js)로 구성됩니다.

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/hierarchy.html | 메모리 계층, 지역성, 캐시 AMAT, 메모리 월, 리틀의 법칙 |
| 02 | chapters/device.html | MOSFET 스위치, 누설 전류, 커패시터·전하 저장, 양자 터널링 |
| 03 | chapters/sram.html | 6T 셀, 버터플라이 곡선·SNM, 센스 앰프, 캐시 구조 |
| 04 | chapters/dram-cell.html | 1T1C 셀, 전하 공유, 비트라인 센싱, 3D DRAM 어레이 |
| 05 | chapters/dram-ops.html | ACT/RD/WR/PRE, 타이밍 파라미터, 뱅크·로우 버퍼, 리프레시 |
| 06 | chapters/interface.html | DDR/LPDDR/GDDR, 대역폭 계산, 아이 다이어그램, PAM4/PAM3 |
| 07 | chapters/hbm.html | HBM 3D 구조, TSV·마이크로범프, 인터포저, 수율·열 |
| 08 | chapters/nand.html | 플로팅 게이트·차지 트랩, ISPP, Vt 분포, SLC~QLC |
| 09 | chapters/vnand.html | 3D NAND 3D 구조, 채널 홀, 계단, CMOS 언더 어레이 |
| 10 | chapters/ssd.html | FTL, 가비지 컬렉션, 쓰기 증폭, 웨어 레벨링, NVMe |
| 11 | chapters/reliability.html | 리텐션, 로우 해머, 디스터브, 해밍 코드~LDPC |
| 12 | chapters/emerging.html | MRAM, PCM, ReRAM, FeRAM, CXL, PIM, CIM |
| 13 | chapters/design.html | 루프라인, LLM 메모리 계산, 메모리 시스템 설계 플레이그라운드 |
| 14 | chapters/process.html | 리소그래피(EUV·멀티 패터닝), 고종횡비 식각, CVD/ALD, 공정 통합 |
| 15 | chapters/test.html | 고장 모델, 마치 테스트, 리던던시 리페어, 수율 모델, 번인 |
| 16 | chapters/industry.html | 비트당 원가, 메모리 사이클, 팹 경제학, HBM 공급 구조 |
| 17 | chapters/glossary.html | 용어집, 종합 퀴즈(20문항) |

공통 코드: `css/style.css`(디자인 토큰, 라이트/다크), `js/common.js`(내비게이션, 캔버스·차트·3D 헬퍼, 전역 `MB`).
챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

시뮬레이터의 수치는 교육용 근사 모델입니다. 제품 수치는 2024~2026년 공개 자료 기준의 대략값입니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and MemoryBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

HTML 및 JS 안의 교육 콘텐츠에도 CC BY 4.0을 적용합니다. 적용 범위, 출처 표시 예시 및 외부 자료에 대한 안내는 [라이선스 안내](LICENSE.md)를 참고하세요.
