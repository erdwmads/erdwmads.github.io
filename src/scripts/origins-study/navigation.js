export function studyLocation(hash) {
  const params=new URLSearchParams(hash.replace(/^#/,'')),stage=Number(params.get('stage')),progress=Number(params.get('progress'));
  const valid=params.has('stage')&&Number.isInteger(stage)&&stage>=0&&stage<=3&&params.has('progress')&&Number.isFinite(progress)&&progress>=0&&progress<=1;
  return valid?{stage,progress,paused:true}:{stage:0,progress:.08,paused:false};
}
