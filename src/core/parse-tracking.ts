// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import iconv from "iconv-lite";
import { parseChunilps } from "../carriers/kr-chunilps/parse.js";
import { parseDaesin } from "../carriers/kr-daesin/parse.js";
import { parseIlyanglogis } from "../carriers/kr-ilyanglogis/parse.js";
import { parseKdexp } from "../carriers/kr-kdexp/parse.js";
import { parseKunyoung } from "../carriers/kr-kunyoung/parse.js";
import { ParseError } from "./errors.js";
import type {
  CarrierId,
  ParsedTrackingResult,
  ParseTrackingOptions,
  PayloadEncoding,
  TrackingSource,
} from "./types.js";

const settings: Record<
  CarrierId,
  {
    name: string;
    encoding: PayloadEncoding;
    source: TrackingSource;
    parse: (payload: string) => Pick<ParsedTrackingResult, "events" | "status">;
  }
> = {
  "kr.daesin": {
    name: "대신택배",
    encoding: "euc-kr",
    source: "HTML",
    parse: parseDaesin,
  },
  "kr.kdexp": {
    name: "경동택배",
    encoding: "utf-8",
    source: "JSON",
    parse: parseKdexp,
  },
  "kr.chunilps": {
    name: "천일택배",
    encoding: "utf-8",
    source: "HTML",
    parse: parseChunilps,
  },
  "kr.kunyoung": {
    name: "건영택배",
    encoding: "euc-kr",
    source: "HTML",
    parse: parseKunyoung,
  },
  "kr.ilyanglogis": {
    name: "일양로지스",
    encoding: "utf-8",
    source: "JSON",
    parse: parseIlyanglogis,
  },
};

/** Parse existing carrier content without network access or invented fetch metadata. */
export function parseTracking(
  options: ParseTrackingOptions,
): ParsedTrackingResult {
  const carrier = settings[options.carrier];
  if (!carrier) throw new RangeError("Unsupported carrier.");
  const encoding = options.encoding ?? carrier.encoding;
  if (encoding !== "euc-kr" && encoding !== "utf-8") {
    throw new RangeError("Unsupported payload encoding.");
  }
  let payload: string;
  if (typeof options.payload === "string") payload = options.payload;
  else if (options.payload instanceof Uint8Array) {
    payload = iconv.decode(Buffer.from(options.payload), encoding);
  } else
    throw new ParseError(
      "Expected decoded content or a Uint8Array payload.",
      options.carrier,
    );
  return {
    carrier: { id: options.carrier, name: carrier.name },
    ...carrier.parse(payload),
    meta: { source: carrier.source, locale: "ko-KR" },
  };
}
