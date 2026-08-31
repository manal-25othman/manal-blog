/**
 * فحص المحتوى قبل النشر: يطبّق قواعد سياسة التحرير آليًّا.
 * يُشغَّل بـ`npm run check:content` وفي التكامل المستمر.
 */
import fs from "node:fs";
import path from "node:path";

import { parseFrontmatter } from "../src/lib/frontmatter";
import { categoryBySlug } from "../src/config/categories";
import { toolCategories } from "../src/config/tool-categories";
import { todayIso } from "../src/lib/publication";

const DIR = path.join(process.cwd(), "content", "articles");
const errors: string[] = [];
const warnings: string[] = [];

const files = fs.readdirSync(DIR).filter((file) => file.endsWith(".md"));
const seenTitles = new Set<string>();
/** تصنيف → المقالات التي تستعمله، لكشف تصنيف محذوف ما زال مستعملًا. */
const usedCategories = new Map<string, Set<string>>();

for (const file of files) {
  const slug = file.replace(/\.md$/, "");
  const { data, body } = parseFrontmatter(fs.readFileSync(path.join(DIR, file), "utf8"));
  const fail = (message: string) => errors.push(`${slug}: ${message}`);
  const warn = (message: string) => warnings.push(`${slug}: ${message}`);

  if (!/^[a-z0-9-]+$/.test(slug)) fail("الرابط يجب أن يكون لاتينيًّا صغيرًا بشرطات فقط");

  // حقل slug يقرأه محرّر Pages CMS ليبني منه اسم الملف؛ تباعده عن اسم الملف
  // يعني مقالًا يُنشر على رابط غير الذي يظنّه الكاتب.
  const declaredSlug = data.slug ? String(data.slug) : "";
  if (!declaredSlug) fail("ينقصه حقل slug — يحتاجه المحرّر لبناء اسم الملف");
  else if (declaredSlug !== slug) fail(`حقل slug «${declaredSlug}» لا يطابق اسم الملف «${slug}»`);

  const title = String(data.title ?? "");
  if (!title) fail("العنوان مفقود");
  if (seenTitles.has(title)) fail("عنوان مكرّر مع مقال آخر");
  seenTitles.add(title);

  const description = String(data.description ?? "");
  if (description.length < 80) fail(`الوصف قصير (${description.length} حرفًا) — المطلوب ١٢٠–١٧٠`);
  if (description.length > 200) warn(`الوصف طويل (${description.length} حرفًا) وسيُقتطع في نتائج البحث`);

  const articleCategory = String(data.category ?? "");
  if (!usedCategories.has(articleCategory)) usedCategories.set(articleCategory, new Set());
  usedCategories.get(articleCategory)!.add(file);
  if (!categoryBySlug.has(articleCategory)) fail("تصنيف غير معرّف");
  if (!Array.isArray(data.tags) || data.tags.length === 0) fail("لا وسوم");
  const published = String(data.published ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) {
    fail("تاريخ النشر بصيغة غير صحيحة");
  } else if (published > todayIso() && String(data.status ?? "") !== "scheduled") {
    // تاريخ مستقبلي بلا إعلان جدولة: خطأ تحريري، لا خيار تصميم.
    fail(`تاريخ نشر مستقبلي (${published}) بلا \`status: scheduled\``);
  }

  const takeaways = Array.isArray(data.takeaways) ? data.takeaways : [];
  if (takeaways.length < 3) fail("المطلوب ٣ نقاط خلاصة على الأقل");

  // قواعد البنية المفروضة في سياسة التحرير.
  if (!/^##\s+المراجع\s*$/m.test(body)) fail("لا يوجد قسم مراجع");
  if (!/^##\s+الأسئلة الشائعة\s*$/m.test(body)) fail("لا يوجد قسم أسئلة شائعة");
  // العرف التحريري: قسم يبدأ بـ«متى» يحدّد حدود الحلّ — متى يصلح ومتى لا.
  // بلا `\b`: حدود الكلمات في جافاسكربت معرَّفة على المحارف اللاتينية وحدها،
  // فلا تتحقّق بعد حرف عربي.
  if (!/^##\s+متى/m.test(body)) {
    warn("لا يوجد قسم «متى…» يحدّد حدود الحلّ — سياسة التحرير تشترطه");
  }

  const links = body.match(/\]\((https?:\/\/[^)]+)\)/g) ?? [];
  if (links.length < 3) warn(`مراجع خارجية قليلة (${links.length})`);

  const words = body.trim().split(/\s+/).length;
  if (words < 450) fail(`المقال قصير (${words} كلمة) — الحدّ ٤٥٠ كلمة`);
  else if (words < 600) warn(`${words} كلمة — المستهدف ٦٠٠+ لمقال يتنافس في البحث`);
}

