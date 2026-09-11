import { Check, X } from "lucide-react";
import { QuestionVisual } from "../question-visual";
import { STARTING_LIVES } from "../../lib/game-config";
import type { Question } from "../../lib/questions";

type ModeQuizScreenProps = {
  title: string;
  subtitle: string;
  current: Question;
  questionNumber: number;
  totalQuestions: number;
  lives: number;
  score: number;
  selected: number | null;
  onChoose: (option: number) => void;
  onNext: () => void;
};

export function ModeQuizScreen({
  title,
  subtitle,
  current,
  questionNumber,
  totalQuestions,
  lives,
  score,
  selected,
  onChoose,
  onNext,
}: ModeQuizScreenProps) {
  const progress = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;
  const isLast = questionNumber >= totalQuestions;
  const answeredWrong = selected !== null && selected !== current.answer;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-10 pt-3 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="mini-label">{subtitle}　第 {questionNumber} 題 / {totalQuestions}</p>
          <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
        </div>
        <div className="flex gap-2">
          <span className="life-pill" aria-label={`剩餘 ${lives} 次機會`}>
            {Array.from({ length: STARTING_LIVES }, (_, index) => (
              <span className={index < lives ? "" : "lost"} key={index}>♥</span>
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
          <span className={`region-chip ${current.category === "旅行知識" ? "travel-knowledge" : ""}`}>
            {current.category === "旅行知識" ? `旅行知識・${current.region}` : current.region}
          </span>
          <span className="text-sm text-slate-400">
            {current.kind === "tf" ? "是或否" : "四選一"}
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
                    ? optionIndex === 0 ? "✓" : "×"
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
            <b>
              {selected === current.answer
                ? "答對了！"
                : lives === 0
                  ? "機會用完了！"
                  : `答錯了，剩餘 ${lives} 次機會`}
            </b>
            <p>{current.fact}</p>
            <button onClick={onNext}>
              {isLast || (answeredWrong && lives === 0) ? "查看結果" : "下一題"} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
