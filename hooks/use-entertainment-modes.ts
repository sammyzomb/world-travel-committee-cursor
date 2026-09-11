"use client";

import { useCallback, useEffect, useState } from "react";
import { POINTS_PER_CORRECT, STARTING_LIVES } from "../lib/game-config";
import {
  clearAllWrongQuestions,
  clearWrongQuestion,
  loadPlayerProfile,
  recordDailyResult,
  unlockAchievement,
  updatePlayerProfile,
  type PlayerProfile,
} from "../lib/player-storage";
import { ACHIEVEMENTS, evaluateAchievements } from "../lib/achievements";
import {
  buildMapQuizRound,
  getDailyQuestion,
  questionsForReview,
  questionsForTraining,
  withOptionCount,
  type MapQuizItem,
  type TrainingContinent,
} from "../lib/side-modes";
import type { Question } from "../lib/questions";

export type EntertainmentScreen =
  | "idle"
  | "daily"
  | "training-pick"
  | "training-play"
  | "review-play"
  | "map-play"
  | "side-result";

export type SideResult = {
  modeLabel: string;
  score: number;
  correct: number;
  total: number;
  won: boolean;
  detail: string;
};

export function useEntertainmentModes(onGoHome: () => void) {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const [screen, setScreen] = useState<EntertainmentScreen>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mapItems, setMapItems] = useState<MapQuizItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [trainingContinent, setTrainingContinent] = useState<TrainingContinent | null>(null);
  const [sideResult, setSideResult] = useState<SideResult | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);

  const refreshProfile = useCallback(() => {
    setProfile(loadPlayerProfile());
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const finishSideMode = useCallback(
    (result: SideResult, extras?: { mapPerfect?: boolean; trainingContinent?: string | null; reviewCleared?: boolean }) => {
      const current = loadPlayerProfile();
      const newly = evaluateAchievements({
        dailyStreak: current.dailyStreak,
        dailyWonToday: current.dailyWonToday,
        runStreak: 0,
        score: result.score,
        stageIndex: 0,
        isGraduationStage: false,
        completed: false,
        mapPerfect: extras?.mapPerfect ?? false,
        trainingContinent: extras?.trainingContinent ?? null,
        reviewCleared: extras?.reviewCleared ?? false,
        alreadyUnlocked: current.unlockedAchievements,
      });

      for (const id of newly) unlockAchievement(id);
      if (newly.length > 0) setNewAchievements(newly);
      setSideResult(result);
      setScreen("side-result");
      refreshProfile();
    },
    [refreshProfile],
  );

  const resetRound = useCallback(() => {
    setIndex(0);
    setSelected(null);
    setSelectedContinent(null);
    setLives(STARTING_LIVES);
    setScore(0);
    setCorrectCount(0);
  }, []);

  const startDaily = useCallback(() => {
    const current = loadPlayerProfile();
    if (current.dailyPlayedToday) {
      setSideResult({
        modeLabel: "每日一題",
        score: current.dailyWonToday ? POINTS_PER_CORRECT : 0,
        correct: current.dailyWonToday ? 1 : 0,
        total: 1,
        won: current.dailyWonToday,
        detail: current.dailyWonToday ? "今天已經挑戰成功，明天再來！" : "今天已經挑戰過了，明天再來！",
      });
      setScreen("side-result");
      return;
    }
    resetRound();
    setQuestions([withOptionCount(getDailyQuestion(), 4)]);
    setScreen("daily");
  }, [resetRound]);

  const startTrainingPick = useCallback(() => {
    setScreen("training-pick");
  }, []);

  const startTraining = useCallback(
    (continent: TrainingContinent) => {
      resetRound();
      setTrainingContinent(continent);
      setQuestions(questionsForTraining(continent, 10).map((item) => withOptionCount(item, 4)));
      setScreen("training-play");
    },
    [resetRound],
  );

  const startReview = useCallback(() => {
    const current = loadPlayerProfile();
    const reviewQuestions = questionsForReview(current.wrongQuestionKeys).map((item) =>
      withOptionCount(item, 4),
    );
    if (reviewQuestions.length === 0) {
      setSideResult({
        modeLabel: "錯題再戰",
        score: 0,
        correct: 0,
        total: 0,
        won: true,
        detail: "目前沒有錯題，繼續闖關吧！",
      });
      setScreen("side-result");
      return;
    }
    resetRound();
    setQuestions(reviewQuestions);
    setScreen("review-play");
  }, [resetRound]);

  const startMapQuiz = useCallback(() => {
    resetRound();
    setMapItems(buildMapQuizRound(10));
    setScreen("map-play");
  }, [resetRound]);

  const chooseOption = useCallback(
    (option: number) => {
      if (selected !== null) return;
      const current = questions[index];
      if (!current) return;
      setSelected(option);
      if (option === current.answer) {
        setScore((value) => value + POINTS_PER_CORRECT);
        setCorrectCount((value) => value + 1);
        return;
      }
      setLives((value) => {
        const next = value - 1;
        return next;
      });
    },
    [index, questions, selected],
  );

  const chooseMapContinent = useCallback(
    (continent: string) => {
      if (selectedContinent !== null) return;
      const current = mapItems[index];
      if (!current) return;
      setSelectedContinent(continent);
      const won = continent === current.continent;
      if (won) {
        setScore((value) => value + POINTS_PER_CORRECT);
        setCorrectCount((value) => value + 1);
      } else {
        setLives((value) => value - 1);
      }
    },
    [index, mapItems, selectedContinent],
  );

  const advance = useCallback(() => {
    const isMap = screen === "map-play";
    const total = isMap ? mapItems.length : questions.length;
    const isLast = index >= total - 1;
    const noLives = lives <= 0;

    if (
      screen === "review-play" &&
      selected !== null &&
      questions[index] &&
      selected === questions[index].answer
    ) {
      clearWrongQuestion(questions[index].q);
    }

    if (!isLast && !noLives) {
      setIndex((value) => value + 1);
      setSelected(null);
      setSelectedContinent(null);
      return;
    }

    const modeLabel =
      screen === "daily"
        ? "每日一題"
        : screen === "training-play"
          ? `${trainingContinent ?? ""}特訓`
          : screen === "review-play"
            ? "錯題再戰"
            : "地圖點選";

    if (screen === "daily") {
      const won = correctCount === 1;
      recordDailyResult(won);
      const afterDaily = evaluateAchievements({
        dailyStreak: loadPlayerProfile().dailyStreak,
        dailyWonToday: won,
        runStreak: 0,
        score: won ? POINTS_PER_CORRECT : 0,
        stageIndex: 0,
        isGraduationStage: false,
        completed: false,
        mapPerfect: false,
        trainingContinent: null,
        reviewCleared: false,
        alreadyUnlocked: loadPlayerProfile().unlockedAchievements,
      });
      for (const id of afterDaily) unlockAchievement(id);
      if (afterDaily.length > 0) setNewAchievements(afterDaily);
    }

    const passedTraining = screen === "training-play" && correctCount >= 6 && lives > 0;
    if (passedTraining && trainingContinent) {
      updatePlayerProfile((p) => ({
        ...p,
        trainingClears: p.trainingClears.includes(trainingContinent)
          ? p.trainingClears
          : [...p.trainingClears, trainingContinent],
      }));
    }

    const reviewCleared = screen === "review-play" && correctCount === total && total > 0 && lives > 0;
    if (reviewCleared) clearAllWrongQuestions();

    const mapPerfect = screen === "map-play" && correctCount === total && total > 0 && lives > 0;
    if (mapPerfect) {
      updatePlayerProfile((p) => ({ ...p, mapPerfectCount: p.mapPerfectCount + 1 }));
    }

    finishSideMode(
      {
        modeLabel,
        score,
        correct: correctCount,
        total,
        won:
          screen === "daily"
            ? correctCount === 1
            : correctCount >= Math.ceil(total * 0.6) && lives > 0,
        detail:
          screen === "daily"
            ? correctCount === 1
              ? "今日挑戰成功！明天記得再來。"
              : "今日挑戰結束，明天再戰！"
            : lives === 0
              ? "機會用完了，下次再衝！"
              : `答對 ${correctCount} / ${total} 題`,
      },
      {
        mapPerfect,
        trainingContinent: passedTraining ? trainingContinent : null,
        reviewCleared,
      },
    );
  }, [
    correctCount,
    finishSideMode,
    index,
    lives,
    mapItems.length,
    questions,
    score,
    screen,
    selected,
    trainingContinent,
  ]);

  const closeSideResult = useCallback(() => {
    setScreen("idle");
    setSideResult(null);
    setNewAchievements([]);
    onGoHome();
    refreshProfile();
  }, [onGoHome, refreshProfile]);

  const resetToIdle = useCallback(() => {
    setScreen("idle");
    setSideResult(null);
    setNewAchievements([]);
    refreshProfile();
  }, [refreshProfile]);

  return {
    profile,
    screen,
    questions,
    mapItems,
    index,
    selected,
    selectedContinent,
    lives,
    score,
    correctCount,
    trainingContinent,
    sideResult,
    newAchievements,
    achievements: ACHIEVEMENTS,
    startDaily,
    startTrainingPick,
    startTraining,
    startReview,
    startMapQuiz,
    chooseOption,
    chooseMapContinent,
    advance,
    closeSideResult,
    resetToIdle,
    refreshProfile,
  };
}
