import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Caption, FaceFull} from '../Face';
import {C, display, enter, text} from '../theme';
import {Glass, Pop, Words} from '../ui';

// 437 – 550 : face
export const NotYou: React.FC = () => (
  <FaceFull
    start={437}
    punches={[
      {at: 0, scale: 1.18},
      {at: 41, scale: 1.04},
    ]}
  >
    <Caption
      small="المشكلة"
      big={[
        {t: 'مش', at: 12, accent: false},
        {t: 'فيك', at: 18},
      ]}
      out={39}
      size={170}
    />
    <Caption
      small="هم معيّنينك"
      smallAt={46}
      big={[{t: 'محاسب', at: 86}]}
      size={170}
    />
  </FaceFull>
);

const Bars: React.FC<{readonly at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 14, height: 150}}>
      {[0.45, 0.7, 0.55, 0.95, 0.8].map((h, i) => (
        <div
          key={i}
          style={{
            width: 34,
            height: 150 * h * enter(frame, at + 6 + i * 3, 16),
            borderRadius: 10,
            background:
              i === 3
                ? `linear-gradient(180deg, ${C.accentHi}, ${C.accent})`
                : 'rgba(140,190,255,0.32)',
            boxShadow: i === 3 ? `0 0 30px ${C.accent}` : 'none',
          }}
        />
      ))}
    </div>
  );
};

const Checks: React.FC<{readonly at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 18, height: 150, justifyContent: 'center'}}>
      {[0, 1, 2].map((i) => {
        const p = enter(frame, at + 8 + i * 5, 12);
        return (
          <div key={i} dir="rtl" style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: p > 0.5 ? C.green : 'rgba(255,255,255,0.12)',
                boxShadow: p > 0.5 ? `0 0 22px ${C.green}` : 'none',
                scale: 0.7 + 0.3 * p,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {p > 0.5 ? '✓' : ''}
            </div>
            <div
              style={{
                width: 170 - i * 28,
                height: 14,
                borderRadius: 7,
                background: 'rgba(214,226,255,0.4)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const Insight: React.FC<{readonly at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const p = enter(frame, at + 8, 16);
  return (
    <div style={{height: 150, display: 'grid', placeItems: 'center'}}>
      <div
        dir="ltr"
        style={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: 92,
          color: C.accentHi,
          textShadow: `0 0 50px ${C.accent}`,
          scale: 0.7 + 0.3 * p,
          opacity: p,
        }}
      >
        +18%
      </div>
    </div>
  );
};

const Card: React.FC<{
  readonly at: number;
  readonly title: string;
  readonly children: React.ReactNode;
}> = ({at, title, children}) => (
  <Pop at={at} y={80}>
    <Glass
      style={{
        width: 470,
        height: 370,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {children}
      <div
        dir="rtl"
        style={{fontFamily: display, fontWeight: 800, fontSize: 76, color: C.ink}}
      >
        {title}
      </div>
    </Glass>
  </Pop>
);

// 550 – 726 (local 0 – 176)
export const RealJob: React.FC = () => (
  <AbsoluteFill>
    <div style={{position: 'absolute', top: 96, left: 0, right: 0}}>
      <Words
        size={72}
        weight={700}
        words={[
          {t: 'شغلك', at: 0},
          {t: 'الحقيقي', at: 12, color: C.accentHi},
          {t: 'إنك', at: 26},
        ]}
      />
    </div>
    <div
      style={{
        position: 'absolute',
        top: 250,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 50,
      }}
    >
      <Card at={40} title="تحلّل">
        <Bars at={40} />
      </Card>
      <Card at={66} title="تراجع">
        <Checks at={66} />
      </Card>
      <Card at={94} title="تفسّر">
        <Insight at={94} />
      </Card>
    </div>
    <div style={{position: 'absolute', top: 690, left: 0, right: 0}}>
      <Words
        size={58}
        weight={500}
        font={text}
        color={C.mute}
        words={[{t: 'وتقول للإدارة', at: 96}]}
      />
      <Words
        size={128}
        glow
        words={[
          {t: 'الرقم ده', at: 122},
          {t: 'معناه إيه؟', at: 138, color: C.accentHi},
        ]}
      />
    </div>
  </AbsoluteFill>
);
