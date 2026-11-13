import {Video} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, clamp, display, enter, text} from './theme';

type Punch = {readonly at: number; readonly scale: number; readonly x?: number; readonly y?: number};

const Footage: React.FC<{
  readonly start: number;
  readonly punches: readonly Punch[];
  readonly drift?: number;
}> = ({start, punches, drift = 0.05}) => {
  const frame = useCurrentFrame();
  let cur: Punch = punches[0];
  for (const p of punches) {
    if (frame >= p.at) cur = p;
  }
  const push = interpolate(frame - cur.at, [0, 160], [0, drift], clamp);
  return (
    <Video
      src={staticFile('talk.mp4')}
      trimBefore={start}
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        scale: cur.scale + push,
        translate: `${cur.x ?? 0}px ${cur.y ?? (cur.scale - 1) * 440}px`,
      }}
    />
  );
};

/** Full-bleed talking head with a cinematic grade overlay. */
export const FaceFull: React.FC<{
  readonly start: number;
  readonly punches?: readonly Punch[];
  readonly children?: React.ReactNode;
}> = ({start, punches = [{at: 0, scale: 1.02}], children}) => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 7], [0.55, 0], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <Footage start={start} punches={punches} />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 38%, transparent 34%, rgba(3,8,22,0.6) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(4,10,28,0.30) 0%, transparent 26%, transparent 46%, rgba(3,7,18,0.90) 100%)',
        }}
      />
      <AbsoluteFill style={{background: 'rgba(30,90,220,0.10)', mixBlendMode: 'screen'}} />
      {children}
      <AbsoluteFill style={{background: '#9CC8FF', opacity: flash, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

/** The same footage inside a glowing rounded card. */
export const FaceCard: React.FC<{
  readonly start: number;
  readonly width: number;
  readonly scale?: number;
  readonly style?: React.CSSProperties;
}> = ({start, width, scale = 1.12, style}) => (
  <div
    style={{
      width,
      height: (width * 9) / 16,
      borderRadius: 36,
      overflow: 'hidden',
      border: '2px solid rgba(170,210,255,0.55)',
      boxShadow:
        '0 50px 120px rgba(0,0,0,0.6), 0 0 110px rgba(46,139,255,0.45)',
      position: 'relative',
      ...style,
    }}
  >
    <Footage start={start} punches={[{at: 0, scale}]} drift={0.04} />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(180deg, transparent 55%, rgba(3,7,18,0.55) 100%)',
      }}
    />
  </div>
);

/** Two-line caption: a quiet lead-in and one loud phrase. */
export const Caption: React.FC<{
  readonly small?: string;
  readonly smallAt?: number;
  readonly big: readonly {readonly t: string; readonly at: number; readonly accent?: boolean}[];
  readonly out?: number;
  readonly bottom?: number;
  readonly size?: number;
}> = ({small, smallAt = 0, big, out, bottom = 92, size = 148}) => {
  const frame = useCurrentFrame();
  const q = out === undefined ? 0 : enter(frame, out, 8);
  const ps = enter(frame, smallAt, 12);
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom,
        textAlign: 'center',
        opacity: 1 - q,
        filter: `blur(${q * 12}px)`,
        translate: `0px ${-22 * q}px`,
      }}
    >
      {small ? (
        <div
          style={{
            fontFamily: text,
            fontWeight: 600,
            fontSize: 60,
            color: C.ink,
            opacity: ps,
            translate: `0px ${(1 - ps) * 24}px`,
            filter: `blur(${(1 - ps) * 10}px)`,
            textShadow: '0 4px 24px rgba(0,0,0,0.85)',
            marginBottom: 2,
          }}
        >
          {small}
        </div>
      ) : null}
      <div style={{fontFamily: display, fontWeight: 800, fontSize: size, lineHeight: 1.22}}>
        {big.map((w, i) => {
          const p = enter(frame, w.at, 13);
          const col = w.accent === false ? C.ink : C.accentHi;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginInline: size * 0.12,
                color: col,
                opacity: p,
                translate: `0px ${(1 - p) * 60}px`,
                scale: 0.88 + 0.12 * p,
                filter: `blur(${(1 - p) * 16}px)`,
                textShadow: `0 0 70px rgba(46,139,255,0.75), 0 8px 34px rgba(0,0,0,0.85)`,
              }}
            >
              {w.t}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** A chip that floats gently over the footage. */
export const Floater: React.FC<{
  readonly at: number;
  readonly out?: number;
  readonly x: number;
  readonly y: number;
  readonly seed?: number;
  readonly children: React.ReactNode;
}> = ({at, out, x, y, seed = 0, children}) => {
  const frame = useCurrentFrame();
  const p = enter(frame, at, 18);
  const q = out === undefined ? 0 : enter(frame, out, 8);
  const bob = Math.sin(frame / 22 + seed * 2.1) * 9;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: p * (1 - q),
        scale: 0.6 + 0.4 * p,
        translate: `0px ${bob + (1 - p) * 30}px`,
        filter: `blur(${(1 - p) * 12 + q * 8}px)`,
      }}
    >
      {children}
    </div>
  );
};
