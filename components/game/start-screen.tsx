import { Crown, MapPin, Plane, Sparkles, Trophy } from "lucide-react";
import { GAME_HERO_HEADLINE } from "../../lib/brand";
import type { LeaderboardEntry } from "../../lib/leaderboard-types";
import type { PersonalBest } from "../../lib/player-progress";
import catalog from '../../data/travel-puzzle-catalog.json';
import { travelStageLabel } from '../../lib/travel-stage-label';
type StartScreenProps = {
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  personalBest: PersonalBest | null;
  onBegin: () => void;
};

export function StartScreen({
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  personalBest,
  onBegin,
}: StartScreenProps) {
  return (
    <section className="start-screen mx-auto w-full max-w-7xl px-4 pb-12 pt-2 sm:px-10">
      <div className="start-hero-grid">
        <div className="start-hero-panel">
          <div className="start-hero-main">
            <div className="start-hero-art-wrap">
              <img
                className="start-title-art"
                src="/quiz-channel-question-title.png"
                alt="Quiz Channel Question 原始街機開場畫面"
              />
            </div>

            <div className="start-hero-copy">
              <p className="mini-label">TRAVEL QUIZ ARCADE</p>
              <h1 className="start-hero-title">{GAME_HERO_HEADLINE}</h1>
              <p className="start-hero-subtitle">全年齡旅遊益智挑戰：看景點、認文化、解開旅行線索。難度隨關卡提升，沒有作答倒數。</p>

              <div className="start-topic-chips" aria-label="題庫主題">
                <span><MapPin size={16} /> 旅遊景點</span>
                <span><Sparkles size={16} /> 異國文化</span>
                <span><Crown size={16} /> 世界遺產</span>
                <span><Plane size={16} /> 旅行實務</span>
              </div>

              {personalBest && (
                <p className="start-personal-best">
                  <Trophy size={15} />
                  個人最佳 {personalBest.bestScore.toLocaleString()} 分 · 最高 {travelStageLabel(personalBest.bestStageName)}
                  {personalBest.maxStreak >= 3 ? ` · ${personalBest.maxStreak} 連勝` : ""}
                </p>
              )}

              <button type="button" className="primary-button start-play-button" onClick={onBegin}>
                主線闖關 <span>→</span>
              </button>
              <details className="puzzle-catalog">
                <summary>查看題庫：{catalog.total} 題・{Object.keys(catalog.types).length} 種益智題型</summary>
                <p>景點照片題 {catalog.photoCount} 題；文化題有資料來源。推理題使用明示的情境設定，包含同類規則的不同題目，不代表真實交通或店家資訊。</p>
                <ul>{Object.entries(catalog.types).map(([name,count])=><li key={name}><b>{name}</b><span>{count} 題</span></li>)}</ul>
                <p>前段辨識景點與文化；中段讀懂線索；後段交叉核對多個條件。舊版定位、學術與字數失衡的情境題已退出本次闖關。</p>
              </details>
            </div>
          </div>
        </div>

        <aside className="leader-card start-leader-card">
          <div className="start-leader-header">
            <div>
              <p className="mini-label">HALL OF FAME</p>
              <h2>永久名人榜</h2>
            </div>
            <Crown className="text-amber-300" size={34} />
          </div>

          <div className="start-leader-body">
            {leaderboardLoading && <p className="leaderboard-empty">名人榜載入中…</p>}
            {!leaderboardLoading && leaderboard.length === 0 && (
              <div className="start-leader-empty">
                <Crown size={44} className="text-amber-300/40" />
                <p>{leaderboardError ?? "尚無紀錄"}</p>
                <small>完成主線並送出成績，成為第一位留名的旅人！</small>
              </div>
            )}
            {!leaderboardLoading &&
              leaderboard.map((row, index) => (
                <div className="leader-row" key={row.id}>
                  <span className={index < 3 ? "podium" : ""}>{index + 1}</span>
                  <div className="leader-row-copy">
                    <b>{row.playerName}</b>
                    <small>{travelStageLabel(row.stageReached)}</small>
                  </div>
                  <strong>{row.score.toLocaleString()}</strong>
                </div>
              ))}
          </div>

          <p className="start-leader-footer">
            多主題題庫 · 前 10 名留名
          </p>
        </aside>
      </div>
    </section>
  );
}
