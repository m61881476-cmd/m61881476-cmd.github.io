import React from 'react';
import {AbsoluteFill, CanvasImage, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Crop, Phone, Screen} from '../App';
import {C, clamp, display, enter, lin, text} from '../theme';
import {Glass, Pop, Words} from '../ui';

const PROMPT = 'شراء خامات بـ 40 ألف آجل من المورد';

export const Logo: React.FC<{readonly size: number}> = ({size}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.235,
      overflow: 'hidden',
      boxShadow: `0 ${size * 0.12}px ${size * 0.4}px rgba(0,0,0,0.5), 0 0 ${size * 0.6}px rgba(46,139,255,0.7)`,
    }}
  >
    <CanvasImage src={staticFile('logo.png')} width={512} height={512} style={{width: size, height: size}} />
  </div>
);

// 726 – 948 (local 0 – 222)
export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.round(
    interpolate(
      frame,
      [40, 60, 78, 119, 132, 172],
      [0, 5, 11, 22, 25, PROMPT.length],
      clamp,
    ),
  );
  const sheet = enter(frame, 182, 16);
  return (
    <AbsoluteFill>
      {/* وده دفتر */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Pop at={0} out={28} from={0.6} y={0} dur={14}>
          <div style={{display: 'flex', alignItems: 'center', gap: 60}} dir="rtl">
            <Logo size={300} />
            <div>
              <div style={{fontFamily: text, fontWeight: 600, fontSize: 64, color: C.mute}}>
                وده
              </div>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 260,
                  lineHeight: 1.05,
                  color: C.ink,
                  textShadow: `0 0 90px ${C.accent}`,
                }}
              >
                دفتر
              </div>
            </div>
          </div>
        </Pop>
      </AbsoluteFill>

      {/* the real app */}
      <div style={{position: 'absolute', left: 170, top: 44}}>
        <Pop at={30} x={-90} y={40} dur={20}>
          <Phone width={442} style={{rotate: '-2.5deg'}}>
            <Screen name={`type_${String(typed).padStart(2, '0')}`} />
            <Screen
              name="proposed"
              style={{opacity: sheet > 0 ? 1 : 0, translate: `0px ${(1 - sheet) * 100}%`}}
            />
          </Phone>
        </Pop>
      </div>

      {/* بقوله ... */}
      <div style={{position: 'absolute', right: 110, top: 300, width: 1080}}>
        <Pop at={31} out={178} y={30}>
          <div
            dir="rtl"
            style={{
              fontFamily: text,
              fontWeight: 600,
              fontSize: 56,
              color: C.mute,
              marginBottom: 28,
              textAlign: 'right',
            }}
          >
            بقوله بالعامية…
          </div>
          <Glass
            style={{
              height: 170,
              borderRadius: 85,
              display: 'flex',
              alignItems: 'center',
              padding: '0 34px 0 50px',
              gap: 26,
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                flexShrink: 0,
                borderRadius: 999,
                background: C.accent,
                boxShadow: `0 0 40px ${C.accent}`,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: 56,
                fontWeight: 800,
                scale: 1 + 0.2 * Math.sin(Math.PI * lin(frame, 170, 182)),
              }}
            >
              ↑
            </div>
            <div
              dir="rtl"
              lang="ar"
              style={{
                flex: 1,
                fontFamily: text,
                fontWeight: 600,
                fontSize: 58,
                color: C.ink,
                whiteSpace: 'nowrap',
              }}
            >
              {PROMPT.slice(0, typed)}
              {Math.floor(frame / 8) % 2 === 0 ? (
                <span style={{color: C.accentHi}}>|</span>
              ) : null}
            </div>
          </Glass>
          <Words
            size={92}
            glow
            style={{textAlign: 'right', marginTop: 40}}
            words={[
              {t: 'شراء خامات', at: 44},
              {t: '40 ألف', at: 78, color: C.accentHi},
              {t: 'آجل', at: 119, color: C.accentHi},
            ]}
          />
        </Pop>
      </div>

      {/* والقيد بيتكتب */}
      <div style={{position: 'absolute', right: 150, top: 96, width: 1000}}>
        <Words
          size={110}
          glow
          words={[
            {t: 'والقيد', at: 186},
            {t: 'بيتكتب', at: 198, color: C.accentHi},
          ]}
        />
        <Pop at={186} y={70} style={{marginTop: 36, display: 'flex', justifyContent: 'center'}}>
          <Crop name="entry" width={840} ratio={790 / 995} />
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

