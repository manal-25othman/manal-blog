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

const SETS = [
  {
    dir: path.join(process.cwd(), "content", "categories"),
    out: path.join(process.cwd(), "src", "config", "categories.data.json"),
    label: "تصنيفات المقالات",
    withAccent: true,
  },
  {
    dir: path.join(process.cwd(), "content", "tool-categories"),
    out: path.join(process.cwd(), "src", "config", "tool-categories.data.json"),
    label: "تصنيفات الأدوات",
    withAccent: false,
  },
];

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

for (const { dir, out, label, withAccent } of SETS) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  const problems = [];
  const entries = [];

  for (const file of files.sort()) {
    const slug = file.replace(/\.md$/, "");
    const { data, body } = parse(await readFile(path.join(dir, file), "utf8"));

    const name = String(data.name ?? "").trim();
    if (!name) problems.push(`${file}: بلا اسم`);

    const order = Number(data.order);
    const entry = {
      slug: String(data.slug ?? slug).trim() || slug,
      name,
      short: String(data.short ?? name).trim() || name,
      description: body,
      order: Number.isFinite(order) ? order : 999,
    };

    if (withAccent) {
      // اللون يدخل مباشرةً في الأغلفة المولَّدة، فقيمة غير صالحة تُفسد الصورة.
      let accent = String(data.accent ?? "").trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(accent)) {
        if (accent) problems.push(`${file}: لون «${accent}» غير صالح — استُبدل بلون محايد`);
        accent = "#6B7C93";
      }
      entry.accent = accent;
      entry.subtopics = Array.isArray(data.subtopics) ? data.subtopics : [];
    }

    entries.push(entry);
  }

  entries.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

  const seen = new Set();
  for (const c of entries) {
    if (seen.has(c.slug)) problems.push(`تصنيف مكرّر: «${c.slug}»`);
    seen.add(c.slug);
  }

  if (entries.length === 0) {
    console.error(`✗ لا يوجد أي تصنيف في ${dir} — الموقع لا يقوم بلا تصنيف واحد على الأقل.`);
    process.exit(1);
  }

  await writeFile(out, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  for (const problem of problems) console.warn(`⚠︎ ${problem}`);
  console.log(`✓ ${entries.length} من ${label}.`);
}
