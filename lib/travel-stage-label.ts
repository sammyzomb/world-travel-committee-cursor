const oldNames=['小一','小二','小三','小四','小五','小六','國一','國二','國三','高一','高二','高三','大一','大二','大三','大四','研一','研二'];
const fullNames=['國小一年級','國小二年級','國小三年級','國小四年級','國小五年級','國小六年級','國中一年級','國中二年級','國中三年級','高中一年級','高中二年級','高中三年級','大學一年級','大學二年級','大學三年級','大學四年級','研究所一年級','研究所二年級'];
export function travelStageLabel(value:string) {
  let index=oldNames.indexOf(value);
  if(index<0) index=fullNames.indexOf(value);
  if(index<0) {
    const challenge=value.match(/^第\s*(\d+)\s*關・/);
    if(challenge) index=Number(challenge[1])-1;
  }
  if(index>=0 && index<fullNames.length) return fullNames[index];
  if(index<0) return value;
  return value;
}
