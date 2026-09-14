import { approvedQuestions, warmupQuestions } from "./questions";

function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** 可計分題目（暖身 + 已審核）的穩定版本識別，題庫或審核變更時會更新。 */
export function computeQuestionBankVersion() {
  const payload = [...warmupQuestions, ...approvedQuestions]
    .map((item) => `${item.id}|${item.conceptId}|${item.auditStatus}|${item.options.join("\u001f")}`)
    .sort()
    .join("\n");
  return `${fnv1a(payload)}${fnv1a([...payload].reverse().join(""))}`;
}

export const QUESTION_BANK_VERSION = computeQuestionBankVersion();
