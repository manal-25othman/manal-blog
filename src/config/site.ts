/**
 * الإعدادات المركزية للموقع. كل قيمة تظهر في السيو أو الترويسة أو الذيل
 * تُقرأ من هنا، فلا تتناثر النصوص في المكوّنات.
 */

/** النطاق الافتراضي حين لا تُضبط البيئة أو تُضبط بقيمة لا تصلح. */
const FALLBACK_URL = "https://isnadblog.com";

/**
 * يقرأ نطاق الموقع من البيئة ويصحّحه.
 *
 * السبب صريح: `??` لا يلتقط إلا `undefined`، فمتغيّر بيئة مضبوط على نصّ
 * فارغ — وهو ما تُنتجه لوحة Vercel عند إضافة مفتاح بلا قيمة — كان يمرّ
 * كما هو إلى `new URL()` فيسقط البناء كلّه بـ«Invalid URL». والنطاق
 * المكتوب بلا `https://` يسقطه أيضًا.
 *
 * القاعدة هنا: البناء لا ينهار بسبب إعداد خاطئ. يُصحَّح ما يمكن تصحيحه،
 * ويُرجَع إلى الافتراضي فيما لا يُصحَّح — ويكشفه `npm run prelaunch`.
 */
function resolveSiteUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return FALLBACK_URL;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    // `origin` يُسقط المسار والشرطة الأخيرة، فتتّسق كل الروابط المبنيّة عليه.
    return new URL(withScheme).origin;
  } catch {
    return FALLBACK_URL;
  }
}

/** رابط خارجي لا يُعرض إلا إذا كان صالحًا فعلًا — لا نصف رابط ولا مسار نسبي. */
function externalUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export const siteConfig = {
  name: "إسناد",
  nameLatin: "Isnad",
  /** يُقرأ من البيئة عند النشر ويُصحَّح؛ القيمة الافتراضية للتطوير المحلي. */
  url: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  tagline: "كل ادّعاء مسنَد إلى مصدره",
  description:
    "مدونة عربية متخصصة في هندسة أنظمة الذكاء الاصطناعي التطبيقية: الاسترجاع المعزّز (RAG)، الوكلاء، تقييم النماذج، اقتصاد الاستدلال، وأمن تطبيقات النماذج اللغوية — بالقياس لا بالانطباع.",
  locale: "ar",
  /**
   * بريد حقيقي — شرط أساسي في مراجعة أدسنس. يُضبط في البيئة عند النشر.
   * لا نضع عنوانًا وهميًّا هنا: العنوان غير المضبوط يعني أن الواجهة تعرض
   * نموذج المراسلة بدل عنوان لا يصل إليه أحد.
   */
  email: (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim(),
  editorialEmail: (process.env.NEXT_PUBLIC_EDITORIAL_EMAIL ?? "").trim(),
  /**
   * سيرة الكاتبة انتقلت إلى `content/settings/author.md` لتحرّرها المالكة
   * من `/admin`. تُقرأ بـ`getAuthor()` في `src/lib/site-copy.ts`، ولا
   * تُكتب هنا كي لا يكون لها مصدران يتباعدان.
   */
  authorUrl: "/about",
  /**
   * حسابات الموقع. تُقرأ من البيئة ولا تُكتب هنا بقيم مُفترضة: رابط حساب
   * غير موجود يضرّ الثقة ويكسر `sameAs` في البيانات المهيكلة. غير المضبوط
   * لا يُعرض أصلًا.
   */
  social: {
    linkedin: externalUrl(process.env.NEXT_PUBLIC_LINKEDIN_URL),
    x: externalUrl(process.env.NEXT_PUBLIC_X_URL),
    github: externalUrl(process.env.NEXT_PUBLIC_GITHUB_URL),
    tiktok: externalUrl(process.env.NEXT_PUBLIC_TIKTOK_URL),
    rss: "/rss.xml",
  },
  adsense: {
    /**
     * معرّف الناشر كما يعلنه الموقع لأدسنس في علامة وصفية دائمة.
     * ثابت لا متغيّر بيئة عن قصد: التحقّق يسبق ضبط البيئة، والعلامة يجب
     * أن يجدها زاحف جوجل بلا شرط. وهو معرّف علني يظهر في كود الإعلانات.
     */
    account: "ca-pub-3196850701334707",
    /** يُفعَّل سكربت الإعلانات فقط عند ضبطه في البيئة — وبعد موافقة الزائر. */
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
  },
  analytics: {
    ga4: process.env.NEXT_PUBLIC_GA4_ID ?? "",
  },
} as const;

/** روابط الحسابات المضبوطة فعليًّا — تصلح لـ`sameAs` وللذيل. */
export function configuredProfiles(): string[] {
  return [
    siteConfig.social.linkedin,
    siteConfig.social.x,
    siteConfig.social.github,
    siteConfig.social.tiktok,
  ].filter((url): url is string => Boolean(url));
}

/** يبني رابطًا مطلقًا — مطلوب في canonical وopen graph وخريطة الموقع. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

/**
 * صورة المشاركة الافتراضية — ملف ثابت في `public/`، لا مسار يُولَّد عند الطلب.
 *
 * كانت تُولَّد من `app/opengraph-image.tsx`: دالّة بلا خادم برابط فيه معامل
 * استعلام، ترسم الصورة وتقرأ ملف الخطّ في أوّل طلب بارد. وزاحف الشبكات
 * الاجتماعية ينتظر مدّة قصيرة ثم يتخلّى عن الصورة، فتظهر البطاقة بلا صورة.
 * الملف الثابت يُقدَّم فورًا.
 *
 * ويُصدَّر من هنا لأن تعريف `openGraph` في صفحة يستبدل تعريف الجذر كاملًا
 * لا يدمجه — فالصفحة التي تعرّف `openGraph` بلا `images` تفقد صورتها
 * صامتةً. المصدر الواحد يمنع ذلك.
 */
export const OG_IMAGE = {
  url: absoluteUrl("/og.png"),
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} — هندسة أنظمة الذكاء الاصطناعي التطبيقية`,
} as const;
