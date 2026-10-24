import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {};

const BG = "#090b18";
const INK = "#f8fafc";
const MUTED = "#a8b1c7";
const CYAN = "#4cd7f6";
const ORANGE = "#f97316";

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

export const MyComposition = () => {
  return (
    <Composition
      id="MotionEasyPromo"
      component={MyComponent}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const scene = t < 4 ? 1 : t < 12 ? 2 : 3;
  const sceneProgress = scene === 1 ? t / 4 : scene === 2 ? (t - 4) / 8 : (t - 12) / 8;
  const fade = interpolate(sceneProgress, [0, 0.12, 0.88, 1], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{backgroundColor: BG, color: INK, fontFamily: "Arial, sans-serif", overflow: "hidden"}}>
      <GlowLayer frame={frame} />
      {scene === 1 && <HookScene frame={frame} fps={fps} opacity={fade} />}
      {scene === 2 && <FeatureScene frame={frame} fps={fps} opacity={fade} />}
      {scene === 3 && <OfferScene frame={frame} fps={fps} opacity={fade} />}
      <div style={{position: "absolute", top: 70, left: 70, right: 70, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.9}}>
        <span style={{fontWeight: 900, letterSpacing: 4, fontSize: 25}}>MOTION EASY</span>
        <span style={{fontSize: 20, color: CYAN, letterSpacing: 2}}>AI MOTION STUDIO</span>
      </div>
      <div style={{position: "absolute", bottom: 62, left: 70, right: 70, height: 5, background: "#263047", borderRadius: 10}}>
        <div style={{height: "100%", width: `${(frame / 600) * 100}%`, background: `linear-gradient(90deg, ${CYAN}, ${ORANGE})`, borderRadius: 10}} />
      </div>
      <div style={{position: "absolute", bottom: 88, left: 70, color: MUTED, fontSize: 18}}>100% client-side · tanpa watermark</div>
      <div style={{position: "absolute", bottom: 88, right: 70, color: CYAN, fontSize: 18}}>20s / 9:16</div>
    </AbsoluteFill>
  );
};

