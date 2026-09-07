import { LinearInterpolant } from 'three';

export function createEphemeris(data) {
  const days = new Float64Array(data.bodies[0].points.map((_,i)=>i*data.stepDays));
  const curves = new Map(data.bodies.map(body=>[body.id,new LinearInterpolant(days,new Float64Array(body.points.flat()),3)]));
  return {
    position(id,day) { return Array.from(curves.get(id).evaluate(Math.max(0,Math.min(days.at(-1),day)))); }
  };
}
