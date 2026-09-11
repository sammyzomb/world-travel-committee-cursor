"use client";

import { Crown, Globe2 } from "lucide-react";
import { EnrollmentAnimation } from "../components/enrollment-animation";
import { MapQuizScreen } from "../components/game/map-quiz-screen";
import { ModeQuizScreen } from "../components/game/mode-quiz-screen";
import { PlayScreen } from "../components/game/play-screen";
import { ResultScreen } from "../components/game/result-screen";
import { RewardScreen } from "../components/game/reward-screen";
import { SideResultScreen } from "../components/game/side-result-screen";
import { StartScreen } from "../components/game/start-screen";
import { TrainingPickerScreen } from "../components/game/training-picker-screen";
import { useEntertainmentModes } from "../hooks/use-entertainment-modes";
import { useGameState } from "../hooks/use-game-state";
import { ACHIEVEMENTS } from "../lib/achievements";
import { GAME_NAME, ORGANIZATION_NAME } from "../lib/brand";

export default function Home() {
  const game = useGameState();
  const entertainment = useEntertainmentModes(game.goToStart);
  const showStart = game.screen === "start" && entertainment.screen === "idle";

  function goHome() {
    entertainment.resetToIdle();
    game.goToStart();
  }

  return (
    <main className="game-shell min-h-dvh text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="brand-mark">
            <Globe2 size={24} />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-amber-300">{ORGANIZATION_NAME}</p>
            <p className="text-lg font-black tracking-wide">{GAME_NAME}</p>
          </div>
        </div>
        <button className="rank-button" onClick={goHome}>
          <Crown size={17} /> 永久排行榜
        </button>
      </header>

      {showStart && (
        <StartScreen
          leaderboard={game.leaderboard}
          leaderboardLoading={game.leaderboardLoading}
          leaderboardError={game.leaderboardError}
          profile={entertainment.profile}
          achievements={ACHIEVEMENTS}
          onBegin={game.beginFromFirstGrade}
          onDaily={entertainment.startDaily}
          onTraining={entertainment.startTrainingPick}
          onReview={entertainment.startReview}
          onMapQuiz={entertainment.startMapQuiz}
        />
      )}

      {entertainment.screen === "training-pick" && (
        <TrainingPickerScreen
          onPick={entertainment.startTraining}
          onBack={goHome}
        />
      )}

      {entertainment.screen === "daily" && entertainment.questions[0] && (
        <ModeQuizScreen
          title="每日一題"
          subtitle="DAILY CHALLENGE"
          current={entertainment.questions[0]}
          questionNumber={1}
          totalQuestions={1}
          lives={entertainment.lives}
          score={entertainment.score}
          selected={entertainment.selected}
          onChoose={entertainment.chooseOption}
          onNext={entertainment.advance}
        />
      )}

      {entertainment.screen === "training-play" && entertainment.questions[entertainment.index] && (
        <ModeQuizScreen
          title={`${entertainment.trainingContinent ?? ""}特訓`}
          subtitle="SIDE MODE"
          current={entertainment.questions[entertainment.index]}
          questionNumber={entertainment.index + 1}
          totalQuestions={entertainment.questions.length}
          lives={entertainment.lives}
          score={entertainment.score}
          selected={entertainment.selected}
          onChoose={entertainment.chooseOption}
          onNext={entertainment.advance}
        />
      )}

      {entertainment.screen === "review-play" && entertainment.questions[entertainment.index] && (
        <ModeQuizScreen
          title="錯題再戰"
          subtitle="REVENGE RUN"
          current={entertainment.questions[entertainment.index]}
          questionNumber={entertainment.index + 1}
          totalQuestions={entertainment.questions.length}
          lives={entertainment.lives}
          score={entertainment.score}
          selected={entertainment.selected}
          onChoose={entertainment.chooseOption}
          onNext={entertainment.advance}
        />
      )}

      {entertainment.screen === "map-play" && entertainment.mapItems[entertainment.index] && (
        <MapQuizScreen
          current={entertainment.mapItems[entertainment.index]}
          questionNumber={entertainment.index + 1}
          totalQuestions={entertainment.mapItems.length}
          lives={entertainment.lives}
          score={entertainment.score}
          selectedContinent={entertainment.selectedContinent}
          onChoose={entertainment.chooseMapContinent}
          onNext={entertainment.advance}
        />
      )}

      {entertainment.screen === "side-result" && entertainment.sideResult && (
        <SideResultScreen
          result={entertainment.sideResult}
          newAchievements={entertainment.newAchievements}
          achievements={entertainment.achievements}
          unlocked={entertainment.profile.unlockedAchievements}
          onHome={entertainment.closeSideResult}
        />
      )}

      {game.screen === "enroll" && entertainment.screen === "idle" && (
        <EnrollmentAnimation onComplete={game.finishEnrollment} />
      )}

      {game.screen === "play" && entertainment.screen === "idle" && !game.current && (
        <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-8">
          <p className="mb-6 text-slate-300">題目載入異常，請重新開始挑戰。</p>
          <button className="primary-button mx-auto" onClick={game.restart}>再開一局</button>
        </section>
      )}

      {game.screen === "play" && entertainment.screen === "idle" && game.current && (
        <PlayScreen
          stageIndex={game.stageIndex}
          stage={game.stage}
          stageQuestion={game.stageQuestion}
          stageLength={game.stageLength}
          progress={game.progress}
          lives={game.lives}
          score={game.score}
          current={game.current}
          selected={game.selected}
          endedEarly={game.endedEarly}
          roundLength={game.round.length}
          questionIndex={game.index}
          runStreak={game.runStreak}
          onChoose={game.choose}
          onNext={game.next}
        />
      )}

      {game.screen === "reward" && entertainment.screen === "idle" && (
        <RewardScreen
          isGraduationStage={game.isGraduationStage}
          stage={game.stage}
          nextStage={game.nextStage}
          stageCorrect={game.stageCorrect}
          lives={game.lives}
          onContinue={game.continueAfterReward}
        />
      )}

      {game.screen === "result" && entertainment.screen === "idle" && (
        <ResultScreen
          endedEarly={game.endedEarly}
          stageName={game.stage.name}
          score={game.score}
          maxRunStreak={game.maxRunStreak}
          playerProfile={game.playerProfile}
          achievements={ACHIEVEMENTS}
          newAchievements={game.newAchievements}
          playerName={game.playerName}
          submitState={game.submitState}
          submitMessage={game.submitMessage}
          onPlayerNameChange={game.setPlayerName}
          onSubmitScore={game.submitScore}
          onRestart={game.restart}
        />
      )}
    </main>
  );
}
