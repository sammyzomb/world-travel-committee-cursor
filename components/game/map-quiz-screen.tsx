import { MAP_CONTINENTS, type MapQuizItem } from "../../lib/side-modes";
import { STARTING_LIVES } from "../../lib/game-config";

type MapQuizScreenProps = {
  current: MapQuizItem;
  questionNumber: number;
  totalQuestions: number;
  lives: number;
  score: number;
  selectedContinent: string | null;
  onChoose: (continent: string) => void;
  onNext: () => void;
};

export function MapQuizScreen({
  current,
  questionNumber,
  totalQuestions,
  lives,
  score,
  selectedContinent,
  onChoose,
  onNext,
}: MapQuizScreenProps) {
  const progress = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;
  const isLast = questionNumber >= totalQuestions;
  const answeredWrong = selectedContinent !== null && selectedContinent !== current.continent;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-10 pt-3 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="mini-label">洲別挑戰　第 {questionNumber} 題 / {totalQuestions}</p>
          <h2 className="text-xl font-black sm:text-2xl">洲別神眼挑戰</h2>
        </div>
        <div className="flex gap-2">
          <span className="life-pill">
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

      <div className="question-card map-quiz-card">
        <p className="mini-label">點選正確洲別</p>
        <h1>「{current.country}」位於哪一洲？</h1>
        <p className="map-quiz-hint">地標提示：{current.landmark}</p>

        <div className="map-continent-grid">
          {MAP_CONTINENTS.map((continent) => {
            let className = "map-continent-button";
            if (selectedContinent !== null) {
              if (continent === current.continent) className += " correct";
              else if (continent === selectedContinent) className += " wrong";
            }
            return (
              <button
                className={className}
                key={continent}
                onClick={() => onChoose(continent)}
                disabled={selectedContinent !== null}
              >
                {continent}
              </button>
            );
          })}
        </div>

        {selectedContinent !== null && (
          <div className="fact-box">
            <b>
              {selectedContinent === current.continent
                ? "命中！"
                : lives === 0
                  ? "機會用完了！"
                  : `差一點！正確答案是 ${current.continent}`}
            </b>
            <p>{current.landmark}位於{current.country}，屬於{current.continent}。</p>
            <button onClick={onNext}>
              {isLast || (answeredWrong && lives === 0) ? "查看結果" : "下一題"} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
