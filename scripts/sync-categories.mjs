/**
 * يحوّل ملفات `content/categories/` إلى `src/config/categories.data.json`.
 *
 * لماذا خطوة توليد بدل قراءة المجلّد مباشرةً: التصنيفات تُستعمل في مكوّن
 * بحث يعمل في المتصفّح، ولا سبيل لقراءة قرص هناك. الاستيراد الساكن لملف
 * JSON يُحزَم مع الصفحة فيعمل في الخادم والمتصفّح معًا.
 *
 * يعمل تلقائيًّا قبل `dev` و`build`، والناتج مُودَع في المستودع كي يمرّ
 * فحص الأنواع دون تشغيل السكربت أولًا.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "categories");
const OUT = path.join(process.cwd(), "src", "config", "categories.data.json");

/** محلّل مصغّر يكفي حقول التصنيف: نصّ، رقم، وقائمة بأسطر `- `. */
function parse(raw) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const end = text.indexOf("\n---", 3);
  const head = text.slice(4, end);
  const body = text.slice(end + 5).replace(/^\n+/, "").trim();

  const data = {};
  let listKey = null;
  for (const line of head.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && listKey) {
      data[listKey].push(unquote(item[1]));
      continue;
    }
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, rest] = pair;
    const value = rest.trim();
    if (value === "") {
      data[key] = [];
      listKey = key;
      continue;
    }
    listKey = null;
    data[key] = unquote(value);
  }
  return { data, body };
}

function unquote(value) {
  const v = value.trim();
  return (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))
    ? v.slice(1, -1)
    : v;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".md"));
const problems = [];

const categories = [];
for (const file of files.sort()) {
  const slug = file.replace(/\.md$/, "");
  const { data, body } = parse(await readFile(path.join(DIR, file), "utf8"));

  const name = String(data.name ?? "").trim();
  if (!name) problems.push(`${file}: بلا اسم`);

  // اللون يدخل مباشرةً في الأغلفة المولَّدة، فقيمة غير صالحة تُفسد الصورة.
  let accent = String(data.accent ?? "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(accent)) {
    if (accent) problems.push(`${file}: لون «${accent}» غير صالح — استُبدل بلون محايد`);
    accent = "#6B7C93";
  }

  const order = Number(data.order);
  categories.push({
    slug: String(data.slug ?? slug).trim() || slug,
    name,
    short: String(data.short ?? name).trim() || name,
    description: body,
    accent,
    subtopics: Array.isArray(data.subtopics) ? data.subtopics : [],
    order: Number.isFinite(order) ? order : 999,
  });
}

categories.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

const seen = new Set();
for (const c of categories) {
  if (seen.has(c.slug)) problems.push(`تصنيف مكرّر: «${c.slug}»`);
  seen.add(c.slug);
}

if (categories.length === 0) {
  console.error("✗ لا يوجد أي تصنيف في content/categories — الموقع لا يقوم بلا تصنيف واحد على الأقل.");
  process.exit(1);
}

await writeFile(OUT, `${JSON.stringify(categories, null, 2)}\n`, "utf8");
for (const problem of problems) console.warn(`⚠︎ ${problem}`);
console.log(`✓ ${categories.length} تصنيفًا من content/categories.`);
