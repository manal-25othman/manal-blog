/**
 * التصنيفات التي يقوم عليها الموقع.
 *
 * المصدر ملفات `content/categories/` — تُحرَّر من المحرّر كأي محتوى آخر،
 * فتُضاف تصنيفات وتُعدَّل أسماؤها بلا لمس الشيفرة. يحوّلها
 * `scripts/sync-categories.mjs` إلى JSON قبل كل بناء، ونستورده هنا
 * استيرادًا ساكنًا كي يعمل في الخادم والمتصفّح معًا.
 *
 * الترتيب هو حقل `order` في كل ملف، ومعرّف التصنيف (`slug`) هو اسم الملف
 * وهو ما يُكتب في ترويسة كل مقال.
 */
import data from "./categories.data.json";

export type Category = {
  slug: string;
  name: string;
  short: string;
  description: string;
  /** لون التصنيف في الأغلفة المولَّدة — يفرّق البطاقات في الشبكة. */
  accent: string;
  /** تُعرض في صفحة التصنيف كخريطة للمواضيع الفرعية. */
  subtopics: string[];
  /** ترتيب العرض؛ الأصغر أوّلًا. */
  order: number;
};

export const categories: Category[] = data;

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

/**
 * تصنيف احتياطي لمقال يشير إلى تصنيف محذوف. وجوده يمنع سقوط البناء كلّه
 * بسبب حذف تصنيف من المحرّر؛ و`npm run check:content` يرفض الحالة صراحةً
 * كي لا تمرّ صامتة.
 */
export const FALLBACK_CATEGORY: Category = {
  slug: "uncategorized",
  name: "غير مصنّف",
  short: "غير مصنّف",
  description: "مقالات لم يعد تصنيفها موجودًا. راجعي تصنيف المقال في المحرّر.",
  accent: "#6B7C93",
  subtopics: [],
  order: 9999,
};

/** يعيد التصنيف، أو الاحتياطي مع تحذير مطبوع — ولا يرمي أبدًا. */
export function resolveCategory(slug: string): Category {
  const found = categoryBySlug.get(slug);
  if (found) return found;
  console.warn(`⚠︎ تصنيف غير معرّف: «${slug}» — عُرض كـ«غير مصنّف». راجعي content/categories.`);
  return FALLBACK_CATEGORY;
}
