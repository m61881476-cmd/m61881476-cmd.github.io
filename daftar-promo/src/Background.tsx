import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

const SHAPES = new Array(34).fill(0).map((_, i) => ({
  x: random(`x${i}`) * 1920,
  y: random(`y${i}`) * 1080,
  s: 10 + random(`s${i}`) * 22,
  kind: Math.floor(random(`k${i}`) * 3),
  speed: 0.12 + random(`v${i}`) * 0.3,
  phase: random(`p${i}`) * Math.PI * 2,
  o: 0.16 + random(`o${i}`) * 0.3,
}));

/** Deep navy stage with a breathing blue glow and slow drifting marks. */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const breathe = Math.sin(frame / 55);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(165deg, #081228 0%, #0B1E48 48%, #060C1E 100%)', overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 760px at ${50 + breathe * 6}% ${30 + breathe * 4}%, rgba(56,150,255,0.55), rgba(26,66,160,0.26) 46%, transparent 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(900px 600px at 12% 108%, rgba(64,200,224,0.14), transparent 70%), radial-gradient(900px 600px at 96% 100%, rgba(94,92,230,0.18), transparent 70%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(140,190,255,0.05) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(140,190,255,0.05) 1.5px, transparent 1.5px)',
          backgroundSize: '96px 96px',
          backgroundPosition: `${-frame * 0.16}px ${-frame * 0.1}px`,
          maskImage:
            'radial-gradient(ellipse at 50% 45%, black 20%, transparent 78%)',
        }}
      />
      {SHAPES.map((s, i) => {
        const y = ((s.y - frame * s.speed) % 1180 + 1180) % 1180 - 50;
        const x = s.x + Math.sin(frame / 70 + s.phase) * 26;
        const common: React.CSSProperties = {
          position: 'absolute',
          left: x,
          top: y,
          width: s.s,
          height: s.s,
          opacity: s.o,
          rotate: `${frame * s.speed * 0.9 + i * 30}deg`,
        };
        if (s.kind === 0) {
          return (
            <div
              key={i}
              style={{...common, border: '2px solid #9CC8FF', borderRadius: s.s * 0.28}}
            />
          );
        }
        if (s.kind === 1) {
          return (
            <div
              key={i}
              style={{...common, border: '2px solid #9CC8FF', borderRadius: 999}}
            />
          );
        }
        return (
          <div key={i} style={common}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: 2,
                height: '100%',
                background: '#9CC8FF',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                height: 2,
                width: '100%',
                background: '#9CC8FF',
              }}
            />
          </div>
        );
      })}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
