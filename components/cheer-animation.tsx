type CheerVariant = "stageClear" | "graduation";

export function CheerAnimation({
  variant = "stageClear",
}: {
  variant?: CheerVariant;
}) {
  const isGraduation = variant === "graduation";

  return (
    <div
      className={`cheer-animation ${isGraduation ? "cheer-animation-graduation" : ""}`}
      aria-hidden="true"
    >
      <div className="cheer-burst cheer-burst-left">✦</div>
      <div className="cheer-burst cheer-burst-right">✦</div>
      <div className="cheer-hands">
        <span className="cheer-hand cheer-hand-left">👏</span>
        <span className="cheer-label">喝采！</span>
        <span className="cheer-hand cheer-hand-right">👏</span>
      </div>
      <div className="cheer-subline">{isGraduation ? "畢業啦！" : "太厲害了！"}</div>
      <div className="cheer-sparkles">
        {Array.from({ length: isGraduation ? 10 : 6 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    </div>
  );
}
