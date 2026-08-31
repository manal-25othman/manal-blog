"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LogoLockup } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { categories } from "@/config/categories";
import { primaryNav, type NavItem } from "@/config/nav";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? "bg-signal-soft text-signal" : "text-ink-soft hover:bg-surface-soft hover:text-ink"
  }`;

/**
 * «المقالات» وتحتها التصنيفات.
 *
 * العنصر زرّ لا رابط: الرابط الذي يفتح قائمةً يربك قارئ الشاشة ويمنع فتح
 * القائمة بلوحة المفاتيح. ولذلك أول عنصر داخل القائمة هو «كل المقالات»،
 * فلا تصير صفحة الأرشيف غير قابلة للوصول.
 */
function CategoriesMenu({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const active = isActive(pathname, item.href) || isActive(pathname, "/categories");

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // الإغلاق بالنقر خارجها وبفقد التركيز معًا: الفأرة ولوحة المفاتيح.
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={wrapper}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`${linkClass(active)} flex items-center gap-1.5`}
      >
        {item.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1.5 min-w-60 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-[var(--shadow-card)]">
          <Link href={item.href} className="block px-4 py-2 text-sm font-medium text-ink hover:bg-surface-soft">
            كل المقالات
          </Link>
          <div className="my-1.5 border-t border-line" />
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-soft transition hover:bg-surface-soft hover:text-ink"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: category.accent }}
              />
              {category.name}
            </Link>
          ))}
          <div className="my-1.5 border-t border-line" />
          <Link
            href="/categories"
            className="block px-4 py-2 text-sm text-ink-faint transition hover:bg-surface-soft hover:text-signal"
          >
            كل التصنيفات ←
          </Link>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // إغلاق القائمة عند الانتقال — وإلا بقيت مفتوحة فوق الصفحة الجديدة.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="إسناد — الصفحة الرئيسية">
          <LogoLockup />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="التنقّل الرئيسي">
          {primaryNav.map((item) =>
            item.showCategories ? (
              <CategoriesMenu key={item.href} item={item} pathname={pathname} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={linkClass(isActive(pathname, item.href))}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="البحث في المقالات"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:border-signal-line hover:text-signal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="القائمة"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:text-signal md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="تنقّل الجوال"
          className="border-t border-line bg-surface md:hidden"
        >
          {/* في الجوال تُعرض التصنيفات مفرودة لا منسدلة: القائمة المنسدلة
              داخل قائمة منسدلة نقرتان بلا فائدة على شاشة صغيرة. */}
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {primaryNav.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-3 py-3 text-sm font-medium text-ink-soft hover:bg-surface-soft"
                >
                  {item.label}
                </Link>
                {item.showCategories && (
                  <div className="mb-1 flex flex-col border-s-2 border-line ps-3 ms-3">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/categories/${category.slug}`}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-surface-soft"
                      >
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: category.accent }}
                        />
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
