# WaybillKit

[English](README.md) | [한국어](README.ko.md)

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue)](LICENSE)
[![Node.js: 22.13+](https://img.shields.io/badge/Node.js-22.13%2B-339933)](#시작하기)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-3178C6)](#api)
[![Status: Experimental](https://img.shields.io/badge/Status-experimental-orange)](#지원-택배사)

한국 택배·화물 운송사의 배송 조회를 하나의 API로 제공하는 TypeScript SDK입니다.

Node.js 애플리케이션에서 각 운송사의 배송 정보를 직접 조회하고, 일관된 배송 상태와
이벤트 형식으로 결과를 받을 수 있습니다.

> 실험 단계이며 아직 npm에 배포되지 않았습니다. 지원 운송사와 API는 변경될 수 있습니다.

## 주요 기능

- 하나의 API로 한국 운송사 5곳 조회
- 공통 배송 상태와 한국 시간대가 포함된 시간순 이벤트
- 네트워크 요청 없이 저장된 HTML·JSON 파싱
- 요청 타임아웃, 취소 및 사용자 정의 `fetch` 주입
- 정규화 결과에서 이름, 연락처 및 주소 등 개인정보 제외

## 지원 택배사

| 운송사 | ID | 응답 형식 | 검증 상태 |
| --- | --- | --- | --- |
| 대신택배 | `kr.daesin` | EUC-KR HTML | 배송 완료 및 미조회 응답 검증 |
| 경동택배 | `kr.kdexp` | UTF-8 JSON | 더미 응답 확인, 성공 응답 fixture는 합성 데이터 |
| 천일택배 | `kr.chunilps` | UTF-8 HTML | 더미 응답 확인, 성공 응답 fixture는 합성 데이터 |
| 건영택배 | `kr.kunyoung` | EUC-KR HTML | 합성 fixture, 마지막 확인 시 HTTPS 인증서 오류 |
| 일양로지스 | `kr.ilyanglogis` | UTF-8 JSON | 더미 응답 확인, 성공 응답 fixture는 합성 데이터 |

마지막 프로토콜 확인일은 **2026-09-10**입니다. 더미 응답 점검은 실제 배송 성공을
검증하지 않습니다. 운송사 웹사이트는 이 패키지와 무관하게 변경될 수 있습니다.

## 시작하기

**Node.js 22.13 이상**이 필요합니다. WaybillKit은 ESM 패키지이며 브라우저 런타임은
지원하지 않습니다.

첫 npm 배포 전에는 Node.js 24와 `package.json`에 지정된 pnpm 버전을 사용하여 로컬
체크아웃에서 빌드합니다.

```sh
pnpm install --frozen-lockfile
pnpm build
```

프로젝트 루트의 JavaScript 모듈에서 다음과 같이 실행합니다.

```js
import { track } from './dist/index.js';

const result = await track({
  carrier: 'kr.daesin',
  trackingNumber: process.env.WAYBILLKIT_DAESIN_NUMBER,
  timeoutMs: 10_000,
});
```

`WAYBILLKIT_DAESIN_NUMBER`에는 조회 권한이 있는 대신택배 12자리 또는 13자리 운송장
번호를 설정합니다. 예정된 npm 패키지명은 `@esyeol/waybillkit`입니다.

## API

### `track(options)`

`carrier`, `trackingNumber`, `status`, `events`, `meta`를 반환합니다. 각 이벤트에는
정규화된 `status`, 고정된 `description`, `+09:00` 오프셋이 포함된 ISO 시각이 있습니다.
이벤트는 오래된 순으로 정렬되며, 해석할 수 없는 상태는 `UNKNOWN`으로 유지됩니다.

옵션으로 `timeoutMs`(기본 10초), `signal`을 통한 `AbortSignal`, 사용자 정의 `fetch`를
사용할 수 있습니다. 요청은 자동으로 재시도하거나 리다이렉트하지 않습니다.

`TrackingNotFoundError`는 운송사가 명시적으로 배송 이력 없음을 반환한 경우를 뜻합니다.
`ParseError`는 응답 구조를 해석할 수 없는 경우를 뜻합니다. HTTP 장애, 접근 거부,
요청 제한 및 타임아웃은 별도의 오류 클래스로 구분됩니다. 사용자 취소는
`AbortError`를 발생시킵니다.

### `parseTracking(options)`

네트워크 요청 없이 저장된 응답을 파싱합니다.

```js
import { readFile } from 'node:fs/promises';
import { parseTracking } from './dist/index.js';

const payload = await readFile('response.html', 'utf8');
const result = parseTracking({ carrier: 'kr.daesin', payload });
```

디코딩된 문자열이나 `Buffer`를 포함한 `Uint8Array`를 받을 수 있습니다. 바이트 데이터는
운송사의 기본 인코딩을 사용합니다. UTF-8로 저장한 파일에는 `encoding: 'utf-8'`을
지정합니다. 반환값에는 `trackingNumber`와 `meta.fetchedAt`이 포함되지 않습니다.

### `trackWithRaw(options)`

한 번의 조회에서 `{ result, raw }`를 반환합니다. `raw`에는 디코딩된 `body`, 서버가
선언한 `contentType`, 실제로 사용한 `encoding`이 포함됩니다. 원본 네트워크 바이트와는
다를 수 있습니다.

원문은 **비식별화되지 않았으며** 개인정보를 포함할 수 있습니다. 로그에 기록하거나
공개적으로 공유하지 마세요. 원문은 오류 객체에 포함되지 않습니다. 정규화된 결과에도
전달한 운송장 번호가 들어가므로 전체 결과를 그대로 기록하지 않는 것이 좋습니다.

## 로드맵

WaybillKit은 개발자에게 공개된 공식 배송 조회 API를 제공하지 않는 운송사를
시작점으로 삼습니다. 한국 운송사부터 지원 범위를 점진적으로 넓히고, 연동 검증이
가능해지는 대로 미국과 일본 운송사까지 확대할 계획입니다.

- 한국 택배·화물 운송사 지원 확대
- 같은 통합 API를 통한 미국 및 일본 운송사 지원
- 기여자가 제공한 비식별 응답 fixture와 실제 사용 검증으로 테스트 범위 확대
- GitHub Actions를 이용한 회귀 탐지와 운송사 연동 유지보수

미국과 일본 운송사 연동은 계획 단계이며 현재 사용할 수 없습니다. 사용자 수요,
사용 가능한 연동 방식 및 검증 자료를 기준으로 구현 우선순위를 정합니다. 이슈와
Pull Request를 통한 운송사 제안 및 기여를 환영합니다.

## 자동 검증

push와 Pull Request가 발생하면 GitHub Actions가 Node.js 22·24에서 코드 품질,
타입, 오프라인 테스트 및 패키지 설치를 검사하도록 준비되어 있습니다.

정기 운송사 점검을 활성화하면 선택한 운송사에 고정 더미값을 사용하여 하루 두 번
확인합니다. 선택적 이슈 자동화는 장애와 복구 상태를 기록합니다. 응답 파싱 실패가
반복되면 수정 제안을 생성할 수 있으며, 커밋된 근거가 충분한 변경만 검사를 통과한 뒤
유지관리자 검토용 Draft PR로 생성됩니다.

정기 점검과 수정 자동화는 아직 활성화되지 않았습니다. 더미 점검은 관찰된 미조회
응답만 확인하며, 실제 배송 성공이나 웹사이트의 모든 변경을 검증하지 않습니다.
각 연동을 검증하려면 사용자 제보와 실제 응답을 비식별화한 fixture가 계속 필요합니다.

## 책임 있는 사용

운송사 웹사이트와 배송 조회 엔드포인트는 여러 사용자가 함께 이용하는 서비스입니다.
WaybillKit을 이용해 무분별하게 요청을 보내거나 운송사 서비스에 과도한 부하 또는
장애를 유발해서는 안 됩니다.

- 각 운송사의 관련 약관과 접근 제한을 준수하세요. 공개적으로 접근할 수 있는 엔드포인트라고 해서 무제한 자동 조회가 허용되는 것은 아닙니다.
- 조회 권한이 있는 배송 건만 조회하세요. 운송장 번호를 순차적·무작위로 대입하거나 관련 없는 배송 정보를 대량 수집하지 마세요.
- 운송사별 요청 빈도와 동시 요청 수를 제한하세요. 적절한 경우 캐시된 결과를 재사용하고 중복 요청을 줄이며, 배송 완료 후 추가 갱신이 필요하지 않으면 주기적인 조회를 중단하세요.
- 요청 제한이나 반복적인 오류가 발생하면 요청 간격을 늘리고, 접근이 거부되면 요청을 중단하세요. CAPTCHA, 인증 또는 기타 접근 통제를 우회하지 마세요.

애플리케이션 트래픽뿐 아니라 정기 점검에도 같은 원칙을 적용하세요.
WaybillKit은 현재 자동 요청 속도 제한, 캐싱 또는 재시도를 제공하지 않으므로,
이를 사용하는 애플리케이션에서 적절한 요청 제어를 직접 구현해야 합니다.

## 기여하기

버그 제보, 운송사 검증 및 신규 어댑터 기여를 환영합니다. 개발 환경과 기여 규칙은
[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

이슈와 Pull Request에는 합성 또는 비식별화한 예시만 사용하세요. 실제 운송장 번호,
개인정보 또는 인증 정보를 포함하지 마세요.

## 라이선스

[Apache-2.0](LICENSE) · [NOTICE](NOTICE)

WaybillKit은 어떤 운송사와도 제휴 관계가 없습니다. 각 운송사의 관련 약관에 따라
엔드포인트를 사용하세요.
