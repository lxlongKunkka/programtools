// 云朵与细雨漂浮特效 — 纯 CSS 动画，pointer-events: none，不干扰游戏

// 7 朵云：不同高度 / 大小 / 速度，从屏幕右侧漂向左侧
const CLOUDS: { id: number; top: string; scale: number; dur: number; delay: number; opacity: number }[] = [
  { id: 1, top: '18%', scale: 1.30, dur: 42, delay:   0, opacity: 0.62 },
  { id: 2, top: '28%', scale: 0.80, dur: 56, delay: -12, opacity: 0.48 },
  { id: 3, top: '15%', scale: 1.05, dur: 35, delay: -25, opacity: 0.58 },
  { id: 4, top: '38%', scale: 1.55, dur: 62, delay: -38, opacity: 0.42 },
  { id: 5, top: '22%', scale: 0.70, dur: 48, delay: -18, opacity: 0.52 },
  { id: 6, top: '33%', scale: 1.20, dur: 51, delay:  -6, opacity: 0.46 },
  { id: 7, top: '20%', scale: 0.90, dur: 40, delay: -31, opacity: 0.54 },
]

// 24 条雨滴：细线条，极低透明度，营造淡淡下雨氛围
const RAIN: { id: number; left: string; height: number; dur: number; delay: number }[] =
  Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left:   `${(i * 4.2 + 1.5) % 100}%`,
    height: 48 + (i * 19) % 62,
    dur:    0.42 + (i * 0.031) % 0.68,
    delay:  -((i * 0.13) % 1.6),
  }))

export function FloatingEffects() {
  return (
    <div className="lb-float-layer" aria-hidden="true">
      {CLOUDS.map((c) => (
        <div
          key={c.id}
          className="lb-cloud-track"
          style={{
            top: c.top,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <div
            className="lb-cloud-shape"
            style={{ transform: `scale(${c.scale})`, opacity: c.opacity }}
          />
        </div>
      ))}

      {RAIN.map((d) => (
        <div
          key={d.id}
          className="lb-raindrop"
          style={{
            left: d.left,
            height: `${d.height}px`,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
