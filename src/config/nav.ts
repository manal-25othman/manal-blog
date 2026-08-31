/** روابط التنقّل الرئيسية والذيل. مصدر واحد للترويسة والذيل. */
export type NavItem = {
  href: string;
  label: string;
  /**
   * حين تكون `true` تُعرض التصنيفات في قائمة منسدلة تحت هذا العنصر.
   * التصنيفات نفسها محتوى يُحرَّر، فلا تُكتب هنا واحدًا واحدًا.
   */
  showCategories?: boolean;
};

export const primaryNav: NavItem[] = [
  { href: "/articles", label: "المقالات", showCategories: true },
  { href: "/about", label: "عن إسناد" },
  { href: "/tools", label: "الأدوات الاحترافية" },
  { href: "/contact", label: "تواصل معنا" },
];

/** روابط تظهر في الذيل وحده — لها صفحات لكنها ليست في الترويسة. */
export const footerExtraNav: NavItem[] = [{ href: "/categories", label: "كل التصنيفات" }];

export const legalNav = [
  { href: "/editorial-policy", label: "سياسة التحرير" },
  { href: "/advertising-policy", label: "سياسة الإعلانات" },
  { href: "/privacy-policy", label: "سياسة الخصوصية" },
  { href: "/cookie-policy", label: "سياسة الكوكيز" },
  { href: "/terms", label: "شروط الاستخدام" },
  { href: "/disclaimer", label: "إخلاء المسؤولية" },
] as const;
