import {Composition} from 'remotion';
import {DURATION, Main} from './Main';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DaftarPromo"
      component={Main}
      durationInFrames={DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
