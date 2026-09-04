import "server-only";

import fs from "node:fs";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter";

/**
 * نصوص الواجهة التي تحرّرها المالكة.
 *
 * كانت مكتوبة داخل `page.tsx`، فتغييرُ كلمةٍ في الرئيسية يحتاج تعديل كود
 * ودفعًا — أي أنها كانت خارج متناولها. صارت في `content/settings/` تحرّرها
 * من `/admin` كما تحرّر أي مقال.
 *
 * والقيم الاحتياطية هنا ليست زينة: الحقل الذي يُفرَّغ بالخطأ من المحرّر
 * يترك فراغًا في الصفحة الرئيسية بلا أن يسقط البناء، فلا يراه أحد حتى
 * يشتكي قارئ. فالقيمة الاحتياطية تُبقي الصفحة قائمة، و`check:content`
 * يرفض الفراغ قبل أن يصل.
 */
const DIR = path.join(process.cwd(), "content", "settings");

function read(file: string) {
  const full = path.join(DIR, `${file}.md`);
  if (!fs.existsSync(full)) return { data: {}, body: "" };
  return parseFrontmatter(fs.readFileSync(full, "utf8"));
}

/** نصّ غير فارغ من الملف، وإلّا الاحتياطي. */
function text(data: Record<string, unknown>, key: string, fallback: string): string {
  const value = String(data[key] ?? "").trim();
  return value || fallback;
}

export type Principle = { title: string; body: string };

export type HomeCopy = {
  badge: string;
  titleTop: string;
  titleAccent: string;
  lead: string;
  primaryCta: string;
  secondaryCta: string;
  statArticles: string;
  statCategories: string;
  statReferences: string;
  trustNote: string;
  scopeLabel: string;
  principlesTitle: string;
  principles: Principle[];
};

/**
 * يزيل تشديد الماركداون من عنوان المبدأ.
 *
 * العنوان يُعرض نصًّا خامًّا لا ماركداون، والمحرّرة تكتب في حقل يقبل
 * الماركداون — فكتبت `### **القياس قبل الرأي**` فظهرت النجمات للقارئ.
 * وهي كتابة مشروعة في محرّر ماركداون، فالخلل في القراءة لا في الكتابة.
 */
function stripEmphasis(text: string): string {
  let out = text.trim().replace(/\s*#+\s*$/, "");
  let previous: string;
  do {
    previous = out;
    out = out.replace(/(\*\*|__|\*|_)(.+?)\1/g, "$2");
  } while (out !== previous);
  return out.trim();
}

/** المبادئ تُكتب في المتن `### عنوان` ثم فقرة — المحلّل لا يقرأ الكائنات المتشعّبة. */
export function parsePrinciples(body: string): Principle[] {
  return body
    .split(/^#{2,4}\s+/m)
    .slice(1)
    .map((block) => {
      const [head, ...rest] = block.split("\n");
      return { title: stripEmphasis(head), body: rest.join("\n").trim() };
    })
    .filter((p) => p.title && p.body);
}

export function getHomeCopy(): HomeCopy {
  const { data, body } = read("home");
  return {
    badge: text(data, "badge", "مدونة عربية متخصصة"),
    titleTop: text(data, "titleTop", "هندسة أنظمة الذكاء الاصطناعي"),
    titleAccent: text(data, "titleAccent", "بالقياس لا بالانطباع."),
    lead: text(data, "lead", "مقالات هندسية بمراجع أوّلية وكود يعمل."),
    primaryCta: text(data, "primaryCta", "ابدأ من المقالات"),
    secondaryCta: text(data, "secondaryCta", "اشترك في النشرة"),
    statArticles: text(data, "statArticles", "مقالًا منشورًا"),
    statCategories: text(data, "statCategories", "تصنيفًا"),
    statReferences: text(data, "statReferences", "مرجعًا"),
    trustNote: text(data, "trustNote", ""),
    scopeLabel: text(data, "scopeLabel", "نطاق التغطية"),
    principlesTitle: text(data, "principlesTitle", "كيف نكتب هنا"),
    principles: parsePrinciples(body),
  };
}

export type AuthorCopy = { name: string; role: string; bio: string };

export function getAuthor(): AuthorCopy {
  const { data, body } = read("author");
  return {
    name: text(data, "name", "منال عثمان"),
    role: text(data, "role", "مهندسة أنظمة ذكاء اصطناعي تطبيقية"),
    bio: body.trim(),
  };
}
