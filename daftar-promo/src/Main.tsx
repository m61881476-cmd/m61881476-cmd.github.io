import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Background} from './Background';
import {clamp} from './theme';
import {Demo, Scan} from './scenes/Demo';
import {Hook} from './scenes/Hook';
import {Manager, OnTime, Week} from './scenes/Manager';
import {NotYou, RealJob} from './scenes/NotYou';
import {CTA, Founder} from './scenes/Outro';
import {Pain} from './scenes/Pain';
import {Approve, Statements} from './scenes/Statements';

/** Graphic scenes share one stage and dissolve at their edges. */
const Stage: React.FC<{
  readonly duration: number;
  readonly children: React.ReactNode;
}> = ({duration, children}) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 7], [0, 1], clamp);
  const b = interpolate(frame, [duration - 6, duration], [1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: a * b,
        scale: 1.035 - 0.035 * a + (1 - b) * 0.03,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const SCENES: readonly {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly face?: boolean;
  readonly el: React.ReactNode;
}[] = [
  {name: 'Hook', from: 0, to: 192, face: true, el: <Hook />},
  {name: 'Pain', from: 192, to: 437, el: <Pain />},
  {name: 'Not you', from: 437, to: 550, face: true, el: <NotYou />},
  {name: 'Real job', from: 550, to: 726, el: <RealJob />},
  {name: 'Demo', from: 726, to: 948, el: <Demo />},
  {name: 'Scan + posting', from: 948, to: 1078, el: <Scan />},
  {name: 'Statements', from: 1078, to: 1197, el: <Statements />},
  {name: 'Approve', from: 1197, to: 1277, el: <Approve />},
  {name: 'Manager', from: 1277, to: 1423, el: <Manager />},
  {name: 'Week', from: 1423, to: 1519, el: <Week />},
  {name: 'On time', from: 1519, to: 1567, face: true, el: <OnTime />},
  {name: 'Founder', from: 1567, to: 1707, face: true, el: <Founder />},
  {name: 'CTA', from: 1707, to: 1870, el: <CTA />},
];

export const DURATION = 1870;

export const Main: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#04060C'}}>
    <Background />
    {SCENES.map((s) => (
      <Sequence key={s.name} name={s.name} from={s.from} durationInFrames={s.to - s.from}>
        {s.face ? s.el : <Stage duration={s.to - s.from}>{s.el}</Stage>}
      </Sequence>
    ))}
    <Audio src={staticFile('voice.wav')} />
  </AbsoluteFill>
);
