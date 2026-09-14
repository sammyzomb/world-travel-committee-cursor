import { Check, X } from "lucide-react";
import { QuestionVisual } from "../question-visual";
import { STARTING_LIVES } from "../../lib/game-config";
import type { Question } from "../../lib/questions";
import { shouldShowRegionChip } from "../../lib/visual-safety";

type PlayScreenProps = {
  stage: { name: string; group: string };
  stageQuestion: number;
  stageLength: number;
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
  stage,
  stageQuestion,
  stageLength,
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
  const correctAnswer = current.options[current.answer] ?? "";
  const showRegion = shouldShowRegionChip({
    kind: current.kind,
    questionText: current.q,
    region: current.region,
    category: current.category,
    correctAnswer,
  });

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-10 pt-3 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="score-pill">{stage.group}・{stage.name}</span>
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

      <div className="question-card">
        {current.visual && <QuestionVisual key={current.q} visual={current.visual} />}
        <div className="flex items-center justify-between">
          {showRegion ? (
            <span
            className={`region-chip ${
              current.category === "旅行知識"
                ? "travel-knowledge"
                : current.category === "世界遺產"
                  ? "heritage-knowledge"
                  : ""
            }`}
          >
            {current.category === "旅行知識"
              ? `旅行知識・${current.region}`
              : current.category === "世界遺產"
                ? `世界遺產・${current.region}`
                : current.region}
            </span>
          ) : (
            <span />
          )}
          <span className="text-sm text-slate-400">
            {current.level !== "送分題" && current.level}
            {current.kind === "tf" ? " · 請選是或否" : " · 選出正確答案"}
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
