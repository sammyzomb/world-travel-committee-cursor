import assert from "node:assert/strict";
import {
  educationStages,
  FINAL_STAGE_INDEX,
  graduationStageIndexes,
  optionCountForStage,
  passRequiredForStage,
  QUESTIONS_PER_STAGE,
  WARMUP_QUESTIONS_FIRST_STAGE,
} from "../lib/game-config.ts";
import {
  appendNextStage,
  canDrawNextStage,
  createRound,
  getStageLength,
  isGraduationStage,
} from "../lib/game-round.ts";
import {
  computeRunScore,
  isFullCompletion,
  STARTING_LIVES,
  validateRunSubmission,
  verifyRunAnswers,
} from "../lib/leaderboard-scoring.ts";
import { approvedQuestions, questionBankStats } from "../lib/questions.ts";
import { visualLeaksAnswer } from "../lib/visual-safety.ts";

function run() {
  assert.equal(QUESTIONS_PER_STAGE, 5);
  assert.equal(WARMUP_QUESTIONS_FIRST_STAGE, 3);
  assert.equal(STARTING_LIVES, 3);
  assert.equal(passRequiredForStage(), 3);
  assert.equal(FINAL_STAGE_INDEX, 17);
  assert.equal(educationStages.length, 18);
  assert.equal(optionCountForStage(0), 2);
  assert.equal(optionCountForStage(2), 2);
  assert.equal(optionCountForStage(3), 3);
  assert.equal(optionCountForStage(6), 4);

  const round = createRound([]);
  assert.equal(getStageLength(round.stageStarts, round.questions.length, 0), 5);

  const stageZero = round.questions.slice(0, 5);
  const warmupSlice = stageZero.slice(0, 3);
  assert.equal(warmupSlice.length, 3, "stage 0 must start with 3 warmup questions");
  assert.ok(
    warmupSlice.every((item) => item.kind === "tf"),
    "first 3 questions in stage 0 must be true/false",
  );
  assert.ok(
    stageZero.slice(3).every((item) => item.kind !== "tf"),
    "warmup tf must not appear after position 3",
  );

  const warmupIds = warmupSlice.map((item) => item.id);
  assert.equal(new Set(warmupIds).size, 3);
  assert.ok(round.questions.every((item) => item.auditStatus === "approved"));

  const conceptIds = new Set(round.questions.map((item) => item.conceptId));
  assert.equal(conceptIds.size, round.questions.length);

  let plan = round;
  for (let stageIndex = 1; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
    assert.ok(canDrawNextStage(plan, stageIndex), `stage ${stageIndex} should be drawable`);
    const nextPlan = appendNextStage(plan, stageIndex);
    assert.ok(nextPlan, `stage ${stageIndex} should append`);
    plan = nextPlan;
    const optionCount = optionCountForStage(stageIndex);
    const stageStart = plan.stageStarts[stageIndex];
    const stageEnd = plan.stageStarts[stageIndex + 1] ?? plan.questions.length;
    for (const item of plan.questions.slice(stageStart, stageEnd)) {
      if (item.kind !== "tf") {
        assert.ok(
          item.options.length >= optionCount,
          `stage ${stageIndex} question must have at least ${optionCount} options`,
        );
      }
    }
  }
  assert.equal(plan.stageStarts.length, 18);
  assert.ok(!canDrawNextStage(plan, FINAL_STAGE_INDEX + 1));

  const allConceptIds = new Set(plan.questions.map((item) => item.conceptId));
  assert.equal(allConceptIds.size, plan.questions.length);

  assert.ok(approvedQuestions.length >= 90, "need enough approved questions for full 18-stage run");

  for (const item of approvedQuestions) {
    if (!item.visual) continue;
    const correct = item.options[item.answer] ?? "";
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
  const score = computeRunScore(verified.verified);
  assert.equal(score.correctCount, sampleAnswers.length);
  assert.ok(isFullCompletion(verified.verified, false));
  assert.ok(!isFullCompletion(verified.verified, true), "endedEarly must not count as full completion");

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

  const validationError = validateRunSubmission({
    sessionToken: "test-session-token",
    playerName: "Tester",
    answers: sampleAnswers,
    endedEarly: false,
  });
  assert.equal(validationError, null);

  const incompleteRun = validateRunSubmission({
    sessionToken: "incomplete-run",
    playerName: "Tester",
    answers: sampleAnswers.slice(0, 10),
    endedEarly: true,
  });
  assert.equal(incompleteRun, null);

  const emptyAnswers = validateRunSubmission({
    sessionToken: "empty-run",
    playerName: "Tester",
    answers: [],
    endedEarly: true,
  });
  assert.ok(emptyAnswers, "empty answers should fail validation");

  for (const idx of [5, 8, 11, 15, 17]) {
    assert.ok(graduationStageIndexes.has(idx), `graduation index ${idx}`);
    assert.ok(isGraduationStage(idx), `isGraduationStage(${idx})`);
  }

  const tampered = validateRunSubmission({
    sessionToken: "tamper-test",
    playerName: "Hacker",
    answers: [
      {
        questionId: sampleAnswers[0].questionId,
        conceptId: sampleAnswers[0].conceptId,
        stageIndex: 0,
        selected: 0,
        selectedOption: sampleAnswers[0].selectedOption,
        correct: true,
      },
      {
        questionId: sampleAnswers[0].questionId,
        conceptId: "duplicate-concept",
        stageIndex: 0,
        selected: 0,
        selectedOption: sampleAnswers[0].selectedOption,
        correct: true,
      },
    ],
    endedEarly: true,
  });
  assert.ok(tampered?.includes("duplicate"), "should reject duplicate questionId");

  const missingSelectedOption = validateRunSubmission({
    sessionToken: "missing-option-test",
    playerName: "Tester",
    answers: [{ ...sampleAnswers[0], selectedOption: "" }],
    endedEarly: true,
  });
  assert.ok(missingSelectedOption?.includes("selectedOption"), "should require selectedOption");

  const fakeQuestion = validateRunSubmission({
    sessionToken: "fake-question-test",
    playerName: "Tester",
    answers: [{ ...sampleAnswers[0], questionId: "fake:question", selectedOption: "x" }],
    endedEarly: true,
  });
  assert.equal(fakeQuestion, null, "validateRunSubmission allows unknown id; verifyRunAnswers catches it");
  const fakeVerify = verifyRunAnswers([
    { ...sampleAnswers[0], questionId: "fake:question", selectedOption: "x" },
  ]);
  assert.equal(fakeVerify.ok, false, "unknown questionId must fail verification");

  const exhaustedProbe = createRound([]);
  let exhaustedPlan = exhaustedProbe;
  for (let stageIndex = 1; stageIndex <= FINAL_STAGE_INDEX; stageIndex += 1) {
    const next = appendNextStage(exhaustedPlan, stageIndex);
    if (!next) break;
    exhaustedPlan = next;
  }
  assert.ok(!exhaustedPlan.exhausted, "full bank must not mark exhausted before final stage");

  const restartRound = createRound(plan.questions.map((item) => item.id));
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
