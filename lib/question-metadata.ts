export type AuditStatus = "pending" | "approved" | "disabled";

export type QuestionSource = {
  label: string;
  auditStatus: AuditStatus;
};

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

export function makeQuestionId(prefix: string, seed: string) {
  return `${prefix}:${stableHash(seed)}`;
}

export function makeConceptId(kind: string, subject: string) {
  return `${kind}:${subject.trim()}`;
}

export function makeFactConceptId(subject: string) {
  return makeConceptId("fact", subject);
}

type ConceptRaw = {
  q: string;
  landmark?: string;
  landmarkDetail?: string;
};

/** 從題幹推斷「同一個知識點」，避免手寫題與自動題文字相同卻被當成不同題。 */
export function inferConceptIdFromQuestionText(q: string): string | null {
  const capitalMatch = q.match(/^(.+?)的首都/);
  if (capitalMatch) return makeFactConceptId(`country:${capitalMatch[1]}`);

  const continentMatch = q.match(/^(.+?)位於哪一洲/);
  if (continentMatch) return makeFactConceptId(`country:${continentMatch[1]}`);

  const reverseCapitalMatch = q.match(/^哪一個國家的首都是(.+?)[？?]$/);
  if (reverseCapitalMatch) return makeFactConceptId(`capital-city:${reverseCapitalMatch[1]}`);

  const cityCountryMatch = q.match(/^(.+?)位於哪一個國家/);
  if (cityCountryMatch) return makeFactConceptId(`city:${cityCountryMatch[1]}`);

  const landmarkCityMatch = q.match(/^(.+?)位於哪一座城市[？?]$/);
  if (landmarkCityMatch) return makeFactConceptId(landmarkCityMatch[1]);

  return null;
}

/** 同一地標／國家只出一題，避免「首都＋洲別＋是非」重複考同一個地方。 */
export function conceptIdForRawQuestion(
  raw: ConceptRaw,
  fallbackKind: string,
  fallbackIndex: number,
) {
  const inferred = inferConceptIdFromQuestionText(raw.q);
  if (inferred) return inferred;
  if (raw.landmark) return makeFactConceptId(raw.landmark);
  if (raw.landmarkDetail?.includes("・")) {
    return makeFactConceptId(raw.landmarkDetail.split("・")[0]);
  }
  return makeConceptId(fallbackKind, String(fallbackIndex));
}

export const QUESTION_SOURCES = {
  warmup: { label: "內建送分題庫", auditStatus: "approved" as const },
  /** 精選題需通過 validate 腳本後才在 question-audit.json 標為 approved。 */
  handCurated: { label: "內建精選題庫", auditStatus: "pending" as const },
  travelKnowledge: { label: "內建旅行知識", auditStatus: "pending" as const },
  tour: { label: "內建行程題庫", auditStatus: "pending" as const },
  restCountries: { label: "REST Countries", auditStatus: "approved" as const },
  expandedPending: { label: "REST Countries（待人工覆核）", auditStatus: "pending" as const },
  worldHeritage: { label: "世界遺產題庫", auditStatus: "approved" as const },
} satisfies Record<string, QuestionSource>;
