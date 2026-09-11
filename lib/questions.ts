import questionBankJson from "../data/questions.json";
import type { QuestionVisualData } from "../components/question-visual";
import { getLandmarkImage, getLandmarkImageSrc } from "./landmark-images";

const questionBank = questionBankJson as {
  warmupQuestions: RawQuestion[];
  questions: RawQuestion[];
  travelKnowledgeQuestions: RawQuestion[];
  tourQuestions?: RawQuestion[];
  expandedFacts: ExpandedFact[];
};

export type QuestionCategory = "世界地理" | "旅行知識";

export type Question = {
  level: string;
  region: string;
  q: string;
  options: string[];
  answer: number;
  fact: string;
  kind?: "tf" | "choice";
  category?: QuestionCategory;
  visual?: QuestionVisualData;
};

type RawQuestion = {
  level: string;
  region: string;
  q: string;
  options: string[];
  answer: number;
  fact: string;
  kind?: "tf" | "choice";
  category?: QuestionCategory;
  landmark?: string;
  landmarkDetail?: string;
};

type ExpandedFact = [string, string, string, string, string];

type ExpandedQuestionLevels = {
  continent: string;
  cityCountry: string;
  landmark: string;
  capital: string;
};

function landmarkHintDetail(detail: string) {
  const [region] = detail.split("・");
  return region;
}

function landmarkVisual(landmark: string, detail: string): QuestionVisualData | undefined {
  const image = getLandmarkImage(landmark);
  const imageSrc = getLandmarkImageSrc(landmark);
  const hintDetail = landmarkHintDetail(detail);
  if (!image || !imageSrc) {
    return { type: "map", label: landmark, detail: hintDetail };
  }
  return { type: "photo", label: landmark, detail: hintDetail, image: imageSrc, credit: image.credit };
}

function factVisual(landmark: string, label: string, detail: string): QuestionVisualData {
  const image = getLandmarkImage(landmark);
  const imageSrc = getLandmarkImageSrc(landmark);
  if (!image || !imageSrc) return { type: "map", label, detail };
  return { type: "photo", label, detail, image: imageSrc, credit: image.credit };
}

function attachVisual(raw: RawQuestion): Question {
  const { landmark, landmarkDetail, ...rest } = raw;
  const visual = landmark && landmarkDetail
    ? landmarkVisual(landmark, landmarkDetail)
    : undefined;
  return visual ? { ...rest, visual } : rest;
}

function levelsForFact(factIndex: number, totalFacts: number): ExpandedQuestionLevels {
  const progress = factIndex / Math.max(totalFacts - 1, 1);
  if (progress < 0.25) {
    return { continent: "旅行新手", cityCountry: "旅行新手", landmark: "城市旅人", capital: "國家達人" };
  }
  if (progress < 0.5) {
    return { continent: "旅行新手", cityCountry: "城市旅人", landmark: "城市旅人", capital: "國家達人" };
  }
  if (progress < 0.75) {
    return { continent: "城市旅人", cityCountry: "城市旅人", landmark: "國家達人", capital: "洲際領隊" };
  }
  return { continent: "城市旅人", cityCountry: "國家達人", landmark: "洲際領隊", capital: "環球旅行家" };
}

function buildExpandedQuestions(facts: ExpandedFact[]): Question[] {
  const cities = facts.map((item) => item[0]);
  const countries = facts.map((item) => item[1]);
  const capitals = facts.map((item) => item[3]);
  const continents = ["亞洲", "歐洲", "非洲", "北美洲", "南美洲", "大洋洲"] as const;
  const distractor = (values: readonly string[], answer: string) =>
    [...values.filter((value) => value !== answer)].slice(0, 3);

  return facts.flatMap((fact, factIndex) => {
    const [city, country, continent, capital, landmark] = fact;
    const levels = levelsForFact(factIndex, facts.length);
    return [
      {
        level: levels.capital,
        region: continent,
        category: "世界地理" as const,
        q: `${country}的首都是哪一座城市？`,
        options: [capital, ...distractor(capitals, capital)],
        answer: 0,
        fact: `${capital}是${country}的首都。`,
        visual: factVisual(landmark, landmark, `${country}・${continent}`),
      },
      {
        level: levels.landmark,
        region: continent,
        category: "世界地理" as const,
        q: `${landmark}位於哪一座城市？`,
        options: [city, ...distractor(cities, city)],
        answer: 0,
        fact: `${landmark}位於${city}。`,
        visual: factVisual(landmark, landmark, `${country}・${continent}`),
      },
      {
        level: levels.cityCountry,
        region: continent,
        category: "世界地理" as const,
        q: `${city}位於哪一個國家？`,
        options: [country, ...distractor(countries, country)],
        answer: 0,
        fact: `${city}是${country}的重要城市。`,
        visual: factVisual(landmark, city, continent),
      },
      {
        level: levels.continent,
        region: "洲別測驗",
        category: "世界地理" as const,
        q: `${country}位於哪一洲？`,
        options: [continent, ...distractor(continents, continent)],
        answer: 0,
        fact: `${country}位於${continent}。`,
        visual: factVisual(landmark, landmark, "旅遊地標"),
      },
    ];
  });
}

function withDefaultCategory(questions: Question[], category: QuestionCategory): Question[] {
  return questions.map((item) => ({ ...item, category: item.category ?? category }));
}

export const warmupQuestions: Question[] = questionBank.warmupQuestions.map(attachVisual);
export const handPickedQuestions: Question[] = withDefaultCategory(
  questionBank.questions.map(attachVisual),
  "世界地理",
);
export const travelKnowledgeQuestions: Question[] = withDefaultCategory(
  questionBank.travelKnowledgeQuestions.map(attachVisual),
  "旅行知識",
);
export const tourQuestions: Question[] = (questionBank.tourQuestions ?? []).map((raw) => {
  const question = attachVisual(raw);
  return { ...question, category: raw.category ?? "世界地理" };
});
export const expandedQuestions: Question[] = buildExpandedQuestions(questionBank.expandedFacts);
export const allQuestions: Question[] = [
  ...handPickedQuestions,
  ...travelKnowledgeQuestions,
  ...tourQuestions,
  ...expandedQuestions,
];

export const questionBankStats = {
  warmup: warmupQuestions.length,
  handPicked: handPickedQuestions.length,
  travelKnowledge: travelKnowledgeQuestions.length,
  tour: tourQuestions.length,
  expandedFacts: questionBank.expandedFacts.length,
  expandedGenerated: expandedQuestions.length,
  total: warmupQuestions.length + allQuestions.length,
} as const;
