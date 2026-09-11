import { Crown } from "lucide-react";
import { GameAnimation } from "../game-animation";
import { GAME_NAME, ORGANIZATION_NAME } from "../../lib/brand";
import type { LeaderboardEntry } from "../../lib/leaderboard-types";
import { questionBankStats } from "../../lib/questions";

type StartScreenProps = {
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  onBegin: () => void;
};

export function StartScreen({
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  onBegin,
}: StartScreenProps) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-8 pt-4 lg:grid-cols-[1.4fr_.6fr] sm:px-8">
      <div className="hero-card arcade-hero">
        <GameAnimation kind="opening" className="arcade-opening-video" />
        <img
          className="original-title-art"
          src="/quiz-channel-question-title.png"
          alt="Quiz Channel Question 原始街機開場畫面"
        />
        <div className="arcade-screen-copy">
          <p className="arcade-org-title">{ORGANIZATION_NAME}</p>
          <h1 className="arcade-game-title">{GAME_NAME}</h1>
          <p className="arcade-game-subtitle">從小一開始，挑戰世界地理與旅行知識</p>
          <button type="button" className="primary-button" onClick={onBegin}>
            從小一開始 <span>→</span>
          </button>
        </div>
      </div>
      <aside className="leader-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="mini-label">HALL OF FAME</p>
            <h2>永久名人榜</h2>
          </div>
          <Crown className="text-amber-300" size={30} />
        </div>
        <div className="mt-6 space-y-2">
          {leaderboardLoading && <p className="leaderboard-empty">名人榜載入中…</p>}
          {!leaderboardLoading && leaderboard.length === 0 && (
            <p className="leaderboard-empty">
              {leaderboardError ?? "尚無紀錄，成為第一位留名的旅人吧！"}
            </p>
          )}
          {!leaderboardLoading &&
            leaderboard.map((row, index) => (
              <div className="leader-row" key={row.id}>
                <span className={index < 3 ? "podium" : ""}>{index + 1}</span>
                <b>{row.playerName}</b>
                <strong>{row.score.toLocaleString()}</strong>
              </div>
            ))}
        </div>
        <p className="mt-5 text-center text-xs text-slate-400">
          題庫 {questionBankStats.total} 題 · 分數永不重置 · 前 10 名才可留名
        </p>
      </aside>
    </section>
  );
}
