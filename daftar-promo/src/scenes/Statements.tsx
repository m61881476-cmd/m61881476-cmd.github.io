import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FaceCard} from '../Face';
import {C, display, enter, lin, text} from '../theme';
import {Check, Glass, Pop, Words} from '../ui';

const Statement: React.FC<{
  readonly at: number;
  readonly doneAt: number;
  readonly title: string;
  readonly kind: number;
}> = ({at, doneAt, title, kind}) => {
  const frame = useCurrentFrame();
  const done = enter(frame, doneAt, 12);
  return (
    <Pop at={at} y={110}>
      <Glass
        style={{width: 480, height: 400, padding: 36, position: 'relative'}}
        glow={done > 0.5 ? 'rgba(48,209,88,0.30)' : undefined}
      >
        <div dir="rtl" style={{fontFamily: display, fontWeight: 800, fontSize: 46, color: C.ink}}>
          {title}
        </div>
        <div style={{marginTop: 30, display: 'flex', flexDirection: 'column', gap: 22}}>
          {[0, 1, 2, 3].map((i) => {
            const w = [0.9, 0.62, 0.78, 0.5][(i + kind) % 4];
            const p = enter(frame, at + 8 + i * 4, 16);
            return (
              <div key={i} dir="rtl" style={{display: 'flex', alignItems: 'center', gap: 16}}>
                <div
                  style={{
                    width: 300 * w * p,
                    height: 20,
                    borderRadius: 10,
                    background:
                      i === 3
                        ? `linear-gradient(90deg, ${C.accentHi}, ${C.accent})`
                        : 'rgba(170,205,255,0.30)',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: C.faint,
                  }}
                />
                <div style={{width: 70, height: 16, borderRadius: 8, background: 'rgba(214,226,255,0.5)', opacity: p}} />
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 30,
            bottom: 28,
            width: 68,
            height: 68,
            borderRadius: 999,
            background: C.green,
            boxShadow: `0 0 36px ${C.green}`,
            display: 'grid',
            placeItems: 'center',
            opacity: done,
            scale: 0.4 + 0.6 * done,
          }}
        >
          <Check size={42} />
        </div>
      </Glass>
    </Pop>
  );
};

// 1078 – 1197 (local 0 – 119)
export const Statements: React.FC = () => {
  const frame = useCurrentFrame();
  const press = Math.sin(Math.PI * lin(frame, 58, 70));
  const ring = lin(frame, 62, 84);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 80, left: 0, right: 0}}>
        <Words
          size={120}
          glow
          words={[
            {t: 'والقوائم', at: 0},
            {t: 'المالية', at: 18, color: C.accentHi},
          ]}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'center',
          gap: 44,
        }}
      >
        <Statement at={8} doneAt={70} title="قائمة الدخل" kind={0} />
        <Statement at={15} doneAt={76} title="المركز المالي" kind={1} />
        <Statement at={22} doneAt={82} title="التدفقات النقدية" kind={2} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 780,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Pop at={46} from={0.7}>
          <div style={{position: 'relative'}}>
            <div
              style={{
                position: 'absolute',
                inset: -20,
                borderRadius: 999,
                border: `5px solid ${C.accentHi}`,
                opacity: ring > 0 && ring < 1 ? 1 - ring : 0,
                scale: 1 + ring * 0.5,
              }}
            />
            <div
              dir="rtl"
              style={{
                padding: '34px 90px',
                borderRadius: 999,
                background: `linear-gradient(180deg, #58A6FF, ${C.accent})`,
                boxShadow: `0 20px 70px rgba(46,139,255,0.7), inset 0 2px 0 rgba(255,255,255,0.45)`,
                fontFamily: display,
                fontWeight: 800,
                fontSize: 78,
                color: '#fff',
                scale: 1 - 0.08 * press,
              }}
            >
              بضغطة واحدة
            </div>
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

// 1197 – 1277 (local 0 – 80)
export const Approve: React.FC = () => {
  const frame = useCurrentFrame();
  const on = enter(frame, 46, 12);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 250}}>
        <Pop at={0} x={-80} y={0}>
          <FaceCard start={1197} width={860} />
        </Pop>
      </div>
      <div style={{position: 'absolute', right: 110, top: 250, width: 800}}>
        <Words
          size={78}
          weight={700}
          words={[{t: 'وإنت اللي', at: 0}]}
          style={{textAlign: 'right'}}
        />
        <Words
          size={130}
          glow
          color={C.accentHi}
          words={[
            {t: 'بتراجع', at: 12},
            {t: 'وتعتمد', at: 26},
          ]}
          style={{textAlign: 'right'}}
        />
        <Pop at={34} style={{marginTop: 44}}>
          <Glass
            style={{
              padding: '30px 38px',
              display: 'flex',
              flexDirection: 'row-reverse',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            glow={on > 0.5 ? 'rgba(48,209,88,0.35)' : undefined}
          >
            <div dir="rtl">
              <div style={{fontFamily: text, fontSize: 30, color: C.mute, fontWeight: 600}}>
                قيد #1042
              </div>
              <div style={{fontFamily: display, fontSize: 50, fontWeight: 800, color: C.ink}}>
                {on > 0.5 ? 'تم الاعتماد' : 'في انتظار اعتمادك'}
              </div>
            </div>
            <div
              style={{
                width: 150,
                height: 84,
                borderRadius: 999,
                background: on > 0.5 ? C.green : 'rgba(255,255,255,0.16)',
                boxShadow: on > 0.5 ? `0 0 40px ${C.green}` : 'none',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8 + on * 66,
                  width: 68,
                  height: 68,
                  borderRadius: 999,
                  background: '#fff',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                }}
              />
            </div>
          </Glass>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};
