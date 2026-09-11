"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Crown, Gift, Globe2, GraduationCap, MapPinned, Sparkles, Timer, X } from "lucide-react";
import { CheerAnimation } from "../components/cheer-animation";
import { EnrollmentAnimation } from "../components/enrollment-animation";
import { GameAnimation } from "../components/game-animation";
import { QuestionVisual } from "../components/question-visual";
import {
  educationStages,
  graduationStageIndexes,
  POINTS_PER_CORRECT,
  STARTING_LIVES,
} from "../lib/game-config";
import {
  appendNextStage,
  canDrawNextStage,
  createRound,
  getStageAt,
  getStageCompletionLabel,
  getStageIndex,
  getStageLength,
  passRequiredForStage,
  type RoundPlan,
} from "../lib/game-round";
import { questionBankStats } from "../lib/questions";

type LeaderboardEntry = {
  id: number;
  playerName: string;
  score: number;
  stageReached: string;
  completed: boolean;
};

export default function Home(){
  const [screen,setScreen]=useState<"start"|"enroll"|"play"|"reward"|"result">("start");
  const [roundPlan,setRoundPlan]=useState<RoundPlan>(()=>createRound([]));
  const previousRound=useRef<string[]>([]);
  const [index,setIndex]=useState(0); const [score,setScore]=useState(0); const [selected,setSelected]=useState<number|null>(null);
  const [stageCorrect,setStageCorrect]=useState(0);
  const [lives,setLives]=useState(STARTING_LIVES); const [endedEarly,setEndedEarly]=useState(false);
  const [leaderboard,setLeaderboard]=useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading,setLeaderboardLoading]=useState(true);
  const [leaderboardError,setLeaderboardError]=useState<string|null>(null);
  const [playerName,setPlayerName]=useState("");
  const [submitState,setSubmitState]=useState<"idle"|"saving"|"saved"|"not-qualified"|"error">("idle");
  const [submitMessage,setSubmitMessage]=useState<string|null>(null);
  const loadLeaderboard=useCallback(async()=>{
    setLeaderboardLoading(true);
    try{
      const response=await fetch("/api/leaderboard");
      const payload=await response.json() as {entries?:LeaderboardEntry[];error?:string};
      setLeaderboard(payload.entries??[]);
      setLeaderboardError(payload.error??null);
    }catch{
      setLeaderboard([]);
      setLeaderboardError("無法載入名人榜，請稍後再試。");
    }finally{
      setLeaderboardLoading(false);
    }
  },[]);
  useEffect(()=>{if(screen==="start"||screen==="result")loadLeaderboard()},[screen,loadLeaderboard]);
  const finishEnrollment=useCallback(()=>setScreen("play"),[]);
  async function submitScore(){
    const trimmed=playerName.trim();
    if(!trimmed){setSubmitMessage("請輸入暱稱後再送出成績。");return}
    setSubmitState("saving");
    setSubmitMessage(null);
    try{
      const response=await fetch("/api/leaderboard",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerName:trimmed,score,stageReached:stage.name,completed:!endedEarly})});
      const payload=await response.json() as {qualified?:boolean;error?:string};
      if(!response.ok||payload.error){setSubmitState("error");setSubmitMessage(payload.error??"成績送出失敗，請稍後再試。");return}
      if(payload.qualified){setSubmitState("saved");setSubmitMessage("恭喜留名永久名人榜！");await loadLeaderboard();return}
      setSubmitState("not-qualified");
      setSubmitMessage("分數尚未進入前 10 名，繼續挑戰衝榜吧！");
    }catch{
      setSubmitState("error");
      setSubmitMessage("成績送出失敗，請稍後再試。");
    }
  }
  const round=roundPlan.questions;
  const stageStarts=roundPlan.stageStarts;
  const current=round[index];
  const stageIndex=getStageIndex(stageStarts,index);
  const stage=getStageAt(stageIndex);
  const stageLength=getStageLength(stageStarts,round.length,stageIndex);
  const stageQuestion=index-stageStarts[stageIndex]+1;
  const isGraduationStage=graduationStageIndexes.has(stageIndex);
  const passRequired=passRequiredForStage(stageLength);
  const nextStage=getStageAt(stageIndex+1);
  const progress=useMemo(()=>(stageQuestion/stageLength)*100,[stageQuestion,stageLength]);
  function choose(option:number){if(selected!==null)return;setSelected(option);if(option===current.answer){setScore(s=>s+POINTS_PER_CORRECT);setStageCorrect(n=>n+1)}else{setLives(l=>l-1);if(lives===1)setEndedEarly(true)}}
  function next(){
    if(endedEarly)return setScreen("result");
    if(stageQuestion===stageLength){
      if(stageCorrect<passRequired){setEndedEarly(true);return setScreen("result")}
      if(index===round.length-1&&!canDrawNextStage(roundPlan,stageIndex+1))return setScreen("result");
      return setScreen("reward")
    }
    setIndex(i=>i+1);setSelected(null)
  }
  function continueAfterReward(){
    const nextStageIndex=stageIndex+1;
    if(nextStageIndex>=roundPlan.stageStarts.length){
      const extended=appendNextStage(roundPlan,nextStageIndex);
      if(!extended){setScreen("result");return}
      setRoundPlan(extended);
    }
    setStageCorrect(0);setIndex(i=>i+1);setSelected(null);setScreen("play")
  }
  function resetGameState(nextPlan: RoundPlan, avoid: string[]) {
    previousRound.current=avoid;
    setRoundPlan(nextPlan);
    setIndex(0);
    setScore(0);
    setStageCorrect(0);
    setLives(STARTING_LIVES);
    setEndedEarly(false);
    setSelected(null);
    setPlayerName("");
    setSubmitState("idle");
    setSubmitMessage(null);
  }
  const beginFromFirstGrade=useCallback(()=>{
    try{
      resetGameState(createRound(previousRound.current), []);
      setScreen("enroll");
    }catch(error){
      console.error("無法開始遊戲", error);
      setScreen("play");
    }
  },[]);
  function restart(){
    const avoid=roundPlan.questions.map(item=>item.q);
    resetGameState(createRound(avoid), avoid);
    setScreen("play");
  }
  return <main className="game-shell min-h-dvh text-white">
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
      <div className="flex items-center gap-3"><span className="brand-mark"><Globe2 size={24}/></span><div><p className="text-xs font-bold tracking-[.18em] text-amber-300">國民教育委員會</p><p className="text-lg font-black tracking-wide">世界旅遊委員會</p></div></div>
      <button className="rank-button" onClick={()=>setScreen("start")}><Crown size={17}/> 永久排行榜</button>
    </header>
    {screen==="start"&&<section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-8 pt-4 lg:grid-cols-[1.4fr_.6fr] sm:px-8">
      <div className="hero-card arcade-hero">
        <GameAnimation kind="opening" className="arcade-opening-video"/>
        <img className="original-title-art" src="/quiz-channel-question-title.png" alt="Quiz Channel Question 原始街機開場畫面"/>
        <div className="arcade-screen-copy">
          <p className="arcade-org-title">國民教育委員會</p>
          <h1 className="arcade-game-title">世界旅遊委員會</h1>
          <p className="arcade-game-subtitle">從小一開始，挑戰世界地理與旅行知識</p>
          <button type="button" className="primary-button" onClick={beginFromFirstGrade}>從小一開始 <span>→</span></button>
        </div>
      </div>
      <aside className="leader-card">
        <div className="flex items-center justify-between"><div><p className="mini-label">HALL OF FAME</p><h2>永久名人榜</h2></div><Crown className="text-amber-300" size={30}/></div>
        <div className="mt-6 space-y-2">
          {leaderboardLoading&&<p className="leaderboard-empty">名人榜載入中…</p>}
          {!leaderboardLoading&&leaderboard.length===0&&<p className="leaderboard-empty">{leaderboardError??"尚無紀錄，成為第一位留名的旅人吧！"}</p>}
          {!leaderboardLoading&&leaderboard.map((row,i)=><div className="leader-row" key={row.id}><span className={i<3?"podium":""}>{i+1}</span><b>{row.playerName}</b><strong>{row.score.toLocaleString()}</strong></div>)}
        </div>
        <p className="mt-5 text-center text-xs text-slate-400">題庫 {questionBankStats.total} 題 · 分數永不重置 · 前 10 名才可留名</p>
      </aside>
    </section>}
    {screen==="enroll"&&<EnrollmentAnimation onComplete={finishEnrollment}/>}
    {screen==="play"&&<section className="mx-auto w-full max-w-4xl px-4 pb-10 pt-3 sm:px-8"><div className="education-path">{educationStages.map((item,i)=><span className={i<stageIndex?"done":i===stageIndex?"current":""} key={item.name}>{item.name}</span>)}{stageIndex>=educationStages.length&&<span className="current">{stage.name}</span>}</div><div className="mb-5 flex items-center justify-between gap-3"><div><p className="mini-label">{stage.group}・{stage.name}　第 {stageQuestion} 題 / {stageLength}{current.level==="送分題"?"・送分題":""}</p><h2 className="text-xl font-black sm:text-2xl">{stage.name}旅行測驗</h2></div><div className="flex gap-2"><span className="life-pill" aria-label={`剩餘 ${lives} 次機會`}>{Array.from({length:STARTING_LIVES},(_,n)=><span className={n<lives?"":"lost"} key={n}>♥</span>)}</span><span className="score-pill">{score.toLocaleString()} 分</span><span className="time-pill"><Timer size={17}/> 15</span></div></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><div className="question-card">{current.visual&&<QuestionVisual key={current.q} visual={current.visual}/>}<div className="flex items-center justify-between"><span className={`region-chip ${current.category==="旅行知識"?"travel-knowledge":""}`}>{current.category==="旅行知識"?`旅行知識・${current.region}`:current.region}</span><span className="text-sm text-slate-400">{current.kind==="tf"?"請選擇是或否":"選出正確答案"}</span></div><h1>{current.q}</h1><div className={`answer-grid ${current.kind==="tf"?"true-false-grid":""}`}>{current.options.map((option,i)=>{let cls="answer-button";if(selected!==null){if(i===current.answer)cls+=" correct";else if(i===selected)cls+=" wrong"}return <button className={cls} key={option} onClick={()=>choose(i)}><span>{current.kind==="tf"?(i===0?"✓":"×"):String.fromCharCode(65+i)}</span>{option}{selected!==null&&i===current.answer?<Check className="ml-auto"/>:selected===i?<X className="ml-auto"/>:null}</button>})}</div>{selected!==null&&<div className="fact-box"><b>{selected===current.answer?"答對了！":endedEarly?"本級三次機會已用完":`答錯了，剩下 ${lives} 次機會`}</b><p>{current.fact}</p><button onClick={next}>{endedEarly||index===round.length-1?"查看成績":stageQuestion===stageLength?"領取升級獎勵":"前往下一題"} →</button></div>}</div></section>}
    {screen==="reward"&&<section className="reward-section mx-auto w-full max-w-2xl px-4 py-10 text-center sm:px-8"><div className={`reward-card ${isGraduationStage?"graduation-card":""}`}>{isGraduationStage&&<div className="graduation-confetti" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i}/>)}</div>}<div className="reward-animation-wrap"><CheerAnimation variant={isGraduationStage?"graduation":"stageClear"}/></div><div className="reward-sparkles"><Sparkles/><span>{isGraduationStage?<GraduationCap/>:<Gift/>}</span><Sparkles/></div><p className="mini-label">{isGraduationStage?"GRADUATION・畢業達成":"STAGE CLEAR・學業完成"}</p><h1>{isGraduationStage?`${stage.group}畢業！`:"恭喜！"}</h1><p className="completion-copy">恭喜完成民國教育委員會<br/><b>{getStageCompletionLabel(stage,isGraduationStage)}學業</b></p><p>本級答對 {stageCorrect} 題，接下來將升上 <b>{nextStage.name}</b></p><div className="reward-bonus"><span>升級準備</span><strong>剩餘 {lives} 次機會延續</strong><small>每級 10 題 · 答對一題得 {POINTS_PER_CORRECT} 分</small></div><button className="primary-button mx-auto" onClick={continueAfterReward}>{isGraduationStage?"畢業完成，進入":"休息好了，升上"} {nextStage.name} <span>→</span></button><p className="reward-tip">沒有倒數計時，準備好再繼續。</p></div></section>}
    {screen==="result"&&<section className="result-section mx-auto w-full max-w-5xl px-4 py-10 text-center sm:px-8">
      {!endedEarly&&<div className="celebration-animation-wrap"><CheerAnimation variant="graduation"/></div>}
      <div className={`result-card ${!endedEarly?"graduation-card final-graduation":""}`}>
        {!endedEarly&&<div className="graduation-confetti" aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i}/>)}</div>}
        {endedEarly?<Crown className="mx-auto text-amber-300" size={54}/>:<div className="reward-sparkles"><Sparkles/><span><GraduationCap/></span><Sparkles/></div>}
        <p className="mini-label mt-4">{endedEarly?"挑戰結束":"QUEST BANK CLEAR・題庫全破"}</p>
        {!endedEarly&&<h2 className="final-graduation-title">題庫挑戰完成！</h2>}
        <span className="degree-badge">{!endedEarly?"世界旅遊博士":`${stage.name}程度`}</span>
        <h1>{score.toLocaleString()} 分</h1>
        <p>{endedEarly?`${stage.name}尚未通過，再挑戰一次會換一組題目。`:`恭喜在 ${stage.name} 完成題庫中所有題目，研究所沒有畢業典禮，但你的地理功力已達博士級！`}</p>
        {score>0&&<div className="score-submit-card">
          <p className="mini-label">SUBMIT SCORE</p>
          <label className="score-submit-label" htmlFor="player-name">輸入暱稱，挑戰永久名人榜</label>
          <div className="score-submit-row">
            <input id="player-name" className="score-submit-input" value={playerName} maxLength={20} placeholder="你的暱稱" onChange={event=>setPlayerName(event.target.value)} disabled={submitState==="saving"||submitState==="saved"}/>
            <button className="primary-button score-submit-button" onClick={submitScore} disabled={submitState==="saving"||submitState==="saved"}>{submitState==="saving"?"送出中…":submitState==="saved"?"已留名":"送出成績"}</button>
          </div>
          {submitMessage&&<p className={`score-submit-message ${submitState==="saved"?"success":submitState==="error"?"error":""}`}>{submitMessage}</p>}
        </div>}
        <button className="primary-button mx-auto" onClick={restart}>從小一重新挑戰</button>
      </div>
      <div className="travel-invitation"><p className="mini-label">把答對的世界，變成親眼看見的風景</p><h2>下一站，跟著航向世界出發</h2><p>從免費旅遊講座開始認識目的地，或直接查看近期精選行程。</p><div className="invitation-grid"><a className="invitation-card" href="https://www.tcawg.com/travel/lectures.html" target="_blank" rel="noreferrer"><span className="invitation-icon"><CalendarDays/></span><span><small>TRAVEL LECTURES</small><b>最新旅遊講座</b><em>聽專業領隊分享路線與旅行故事</em></span><ArrowUpRight className="card-arrow"/></a><a className="invitation-card" href="https://www.tcawg.com/travel/lets-go-trips.html" target="_blank" rel="noreferrer"><span className="invitation-icon"><MapPinned/></span><span><small>FEATURED TOURS</small><b>探索精選行程</b><em>查看世界各地深度旅遊與出發日期</em></span><ArrowUpRight className="card-arrow"/></a></div><p className="company-signature">鄉野旅行社・航向世界旅遊</p></div>
    </section>}
  </main>
}