const Paper: React.FC = () => {
  const frame = useCurrentFrame();
  const scan = interpolate(frame, [8, 44], [0, 1], clamp);
  const flash = interpolate(frame, [44, 47, 56], [0, 0.8, 0], clamp);
  return (
    <div style={{position: 'relative', width: 520, height: 640}}>
      <div
        style={{
          position: 'absolute',
          inset: 30,
          borderRadius: 20,
          background: 'linear-gradient(170deg, #F6F9FF, #CFDDF5)',
          boxShadow: '0 40px 90px rgba(0,0,0,0.6)',
          rotate: '-3deg',
          padding: 40,
        }}
      >
        <div dir="rtl" style={{fontFamily: display, fontWeight: 800, fontSize: 40, color: '#14306A'}}>
          فاتورة ضريبية
        </div>
        <div dir="rtl" style={{fontFamily: text, fontSize: 24, color: '#4A66A0', marginTop: 4}}>
          مورد الخامات المتحدة
        </div>
        {[300, 360, 250, 330, 280].map((w, k) => (
          <div
            key={k}
            style={{
              width: w,
              height: 13,
              borderRadius: 7,
              background: 'rgba(20,48,106,0.22)',
              marginTop: 30,
              marginRight: 'auto',
            }}
          />
        ))}
        <div
          dir="rtl"
          style={{
            marginTop: 44,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: display,
            fontWeight: 800,
            fontSize: 44,
            color: '#14306A',
          }}
        >
          <span>الإجمالي</span>
          <span>40,000</span>
        </div>
      </div>
      {/* viewfinder */}
      {[
        {left: 0, top: 0, bl: 1, bt: 1},
        {right: 0, top: 0, br: 1, bt: 1},
        {left: 0, bottom: 0, bl: 1, bb: 1},
        {right: 0, bottom: 0, br: 1, bb: 1},
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 70,
            height: 70,
            left: c.left,
            right: c.right,
            top: c.top,
            bottom: c.bottom,
            borderLeft: c.bl ? `7px solid ${C.accentHi}` : undefined,
            borderRight: c.br ? `7px solid ${C.accentHi}` : undefined,
            borderTop: c.bt ? `7px solid ${C.accentHi}` : undefined,
            borderBottom: c.bb ? `7px solid ${C.accentHi}` : undefined,
            borderRadius: 14,
            filter: `drop-shadow(0 0 14px ${C.accent})`,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          top: 20 + scan * 600,
          height: 6,
          borderRadius: 3,
          background: C.accentHi,
          boxShadow: `0 0 40px 12px ${C.accent}`,
          opacity: scan > 0 && scan < 1 ? 1 : 0,
        }}
      />
      <div style={{position: 'absolute', inset: 0, borderRadius: 24, background: '#fff', opacity: flash}} />
    </div>
  );
};

const Account: React.FC<{readonly at: number; readonly name: string; readonly v: string; readonly side: string}> = ({
  at,
  name,
  v,
  side,
}) => (
  <Pop at={at} y={60}>
    <Glass style={{width: 480, padding: '28px 34px'}}>
      <div dir="rtl" style={{fontFamily: text, fontSize: 30, color: C.mute, fontWeight: 600}}>
        حساب الأستاذ
      </div>
      <div dir="rtl" style={{fontFamily: display, fontSize: 52, fontWeight: 800, color: C.ink, marginTop: 4}}>
        {name}
      </div>
      <div
        dir="rtl"
        style={{
          marginTop: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: text,
          fontSize: 32,
          color: C.accentHi,
          fontWeight: 600,
        }}
      >
        <span>{side}</span>
        <span style={{fontFamily: display, fontWeight: 800, fontSize: 50, color: C.green}}>+{v}</span>
      </div>
    </Glass>
  </Pop>
);

// 948 – 1078 (local 0 – 130)
export const Scan: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = lin(frame, 96, 116);
  return (
    <AbsoluteFill>
      {/* بصوّر الفاتورة ← والقيد اتكتب */}
      <div style={{position: 'absolute', left: 150, top: 200}}>
        <Pop at={0} out={86} x={-80} y={0}>
          <Paper />
        </Pop>
      </div>
      <div style={{position: 'absolute', right: 140, top: 190, width: 980}}>
        <Pop at={0} out={40}>
          <Words size={84} weight={700} words={[{t: 'بصوّر', at: 0}]} style={{textAlign: 'right'}} />
          <Words
            size={176}
            glow
            color={C.accentHi}
            words={[{t: 'الفاتورة', at: 12}]}
            style={{textAlign: 'right'}}
          />
        </Pop>
      </div>
      <div style={{position: 'absolute', right: 130, top: 110}}>
        <Pop at={46} out={86} x={80} y={0}>
          <Crop name="entry" width={860} ratio={790 / 995} glow="rgba(48,209,88,0.35)" />
        </Pop>
      </div>
      <div style={{position: 'absolute', right: 130, top: 830, width: 860}}>
        <Pop at={50} out={86}>
          <Words
            size={104}
            glow
            words={[
              {t: 'والقيد', at: 50},
              {t: 'اتكتب', at: 60, color: C.green},
            ]}
          />
        </Pop>
      </div>

      {/* والترحيل تلقائي */}
      <div style={{position: 'absolute', top: 110, left: 0, right: 0}}>
        <Words
          size={132}
          glow
          words={[
            {t: 'والترحيل', at: 90},
            {t: 'تلقائي', at: 108, color: C.accentHi},
          ]}
        />
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {[560, 1360].map((x, i) => (
          <path
            key={i}
            d={`M960 420 C 960 520, ${x} 470, ${x} 590`}
            fill="none"
            stroke={C.accentHi}
            strokeWidth={5}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            opacity={frame >= 96 ? 0.9 : 0}
            style={{filter: `drop-shadow(0 0 10px ${C.accent})`}}
          />
        ))}
      </svg>
      <div style={{position: 'absolute', top: 340, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Pop at={92} from={0.7} y={0}>
          <div
            dir="rtl"
            style={{
              padding: '16px 44px',
              borderRadius: 999,
              background: C.accent,
              boxShadow: `0 0 50px ${C.accent}`,
              fontFamily: text,
              fontWeight: 700,
              fontSize: 40,
              color: '#fff',
            }}
          >
            القيد
          </div>
        </Pop>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 600,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'center',
          gap: 320,
        }}
      >
        <Account at={104} name="المخزون" v="40,000" side="مدين" />
        <Account at={110} name="الموردون" v="40,000" side="دائن" />
      </div>
    </AbsoluteFill>
  );
};
