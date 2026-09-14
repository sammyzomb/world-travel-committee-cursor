const CONTINENTS = new Set([
  "亞洲",
  "歐洲",
  "非洲",
  "北美洲",
  "南美洲",
  "大洋洲",
  "南極洲",
  "中美洲",
]);

function safeLabel(landmark: string | undefined, correctAnswer: string, fallback: string) {
  if (!landmark) return fallback;
  if (correctAnswer && landmark.includes(correctAnswer)) return fallback;
  return landmark;
}

function isTrueFalseAnswer(answer: string) {
  return answer === "是" || answer === "否";
}

/** 答題前不得顯示會直接提示正確答案的區域標籤。 */
export function regionLeaksAnswer(input: {
  kind?: "tf" | "choice";
  questionText: string;
  region: string;
  correctAnswer: string;
}): boolean {
  const { kind, questionText, region, correctAnswer } = input;
  if (!region) return false;
  if (region === "洲別測驗" || region === "送分題" || region === "世界地理") return false;
  if (kind === "tf") return true;
  if (region === correctAnswer) return true;
  if (questionText.includes(region)) return true;
  if (
    (questionText.includes("哪一洲") || questionText.includes("位於哪一洲")) &&
    CONTINENTS.has(region)
  ) {
    return true;
  }
  return false;
}

export function shouldShowRegionChip(input: {
  kind?: "tf" | "choice";
  questionText: string;
  region: string;
  category?: string;
  correctAnswer: string;
}): boolean {
  const { region, category } = input;
  if (!region) return false;
  if (regionLeaksAnswer(input)) return false;
  if (category === "旅行知識" || category === "世界遺產") return true;
  return region !== "世界地理";
}

/** 答題前畫面不得直接透露正確答案。 */
export function safeVisualCaption(input: {
  questionText: string;
  correctAnswer: string;
  region: string;
  landmark?: string;
  landmarkDetail?: string;
}) {
  const { questionText, correctAnswer, region, landmark, landmarkDetail } = input;
  const [countryPart, cityPart] = (landmarkDetail ?? "").split("・");

  const genericLandmark = safeLabel(landmark, correctAnswer, "旅遊地標");

  if (isTrueFalseAnswer(correctAnswer)) {
    if (region && questionText.includes(region)) {
      return { label: genericLandmark, detail: "地理提示" };
    }
    if (countryPart && questionText.includes(countryPart)) {
      return { label: genericLandmark, detail: "地理提示" };
    }
    if (landmarkDetail) {
      const detail =
        countryPart && !questionText.includes(countryPart) ? countryPart : "地理提示";
      return { label: genericLandmark, detail };
    }
    return { label: genericLandmark, detail: "地理提示" };
  }

  if (questionText.includes("哪一洲") || questionText.includes("位於哪一洲")) {
    return { label: genericLandmark, detail: "洲別提示" };
  }

  if (
    questionText.includes("哪一個國家的首都是") ||
    questionText.includes("的首都是")
  ) {
    return { label: genericLandmark, detail: region || "地理區域" };
  }

  if (questionText.includes("位於哪一個國家")) {
    return { label: genericLandmark, detail: region || "地理區域" };
  }

  if (questionText.includes("位於哪一座城市") || questionText.includes("哪一座城市")) {
    const detail =
      countryPart && countryPart !== correctAnswer
        ? countryPart
        : region || "地理區域";
    return { label: genericLandmark, detail };
  }

  const leaksAnswer =
    correctAnswer &&
    (landmarkDetail?.includes(correctAnswer) ||
      cityPart === correctAnswer ||
      countryPart === correctAnswer);

  if (leaksAnswer) {
    return { label: genericLandmark, detail: region || "地理區域" };
  }

  const detail =
    countryPart && countryPart !== correctAnswer ? countryPart : region || "地理區域";
  return {
    label: safeLabel(landmark, correctAnswer, region),
    detail,
  };
}

export function visualLeaksAnswer(input: {
  questionText: string;
  correctAnswer: string;
  visualLabel?: string;
  visualDetail?: string;
}): boolean {
  const { questionText, correctAnswer, visualLabel, visualDetail } = input;
  if (!correctAnswer) return false;
  const haystack = `${visualLabel ?? ""} ${visualDetail ?? ""}`;
  if (visualLabel === correctAnswer || visualDetail === correctAnswer) return true;
  if (correctAnswer.length >= 2 && haystack.includes(correctAnswer)) {
    if (visualLabel && visualLabel.includes(correctAnswer) && visualLabel !== correctAnswer) {
      return true;
    }
    if (visualDetail?.includes(correctAnswer)) return true;
  }
  if (questionText.includes("首都是") && visualDetail?.includes(correctAnswer)) return true;
  if (
    questionText.includes("哪一個國家的首都是") &&
    (visualLabel === correctAnswer || visualDetail?.includes(correctAnswer))
  ) {
    return true;
  }
  if (isTrueFalseAnswer(correctAnswer)) {
    for (const continent of CONTINENTS) {
      if (questionText.includes(continent) && haystack.includes(continent)) return true;
    }
  }
  return false;
}
