// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

export const repository = "https://github.com/esyeol/waybillkit";
const diagnosis = `${repository}/actions/runs/35496104145`;
const code = (value) =>
  `<pre><code>${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code></pre>`;
const setup = code(`git clone https://github.com/esyeol/waybillkit.git
cd waybillkit
pnpm install --frozen-lockfile
pnpm build`);
const example = code(`import { track } from './dist/index.js';

const trackingNumber = process.env.WAYBILLKIT_DAESIN_NUMBER;
if (!trackingNumber) throw new Error('Set an authorized waybill number');

const result = await track({
  carrier: 'kr.daesin',
  trackingNumber,
  timeoutMs: 10_000,
});

// Avoid logging complete results: they include the waybill number.
console.log(result.status);`);
const parseExample = code(`import { readFile } from 'node:fs/promises';
import { parseTracking } from './dist/index.js';

const payload = await readFile('response.html');
const result = parseTracking({
  carrier: 'kr.daesin',
  payload,
  encoding: 'utf-8', // Use euc-kr for original Daesin response bytes.
});`);
const statuses = code(`UNKNOWN · INFO_RECEIVED · PICKED_UP · IN_TRANSIT
AT_LOCAL_FACILITY · OUT_FOR_DELIVERY · DELIVERED
AVAILABLE_FOR_PICKUP · EXCEPTION · RETURNED`);
const carriers = [
  [
    "대신택배 · Daesin",
    "kr.daesin",
    "https://www.ds3211.co.kr/",
    "EUC-KR HTML",
  ],
  ["경동택배 · Kyungdong", "kr.kdexp", "https://kdexp.com/", "UTF-8 JSON"],
  [
    "천일택배 · Chunil",
    "kr.chunilps",
    "https://www.chunil.co.kr/",
    "UTF-8 HTML",
  ],
  [
    "건영택배 · Kunyoung",
    "kr.kunyoung",
    "https://mj.kunyoung.com/",
    "UTF-8 JSON",
  ],
  [
    "일양로지스 · Ilyang",
    "kr.ilyanglogis",
    "https://www.ilyanglogis.co.kr/",
    "UTF-8 JSON",
  ],
];
function carrierTable(ko) {
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${ko ? "운송사 검증 범위" : "Carrier verification evidence"}"><table><caption>${ko ? "구현된 어댑터와 검증 근거 — 실시간 상태가 아닙니다" : "Implemented adapters and evidence — not live service status"}</caption><thead><tr><th scope="col">${ko ? "운송사 / 공식 사이트" : "Carrier / official site"}</th><th scope="col">ID / ${ko ? "형식" : "format"}</th><th scope="col">${ko ? "성공 응답 검증" : "Successful-response evidence"}</th></tr></thead><tbody>${carriers.map(([name, id, url, format], index) => `<tr><th scope="row"><a href="${url}">${name}</a></th><td><code>${id}</code><small>${format}</small></td><td>${index === 0 ? (ko ? "비식별 실제 배송 완료 fixture. GitHub 실행 환경에서는 연결 실패 관찰." : "Redacted live delivered fixture. Connection failures observed on GitHub runners.") : ko ? "합성 fixture만 있음. 더미 미조회 응답은 확인했지만 실제 배송 성공은 미검증." : "Synthetic fixtures only. Dummy no-history response checked; live successful shipments unverified."}</td></tr>`).join("")}</tbody></table></div>`;
}

