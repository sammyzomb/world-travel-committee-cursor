"use client";

import { useState } from "react";
import { GAME_NAME } from "../../lib/brand";

type ShareScoreCardProps = {
  stageName: string;
  score: number;
  runStreak: number;
  endedEarly: boolean;
};

export function ShareScoreCard({ stageName, score, runStreak, endedEarly }: ShareScoreCardProps) {
  const [message, setMessage] = useState<string | null>(null);

  const shareText = [
    `🌍 ${GAME_NAME}`,
    endedEarly
      ? `我在【${stageName}】本局 GG，拿了 ${score} 分。`
      : `我打通了題庫，在【${stageName}】拿下 ${score} 分！`,
    `本局最高連勝：${runStreak} 題`,
    "你行你來 👉",
    typeof window !== "undefined" ? window.location.href : "",
  ].join("\n");

  async function shareScore() {
    setMessage(null);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: GAME_NAME, text: shareText });
        setMessage("已開啟分享！");
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setMessage("成績卡已複製，貼給朋友挑戰吧！");
    } catch {
      setMessage("分享失敗，請再試一次。");
    }
  }

  return (
    <div className="share-score-card">
      <p className="mini-label">SHARE SCORE</p>
      <p className="share-score-preview">{shareText.split("\n").slice(0, 3).join(" ")}</p>
      <button className="primary-button share-score-button" onClick={shareScore}>
        分享成績卡
      </button>
      {message && <p className="score-submit-message success">{message}</p>}
    </div>
  );
}
