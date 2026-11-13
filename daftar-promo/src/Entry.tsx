import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, display, enter, text} from './theme';
import {Check, Glass} from './ui';

/** A balanced journal entry, the way دفتر shows it. */
export const Entry: React.FC<{
  readonly at: number;
  readonly width?: number;
  readonly title?: string;
}> = ({at, width = 1180, title = 'قيد يومية'}) => {
  const frame = useCurrentFrame();
  const rows = [
    {side: 'من حـ/', name: 'المشتريات — خامات', dr: '40,000', cr: '', pad: 0},
    {side: 'إلى حـ/', name: 'الموردين', dr: '', cr: '40,000', pad: 70},
  ];
  const ok = enter(frame, at + 30, 14);
  return (
    <Glass style={{width, padding: '30px 44px 34px'}}>
      <div
        dir="rtl"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: text,
          fontSize: 30,
          fontWeight: 600,
          color: C.mute,
          paddingBottom: 16,
          borderBottom: `1.5px solid ${C.line}`,
        }}
      >
        <span style={{flex: 1}}>{title}</span>
        <span style={{width: 210, textAlign: 'center'}}>مدين</span>
        <span style={{width: 210, textAlign: 'center'}}>دائن</span>
      </div>
      {rows.map((r, i) => {
        const p = enter(frame, at + 6 + i * 10, 14);
        return (
          <div
            key={i}
            dir="rtl"
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 96,
              borderBottom: `1.5px solid ${C.faint}`,
              opacity: p,
              translate: `${(1 - p) * 50}px 0px`,
              filter: `blur(${(1 - p) * 8}px)`,
            }}
          >
            <span
              style={{
                flex: 1,
                fontFamily: text,
                fontSize: 44,
                fontWeight: 600,
                color: C.ink,
                paddingRight: r.pad,
              }}
            >
              <span style={{color: C.accentHi, marginLeft: 14}}>{r.side}</span>
              {r.name}
            </span>
            <span style={num}>{r.dr}</span>
            <span style={num}>{r.cr}</span>
          </div>
        );
      })}
      <div
        dir="rtl"
        style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: ok,
          scale: 0.8 + 0.2 * ok,
          transformOrigin: 'right center',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 999,
            background: C.green,
            boxShadow: `0 0 30px ${C.green}`,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Check size={32} />
        </div>
        <span style={{fontFamily: text, fontSize: 36, fontWeight: 700, color: C.green}}>
          قيد متوازن — مدين = دائن
        </span>
      </div>
    </Glass>
  );
};

const num: React.CSSProperties = {
  width: 210,
  textAlign: 'center',
  fontFamily: display,
  fontWeight: 700,
  fontSize: 48,
  color: C.ink,
};
