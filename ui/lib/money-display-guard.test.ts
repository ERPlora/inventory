import { it, expect } from 'vitest';
import { checkMoneyDisplay } from '@erplora/module-toolkit/money-display-guard';

// GUARD (pm#289, shared since pm#505/pm#508): money on screen is never formatted by hand in this
// module, and OutfitKit comes in by entry point, never as a value from the barrel.
//
// The rules live in `@erplora/module-toolkit/money-display-guard` (one piece for every module,
// tested there against its own positives); this test only says what is specific to Inventory:
//
// * witnesses — every amount this module paints goes through the shell's formatter: in Products
//   the price column and the price of the product detail, in the dashboard the inventory-value
//   KPI. They count the CALL, not the name: both screens also declare `formatMoney(…)` in their
//   `erplora()` interface, and a scan over empty or over-stripped content must not stay green on
//   that declaration (rv-combos-22). `lib/quantity.ts` is a witness too: a shared number helper
//   would land in `lib/` first, so the scan must provably read it (rv-taxes-78).
// * notDisplay — none since pm#521: the one triaged in pm#289 (`minorToInput`, the value of the
//   price/cost ion-input) is gone, the fields are filled by the toolkit's `formatMoneyInput`. Add an
//   entry (`'file: exact code line'` → why) only with the reason it is not a screen amount; it
//   covers ONE occurrence, a copy of that line in a new display function is a finding
//   (rv-inventory-117).
// * outfitkitImporters — each of the four screens imports OutfitKit (entry points + types), so the
//   barrel scan provably read all four (rv-pricing-53).
it('money on screen goes through the shared formatter and OutfitKit by entry point (pm#289)', () => {
  expect(
    checkMoneyDisplay({
      from: import.meta.url,
      witnesses: {
        'components/erp-inventory-products/erp-inventory-products.ts': {
          text: 'erplora().formatMoney(',
          atLeast: 2,
        },
        'components/erp-inventory-dashboard/erp-inventory-dashboard.ts': 'erplora().formatMoney(',
        'lib/quantity.ts': 'export function formatQuantity(',
      },
      outfitkitImporters: [
        'components/erp-inventory-products/erp-inventory-products.ts',
        'components/erp-inventory-dashboard/erp-inventory-dashboard.ts',
        'components/erp-inventory-movements/erp-inventory-movements.ts',
        'components/erp-inventory-categories/erp-inventory-categories.ts',
      ],
    }),
  ).toEqual([]);
});
