import type { PurchaseItem } from "@/types/inventory";

// Remove SKUs, long ID-like tokens and marketing noise from a product name.
export function abbreviateProductName(raw: string, maxLen = 80): string {
  if (!raw) return "";
  let s = String(raw);

  // Cut at SKU: markers
  s = s.split(/\bSKU\s*:/i)[0];
  // Cut at product code markers like "COD:", "REF:"
  s = s.split(/\b(?:COD|CÓD|REF)\s*:/i)[0];

  // Drop tokens that look like scrambled IDs (>=6 chars mixing UPPERCASE letters + digits)
  s = s
    .split(/\s+/)
    .filter((tok) => {
      const t = tok.replace(/[^A-Za-z0-9-]/g, "");
      if (t.length < 6) return true;
      // Hyphenated id chunks: pieces separated by "-", each piece ≥4 chars mixed alnum
      if (/-/.test(t) && t.split("-").every((p) => p.length >= 4 && /[A-Z]/.test(p) && /\d/.test(p))) {
        return false;
      }
      // Uppercase+digits blob
      if (/^[A-Z0-9]+$/.test(t) && /[A-Z]/.test(t) && /\d/.test(t)) return false;
      return true;
    })
    .join(" ");

  // Collapse whitespace and trim punctuation
  s = s.replace(/\s+/g, " ").replace(/[\s,;:-]+$/g, "").trim();

  if (s.length > maxLen) s = s.slice(0, maxLen - 1).trim() + "…";
  return s;
}

// Build a short multi-line summary from purchase items.
export function summarizePurchaseItems(items: PurchaseItem[]): string {
  if (!items || items.length === 0) return "";
  return items
    .map((it) => {
      const name = abbreviateProductName(it.productName || "");
      if (!name) return "";
      const qty = it.quantity && it.quantity > 0 ? `${it.quantity}x ` : "";
      return `${qty}${name}`;
    })
    .filter(Boolean)
    .join("\n");
}
