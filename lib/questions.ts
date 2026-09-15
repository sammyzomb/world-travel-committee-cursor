import questionAuditJson from "../data/question-audit.json";
import questionBankJson from "../data/questions.json";
import type { QuestionVisualData } from "../components/question-visual";
import { getLandmarkImage, getLandmarkImageSrc } from "./landmark-images";
import {
  conceptIdForRawQuestion,
  deterministicDistractors,
  makeConceptId,
  makeFactConceptId,
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
  heritageQuestions?: RawQuestion[];
  supplementQuestions?: SupplementRawQuestion[];
  expandedFacts: ExpandedFact[];
  heritageFacts?: ExpandedFact[];
};

export type QuestionCategory = "世界地理" | "旅行知識" | "世界遺產";

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

type SupplementRawQuestion = RawQuestion & {
  conceptId?: string;
  questionType?: QuestionType;
  batchId?: string;
  grades?: string[];
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

function buildExpandedQuestions(
  facts: ExpandedFact[],
  options: {
    category: QuestionCategory;
    source: (typeof QUESTION_SOURCES)[keyof typeof QUESTION_SOURCES];
    idPrefix: string;
  },
): Question[] {
  const { category, source, idPrefix } = options;
  const cities = facts.map((item) => item[0]);
  const countries = facts.map((item) => item[1]);
  const capitals = facts.map((item) => item[3]);
  const continents = ["亞洲", "歐洲", "非洲", "北美洲", "南美洲", "大洋洲"] as const;
  const distractor = (values: readonly string[], answer: string, seed: string) =>
    deterministicDistractors(values, answer, seed, 3);

  return facts.flatMap((fact, factIndex) => {
    const [city, country, continent, capital, landmark] = fact;
    const countryConceptId = makeFactConceptId(`country:${country}`);
    const landmarkConceptId = makeFactConceptId(landmark);
    const levels = levelsForFact(factIndex, facts.length);
    const approved = source;
    const pending = QUESTION_SOURCES.expandedPending;
    const base = { region: continent, category };
    const capitalRaw = {
      q: `${country}的首都是哪一座城市？`,
      options: [capital, ...distractor(capitals, capital, `${idPrefix}-capital:${country}:${capital}`)],
      answer: 0,
      region: continent,
    };
    const landmarkRaw = {
      q: `${landmark}位於哪一座城市？`,
      options: [city, ...distractor(cities, city, `${idPrefix}-landmark:${landmark}:${city}`)],
      answer: 0,
      region: continent,
    };
    const cityCountryRaw = {
      q: `${city}位於哪一個國家？`,
      options: [country, ...distractor(countries, country, `${idPrefix}-city:${city}:${country}`)],
      answer: 0,
      region: continent,
    };
    const continentRaw = {
      q: `${country}位於哪一洲？`,
      options: [
        continent,
        ...distractor(continents, continent, `${idPrefix}-continent:${country}:${continent}`),
      ],
      answer: 0,
      region: "洲別測驗",
    };
    const reverseCapitalRaw = {
      q: `哪一個國家的首都是${capital}？`,
      options: [
        country,
        ...distractor(countries, country, `${idPrefix}-reverse-capital:${capital}:${country}`),
      ],
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
          id: makeQuestionId(`${idPrefix}-capital`, `${country}:${capital}`),
          conceptId: countryConceptId,
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
          id: makeQuestionId(`${idPrefix}-landmark`, `${landmark}:${city}`),
          conceptId: landmarkConceptId,
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
          id: makeQuestionId(`${idPrefix}-city`, `${city}:${country}`),
          conceptId: countryConceptId,
          source: pending.label,
          auditStatus: pending.auditStatus,
          grades: [],
        },
      ),
      attachMetadata(
        {
          questionType: "continent" as const,
          level: levels.continent,
          category,
          ...continentRaw,
          fact: `${country}位於${continent}。`,
          visual: factVisual(landmark, continentRaw, "旅遊地標"),
        },
        {
          id: makeQuestionId(`${idPrefix}-continent`, `${country}:${continent}`),
          conceptId: countryConceptId,
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
          id: makeQuestionId(`${idPrefix}-reverse-capital`, `${capital}:${country}`),
          conceptId: countryConceptId,
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
    // Heritage tuples contain regional capitals. Old audit overrides must not
    // reactivate national-capital questions until independently reviewed data exists.
    if (
      item.id.startsWith("heritage-capital:") ||
      item.id.startsWith("heritage-reverse-capital:")
    ) {
      return { ...item, auditStatus: "disabled" };
    }
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
    conceptId: conceptIdForRawQuestion(raw, "warmup", index),
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
        conceptId: conceptIdForRawQuestion(raw, "hand", index),
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
        conceptId: conceptIdForRawQuestion(raw, "travel", index),
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
      conceptId: conceptIdForRawQuestion(raw, "tour", index),
      source: tourSource.label,
      auditStatus: tourSource.auditStatus,
      grades: [],
    });
    return { ...question, category: raw.category ?? "世界地理" };
  }),
);
const heritageSource = QUESTION_SOURCES.worldHeritage;
const supplementSource = {
  label: "高三研二補題",
  auditStatus: "approved" as AuditStatus,
};

