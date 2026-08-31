import Image from "next/image";

/**
 * صورة الأداة في الدليل.
 *
 * الصورة اختيارية عمدًا: الدليل يبقى مكتملًا بلا صور، لأن ملء الشبكة
 * بشعارات مفقودة أسوأ من عدمها. حين لا توجد صورة يُرسم حرف الأداة الأول
 * في المربّع نفسه بالمقاس نفسه، فلا تختلّ محاذاة البطاقات.
 *
 * الصور محلّية (`/uploads/…`) لا خارجية — `src/lib/tools.ts` يرفض غير ذلك.
 */
export function ToolLogo({
  logo,
  logoAlt,
  name,
  nameLatin,
  size = 44,
  className = "",
}: {
  logo?: string;
  logoAlt?: string;
  name: string;
  nameLatin: string;
  size?: number;
  className?: string;
}) {
  const box =
    "shrink-0 overflow-hidden rounded-xl border border-line bg-surface-soft " + className;

  if (logo) {
    return (
      <span className={box} style={{ width: size, height: size, display: "block" }}>
        <Image
          src={logo}
          alt={logoAlt || `شعار ${name}`}
          width={size}
          height={size}
          // `contain` لا `cover`: الشعار يُقصّ إذا مُلئ المربّع قسرًا.
          className="h-full w-full object-contain p-1.5"
        />
      </span>
    );
  }

  // الحرف اللاتيني الأول — أسماء المنتجات لاتينية، والحرف يبقى مميّزًا عند ٤٤ بكسل.
  const initial = (nameLatin.trim()[0] ?? name.trim()[0] ?? "•").toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`${box} grid place-items-center font-display font-bold text-ink-faint`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}
