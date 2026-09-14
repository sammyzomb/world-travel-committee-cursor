"use client";

import { useState } from "react";

export type QuestionVisualData = {
  type: "map" | "photo";
  label: string;
  detail: string;
  image?: string;
  credit?: string;
};

export function QuestionVisual({ visual }: { visual: QuestionVisualData }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = visual.type === "photo" && visual.image && !imageFailed;

  if (showPhoto) {
    return (
      <figure className="question-photo question-photo-compact">
        <img
          src={visual.image}
          alt={visual.label}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
        <figcaption>
          <span>旅遊景色</span>
          <b>{visual.label}</b>
          <small>{visual.detail}</small>
          {visual.credit && <em>圖片來源：{visual.credit}</em>}
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="question-visual map">
      <div className="visual-map-art">
        <img src="/globe.svg" alt="" />
      </div>
      <div>
        <span>地理提示</span>
        <b>{visual.label}</b>
        <small>{visual.detail}</small>
      </div>
    </div>
  );
}
