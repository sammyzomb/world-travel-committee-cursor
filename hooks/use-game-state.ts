"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FINAL_STAGE_INDEX, POINTS_PER_CORRECT, STARTING_LIVES } from "../lib/game-config";
import {
  appendNextStage,
  canDrawNextStage,
  createRound,
  getStageAt,
  getStageIndex,
  getStageLength,
  isGraduationStage as checkGraduationStage,
  passRequiredForStage,
  type RoundPlan,
} from "../lib/game-round";
import type { RunAnswerRecord } from "../lib/leaderboard-scoring";
import type { LeaderboardEntry, SubmitState } from "../lib/leaderboard-types";
import { loadPersonalBest, updatePersonalBest, type PersonalBest } from "../lib/player-progress";
import type { Question } from "../lib/questions";
import { buildRunRecap, type RunRecap } from "../lib/run-recap";

export type GameScreen = "start" | "enroll" | "play" | "reward" | "result";

function createSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useGameState() {
  const [screen, setScreen] = useState<GameScreen>("start");
  const [roundPlan, setRoundPlan] = useState<RoundPlan>(() => createRound([]));
  const previousRoundQuestionIds = useRef<string[]>([]);
  const previousRoundConceptIds = useRef<string[]>([]);
  const sessionToken = useRef(createSessionToken());
  const answerLog = useRef<RunAnswerRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [stageCorrect, setStageCorrect] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [endedEarly, setEndedEarly] = useState(false);
  const [fullCompletion, setFullCompletion] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [runStreak, setRunStreak] = useState(0);
  const [maxRunStreak, setMaxRunStreak] = useState(0);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [runRecap, setRunRecap] = useState<RunRecap | null>(null);
  const resultRecorded = useRef(false);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const response = await fetch("/api/leaderboard");
      const payload = (await response.json()) as { entries?: LeaderboardEntry[]; error?: string };
      setLeaderboard(payload.entries ?? []);
      setLeaderboardError(payload.error ?? null);
    } catch {
      setLeaderboard([]);
      setLeaderboardError("無法載入名人榜，請稍後再試。");
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (screen === "start" || screen === "result") {
      loadLeaderboard();
    }
  }, [screen, loadLeaderboard]);

  useEffect(() => {
    setPersonalBest(loadPersonalBest());
  }, []);

  const round = roundPlan.questions;
  const stageStarts = roundPlan.stageStarts;
  const current: Question | undefined = round[index];
  const stageIndex = getStageIndex(stageStarts, index);
  const stage = getStageAt(stageIndex);
  const stageLength = getStageLength(stageStarts, round.length, stageIndex);
  const stageQuestion = index - stageStarts[stageIndex] + 1;
  const isGraduationStage = checkGraduationStage(stageIndex);
  const passRequired = passRequiredForStage(stageLength);
  const nextStage = getStageAt(stageIndex + 1);
  const progress = useMemo(
    () => (stageLength > 0 ? (stageQuestion / stageLength) * 100 : 0),
    [stageQuestion, stageLength],
  );

  useEffect(() => {
    if (screen !== "result" || resultRecorded.current) return;
    resultRecorded.current = true;
    const recap = buildRunRecap(answerLog.current);
    setRunRecap(recap);
    const { record, isNewBest } = updatePersonalBest({
      stageIndex,
      stageName: stage.name,
      score,
      maxStreak: maxRunStreak,
      conceptsLearned: recap.uniqueConcepts,
    });
    setPersonalBest(record);
    setIsNewPersonalBest(isNewBest);
  }, [screen, stageIndex, stage.name, score, maxRunStreak]);

  const mergeAvoidance = useCallback((questionIds: string[], conceptIds: string[]) => {
    return {
      questionIds: [...new Set([...previousRoundQuestionIds.current, ...questionIds])],
      conceptIds: [...new Set([...previousRoundConceptIds.current, ...conceptIds])],
    };
  }, []);

  const persistAvoidanceFromSession = useCallback(() => {
    const playedIds = answerLog.current.map((entry) => entry.questionId);
    const playedConcepts = answerLog.current.map((entry) => entry.conceptId);
    const avoided = mergeAvoidance(playedIds, playedConcepts);
    previousRoundQuestionIds.current = avoided.questionIds;
    previousRoundConceptIds.current = avoided.conceptIds;
  }, [mergeAvoidance]);

  const resetGameState = useCallback(
    (nextPlan: RoundPlan, avoidQuestionIds: string[], avoidConceptIds: string[]) => {
    previousRoundQuestionIds.current = avoidQuestionIds;
    previousRoundConceptIds.current = avoidConceptIds;
    sessionToken.current = createSessionToken();
    answerLog.current = [];
    setRoundPlan(nextPlan);
    setIndex(0);
    setScore(0);
    setStageCorrect(0);
    setLives(STARTING_LIVES);
    setEndedEarly(false);
    setFullCompletion(false);
    setSelected(null);
    setPlayerName("");
    setSubmitState("idle");
    setSubmitMessage(null);
    setRunStreak(0);
    setMaxRunStreak(0);
    setRunRecap(null);
    setIsNewPersonalBest(false);
    resultRecorded.current = false;
  },
  []);

  const choose = useCallback(
    (option: number) => {
      if (selected !== null || !current) return;
      const isCorrect = option === current.answer;
      answerLog.current.push({
        questionId: current.id,
        conceptId: current.conceptId,
        stageIndex,
        selected: option,
        selectedOption: current.options[option] ?? "",
        correct: isCorrect,
      });
      setSelected(option);
      if (isCorrect) {
        setScore((value) => value + POINTS_PER_CORRECT);
        setStageCorrect((value) => value + 1);
        setRunStreak((value) => {
          const next = value + 1;
          setMaxRunStreak((peak) => Math.max(peak, next));
          return next;
        });
        return;
      }
      setRunStreak(0);
      setLives((value) => {
        const next = value - 1;
        if (next === 0) setEndedEarly(true);
        return next;
      });
    },
    [current, selected, stageIndex],
  );

  const next = useCallback(() => {
    if (endedEarly) {
      persistAvoidanceFromSession();
      setScreen("result");
      return;
    }
    if (stageQuestion === stageLength) {
      if (stageCorrect < passRequired) {
        setEndedEarly(true);
        persistAvoidanceFromSession();
        setScreen("result");
        return;
      }
      if (stageIndex >= FINAL_STAGE_INDEX) {
        setFullCompletion(true);
        persistAvoidanceFromSession();
        setScreen("result");
        return;
      }
      if (index === round.length - 1 && !canDrawNextStage(roundPlan, stageIndex + 1)) {
        setEndedEarly(true);
        persistAvoidanceFromSession();
        setScreen("result");
        return;
      }
      setScreen("reward");
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  }, [
    endedEarly,
    index,
    passRequired,
    persistAvoidanceFromSession,
    round.length,
    roundPlan,
    stageCorrect,
    stageIndex,
    stageLength,
    stageQuestion,
  ]);

  const continueAfterReward = useCallback(() => {
    const nextStageIndex = stageIndex + 1;
    if (nextStageIndex > FINAL_STAGE_INDEX) {
      setFullCompletion(true);
      setScreen("result");
      return;
    }
    if (nextStageIndex >= roundPlan.stageStarts.length) {
      const extended = appendNextStage(roundPlan, nextStageIndex);
      if (!extended || extended.exhausted) {
        setEndedEarly(true);
        setScreen("result");
        return;
      }
      setRoundPlan(extended);
    }
    setStageCorrect(0);
    setIndex((value) => value + 1);
    setSelected(null);
    setScreen("play");
  }, [roundPlan, stageIndex]);

  const beginFromFirstGrade = useCallback(() => {
    try {
      const avoided = mergeAvoidance([], []);
      resetGameState(
        createRound(avoided.questionIds, avoided.conceptIds),
        avoided.questionIds,
        avoided.conceptIds,
      );
      setScreen("enroll");
    } catch (error) {
      console.error("無法開始遊戲", error);
      setScreen("play");
    }
  }, [mergeAvoidance, resetGameState]);

  const restart = useCallback(() => {
    const playedIds = roundPlan.questions.map((item) => item.id);
    const playedConcepts = roundPlan.questions.map((item) => item.conceptId);
    const avoided = mergeAvoidance(playedIds, playedConcepts);
    resetGameState(
      createRound(avoided.questionIds, avoided.conceptIds),
      avoided.questionIds,
      avoided.conceptIds,
    );
    setScreen("play");
  }, [mergeAvoidance, resetGameState, roundPlan.questions]);

  const finishEnrollment = useCallback(() => setScreen("play"), []);

  const goToStart = useCallback(() => {
    persistAvoidanceFromSession();
    setScreen("start");
  }, [persistAvoidanceFromSession]);

  const submitScore = useCallback(async () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setSubmitMessage("請輸入暱稱後再送出成績。");
      return;
    }
    setSubmitState("saving");
    setSubmitMessage(null);
    try {
      const response = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: sessionToken.current,
          playerName: trimmed,
          answers: answerLog.current,
          endedEarly,
        }),
      });
      const payload = (await response.json()) as { qualified?: boolean; error?: string };
      if (!response.ok || payload.error) {
        setSubmitState("error");
        setSubmitMessage(payload.error ?? "成績送出失敗，請稍後再試。");
        return;
      }
      if (payload.qualified) {
        setSubmitState("saved");
        setSubmitMessage("恭喜留名永久名人榜！");
        await loadLeaderboard();
        return;
      }
      setSubmitState("not-qualified");
      setSubmitMessage("分數尚未進入前 10 名，繼續挑戰衝榜吧！");
    } catch {
      setSubmitState("error");
      setSubmitMessage("成績送出失敗，請稍後再試。");
    }
  }, [endedEarly, loadLeaderboard, playerName]);

  return {
    screen,
    setScreen,
    round,
    roundPlan,
    current,
    stageIndex,
    stage,
    stageLength,
    stageQuestion,
    isGraduationStage,
    passRequired,
    nextStage,
    progress,
    index,
    score,
    selected,
    stageCorrect,
    lives,
    endedEarly,
    fullCompletion,
    leaderboard,
    leaderboardLoading,
    leaderboardError,
    playerName,
    setPlayerName,
    submitState,
    submitMessage,
    choose,
    next,
    continueAfterReward,
    beginFromFirstGrade,
    restart,
    finishEnrollment,
    goToStart,
    submitScore,
    runStreak,
    maxRunStreak,
    personalBest,
    isNewPersonalBest,
    runRecap,
  };
}
