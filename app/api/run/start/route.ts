import { buildFullRunPlan } from "../../../../lib/run-plan";
import { issuedQuestionsFromPlan } from "../../../../lib/run-session";
import { saveRunSession } from "../../../../lib/run-session-store";
import { QUESTION_BANK_VERSION } from "../../../../lib/question-bank-version";
import type { Question } from "../../../../lib/questions";

type StartRunBody = {
  avoidQuestionIds?: string[];
  avoidConceptIds?: string[];
};

function createSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function serializeQuestion(question: Question) {
  return {
    id: question.id,
    conceptId: question.conceptId,
    source: question.source,
    auditStatus: question.auditStatus,
    grades: question.grades,
    level: question.level,
    region: question.region,
    q: question.q,
    options: question.options,
    answer: question.answer,
    fact: question.fact,
    kind: question.kind,
    category: question.category,
    questionType: question.questionType,
    visual: question.visual,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartRunBody;
    const avoidQuestionIds = Array.isArray(body.avoidQuestionIds) ? body.avoidQuestionIds : [];
    const avoidConceptIds = Array.isArray(body.avoidConceptIds) ? body.avoidConceptIds : [];

    const plan = buildFullRunPlan(avoidQuestionIds, avoidConceptIds);
    const sessionToken = createSessionToken();
    const issuedQuestions = issuedQuestionsFromPlan(plan.questions, plan.stageStarts);
    const createdAt = new Date().toISOString();

    await saveRunSession({
      sessionToken,
      questionBankVersion: QUESTION_BANK_VERSION,
      issuedQuestions,
      stageStarts: plan.stageStarts,
      exhausted: plan.exhausted,
      createdAt,
    });

    return Response.json({
      sessionToken,
      questionBankVersion: QUESTION_BANK_VERSION,
      round: {
        questions: plan.questions.map(serializeQuestion),
        stageStarts: plan.stageStarts,
        exhausted: plan.exhausted,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法建立遊戲場次";
    return Response.json({ error: message }, { status: 500 });
  }
}
