import { Check, Flame, X } from "lucide-react";
import { QuestionVisual } from "../question-visual";
import { STARTING_LIVES } from "../../lib/game-config";
import type { AnswerFeedback, PublicQuestion } from "../../lib/game-client-types";
import { streakCheerMessage } from "../../lib/streak-messages";
import { shouldShowRegionChip } from "../../lib/visual-safety";

type PlayScreenProps = {
  stage: { name: string; group: string };
  stageQuestion: number;
  stageLength: number;
  stageCorrect: number;
  passRequired: number;
  progress: number;
  runStreak: number;
  lives: number;
  score: number;
  current: PublicQuestion;
  feedback: AnswerFeedback | null;
  endedEarly: boolean;
  roundLength: number;
  questionIndex: number;
  onChoose: (option: number) => void;
  onNext: () => void;
  onReplay: () => void;
};

function feedbackMessage(
  feedback: AnswerFeedback,
  endedEarly: boolean,
  lives: number,
  runStreak: number,
) {
  if (feedback.isCorrect) {
    const cheer = streakCheerMessage(runStreak);
    return cheer ? `答對了！${cheer}` : "答對了！";
  }
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
  stageCorrect,
  passRequired,
  progress,
  runStreak,
  lives,
  score,
  current,
  feedback,
  endedEarly,
  roundLength,
  questionIndex,
  onChoose,
  onNext,
  onReplay,
}: PlayScreenProps) {
  const selected = feedback?.selectedIndex ?? null;
  const correctIndex = feedback?.correctIndex ?? null;
  const isWrong = feedback ? !feedback.isCorrect : false;
  const showRegion = shouldShowRegionChip({
    kind: current.kind,
    questionText: current.q,
    region: current.region,
    category: current.category,
    correctAnswer: feedback?.correctAnswer ?? "",
  });

  return (
    <section
      className={`play-screen mx-auto w-full max-w-4xl px-4 pb-6 pt-2 sm:px-8${feedback ? " play-screen-answered" : ""}${isWrong ? " play-screen-wrong" : ""}`}
    >
      <div className="play-progress-wrap">
        <div className="play-progress-meta">
          <span>本級第 {stageQuestion}/{stageLength} 題</span>
          <span>通關 {stageCorrect}/{passRequired} 題</span>
        </div>
        <div className="play-progress-bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="play-status mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <span className="score-pill">{stage.group}・{stage.name}</span>
        <div className="flex gap-2">
          {runStreak >= 2 && (
            <span className="streak-pill" aria-label={`連勝 ${runStreak} 題`}>
              <Flame size={14} /> {runStreak} 連勝
            </span>
          )}
          <span className="life-pill" aria-label={`整局剩餘 ${lives} 次機會`}>
            {Array.from({ length: STARTING_LIVES }, (_, index) => (
              <span className={index < lives ? "" : "lost"} key={index}>
                ♥
              </span>
            ))}
          </span>
          <span className="score-pill">{score.toLocaleString()} 分</span>
          <button type="button" className="rank-button" onClick={onReplay}>
            重玩
          </button>
        </div>
      </div>

      <div className="question-card play-question-card">
        <div className="play-question-main">
          {current.visual && (
            <div className="play-visual-slot">
              <QuestionVisual key={current.q} visual={current.visual} />
            </div>
          )}
          <div className="play-question-copy">
            <div className="flex items-center justify-between gap-2">
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
              <span className="play-question-hint text-sm text-slate-400">
                {current.level !== "送分題" && current.level}
                {current.kind === "tf" ? " · 請選是或否" : " · 選出正確答案"}
              </span>
            </div>
            <h1>{current.q}</h1>
            <div className={`answer-grid ${current.kind === "tf" ? "true-false-grid" : ""}`}>
              {current.options.map((option, optionIndex) => {
                let className = "answer-button";
                if (feedback) {
                  if (optionIndex === correctIndex) className += " correct";
                  else if (optionIndex === selected) className += " wrong";
                }
                return (
                  <button
                    className={className}
                    key={option}
                    onClick={() => onChoose(optionIndex)}
                    disabled={feedback !== null}
                  >
                    <span>
                      {current.kind === "tf"
                        ? optionIndex === 0
                          ? "✓"
                          : "×"
                        : String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                    {feedback && optionIndex === correctIndex ? (
                      <Check className="ml-auto" />
                    ) : feedback && optionIndex === selected ? (
                      <X className="ml-auto" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {feedback && (
          <div className="fact-box play-fact-box">
            <div className="play-fact-copy">
              <b>{feedbackMessage(feedback, endedEarly, lives, runStreak)}</b>
              {isWrong && <p className="play-correct-answer">正確答案：{feedback.correctAnswer}</p>}
              <p>{feedback.fact}</p>
            </div>
            <button type="button" className="primary-button play-next-button" onClick={onNext}>
              {nextButtonLabel(endedEarly, questionIndex, roundLength, stageQuestion, stageLength)} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
