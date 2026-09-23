/* ナビゲーション項目（Header / TopHero で共有） */
export type Section = "Works" | "Text" | "目の星" | "Time Line" | "Garden" | "News" | "About" | "Photo Roll" | "Contact" | "Select Works";

export const NAV_ITEMS: { num: string; label: string; href: string; section: Section }[] = [
  { num: "01", label: "Works", href: "/works", section: "Works" },
  { num: "02", label: "目の星", href: "/me-no-hoshi", section: "目の星" },
  { num: "03", label: "Garden", href: "/garden", section: "Garden" },
  { num: "04", label: "Photo Roll", href: "/photo-roll", section: "Photo Roll" },
  { num: "05", label: "News", href: "/news", section: "News" },
  { num: "06", label: "About", href: "/about", section: "About" },
  { num: "07", label: "Contact", href: "/contact", section: "Contact" },
];

/* Select Works 用ナビゲーション: 目の星・Garden・Photo Roll を非表示にした限定版 */
const HIDDEN_ON_SELECT_WORKS: Section[] = ["目の星", "Garden", "Photo Roll"];
export const SELECT_WORKS_NAV_ITEMS: { num: string; label: string; href: string; section: Section }[] =
  NAV_ITEMS.filter((item) => !HIDDEN_ON_SELECT_WORKS.includes(item.section)).map((item, i) => ({
    ...item,
    num: String(i + 1).padStart(2, "0"),
  }));
