import { Crown, Flame, Map, RotateCcw, Sparkles, Target } from "lucide-react";
import { GameAnimation } from "../game-animation";
import { AchievementsPanel } from "./achievements-panel";
import { GAME_NAME, ORGANIZATION_NAME } from "../../lib/brand";
import type { AchievementDef } from "../../lib/achievements";
import type { LeaderboardEntry } from "../../lib/leaderboard-types";
import type { PlayerProfile } from "../../lib/player-storage";
import { questionBankStats } from "../../lib/questions";

type StartScreenProps = {
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  profile: PlayerProfile;
  achievements: AchievementDef[];
  onBegin: () => void;
  onDaily: () => void;
  onTraining: () => void;
  onReview: () => void;
  onMapQuiz: () => void;
};

export function StartScreen({
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  profile,
  achievements,
  onBegin,
  onDaily,
  onTraining,
  onReview,
  onMapQuiz,
}: StartScreenProps) {
  const dailyLabel = profile.dailyPlayedToday
    ? profile.dailyWonToday
      ? "今日已完成 ✓"
      : "今日已挑戰"
    : "每日一題";

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-8 pt-4 lg:grid-cols-[1.35fr_.65fr] sm:px-8">
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
          <p className="arcade-game-subtitle">從小一一路衝到博士，地理梗遊戲開打！</p>
          <button type="button" className="primary-button" onClick={onBegin}>
            主線闖關 <span>→</span>
          </button>
          <div className="mode-grid arcade-mode-grid">
            <button type="button" className="mode-chip" onClick={onDaily}>
              <Sparkles size={16} /> {dailyLabel}
            </button>
            <button type="button" className="mode-chip" onClick={onTraining}>
              <Target size={16} /> 洲別特訓
            </button>
            <button type="button" className="mode-chip" onClick={onReview}>
              <RotateCcw size={16} /> 錯題再戰 ({profile.wrongQuestionKeys.length})
            </button>
            <button type="button" className="mode-chip" onClick={onMapQuiz}>
              <Map size={16} /> 地圖點選
            </button>
          </div>
        </div>
      </div>

      <div className="start-side-column">
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
          <div className="player-stats-row">
            <span><Flame size={14} /> 每日連勝 {profile.dailyStreak} 天</span>
            <span>最佳連勝 {profile.bestRunStreak} 題</span>
            <span>最高 {profile.bestRunScore} 分</span>
          </div>
          <p className="mt-5 text-center text-xs text-slate-400">
            題庫 {questionBankStats.total} 題 · 娛樂衝榜 · 前 10 名留名
          </p>
        </aside>

        <AchievementsPanel
          achievements={achievements}
          unlocked={profile.unlockedAchievements}
          compact
        />
      </div>
    </section>
  );
}
