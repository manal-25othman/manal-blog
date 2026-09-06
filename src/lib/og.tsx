import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
/** غلاف البطاقات: نسبة 16:9 لتستقيم الشبكة بلا قصّ. */
export const COVER_SIZE = { width: 1024, height: 576 };

/** الخط مرفق في المستودع؛ محرّك التوليد يحتاج ملف الخط نفسه لا اسمه. */
function loadFont(): Buffer {
  return fs.readFileSync(path.join(process.cwd(), "src/assets/alexandria-bold.ttf"));
}

/**
 * محرّك صور المشاركة يرصف الكلمات من اليسار لليمين ولا يعيد ترتيب النص العربي.
 * لذلك نقسّم العنوان إلى أسطر بأنفسنا ونعكس كلمات كل سطر، فيظهر بترتيب
 * القراءة الصحيح. كل سطر يُرسم منفردًا حتى لا يلتفّ تلقائيًّا فيختلّ الترتيب.
 *
 * والفصل بمسافة غير فاصلة (U+00A0) لا بمسافة عادية: المحرّك يقيس المسافة
 * العادية بخطّ احتياطي لا بخطّ العنوان، فتخرج فجوات عريضة غير منتظمة بين
 * الكلمات. المسافة غير الفاصلة تأتي من الخطّ نفسه فينضبط التباعد. جُرّبت
 * أربع مسافات وقُورنت الصور: العادية متباعدة، والشعرية ملتصقة، وهذه أصحّها.
 */
const WORD_SPACE = "\u00A0";

function wrap(words: string[], maxChars: number): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  let length = 0;

  for (const word of words) {
    if (length + word.length + (current.length ? 1 : 0) > maxChars && current.length) {
      lines.push(current);
      current = [];
      length = 0;
    }
    current.push(word);
    length += word.length + (current.length > 1 ? 1 : 0);
  }
  if (current.length) lines.push(current);

  return lines;
}

function toRtlLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  // الرصف الجشع يترك كلمة وحيدة في السطر الأخير («فعلًا» تحت عنوان كامل).
  // فيُعاد الرصف على عرض أضيق يوزّع الكلمات على العدد نفسه من الأسطر.
  let lines = wrap(words, maxChars);
  if (lines.length > 1) {
    const total = words.join(" ").length;
    for (let width = Math.ceil(total / lines.length); width <= maxChars; width += 1) {
      const balanced = wrap(words, width);
      if (balanced.length === lines.length) {
        lines = balanced;
        break;
      }
    }
  }

  return lines.map((line) => [...line].reverse().join(WORD_SPACE));
}

/** شعار الاستلزام المنطقي مرسومًا بالعناصر — الرمز نفسه غير موجود في الخط. */
function Mark() {
  return (
    <div
      style={{
        width: 74,
        height: 74,
        borderRadius: 21,
        background: "#0E7C86",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", right: 24, top: 19, width: 6, height: 36, borderRadius: 3, background: "#fff" }} />
      <div style={{ position: "absolute", right: 24, top: 34, width: 24, height: 6, borderRadius: 3, background: "#fff" }} />
      <div style={{ position: "absolute", right: 44, top: 29, width: 16, height: 16, borderRadius: 8, background: "#fff" }} />
    </div>
  );
}

export function renderOgImage({
  title,
  eyebrow,
  footer,
}: {
  title: string;
  eyebrow: string;
  /** سطر الأسفل. صار معطًى لا ثابتًا كي لا يتجمّد على شعار قديم. */
  footer: string;
}) {
  const font = loadFont();
  // الإسكندرية خطّ عريض؛ العرض المتاح ~١٠٤٨px، فنحسب أطول سطر يسعه المقاس.
  const fontSize = title.length > 58 ? 42 : title.length > 30 ? 48 : 54;
  const lines = toRtlLines(title, Math.floor(1048 / (fontSize * 0.62)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b1220",
          padding: "64px 76px",
          fontFamily: "Alexandria",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, alignSelf: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ color: "#E8EDF5", fontSize: 36 }}>إسناد</span>
            <span style={{ color: "#6b7c93", fontSize: 17, letterSpacing: 4 }}>ISNAD</span>
          </div>
          <Mark />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-end" }}>
          {toRtlLines(eyebrow, 46).map((line) => (
            <span key={line} style={{ color: "#2AB7C4", fontSize: 27, whiteSpace: "nowrap" }}>
              {line}
            </span>
          ))}
          {lines.map((line) => (
            <span
              key={line}
              // بلا التفاف: السطر الملتفّ تلقائيًّا يفقد ترتيب كلماته المعكوس
              style={{ color: "#E8EDF5", fontSize, lineHeight: 1.4, whiteSpace: "nowrap" }}
            >
              {line}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, alignSelf: "flex-end" }}>
          <span style={{ color: "#94a3b8", fontSize: 22 }}>
            {toRtlLines(footer, 60).join(WORD_SPACE)}
          </span>
          <div style={{ width: 88, height: 6, background: "#0E7C86", borderRadius: 999 }} />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Alexandria", data: font, style: "normal", weight: 700 }],
    },
  );
}

/**
 * غلاف البطاقة. لا يكرّر عنوان المقال — العنوان مكتوب تحته في البطاقة —
 * بل يعطي البطاقة كتلة بصرية موسومة بلون تصنيفها: شبكة خفيفة، وهالة لونية،
 * والرمز. النتيجة صور متمايزة بلا بنك صور ولا أصول خارجية.
 */
export function renderCoverImage({
  eyebrow,
  accent = "#2AB7C4",
}: {
  eyebrow: string;
  accent?: string;
}) {
  const font = loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0b1220",
          position: "relative",
          fontFamily: "Alexandria",
        }}
      >
        {/* هالة لون التصنيف */}
        <div
          style={{
            position: "absolute",
            top: -170,
            left: -120,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: accent,
            opacity: 0.22,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            right: -140,
            width: 460,
            height: 460,
            borderRadius: 999,
            background: "#0E7C86",
            opacity: 0.18,
          }}
        />

        {/* أعمدة رفيعة توحي بالبنية الهندسية */}
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 96 + index * 152,
              width: 1,
              background: "#ffffff",
              opacity: 0.06,
            }}
          />
        ))}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
            padding: "52px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: "#8fa3bd", fontSize: 20, letterSpacing: 3 }}>ISNAD</span>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#0E7C86" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16 }}>
            <span style={{ color: "#E8EDF5", fontSize: 46, lineHeight: 1.3, whiteSpace: "nowrap" }}>
              {toRtlLines(eyebrow, 40)[0]}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 120, height: 5, borderRadius: 999, background: accent }} />
              <div style={{ width: 26, height: 5, borderRadius: 999, background: accent, opacity: 0.5 }} />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...COVER_SIZE,
      fonts: [{ name: "Alexandria", data: font, style: "normal", weight: 700 }],
    },
  );
}
