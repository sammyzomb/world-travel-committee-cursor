"use client";

import { Crown, Globe2 } from "lucide-react";
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
        <button className="rank-button" onClick={game.goToStart}>
          <Crown size={17} /> 永久排行榜
        </button>
      </header>

      {game.screen === "start" && (
        <StartScreen
          leaderboard={game.leaderboard}
          leaderboardLoading={game.leaderboardLoading}
          leaderboardError={game.leaderboardError}
          onBegin={game.beginFromFirstGrade}
        />
      )}

      {game.screen === "enroll" && <EnrollmentAnimation onComplete={game.finishEnrollment} />}

      {game.screen === "play" && !game.current && (
        <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-8">
          <p className="mb-6 text-slate-300">題目載入異常，請重新開始挑戰。</p>
          <button className="primary-button mx-auto" onClick={game.restart}>從小一重新挑戰</button>
        </section>
      )}

      {game.screen === "play" && game.current && (
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
          onChoose={game.choose}
          onNext={game.next}
        />
      )}

      {game.screen === "reward" && (
        <RewardScreen
          isGraduationStage={game.isGraduationStage}
          stage={game.stage}
          nextStage={game.nextStage}
          stageCorrect={game.stageCorrect}
          lives={game.lives}
          onContinue={game.continueAfterReward}
        />
      )}

      {game.screen === "result" && (
        <ResultScreen
          endedEarly={game.endedEarly}
          stageName={game.stage.name}
          score={game.score}
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
