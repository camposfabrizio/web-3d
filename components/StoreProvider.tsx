"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  CartItem,
  Category,
  Product,
  SelectedOption,
  StoreSettings,
} from "@/lib/types";
import { defaultSettings, seedCategories, seedProducts } from "@/lib/seed";
import { readJSON, writeJSON, STORAGE_KEYS } from "@/lib/storage";

// Assina "nada": serve só para o flag de hidratação (false no servidor/primeiro
// render, true depois que o React assume no cliente), evitando mismatch de SSR.
const noopSubscribe = () => () => {};

type CatalogExport = {
  version: 1;
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
};

type StoreContextValue = {
  hydrated: boolean;
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  cart: CartItem[];

  // Catálogo (admin)
  saveSettings: (settings: StoreSettings) => void;
  upsertProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  upsertCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  resetCatalog: () => void;
  exportData: () => CatalogExport;
  importData: (data: CatalogExport) => boolean;

  // Carrinho
  addToCart: (
    product: Product,
    selectedOptions: SelectedOption[],
    qty: number,
  ) => void;
  setQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  cartCount: number;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function cartKey(productId: string, options: SelectedOption[]): string {
  const sig = options
    .map((o) => `${o.groupId}:${o.optionId}`)
    .sort()
    .join("|");
  return sig ? `${productId}#${sig}` : productId;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // false no servidor e no render de hidratação; true logo depois no cliente.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  // Inicialização lazy a partir do localStorage (readJSON é seguro em SSR:
  // retorna os defaults quando não há window). O conteúdo só é exibido depois
  // de `hydrated`, então não há divergência de hidratação.
  const [settings, setSettings] = useState<StoreSettings>(() =>
    readJSON(STORAGE_KEYS.settings, defaultSettings),
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    readJSON(STORAGE_KEYS.categories, seedCategories),
  );
  const [products, setProducts] = useState<Product[]>(() =>
    readJSON(STORAGE_KEYS.products, seedProducts),
  );
  const [cart, setCart] = useState<CartItem[]>(() =>
    readJSON(STORAGE_KEYS.cart, []),
  );

  // Persiste cada mudança no localStorage (efeitos só rodam no cliente).
  useEffect(() => {
    writeJSON(STORAGE_KEYS.settings, settings);
  }, [settings]);
  useEffect(() => {
    writeJSON(STORAGE_KEYS.categories, categories);
  }, [categories]);
  useEffect(() => {
    writeJSON(STORAGE_KEYS.products, products);
  }, [products]);
  useEffect(() => {
    writeJSON(STORAGE_KEYS.cart, cart);
  }, [cart]);

  const saveSettings = useCallback((next: StoreSettings) => {
    setSettings(next);
  }, []);

  const upsertProduct = useCallback((product: Product) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      const stamped = { ...product, updatedAt: Date.now() };
      if (idx === -1) return [{ ...stamped }, ...prev];
      const copy = [...prev];
      copy[idx] = stamped;
      return copy;
    });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const upsertCategory = useCallback((category: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === category.id);
      if (idx === -1) return [...prev, category];
      const copy = [...prev];
      copy[idx] = category;
      return copy;
    });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const resetCatalog = useCallback(() => {
    setSettings(defaultSettings);
    setCategories(seedCategories);
    setProducts(seedProducts);
  }, []);

  const exportData = useCallback(
    (): CatalogExport => ({
      version: 1,
      settings,
      categories,
      products,
    }),
    [settings, categories, products],
  );

  const importData = useCallback((data: CatalogExport): boolean => {
    if (
      !data ||
      !Array.isArray(data.products) ||
      !Array.isArray(data.categories) ||
      typeof data.settings !== "object"
    ) {
      return false;
    }
    setSettings({ ...defaultSettings, ...data.settings });
    setCategories(data.categories);
    setProducts(data.products);
    return true;
  }, []);

  const addToCart = useCallback(
    (product: Product, selectedOptions: SelectedOption[], qty: number) => {
      const key = cartKey(product.id, selectedOptions);
      const base =
        typeof product.promoPrice === "number" &&
        product.promoPrice > 0 &&
        product.promoPrice < product.price
          ? product.promoPrice
          : product.price;
      const unitPrice =
        base + selectedOptions.reduce((s, o) => s + o.priceDelta, 0);

      setCart((prev) => {
        const idx = prev.findIndex((i) => i.key === key);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
          return copy;
        }
        const item: CartItem = {
          key,
          productId: product.id,
          name: product.name,
          image: product.images[0],
          unit: product.unit,
          unitPrice,
          qty,
          selectedOptions,
        };
        return [...prev, item];
      });
    },
    [],
  );

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, qty: Math.max(0, qty) } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = useMemo(
    () => cart.reduce((s, i) => s + i.qty, 0),
    [cart],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      hydrated,
      settings,
      categories,
      products,
      cart,
      saveSettings,
      upsertProduct,
      deleteProduct,
      upsertCategory,
      deleteCategory,
      resetCatalog,
      exportData,
      importData,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      cartCount,
    }),
    [
      hydrated,
      settings,
      categories,
      products,
      cart,
      saveSettings,
      upsertProduct,
      deleteProduct,
      upsertCategory,
      deleteCategory,
      resetCatalog,
      exportData,
      importData,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      cartCount,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
