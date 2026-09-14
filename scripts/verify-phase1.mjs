import assert from "node:assert/strict";
import {
  educationStages,
  FINAL_STAGE_INDEX,
  graduationStageIndexes,
  MAX_RUN_QUESTIONS,
  optionCountForStage,
  passRequiredForStage,
  QUESTIONS_PER_STAGE,
  questionsPerStage,
  STAGE_QUESTION_COUNTS,
  WARMUP_QUESTIONS_FIRST_STAGE,
} from "../lib/game-config.ts";
import {
  appendNextStage,
  canDrawNextStage,
  createRound,
  getStageIndex,
  getStageLength,
  isGraduationStage,
} from "../lib/game-round.ts";
import { buildPlayableRunPlan } from "../lib/run-plan.ts";
import { submitAnswer } from "../lib/run-session-engine.ts";
import {
  issuedQuestionsFromPlan,
  validateIssuedRunPlayback,
  verifyAnswersAgainstIssued,
} from "../lib/run-session.ts";
import {
  computeRunScore,
  isFullCompletion,
  QUESTION_BANK_VERSION,
  STARTING_LIVES,
  validateRunProgress,
  validateRunSubmission,
  verifyRunAnswers,
} from "../lib/leaderboard-scoring.ts";
import { approvedQuestions, questionBankStats } from "../lib/questions.ts";
import { allowedTypesForStage } from "../lib/question-types.ts";
import { regionLeaksAnswer, visualLeaksAnswer } from "../lib/visual-safety.ts";

function maxQuestionsPerType(count, activeTypeCount, stageIndex) {
  const allowedTypeCount = allowedTypesForStage(stageIndex).length;
  if (activeTypeCount <= 0) return count;
  const hardCap = count >= 8 ? 3 : 2;
  if (allowedTypeCount >= 3 && count >= 5) return hardCap;
  if (activeTypeCount * hardCap >= count) return hardCap;
  return Math.ceil(count / activeTypeCount);
}

function assertStageTypeDiversity(questions, stageIndex) {
  const counts = new Map();
  for (const item of questions) {
    counts.set(item.questionType, (counts.get(item.questionType) ?? 0) + 1);
  }
  const maxAllowed = maxQuestionsPerType(questions.length, counts.size, stageIndex);
  for (const [type, total] of counts) {
    assert.ok(
      total <= maxAllowed,
      `stage ${stageIndex} has too many ${type} questions (${total}/${questions.length})`,
    );
  }
}