/**
 * تصنيفات المقالات صارت محتوى في `content/categories/`، ويقرأها المحرّران
 * بالإسناد لا بقائمة منسوخة — فالفحص هنا يتأكّد أن الإسناد باقٍ. لو عاد
 * أحدهم إلى قائمة ثابتة، رجع الخلل الذي أخفى ثمانية عشر مقالًا عن المحرّر.
 *
 * تصنيفات الأدوات تبقى في الشيفرة لأنها بنية الدليل لا محتواه، فتُقارن نصًّا.
 */
function checkEditorConfigs() {
  const configs = [
    { file: ".pages.yml", label: "Pages CMS", ref: /collection:\s*categories/ },
    { file: path.join("public", "admin", "config.yml"), label: "المحرّر المدمج", ref: /collection:\s*categories/ },
  ];

  for (const { file, label, ref } of configs) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) {
      errors.push(`${label}: ملف الإعدادات ${file} مفقود`);
      continue;
    }
    const text = fs.readFileSync(full, "utf8");

    if (!ref.test(text)) {
      errors.push(`${label} (${file}): حقل تصنيف المقال لا يُسند إلى مجموعة «categories»`);
    }
    if (!/(name:\s*categories|- name: categories)/.test(text)) {
      errors.push(`${label} (${file}): مجموعة «التصنيفات» غير معرّفة — لن تُضاف تصنيفات من المحرّر`);
    }
    for (const slug of toolCategories.map((c) => c.slug)) {
      if (!new RegExp(`value:\\s*"?${slug}"?\\s*[,}\\n]`).test(text)) {
        errors.push(`${label} (${file}): تصنيف الأدوات «${slug}» غير مدرج`);
      }
    }
  }
}

/** كل تصنيف يشير إليه مقال موجود فعلًا، وكل تصنيف موجود صالح. */
function checkCategoryFiles() {
  const dir = path.join(process.cwd(), "content", "categories");
  if (!fs.existsSync(dir)) {
    errors.push("مجلّد content/categories مفقود — الموقع لا يقوم بلا تصنيفات");
    return;
  }

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
    const slug = String(data.slug ?? "").trim();

    if (slug !== file.replace(/\.md$/, "")) {
      errors.push(`categories/${file}: المعرّف «${slug}» لا يطابق اسم الملف`);
    }
    if (!String(data.name ?? "").trim()) errors.push(`categories/${file}: بلا اسم`);
    if (!String(data.short ?? "").trim()) errors.push(`categories/${file}: بلا اسم مختصر`);
    if (!/^#[0-9a-fA-F]{6}$/.test(String(data.accent ?? ""))) {
      errors.push(`categories/${file}: اللون «${String(data.accent ?? "")}» غير صالح`);
    }
    if (!body.trim()) errors.push(`categories/${file}: بلا وصف`);
  }

  // تصنيف حُذف وما زالت مقالاته تشير إليه: الموقع يعرضها «غير مصنّف».
  for (const [slug, articles] of usedCategories) {
    if (categoryBySlug.has(slug)) continue;
    const owners = [...articles].slice(0, 3).join("، ");
    errors.push(`التصنيف «${slug}» غير موجود في content/categories، وتشير إليه مقالات: ${owners}`);
  }
}

checkEditorConfigs();
checkCategoryFiles();

/**
 * صور الأدوات. البناء يتجاهل الصورة الخاطئة كي لا يسقط الموقع بسبب صورة،
 * فلولا هذا الفحص لمرّت الصورة المفقودة صامتة: المدخل يظهر بحرفه الأول
 * والمحرّرة تظنّ أنها رفعت صورة.
 */
function checkToolImages() {
  const dir = path.join(process.cwd(), "content", "tools");
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
    const logo = String(data.logo ?? "").trim();
    if (!logo) continue;

    if (!/^\/uploads\/[\w./-]+$/.test(logo) || logo.includes("..")) {
      errors.push(`${file}: مسار الصورة «${logo}» غير مقبول — ارفعيها من المحرّر ليبدأ بـ /uploads/`);
      continue;
    }
    if (!fs.existsSync(path.join(process.cwd(), "public", logo))) {
      errors.push(`${file}: الصورة «${logo}» غير موجودة في public — لن تظهر`);
    }
  }
}

checkToolImages();

console.log(`فُحص ${files.length} مقالًا.`);
for (const warning of warnings) console.log(`⚠︎  ${warning}`);
for (const error of errors) console.error(`✗  ${error}`);

if (errors.length > 0) {
  console.error(`\nفشل الفحص: ${errors.length} خطأ.`);
  process.exit(1);
}
console.log("✓ اجتاز كل المقالات فحص سياسة التحرير.");
