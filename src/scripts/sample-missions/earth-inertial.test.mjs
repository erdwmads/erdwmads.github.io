import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {earthInertialOrientation as orientation} from './earth-inertial.js';
import {sampleTrack} from './proximity.js';
const degrees=180/Math.PI;
const point=(lat,lon)=>new T.Vector3(Math.cos(lat/degrees)*Math.cos(lon/degrees),Math.sin(lat/degrees),-Math.cos(lat/degrees)*Math.sin(lon/degrees));

test('Greenwich and the north pole map from texture axes into J2000 equatorial axes',()=>{
 const q=orientation('2000-01-01T12:00:00Z'),greenwich=point(0,0).applyQuaternion(q),north=point(90,0).applyQuaternion(q);
 // J2000 GMST = 280.460618375 degrees (IAU 1982, ESA Navipedia).
 assert(greenwich.distanceTo(new T.Vector3(Math.cos(280.460618375/degrees),Math.sin(280.460618375/degrees),0))<1e-8);
 assert(north.distanceTo(new T.Vector3(0,0,1))<1e-12);
});

test('precessed north pole agrees with the independent ERFA pmat76 reference',()=>{
 // ERFA t_pmat76, MJD 50123.9999: the inverse precession north pole is matrix row 3.
 // https://github.com/liberfa/erfa/blob/master/src/t_erfa_c.c
 const date=new Date((2400000.5+50123.9999-2440587.5)*86400000).toISOString();
 const north=point(90,0).applyQuaternion(orientation(date));
 assert(north.distanceTo(new T.Vector3(-.3779153474950335077e-3,-.1643306746147366896e-6,.9999999285899790119))<1e-11);
});

test('Earth rotates eastward with elapsed UTC while its pole remains nearly fixed',()=>{
 const a=orientation('2017-09-22T00:00:00Z'),b=orientation('2017-09-22T06:00:00Z');
 const x=point(0,0).applyQuaternion(a),y=point(0,0).applyQuaternion(b),north=point(90,0).applyQuaternion(a);
 const angle=Math.atan2(north.dot(x.clone().cross(y)),x.dot(y))*degrees;
 assert(Math.abs(angle-90.2464118)<.0001);
 assert(north.distanceTo(point(90,0).applyQuaternion(b))<1e-6);
});

test('Earth surface and spacecraft retain one frame after the display rotation',()=>{
 const time='2015-12-03T10:08:00Z',view=new T.Quaternion().setFromAxisAngle(new T.Vector3(2,3,-1).normalize(),1.7),site=point(19,190);
 const inertial=site.clone().applyQuaternion(orientation(time));
 const displayed=site.clone().applyQuaternion(orientation(time,view));
 assert(displayed.distanceTo(inertial.applyQuaternion(view))<1e-12);
 assert(Math.abs(orientation(time,view).length()-1)<1e-12);
});

const tracks=JSON.parse(await readFile(new URL('../../../public/assets/data/missions/ephemeris.json',import.meta.url),'utf8'));
for(const [id,lat,lon] of [['hayabusa2',18.691,189.847],['osiris-rex',-74.80121,271.89346]])test(id+' interpolated closest approach lies over the published geographic region',()=>{
 const track=tracks[id].earthFlyby;
 // Locate minimum interpolated range rather than treating a 5-minute sample as closest approach.
 let lo=.45,hi=.55;
 for(let i=0;i<60;i++){
  const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;
  if(Math.hypot(...sampleTrack(track,a).position)<Math.hypot(...sampleTrack(track,b).position))hi=b;else lo=a;
 }
 const sample=sampleTrack(track,(lo+hi)/2);
 const subpoint=new T.Vector3(...sample.position).normalize().applyQuaternion(orientation(sample.time).invert());
 // Horizons object-record coordinates are geodetic/nominal; the rendered Earth is a sphere.
 // Geocentric latitude differs by about 0.1 degree here; no empirical alignment is applied.
 assert(subpoint.angleTo(point(lat,lon))*degrees<.2);
});
