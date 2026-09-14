import questionAuditJson from "../data/question-audit.json";
import questionBankJson from "../data/questions.json";
import type { QuestionVisualData } from "../components/question-visual";
import { getLandmarkImage, getLandmarkImageSrc } from "./landmark-images";
import {
  makeConceptId,
  makeQuestionId,
  QUESTION_SOURCES,
  type AuditStatus,
} from "./question-metadata";
import { inferQuestionType, type QuestionType } from "./question-types";
import { safeVisualCaption } from "./visual-safety";

const questionBank = questionBankJson as {
  warmupQuestions: RawQuestion[];
  questions: RawQuestion[];
  travelKnowledgeQuestions: RawQuestion[];
  tourQuestions?: RawQuestion[];
  expandedFacts: ExpandedFact[];
};

export type QuestionCategory = "世界地理" | "旅行知識";

export type Question = {
  id: string;
  conceptId: string;
  source: string;
  auditStatus: AuditStatus;
  grades: string[];
  level: string;
  region: string;
  q: string;
  options: string[];
  answer: number;
  fact: string;
  kind?: "tf" | "choice";
  category?: QuestionCategory;
  questionType: QuestionType;
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

function buildVisual(
  raw: Pick<RawQuestion, "q" | "options" | "answer" | "region" | "landmark" | "landmarkDetail">,
): QuestionVisualData | undefined {
  if (!raw.landmark) return undefined;
  const correctAnswer = raw.options[raw.answer] ?? "";
  const caption = safeVisualCaption({
    questionText: raw.q,
    correctAnswer,
    region: raw.region,
    landmark: raw.landmark,
    landmarkDetail: raw.landmarkDetail,
  });
  const image = getLandmarkImage(raw.landmark);
  const imageSrc = getLandmarkImageSrc(raw.landmark);
  if (!image || !imageSrc) {
    return { type: "map", label: caption.label, detail: caption.detail };
  }
  return {
    type: "photo",
    label: caption.label,
    detail: caption.detail,
    image: imageSrc,
    credit: image.credit,
  };
}

function factVisual(
  landmark: string,
  raw: Pick<RawQuestion, "q" | "options" | "answer" | "region">,
  detail: string,
): QuestionVisualData {
  const caption = safeVisualCaption({
    questionText: raw.q,
    correctAnswer: raw.options[raw.answer] ?? "",
    region: raw.region,
    landmark,
    landmarkDetail: detail,
  });
  const image = getLandmarkImage(landmark);
  const imageSrc = getLandmarkImageSrc(landmark);
  if (!image || !imageSrc) {
    return { type: "map", label: caption.label, detail: caption.detail };
  }
  return {
    type: "photo",
    label: caption.label,
    detail: caption.detail,
    image: imageSrc,
    credit: image.credit,
  };
}

function attachMetadata(
  question: Omit<Question, "id" | "conceptId" | "source" | "auditStatus" | "grades" | "questionType"> & {
    questionType?: QuestionType;
  },
  meta: {
    id: string;
    conceptId: string;
    source: string;
    auditStatus: AuditStatus;
    grades: string[];
  },
): Question {
  const { questionType: explicitType, ...rest } = question;
  const questionType =
    explicitType ??
    inferQuestionType({
      q: rest.q,
      kind: rest.kind,
      category: rest.category,
      level: rest.level,
    });
  return { ...rest, questionType, ...meta };
}

function attachVisual(
  raw: RawQuestion,
  meta: {
    id: string;
    conceptId: string;
    source: string;
    auditStatus: AuditStatus;
    grades: string[];
  },
): Question {
  const visual = buildVisual(raw);
  const base = visual ? { ...raw, visual } : raw;
  return attachMetadata(base, meta);
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
  const shuffleStrings = <T,>(items: T[]) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  };
  const distractor = (values: readonly string[], answer: string) =>
    shuffleStrings(values.filter((value) => value !== answer)).slice(0, 3);

  return facts.flatMap((fact, factIndex) => {
    const [city, country, continent, capital, landmark] = fact;
    const levels = levelsForFact(factIndex, facts.length);
    const approved = QUESTION_SOURCES.restCountries;
    const pending = QUESTION_SOURCES.expandedPending;
    const base = { region: continent, category: "世界地理" as const };
    const capitalRaw = {
      q: `${country}的首都是哪一座城市？`,
      options: [capital, ...distractor(capitals, capital)],
      answer: 0,
      region: continent,
    };
    const landmarkRaw = {
      q: `${landmark}位於哪一座城市？`,
      options: [city, ...distractor(cities, city)],
      answer: 0,
      region: continent,
    };
    const cityCountryRaw = {
      q: `${city}位於哪一個國家？`,
      options: [country, ...distractor(countries, country)],
      answer: 0,
      region: continent,
    };
    const continentRaw = {
      q: `${country}位於哪一洲？`,
      options: [continent, ...distractor(continents, continent)],
      answer: 0,
      region: "洲別測驗",
    };
    const reverseCapitalRaw = {
      q: `哪一個國家的首都是${capital}？`,
      options: [country, ...distractor(countries, country)],
      answer: 0,
      region: continent,
    };
    return [
      attachMetadata(
        {
          ...base,
          questionType: "capital" as const,
          level: levels.capital,
          ...capitalRaw,
          fact: `${capital}是${country}的首都。`,
          visual: factVisual(landmark, capitalRaw, `${country}・${continent}`),
        },
        {
          id: makeQuestionId("expanded-capital", `${country}:${capital}`),
          conceptId: makeConceptId("capital", country),
          source: approved.label,
          auditStatus: approved.auditStatus,
          grades: [],
        },
      ),
      attachMetadata(
        {
          ...base,
          questionType: "landmark-city" as const,
          level: levels.landmark,
          ...landmarkRaw,
          fact: `${landmark}位於${city}。`,
          visual: factVisual(landmark, landmarkRaw, `${country}・${continent}`),
        },
        {
          id: makeQuestionId("expanded-landmark", `${landmark}:${city}`),
          conceptId: makeConceptId("landmark-city", landmark),
          source: pending.label,
          auditStatus: pending.auditStatus,
          grades: [],
        },
      ),
      attachMetadata(
        {
          ...base,
          questionType: "country-pick" as const,
          level: levels.cityCountry,
          ...cityCountryRaw,
          fact: `${city}是${country}的重要城市。`,
          visual: factVisual(landmark, cityCountryRaw, continent),
        },
        {
          id: makeQuestionId("expanded-city", `${city}:${country}`),
          conceptId: makeConceptId("city-country", city),
          source: pending.label,
          auditStatus: pending.auditStatus,
          grades: [],
        },
      ),
      attachMetadata(
        {
          questionType: "continent" as const,
          level: levels.continent,
          category: "世界地理" as const,
          ...continentRaw,
          fact: `${country}位於${continent}。`,
          visual: factVisual(landmark, continentRaw, "旅遊地標"),
        },
        {
          id: makeQuestionId("expanded-continent", `${country}:${continent}`),
          conceptId: makeConceptId("continent", country),
          source: approved.label,
          auditStatus: approved.auditStatus,
          grades: [],
        },
      ),
      attachMetadata(
        {
          ...base,
          questionType: "reverse-capital" as const,
          level: levels.capital,
          ...reverseCapitalRaw,
          fact: `${capital}是${country}的首都。`,
          visual: factVisual(landmark, reverseCapitalRaw, `${country}・${continent}`),
        },
        {
          id: makeQuestionId("expanded-reverse-capital", `${capital}:${country}`),
          conceptId: makeConceptId("reverse-capital", capital),
          source: approved.label,
          auditStatus: approved.auditStatus,
          grades: [],
        },
      ),
    ];
  });
}

