/**
 * يحوّل مسوّدة خام (مخرجات بحث خارجي) إلى مقال بصيغة الموقع.
 *
 * الاستعمال: ضعي الملفّ الخام في `drafts/<المعرّف>.md` ثم:
 *   npm run draft -- <المعرّف> <التصنيف>
 *
 * المقال يُكتب **مسوّدةً مخفيّة** (`status: draft`) دائمًا: لا ينشر شيئًا،
 * ولا يظهر لقارئ حتى تراجعيه وتزيلي الحالة من المحرّر. هذه بوّابة الموافقة
 * البشرية التي تقوم عليها سياسة تحرير الموقع.
 *
 * القواعد أدناه ليست تخمينًا: كل واحدة عيبٌ ظهر فعلًا في دفعة سابقة
 * وصُحّح يدويًّا. تشفيرها هنا يمنع تكراره.
 */
import fs from "node:fs";
import path from "node:path";

import { categoryBySlug } from "../src/config/categories";
import { todayIso } from "../src/lib/publication";

const [slug, category] = process.argv.slice(2);

if (!slug || !category) {
  console.error("الاستعمال: npm run draft -- <المعرّف> <التصنيف>");
  console.error(`التصنيفات: ${[...categoryBySlug.keys()].join(" · ")}`);
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`✗ المعرّف «${slug}»: حروف إنجليزية صغيرة وأرقام وشرطات فقط.`);
  process.exit(1);
}
if (!categoryBySlug.has(category)) {
  console.error(`✗ تصنيف غير معروف: «${category}»`);
  console.error(`المتاح: ${[...categoryBySlug.keys()].join(" · ")}`);
  process.exit(1);
}

const source = path.join(process.cwd(), "drafts", `${slug}.md`);
const target = path.join(process.cwd(), "content", "articles", `${slug}.md`);

if (!fs.existsSync(source)) {
  console.error(`✗ لا يوجد ملف: drafts/${slug}.md`);
  process.exit(1);
}
if (fs.existsSync(target)) {
  console.error(`✗ المقال موجود مسبقًا: content/articles/${slug}.md`);
  console.error("  احذفيه أوّلًا إن أردت استبداله، أو اختاري معرّفًا آخر.");
  process.exit(1);
}

let text = fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n").trim();
const notes: string[] = [];
const warn = (message: string) => notes.push(message);

/** يُطبَّق التنظيف ويُحصى أثره، فتعرفين ما غُيّر لا أن تثقي عمياء. */
function clean(pattern: RegExp, replacement: string, label: string) {
  const hits = text.match(pattern);
  if (!hits) return;
  text = text.replace(pattern, replacement);
  warn(`${label}: ${hits.length}`);
}

// علامات الاستشهاد الرقمية [31][35] — تُدرجها أدوات البحث ولا معنى لها هنا.
clean(/\[\d{1,3}\]/g, "", "علامات استشهاد رقمية حُذفت");

// «[cite: نص]» يخرج أحيانًا نصًّا حرفيًّا بدل رابط.
clean(/\[cite:[^\]]*\]/gi, "", "علامات cite حُذفت");

// روابط داخلية بلا بادئة القسم تعطي 404.
clean(/\]\(\/(?!articles\/|tools\/|categories\/|about|contact|search)([a-z0-9-]+)\)/g,
  "](/articles/$1)", "روابط داخلية صُحّحت");

// LaTeX لا يُصيَّر في متن الموقع.
clean(/\\\(|\\\)|\\\[|\\\]/g, "", "أقواس LaTeX حُذفت");

// أسطر فارغة متتالية.
text = text.replace(/\n{3,}/g, "\n\n");

// ── ما لا يُصلَح آليًّا: يُبلَّغ ولا يُخمَّن ────────────────────
const cjk = text.match(/[　-鿿가-힯]/g);
if (cjk) warn(`⚠ محارف صينية/يابانية: ${cjk.length} — راجعيها`);

// المسح بالكلمات لا بـ`\b`: حدود الكلمات في جافاسكربت معرَّفة على المحارف
// اللاتينية وحدها، فلا تتحقّق بعد حرف عربي — والتكرار العربي هو المقصود هنا.
const tokens = text.split(/\s+/).map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""));
const doubled = tokens.filter(
  (word, i) => word.length > 1 && i > 0 && word === tokens[i - 1] && !/^\d+$/.test(word),
);
if (doubled.length) {
  warn(`⚠ كلمات مكرّرة: ${[...new Set(doubled)].slice(0, 5).join(" · ")}`);
}

const bare = text.match(/https?:\/\/\S+/g)?.filter((u) => !text.includes(`](${u}`));
if (bare?.length) warn(`⚠ روابط غير مرتبطة بنصّ: ${bare.length}`);

// العنوان من أوّل ترويسة، ويُزال من المتن كي لا يتكرّر مع عنوان الصفحة.
const heading = /^#\s+(.+)$/m.exec(text);
const title = heading?.[1].trim() ?? "";
if (!title) warn("⚠ لا عنوان (# ...) في المسوّدة — املئي `title` يدويًّا");
else text = text.replace(heading![0], "").trim();

for (const [section, label] of [
  ["## المراجع", "قسم المراجع"],
  ["## الأسئلة الشائعة", "قسم الأسئلة الشائعة"],
] as const) {
  if (!text.includes(section)) warn(`⚠ ينقص ${label} — يرفضه فحص المحتوى`);
}
if (!/^##\s+متى/m.test(text)) warn("⚠ ينقص قسم «متى…» يحدّد حدود الحلّ");

const words = text.split(/\s+/).length;
if (words < 600) warn(`⚠ ${words} كلمة — المستهدف ٦٠٠+`);

const refs = (text.match(/\]\(https?:\/\//g) ?? []).length;
if (refs < 3) warn(`⚠ مراجع خارجية قليلة: ${refs}`);

const q = (v: string) => `"${v.replace(/"/g, "«")}"`;

const article = [
  "---",
  `title: ${q(title)}`,
  `slug: ${q(slug)}`,
  "seoTitle: \"\"",
  "description: \"\"",
  `category: ${category}`,
  "tags: []",
  `published: ${todayIso()}`,
  "featured: false",
  // بوّابة الموافقة: لا يظهر لأحد حتى تزيلي هذه الحالة بنفسك.
  "status: draft",
  "takeaways:",
  '  - ""',
  '  - ""',
  '  - ""',
  "---",
  "",
  text,
  "",
].join("\n");

fs.writeFileSync(target, article, "utf8");

console.log(`✓ content/articles/${slug}.md — مسوّدة مخفيّة، لا تظهر لأحد.`);
console.log(`  ${words} كلمة · ${refs} مرجعًا خارجيًّا`);
if (notes.length) {
  console.log("\nالتنظيف والملاحظات:");
  for (const note of notes) console.log(`  ${note}`);
}
console.log("\nيبقى عليك في المحرّر:");
console.log("  ١. عنوان السيو والوصف (٨٠–٢٠٠ حرفًا) والوسوم وثلاث نقاط خلاصة");
console.log("  ٢. افتحي كل مرجع وتأكّدي أنه يقول ما نُسب إليه");
console.log("  ٣. احذفي «مسوّدة» من حالة النشر — عندها فقط يُنشر");
