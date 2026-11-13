import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FaceCard} from '../Face';
import {C, display, enter, lin, text} from '../theme';
import {Crop} from '../App';
import {Check, Pop, Words} from '../ui';

const Statement: React.FC<{
  readonly at: number;
  readonly doneAt: number;
  readonly name: string;
  readonly tilt: number;
}> = ({at, doneAt, name, tilt}) => {
  const frame = useCurrentFrame();
  const done = enter(frame, doneAt, 12);
  return (
    <Pop at={at} y={130} dur={20}>
      <div style={{position: 'relative', rotate: `${tilt}deg`}}>
        <Crop
          name={name}
          width={420}
          ratio={1550 / 995}
          glow={done > 0.5 ? 'rgba(48,209,88,0.38)' : undefined}
        />
        <div
          style={{
            position: 'absolute',
            left: -22,
            top: -22,
            width: 84,
            height: 84,
            borderRadius: 999,
            background: C.green,
            boxShadow: `0 0 40px ${C.green}`,
            display: 'grid',
            placeItems: 'center',
            opacity: done,
            scale: 0.4 + 0.6 * done,
          }}
        >
          <Check size={52} />
        </div>
      </div>
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
      <div style={{position: 'absolute', top: 36, left: 0, right: 0}}>
        <Words
          size={104}
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
          top: 208,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'center',
          gap: 60,
        }}
      >
        <Statement at={8} doneAt={70} name="fs_income" tilt={2.5} />
        <Statement at={15} doneAt={76} name="fs_balance" tilt={0} />
        <Statement at={22} doneAt={82} name="fs_cash" tilt={-2.5} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 850,
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
          <FaceCard start={1197} width={820} />
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
          <div style={{position: 'relative'}}>
            <Crop
              name="save"
              width={800}
              ratio={155 / 950}
              glow={on > 0.5 ? 'rgba(48,209,88,0.5)' : undefined}
              style={{borderRadius: 40, scale: 1 - 0.06 * Math.sin(Math.PI * lin(frame, 42, 54))}}
            />
            <div
              dir="rtl"
              style={{
                position: 'absolute',
                left: -18,
                top: -26,
                padding: '10px 26px',
                borderRadius: 999,
                background: C.green,
                boxShadow: `0 0 40px ${C.green}`,
                fontFamily: text,
                fontWeight: 700,
                fontSize: 36,
                color: '#fff',
                opacity: on,
                scale: 0.5 + 0.5 * on,
              }}
            >
              اتسجّل ✓
            </div>
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};
