import type { Question } from './questions';
import { isLocationRecall } from './question-demand';

// 學術來源保留在資料中供查核；只有符合旅行主題的題目進入闖關。
export function isTravelFocused(question: Question) {
  if (question.travelFocus) return true;
  if (question.kind === 'tf' || isLocationRecall(question.q)) return false;
  if (question.id.startsWith('source:')) return false;
  return question.category === '旅行知識' || question.category === '世界遺產';
}
export function isPlayableTravelContent(question: Question) {
  // 舊版情境題保留供編修與查核；全年齡益智闖關使用新的審核題庫。
  return question.kind === 'tf' || Boolean(question.puzzleType);
}
