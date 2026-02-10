export const CATEGORY_MENU = ["All", "Photography", "Video", "Personal", "Portrait"] as const;

export type Category = (typeof CATEGORY_MENU)[number];

export function parseCategory(value?: string): Category {
  if (!value) return "All";
  return CATEGORY_MENU.includes(value as Category) ? (value as Category) : "All";
}