export const locales = {
  en: {
    other: "한국어",
    skip: "Skip to content",
    navigation: "Documentation",
    edit: "Edit this documentation",
    description:
      "TypeScript SDK documentation for Korean parcel and freight tracking: setup, API reference, carriers and limitations.",
    footer:
      "Independent, unofficial integrations. Not affiliated with any carrier.",
    sections: [
      {
        id: "overview",
        title: "Overview",
        body: `<p>WaybillKit is a TypeScript SDK for tracking shipments across Korean parcel and freight carriers. It sends requests directly to carrier websites and returns a common result format.</p><div class="callout"><strong>Experimental</strong><p>Not yet published to npm. Requires Node.js 22.13+ and ESM. These are unofficial integrations; carrier websites can change independently of this package.</p></div><h3 id="features">Features</h3><ul><li>Five Korean carriers through the same <code>track</code> interface.</li><li>Normalized statuses and chronological tracking events.</li><li>Offline parsing of saved HTML and JSON responses.</li><li>Request timeouts, cancellation and an injectable <code>fetch</code>.</li><li>Separate errors for no history, unexpected responses and connection failures.</li></ul><h3 id="documentation">Using this documentation</h3><p>Follow <a href="#getting-started">Getting started</a> to build from source and run your first query. The <a href="#api">API reference</a> covers options, result types and errors.</p><p>Before deploying, review <a href="#carriers">carrier verification evidence</a>, <a href="#limitations">network limitations</a> and <a href="#responsible-use">responsible use</a>. Dummy checks do not establish that successful shipment tracking works.</p><h3 id="roadmap">Roadmap</h3><p>We start with carriers without a publicly available official developer tracking API. Additional Korean carriers are planned, followed by the United States and Japan as integrations can be validated. US and Japanese adapters are not available yet.</p><p>Reports, redacted response fixtures and new adapters are welcome. See <a href="#contributing">Contributing</a>.</p>`,
      },
      {
        id: "getting-started",
        title: "Getting started",
        body: `<div class="callout"><strong>Build from source for now.</strong><p>The planned package is <code>@esyeol/waybillkit</code>, but it is not published to npm. These instructions use a local checkout.</p></div><h3 id="requirements">Requirements</h3><p>Use Node.js 24 for development and the pnpm version pinned in <code>package.json</code>. The SDK supports Node.js 22.13+ and ESM; browser runtimes are not supported.</p><h3 id="installation">Build from source</h3>${setup}<h3 id="first-query">Your first query</h3><p>Save the following as <code>example.mjs</code> in the repository root. Set <code>WAYBILLKIT_DAESIN_NUMBER</code> in your local environment to a 12- or 13-digit waybill you are authorized to query, then run <code>node example.mjs</code>. Do not commit the number.</p>${example}<p>Test connectivity from your own deployment environment before relying on an integration. See <a href="#limitations">Daesin’s runner limitation</a>. This documentation site never queries carriers.</p>`,
      },
      {
        id: "api",
        title: "API reference",
        body: `<h3 id="track"><code>track(options)</code></h3><p>Required: <code>carrier</code> (one of the IDs below) and <code>trackingNumber</code> (string). Optional: <code>timeoutMs</code> (default 10,000), <code>signal</code> (<code>AbortSignal</code>) and an injectable <code>fetch</code>.</p><p>Returns <code>carrier</code> (<code>id</code>, <code>name</code>), <code>trackingNumber</code>, <code>status</code>, <code>events</code> and <code>meta</code> (<code>source</code>, <code>locale</code>, <code>fetchedAt</code>). Events have <code>status</code>, a fixed <code>description</code> and an ISO <code>time</code> with a <code>+09:00</code> offset, oldest first. Unknown states stay <code>UNKNOWN</code>.</p>${statuses}<h3 id="parse-tracking"><code>parseTracking(options)</code></h3><p>Offline parsing with <code>carrier</code> and <code>payload</code>: a decoded string or <code>Uint8Array</code>, including <code>Buffer</code>. Byte decoding defaults to the carrier encoding; use <code>encoding</code> to override it. String payloads are already decoded.</p>${parseExample}<p>Returns the normalized result without <code>trackingNumber</code> or <code>meta.fetchedAt</code>. Source is <code>HTML</code> or <code>JSON</code>; locale is <code>ko-KR</code>.</p><h3 id="track-with-raw"><code>trackWithRaw(options)</code></h3><p>The same options as <code>track</code>. Returns <code>{ result, raw }</code> from one request. <code>raw</code> contains decoded <code>body</code>, declared <code>contentType</code> and actual <code>encoding</code>, not original network bytes.</p><div class="callout warning"><strong>Raw responses are not redacted.</strong><p>They may contain personal data. Never publish or routinely log them. Even normalized results include the supplied waybill number. Raw content is not attached to errors.</p></div><h3 id="errors">Error handling</h3><ul><li><code>InvalidTrackingNumberError</code>: invalid input format.</li><li><code>TrackingNotFoundError</code>: recognized no-history response, not proof the number never existed.</li><li><code>ParseError</code>: unrecognized response structure.</li><li><code>CarrierTimeoutError</code> / <code>CarrierUnavailableError</code>: request timeout or availability failure.</li><li><code>CarrierAuthError</code> / <code>CarrierRateLimitedError</code>: access denied or rate limited. Stop or back off; do not bypass restrictions.</li></ul><p>These classes extend <code>WaybillKitError</code>. Caller cancellation raises <code>AbortError</code>; unsupported carrier/encoding or invalid timeout options can raise <code>RangeError</code>. The SDK does not automatically retry or follow redirects.</p>`,
      },
      {
        id: "carriers",
        title: "Carriers & evidence",
        body: `${carrierTable(false)}<p>Evidence reflects committed fixtures and investigations, not an uptime guarantee. A recognized dummy response only verifies the no-history contract. It does not validate real shipment events, status mapping or every carrier response.</p><p>Kunyoung uses the current <a href="https://mj.kunyoung.com/">public tracking UI</a> and its UTF-8 JSON endpoint. Offline parsing also accepts saved legacy EUC-KR HTML; metadata identifies the actual format. Successful JSON events still need redacted live evidence.</p><p>Inspect <a href="${repository}/tree/main/tests/fixtures">fixture provenance</a> and <a href="${repository}/actions/workflows/carrier-check.yml">recent carrier check reports</a> for the underlying evidence.</p>`,
      },
      {
        id: "limitations",
        title: "Network & automation",
        body: `<h3>Daesin: environment-dependent connectivity</h3><p>On 20 September 2026, local dummy queries succeeded, while a GitHub-hosted Azure eastus runner resolved DNS but did not establish a TCP connection. Instrumented Node HTTPS and curl IPv4 probes both timed out before TLS or HTTP. This does not establish the cause or prove all GitHub regions are blocked.</p><p>The adapter sends a form-encoded <code>POST</code> with <code>billno</code> to <code>https://www.ds3211.co.kr/freight/internalFreightSearch.ht</code>. Opening that URL in an address bar sends a parameterless GET, so its error page is not the same request. A runner timeout is not evidence of a parser defect or a POST-specific block.</p><p><a href="${diagnosis}">Read the diagnostic run</a> · <a href="${repository}/issues/1">Follow the carrier incident</a>. Verify access in your target runtime; do not disable TLS checks or bypass access controls.</p><h3>What automation actually verifies</h3><p>As of 20 September 2026, scheduled dummy checks and issue automation are enabled for all five carriers. Checks are scheduled twice daily at 00:17 and 12:17 UTC (09:17 and 21:17 KST); GitHub may delay scheduled runs. Each check makes one sequential request per carrier, with a 10-second timeout and no retries.</p><p>A green workflow means the report completed, not that every carrier is healthy. Reports distinguish recognized no-history responses, timeouts, unavailable services and unrecognized contracts. Issues track failures and recovery.</p><p>Optional repair automation is currently disabled. When enabled, repeated unrecognized contracts may propose evidence-backed draft PRs for review. Transport failures do not trigger parser repair, and changes are not automatically merged.</p>`,
      },
      {
        id: "responsible-use",
        title: "Responsible use",
        body: `<p>These are unofficial integrations with shared carrier services, not official carrier APIs or availability guarantees. Public access does not imply permission for unrestricted automation. Follow each carrier’s terms and access restrictions.</p><ul><li>Query only shipments you are authorized to access. Never enumerate waybill numbers or collect unrelated shipment data in bulk.</li><li>Limit request frequency and concurrency per carrier. Cache results, avoid duplicates and stop polling delivered shipments when updates are no longer needed.</li><li>Back off after rate limits or repeated failures. Stop when access is denied. Never bypass authentication, CAPTCHA or TLS validation.</li><li>Keep waybills, raw responses, cookies and personal data out of public issues and logs.</li></ul><p>The SDK has no automatic rate limiting, caching or retries. Your application must provide those controls. These rules also apply to scheduled checks.</p>`,
      },
      {
        id: "contributing",
        title: "Contributing",
        body: `<p>Reports, redacted evidence and new adapters are welcome. Start with an issue describing the carrier, environment, error class and expected behavior. Use synthetic or carefully redacted examples, never real waybills or credentials.</p><p>For a new adapter, independently verify the official query flow and provide found/not-found fixtures with their provenance. Reference projects can guide investigation but are not proof of current behavior. Do not copy incompatibly licensed code.</p><p>Use issue → branch → development → offline tests → PR → review → merge. Run <code>pnpm check</code> before opening a PR. It includes Node-compatible offline tests, package checks and site validation; package installation checks require registry access, but unit tests never query carriers.</p><div class="link-row"><a class="button" href="${repository}/issues/new/choose">Open an issue</a><a href="${repository}/blob/main/CONTRIBUTING.md">Contribution guide ↗</a></div><p>WaybillKit is licensed under <a href="${repository}/blob/main/LICENSE">Apache-2.0</a>. See <a href="${repository}/blob/main/NOTICE">NOTICE</a> for attribution.</p>`,
      },
    ],
  },
  ko: {
    other: "English",
    skip: "본문으로 이동",
    navigation: "문서 안내",
    edit: "문서 수정 제안",
    description:
      "국내 택배·화물 조회를 위한 TypeScript SDK 문서: 설치, API 레퍼런스, 지원 운송사와 제약 사항.",
    footer: "독립적인 비공식 연동입니다. 어떤 운송사와도 제휴하지 않습니다.",
    sections: [
      {
        id: "overview",
        title: "프로젝트 소개",
        body: `<p>WaybillKit은 국내 택배·화물 운송사의 배송 조회를 위한 TypeScript SDK입니다. 운송사 웹사이트에 직접 요청하고 공통 결과 형식으로 반환합니다.</p><div class="callout"><strong>실험 단계</strong><p>아직 npm에 배포하지 않았습니다. Node.js 22.13 이상과 ESM이 필요합니다. 비공식 연동이므로 운송사 웹사이트는 이 패키지와 무관하게 바뀔 수 있습니다.</p></div><h3 id="features">주요 기능</h3><ul><li>동일한 <code>track</code> 인터페이스로 국내 운송사 5곳 조회</li><li>공통 배송 상태와 시간순 이벤트 제공</li><li>저장된 HTML·JSON 응답의 오프라인 파싱</li><li>요청 타임아웃, 취소 및 사용자 정의 <code>fetch</code></li><li>배송 이력 없음, 예상하지 못한 응답, 연결 실패를 구분하는 오류</li></ul><h3 id="documentation">문서 안내</h3><p><a href="#getting-started">시작하기</a>에서 소스 빌드와 첫 조회 방법을 확인하세요. 옵션, 반환 타입과 오류는 <a href="#api">API 레퍼런스</a>에서 설명합니다.</p><p>배포 전에는 <a href="#carriers">운송사별 검증 범위</a>, <a href="#limitations">네트워크 제약</a>, <a href="#responsible-use">책임 있는 사용</a>을 확인하세요. 더미 응답 확인이 실제 배송 성공을 검증하는 것은 아닙니다.</p><h3 id="roadmap">로드맵</h3><p>개발자에게 공개된 공식 배송 조회 API가 없는 운송사부터 시작합니다. 국내 지원을 늘리고 검증이 가능해지는 대로 미국·일본으로 확대할 계획입니다. 미국·일본 어댑터는 아직 제공하지 않습니다.</p><p>문제 제보, 비식별 응답 fixture, 신규 어댑터 기여를 환영합니다. <a href="#contributing">기여하기</a>를 참고하세요.</p>`,
      },
      {
        id: "getting-started",
        title: "시작하기",
        body: `<div class="callout"><strong>현재는 소스에서 빌드합니다.</strong><p>예정된 패키지명은 <code>@esyeol/waybillkit</code>이며 아직 npm에 배포하지 않았습니다. 아래 예제는 로컬 체크아웃 기준입니다.</p></div><h3 id="requirements">실행 환경</h3><p>개발에는 Node.js 24와 <code>package.json</code>에 지정된 pnpm 버전을 사용하세요. SDK는 Node.js 22.13 이상과 ESM을 지원하며 브라우저 런타임은 지원하지 않습니다.</p><h3 id="installation">소스 빌드</h3>${setup}<h3 id="first-query">첫 조회</h3><p>저장소 루트에 아래 내용을 <code>example.mjs</code>로 저장하세요. 조회 권한이 있는 대신택배 12자리 또는 13자리 운송장 번호를 로컬 환경 변수 <code>WAYBILLKIT_DAESIN_NUMBER</code>에 설정한 뒤 <code>node example.mjs</code>로 실행합니다. 운송장 번호를 커밋하지 마세요.</p>${example}<p>실제 배포 환경에서 연결 가능 여부를 먼저 확인하세요. <a href="#limitations">대신택배의 실행 환경 제약</a>도 참고하세요. 이 문서 사이트는 운송사에 조회 요청을 보내지 않습니다.</p>`,
      },
      {
        id: "api",
        title: "API 레퍼런스",
        body: `<h3 id="track"><code>track(options)</code></h3><p>필수 옵션은 아래 ID 중 하나인 <code>carrier</code>와 문자열 <code>trackingNumber</code>입니다. 선택 옵션은 <code>timeoutMs</code>(기본 10,000), <code>signal</code>(<code>AbortSignal</code>), 주입 가능한 <code>fetch</code>입니다.</p><p><code>carrier</code>(<code>id</code>, <code>name</code>), <code>trackingNumber</code>, <code>status</code>, <code>events</code>, <code>meta</code>(<code>source</code>, <code>locale</code>, <code>fetchedAt</code>)를 반환합니다. 이벤트는 <code>status</code>, 고정된 <code>description</code>, <code>+09:00</code> 오프셋의 ISO <code>time</code>을 가지며 오래된 순으로 정렬됩니다. 모르는 상태는 <code>UNKNOWN</code>으로 유지합니다.</p>${statuses}<h3 id="parse-tracking"><code>parseTracking(options)</code></h3><p><code>carrier</code>와 <code>payload</code>로 오프라인 파싱합니다. 디코딩된 문자열 또는 <code>Buffer</code>를 포함한 <code>Uint8Array</code>를 받습니다. 바이트는 운송사 기본 인코딩을 사용하며 <code>encoding</code>으로 변경할 수 있습니다. 문자열은 이미 디코딩된 값입니다.</p>${parseExample}<p>정규화 결과에서 <code>trackingNumber</code>와 <code>meta.fetchedAt</code>을 제외한 값을 반환합니다. <code>source</code>는 <code>HTML</code> 또는 <code>JSON</code>이며, <code>locale</code>은 <code>ko-KR</code>입니다.</p><h3 id="track-with-raw"><code>trackWithRaw(options)</code></h3><p><code>track</code>과 같은 옵션으로 한 번 요청하여 <code>{ result, raw }</code>를 반환합니다. <code>raw</code>에는 디코딩된 <code>body</code>, 서버가 선언한 <code>contentType</code>, 실제 <code>encoding</code>이 있습니다. 원본 네트워크 바이트는 아닙니다.</p><div class="callout warning"><strong>원문은 비식별화되지 않습니다.</strong><p>개인정보를 포함할 수 있으므로 공개하거나 상시 로깅하지 마세요. 정규화 결과에도 입력한 운송장 번호가 포함됩니다. 원문은 오류 객체에 첨부하지 않습니다.</p></div><h3 id="errors">오류 처리</h3><ul><li><code>InvalidTrackingNumberError</code>: 입력 형식 오류.</li><li><code>TrackingNotFoundError</code>: 명시적인 배송 이력 없음 응답. 해당 번호가 존재한 적 없다는 뜻은 아닙니다.</li><li><code>ParseError</code>: 인식하지 못한 응답 구조.</li><li><code>CarrierTimeoutError</code> / <code>CarrierUnavailableError</code>: 요청 시간 초과 또는 연결·가용성 오류.</li><li><code>CarrierAuthError</code> / <code>CarrierRateLimitedError</code>: 접근 거부 또는 요청 제한. 요청을 멈추거나 간격을 늘리고 제한을 우회하지 마세요.</li></ul><p>위 클래스는 <code>WaybillKitError</code>를 상속합니다. 호출자 취소는 <code>AbortError</code>, 미지원 운송사·인코딩 또는 잘못된 타임아웃 옵션은 <code>RangeError</code>를 발생시킬 수 있습니다. 자동 재시도나 리다이렉트는 하지 않습니다.</p>`,
      },
      {
        id: "carriers",
        title: "지원 운송사와 검증 범위",
        body: `${carrierTable(true)}<p>위 표는 커밋된 fixture와 조사 근거를 설명하며 가동률을 보장하지 않습니다. 더미 응답 확인은 배송 이력 없음 계약만 검증하며, 실제 배송 이벤트·상태 매핑·모든 응답을 검증하지는 않습니다.</p><p>건영은 현재 <a href="https://mj.kunyoung.com/">공개 조회 화면</a>의 UTF-8 JSON 경로를 사용합니다. 오프라인 파싱은 저장된 기존 EUC-KR HTML도 지원하며 메타데이터에 실제 형식을 표시합니다. 성공 JSON 이벤트는 비식별 실제 응답으로 추가 검증해야 합니다.</p><p><a href="${repository}/tree/main/tests/fixtures">fixture 출처</a>와 <a href="${repository}/actions/workflows/carrier-check.yml">최근 운송사 점검 보고서</a>에서 근거를 확인할 수 있습니다.</p>`,
      },
      {
        id: "limitations",
        title: "네트워크 제약과 자동 점검",
        body: `<h3>대신택배: 실행 환경에 따른 연결 차이</h3><p>2026년 9월 20일 로컬 더미 조회는 성공했지만, GitHub 호스팅 Azure eastus 실행 환경은 DNS 조회 후 TCP 연결을 수립하지 못했습니다. Node HTTPS와 curl의 IPv4 진단 모두 TLS·HTTP 이전에 시간 초과가 발생했습니다. 원인이나 모든 GitHub 지역의 차단 여부가 확정된 것은 아닙니다.</p><p>어댑터는 <code>https://www.ds3211.co.kr/freight/internalFreightSearch.ht</code>로 <code>billno</code>가 포함된 폼 인코딩 <code>POST</code> 요청을 보냅니다. 주소창에서 열면 인자 없는 GET 요청이 되므로 그 오류 페이지와는 다른 요청입니다. 실행 환경의 타임아웃이 파서 결함이나 POST만의 차단을 뜻하지는 않습니다.</p><p><a href="${diagnosis}">진단 실행 결과</a> · <a href="${repository}/issues/1">운송사 장애 이슈</a>. 실제 운영 환경에서 접근을 확인하고 TLS 검증이나 접근 통제를 우회하지 마세요.</p><h3>자동 점검이 확인하는 범위</h3><p>2026년 9월 20일 기준 운송사 5곳의 정기 더미 점검과 이슈 자동화가 활성화되어 있습니다. UTC 00:17·12:17(KST 09:17·21:17)에 하루 두 번 예약되지만 GitHub 사정으로 지연될 수 있습니다. 운송사마다 순차적으로 한 번 요청하고, 타임아웃은 10초이며 재시도하지 않습니다.</p><p>워크플로의 초록색 성공 표시는 보고서 작성 완료이지 모든 운송사의 정상을 뜻하지 않습니다. 보고서는 미조회 응답 확인, 타임아웃, 이용 불가, 응답 구조 불일치를 구분하며, 이슈는 장애와 복구를 기록합니다.</p><p>선택적인 수정 자동화는 현재 비활성화되어 있습니다. 활성화하면 반복적인 응답 구조 불일치에 대해 근거가 있는 Draft PR을 제안할 수 있습니다. 연결 실패는 파서 수정 대상이 아니며 변경을 자동 병합하지 않습니다.</p>`,
      },
      {
        id: "responsible-use",
        title: "책임 있는 사용",
        body: `<p>공유 운송사 서비스에 대한 비공식 연동이며 공식 API나 가용성 보장이 아닙니다. 공개 접근 가능하다고 무제한 자동 조회가 허용되는 것은 아닙니다. 각 운송사의 약관과 접근 제한을 준수하세요.</p><ul><li>조회 권한이 있는 배송 건만 확인하세요. 운송장 번호를 순차·무작위로 대입하거나 관계없는 배송 정보를 대량 수집하지 마세요.</li><li>운송사별 요청 빈도와 동시성을 제한하세요. 캐시와 중복 제거를 활용하고 배송 완료 후 갱신이 필요 없으면 조회를 중단하세요.</li><li>요청 제한이나 반복 실패 시 간격을 늘리고 접근 거부 시 멈추세요. 인증·CAPTCHA·TLS 검증을 우회하지 마세요.</li><li>실제 운송장, 원문 응답, 쿠키와 개인정보를 공개 이슈나 로그에 남기지 마세요.</li></ul><p>SDK는 자동 요청 속도 제한·캐싱·재시도를 제공하지 않습니다. 애플리케이션에서 직접 제어해야 합니다. 정기 점검에도 같은 원칙을 적용합니다.</p>`,
      },
      {
        id: "contributing",
        title: "기여하기",
        body: `<p>문제 제보, 비식별 근거 자료, 신규 어댑터 기여를 환영합니다. 운송사·실행 환경·오류 클래스·예상 동작을 이슈로 먼저 설명하세요. 실제 운송장이나 인증 정보 대신 합성 또는 꼼꼼히 비식별화한 예시를 사용하세요.</p><p>새 어댑터는 공식 조회 흐름을 독립적으로 확인하고 성공·미조회 fixture와 출처를 제공해야 합니다. 참고 프로젝트는 조사에 도움을 줄 뿐 현재 동작의 증거가 아닙니다. 호환되지 않는 라이선스의 코드를 복사하지 마세요.</p><p>이슈 → 브랜치 → 개발 → 오프라인 테스트 → PR → 검토 → 병합 순서로 진행합니다. PR 전에 <code>pnpm check</code>를 실행하세요. 오프라인 테스트·패키지 검사·사이트 검증을 포함합니다. 패키지 설치 검사에는 레지스트리 접근이 필요하지만 단위 테스트는 운송사에 요청하지 않습니다.</p><div class="link-row"><a class="button" href="${repository}/issues/new/choose">이슈 등록하기</a><a href="${repository}/blob/main/CONTRIBUTING.md">기여 가이드 ↗</a></div><p>WaybillKit의 라이선스는 <a href="${repository}/blob/main/LICENSE">Apache-2.0</a>입니다. 저작권 고지는 <a href="${repository}/blob/main/NOTICE">NOTICE</a>를 확인하세요.</p>`,
      },
    ],
  },
};
