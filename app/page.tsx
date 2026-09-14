"use client";

import { Crown } from "lucide-react";
import { CompanyLogo } from "../components/company-logo";
import { EnrollmentAnimation } from "../components/enrollment-animation";
import { PlayScreen } from "../components/game/play-screen";
import { ResultScreen } from "../components/game/result-screen";
import { RewardScreen } from "../components/game/reward-screen";
import { StartScreen } from "../components/game/start-screen";
import { useGameState } from "../hooks/use-game-state";
import { GAME_NAME, ORGANIZATION_NAME } from "../lib/brand";

export default function Home() {
  const game = useGameState();

  return (
    <main className="game-shell min-h-dvh text-white">
      <header className="site-header mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-10 sm:py-5">
        <div className="site-brand">
          <CompanyLogo className="site-header-logo" />
          <div className="site-brand-copy">
            <p className="site-brand-org">{ORGANIZATION_NAME}</p>
            <p className="site-brand-game">{GAME_NAME}</p>
          </div>
        </div>
        <button className="rank-button" onClick={game.goToStart}>
          <Crown size={17} /> 永久排行榜
        </button>
      </header>

      {game.screen === "start" && (
        <StartScreen
          leaderboard={game.leaderboard}
          leaderboardLoading={game.leaderboardLoading}
          leaderboardError={game.leaderboardError}
          personalBest={game.personalBest}
          onBegin={game.beginFromFirstGrade}
        />
      )}

      {game.screen === "enroll" && (
        <EnrollmentAnimation onComplete={game.finishEnrollment} />
      )}

      {game.screen === "play" && !game.current && (
        <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-8">
          <p className="mb-6 text-slate-300">題目載入異常，請重新開始挑戰。</p>
          <button className="primary-button mx-auto" onClick={game.restart}>重玩</button>
        </section>
      )}

      {game.screen === "play" && game.current && (
        <PlayScreen
          stage={game.stage}
          stageQuestion={game.stageQuestion}
          stageLength={game.stageLength}
          stageCorrect={game.stageCorrect}
          passRequired={game.passRequired}
          progress={game.progress}
          runStreak={game.runStreak}
          lives={game.lives}
          score={game.score}
          current={game.current}
          selected={game.selected}
          endedEarly={game.endedEarly}
          roundLength={game.round.length}
          questionIndex={game.index}
          onChoose={game.choose}
          onNext={game.next}
          onReplay={game.restart}
        />
      )}

      {game.screen === "reward" && (
        <RewardScreen
          isGraduationStage={game.isGraduationStage}
          stage={game.stage}
          nextStage={game.nextStage}
          stageIndex={game.stageIndex}
          stageCorrect={game.stageCorrect}
          lives={game.lives}
          onContinue={game.continueAfterReward}
          onReplay={game.restart}
        />
      )}

      {game.screen === "result" && (
        <ResultScreen
          endedEarly={game.endedEarly}
          fullCompletion={game.fullCompletion}
          stageName={game.stage.name}
          score={game.score}
          maxRunStreak={game.maxRunStreak}
          runRecap={game.runRecap}
          personalBest={game.personalBest}
          isNewPersonalBest={game.isNewPersonalBest}
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