const GlowLayer: React.FC<{frame: number}> = ({frame}) => {
  const x = 50 + Math.sin(frame / 70) * 25;
  return <>
    <div style={{position: "absolute", width: 900, height: 900, left: `${x - 40}%`, top: "4%", borderRadius: "50%", background: `radial-gradient(circle, ${CYAN}22 0%, transparent 65%)`, filter: "blur(20px)"}} />
    <div style={{position: "absolute", width: 700, height: 700, right: "-20%", bottom: "6%", borderRadius: "50%", background: `radial-gradient(circle, ${ORANGE}28 0%, transparent 68%)`, filter: "blur(28px)"}} />
    <div style={{position: "absolute", inset: 0, backgroundImage: "linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)", backgroundSize: "90px 90px", maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)"}} />
  </>;
};

const Enter: React.FC<{frame: number; fps: number; start: number; children: React.ReactNode; style?: React.CSSProperties}> = ({frame, fps, start, children, style}) => {
  const y = spring({frame: frame - start, fps, config: {damping: 14, stiffness: 110, mass: 0.7}});
  return <div style={{opacity: interpolate(y, [0, 1], [0, 1], {extrapolateRight: "clamp"}), transform: `translateY(${interpolate(y, [0, 1], [70, 0])}px)`, ...style}}>{children}</div>;
};

const HookScene: React.FC<{frame: number; fps: number; opacity: number}> = ({frame, fps, opacity}) => <div style={{position: "absolute", inset: 0, opacity, display: "flex", flexDirection: "column", justifyContent: "center", padding: 70}}>
  <Enter frame={frame} fps={fps} start={5} style={{color: ORANGE, fontSize: 24, fontWeight: 800, letterSpacing: 5, marginBottom: 38}}>MASIH BAYAR LANGGANAN?</Enter>
  <Enter frame={frame} fps={fps} start={13} style={{fontSize: 100, lineHeight: 0.98, fontWeight: 900, letterSpacing: -5}}>Capek<br/><span style={{color: CYAN}}>langganan</span><br/>mahal?</Enter>
  <Enter frame={frame} fps={fps} start={23} style={{marginTop: 58, color: MUTED, fontSize: 32, lineHeight: 1.35, maxWidth: 780}}>Bikin motion graphics tanpa antre render dan tanpa tagihan bulanan yang bikin pusing.</Enter>
  <div style={{position: "absolute", bottom: 210, left: 70, height: 12, width: 310, background: ORANGE, transform: `scaleX(${spring({frame: frame - 30, fps, config: {damping: 12}})})`, transformOrigin: "left", borderRadius: 8}} />
</div>;

const FeatureScene: React.FC<{frame: number; fps: number; opacity: number}> = ({frame, fps, opacity}) => <div style={{position: "absolute", inset: 0, opacity, padding: "180px 70px 140px"}}>
  <Enter frame={frame} fps={fps} start={125} style={{fontSize: 62, fontWeight: 900, lineHeight: 1.05}}>Satu studio.<br/><span style={{color: CYAN}}>Lebih banyak value.</span></Enter>
  <Enter frame={frame} fps={fps} start={138} style={{marginTop: 38, color: MUTED, fontSize: 26}}>Bandingkan dengan langganan cloud biasa:</Enter>
  <div style={{marginTop: 52, display: "flex", flexDirection: "column", gap: 22}}>
    <FeatureCard frame={frame} fps={fps} start={150} icon="✓" title="Tanpa biaya render cloud" detail="Proses langsung di browser kamu" color={CYAN} />
    <FeatureCard frame={frame} fps={fps} start={162} icon="✓" title="Tanpa watermark" detail="Siap untuk konten, klien, dan microstock" color={CYAN} />
    <FeatureCard frame={frame} fps={fps} start={174} icon="✓" title="Mulai Rp0 · Lifetime Rp55rb" detail="Bukan tagihan bulanan tanpa akhir" color={ORANGE} />
  </div>
  <div style={{marginTop: 46, display: "flex", gap: 14, flexWrap: "wrap"}}>{["720p–4K", "Bulk ZIP", "5 ekspor/hari gratis", "100% lokal"].map((x, i) => <span key={x} style={{padding: "13px 18px", border: `1px solid ${i === 2 ? ORANGE : CYAN}66`, color: i === 2 ? ORANGE : CYAN, borderRadius: 30, fontSize: 20, fontWeight: 700}}>{x}</span>)}</div>
</div>;

const FeatureCard: React.FC<{frame: number; fps: number; start: number; icon: string; title: string; detail: string; color: string}> = ({frame, fps, start, icon, title, detail, color}) => {
  const s = spring({frame: frame - start, fps, config: {damping: 13, stiffness: 120, mass: 0.8}});
  return <div style={{transform: `translateX(${interpolate(s, [0, 1], [100, 0])}px) scale(${interpolate(s, [0, 1], [0.85, 1])})`, opacity: s, padding: "24px 25px", borderRadius: 22, background: "#151b2d", border: `1px solid ${color}55`, boxShadow: `0 0 30px ${color}12`}}>
    <div style={{display: "flex", alignItems: "center", gap: 18}}><div style={{width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: `${color}20`, color, fontSize: 28, fontWeight: 900}}>{icon}</div><div><div style={{fontSize: 27, fontWeight: 800}}>{title}</div><div style={{fontSize: 20, color: MUTED, marginTop: 7}}>{detail}</div></div></div>
  </div>;
};

const OfferScene: React.FC<{frame: number; fps: number; opacity: number}> = ({frame, fps, opacity}) => {
  const card = spring({frame: frame - 365, fps, config: {damping: 11, stiffness: 95, mass: 0.8}});
  const pulse = 1 + Math.sin((frame - 365) / 10) * 0.025;
  return <div style={{position: "absolute", inset: 0, opacity, padding: "190px 70px 130px", textAlign: "center"}}>
    <Enter frame={frame} fps={fps} start={365} style={{color: ORANGE, fontSize: 24, fontWeight: 900, letterSpacing: 5}}>PENAWARAN TERBAIK</Enter>
    <Enter frame={frame} fps={fps} start={373} style={{marginTop: 28, fontSize: 75, fontWeight: 900, lineHeight: 1.02}}>Beli sekali.<br/><span style={{color: CYAN}}>Pakai selamanya.</span></Enter>
    <div style={{margin: "58px auto 0", width: 780, transform: `scale(${card * pulse})`, opacity: card, borderRadius: 32, padding: "36px 38px", textAlign: "left", background: "linear-gradient(145deg, #202944, #111628)", border: `2px solid ${ORANGE}`, boxShadow: `0 0 70px ${ORANGE}35`}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><span style={{fontSize: 26, fontWeight: 800}}>LIFETIME PASS</span><span style={{padding: "10px 15px", borderRadius: 20, background: `${ORANGE}22`, color: ORANGE, fontSize: 18, fontWeight: 800}}>PALING HEMAT</span></div>
      <div style={{fontSize: 90, fontWeight: 900, marginTop: 20, color: INK}}>Rp55.000</div>
      <div style={{fontSize: 24, color: MUTED, marginBottom: 25}}>sekali bayar · tanpa perpanjangan</div>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 22, fontWeight: 700}}>{["Ekspor 4K", "Bulk ZIP", "Tanpa watermark", "Update mendatang"].map((x) => <div key={x} style={{color: CYAN}}>✓ <span style={{color: INK}}>{x}</span></div>)}</div>
    </div>
    <Enter frame={frame} fps={fps} start={400} style={{marginTop: 48, fontSize: 30, fontWeight: 800}}>Cek keranjang kuning / link di bio</Enter>
    <div style={{margin: "28px auto 0", width: 520, padding: "20px 25px", borderRadius: 18, color: BG, background: `linear-gradient(90deg, ${CYAN}, #8be9fd)`, fontSize: 25, fontWeight: 900}}>BUAT VIDEO PERTAMAMU SEKARANG →</div>
  </div>;
};