function withDefaultCategory(questions: Question[], category: QuestionCategory): Question[] {
  return questions.map((item) => ({ ...item, category: item.category ?? category }));
}

type AuditOverride = {
  auditStatus: AuditStatus;
  reviewedAt?: string;
  reviewer?: string;
  note?: string;
};

const auditOverrides = (questionAuditJson as { overrides?: Record<string, AuditOverride> }).overrides ?? {};

function applyAuditOverrides(questions: Question[]): Question[] {
  return questions.map((item) => {
    const override = auditOverrides[item.id];
    if (!override) return item;
    return {
      ...item,
      auditStatus: override.auditStatus,
      source: override.reviewer ? `${item.source}（${override.reviewer}）` : item.source,
    };
  });
}

const handSource = QUESTION_SOURCES.handCurated;
const travelSource = QUESTION_SOURCES.travelKnowledge;
const tourSource = QUESTION_SOURCES.tour;
const warmupSource = QUESTION_SOURCES.warmup;

export const warmupQuestions: Question[] = questionBank.warmupQuestions.map((raw, index) =>
  attachVisual(raw, {
    id: makeQuestionId("warmup", raw.q),
    conceptId: makeConceptId("warmup", String(index)),
    source: warmupSource.label,
    auditStatus: warmupSource.auditStatus,
    grades: ["小一"],
  }),
);
export const handPickedQuestions: Question[] = applyAuditOverrides(
  withDefaultCategory(
    questionBank.questions.map((raw, index) =>
      attachVisual(raw, {
        id: makeQuestionId("hand", raw.q),
        conceptId: makeConceptId("hand", String(index)),
        source: handSource.label,
        auditStatus: handSource.auditStatus,
        grades: [],
      }),
    ),
    "世界地理",
  ),
);
export const travelKnowledgeQuestions: Question[] = applyAuditOverrides(
  withDefaultCategory(
    questionBank.travelKnowledgeQuestions.map((raw, index) =>
      attachVisual(raw, {
        id: makeQuestionId("travel", raw.q),
        conceptId: makeConceptId("travel", String(index)),
        source: travelSource.label,
        auditStatus: travelSource.auditStatus,
        grades: [],
      }),
    ),
    "旅行知識",
  ),
);
export const tourQuestions: Question[] = applyAuditOverrides(
  (questionBank.tourQuestions ?? []).map((raw, index) => {
    const question = attachVisual(raw, {
      id: makeQuestionId("tour", raw.q),
      conceptId: makeConceptId("tour", String(index)),
      source: tourSource.label,
      auditStatus: tourSource.auditStatus,
      grades: [],
    });
    return { ...question, category: raw.category ?? "世界地理" };
  }),
);
export const expandedQuestions: Question[] = applyAuditOverrides(
  buildExpandedQuestions(questionBank.expandedFacts),
);
export const allQuestions: Question[] = [
  ...handPickedQuestions,
  ...travelKnowledgeQuestions,
  ...tourQuestions,
  ...expandedQuestions,
];
export const approvedQuestions: Question[] = allQuestions.filter(
  (item) => item.auditStatus === "approved",
);

export const questionBankStats = {
  warmup: warmupQuestions.length,
  handPicked: handPickedQuestions.length,
  travelKnowledge: travelKnowledgeQuestions.length,
  tour: tourQuestions.length,
  expandedFacts: questionBank.expandedFacts.length,
  expandedGenerated: expandedQuestions.length,
  approved: approvedQuestions.length,
  pending: allQuestions.filter((item) => item.auditStatus === "pending").length,
  total: warmupQuestions.length + allQuestions.length,
} as const;
