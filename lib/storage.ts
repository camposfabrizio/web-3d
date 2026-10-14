// Acesso seguro ao localStorage (tolerante a SSR, modo privado e erros).

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora cota cheia / modo privado.
  }
}

export const STORAGE_KEYS = {
  products: "as3d.catalog.products",
  categories: "as3d.catalog.categories",
  settings: "as3d.settings",
  cart: "as3d.cart",
} as const;
