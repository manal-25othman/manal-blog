import { siteConfig } from "@/config/site";

type AdSlotProps = {
  /** معرّف الوحدة الإعلانية من لوحة أدسنس. */
  slot?: string;
  /** ارتفاع محجوز مسبقًا — يمنع انهيار CLS عند تحميل الإعلان. */
  minHeight?: number;
};

/**
 * مساحة إعلانية محجوزة الأبعاد. قبل ضبط `NEXT_PUBLIC_ADSENSE_CLIENT`
 * لا تُصيَّر شيئًا البتّة.
 *
 * كانت تعرض إطارًا متقطّعًا مكتوبًا فيه «تُفعَّل بعد قبول أدسنس». والنيّة
 * كانت حجز الارتفاع منعًا لقفزة التخطيط، لكن الأثر أن كل مقال يحمل
 * صندوقين فارغين يقرؤهما الزائر — ومراجع أدسنس — على أنهما موضع إعلان
 * معطّل أو موقع تحت الإنشاء، وكلاهما سبب رفض. لا إعلان يعني لا أثر.
 */
export function AdSlot({ slot, minHeight = 280 }: AdSlotProps) {
  const client = siteConfig.adsense.client;

  if (!client || !slot) return null;

  return (
    <div className="my-10" style={{ minHeight }}>
      <p className="mb-1 text-[0.65rem] tracking-widest text-ink-faint">إعلان</p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block", minHeight }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
