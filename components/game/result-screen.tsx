import { ArrowUpRight, CalendarDays, Crown, GraduationCap, MapPinned, Sparkles } from "lucide-react";
import { CheerAnimation } from "../cheer-animation";
import { ShareScoreCard } from "./share-score-card";
import type { SubmitState } from "../../lib/leaderboard-types";

type ResultScreenProps = {
  endedEarly: boolean;
  fullCompletion: boolean;
  stageName: string;
  score: number;
  maxRunStreak: number;
  playerName: string;
  submitState: SubmitState;
  submitMessage: string | null;
  onPlayerNameChange: (value: string) => void;
  onSubmitScore: () => void;
  onRestart: () => void;
};

export function ResultScreen({
  endedEarly,
  fullCompletion,
  stageName,
  score,
  maxRunStreak,
  playerName,
  submitState,
  submitMessage,
  onPlayerNameChange,
  onSubmitScore,
  onRestart,
}: ResultScreenProps) {
  return (
    <section className="result-section mx-auto w-full max-w-5xl px-4 py-10 text-center sm:px-8">
      {fullCompletion && (
        <div className="celebration-animation-wrap">
          <CheerAnimation variant="graduation" />
        </div>
      )}
      <div className={`result-card ${fullCompletion ? "graduation-card final-graduation" : ""}`}>
        {fullCompletion && (
          <div className="graduation-confetti" aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => <i key={index} />)}
          </div>
        )}
        {endedEarly ? (
          <Crown className="mx-auto text-amber-300" size={54} />
        ) : (
          <div className="reward-sparkles">
            <Sparkles />
            <span>
              <GraduationCap />
            </span>
            <Sparkles />
          </div>
        )}
        <p className="mini-label mt-4">
          {fullCompletion ? "FULL CLEAR・研二通關" : endedEarly ? "本局 GG" : "RUN END"}
        </p>
        {fullCompletion && <h2 className="final-graduation-title">完整破關！研二學業完成</h2>}
        <span className="degree-badge">
          {fullCompletion ? "研二畢業" : endedEarly ? `${stageName}止步` : `${stageName}結束`}
        </span>
        <h1>{score.toLocaleString()} 分</h1>
        <p className="run-streak-copy">本局最高連勝 {maxRunStreak} 題</p>
        <p>
          {fullCompletion
            ? "從小一一路升到研二，十八級學制全部通關！"
            : endedEarly
              ? `在【${stageName}】被題目終結，換一組再來復仇！`
              : `本局在【${stageName}】結束，繼續挑戰衝更高分！`}
        </p>

        <ShareScoreCard
          stageName={stageName}
          score={score}
          runStreak={maxRunStreak}
          endedEarly={endedEarly || !fullCompletion}
        />

        {score > 0 && (
          <div className="score-submit-card">
            <p className="mini-label">SUBMIT SCORE</p>
            <label className="score-submit-label" htmlFor="player-name">
              輸入暱稱，挑戰永久名人榜
            </label>
            <div className="score-submit-row">
              <input
                id="player-name"
                className="score-submit-input"
                value={playerName}
                maxLength={20}
                placeholder="你的暱稱"
                onChange={(event) => onPlayerNameChange(event.target.value)}
                disabled={submitState === "saving" || submitState === "saved"}
              />
              <button
                className="primary-button score-submit-button"
                onClick={onSubmitScore}
                disabled={submitState === "saving" || submitState === "saved"}
              >
                {submitState === "saving" ? "送出中…" : submitState === "saved" ? "已留名" : "送出成績"}
              </button>
            </div>
            {submitMessage && (
              <p
                className={`score-submit-message ${
                  submitState === "saved" ? "success" : submitState === "error" ? "error" : ""
                }`}
              >
                {submitMessage}
              </p>
            )}
          </div>
        )}
        <button className="primary-button mx-auto" onClick={onRestart}>
          重玩
        </button>
      </div>

      <div className="travel-invitation">
        <p className="mini-label">把答對的世界，變成親眼看見的風景</p>
        <h2>下一站，跟著航向世界出發</h2>
        <p>從免費旅遊講座開始認識目的地，或直接查看近期精選行程。</p>
        <div className="invitation-grid">
          <a
            className="invitation-card"
            href="https://www.tcawg.com/travel/lectures.html"
            target="_blank"
            rel="noreferrer"
          >
            <span className="invitation-icon">
              <CalendarDays />
            </span>
            <span>
              <small>TRAVEL LECTURES</small>
              <b>最新旅遊講座</b>
              <em>聽專業領隊分享路線與旅行故事</em>
            </span>
            <ArrowUpRight className="card-arrow" />
          </a>
          <a
            className="invitation-card"
            href="https://www.tcawg.com/travel/lets-go-trips.html"
            target="_blank"
            rel="noreferrer"
          >
            <span className="invitation-icon">
              <MapPinned />
            </span>
            <span>
              <small>FEATURED TOURS</small>
              <b>探索精選行程</b>
              <em>查看世界各地深度旅遊與出發日期</em>
            </span>
            <ArrowUpRight className="card-arrow" />
          </a>
        </div>
        <p className="company-signature">鄉野旅行社・航向世界旅遊</p>
      </div>
    </section>
  );
}
