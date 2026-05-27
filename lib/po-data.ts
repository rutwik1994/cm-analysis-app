/**
 * Purchase Order types.
 * Real data comes from public_edw_business_mart_live.purchase_order__enriched
 * PO_ROWS is used only as a static fallback when Databricks is unreachable locally.
 */

export type POStatus = "INITIATED" | "APPROVED" | "SENT";

export interface PORow {
  poNumber:       string;   // order_number
  poDate:         string;   // created_at  (YYYY-MM-DD)
  deliveryDate:   string;   // expected_arrival_date (YYYY-MM-DD)
  supplier:       string;   // supplier_name
  market:         string;   // country_group  (DACH / US / DKSE / BENELUX)
  category:       string;   // sku_category   (PRO, PHF, BAK, DAI, CON, SPI, DRY…)
  netValue:       number;   // SUM(item_total_price)
  currency:       string;   // currency
  status:         POStatus; // status  (INITIATED / APPROVED / SENT)
  lineItems:      number;   // COUNT(*) of SKU lines in the PO
  week:           string;   // week  (2026-W01)
}

// Category code → friendly label
export const CATEGORY_LABEL: Record<string, string> = {
  PTN: "Proteins",
  PRO: "Processed",
  PHF: "Produce",
  DRY: "Dry Goods",
  BAK: "Bakery",
  DAI: "Dairy",
  CON: "Convenience",
  SPI: "Spices",
};

// Minimal static fallback — only used if Databricks is down
export const PO_ROWS: PORow[] = [
  { poNumber: "PO-FALLBACK-001", poDate: "2026-01-05", deliveryDate: "2026-01-19", supplier: "Static Fallback",   market: "US",      category: "PRO", netValue: 420000, currency: "USD", status: "SENT",      lineItems: 8,  week: "2026-W02" },
  { poNumber: "PO-FALLBACK-002", poDate: "2026-02-03", deliveryDate: "2026-02-17", supplier: "Static Fallback",   market: "DACH",    category: "DAI", netValue: 310000, currency: "EUR", status: "APPROVED",  lineItems: 5,  week: "2026-W06" },
  { poNumber: "PO-FALLBACK-003", poDate: "2026-03-10", deliveryDate: "2026-03-24", supplier: "Static Fallback",   market: "DKSE",    category: "BAK", netValue: 175000, currency: "EUR", status: "INITIATED", lineItems: 4,  week: "2026-W11" },
];
