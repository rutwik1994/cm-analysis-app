/**
 * Category Manager mapping — sub-category → manager name
 *
 * Based on:
 *   • INTL PRO-FSQA org chart (May 2026)
 *   • Sub-categories confirmed from public_edw_base_grain_live.culinary_sku
 *     and public_scm_pr_tech_analytics.scm_procurement_tech_volume_tracker
 *
 * Scope: INTL markets (DACH, US, DKSE, BENELUX)
 * Update this file whenever there is a team restructure.
 */

// ── Sub-category → Category Manager ───────────────────────────────────────────
export const SUBCAT_TO_MANAGER: Record<string, string> = {

  // ── PHF (Produce, Herbs & Fruit) — Director: Richard Holland ──
  "GREENHOUSE VEGETABLES":  "Melchior Wedel",
  "ROOT VEGETABLES":        "Charlotte Rondot",
  "LEAFY GREENS & SALADS":  "Aislynn Flynn",
  "HERBS":                  "Cath Thubron",
  "MUSHROOMS":              "Cath Thubron",
  "BRASSICA":               "Josefina Magana",
  "PRE-CUT":                "Laure Fernet",
  "STANDARD VEGETABLES":    "Milan Eßer",
  "STANDARD FRUITS":        "Louis Guidetti",
  "EXOTICS/CITRUS":         "Louis Guidetti",
  "US-CITRUS-PHF":          "Louis Guidetti",
  "US-ROOT VEG-PHF":        "Charlotte Rondot",
  "US-BRASSICA-PHF":        "Josefina Magana",
  "US-FRESH CUT-PHF":       "Laure Fernet",
  "US-HOT HOUSE-PHF":       "Melchior Wedel",
  "US-HERB-PHF":            "Cath Thubron",
  "US-MUSHROOMS-PHF":       "Cath Thubron",
  "US-BULK GREENS-PHF":     "Aislynn Flynn",
  "US-BAGGED SALAD MIXES-PHF": "Aislynn Flynn",
  "US-POTATO-PHF":          "Charlotte Rondot",

  // ── PTN (Proteins) — Director: Levi Algra ──
  "POULTRY":                "Jonathan Gahan",
  "BOVINE":                 "Victoria Radford",
  "SWINE":                  "Victoria Radford",
  "SHEEP":                  "Victoria Radford",
  "GAME":                   "Victoria Radford",
  "FINFISH":                "Mathilde Vannier",
  "SALMONID":               "Mathilde Vannier",
  "FISH PREPARATION":       "Rowan Bouw",
  "CRUSTACEA":              "Rowan Bouw",
  "MOLLUSCA":               "Rowan Bouw",
  "FISH SEAFOOD COMBINATION": "Rowan Bouw",
  "PLANT BASED":            "Denys Lauster",
  "US-POULTRY-PTN":         "Jonathan Gahan",
  "US-BEEF-PTN":            "Victoria Radford",
  "US-PORK-PTN":            "Victoria Radford",
  "US-SEAFOOD-PTN":         "Rowan Bouw",
  "US-LAMB-PTN":            "Victoria Radford",

  // ── DRY (Dry Goods) — Sr. CM: Marie Weber (under Gerrit Geising) ──
  "DRIED PASTAS":           "Marie Weber",
  "FRESH PASTAS":           "Marie Weber",
  "RICE":                   "Marie Weber",
  "GRAINS":                 "Marie Weber",
  "CEREALS":                "Marie Weber",
  "ASIAN NOODLES":          "Marie Weber",
  "DRIED FRUITS & VEG":     "Marie Weber",
  "DRIED LEGUMES":          "Marie Weber",
  "US-DRY PASTA-DRY":       "Marie Weber",
  "US-GRAINS-DRY":          "Marie Weber",
  "US-DRY GOODS-DRY":       "Marie Weber",
  "US-FRESH PASTA-DRY":     "Marie Weber",

  // ── PRO (Processed / Sauces / Canned) — Sr. CM: Tanya Vester ──
  "CONDIMENTS & SAUCES":    "Tanya Vester",
  "PASTES":                 "Tanya Vester",
  "PREPARATION":            "Tanya Vester",
  "CANNED/TETRA":           "Maria Montanari",
  "LIQUID STOCK":           "Tanya Vester",
  "US-SAUCES-PRO":          "Tanya Vester",
  "US-CONDIMENTS-PRO":      "Tanya Vester",
  "US-PROCESSED & CANNED GOODS-PRO": "Maria Montanari",

  // ── SPI (Spices & Nuts) — Sr. CM: Kristian Kokinos ──
  "SPICES":                 "Kristian Kokinos",
  "NUTS":                   "Kristian Kokinos",
  "SEEDS":                  "Kristian Kokinos",
  "DRIED STOCK":            "Kristian Kokinos",
  "US-SPICES-SPI":          "Kristian Kokinos",
  "US-NUTS-SPI":            "Kristian Kokinos",

  // ── BAK (Bakery) — CM: Tirsa Dijkstra ──
  "BREAD":                  "Tirsa Dijkstra",
  "FLATBREAD":              "Tirsa Dijkstra",
  "TORTILLA":               "Tirsa Dijkstra",
  "PASTRY":                 "Tirsa Dijkstra",
  "RAW DOUGH":              "Tirsa Dijkstra",

  // ── DAI (Dairy) — under Gerrit Geising / Rebecca de Haan ──
  "CHEESE":                 "Beatriz Chaves",
  "SOUR MILK":              "Sophie Vehert",
  "CREAM":                  "Sophie Vehert",
  "MILK AND BUTTER":        "Sophie Vehert",
  "PLANT BASED DAIRY":      "Sophie Vehert",
  "EGGS":                   "Sophie Vehert",
  "US-CHEESE-DAI":          "Beatriz Chaves",
  "US-SPREADABLES-DAI":     "Sophie Vehert",

  // ── CON (Convenience) — under Rebecca de Haan ──
  "READY TO HEAT":          "Rebecca de Haan",
  "READY TO EAT":           "Natalie Ser",
};

