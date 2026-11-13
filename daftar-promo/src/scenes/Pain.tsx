import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C, clamp, display, enter, lin, text} from '../theme';
import {Glass, Pop, Words} from '../ui';

// 192 – 437  (local 0 – 245)
const Invoice: React.FC<{readonly i: number; readonly at: number}> = ({i, at}) => {
  const frame = useCurrentFrame();
  const p = enter(frame, at, 15);
  const rot = (random(`r${i}`) - 0.5) * 22;
  const dx = (random(`dx${i}`) - 0.5) * 150;
  return (
    <div
      style={{
        position: 'absolute',
        left: 250 + dx,
        top: 330 - i * 30,
        width: 380,
        height: 250,
        borderRadius: 22,
        background: 'linear-gradient(170deg, #F4F8FF, #C9DAF6)',
        boxShadow: '0 26px 60px rgba(0,0,0,0.55)',
        opacity: p,
        translate: `0px ${(1 - p) * -520}px`,
        rotate: `${rot * p + (1 - p) * 30}deg`,
        padding: 26,
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{width: 120, height: 16, borderRadius: 8, background: '#1D3D7A'}} />
        <div style={{fontFamily: text, fontWeight: 700, fontSize: 22, color: '#1D3D7A'}}>
          فاتورة
        </div>
      </div>
      {[200, 260, 170, 230].map((w, k) => (
        <div
          key={k}
          style={{
            width: w,
            height: 11,
            borderRadius: 6,
            background: 'rgba(29,61,122,0.28)',
            marginTop: 20,
          }}
        />
      ))}
    </div>
  );
};

const ROWS = [
  {a: 'مصروف إيجار', v: '12,000'},
  {a: 'مشتريات خامات', v: '40,000'},
  {a: 'كهربا ومرافق', v: '3,450'},
];

const SlowLedger: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Glass style={{width: 760, padding: '34px 38px'}}>
      <div
        dir="rtl"
        style={{
          fontFamily: text,
          fontSize: 30,
          fontWeight: 600,
          color: C.mute,
          display: 'flex',
          justifyContent: 'space-between',
          paddingBottom: 18,
          borderBottom: `1.5px solid ${C.line}`,
        }}
      >
        <span>دفتر اليومية — إدخال يدوي</span>
        <span>مدين</span>
      </div>
      {ROWS.map((r, i) => {
        const start = 96 + i * 26;
        const chars = Math.floor(lin(frame, start, start + 22) * r.a.length);
        const done = frame > start + 22;
        const typing = frame >= start && !done;
        return (
          <div
            key={i}
            dir="rtl"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 86,
              borderBottom: `1.5px solid ${C.faint}`,
              fontFamily: text,
              fontSize: 40,
              fontWeight: 500,
              color: C.ink,
              opacity: frame >= start ? 1 : 0.18,
            }}
          >
            <span>
              {r.a.slice(0, chars)}
              {typing ? <span style={{color: C.accentHi}}>▍</span> : null}
            </span>
            <span style={{fontFamily: display, fontWeight: 700, opacity: done ? 1 : 0}}>
              {r.v}
            </span>
          </div>
        );
      })}
    </Glass>
  );
};

const Stuck: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [184, 205, 245], [9, 12, 12.6], clamp);
  const blink = Math.floor(frame / 9) % 2 === 0;
  return (
    <Glass style={{width: 760, padding: 44}} glow="rgba(255,90,79,0.28)">
      <div
        dir="rtl"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: text,
          color: C.ink,
        }}
      >
        <span style={{fontSize: 40, fontWeight: 600}}>إدخال بيانات الشهر</span>
        <span style={{fontFamily: display, fontSize: 84, fontWeight: 800, color: C.red}}>
          {Math.floor(pct)}%
        </span>
      </div>
      <div
        style={{
          marginTop: 26,
          height: 22,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.10)',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 12,
            background: `linear-gradient(90deg, ${C.red}, #FF9F0A)`,
            boxShadow: `0 0 26px ${C.red}`,
          }}
        />
      </div>
      <div
        dir="rtl"
        style={{
          marginTop: 30,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: text,
          fontSize: 34,
          color: C.mute,
        }}
      >
        <span>باقي 412 قيد</span>
        <span style={{color: C.red, fontWeight: 700, opacity: blink ? 1 : 0.45}}>
          11:47 م
        </span>
      </div>
    </Glass>
  );
};

export const Pain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* كل شهر نفس الفيلم */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Pop at={0} out={46} y={0} from={1} blur={0}>
          <Words size={64} weight={500} words={[{t: 'كل شهر', at: 0}]} color={C.mute} />
          <Words
            size={190}
            glow
            color={C.accentHi}
            words={[
              {t: 'نفس', at: 20},
              {t: 'الفيلم', at: 30},
            ]}
          />
        </Pop>
      </AbsoluteFill>

      {/* فواتير متكوّمة */}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - enter(frame, 84, 9)}}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Invoice key={i} i={i} at={50 + i * 5} />
        ))}
      </div>
      <div style={{position: 'absolute', right: 150, top: 380, width: 800}}>
        <Pop at={50} out={84}>
          <Words size={150} words={[{t: 'فواتير', at: 50}]} style={{textAlign: 'right'}} />
          <Words
            size={150}
            color={C.accentHi}
            glow
            words={[{t: 'متكوّمة', at: 62}]}
            style={{textAlign: 'right'}}
          />
        </Pop>
      </div>

      {/* قيود بتتكتب واحدة واحدة */}
      <div style={{position: 'absolute', left: 130, top: 380}}>
        <Pop at={86} out={174} x={-60} y={0}>
          <SlowLedger />
        </Pop>
      </div>
      <div style={{position: 'absolute', right: 150, top: 400, width: 800}}>
        <Pop at={86} out={174}>
          <Words
            size={104}
            words={[
              {t: 'وقيود', at: 86},
              {t: 'بتتكتب', at: 112},
            ]}
            style={{textAlign: 'right'}}
          />
          <Words
            size={138}
            color={C.accentHi}
            glow
            words={[
              {t: 'واحدة', at: 132},
              {t: 'واحدة', at: 152},
            ]}
            style={{textAlign: 'right'}}
          />
        </Pop>
      </div>

      {/* وإنت لسه بتدخّل بيانات */}
      <div style={{position: 'absolute', left: 130, top: 400}}>
        <Pop at={176} x={-60} y={0}>
          <Stuck />
        </Pop>
      </div>
      <div style={{position: 'absolute', right: 150, top: 400, width: 800}}>
        <Pop at={176}>
          <Words
            size={92}
            weight={700}
            words={[
              {t: 'وإنت', at: 176},
              {t: 'لسه', at: 186},
            ]}
            style={{textAlign: 'right'}}
          />
          <Words
            size={128}
            color={C.red}
            words={[
              {t: 'بتدخّل', at: 198, color: C.red},
              {t: 'بيانات', at: 212, color: C.red},
            ]}
            style={{textAlign: 'right'}}
          />
        </Pop>
      </div>
    </AbsoluteFill>
  );
};
