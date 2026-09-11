import type { AchievementDef } from "../../lib/achievements";

type AchievementsPanelProps = {
  achievements: AchievementDef[];
  unlocked: string[];
  compact?: boolean;
};

export function AchievementsPanel({ achievements, unlocked, compact = false }: AchievementsPanelProps) {
  return (
    <div className={`achievements-panel ${compact ? "compact" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="mini-label">ACHIEVEMENTS</p>
          <h3>成就徽章</h3>
        </div>
        <span className="achievement-count">{unlocked.length}/{achievements.length}</span>
      </div>
      <div className="achievement-grid">
        {achievements.map((item) => {
          const owned = unlocked.includes(item.id);
          return (
            <div className={`achievement-badge ${owned ? "owned" : ""}`} key={item.id} title={item.description}>
              <span className="achievement-emoji">{owned ? item.emoji : "🔒"}</span>
              <b>{item.title}</b>
              {!compact && <small>{item.description}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
