import { Check, X } from "lucide-react";
import { QuestionVisual } from "../question-visual";
import { educationStages, STARTING_LIVES } from "../../lib/game-config";
import type { Question } from "../../lib/questions";

type PlayScreenProps = {
  stageIndex: number;
  stage: { name: string; group: string };
  stageQuestion: number;
  stageLength: number;
  progress: number;
  lives: number;
  score: number;
  current: Question;
  selected: number | null;
  endedEarly: boolean;
  roundLength: number;
  questionIndex: number;
  onChoose: (option: number) => void;
  onNext: () => void;
};

function feedbackMessage(selected: number, current: Question, endedEarly: boolean, lives: number) {
  if (selected === current.answer) return "答對了！";
  if (endedEarly) return "整局機會已用完，挑戰結束";
  return `答錯了，整局剩餘 ${lives} 次機會`;
}

function nextButtonLabel(
  endedEarly: boolean,
  questionIndex: number,
  roundLength: number,
  stageQuestion: number,
  stageLength: number,
) {
  if (endedEarly || questionIndex === roundLength - 1) return "查看成績";
  if (stageQuestion === stageLength) return "領取升級獎勵";
  return "前往下一題";
}

export function PlayScreen({
  stageIndex,
  stage,
  stageQuestion,
  stageLength,
  progress,
  lives,
  score,
  current,
  selected,
  endedEarly,
  roundLength,
  questionIndex,
  onChoose,
  onNext,
}: PlayScreenProps) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-10 pt-3 sm:px-8">
      <div className="education-path">
        {educationStages.map((item, index) => (
          <span
            className={index < stageIndex ? "done" : index === stageIndex ? "current" : ""}
            key={item.name}
          >
            {item.name}
          </span>
        ))}
        {stageIndex >= educationStages.length && <span className="current">{stage.name}</span>}
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="mini-label">
            {stage.group}・{stage.name}　第 {stageQuestion} 題 / {stageLength}
            {current.level === "送分題" ? "・送分題" : ""}
          </p>
          <h2 className="text-xl font-black sm:text-2xl">{stage.name}旅行測驗</h2>
        </div>
        <div className="flex gap-2">
          <span className="life-pill" aria-label={`整局剩餘 ${lives} 次機會`}>
            {Array.from({ length: STARTING_LIVES }, (_, index) => (
              <span className={index < lives ? "" : "lost"} key={index}>
                ♥
              </span>
            ))}
          </span>
          <span className="score-pill">{score.toLocaleString()} 分</span>
        </div>
      </div>

      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="question-card">
        {current.visual && <QuestionVisual key={current.q} visual={current.visual} />}
        <div className="flex items-center justify-between">
          <span
            className={`region-chip ${current.category === "旅行知識" ? "travel-knowledge" : ""}`}
          >
            {current.category === "旅行知識"
              ? `旅行知識・${current.region}`
              : current.region}
          </span>
          <span className="text-sm text-slate-400">
            {current.kind === "tf" ? "請選擇是或否" : "選出正確答案"}
          </span>
        </div>
        <h1>{current.q}</h1>
        <div className={`answer-grid ${current.kind === "tf" ? "true-false-grid" : ""}`}>
          {current.options.map((option, optionIndex) => {
            let className = "answer-button";
            if (selected !== null) {
              if (optionIndex === current.answer) className += " correct";
              else if (optionIndex === selected) className += " wrong";
            }
            return (
              <button className={className} key={option} onClick={() => onChoose(optionIndex)}>
                <span>
                  {current.kind === "tf"
                    ? optionIndex === 0
                      ? "✓"
                      : "×"
                    : String.fromCharCode(65 + optionIndex)}
                </span>
                {option}
                {selected !== null && optionIndex === current.answer ? (
                  <Check className="ml-auto" />
                ) : selected === optionIndex ? (
                  <X className="ml-auto" />
                ) : null}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className="fact-box">
            <b>{feedbackMessage(selected, current, endedEarly, lives)}</b>
            <p>{current.fact}</p>
            <button onClick={onNext}>
              {nextButtonLabel(endedEarly, questionIndex, roundLength, stageQuestion, stageLength)} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