// ── Category → ordered sub-category list (for dynamic filter dropdown) ────────
// Keys match the app-facing category names from SpendRow.category
export const SUBCATS_BY_CATEGORY: Record<string, string[]> = {
  Grocery: [
    // PHF produce
    "GREENHOUSE VEGETABLES", "LEAFY GREENS & SALADS", "PRE-CUT",
    "STANDARD VEGETABLES", "HERBS", "ROOT VEGETABLES", "EXOTICS/CITRUS",
    "BRASSICA", "MUSHROOMS", "STANDARD FRUITS",
    // DRY
    "DRIED PASTAS", "FRESH PASTAS", "RICE", "GRAINS", "CEREALS",
    "ASIAN NOODLES", "DRIED FRUITS & VEG", "DRIED LEGUMES",
    "US-DRY PASTA-DRY", "US-DRY GOODS-DRY",
    // PRO
    "CONDIMENTS & SAUCES", "PASTES", "CANNED/TETRA", "PREPARATION",
    "LIQUID STOCK", "US-SAUCES-PRO", "US-CONDIMENTS-PRO",
    "US-PROCESSED & CANNED GOODS-PRO",
  ],
  Proteins: [
    "POULTRY", "BOVINE", "SWINE", "SHEEP", "GAME",
    "FINFISH", "SALMONID", "FISH PREPARATION",
    "CRUSTACEA", "MOLLUSCA", "FISH SEAFOOD COMBINATION", "PLANT BASED",
    "US-POULTRY-PTN", "US-BEEF-PTN", "US-PORK-PTN",
    "US-SEAFOOD-PTN", "US-LAMB-PTN",
  ],
  Dairy: [
    "CHEESE", "SOUR MILK", "CREAM", "MILK AND BUTTER",
    "PLANT BASED DAIRY", "EGGS",
    "US-CHEESE-DAI", "US-SPREADABLES-DAI",
  ],
  Bakery: [
    "BREAD", "FLATBREAD", "TORTILLA", "PASTRY", "RAW DOUGH",
  ],
  Convenience: [
    "READY TO HEAT", "READY TO EAT",
  ],
  Spices: [
    "SPICES", "NUTS", "SEEDS", "DRIED STOCK",
    "US-SPICES-SPI", "US-NUTS-SPI",
  ],
};

/** Lookup helper — returns manager name or '' if not mapped */
export function lookupCategoryManager(subCategory: string): string {
  return SUBCAT_TO_MANAGER[subCategory?.trim()] ?? '';
}

/** All unique manager names (sorted) — for the Cat. Manager filter dropdown */
export const ALL_CATEGORY_MANAGERS: string[] = [
  ...new Set(Object.values(SUBCAT_TO_MANAGER)),
].sort();
