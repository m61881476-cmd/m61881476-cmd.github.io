# دفتر — فيديو ترويجي (Remotion)

فيديو 1920×1080 بمعدل 30 إطارًا، مدته 62 ثانية، مبني بـ [Remotion](https://www.remotion.dev).

## التشغيل

```bash
npm install
npm run dev          # معاينة تفاعلية في Remotion Studio
npx remotion render DaftarPromo out/daftar-promo.mp4
```

## البنية

- `src/Main.tsx` — الخط الزمني: ترتيب المشاهد وتوقيتاتها بالإطارات.
- `src/scenes/` — مشهد لكل جزء من الكلام.
- `src/Face.tsx` — لقطات المتحدث (ملء الشاشة أو داخل بطاقة) والكابشن.
- `src/theme.ts` — الألوان والخطوط ومنحنيات الحركة.
- `public/talk.mp4` — اللقطات بعد القص والتنعيم وتصحيح الألوان.
- `public/voice.wav` — الصوت بعد إزالة الضوضاء وضبط المستوى.

التوقيتات في المشاهد مضبوطة على `voice.wav`، فأي تغيير في القص يستلزم تعديلها.
