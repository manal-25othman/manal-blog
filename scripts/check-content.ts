/**
 * فحص المحتوى قبل النشر: يطبّق قواعد سياسة التحرير آليًّا.
 * يُشغَّل بـ`npm run check:content` وفي التكامل المستمر.
 */
import fs from "node:fs";
import path from "node:path";

import { parseFrontmatter } from "../src/lib/frontmatter";
import { categoryBySlug } from "../src/config/categories";
import { toolCategoryBySlug } from "../src/config/tool-categories";
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
 * التصنيفان — تصنيفات المقالات وأقسام الأدوات — صارا محتوى، ويقرأهما
 * المحرّران بالإسناد لا بقائمة منسوخة. الفحص هنا يتأكّد أن الإسناد باقٍ:
 * لو عاد أحدهم إلى قائمة ثابتة، رجع الخلل الذي أخفى ثمانية عشر مقالًا.
 */
function checkEditorConfigs() {
  const configs = [
    { file: ".pages.yml", label: "Pages CMS" },
    { file: path.join("public", "admin", "config.yml"), label: "المحرّر المدمج" },
  ];

  for (const { file, label } of configs) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) {
      errors.push(`${label}: ملف الإعدادات ${file} مفقود`);
      continue;
    }
    const text = fs.readFileSync(full, "utf8");

    for (const [collection, what] of [
      ["categories", "تصنيفات المقالات"],
      ["tool-categories", "أقسام الأدوات"],
    ]) {
      if (!new RegExp(`collection:\\s*${collection}\\b`).test(text)) {
        errors.push(`${label} (${file}): حقل التصنيف لا يُسند إلى مجموعة «${collection}» (${what})`);
      }
      if (!new RegExp(`name:\\s*${collection}\\s*$`, "m").test(text)) {
        errors.push(`${label} (${file}): مجموعة «${what}» غير معرّفة — لن تُضاف من المحرّر`);
      }
    }
  }
}

/** كل تصنيف يشير إليه مقال أو أداة موجود فعلًا، وكل تصنيف موجود صالح. */
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

  const toolDir = path.join(process.cwd(), "content", "tool-categories");
  if (!fs.existsSync(toolDir)) {
    errors.push("مجلّد content/tool-categories مفقود — دليل الأدوات لا يقوم بلا أقسام");
  } else {
    for (const file of fs.readdirSync(toolDir).filter((f) => f.endsWith(".md"))) {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(toolDir, file), "utf8"));
      const slug = String(data.slug ?? "").trim();
      if (slug !== file.replace(/\.md$/, "")) {
        errors.push(`tool-categories/${file}: المعرّف «${slug}» لا يطابق اسم الملف`);
      }
      if (!String(data.name ?? "").trim()) errors.push(`tool-categories/${file}: بلا اسم`);
      if (!body.trim()) errors.push(`tool-categories/${file}: بلا وصف`);
    }
  }

  // أداة تشير إلى قسم محذوف: الدليل يعرضها «غير مصنّفة».
  const toolsDir = path.join(process.cwd(), "content", "tools");
  if (fs.existsSync(toolsDir)) {
    for (const file of fs.readdirSync(toolsDir).filter((f) => f.endsWith(".md"))) {
      const { data } = parseFrontmatter(fs.readFileSync(path.join(toolsDir, file), "utf8"));
      const slug = String(data.category ?? "").trim();
      if (!toolCategoryBySlug.has(slug)) {
        errors.push(`tools/${file}: القسم «${slug}» غير موجود في content/tool-categories`);
      }
    }
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

/**
 * الحقول التي تقوم عليها البطاقة والتفاصيل. الحقل الناقص لا يُسقط البناء —
 * البطاقة تُخفي قسمه — فلولا هذا الفحص لمرّ ناقصًا بلا أن يُرى.
 */
function checkToolFields() {
  const dir = path.join(process.cwd(), "content", "tools");
  if (!fs.existsSync(dir)) return;

  const availability = new Set(["free", "limited-free", "paid", "usage-based"]);
  const seenSites = new Map<string, string>();

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
    const at = (msg: string) => errors.push(`tools/${file}: ${msg}`);

    const avail = String(data.availability ?? "");
    if (!availability.has(avail)) at(`الإتاحة «${avail}» غير معروفة`);

    // ترتيب غير رقمي يمرّ صامتًا ويأخذ الافتراضي، فتختفي نيّة الإبراز.
    const order = String(data.order ?? "").trim();
    if (order && !Number.isFinite(Number(order))) {
      at(`ترتيب العرض «${order}» ليس رقمًا`);
    }

    if (data.hidden !== undefined && typeof data.hidden !== "boolean") {
      at(`«إخفاء من الموقع» يجب أن يكون نعم أو لا`);
    }

    const status = String(data.status ?? "").trim();
    if (status && !["draft", "scheduled"].includes(status)) {
      at(`حالة النشر «${status}» غير معروفة`);
    }

    // سعر رقمي في أي حقل: يصير الدليل قديمًا خلال أسابيع.
    for (const key of ["description", "strength", "caveat"]) {
      const value = String(data[key] ?? "");
      if (/[\d٠-٩]+\s*(\$|دولار|ريال|USD|شهري)/i.test(value)) {
        at(`الحقل «${key}» يذكر سعرًا — استعملي حقل الإتاحة بدله`);
      }
    }

    for (const key of ["useCases", "goodFor", "limits"]) {
      if (!Array.isArray(data[key]) || (data[key] as string[]).length === 0) {
        at(`الحقل «${key}» فارغ`);
      }
    }

    // رابط مكرّر يعني على الأرجح مدخلًا مزدوجًا للأداة نفسها.
    const site = String(data.website ?? "").replace(/\/+$/, "");
    const owner = seenSites.get(site);
    if (owner) at(`يشترك مع tools/${owner} في الرابط نفسه — مدخل مكرّر؟`);
    else seenSites.set(site, file);
  }
}

checkToolFields();

console.log(`فُحص ${files.length} مقالًا.`);
for (const warning of warnings) console.log(`⚠︎  ${warning}`);
for (const error of errors) console.error(`✗  ${error}`);

if (errors.length > 0) {
  console.error(`\nفشل الفحص: ${errors.length} خطأ.`);
  process.exit(1);
}
console.log("✓ اجتاز كل المقالات فحص سياسة التحرير.");
