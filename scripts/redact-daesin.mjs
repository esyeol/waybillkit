import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";

// Rebuild an allowlisted structural fixture. Never copy arbitrary HTML attributes,
// personal-data fields, links, hidden inputs, scripts, comments or free text.
export function redactDaesin(input) {
  const $ = load(input);
  const area = $("#printarea");
  if (area.length !== 1) throw new Error("Unrecognized response container.");
  const tables = area.find("table");
  if (!tables.length) {
    if (
      !/운송된내역이없습니다\.$/.test(
        area.find(".effect").text().replace(/\s+/g, ""),
      )
    )
      throw new Error("Unrecognized empty response.");
    return '<!doctype html><meta charset="utf-8"><div id="printarea"><div class="effect">운송된 내역이 없습니다.</div></div>';
  }
  const headings = [
    "구분",
    "취급점명",
    "전화번호",
    "도착(접수)일시",
    "출발(배달)일시",
    "현재위치",
  ];
  const table = tables.filter(
    (_, t) =>
      $(t)
        .find("tr")
        .first()
        .find("th")
        .toArray()
        .map((c) => $(c).text().replace(/\s+/g, ""))
        .join("|") === headings.join("|"),
  );
  if (table.length !== 1) throw new Error("Unrecognized tracking table.");
  const rows = table
    .find("tr")
    .toArray()
    .slice(1)
    .map((row) => {
      const cells = $(row).children("td");
      if (cells.length !== 6) throw new Error("Unrecognized row.");
      const role = cells.eq(0).text().replace(/\s+/g, "");
      if (!/^(발송취급점|도착취급점|경유취급점\d*)$/.test(role))
        throw new Error("Review unknown role before redaction.");
      const marker = cells.eq(5).text().trim();
      if (marker && marker !== "배송완료")
        throw new Error("Review unknown marker before redaction.");
      const times = [3, 4].map((i) => cells.eq(i).text().trim());
      for (const time of times)
        if (
          time &&
          time !== "-" &&
          !/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(time)
        )
          throw new Error("Review unknown timestamp before redaction.");
      return { role: role.replace(/\d+$/, ""), marker, times };
    });
  const times = [
    ...new Set(rows.flatMap((r) => r.times).filter((t) => t && t !== "-")),
  ].sort();
  const mapping = new Map(
    times.map((t, i) => [
      t,
      new Date(Date.UTC(2026, 0, 2, 0, i))
        .toISOString()
        .slice(0, 16)
        .replace("T", " "),
    ]),
  );
  const body = rows
    .map(
      (r) =>
        "<tr>" +
        [
          r.role,
          "SYNTHETIC_BRANCH",
          "SYNTHETIC_PHONE",
          ...r.times.map((t) => mapping.get(t) ?? ""),
          r.marker,
        ]
          .map((t) => `<td>${t}</td>`)
          .join("") +
        "</tr>",
    )
    .join("\n");
  return (
    '<!doctype html><meta charset="utf-8"><div id="printarea">\n<table><tr><th>보내신분</th><td>PRIVATE_SENDER</td><th>받으실분</th><td>PRIVATE_RECIPIENT</td></tr></table>\n<table><tr>' +
    headings.map((h) => `<th>${h}</th>`).join("") +
    "</tr>\n" +
    body +
    "\n</table></div>"
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.length !== 3)
    throw new Error(
      "Usage: node scripts/redact-daesin.mjs PATH_TO_LOCAL_UTF8_HTML",
    );
  console.log(redactDaesin(readFileSync(process.argv[2], "utf8")));
}
