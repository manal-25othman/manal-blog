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

/**
 * يكتب قوائم التصنيف في إعدادات المحرّرَين بين علامتين.
 *
 * القائمة المنسوخة يدويًّا تنفصل عن المحتوى بصمت — حدث ذلك مع «الأساسيات»
 * فاختفت ثمانية عشر مقالًا من المحرّر. والإسناد الديناميكي (`reference`)
 * لم يعمل عمليًّا فمنع الحفظ أصلًا. فالتوليد هو الحلّ: صيغة `select`
 * بسيطة يفهمها المحرّران، ومصدرها المحتوى لا نسخة منه.
 */
async function writeEditorField(file, marker, lines, indent) {
  const full = path.join(process.cwd(), file);
  const text = await readFile(full, "utf8");
  const open = `\u27e8مولَّد: ${marker}\u27e9`;
  const close = "\u27e8/مولَّد\u27e9";
  const start = text.indexOf(open);
  const end = text.indexOf(close, start);
  if (start === -1 || end === -1) {
    console.warn(`\u26a0\ufe0e ${file}: علامتا «${marker}» مفقودتان.`);
    return;
  }
  const from = text.lastIndexOf("\n", start) + 1;
  const to = text.indexOf("\n", end) + 1;
  const block = [
    `${indent}# ${open} — لا تحرّري بين العلامتين.`,
    ...lines.map((l) => `${indent}${l}`),
    `${indent}# ${close}`,
  ].join("\n");
  await writeFile(full, `${text.slice(0, from)}${block}\n${text.slice(to)}`, "utf8");
  console.log(`\u2713 ${file} — حقل «${marker}».`);
}

/**
 * يكتب قوائم التصنيف في إعدادات المحرّرَين بين علامتين.
 *
 * القائمة المنسوخة يدويًّا تنفصل عن المحتوى بصمت — حدث ذلك مع «الأساسيات»
 * فاختفت ثمانية عشر مقالًا من المحرّر. والإسناد الديناميكي (`reference`)
 * لم يعمل عمليًّا فمنع الحفظ. فالتوليد هو الحلّ: صيغة `select` بسيطة
 * يفهمها المحرّران، ومصدرها المحتوى لا نسخة منه.
 */
async function writeEditorOptions(file, marker, entries, render, indent) {
  const full = path.join(process.cwd(), file);
  let text = await readFile(full, "utf8");

  const open = `\u27e8مولَّد: ${marker}\u27e9`;
  const close = "\u27e8/مولَّد\u27e9";
  const start = text.indexOf(open);
  const end = text.indexOf(close, start);
  if (start === -1 || end === -1) {
    console.warn(`\u26a0\ufe0e ${file}: علامتا «${marker}» مفقودتان — لم تُحدَّث القائمة.`);
    return;
  }

  // من بداية سطر علامة الفتح إلى نهاية سطر علامة الإغلاق.
  const from = text.lastIndexOf("\n", start) + 1;
  const to = text.indexOf("\n", end) + 1;

  const block = [
    `${indent}# ${open} — لا تحرّري بين العلامتين؛ يعيد`,
    `${indent}# \`npm run categories\` كتابتها من المحتوى.`,
    ...entries.map((c) => `${indent}${render(c)}`),
    `${indent}# ${close}`,
  ].join("\n");

  await writeFile(full, `${text.slice(0, from)}${block}\n${text.slice(to)}`, "utf8");
  console.log(`\u2713 ${file} — قائمة «${marker}» (${entries.length}).`);
}

const written = {};

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

  written[withAccent ? "articles" : "tools"] = entries;
  await writeFile(out, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  for (const problem of problems) console.warn(`⚠︎ ${problem}`);
  console.log(`✓ ${entries.length} من ${label}.`);
}

// ── قوائم المحرّرَين ──────────────────────────────────────────
const yamlQuote = (v) => `"${String(v).replace(/"/g, "«")}"`;

for (const [key, marker] of [["articles", "article-categories"], ["tools", "tool-categories"]]) {
  const entries = written[key] ?? [];

  await writeEditorOptions(
    ".pages.yml",
    marker,
    entries,
    (c) => `- { value: ${c.slug}, label: ${yamlQuote(c.name)} }`,
    " ".repeat(12),
  );

  // المحرّر المدمج يريد الحقل كاملًا ببنية كتلية: خيارات مضمّنة داخل
  // عنصر تسلسل تكسر التحليل، وهو ما أسقط الملف في أوّل محاولة.
  await writeEditorField(
    path.join("public", "admin", "config.yml"),
    marker,
    [
      "- name: category",
      "  label: التصنيف",
      "  widget: select",
      "  options:",
      ...entries.map((c) => `    - { label: ${yamlQuote(c.name)}, value: ${c.slug} }`),
    ],
    " ".repeat(6),
  );
}
