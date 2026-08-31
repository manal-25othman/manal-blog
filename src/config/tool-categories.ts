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

/** الترخيص وطريقة التشغيل: حقائق ثابتة نسبيًّا، بخلاف الأسعار التي تتغيّر. */
export const licenseLabels = {
  "open-source": "مفتوح المصدر",
  proprietary: "مغلق المصدر",
} as const;

export const hostingLabels = {
  "self-hosted": "استضافة ذاتية",
  managed: "خدمة مُدارة",
  both: "ذاتية أو مُدارة",
} as const;

export type ToolLicense = keyof typeof licenseLabels;
export type ToolHosting = keyof typeof hostingLabels;
