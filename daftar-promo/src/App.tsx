import React from 'react';
import {Img, staticFile} from 'remotion';
import {C} from './theme';

/** A phone showing a real screenshot of the دفتر app (430 × 900 CSS px). */
export const Phone: React.FC<{
  readonly width: number;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({width, children, style}) => {
  const bezel = width * 0.035;
  return (
    <div
      style={{
        width: width + bezel * 2,
        padding: bezel,
        borderRadius: width * 0.15,
        background: 'linear-gradient(160deg, #2A3A5E, #0B1224 40%, #1B2A4A)',
        boxShadow:
          '0 60px 140px rgba(0,0,0,0.65), 0 0 120px rgba(46,139,255,0.45), inset 0 0 0 2px rgba(170,210,255,0.35)',
        ...style,
      }}
    >
      <div
        style={{
          width,
          height: (width * 900) / 430,
          borderRadius: width * 0.115,
          overflow: 'hidden',
          position: 'relative',
          background: '#000',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Screen: React.FC<{
  readonly name: string;
  readonly style?: React.CSSProperties;
}> = ({name, style}) => (
  <Img
    src={staticFile(`app/${name}.jpg`)}
    style={{position: 'absolute', inset: 0, width: '100%', height: '100%', ...style}}
  />
);

/** A zoomed-in piece of the real interface, framed like a card. */
export const Crop: React.FC<{
  readonly name: string;
  readonly width: number;
  readonly ratio: number;
  readonly glow?: string;
  readonly style?: React.CSSProperties;
}> = ({name, width, ratio, glow = 'rgba(46,139,255,0.42)', style}) => (
  <div
    style={{
      width,
      height: width * ratio,
      borderRadius: 34,
      overflow: 'hidden',
      border: `2px solid ${C.line}`,
      boxShadow: `0 44px 110px rgba(0,0,0,0.6), 0 0 100px ${glow}`,
      background: '#1C1C1E',
      ...style,
    }}
  >
    <Img src={staticFile(`app/${name}.jpg`)} style={{width: '100%', height: '100%'}} />
  </div>
);
