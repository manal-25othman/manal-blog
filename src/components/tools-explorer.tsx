"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ToolLogo } from "@/components/tool-logo";
import {
  availabilityLabels,
  licenseLabels,
  toolCategories,
  type ToolAvailability,
  type ToolLicense,
} from "@/config/tool-categories";

export type ToolCard = {
  slug: string;
  name: string;
  nameLatin: string;
  formerName?: string;
  description: string;
  category: string;
  kind?: string;
  license: ToolLicense;
  availability: ToolAvailability;
  hasTiktok: boolean;
  logo?: string;
  logoAlt?: string;
  website: string;
  useCases: string[];
  goodFor: string[];
  limits: string[];
  audience: string[];
  strength?: string;
  caveat?: string;
  keywords: string[];
};

const ALL = "all";

/** يطابق العربية بعد تجريد التشكيل وتوحيد الألف والياء — بحث يتسامح مع الإملاء. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

/**
 * ما يُبحث فيه: الاسم الحالي والسابق واللاتيني، والمجال والتصنيف الدقيق،
 * والوصف والاستخدامات والكلمات المفتاحية. يُحسب مرّة لكل أداة لا عند كل ضغطة.
 */
function searchIndex(tool: ToolCard, categoryName: string): string {
  return normalize(
    [
      tool.name,
      tool.nameLatin,
      tool.formerName ?? "",
      tool.description,
      tool.kind ?? "",
      categoryName,
      tool.useCases.join(" "),
      tool.keywords.join(" "),
    ].join(" "),
  );
}

