import * as T from 'three';
const x=new T.Vector3(1,0,0),y=new T.Vector3(0,1,0),z=new T.Vector3(0,0,1);
const rotation=(axis,angle)=>new T.Quaternion().setFromAxisAngle(axis,angle);
// Native Earth texture axes: +X Greenwich, +Y north, -Z 90 degrees east.
const textureToTerrestrial=rotation(x,Math.PI/2);

// Globe orientation only: IAU 1982 GMST and IAU 1976 mean precession.
// https://gssc.esa.int/navipedia/index.php/CEP_to_ITRF (equations 4-6)
// https://gssc.esa.int/navipedia/index.php/ICRF_to_CEP (equations 2-3)
// UTC approximates UT1 and the precession timescale. Nutation, polar motion and
// ICRF/J2000 frame bias are omitted: suitable for this globe, not ground navigation.
// The same display rotation must follow this transform and the inertial track.
export function earthInertialOrientation(time,displayRotation=new T.Quaternion()){
 const days=Date.parse(time)/86400000+2440587.5-2451545,t=days/36525,t2=t*t,t3=t2*t;
 const arcsec=Math.PI/648000;
 const zeta=(2306.2181*t+.30188*t2+.017998*t3)*arcsec;
 const theta=(2004.3109*t-.42665*t2-.041833*t3)*arcsec;
 const precessionZ=(2306.2181*t+1.09468*t2+.018203*t3)*arcsec;
 const gmst=(280.460618375+360.98564736629*days+.000387933333333*t2-t3/38710000)*Math.PI/180;
 // Inverse mean precession: equator/equinox of date -> J2000 equatorial axes.
 return displayRotation.clone().multiply(rotation(z,-zeta)).multiply(rotation(y,theta))
  .multiply(rotation(z,gmst-precessionZ)).multiply(textureToTerrestrial).normalize();
}
