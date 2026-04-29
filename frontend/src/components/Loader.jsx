const RAYS = [
  { a: '-12deg', h: '55px', d: '3.2s', dl: '0s' },
  { a: '-5deg', h: '70px', d: '4.0s', dl: '-1.1s' },
  { a: '0deg', h: '80px', d: '3.7s', dl: '-0.4s' },
  { a: '5deg', h: '68px', d: '4.3s', dl: '-2.2s' },
  { a: '12deg', h: '52px', d: '3.5s', dl: '-1.6s' },
  { a: '-22deg', h: '32px', d: '5.0s', dl: '-0.8s' },
  { a: '22deg', h: '30px', d: '4.8s', dl: '-3.0s' }
];

const MOTES = [
  { s: '4px', op: '0.55', d: '5.8s', dl: '0s', x1: '50px', y1: '-55px', x2: '30px', y2: '-115px' },
  { s: '3px', op: '0.40', d: '7.2s', dl: '-2.3s', x1: '-40px', y1: '-70px', x2: '-20px', y2: '-130px' },
  { s: '5px', op: '0.45', d: '6.5s', dl: '-1.0s', x1: '70px', y1: '-40px', x2: '55px', y2: '-100px' },
  { s: '2px', op: '0.60', d: '4.8s', dl: '-3.5s', x1: '-65px', y1: '-50px', x2: '-50px', y2: '-105px' },
  { s: '3px', op: '0.35', d: '8.1s', dl: '-4.0s', x1: '20px', y1: '-80px', x2: '10px', y2: '-140px' }
];

/**
 * @param {{ size?: number, className?: string }} [props]
 */
export default function Loader({ size = 150, className = '' }) {
  const scale = size / 148;

  return (
    <div
      className={`orb-wrap ${className}`.trim()}
      style={{
        width: 240 * scale,
        height: 240 * scale,
        transform: `scale(${scale})`,
        transformOrigin: 'center center'
      }}
      aria-hidden="true"
    >
      <div className="halo halo-2" />
      <div className="halo halo-1" />
      <div className="halo halo-3" />

      {RAYS.map((r, i) => (
        <div
          key={i}
          className="orb-ray"
          style={{
            '--a': r.a,
            '--h': r.h,
            '--d': r.d,
            '--dl': r.dl,
            transform: `translateX(-50%) rotate(${r.a})`
          }}
        />
      ))}

      {MOTES.map((m, i) => (
        <div
          key={i}
          className="orb-mote"
          style={{
            width: m.s,
            height: m.s,
            background: `rgba(165, 210, 145, ${m.op})`,
            '--op': m.op,
            '--d': m.d,
            '--dl': m.dl,
            '--x1': m.x1,
            '--y1': m.y1,
            '--x2': m.x2,
            '--y2': m.y2
          }}
        />
      ))}

      <div className="orb-core">
        <div className="orb-body" />
        <div className="orb-sheen" />
        <div className="orb-rim" />
        <div className="orb-spec-main" />
        <div className="orb-spec-secondary" />
      </div>
    </div>
  );
}

/**
 * Full-viewport centered orb with blurred backdrop.
 * @param {{ label: string, className?: string }} props
 */
export function LoadingBlock({ label, className = '' }) {
  return (
    <div
      className={`loading-block fixed inset-0 z-[100] flex items-center justify-center p-6 ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="loading-block__backdrop absolute inset-0 bg-[#0a1628]/20 backdrop-blur-md backdrop-saturate-150" aria-hidden="true" />
      <div className="relative z-[1] flex flex-col items-center gap-5">
        <Loader />
        <p className="max-w-xs text-center text-sm font-semibold leading-snug text-[#0f1a2e] drop-shadow-[0_1px_8px_rgba(255,255,255,0.85)]">
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact orb for buttons and inline actions.
 * @param {{ size?: number, className?: string }} [props]
 */
export function InlineLoader({ size = 22, className = '' }) {
  return <Loader size={size} className={`shrink-0 ${className}`.trim()} />;
}
