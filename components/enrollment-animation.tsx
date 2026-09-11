"use client";

import { useEffect } from "react";

const ENROLLMENT_DURATION_MS = 5400;

export function EnrollmentAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, ENROLLMENT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <section className="enrollment-section" aria-live="polite">
      <div className="enrollment-scene">
        <div className="enrollment-sky" aria-hidden="true">
          <span className="enrollment-cloud enrollment-cloud-a" />
          <span className="enrollment-cloud enrollment-cloud-b" />
          <span className="enrollment-sun" />
        </div>

        <div className="enrollment-campus" aria-hidden="true">
          <div className="enrollment-school">
            <div className="enrollment-roof" />
            <div className="enrollment-building">
              <span className="enrollment-flag" />
              <span className="enrollment-school-name">民國教育委員會</span>
              <span className="enrollment-window" />
              <span className="enrollment-window" />
              <span className="enrollment-door" />
            </div>
          </div>
          <div className="enrollment-gate">
            <span className="enrollment-gate-pillar enrollment-gate-pillar-left" />
            <span className="enrollment-gate-pillar enrollment-gate-pillar-right" />
            <span className="enrollment-gate-sign">小一入學</span>
          </div>
          <div className="enrollment-path" />
        </div>

        <div className="enrollment-student" aria-hidden="true">
          <span className="enrollment-student-hat" />
          <span className="enrollment-student-head" />
          <span className="enrollment-student-body" />
          <span className="enrollment-student-bag" />
          <span className="enrollment-student-legs">
            <i />
            <i />
          </span>
        </div>

        <div className="enrollment-petals" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <i key={index} />
          ))}
        </div>

        <div className="enrollment-copy">
          <p className="mini-label enrollment-phase enrollment-phase-1">ELEMENTARY ENROLLMENT</p>
          <h1 className="enrollment-phase enrollment-phase-2">小一入學典禮</h1>
          <p className="enrollment-phase enrollment-phase-3">
            背上書包，踏上你的<span>世界旅行</span>學習之旅
          </p>
        </div>

        <button type="button" className="enrollment-skip" onClick={onComplete}>
          跳過動畫 →
        </button>
      </div>
    </section>
  );
}
