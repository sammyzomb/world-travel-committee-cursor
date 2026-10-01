/** 認知要求依題幹判定，不能把冷門首都或城市名稱當成推理題。 */
export function isLocationRecall(q: string) {
  return /首都|哪一洲|哪個洲|位於.*哪.*(?:國|城市|州|省|地區|邦)|屬於哪.*國|隸屬哪.*國|哪一.*國家.*(?:位於|擁有)/.test(q);
}

export function questionDemand(question: { q: string; demand?: number; kind?: string }) {
  if (question.demand !== undefined) return question.demand;
  if (question.kind === "tf" || isLocationRecall(question.q)) return 1;
  if (/若|假設|根據|情境|比較|判斷|推論|規劃|取捨/.test(question.q)) return 2;
  if (/原因|形成|作用|為什麼|主要用途|目的|較.*做法|應.*行動|應對|如何|哪種.*作用/.test(question.q)) return 2;
  return 1;
}

export function minDemandForStage(stageIndex: number) {
  if (stageIndex <= 4) return 1;
  if (stageIndex <= 8) return 2;
  if (stageIndex <= 13) return 3;
  return 4;
}

export function questionFamily(question: { q: string; family?: string; questionType: string; classification?: { subtopic: string } }) {
  if (isLocationRecall(question.q)) return "location-recall";
  return question.family ?? question.classification?.subtopic ?? question.questionType;
}
