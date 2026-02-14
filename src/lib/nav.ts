/* ナビゲーション項目（Header / TopHero で共有） */
export type Section = "Works" | "Text" | "目の星" | "Time Line" | "News" | "About" | "Contact";

export const NAV_ITEMS: { num: string; label: string; href: string; section: Section }[] = [
  { num: "01", label: "Works", href: "/works", section: "Works" },
  { num: "02", label: "Text", href: "/text", section: "Text" },
  { num: "03", label: "目の星", href: "/me-no-hoshi", section: "目の星" },
  { num: "04", label: "Time Line", href: "/timeline", section: "Time Line" },
  { num: "05", label: "News", href: "/news", section: "News" },
  { num: "06", label: "About", href: "/about", section: "About" },
  { num: "07", label: "Contact", href: "/contact", section: "Contact" },
];
