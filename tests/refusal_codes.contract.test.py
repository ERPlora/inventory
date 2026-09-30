#!/usr/bin/env python3
"""Every refusal the handler gives has a code the module DECLARES and a sentence in en and es
(inventory#129).

A decrease with a quantity that does not fit the step of the product's unit (half a can) was
refused as a WASM trap, which the runtime redacts to a generic `wasm` 400 — nobody could tell the
QUANTITY was the problem. It now travels as the domain refusal `inventory.off_grid_quantity`
(ADR-0205, HTTP 409), like `insufficient_stock` and `unknown_product`.

What this file pins:
  1. every code the handler rejects with (`HandlerOutput::rejected("inventory.…"`, production
     code only — the `#[cfg(test)]` module is cut off) is declared in `module.json → errors`
     (ADR-0398: with the block present the runtime is strict, an undeclared code breaks the
     command), and nothing is declared that the handler never emits;
  2. each of them has a non-empty sentence in `locales/en.json` and `locales/es.json` under
     `errors`, and the Spanish one is not the English one left untranslated — the SDK speaks a
     module's refusal from there (hub#1570);
  3. and positive controls: `inventory.off_grid_quantity` is among the scanned codes (a scan that
     found nothing would pass for the wrong reason).

Usage: tests/refusal_codes.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
source = (ROOT / "handler" / "src" / "lib.rs").read_text(encoding="utf-8")
production = source.split("#[cfg(test)]", 1)[0]
emitted = set(
    re.findall(r'HandlerOutput::rejected\(\s*"(inventory\.[a-z_]+)"', production)
)

manifest = json.loads((ROOT / "module.json").read_text(encoding="utf-8"))
declared = manifest.get("errors")
locales = {
    lang: json.loads(
        (ROOT / "locales" / f"{lang}.json").read_text(encoding="utf-8")
    ).get("errors")
    or {}
    for lang in ("en", "es")
}

errors = []
if "inventory.off_grid_quantity" not in emitted:
    errors.append(
        "the handler never rejects with inventory.off_grid_quantity — an off-grid decrease is "
        f"not a domain refusal (scanned codes: {sorted(emitted)})"
    )
if not isinstance(declared, dict):
    errors.append("module.json declares no `errors` block (ADR-0398)")
    declared = {}
for code in sorted(emitted - set(declared)):
    errors.append(
        f"{code}: emitted by the handler but not declared in module.json errors"
    )
for code in sorted(set(declared) - emitted):
    errors.append(
        f"{code}: declared in module.json errors but the handler never emits it"
    )
for code in sorted(emitted):
    en = locales["en"].get(code)
    es = locales["es"].get(code)
    if not isinstance(en, str) or not en.strip():
        errors.append(f"{code}: no English sentence in locales/en.json errors")
    if not isinstance(es, str) or not es.strip():
        errors.append(f"{code}: no Spanish sentence in locales/es.json errors")
    elif es == en:
        errors.append(f"{code}: the Spanish sentence is the English one, untranslated")

if errors:
    print("refusal_codes.contract: FAIL")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
print(f"refusal_codes.contract: OK — {len(emitted)} codes declared and spoken in en/es")
