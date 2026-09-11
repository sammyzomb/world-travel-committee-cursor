import type { SideResult } from "../../hooks/use-entertainment-modes";
import { AchievementsPanel } from "./achievements-panel";
import type { AchievementDef } from "../../lib/achievements";

type SideResultScreenProps = {
  result: SideResult;
  newAchievements: string[];
  achievements: AchievementDef[];
  unlocked: string[];
  onHome: () => void;
};

export function SideResultScreen({
  result,
  newAchievements,
  achievements,
  unlocked,
  onHome,
}: SideResultScreenProps) {
  return (
    <section className="result-section mx-auto w-full max-w-3xl px-4 py-10 text-center sm:px-8">
      <div className="result-card entertainment-card">
        <p className="mini-label">{result.modeLabel}</p>
        <h1 className="text-4xl font-black">{result.won ? "通關！" : "本局結束"}</h1>
        <p className="mt-3 text-lg text-slate-200">{result.detail}</p>
        {result.total > 0 && (
          <p className="mt-2 text-amber-300">
            答對 {result.correct}/{result.total} 題 · {result.score} 分
          </p>
        )}
        {newAchievements.length > 0 && (
          <div className="new-achievements mt-5">
            <p className="mini-label">NEW BADGE</p>
            <p>新成就：{newAchievements.map((id) => achievements.find((item) => item.id === id)?.title).join("、")}</p>
          </div>
        )}
        <button className="primary-button mx-auto mt-6" onClick={onHome}>返回封面</button>
      </div>
      <AchievementsPanel achievements={achievements} unlocked={unlocked} compact />
    </section>
  );
}
