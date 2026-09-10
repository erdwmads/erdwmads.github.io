import * as T from 'three';
import {sciLayout} from './motion.js';

// JAXA's SCI reference describes the launched copper projectile as a hollow
// spherical shell, ~13 cm across, deformed from the original 30 cm disc.
// https://www.hayabusa2.jaxa.jp/en/topics/20200320_science/paper/Arakawa_Science2020_en.pdf
// The trailing opening and wall profile are illustrative, not recovered flight CAD.
export function createSciProjectile(){
 const radius=sciLayout.projectileRadius;
 const geometry=new T.SphereGeometry(radius,32,24,0,Math.PI*2,Math.PI*.2,Math.PI*.8);
 const material=new T.MeshStandardMaterial({color:0xb97242,metalness:.8,roughness:.38,side:T.DoubleSide});
 const projectile=new T.Mesh(geometry,material);projectile.name='sci-formed-copper-shell';
 projectile.castShadow=true;projectile.userData.contactOffset=radius;
 return projectile;
}