export function ToolsExplorer({ tools }: { tools: ToolCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [license, setLicense] = useState<string>(ALL);
  const [availability, setAvailability] = useState<string>(ALL);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const categoryNames = useMemo(
    () => new Map(toolCategories.map((item) => [item.slug, item.name])),
    [],
  );

  /**
   * لا يُعرض مرشِّح لا يطابق شيئًا: الخيار الذي يعطي صفرًا دائمًا خيارٌ ميت
   * يربك القارئ. تُحسب القيم الموجودة فعلًا، فيظهر المرشِّح من تلقائه حين
   * تُضاف أوّل أداة تحمله.
   */
  const present = useMemo(
    () => ({
      categories: new Set(tools.map((tool) => tool.category)),
      licenses: new Set(tools.map((tool) => tool.license)),
      availabilities: new Set(tools.map((tool) => tool.availability)),
    }),
    [tools],
  );

  const indexed = useMemo(
    () =>
      tools.map((tool) => ({
        tool,
        haystack: searchIndex(tool, categoryNames.get(tool.category) ?? ""),
      })),
    [tools, categoryNames],
  );

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return indexed
      .filter(({ tool, haystack }) => {
        if (category !== ALL && tool.category !== category) return false;
        if (license !== ALL && tool.license !== license) return false;
        if (availability !== ALL && tool.availability !== availability) return false;
        return !needle || haystack.includes(needle);
      })
      .map(({ tool }) => tool);
  }, [indexed, query, category, license, availability]);

  // Escape يغلق لوحة التفاصيل المفتوحة أينما كان التركيز.
  useEffect(() => {
    if (!openSlug) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenSlug(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSlug]);

  // أداة فُتحت تفاصيلها ثم رشّحها القارئ خارج النتائج: تُغلق اللوحة.
  useEffect(() => {
    if (openSlug && !results.some((tool) => tool.slug === openSlug)) setOpenSlug(null);
  }, [results, openSlug]);

  return (
    <div className="mt-10">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <label className="sr-only" htmlFor="tools-search">
          ابحث في الأدوات
        </label>
        <input
          id="tools-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالاسم الحالي أو السابق أو بما تفعله الأداة…"
          className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-signal focus:outline-none"
        />

        <div className="mt-4 flex flex-col gap-4">
          <FilterRow label="المجال">
            <Chip active={category === ALL} onClick={() => setCategory(ALL)}>
              الكل
            </Chip>
            {toolCategories
              .filter((item) => present.categories.has(item.slug))
              .map((item) => (
              <Chip
                key={item.slug}
                active={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {item.name}
              </Chip>
            ))}
          </FilterRow>

          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            <FilterRow label="الإتاحة">
              <Chip active={availability === ALL} onClick={() => setAvailability(ALL)}>
                الكل
              </Chip>
              {(Object.keys(availabilityLabels) as ToolAvailability[])
                .filter((key) => present.availabilities.has(key))
                .map((key) => (
                <Chip
                  key={key}
                  active={availability === key}
                  onClick={() => setAvailability(key)}
                >
                  {availabilityLabels[key]}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="حالة المصدر">
              <Chip active={license === ALL} onClick={() => setLicense(ALL)}>
                الكل
              </Chip>
              {(Object.keys(licenseLabels) as ToolLicense[])
                .filter((key) => present.licenses.has(key))
                .map((key) => (
                <Chip key={key} active={license === key} onClick={() => setLicense(key)}>
                  {licenseLabels[key]}
                </Chip>
              ))}
            </FilterRow>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-faint numerals-latn" role="status" aria-live="polite">
        {results.length} من {tools.length} أداة
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-ink">لا توجد أداة تطابق هذا البحث.</p>
          <p className="mt-2 text-sm text-ink-muted">
            جرّب كلمة أعمّ، أو أزل أحد المرشِّحات. الدليل مقصور على أدوات نستخدمها فعلًا في المقالات،
            فهو أضيق من قوائم «كل أدوات الذكاء الاصطناعي».
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 md:grid-cols-2">
          {results.map((tool) => (
            <li key={tool.slug}>
              <ToolEntry
                tool={tool}
                categoryName={categoryNames.get(tool.category) ?? ""}
                open={openSlug === tool.slug}
                onToggle={() => setOpenSlug(openSlug === tool.slug ? null : tool.slug)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * البطاقة: ما يُقرأ في لمحة فقط — الاسم، وسطر واحد، والمجال، وشارتان.
 * التفاصيل الطويلة خلف زرّ، فلا تزدحم الشبكة ولا يتمدّد النصّ خارج البطاقة.
 */
function ToolEntry({
  tool,
  categoryName,
  open,
  onToggle,
}: {
  tool: ToolCard;
  categoryName: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `tool-details-${tool.slug}`;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition hover:border-signal-line">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ToolLogo
            logo={tool.logo}
            logoAlt={tool.logoAlt}
            name={tool.name}
            nameLatin={tool.nameLatin}
          />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-ink">
              <Link
                href={`/tools/${tool.slug}`}
                className="transition hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                {tool.name}
              </Link>
            </h2>
            <p dir="ltr" className="mt-0.5 truncate text-xs text-ink-faint">
              {tool.nameLatin}
            </p>
            {/* الاسم السابق يظهر لأن القارئ يعرف الأداة به ويبحث عنه. */}
            {tool.formerName && (
              <p className="mt-1 text-[0.7rem] leading-5 text-ink-faint">
                المعروفة سابقًا باسم <span dir="ltr">{tool.formerName}</span>
              </p>
            )}
          </div>
        </div>
        {tool.hasTiktok && (
          <span className="shrink-0 rounded-md border border-signal-line bg-signal-soft px-2 py-1 text-[0.7rem] font-medium text-signal">
            غطّيتها في تيك توك
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-7 text-ink-muted">{tool.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Tag>{categoryName}</Tag>
        {tool.kind && <Tag>{tool.kind}</Tag>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={tool.availability === "paid" ? "neutral" : "signal"}>
          {availabilityLabels[tool.availability]}
        </Badge>
        <Badge tone={tool.license === "proprietary" ? "neutral" : "open"}>
          {licenseLabels[tool.license]}
        </Badge>
      </div>

      {/* `mt-auto` يثبّت الأزرار في أسفل كل بطاقة مهما اختلف طول الوصف. */}
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <a
          href={tool.website}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="rounded-xl bg-signal px-4 py-2 text-xs font-semibold text-white transition hover:bg-signal-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          زيارة الأداة ↗
        </a>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="rounded-xl border border-line bg-bg px-4 py-2 text-xs font-semibold text-ink-muted transition hover:border-signal-line hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          {open ? "إخفاء التفاصيل" : "عرض التفاصيل"}
        </button>
      </div>

      {open && (
        <div id={panelId} className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
          {tool.useCases.length > 0 && <Points title="أبرز الاستخدامات" items={tool.useCases} />}
          {tool.goodFor.length > 0 && (
            <Points title="يُنصح بها عندما" items={tool.goodFor} tone="good" />
          )}
          {tool.limits.length > 0 && (
            <Points title="لا يُنصح بها عندما" items={tool.limits} tone="care" />
          )}

          {tool.audience.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-ink-faint">تناسب</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tool.audience.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </div>
            </div>
          )}

          {tool.strength && <Line title="نقطة القوّة" body={tool.strength} />}
          {tool.caveat && <Line title="أبرز قيد" body={tool.caveat} />}

          <Link
            href={`/tools/${tool.slug}`}
            className="text-xs font-semibold text-signal hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            الصفحة الكاملة للأداة ←
          </Link>
        </div>
      )}
    </div>
  );
}

function Points({
  title,
  items,
  tone = "plain",
}: {
  title: string;
  items: string[];
  tone?: "plain" | "good" | "care";
}) {
  // ألوان هادئة: أخضر للإيجاب وكهرماني للتحفّظ، بشفافية منخفضة تعمل في
  // الوضعين الفاتح والداكن بلا صراخ يزاحم لون الهوية.
  const box = {
    plain: "border-line bg-surface-soft",
    good: "border-emerald-600/25 bg-emerald-600/[0.06]",
    care: "border-amber-600/25 bg-amber-600/[0.06]",
  }[tone];

  const dot = {
    plain: "bg-ink-faint",
    good: "bg-emerald-600 dark:bg-emerald-400",
    care: "bg-amber-600 dark:bg-amber-400",
  }[tone];

  return (
    <div className={`rounded-xl border p-3.5 ${box}`}>
      <h3 className="text-xs font-semibold text-ink">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-6 text-ink-muted">
            <span aria-hidden="true" className={`mt-2 h-1 w-1 shrink-0 rounded-full ${dot}`} />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Line({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink-faint">{title}</h3>
      <p className="mt-1 text-xs leading-6 text-ink-muted">{body}</p>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-ink-faint">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
        active
          ? "border-signal-line bg-signal-soft text-signal"
          : "border-line bg-bg text-ink-muted hover:border-signal-line hover:text-signal"
      }`}
    >
      {children}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-surface-soft px-2 py-1 text-[0.7rem] text-ink-faint">
      {children}
    </span>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "signal" | "open" | "neutral";
}) {
  const styles = {
    signal: "border-signal-line bg-signal-soft text-signal",
    open: "border-emerald-600/30 bg-emerald-600/[0.08] text-emerald-700 dark:text-emerald-300",
    neutral: "border-line bg-surface-soft text-ink-faint",
  }[tone];

  return (
    <span className={`rounded-md border px-2 py-1 text-[0.7rem] font-medium ${styles}`}>
      {children}
    </span>
  );
}
