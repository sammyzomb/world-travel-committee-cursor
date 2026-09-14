"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientRunState } from "../lib/game-client-types";
import type { LeaderboardEntry, SubmitState } from "../lib/leaderboard-types";
import { loadPersonalBest, updatePersonalBest, type PersonalBest } from "../lib/player-progress";

export type GameScreen = ClientRunState["screen"] | "start";

const EMPTY_STATE: ClientRunState = {
  sessionToken: "",
  questionBankVersion: "",
  progressRevision: 0,
  screen: "play",
  question: null,
  stage: { name: "小一", group: "國小" },
  nextStage: { name: "小二", group: "國小" },
  stageIndex: 0,
  stageQuestion: 1,
  stageLength: 5,
  stageCorrect: 0,
  passRequired: 3,
  progress: 0,
  score: 0,
  lives: 3,
  runStreak: 0,
  maxRunStreak: 0,
  endedEarly: false,
  fullCompletion: false,
  endReason: null,
  isGraduationStage: false,
  questionIndex: 0,
  totalQuestions: 0,
  feedback: null,
  runRecap: null,
};

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? "請求失敗");
  }
  return payload;
}

export function useGameState() {
  const [screen, setScreen] = useState<GameScreen>("start");
  const [runState, setRunState] = useState<ClientRunState>(EMPTY_STATE);
  const sessionToken = useRef("");
  const questionBankVersion = useRef("");
  const previousRoundQuestionIds = useRef<string[]>([]);
  const previousRoundConceptIds = useRef<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const resultRecorded = useRef(false);

  const applyRunState = useCallback((state: ClientRunState) => {
    if (state.feedback && state.question) {
      previousRoundQuestionIds.current = [
        ...new Set([...previousRoundQuestionIds.current, state.question.id]),
      ];
      previousRoundConceptIds.current = [
        ...new Set([...previousRoundConceptIds.current, state.question.conceptId]),
      ];
    }
    setRunState(state);
    sessionToken.current = state.sessionToken;
    questionBankVersion.current = state.questionBankVersion;
    setScreen(state.screen);
  }, []);

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

  useEffect(() => {
    if (screen !== "result" || resultRecorded.current || !runState.runRecap) return;
    resultRecorded.current = true;
    const recap = runState.runRecap;
    const { record, isNewBest } = updatePersonalBest({
      stageIndex: runState.stageIndex,
      stageName: runState.stage.name,
      score: runState.score,
      maxStreak: runState.maxRunStreak,
      conceptsLearned: recap.uniqueConcepts,
    });
    setPersonalBest(record);
    setIsNewPersonalBest(isNewBest);
  }, [screen, runState]);

  const mergeAvoidance = useCallback((questionIds: string[], conceptIds: string[]) => {
    return {
      questionIds: [...new Set([...previousRoundQuestionIds.current, ...questionIds])],
      conceptIds: [...new Set([...previousRoundConceptIds.current, ...conceptIds])],
    };
  }, []);

  const resetLocalUi = useCallback(() => {
    setPlayerName("");
    setSubmitState("idle");
    setSubmitMessage(null);
    setIsNewPersonalBest(false);
    resultRecorded.current = false;
  }, []);

  const beginFromFirstGrade = useCallback(async () => {
    try {
      const avoided = mergeAvoidance([], []);
      const payload = await postJson<{
        sessionToken: string;
        questionBankVersion: string;
        state: ClientRunState;
      }>("/api/run/start", {
        avoidQuestionIds: avoided.questionIds,
        avoidConceptIds: avoided.conceptIds,
      });
      sessionToken.current = payload.sessionToken;
      questionBankVersion.current = payload.questionBankVersion;
      resetLocalUi();
      applyRunState(payload.state);
    } catch (error) {
      console.error("無法開始遊戲", error);
    }
  }, [applyRunState, mergeAvoidance, resetLocalUi]);

  const restart = useCallback(async () => {
    try {
      const avoided = mergeAvoidance(previousRoundQuestionIds.current, previousRoundConceptIds.current);
      const payload = await postJson<{
        sessionToken: string;
        questionBankVersion: string;
        state: ClientRunState;
      }>("/api/run/start", {
        avoidQuestionIds: avoided.questionIds,
        avoidConceptIds: avoided.conceptIds,
      });
      sessionToken.current = payload.sessionToken;
      questionBankVersion.current = payload.questionBankVersion;
      resetLocalUi();
      applyRunState({ ...payload.state, screen: "play" });
    } catch (error) {
      console.error("無法重新開始遊戲", error);
    }
  }, [applyRunState, mergeAvoidance, resetLocalUi]);

  const finishEnrollment = useCallback(() => {
    setScreen("play");
    setRunState((current) => ({ ...current, screen: "play" }));
  }, []);

  const choose = useCallback(
    async (optionIndex: number) => {
      if (runState.feedback || !runState.question) return;
      const selectedOption = runState.question.options[optionIndex];
      if (!selectedOption) return;
      try {
        const payload = await postJson<{ state: ClientRunState }>("/api/run/answer", {
          sessionToken: sessionToken.current,
          questionId: runState.question.id,
          selectedOption,
          progressRevision: runState.progressRevision,
        });
        applyRunState(payload.state);
      } catch (error) {
        console.error("作答失敗", error);
      }
    },
    [applyRunState, runState.feedback, runState.progressRevision, runState.question],
  );

  const next = useCallback(async () => {
    if (!runState.feedback) return;
    try {
      const payload = await postJson<{ state: ClientRunState }>("/api/run/advance", {
        sessionToken: sessionToken.current,
        progressRevision: runState.progressRevision,
      });
      applyRunState(payload.state);
    } catch (error) {
      console.error("無法前往下一題", error);
    }
  }, [applyRunState, runState.feedback, runState.progressRevision]);

  const continueAfterReward = useCallback(async () => {
    try {
      const payload = await postJson<{ state: ClientRunState }>("/api/run/continue", {
        sessionToken: sessionToken.current,
        progressRevision: runState.progressRevision,
      });
      applyRunState(payload.state);
    } catch (error) {
      console.error("無法繼續遊戲", error);
    }
  }, [applyRunState, runState.progressRevision]);

  const goToStart = useCallback(() => {
    setScreen("start");
  }, []);

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
          questionBankVersion: questionBankVersion.current,
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
  }, [loadLeaderboard, playerName]);

  return {
    screen,
    setScreen,
    current: runState.question,
    stageIndex: runState.stageIndex,
    stage: runState.stage,
    stageLength: runState.stageLength,
    stageQuestion: runState.stageQuestion,
    isGraduationStage: runState.isGraduationStage,
    passRequired: runState.passRequired,
    nextStage: runState.nextStage,
    progress: runState.progress,
    index: runState.questionIndex,
    score: runState.score,
    selected: runState.feedback?.selectedIndex ?? null,
    feedback: runState.feedback,
    stageCorrect: runState.stageCorrect,
    lives: runState.lives,
    endedEarly: runState.endedEarly,
    fullCompletion: runState.fullCompletion,
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
    runStreak: runState.runStreak,
    maxRunStreak: runState.maxRunStreak,
    personalBest,
    isNewPersonalBest,
    runRecap: runState.runRecap,
    roundLength: runState.totalQuestions,
  };
}
