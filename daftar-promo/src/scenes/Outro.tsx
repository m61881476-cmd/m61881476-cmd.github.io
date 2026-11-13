import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Caption, FaceCard, FaceFull, Floater} from '../Face';
import {C, display, lin, text} from '../theme';
import {Chip, Glass, Pop, Words} from '../ui';
import {Logo} from './Demo';

// 1567 – 1707 (local 0 – 140)
export const Founder: React.FC = () => (
  <FaceFull start={1567} punches={[{at: 0, scale: 1.04}]}>
    <Floater at={10} out={62} x={1250} y={170} seed={6}>
      <Chip label="محمد · مؤسّس دفتر" icon="م" size={44} />
    </Floater>
    <Caption small="أنا" smallAt={8} big={[{t: 'محمد', at: 14}]} out={34} size={170} />
    <Caption
      small="بنيت دفتر عشان"
      smallAt={36}
      big={[
        {t: 'المحاسب', at: 74, accent: false},
        {t: 'يبقى', at: 93, accent: false},
        {t: 'محاسب', at: 106},
      ]}
      size={132}
    />
  </FaceFull>
);

// 1707 – 1870 (local 0 – 163)
export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.round(lin(frame, 12, 24) * 4);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 190}}>
        <Pop at={0} x={-80} y={0}>
          <FaceCard start={1707} width={800} />
        </Pop>
        <Pop at={118} y={30} style={{marginTop: 54}}>
          <div dir="rtl" style={{display: 'flex', alignItems: 'center', gap: 30}}>
            <Logo size={150} />
            <div>
              <div style={{fontFamily: display, fontWeight: 800, fontSize: 96, color: C.ink, lineHeight: 1.1}}>
                دفتر
              </div>
              <div style={{fontFamily: text, fontWeight: 600, fontSize: 40, color: C.accentHi}}>
                المحاسب الذكي
              </div>
            </div>
          </div>
        </Pop>
      </div>

      <div style={{position: 'absolute', right: 110, top: 170, width: 820}}>
        <Words size={80} weight={700} words={[{t: 'اكتب', at: 0}]} style={{textAlign: 'right'}} />
        <Pop at={4} style={{marginTop: 14}}>
          <Glass
            style={{
              height: 170,
              borderRadius: 85,
              display: 'flex',
              flexDirection: 'row-reverse',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 60px 0 30px',
            }}
          >
            <div
              dir="rtl"
              style={{
                fontFamily: display,
                fontWeight: 800,
                fontSize: 118,
                color: C.accentHi,
                textShadow: `0 0 60px ${C.accent}`,
              }}
            >
              {'دفتر'.slice(0, typed)}
              {Math.floor(frame / 8) % 2 === 0 && frame < 60 ? (
                <span style={{color: C.ink, fontWeight: 500}}>|</span>
              ) : null}
            </div>
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 999,
                background: C.accent,
                boxShadow: `0 0 44px ${C.accent}`,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: 60,
                fontWeight: 800,
              }}
            >
              ↑
            </div>
          </Glass>
        </Pop>
        <Words
          size={64}
          weight={600}
          font={text}
          color={C.mute}
          words={[{t: 'في التعليقات', at: 22}]}
          style={{textAlign: 'right', marginTop: 12}}
        />
        <Pop at={46} style={{marginTop: 34}}>
          <Words
            size={96}
            glow
            words={[
              {t: 'وأبعتلك', at: 46},
              {t: 'تجربة', at: 62, color: C.green},
            ]}
            style={{textAlign: 'right'}}
          />
        </Pop>
        <Pop at={84} style={{marginTop: 22}}>
          <Words
            size={60}
            weight={600}
            font={text}
            color={C.mute}
            words={[{t: 'ولو عجبك…', at: 84}]}
            style={{textAlign: 'right'}}
          />
          <Words
            size={108}
            glow
            color={C.accentHi}
            words={[
              {t: 'ورّيه', at: 112},
              {t: 'مديرك', at: 124},
            ]}
            style={{textAlign: 'right'}}
          />
        </Pop>
      </div>
    </AbsoluteFill>
  );
};
