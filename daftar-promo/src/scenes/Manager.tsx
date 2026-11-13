import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Caption, FaceFull, Floater} from '../Face';
import {C, display, enter, lin, text} from '../theme';
import {Chip, Glass, Pop, Words} from '../ui';

const Dots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', gap: 12, padding: '10px 6px'}}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            background: C.ink,
            opacity: 0.35 + 0.65 * Math.max(0, Math.sin(frame / 3.2 - i * 0.9)),
          }}
        />
      ))}
    </div>
  );
};

const bubble: React.CSSProperties = {
  borderRadius: 40,
  padding: '26px 40px',
  fontFamily: text,
  fontWeight: 600,
  fontSize: 54,
  color: C.ink,
  maxWidth: 760,
};

// 1277 – 1423 (local 0 – 146)
export const Manager: React.FC = () => {
  const frame = useCurrentFrame();
  const read = enter(frame, 104, 10);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 120, top: 190}}>
        <Pop at={0} x={-70} y={0}>
          <Glass style={{width: 900, height: 700, padding: 0, overflow: 'hidden'}}>
            <div
              dir="rtl"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: '30px 40px',
                borderBottom: `1.5px solid ${C.line}`,
                background: 'rgba(10,20,48,0.45)',
              }}
            >
              <div
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: 999,
                  background: 'linear-gradient(160deg, #5E5CE6, #2E8BFF)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 44,
                  color: '#fff',
                }}
              >
                م
              </div>
              <div>
                <div style={{fontFamily: display, fontWeight: 800, fontSize: 46, color: C.ink}}>
                  المدير
                </div>
                <div style={{fontFamily: text, fontSize: 28, color: C.green, fontWeight: 600}}>
                  متصل الآن
                </div>
              </div>
            </div>
            <div style={{padding: 44, display: 'flex', flexDirection: 'column', gap: 34}}>
              {/* incoming */}
              <div style={{alignSelf: 'flex-end'}}>
                {frame < 44 ? (
                  <Pop at={8} y={30}>
                    <div style={{...bubble, background: '#262B3D'}}>
                      <Dots />
                    </div>
                  </Pop>
                ) : (
                  <Pop at={44} y={24} from={0.85}>
                    <div dir="rtl" style={{...bubble, background: '#262B3D', borderTopRightRadius: 12}}>
                      فين القوائم؟
                    </div>
                  </Pop>
                )}
              </div>
              {/* outgoing */}
              <div style={{alignSelf: 'flex-start'}}>
                <Pop at={78} y={50} from={0.8}>
                  <div
                    dir="rtl"
                    style={{
                      ...bubble,
                      background: `linear-gradient(180deg, #4C9DFF, ${C.accent})`,
                      borderTopLeftRadius: 12,
                      boxShadow: `0 20px 60px rgba(46,139,255,0.5)`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 26,
                    }}
                  >
                    <div
                      style={{
                        width: 96,
                        height: 116,
                        borderRadius: 16,
                        background: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontFamily: display,
                        fontWeight: 800,
                        fontSize: 30,
                        color: '#E5484D',
                      }}
                    >
                      PDF
                    </div>
                    <div>
                      <div style={{fontSize: 46, fontWeight: 700}}>القوائم المالية</div>
                      <div style={{fontSize: 30, opacity: 0.85}}>نوفمبر · 3 قوائم</div>
                    </div>
                  </div>
                  <div
                    dir="rtl"
                    style={{
                      marginTop: 12,
                      fontFamily: text,
                      fontSize: 30,
                      fontWeight: 700,
                      color: read > 0.5 ? C.accentHi : C.mute,
                      textAlign: 'left',
                    }}
                  >
                    {read > 0.5 ? '✓✓ اتشافت' : '✓ اتبعتت'}
                  </div>
                </Pop>
              </div>
            </div>
          </Glass>
        </Pop>
      </div>

      <div style={{position: 'absolute', right: 120, top: 280, width: 720}}>
        <Pop at={20} out={74}>
          <Words size={70} weight={700} words={[{t: 'المدير هيسألك', at: 20}]} style={{textAlign: 'right'}} />
          <Words
            size={124}
            glow
            color={C.accentHi}
            words={[
              {t: 'فين', at: 46},
              {t: 'القوائم؟', at: 54},
            ]}
            style={{textAlign: 'right'}}
          />
        </Pop>
      </div>
      <div style={{position: 'absolute', right: 120, top: 280, width: 720}}>
        <Pop at={80}>
          <Words size={78} weight={700} words={[{t: 'تبعتهاله', at: 80}]} style={{textAlign: 'right'}} />
          <Words
            size={140}
            glow
            color={C.accentHi}
            words={[
              {t: 'وهو', at: 106},
              {t: 'واقف', at: 118},
            ]}
            style={{textAlign: 'right'}}
          />
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

// 1423 – 1519 (local 0 – 96)
export const Week: React.FC = () => {
  const frame = useCurrentFrame();
  const collapse = enter(frame, 76, 14);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 150, left: 0, right: 0}}>
        <Pop at={0} out={74} y={0} from={1} blur={0}>
          <Words size={76} weight={700} words={[{t: 'والقفلة اللي كانت', at: 0}]} />
          <Words
            size={150}
            words={[
              {t: 'بتاكل', at: 40, color: C.red},
              {t: 'أسبوع', at: 52, color: C.red},
            ]}
          />
        </Pop>
      </div>
      <div style={{position: 'absolute', top: 150, left: 0, right: 0}}>
        <Pop at={78} y={30}>
          <Words size={170} words={[{t: 'تخلص', at: 78, color: C.green}]} />
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
          gap: 22 * (1 - collapse),
        }}
      >
        {DAYS.map((d, i) => {
          const p = enter(frame, 8 + i * 3, 14);
          const fill = lin(frame, 22 + i * 6, 30 + i * 6);
          const keep = i === 0;
          const w = keep ? 210 + collapse * 470 : 210 * (1 - collapse);
          return (
            <div
              key={d}
              style={{
                width: w,
                height: 230,
                borderRadius: 30,
                overflow: 'hidden',
                opacity: p * (keep ? 1 : 1 - collapse),
                translate: `0px ${(1 - p) * 60}px`,
                background: keep && collapse > 0.5 ? 'rgba(48,209,88,0.22)' : `rgba(255,90,79,${0.08 + fill * 0.24})`,
                border: `2px solid ${keep && collapse > 0.5 ? C.green : fill > 0.5 ? C.red : C.line}`,
                boxShadow:
                  keep && collapse > 0.5
                    ? `0 0 70px rgba(48,209,88,0.5)`
                    : fill > 0.5
                      ? '0 0 40px rgba(255,90,79,0.3)'
                      : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div
                dir="rtl"
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: keep && collapse > 0.5 ? 64 : 40,
                  color: C.ink,
                  whiteSpace: 'nowrap',
                }}
              >
                {keep && collapse > 0.5 ? 'في نفس اليوم ✓' : d}
              </div>
              {collapse < 0.5 ? (
                <div dir="rtl" style={{fontFamily: text, fontSize: 28, fontWeight: 600, color: C.red, opacity: fill}}>
                  قفلة
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 1519 – 1567 (local 0 – 48)
export const OnTime: React.FC = () => (
  <FaceFull start={1519} punches={[{at: 0, scale: 1.14}]}>
    <Floater at={6} x={1380} y={190} seed={5}>
      <Chip label="5:00 م" icon="✓" tone={C.green} size={46} />
    </Floater>
    <Caption small="وإنت مروّح" smallAt={0} big={[{t: 'في معادك', at: 12}]} size={170} />
  </FaceFull>
);
