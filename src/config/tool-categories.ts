/**
 * تصنيفات دليل الأدوات. مستقلّة عن تصنيفات المقالات لأن السؤال مختلف:
 * المقال يسأل «كيف يعمل؟»، والأداة تسأل «بم أبنيه؟».
 *
 * المصدر ملفات `content/tool-categories/` — تُحرَّر من المحرّر كأي محتوى،
 * ويحوّلها `scripts/sync-categories.mjs` إلى JSON قبل كل بناء.
 */
import data from "./tool-categories.data.json";

export type ToolCategory = {
  slug: string;
  name: string;
  short: string;
  description: string;
  order: number;
};

export const toolCategories: ToolCategory[] = data;

export const toolCategoryBySlug = new Map<string, ToolCategory>(
  toolCategories.map((category) => [category.slug, category]),
);

/**
 * حالة المصدر. «مفتوح جزئيًّا» ليس مرادفًا لمفتوح المصدر: يشمل ما تُتاح
 * أوزان نموذجه دون شيفرة المنصّة، أو ما يفتح جزءًا ويغلق الباقي. لا يوصف
 * شيء بمفتوح المصدر إلا بترخيص معلن.
 */
export const licenseLabels = {
  "open-source": "مفتوح المصدر",
  "partially-open": "مفتوح جزئيًّا",
  proprietary: "مغلق المصدر",
} as const;

/**
 * الإتاحة. أربع حالات لا أرقام: السعر يتغيّر أسرع من تحديث الصفحة، وذكره
 * يجعل الدليل قديمًا خلال أسابيع.
 */
export const availabilityLabels = {
  free: "مجانية",
  "limited-free": "مجانية محدودة",
  paid: "مدفوعة",
  "usage-based": "حسب الاستخدام",
} as const;

export const hostingLabels = {
  "self-hosted": "استضافة ذاتية",
  managed: "خدمة مُدارة",
  both: "ذاتية أو مُدارة",
} as const;

export type ToolLicense = keyof typeof licenseLabels;
export type ToolAvailability = keyof typeof availabilityLabels;
export type ToolHosting = keyof typeof hostingLabels;
