/** 本地時區的 YYYY-MM-DD，供每日挑戰與連勝計算。 */
export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function seededIndex(seedText: string, length: number) {
  let seed = 0;
  for (const char of seedText) {
    seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  }
  return length > 0 ? seed % length : 0;
}
