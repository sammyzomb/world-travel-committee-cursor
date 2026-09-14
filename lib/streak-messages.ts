export function streakCheerMessage(streak: number) {
  if (streak >= 10) return "超神連勝！地理達人模式";
  if (streak >= 7) return "七連勝！狀態火熱";
  if (streak >= 5) return "五連勝！越玩越順";
  if (streak >= 3) return "三連勝！保持節奏";
  return "";
}