export const expandedQuestions: Question[] = applyAuditOverrides(
  buildExpandedQuestions(questionBank.expandedFacts, {
    category: "世界地理",
    source: QUESTION_SOURCES.restCountries,
    idPrefix: "expanded",
  }),
);
export const heritageExpandedQuestions: Question[] = applyAuditOverrides(
  buildExpandedQuestions(questionBank.heritageFacts ?? [], {
    category: "世界遺產",
    source: heritageSource,
    idPrefix: "heritage",
  }),
);
export const heritageQuestions: Question[] = applyAuditOverrides(
  (questionBank.heritageQuestions ?? []).map((raw, index) =>
    attachVisual(raw, {
      id: makeQuestionId("heritage", raw.q),
      conceptId: conceptIdForRawQuestion(raw, "heritage", index),
      source: heritageSource.label,
      auditStatus: heritageSource.auditStatus,
      grades: [],
    }),
  ),
);
export const supplementQuestions: Question[] = (questionBank.supplementQuestions ?? []).map(
  (raw, index) => {
    const meta = {
      id: makeQuestionId("supplement", raw.batchId ?? raw.conceptId ?? raw.q),
      conceptId: raw.conceptId ?? conceptIdForRawQuestion(raw, "supplement", index),
      source: supplementSource.label,
      auditStatus: supplementSource.auditStatus,
      grades: raw.grades !== undefined ? raw.grades : [],
    };
    const visual = buildVisual(raw);
    const base = visual ? { ...raw, visual } : raw;
    return attachMetadata(
      {
        ...base,
        questionType: raw.questionType,
      },
      meta,
    );
  },
);
export const allQuestions: Question[] = [
  ...handPickedQuestions,
  ...travelKnowledgeQuestions,
  ...tourQuestions,
  ...heritageQuestions,
  ...supplementQuestions,
  ...expandedQuestions,
  ...heritageExpandedQuestions,
];
export const approvedQuestions: Question[] = allQuestions.filter(
  (item) => item.auditStatus === "approved",
);

export const questionBankStats = {
  warmup: warmupQuestions.length,
  handPicked: handPickedQuestions.length,
  travelKnowledge: travelKnowledgeQuestions.length,
  tour: tourQuestions.length,
  heritageCurated: heritageQuestions.length,
  supplement: supplementQuestions.length,
  expandedFacts: questionBank.expandedFacts.length,
  heritageFacts: (questionBank.heritageFacts ?? []).length,
  expandedGenerated: expandedQuestions.length,
  heritageGenerated: heritageExpandedQuestions.length,
  approved: approvedQuestions.length,
  pending: allQuestions.filter((item) => item.auditStatus === "pending").length,
  disabled: allQuestions.filter((item) => item.auditStatus === "disabled").length,
  total: warmupQuestions.length + allQuestions.length,
} as const;