function run() {
  assert.equal(QUESTIONS_PER_STAGE, 5);
  assert.equal(STAGE_QUESTION_COUNTS.length, educationStages.length);
  assert.equal(questionsPerStage(0), 5);
  assert.equal(questionsPerStage(FINAL_STAGE_INDEX), 10);
  assert.equal(MAX_RUN_QUESTIONS, STAGE_QUESTION_COUNTS.reduce((sum, count) => sum + count, 0));
  assert.equal(WARMUP_QUESTIONS_FIRST_STAGE, 2);
  assert.equal(STARTING_LIVES, 3);
  assert.equal(passRequiredForStage(5), 3);
  assert.equal(passRequiredForStage(10), 6);
  assert.equal(FINAL_STAGE_INDEX, 17);
  assert.equal(educationStages.length, 18);
  assert.equal(optionCountForStage(0), 2);
  assert.equal(optionCountForStage(2), 2);
  assert.equal(optionCountForStage(3), 3);
  assert.equal(optionCountForStage(6), 4);

  const round = createRound([]);
  assert.equal(getStageLength(round.stageStarts, round.questions.length, 0), questionsPerStage(0));

  const stageZero = round.questions.slice(0, questionsPerStage(0));
  const warmupSlice = stageZero.slice(0, WARMUP_QUESTIONS_FIRST_STAGE);
  assert.equal(
    warmupSlice.length,
    WARMUP_QUESTIONS_FIRST_STAGE,
    "stage 0 must start with warmup questions",
  );
  assert.ok(
    warmupSlice.every((item) => item.kind === "tf"),
    "warmup questions in stage 0 must be true/false",
  );
  assert.ok(
    stageZero.slice(WARMUP_QUESTIONS_FIRST_STAGE).every((item) => item.kind !== "tf"),
    "warmup tf must not appear after warmup block",
  );

  const warmupIds = warmupSlice.map((item) => item.id);
  assert.equal(new Set(warmupIds).size, WARMUP_QUESTIONS_FIRST_STAGE);
  assertStageTypeDiversity(stageZero, 0);
  assert.ok(round.questions.every((item) => item.auditStatus === "approved"));

  const conceptIds = new Set(round.questions.map((item) => item.conceptId));
  assert.equal(conceptIds.size, round.questions.length);

  const playable = buildPlayableRunPlan([], []);
  const plan = playable.plan;
  assert.ok(plan, "playable plan required");
  const drawnStageCount = plan.stageStarts.length;
  for (let stageIndex = 0; stageIndex < drawnStageCount; stageIndex += 1) {
    const optionCount = optionCountForStage(stageIndex);
    const stageStart = plan.stageStarts[stageIndex];
    const stageEnd = plan.stageStarts[stageIndex + 1] ?? plan.questions.length;
    const stageQuestions = plan.questions.slice(stageStart, stageEnd);
    const expectedStageCount = questionsPerStage(stageIndex);
    const isLastDrawnStage = stageIndex === drawnStageCount - 1;
    if (isLastDrawnStage && plan.exhausted) {
      assert.ok(
        stageQuestions.length <= expectedStageCount,
        `exhausted stage ${stageIndex} drew ${stageQuestions.length}/${expectedStageCount}`,
      );
    } else {
      assert.equal(stageQuestions.length, expectedStageCount);
    }
    if (stageIndex === 0) assertStageTypeDiversity(stageQuestions, stageIndex);
    for (const item of stageQuestions) {
      if (item.kind !== "tf") {
        assert.ok(
          item.options.length >= optionCount,
          `stage ${stageIndex} question must have at least ${optionCount} options`,
        );
      }
    }
  }
  if (drawnStageCount <= FINAL_STAGE_INDEX) {
    console.warn(
      `Question bank gap: only ${drawnStageCount}/${FINAL_STAGE_INDEX + 1} stages drawable in strict mode`,
    );
  }
  assert.ok(plan.stageStarts.length >= 1);
  assert.ok(!canDrawNextStage(plan, FINAL_STAGE_INDEX + 1));

  const allConceptIds = new Set(plan.questions.map((item) => item.conceptId));
  assert.equal(allConceptIds.size, plan.questions.length);

  assert.ok(
    approvedQuestions.length >= MAX_RUN_QUESTIONS,
    "need enough approved questions for full 18-stage run",
  );

  for (const item of approvedQuestions) {
    const correct = item.options[item.answer] ?? "";
    assert.ok(
      !regionLeaksAnswer({
        kind: item.kind,
        questionText: item.q,
        region: item.region,
        correctAnswer: correct,
      }),
      `region chip leaks answer for ${item.id}`,
    );
    if (!item.visual) continue;
    assert.ok(
      !visualLeaksAnswer({
        questionText: item.q,
        correctAnswer: correct,
        visualLabel: item.visual.label,
        visualDetail: item.visual.detail,
      }),
      `visual leaks answer for ${item.id}`,
    );
  }

  const sampleAnswers = plan.questions.map((item, index) => ({
    questionId: item.id,
    conceptId: item.conceptId,
    stageIndex: plan.stageStarts.findIndex((start, idx) => {
      const end = plan.stageStarts[idx + 1] ?? plan.questions.length;
      return index >= start && index < end;
    }),
    selected: item.answer,
    selectedOption: item.options[item.answer] ?? "",
    correct: true,
  }));
  const verified = verifyRunAnswers(sampleAnswers);
  assert.equal(verified.ok, true);
  const issued = issuedQuestionsFromPlan(plan.questions, plan.stageStarts);
  const issuedVerify = verifyAnswersAgainstIssued(issued, sampleAnswers);
  assert.equal(issuedVerify.ok, true);
  const runEndedEarly = plan.exhausted || drawnStageCount < educationStages.length;
  assert.equal(validateIssuedRunPlayback(issued, sampleAnswers, runEndedEarly), null);
  const score = computeRunScore(verified.verified);
  assert.equal(score.correctCount, sampleAnswers.length);
  if (!runEndedEarly) {
    assert.ok(isFullCompletion(verified.verified, false));
  }
  assert.ok(!isFullCompletion(verified.verified, true), "endedEarly must not count as full completion");

  if (plan.stageStarts.length > FINAL_STAGE_INDEX) {
    const fullIssued = issuedQuestionsFromPlan(plan.questions, plan.stageStarts);
    const fullAnswers = plan.questions.map((item, index) => ({
      questionId: item.id,
      conceptId: item.conceptId,
      stageIndex: getStageIndex(plan.stageStarts, index),
      selected: item.answer,
      selectedOption: item.options[item.answer] ?? "",
      correct: true,
    }));
    assert.equal(validateIssuedRunPlayback(fullIssued, fullAnswers, false), null);
  }

  const firstQuestion = plan.questions[0];
  const wrongOption =
    firstQuestion.options.find((option) => option !== firstQuestion.options[firstQuestion.answer]) ??
    "wrong";
  const tamperedCorrectFlag = sampleAnswers.map((item, index) =>
    index === 0 ? { ...item, correct: true, selectedOption: wrongOption } : item,
  );
  const tamperedVerify = verifyRunAnswers(tamperedCorrectFlag);
  assert.equal(tamperedVerify.ok, true);
  assert.equal(tamperedVerify.verified[0].correct, false, "server must not trust client correct flag");
  assert.ok(
    computeRunScore(tamperedVerify.verified).correctCount < sampleAnswers.length,
    "tampered answer must reduce score",
  );

  const submissionBase = {
    sessionToken: "test-session-token",
    playerName: "Tester",
    questionBankVersion: QUESTION_BANK_VERSION,
  };

  assert.equal(validateRunSubmission(submissionBase), null);
  assert.equal(validateRunProgress(verified.verified, runEndedEarly), null);

  const staleVersion = validateRunSubmission({
    ...submissionBase,
    questionBankVersion: "stale-version",
  });
  assert.match(staleVersion, /題庫已更新/);

  assert.equal(validateRunSubmission({ ...submissionBase, playerName: " " }), "playerName is required");

  for (const idx of [5, 8, 11, 15, 17]) {
    assert.ok(graduationStageIndexes.has(idx), `graduation index ${idx}`);
    assert.ok(isGraduationStage(idx), `isGraduationStage(${idx})`);
  }

  const duplicateAnswers = [
    sampleAnswers[0],
    { ...sampleAnswers[0], conceptId: "duplicate-concept" },
  ];
  assert.match(
    validateIssuedRunPlayback(issued, duplicateAnswers, true),
    /order mismatch|conceptId mismatch/,
  );

  const fakeVerify = verifyAnswersAgainstIssued(issued, [
    { ...sampleAnswers[0], questionId: "fake:question", selectedOption: "x" },
  ]);
  assert.equal(fakeVerify.ok, false, "unknown questionId must fail verification");

  const exhaustedProbe = buildPlayableRunPlan([]);
  assert.ok(exhaustedProbe.plan, "strict draw must produce playable session");
  assert.ok(exhaustedProbe.plan.questions.length > questionsPerStage(0), "strict draw must progress past stage 0");

  const restartRound = createRound(
    plan.questions.map((item) => item.id),
    plan.questions.map((item) => item.conceptId),
  );
  assert.ok(restartRound.questions.length > 0, "restart with avoid list");
  assert.equal(new Set(restartRound.questions.map((item) => item.id)).size, restartRound.questions.length);

  console.log("Phase 1 verification passed.");
  console.log(
    JSON.stringify(
      {
        approvedQuestions: approvedQuestions.length,
        questionBankStats,
        fullRunQuestions: plan.questions.length,
      },
      null,
      2,
    ),
  );
}

run();
