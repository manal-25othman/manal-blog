/**
 * حالة النشر. القاعدة واحدة ولا استثناء لها: لا يرى القارئ تاريخًا مستقبليًّا.
 *
 * المقال المؤرَّخ بعد اليوم «مجدوَل»، والمقال المعلَّم `status: draft` «مسوّدة».
 * كلاهما يُستبعد من كل واجهة عامّة: القوائم، خريطة الموقع، التغذية، البحث،
 * والمقالات ذات الصلة — ولا تُولَّد له صفحة أصلًا.
 *
 * ملاحظة تشغيلية: الموقع يُولَّد ساكنًا، فـ«اليوم» هو يوم البناء بالتوقيت
 * التحريري (انظر `EDITORIAL_TIMEZONE`). المقال
 * المجدوَل يظهر عند أول إعادة بناء بعد تاريخه (خطّاف نشر يومي في Vercel).
 */
export type PublicationStatus = "published" | "scheduled" | "draft";

/**
 * المنطقة الزمنية التحريرية للموقع.
 *
 * كان «اليوم» يُحسب بتوقيت غرينتش، والمحرّرة تكتب من الجزيرة العربية
 * (غرينتش+٣). فكل ما نُشر بين التاسعة مساءً ومنتصف الليل بتوقيتها كان
 * يحمل تاريخ الغد في نظر الموقع، فيُعدّ «مجدوَلًا» ويختفي عن القارئ حتى
 * يلحق التوقيت العالمي. حدث ذلك فعلًا مع أداة أُضيفت الواحدة فجرًا.
 *
 * التقويم الذي يُحتكم إليه هو تقويم من يضغط «نشر»، لا تقويم الخادم.
 */
export const EDITORIAL_TIMEZONE = "Asia/Riyadh";

/** `en-CA` تعطي YYYY-MM-DD مباشرةً، وهي صيغة التواريخ في الترويسات. */
const editorialDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: EDITORIAL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** تاريخ اليوم بصيغة ISO القصيرة، بالتوقيت التحريري لا بتوقيت الخادم. */
export function todayIso(now: Date = new Date()): string {
  return editorialDate.format(now);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
}

/**
 * يحسم حالة المقال من تاريخه ومن حقل `status` الاختياري.
 * أي تاريخ غير صالح يُعامل مسوّدة — الأسلم ألّا يُنشر ما لا نفهم تاريخه.
 */
export function resolveStatus(
  published: string,
  declared?: string,
  today: string = todayIso(),
): PublicationStatus {
  if (declared === "draft") return "draft";
  if (!isIsoDate(published)) return "draft";
  return published > today ? "scheduled" : "published";
}

export function isPubliclyVisible(status: PublicationStatus): boolean {
  return status === "published";
}
