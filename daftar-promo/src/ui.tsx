import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, display, enter, text} from './theme';

type PopProps = {
  readonly at: number;
  readonly out?: number;
  readonly dur?: number;
  readonly y?: number;
  readonly x?: number;
  readonly from?: number;
  readonly blur?: number;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

/** Blur-and-rise entrance, optional exit. The house move of this video. */
export const Pop: React.FC<PopProps> = ({
  at,
  out,
  dur = 16,
  y = 46,
  x = 0,
  from = 0.94,
  blur = 16,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = enter(frame, at, dur);
  const q = out === undefined ? 0 : enter(frame, out, 9);
  return (
    <div
      style={{
        opacity: p * (1 - q),
        translate: `${x * (1 - p)}px ${y * (1 - p) - 26 * q}px`,
        scale: from + (1 - from) * p - 0.03 * q,
        filter: `blur(${(1 - p) * blur + q * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Glass: React.FC<{
  readonly style?: React.CSSProperties;
  readonly glow?: string;
  readonly children?: React.ReactNode;
}> = ({style, glow = 'rgba(46,139,255,0.28)', children}) => (
  <div
    style={{
      borderRadius: 34,
      background:
        'linear-gradient(160deg, rgba(120,170,255,0.20) 0%, rgba(40,70,140,0.14) 45%, rgba(14,24,52,0.55) 100%)',
      border: `1.5px solid ${C.line}`,
      boxShadow: `0 40px 110px rgba(0,0,0,0.55), 0 0 90px ${glow}, inset 0 1.5px 0 rgba(255,255,255,0.16)`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Chip: React.FC<{
  readonly label: string;
  readonly icon?: React.ReactNode;
  readonly tone?: string;
  readonly size?: number;
  readonly style?: React.CSSProperties;
}> = ({label, icon, tone = C.accent, size = 34, style}) => (
  <div
    dir="rtl"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.42,
      padding: `${size * 0.36}px ${size * 0.72}px ${size * 0.36}px ${size * 0.42}px`,
      borderRadius: 999,
      background:
        'linear-gradient(180deg, rgba(150,195,255,0.26), rgba(40,70,150,0.30))',
      border: '1.5px solid rgba(170,210,255,0.42)',
      boxShadow: `0 18px 50px rgba(0,0,0,0.45), 0 0 44px ${tone}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
      fontFamily: text,
      fontWeight: 600,
      fontSize: size,
      color: C.ink,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <span>{label}</span>
    <span
      style={{
        width: size * 1.18,
        height: size * 1.18,
        borderRadius: 999,
        background: tone,
        boxShadow: `0 0 22px ${tone}`,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontSize: size * 0.7,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {icon}
    </span>
  </div>
);

/** Headline in the display face. Words can be animated one by one. */
export const Words: React.FC<{
  readonly words: readonly {
    readonly t: string;
    readonly at: number;
    readonly color?: string;
  }[];
  readonly size: number;
  readonly weight?: number;
  readonly color?: string;
  readonly font?: string;
  readonly out?: number;
  readonly glow?: boolean;
  readonly style?: React.CSSProperties;
}> = ({words, size, weight = 800, color = C.ink, font = display, out, glow, style}) => {
  const frame = useCurrentFrame();
  const q = out === undefined ? 0 : enter(frame, out, 9);
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.28,
        color,
        textAlign: 'center',
        opacity: 1 - q,
        filter: `blur(${q * 12}px)`,
        translate: `0px ${-24 * q}px`,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = enter(frame, w.at, 13);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginInline: size * 0.13,
              opacity: p,
              translate: `0px ${(1 - p) * size * 0.42}px`,
              scale: 0.9 + 0.1 * p,
              filter: `blur(${(1 - p) * 14}px)`,
              color: w.color ?? color,
              textShadow:
                glow || w.color
                  ? `0 0 ${size * 0.5}px ${(w.color ?? C.accent)}88, 0 6px 30px rgba(0,0,0,0.6)`
                  : '0 6px 30px rgba(0,0,0,0.6)',
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

export const Check: React.FC<{readonly size?: number; readonly color?: string}> = ({
  size = 30,
  color = '#fff',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke={color}
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
