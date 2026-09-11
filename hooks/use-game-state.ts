"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { graduationStageIndexes, POINTS_PER_CORRECT, STARTING_LIVES } from "../lib/game-config";
import {
  appendNextStage,
  canDrawNextStage,
  createRound,
  getStageAt,
  getStageIndex,
  getStageLength,
  passRequiredForStage,
  type RoundPlan,
} from "../lib/game-round";
import type { LeaderboardEntry, SubmitState } from "../lib/leaderboard-types";
import type { Question } from "../lib/questions";

export type GameScreen = "start" | "enroll" | "play" | "reward" | "result";

export function useGameState() {
  const [screen, setScreen] = useState<GameScreen>("start");
  const [roundPlan, setRoundPlan] = useState<RoundPlan>(() => createRound([]));
  const previousRound = useRef<string[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [stageCorrect, setStageCorrect] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [endedEarly, setEndedEarly] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

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

  const round = roundPlan.questions;
  const stageStarts = roundPlan.stageStarts;
  const current: Question | undefined = round[index];
  const stageIndex = getStageIndex(stageStarts, index);
  const stage = getStageAt(stageIndex);
  const stageLength = getStageLength(stageStarts, round.length, stageIndex);
  const stageQuestion = index - stageStarts[stageIndex] + 1;
  const isGraduationStage = graduationStageIndexes.has(stageIndex);
  const passRequired = passRequiredForStage(stageLength);
  const nextStage = getStageAt(stageIndex + 1);
  const progress = useMemo(
    () => (stageLength > 0 ? (stageQuestion / stageLength) * 100 : 0),
    [stageQuestion, stageLength],
  );

  const resetGameState = useCallback((nextPlan: RoundPlan, avoid: string[]) => {
    previousRound.current = avoid;
    setRoundPlan(nextPlan);
    setIndex(0);
    setScore(0);
    setStageCorrect(0);
    setLives(STARTING_LIVES);
    setEndedEarly(false);
    setSelected(null);
    setPlayerName("");
    setSubmitState("idle");
    setSubmitMessage(null);
  }, []);

  const choose = useCallback(
    (option: number) => {
      if (selected !== null || !current) return;
      setSelected(option);
      if (option === current.answer) {
        setScore((value) => value + POINTS_PER_CORRECT);
        setStageCorrect((value) => value + 1);
        return;
      }
      setLives((value) => {
        const next = value - 1;
        if (next === 0) setEndedEarly(true);
        return next;
      });
    },
    [current, selected],
  );

  const next = useCallback(() => {
    if (endedEarly) {
      setScreen("result");
      return;
    }
    if (stageQuestion === stageLength) {
      if (stageCorrect < passRequired) {
        setEndedEarly(true);
        setScreen("result");
        return;
      }
      if (index === round.length - 1 && !canDrawNextStage(roundPlan, stageIndex + 1)) {
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
    round.length,
    roundPlan,
    stageCorrect,
    stageIndex,
    stageLength,
    stageQuestion,
  ]);

  const continueAfterReward = useCallback(() => {
    const nextStageIndex = stageIndex + 1;
    if (nextStageIndex >= roundPlan.stageStarts.length) {
      const extended = appendNextStage(roundPlan, nextStageIndex);
      if (!extended) {
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
      resetGameState(createRound(previousRound.current), []);
      setScreen("enroll");
    } catch (error) {
      console.error("無法開始遊戲", error);
      setScreen("play");
    }
  }, [resetGameState]);

  const restart = useCallback(() => {
    const avoid = roundPlan.questions.map((item) => item.q);
    resetGameState(createRound(avoid), avoid);
    setScreen("play");
  }, [resetGameState, roundPlan.questions]);

  const finishEnrollment = useCallback(() => setScreen("play"), []);

  const goToStart = useCallback(() => setScreen("start"), []);

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
          playerName: trimmed,
          score,
          stageReached: stage.name,
          completed: !endedEarly,
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
  }, [endedEarly, loadLeaderboard, playerName, score, stage.name]);

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
  };
}
