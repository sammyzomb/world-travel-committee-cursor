function safeLabel(landmark: string | undefined, correctAnswer: string, fallback: string) {
  if (!landmark) return fallback;
  if (correctAnswer && landmark.includes(correctAnswer)) return fallback;
  return landmark;
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

  if (questionText.includes("哪一洲") || questionText.includes("位於哪一洲")) {
    return { label: genericLandmark, detail: region || "洲別提示" };
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
}) {
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
  return false;
}
