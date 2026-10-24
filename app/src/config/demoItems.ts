/** Satu sumber kebenaran untuk 15 contoh demo draw() — dipakai Landing, Studio, dan /skema. */
export type DemoItem = { id: string; title: string; tag: string; code: string };

export function demoById(id: string): DemoItem | undefined {
  return DEMO_ITEMS.find((d) => d.id === id);
}

export const DEMO_ITEMS: DemoItem[] = [
  {
    id: "kinetic",
    title: "Kinetic Typography",
    tag: "Judul Promo",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#0a0d1a"; ctx.fillRect(0,0,width,height);
  const p = fx.loop(time, 2.2);
  const g = fx.gradient(ctx, 0, height*0.5, width, height*0.5, ["#f97316","#ec4899","#4cd7f6"]);
  ctx.fillStyle=g; ctx.globalAlpha=0.08; ctx.fillRect(0,0,width,height); ctx.globalAlpha=1;
  const sx = Math.sin(p*Math.PI*2)*width*0.06;
  ctx.save(); ctx.translate(width*0.5+sx, height*0.5);
  ctx.fillStyle="#ffb690"; ctx.font="900 "+Math.round(width*0.072)+"px Inter,sans-serif";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  fx.glow(ctx,"#f97316", width*0.025); ctx.fillText("MOTION",0,-height*0.07); fx.glowOff(ctx);
  ctx.fillStyle="#e1e1ef"; ctx.fillText("EASY",0,height*0.07);
  ctx.restore();
  const lw = width*0.62*(0.7+0.3*fx.pulse(time,1.5));
  ctx.fillStyle="#4cd7f6"; ctx.fillRect((width-lw)/2, height*0.66, lw, height*0.008);
}`,
  },
  {
    id: "lowerthird",
    title: "Lower Third Presenter",
    tag: "YouTube / Reels",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#070a13"; ctx.fillRect(0,0,width,height);
  const rg = fx.radial(ctx,width*0.5,height*0.5,width*0.7,["rgba(255,255,255,0.06)","transparent"]);
  ctx.fillStyle=rg; ctx.fillRect(0,0,width,height);
  const t = Math.min(1, fx.loop(time,2.4)*2.2);
  const e = 1-Math.pow(1-t,3);
  const bw = width*0.62, bh=height*0.18, bx=(width-bw)/2, by=height*0.72;
  ctx.save(); ctx.translate(bx+bw/2*(1-e), by);
  ctx.fillStyle="rgba(255,182,144,0.95)"; 
  const r=bh*0.22; ctx.beginPath();
  const w2=bw*e; ctx.roundRect(-w2/2,0,w2,bh,r); ctx.fill();
  ctx.fillStyle="#070a13"; ctx.beginPath(); ctx.arc(-w2/2+bh*0.32,bh/2,bh*0.16,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#070a13"; ctx.font="700 "+Math.round(width*0.028)+"px Inter,sans-serif";
  ctx.textAlign="left"; ctx.textBaseline="middle";
  if(e>0.5) ctx.fillText("NAMA PRESENTER", -w2/2+bh*0.58, bh*0.38);
  ctx.font="500 "+Math.round(width*0.018)+"px Inter,sans-serif";
  if(e>0.6) ctx.fillText("Jabatan / Channel", -w2/2+bh*0.58, bh*0.68);
  ctx.restore();
}`,
  },
  {
    id: "logoreveal",
    title: "Logo Reveal",
    tag: "Intro Channel",
    code: `function draw(ctx,time,width,height,fx){
  const bg="#070a13"; ctx.fillStyle=bg; ctx.fillRect(0,0,width,height);
  const p = fx.loop(time, 2.0);
  const e = p<0.5 ? 1-Math.pow(1-p*2,3) : 1;
  const cx=width*0.5, cy=height*0.5;
  const r = Math.min(width,height)*0.14 * (0.7+0.3*e);
  fx.glow(ctx,"#4cd7f6", 18*e); ctx.strokeStyle="rgba(76,215,246,"+(0.5+0.5*e)+")";
  ctx.lineWidth=width*0.012; ctx.beginPath(); ctx.arc(cx,cy,r, -Math.PI/2, -Math.PI/2+Math.PI*2*e); ctx.stroke(); fx.glowOff(ctx);
  ctx.fillStyle="#f97316"; ctx.globalAlpha=0.9*e; ctx.beginPath(); ctx.arc(cx,cy,r*0.62,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  ctx.fillStyle="#070a13"; ctx.font="900 "+Math.round(width*0.038)+"px Inter,sans-serif";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  if(e>0.55) ctx.fillText("ME",cx,cy);
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+time*0.8; const rr=r*1.35; const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
    ctx.fillStyle="rgba(255,182,144,"+(0.5+0.5*Math.sin(time*3+i))+")"; ctx.beginPath(); ctx.arc(x,y,width*0.008,0,Math.PI*2); ctx.fill(); }
}`,
  },
  {
    id: "countdown",
    title: "Countdown 3-2-1",
    tag: "Hook Pembuka",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#0c0e17"; ctx.fillRect(0,0,width,height);
  const seq = Math.floor(fx.loop(time,3)*3);
  const frac = fx.loop(time,3)*3 - seq;
  const scale = 1 - Math.pow(frac,2)*0.35;
  const nums=["3","2","1"]; const cols=["#f97316","#4cd7f6","#4edea3"];
  ctx.fillStyle="rgba(255,255,255,0.04)"; ctx.font="900 "+Math.round(width*0.42)+"px Inter,sans-serif";
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(nums[(seq+1)%3], width*0.5, height*0.5);
  ctx.save(); ctx.translate(width*0.5, height*0.5); ctx.scale(scale,scale);
  fx.glow(ctx, cols[seq], 22); ctx.fillStyle=cols[seq];
  ctx.font="900 "+Math.round(width*0.30)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(nums[seq],0,0); fx.glowOff(ctx); ctx.restore();
  const prog = fx.loop(time,3); ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=height*0.008;
  ctx.beginPath(); ctx.moveTo(width*0.2,height*0.82); ctx.lineTo(width*0.8,height*0.82); ctx.stroke();
  ctx.strokeStyle=cols[seq]; ctx.beginPath(); ctx.moveTo(width*0.2,height*0.82); ctx.lineTo(width*0.2+width*0.6*prog,height*0.82); ctx.stroke();
}`,
  },
  {
    id: "quote",
    title: "Quote Card Animasi",
    tag: "Konten Edukasi",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#11131c"; ctx.fillRect(0,0,width,height);
  const p = Math.min(1, fx.loop(time,1.6)*2.2); const e=1-Math.pow(1-p,3);
  const bw=width*0.72, bh=height*0.5, bx=(width-bw)/2, by=(height-bh)/2;
  ctx.fillStyle="#191b25"; const r=bw*0.04; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,r); ctx.fill();
  ctx.strokeStyle="rgba(255,182,144,0.18)"; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle="#f97316"; ctx.fillRect(bx, by, bw*0.012, bh);
  ctx.fillStyle="rgba(76,215,246,0.18)"; ctx.font="900 "+Math.round(width*0.12)+"px serif"; ctx.textAlign="left"; ctx.fillText('"', bx+width*0.04, by+height*0.12);
  ctx.fillStyle="#e1e1ef"; ctx.font="600 "+Math.round(width*0.028)+"px Inter,sans-serif"; ctx.textAlign="left";
  const lines=["Kerja cerdas","bukan kerja keras."];
  lines.forEach((ln,i)=>{ const y=by+bh*0.38+i*height*0.09; const w = ctx.measureText(ln).width*e; ctx.save(); ctx.beginPath(); ctx.rect(bx+width*0.04, y-height*0.04, w+width*0.02, height*0.07); ctx.clip(); ctx.fillText(ln, bx+width*0.04, y); ctx.restore(); });
  ctx.fillStyle="#71717a"; ctx.font="500 "+Math.round(width*0.018)+"px Inter,sans-serif"; ctx.fillText("— Motion Easy", bx+width*0.04, by+bh*0.82);
}`,
  },
  {
    id: "infografis",
    title: "Infografis Progress",
    tag: "Data & Statistik",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#070a13"; ctx.fillRect(0,0,width,height);
  const p = Math.min(1, fx.loop(time,1.8)*1.8); const e=1-Math.pow(1-p,3);
  const rows=[
    {label:"Penjualan", val:0.82, col:"#4edea3"},
    {label:"Views", val:0.64, col:"#4cd7f6"},
    {label:"Engagement", val:0.91, col:"#f97316"},
  ];
  ctx.fillStyle="#e1e1ef"; ctx.font="800 "+Math.round(width*0.036)+"px Inter,sans-serif"; ctx.textAlign="left"; ctx.fillText("STATISTIK", width*0.08, height*0.18);
  rows.forEach((row,i)=>{
    const y = height*0.30 + i*height*0.20;
    ctx.fillStyle="#71717a"; ctx.font="600 "+Math.round(width*0.020)+"px Inter,sans-serif"; ctx.fillText(row.label, width*0.08, y);
    const tw=width*0.84, th=height*0.045, tx=width*0.08, ty=y+height*0.04;
    ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.beginPath(); ctx.roundRect(tx,ty,tw,th,th/2); ctx.fill();
    ctx.fillStyle=row.col; ctx.beginPath(); ctx.roundRect(tx,ty,tw*row.val*e,th,th/2); ctx.fill();
    ctx.fillStyle="#e1e1ef"; ctx.font="700 "+Math.round(width*0.020)+"px Inter,sans-serif"; ctx.textAlign="right";
    ctx.fillText(Math.round(row.val*e*100)+"%", width*0.92, y);
  });
}`,
  },
  {
    id: "confetti",
    title: "Celebration Burst",
    tag: "Ucapan / Outro",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#0a0d1a"; ctx.fillRect(0,0,width,height);
  const t = fx.loop(time,2.4);
  const cx=width*0.5, cy=height*0.45;
  const s = t<0.15 ? t/0.15 : 1; fx.glow(ctx,"#ffb690", 20*s); ctx.fillStyle="#f97316";
  ctx.beginPath(); ctx.arc(cx,cy, width*0.045*s,0,Math.PI*2); ctx.fill(); fx.glowOff(ctx);
  for(let i=0;i<18;i++){
    const ang=i/18*Math.PI*2;
    const spd=width*0.32*t + fx.rand(i,7)*width*0.05;
    const x=cx+Math.cos(ang)*spd, y=cy+Math.sin(ang)*spd + t*t*height*0.18;
    const alpha = 1 - t*0.9;
    const cols=["#f97316","#4cd7f6","#4edea3","#ffb690"];
    ctx.globalAlpha=Math.max(0,alpha); ctx.fillStyle=cols[i%4];
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang+time*2); ctx.fillRect(-width*0.012,-width*0.004,width*0.024,width*0.008); ctx.restore();
  } ctx.globalAlpha=1;
  if(t>0.35){ ctx.fillStyle="#e1e1ef"; ctx.font="800 "+Math.round(width*0.042)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("TERIMA KASIH!",cx,height*0.78); }
}`,
  },
  {
    id: "reveal",
    title: "Wipe Reveal Teks",
    tag: "Judul Cinematic",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#0c0e17"; ctx.fillRect(0,0,width,height);
  const p = fx.loop(time,2.2);
  const wipe = (p<0.5 ? 1-Math.pow(1-p*2,3) : 1-Math.pow((p-0.5)*2,2));
  const dir = p<0.5 ? 1 : -1;
  ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.font="900 "+Math.round(width*0.072)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("CINEMATIC", width*0.5, height*0.5);
  ctx.save();
  ctx.beginPath();
  const wx = dir>0 ? width*wipe*1.2 - width*0.1 : width*(1-wipe)*1.2 - width*0.1;
  ctx.rect(0,0, wx, height); ctx.clip();
  const grad = fx.gradient(ctx, 0,0,width,0, ["#f97316","#ec4899","#4cd7f6"]);
  ctx.fillStyle=grad; ctx.fillRect(0,0,width,height);
  ctx.fillStyle="white"; ctx.font="900 "+Math.round(width*0.072)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("CINEMATIC", width*0.5, height*0.5);
  ctx.restore();
  ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.fillRect(wx-2,0,2,height);
}`,
  },
  {
    id: "subscribe",
    title: "Subscribe Pulse",
    tag: "CTA Channel",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#070a13"; ctx.fillRect(0,0,width,height);
  const pulse = 0.5+0.5*Math.sin(time*2.2);
  const cx=width*0.5, cy=height*0.5;
  for(let i=0;i<3;i++){ const r=width*0.18 + (fx.loop(time+i*0.33,1.2)*width*0.22); ctx.strokeStyle="rgba(249,115,22,"+(0.18 - i*0.05)+")"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); }
  const bw=width*0.42, bh=height*0.16, bx=cx-bw/2, by=cy-bh/2;
  ctx.fillStyle="#ff0000"; ctx.shadowColor="rgba(255,0,0,0.5)"; ctx.shadowBlur=14*pulse;
  ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,bh/2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle="white"; ctx.beginPath(); ctx.moveTo(bx+bw*0.18, by+bh*0.28); ctx.lineTo(bx+bw*0.18, by+bh*0.72); ctx.lineTo(bx+bw*0.30, by+bh*0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle="white"; ctx.font="800 "+Math.round(width*0.032)+"px Inter,sans-serif"; ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText("SUBSCRIBE", bx+bw*0.36, by+bh*0.5);
  ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font="500 "+Math.round(width*0.020)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Jangan lupa loncengnya!", cx, cy+height*0.22);
}`,
  },
  {
    id: "promo",
    title: "Promo Harga Shine",
    tag: "Jualan / Diskon",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#11131c"; ctx.fillRect(0,0,width,height);
  const cw=width*0.74, ch=height*0.52, cx=(width-cw)/2, cy=(height-ch)/2;
  ctx.fillStyle="#191b25"; ctx.beginPath(); ctx.roundRect(cx,cy,cw,ch, cw*0.05); ctx.fill();
  const bw=width*0.22, bh=height*0.08, bx=cx+cw/2-bw/2, by=cy-bh/2;
  ctx.fillStyle="#f97316"; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,bh/2); ctx.fill();
  ctx.fillStyle="white"; ctx.font="800 "+Math.round(width*0.020)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("DISKON 50%", bx+bw/2, by+bh/2);
  const p = 0.5+0.5*fx.pulse(time,1.8);
  ctx.fillStyle="#4edea3"; ctx.font="900 "+Math.round(width*0.10)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Rp 55rb", width*0.5, cy+ch*0.42);
  ctx.fillStyle="rgba(255,255,255,0.32)"; ctx.font="500 "+Math.round(width*0.022)+"px Inter,sans-serif";
  ctx.fillText("Rp 110rb", width*0.5, cy+ch*0.60);
  ctx.strokeStyle="rgba(255,255,255,0.32)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(width*0.5-width*0.12, cy+ch*0.595); ctx.lineTo(width*0.5+width*0.12, cy+ch*0.595); ctx.stroke();
  const sx = fx.loop(time,1.6)*cw*1.6 - cw*0.3 + cx;
  ctx.save(); ctx.beginPath(); ctx.roundRect(cx,cy,cw,ch, cw*0.05); ctx.clip();
  ctx.fillStyle="rgba(255,255,255,"+(0.10+0.08*p)+")"; ctx.beginPath(); ctx.moveTo(sx,cy); ctx.lineTo(sx+width*0.06,cy); ctx.lineTo(sx+width*0.03, cy+ch); ctx.lineTo(sx-width*0.03, cy+ch); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle="#71717a"; ctx.font="500 "+Math.round(width*0.016)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Sekali bayar · Lifetime", width*0.5, cy+ch*0.82);
}`,
  },
  {
    id: "breaking",
    title: "Breaking News Bar",
    tag: "Berita / Update",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#070a13"; ctx.fillRect(0,0,width,height);
  const t=fx.loop(time,1.6);
  ctx.save(); ctx.translate(width*0.5,height*0.5); ctx.rotate(-0.10);
  ctx.fillStyle="rgba(255,255,255,0.035)";
  for(let i=-5;i<5;i++){ ctx.fillRect(i*width*0.16 - t*width*0.16, -height, width*0.035, height*2); }
  ctx.restore();
  const e=Math.min(1,fx.loop(time,1.3)*2.4); const ee=1-Math.pow(1-e,3);
  const bh=height*0.22, by=height*0.5-bh/2;
  ctx.fillStyle="#dc2626"; ctx.fillRect(0,by,width*ee,bh);
  if(ee>0.45){ ctx.fillStyle="white"; ctx.font="900 "+Math.round(width*0.026)+"px Inter,sans-serif"; ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText("BREAKING NEWS", width*0.04, by+bh*0.38); }
  if(ee>0.6){ ctx.fillStyle="rgba(255,255,255,0.92)"; ctx.font="600 "+Math.round(width*0.018)+"px Inter,sans-serif"; ctx.fillText("Update terbaru  •  Live", width*0.04, by+bh*0.71); }
  const pulse=0.5+0.5*Math.sin(time*4.2);
  ctx.fillStyle="white"; ctx.globalAlpha=0.85+0.15*pulse; ctx.beginPath(); ctx.arc(width*0.91, by+bh*0.5, width*0.011,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
}`,
  },
  {
    id: "spectrum",
    title: "Audio Spectrum",
    tag: "Musik / Visualizer",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#0a0d1a"; ctx.fillRect(0,0,width,height);
  ctx.fillStyle="#e1e1ef"; ctx.font="700 "+Math.round(width*0.024)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("AUDIO WAVE", width*0.5, height*0.20);
  const bars=20; const bw=width*0.70/bars; const gap=width*0.012; const cy=height*0.56;
  for(let i=0;i<bars;i++){
    const ph=i/bars*Math.PI*2 + time*3.0;
    const h=height*0.07 + Math.abs(Math.sin(ph))*height*0.26 + fx.rand(i,9)*height*0.05;
    const x=width*0.15 + i*(bw+gap); const y=cy-h/2;
    ctx.fillStyle = i%3===0 ? "#4cd7f6" : i%3===1 ? "#f97316" : "#4edea3";
    ctx.beginPath(); ctx.roundRect(x,y,bw,h,bw*0.45); ctx.fill();
  }
}`,
  },
  {
    id: "fluid",
    title: "Fluid Gradient",
    tag: "Background Loop",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#0c0e17"; ctx.fillRect(0,0,width,height);
  const t=time*0.55;
  const cols=[["#f97316","#ec4899"],["#4cd7f6","#6366f1"],["#4edea3","#06b6d4"]];
  for(let k=0;k<3;k++){
    const cx=width*(0.32+k*0.18)+Math.cos(t+k*2.1)*width*0.07;
    const cy=height*0.5+Math.sin(t*0.85+k*1.7)*height*0.10;
    const r=width*0.13+Math.sin(t*1.2+k)*width*0.018;
    const g=fx.radial(ctx,cx,cy,r,cols[k]);
    ctx.globalAlpha=0.88; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.fillStyle="white"; ctx.font="800 "+Math.round(width*0.038)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  fx.glow(ctx,"rgba(255,255,255,0.30)",11); ctx.fillText("FLUID GRADIENT", width*0.5, height*0.5); fx.glowOff(ctx);
  ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font="500 "+Math.round(width*0.016)+"px Inter,sans-serif"; ctx.fillText("Abstract Background Loop", width*0.5, height*0.5+height*0.085);
}`,
  },
  {
    id: "product",
    title: "Product Card 3D",
    tag: "E-commerce",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#11131c"; ctx.fillRect(0,0,width,height);
  const p=fx.loop(time,2.4); const e=1-Math.pow(1-Math.min(1,p*2),3);
  const cw=width*0.46, ch=height*0.60, cx=(width-cw)/2, cy=(height-ch)/2;
  ctx.fillStyle="rgba(0,0,0,0.32)"; ctx.beginPath(); ctx.roundRect(cx+width*0.012, cy+height*0.025, cw, ch, cw*0.04); ctx.fill();
  ctx.save(); ctx.translate(cx+cw/2, cy+ch/2); ctx.scale(0.86+0.14*e, 0.86+0.14*e);
  ctx.fillStyle="#191b25"; ctx.beginPath(); ctx.roundRect(-cw/2,-ch/2,cw,ch,cw*0.04); ctx.fill();
  ctx.strokeStyle="rgba(76,215,246,0.16)"; ctx.lineWidth=1; ctx.stroke();
  const ih=ch*0.50; const g=fx.gradient(ctx,-cw/2,-ch/2,cw/2,-ch/2+ih,["#f97316","#ec4899"]);
  ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(-cw/2,-ch/2,cw,ih,cw*0.04); ctx.fill();
  ctx.fillStyle="white"; ctx.font="900 "+Math.round(width*0.055)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("◆",0,-ch*0.12);
  ctx.fillStyle="#e1e1ef"; ctx.font="800 "+Math.round(width*0.020)+"px Inter,sans-serif"; ctx.fillText("PRODUK BEST SELLER",0,ch*0.08);
  ctx.fillStyle="#4edea3"; ctx.font="900 "+Math.round(width*0.028)+"px Inter,sans-serif"; ctx.fillText("Rp 299rb",0,ch*0.21);
  ctx.restore();
  const sx=fx.loop(time,1.7)*cw*1.5 - cw*0.22 + cx;
  ctx.save(); ctx.beginPath(); ctx.roundRect(cx,cy,cw,ch,cw*0.04); ctx.clip();
  ctx.fillStyle="rgba(255,255,255,0.07)"; ctx.beginPath(); ctx.moveTo(sx,cy); ctx.lineTo(sx+width*0.045,cy); ctx.lineTo(sx+width*0.015,cy+ch); ctx.lineTo(sx-width*0.03,cy+ch); ctx.closePath(); ctx.fill();
  ctx.restore();
}`,
  },
  {
    id: "rating",
    title: "Star Rating Reveal",
    tag: "Testimoni / Rating",
    code: `function draw(ctx,time,width,height,fx){
  ctx.fillStyle="#070a13"; ctx.fillRect(0,0,width,height);
  ctx.fillStyle="#e1e1ef"; ctx.font="700 "+Math.round(width*0.022)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("RATING PELANGGAN", width*0.5, height*0.22);
  const t=fx.loop(time,2.2); const cx=width*0.5, cy=height*0.48;
  for(let i=0;i<5;i++){
    const d=i*0.11; const p=Math.min(1,Math.max(0,(t-d)/0.42)); const e=1-Math.pow(1-p,3);
    const x=cx+(i-2)*width*0.105, y=cy; const sc=0.3+0.7*e; const rot=(1-e)*0.55;
    ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); ctx.rotate(rot);
    fx.glow(ctx,"#facc15",9*e); ctx.fillStyle="#facc15"; ctx.beginPath();
    for(let k=0;k<10;k++){ const a=-Math.PI/2 + k*Math.PI/5; const r=k%2===0?width*0.034:width*0.016; const px=Math.cos(a)*r, py=Math.sin(a)*r; if(k===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); }
    ctx.closePath(); ctx.fill(); fx.glowOff(ctx); ctx.restore();
  }
  ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font="600 "+Math.round(width*0.018)+"px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("4.9 / 5.0  ·  2.847 ulasan", width*0.5, height*0.71);
}`,
  },
];
