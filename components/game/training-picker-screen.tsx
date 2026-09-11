import { TRAINING_CONTINENTS, type TrainingContinent } from "../../lib/side-modes";

type TrainingPickerScreenProps = {
  onPick: (continent: TrainingContinent) => void;
  onBack: () => void;
};

export function TrainingPickerScreen({ onPick, onBack }: TrainingPickerScreenProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <div className="question-card entertainment-card">
        <p className="mini-label">SIDE MODE・副本挑戰</p>
        <h2 className="text-2xl font-black">洲別特訓</h2>
        <p className="mt-2 text-slate-300">選一個主題，10 題快打。答對 6 題以上就算通關！</p>
        <div className="mode-grid mt-6">
          {TRAINING_CONTINENTS.map((continent) => (
            <button className="mode-chip" key={continent} onClick={() => onPick(continent)}>
              {continent}
            </button>
          ))}
        </div>
        <button className="rank-button mt-6" onClick={onBack}>返回封面</button>
      </div>
    </section>
  );
}
