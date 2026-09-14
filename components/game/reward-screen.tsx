import { Gift, GraduationCap, Sparkles } from "lucide-react";
import { CheerAnimation } from "../cheer-animation";
import { ORGANIZATION_NAME } from "../../lib/brand";
import { PASS_CORRECT_REQUIRED, POINTS_PER_CORRECT, QUESTIONS_PER_STAGE } from "../../lib/game-config";
import { getStageCompletionLabel } from "../../lib/game-round";

type RewardScreenProps = {
  isGraduationStage: boolean;
  stage: { name: string; group: string };
  nextStage: { name: string };
  stageCorrect: number;
  lives: number;
  onContinue: () => void;
};

export function RewardScreen({
  isGraduationStage,
  stage,
  nextStage,
  stageCorrect,
  lives,
  onContinue,
}: RewardScreenProps) {
  return (
    <section className="reward-section mx-auto w-full max-w-2xl px-4 py-10 text-center sm:px-8">
      <div className={`reward-card ${isGraduationStage ? "graduation-card" : ""}`}>
        {isGraduationStage && (
          <div className="graduation-confetti" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </div>
        )}
        <div className="reward-animation-wrap">
          <CheerAnimation variant={isGraduationStage ? "graduation" : "stageClear"} />
        </div>
        <div className="reward-sparkles">
          <Sparkles />
          <span>{isGraduationStage ? <GraduationCap /> : <Gift />}</span>
          <Sparkles />
        </div>
        <p className="mini-label">
          {isGraduationStage ? "GRADUATION・畢業爽感" : "STAGE CLEAR・通關"}
        </p>
        <h1>{isGraduationStage ? `${stage.group}畢業！` : "恭喜！"}</h1>
        <p className="completion-copy">
          恭喜完成{ORGANIZATION_NAME}
          <br />
          <b>{getStageCompletionLabel(stage, isGraduationStage)}關卡</b>
        </p>
        <p>
          本級答對 {stageCorrect} 題，接下來將升上 <b>{nextStage.name}</b>
        </p>
        <div className="reward-bonus">
          <span>升級準備</span>
          <strong>整局剩餘 {lives} 次機會延續</strong>
          <small>
            每級 {QUESTIONS_PER_STAGE} 題 · 答對 {PASS_CORRECT_REQUIRED} 題通過 · 每題 {POINTS_PER_CORRECT} 分
          </small>
        </div>
        <button className="primary-button mx-auto" onClick={onContinue}>
          {isGraduationStage ? "畢業完成，進入" : "休息好了，升上"} {nextStage.name}{" "}
          <span>→</span>
        </button>
        <p className="reward-tip">沒有倒數計時，準備好再繼續。</p>
      </div>
    </section>
  );
}
