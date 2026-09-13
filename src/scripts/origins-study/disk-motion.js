// Accelerated display time: radii are model units, not measured Solar System radii.
export const diskTurns=22;
export const diskAngle=(radius,progress)=>progress*diskTurns/Math.pow(radius+.45,1.5);
export const diskRotationGLSL=`float orbitalAngle(float radius,float progress){return progress*${diskTurns.toFixed(1)}/pow(radius+.45,1.5);}`;
