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
