// Render committed ka at 20px dots, crop the SAME dot-1 neighbourhood at the
// SAME visual scale as the phone 6x, for a head-to-head comparison.
import fs from 'node:fs';
import { CURRICULUM } from '../../src/curriculum.js';
const INK = JSON.parse(fs.readFileSync(new URL('../../tools/glyph/ink/ka.json', import.meta.url), 'utf8'));
const L = CURRICULUM.find(l => l.id === 'ka');
const W = 380, H = 320;
const BG=[241,245,249];            // slate-100 card bg (what the phone card uses)
const FILLINK=[116,129,149];       // slate-ish glyph ink (matches the gray band seen on phone)
const DOTFILL=[198,201,248];       // pale periwinkle (indigo@38% over bg)
const RING=[55,48,163];            // primary-shade dashed ring
const NUM=[18,26,44];              // dark numeral

function buf_new(){
  const b=Buffer.alloc(W*H*3);
  for(let i=0;i<W*H;i++){b[i*3]=BG[0];b[i*3+1]=BG[1];b[i*3+2]=BG[2];}
  const {width:Wk,height:Hk,rows}=INK; if(Wk!==W) throw new Error('ink mismatch');
  const put=(x,y,[r,g,b],a=255)=>{ if(x<0||y<0||x>=W||y>=H)return; const i=(y*W+x)*3,f=a/255;
    b[i]=Math.round(b[i]+(r-b[i])*f); b[i+1]=Math.round(b[i+1]+(g-b[i+1])*f); b[i+2]=Math.round(b[i+2]+(b-b[i+2])*f);};
  for(let y=0;y<Hk;y++){const r=rows[y]; if(!r)continue; for(let i=0;i+1<r.length;i+=2) for(let x=r[i];x<=r[i+1];x++) if(x>=0&&x<W) put(x,y,FILLINK,150);}
  return {b,put};
}
const toPath=(x,y)=>[Math.round(x/100*W),Math.round(y/100*H)];
function disc(put,cx,cy,rad,col,a){const R=Math.ceil(rad);for(let y=-R;y<=R;y++)for(let x=-R;x<=R;x++){const d=Math.hypot(x,y);if(d>rad)continue;const e=Math.max(0,Math.min(1,rad-d));put(cx+x,cy+y,col,Math.round(a*e));}}
function scene(){
  const {b,put}=buf_new();
  L.waypoints.forEach((wp,idx)=>{
    const [cx,cy]=toPath(wp.x,wp.y);
    disc(put,cx,cy,10,DOTFILL, idx===0?180:120);       // 20px dot
    disc(put,cx,cy,10,RING, idx===0?255:190);          // ring
    disc(put,cx,cy,8.5,DOTFILL, idx===0?150:100);      // re-pale interior (rim look)
    disc(put,cx,cy,1.6,NUM,255);
  });
  return b;
}
const b=scene();
const toPPM=x=>Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`,'utf8'),x]);
fs.writeFileSync('commit_ka_20.ppm', toPPM(b));
console.log('wrote commit_ka_20.ppm');
