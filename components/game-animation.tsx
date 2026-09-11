type AnimationKind = "opening";

const animationSources: Record<AnimationKind, { type: "video"; src: string; alt: string }> = {
  opening: { type: "video", src: "/animations/opening.mp4", alt: "世界旅遊委員會開場動畫" },
};

export function GameAnimation({
  kind,
  className = "",
}: {
  kind: AnimationKind;
  className?: string;
}) {
  const source = animationSources[kind];

  return (
    <video
      className={`game-animation ${className}`}
      src={source.src}
      autoPlay
      muted
      loop
      playsInline
      aria-label={source.alt}
    />
  );
}
