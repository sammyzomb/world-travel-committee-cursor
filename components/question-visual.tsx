"use client";

import { useState } from "react";

export type QuestionVisualData = {
  type: "map" | "photo";
  label: string;
  detail: string;
  image?: string;
  credit?: string;
  sourceUrl?: string;
  licenseUrl?: string;
};

export function QuestionVisual({ visual,requiredClue=false,onPhotoReady }: { visual: QuestionVisualData; requiredClue?:boolean;onPhotoReady?:(ready:boolean)=>void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [attempt,setAttempt]=useState(0);
  const showPhoto = visual.type === "photo" && visual.image && !imageFailed;

  if(imageFailed && requiredClue) return <div className="photo-load-error" role="alert"><p>景點照片載入失敗，請重新載入後再作答。</p><button className="rank-button" onClick={()=>{setAttempt(x=>x+1);setImageFailed(false);}}>重新載入照片</button></div>;

  if (showPhoto) {
    return (
      <figure className="question-photo question-photo-compact">
        <img
          src={attempt ? `${visual.image}${visual.image?.includes('?')?'&':'?'}retry=${attempt}` : visual.image}
          alt="旅遊景色參考圖"
          loading={requiredClue?'eager':'lazy'}
          referrerPolicy="no-referrer"
          onLoad={()=>onPhotoReady?.(true)}
          onError={() => {setImageFailed(true);onPhotoReady?.(false);}}
        />
        <figcaption>
          <span>旅遊景色</span>
          <b>{visual.label}</b>
          <small>{visual.detail}</small>
          {visual.credit && <em>圖片來源：{visual.credit}{visual.sourceUrl && <> · <a href={visual.sourceUrl} target="_blank" rel="noreferrer">來源</a></>}{visual.licenseUrl && <> · <a href={visual.licenseUrl} target="_blank" rel="noreferrer">授權</a></>}</em>}
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
        <span>旅遊地標</span>
        <b>{visual.label}</b>
        <small>{visual.detail}</small>
      </div>
    </div>
  );
}
