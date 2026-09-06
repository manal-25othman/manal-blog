/**
 * يولّد صورة المشاركة من نصوص الرئيسية التي تحرّرها المالكة.
 *
 * كانت الصورة تحمل نصًّا محفورًا في الكود، فلمّا صارت الرئيسية قابلة
 * للتحرير من `/admin` بقيت الصورة على نصّها القديم: الموقع يقول شيئًا
 * والبطاقة المنشورة تقول غيره. وهذا أسوأ من بطاقة بلا صورة، لأن القارئ
 * يرى وعدًا ثم يفتح صفحة تقول سواه.
 *
 * تُولَّد ملفًّا ثابتًا في `public/` وقت البناء لا عند كل طلب: تعكس آخر
 * تحرير، وتُقدَّم فورًا للزواحف بلا انتظار.
 */
import fs from "node:fs";
import path from "node:path";

import { parseFrontmatter } from "../src/lib/frontmatter";
import { renderOgImage } from "../src/lib/og";

const HOME = path.join(process.cwd(), "content", "settings", "home.md");
const OUT = path.join(process.cwd(), "public", "og.png");

function field(data: Record<string, unknown>, key: string, fallback: string): string {
  return String(data[key] ?? "").trim() || fallback;
}

/** الشارة قد تحمل شرطة تفصل الوصف عن نفيه؛ الصورة تسع الشقّ الأول. */
function shorten(text: string): string {
  return text.split(/\s+—\s+/)[0].trim();
}

/**
 * ينزع النقطة الأخيرة.
 *
 * ترتيب الكلمات في الصورة يُصحَّح بعكسها، والنقطة محرف محايد الاتجاه فتنتقل
 * مع العكس إلى يسار الجملة: «بالمصدر لا بالادعاء.» تظهر «لا بالمصدر .بالادعاء».
 * والنقطة لا تلزم في عنوان مصوَّر أصلًا.
 */
function stripFinalPeriod(text: string): string {
  return text.replace(/\s*[.।]\s*$/, "").trim();
}

async function main() {
  if (!fs.existsSync(HOME)) {
    throw new Error("content/settings/home.md مفقود — لا مصدر لنصّ صورة المشاركة");
  }

  const { data } = parseFrontmatter(fs.readFileSync(HOME, "utf8"));
  const titleTop = field(data, "titleTop", "هندسة أنظمة الذكاء الاصطناعي");
  const titleAccent = field(data, "titleAccent", "");
  const eyebrow = shorten(field(data, "badge", "مدونة تقنية متخصصة"));

  // البنية تحاكي الرئيسية: شارة، ثم العنوان، ثم السطر الملوّن تحته.
  const image = renderOgImage({
    eyebrow,
    title: stripFinalPeriod(titleTop),
    footer: stripFinalPeriod(titleAccent) || eyebrow,
  });

  fs.writeFileSync(OUT, Buffer.from(await image.arrayBuffer()));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`✓ public/og.png (${kb}KB) — «${titleTop}»`);
}

main().catch((error) => {
  console.error("✗ تعذّر توليد صورة المشاركة:", error);
  process.exit(1);
});
