import React from 'react';
import {Caption, FaceFull, Floater} from '../Face';
import {C} from '../theme';
import {Chip} from '../ui';

// 0 – 192
export const Hook: React.FC = () => (
  <FaceFull
    start={0}
    punches={[
      {at: 0, scale: 1.02},
      {at: 50, scale: 1.16},
      {at: 115, scale: 1.05},
    ]}
  >
    <Floater at={58} x={1300} y={130} seed={1}>
      <Chip label="قفلة الشهر" icon="٣٠" size={52} />
    </Floater>
    <Floater at={84} x={150} y={230} seed={2}>
      <Chip label="11:47 م" icon="⏱" tone={C.red} size={52} />
    </Floater>
    <Floater at={122} x={1420} y={420} seed={3}>
      <Chip label="فواتير" icon="٤٧" tone="#5E5CE6" size={46} />
    </Floater>
    <Floater at={140} x={250} y={470} seed={4}>
      <Chip label="قيود يدوي" icon="✎" size={46} />
    </Floater>

    <Caption
      small="يا"
      big={[
        {t: 'محاسب', at: 4},
        {t: 'الشركة', at: 22},
      ]}
      out={46}
    />
    <Caption
      small="آخر مرة روّحت"
      smallAt={51}
      big={[{t: 'في معادك', at: 86}]}
      out={111}
    />
    <Caption
      small="في قفلة الشهر"
      smallAt={116}
      big={[
        {t: 'كانت', at: 160, accent: false},
        {t: 'إمتى؟', at: 170},
      ]}
    />
  </FaceFull>
);
