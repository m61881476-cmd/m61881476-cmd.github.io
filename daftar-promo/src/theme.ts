import {loadFont} from '@remotion/fonts';
import {Easing, interpolate, staticFile} from 'remotion';

export const display = 'Alexandria';
export const text = 'IBM Plex Sans Arabic';

const ARABIC =
  'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC';
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const faces: [string, string, string[]][] = [
  [display, 'alexandria', ['500', '700', '800']],
  [text, 'ibm-plex-sans-arabic', ['400', '500', '600', '700']],
];

// Fonts ship with the project so renders never depend on the network.
await Promise.all(
  faces.flatMap(([family, file, weights]) =>
    weights.flatMap((weight) =>
      (['arabic', 'latin'] as const).map((subset) =>
        loadFont({
          family,
          url: staticFile(`fonts/${file}-${subset}-${weight}-normal.woff2`),
          weight,
          unicodeRange: subset === 'arabic' ? ARABIC : LATIN,
        }),
      ),
    ),
  ),
);

export const C = {
  bg: '#04060C',
  navy: '#0A1630',
  accent: '#2E8BFF',
  accentHi: '#8CC2FF',
  ink: '#F5F8FF',
  mute: 'rgba(214,226,255,0.62)',
  faint: 'rgba(214,226,255,0.14)',
  line: 'rgba(140,190,255,0.22)',
  green: '#30D158',
  red: '#FF5A4F',
  yellow: '#FFD60A',
};

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

/** 0 → 1 starting at `at`, over `dur` frames, with a soft landing. */
export const enter = (frame: number, at: number, dur = 16) =>
  interpolate(frame, [at, at + dur], [0, 1], {...clamp, easing: ease});

/** Linear 0 → 1 between two frames. */
export const lin = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], clamp);
