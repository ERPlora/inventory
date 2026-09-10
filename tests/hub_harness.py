"""Plumbing shared by the `*.hub.test.py` batteries — the ones that talk to a REAL kernel.

`erplora test <dir> --against-hub` (module-toolkit#110) starts the published hub image with its
own Postgres, installs the module through `POST /api/modules/install` and hands the url over in
`ERPLORA_HUB_BASE_URL`. Everything below is the thin layer between a battery and that runtime:
the two doors (`/api/query`, `/api/command`), the error envelope, the event shape, and the one
piece of bookkeeping every battery needs — a `check()` that records a failure instead of dying on
it, so a red run names EVERY broken assertion and not just the first.

Ported from `sales/tests/hub_harness.py` (ERPlora/hub#1264 slice 1, with `wait_until` from the
`tables` slice) for `inventory`'s own slice: `stock.adjust`/`stock.receive`/`products.bulk_create`
are WASM handlers, and the ledger they write only means something once the runtime has minted the
row ids, resolved the default location and run the SQL — exactly what a scratch harness that binds
`:hub_id` itself cannot reproduce.

Two facts of the runtime a battery has to know, both resolved here so no battery hard-codes them:

  * THE TENANT. Module seeds (the units register, the tax categories) land under the RUNTIME's own
    `hub_id`, not under whatever `X-Hub-Id` a request carries (hub#594). `GET /api/hub/context`
    says which id that is, and every request goes out under it.
  * THE SESSION USER. Dev auth trusts `X-User-Id`. Each run mints its own, because batteries share
    one hub for the length of the run.

It refuses to skip. Without a runtime a battery FAILS: a check that excuses itself is the green
that proves nothing this whole toolkit exists to remove (module-toolkit#50).
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = (
    os.environ.get("INVENTORY_HUB_BASE_URL")
    or os.environ.get("ERPLORA_HUB_BASE_URL")
    or ""
).rstrip("/")

# Quantities travel in 10^6 fixed point (ADR-0147); money in integer cents (ADR-0007/0123).
ONE = 1_000_000

#: The coarsest step every unit this module ships is a multiple of, and what
#: `009_quantity_grid_guard.sql` enforces at the table. The finest grid in the canonical registry is
#: 1/1000 of the base unit (the gram inside `kg`, the millilitre inside `l`), so EVERY legal
#: quantity is a multiple of this — and a value that is not cannot be expressed by any unit we ship.
GRID = 1_000

#: The payload keys that carry a quantity. `stock_after` is absent on purpose: it is a value the
#: ledger answers, never one a battery sends.
QUANTITY_FIELDS = ("stock", "low_stock_threshold", "qty", "quantity")

#: `inventory_settings.low_stock_threshold` is NOT on this scale and has no CHECK: `007` rescaled
#: «el umbral POR PRODUCTO» and deliberately left the hub-wide singleton alone (`001` still
#: defaults it to 10). A guard that fired here would be wrong about the module, not strict.
UNSCALED_COMMANDS = ("inventory.settings.update",)


def on_grid(value: int, field: str = "quantity") -> int:
    """A quantity, checked. Returns it untouched, or raises naming the value AND the way out.

    This exists so a fixture that writes a raw count fails HERE, in words, instead of travelling to
    Postgres and coming back as `400 {'code': 'db'}` — which is all a client may ever see, because
    `crates/server/tests/error_redaction_door.rs` forbids the constraint name from reaching one.
    """
    if isinstance(value, bool) or not isinstance(value, int):
        return value
    if value % GRID != 0:
        raise AssertionError(
            f"{field}={value} is not on the quantity grid: quantities travel in 10^6 fixed point "
            f"(ADR-0147) and every legal value is a multiple of {GRID}. If you meant {value} whole "
            f"units, write {value} * ONE = {value * ONE}."
        )
    return value


def _guard_quantities(node, field: str = "") -> None:
    """Walk a command payload and check every quantity it carries, however deep it is nested."""
    if isinstance(node, dict):
        for key, item in node.items():
            _guard_quantities(item, key)
    elif isinstance(node, list):
        for item in node:
            _guard_quantities(item, field)
    elif field in QUANTITY_FIELDS:
        on_grid(node, field)


def cents(value) -> int:
    """A money aggregate the way Postgres hands it back: `SUM(bigint)` is NUMERIC, so a total may
    arrive as a JSON string (`"5000"`) instead of a number. Either form is the same cents."""
    if isinstance(value, bool):
        raise AssertionError(f"not a money amount: {value!r}")
    if isinstance(value, (int, float)):
        return int(round(value))
    if isinstance(value, str):
        return int(round(float(value)))
    raise AssertionError(f"not a money amount: {value!r}")


class Hub:
    """One battery's view of the live runtime."""

    def __init__(self, battery: str, needs: tuple[str, ...] = ("taxes", "inventory")):
        self.battery = battery
        self.failures: list[str] = []
        if not BASE:
            print(
                f"{battery}: no runtime at the other end "
                "(INVENTORY_HUB_BASE_URL / ERPLORA_HUB_BASE_URL is empty)."
            )
            print(
                "Run it with `erplora test <dir> --against-hub`; without a hub this is NOT a skip, "
                "it is a failure."
            )
            sys.exit(1)
        self.user = f"u-{uuid.uuid4().hex[:8]}"
        self.hub_id = self._runtime_hub_id()
        self._require_installed(needs)

    # ── transport ────────────────────────────────────────────────────────────────────────

    def _request(
        self,
        method: str,
        path: str,
        body=None,
        *,
        user: str | None = None,
        permissions: str | None = None,
    ):
        data = None if body is None else json.dumps(body).encode()
        headers = {
            "content-type": "application/json",
            "x-hub-id": self.hub_id,
            "x-user-id": user or self.user,
        }
        if permissions is not None:
            # Dev auth (`crates/server/src/auth.rs::context_from_headers`): a comma-separated
            # `X-Permissions` REPLACES the implicit `["*"]` a request gets without it. This is how
            # a battery can prove a permission BOUNDARY — e.g. that adjusting stock and editing a
            # product are governed by different permissions — without a real role/member setup.
            headers["x-permissions"] = permissions
        req = urllib.request.Request(
            f"{BASE}{path}",
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.status, json.loads(res.read().decode() or "null")
        except urllib.error.HTTPError as err:
            raw = err.read().decode()
            try:
                return err.code, json.loads(raw or "null")
            except json.JSONDecodeError:
                return err.code, {"raw": raw}

    def _runtime_hub_id(self) -> str:
        req = urllib.request.Request(f"{BASE}/api/hub/context", method="GET")
        with urllib.request.urlopen(req, timeout=60) as res:
            body = json.loads(res.read().decode())
        hub_id = body.get("hub_id")
        if not hub_id:
            print(
                f"{self.battery}: GET /api/hub/context did not say the hub_id: {body}"
            )
            sys.exit(1)
        return hub_id

    def _require_installed(self, needs: tuple[str, ...]) -> None:
        status, body = self._request("GET", "/api/modules")
        installed = (
            {m["id"] for m in (body or {}).get("data", [])} if status == 200 else set()
        )
        missing = [m for m in needs if m not in installed]
        if missing:
            print(
                f"{self.battery}: the runtime at {BASE} does not have {missing} installed "
                f"(installed: {sorted(installed)}). `inventory` depends on `taxes`, and a battery "
                "that drives it through `sales` needs that installed too, in dependency order. "
                "Not a skip: nothing below can be trusted without them."
            )
            sys.exit(1)

    # ── the two doors ────────────────────────────────────────────────────────────────────

    def query(self, name: str, params: dict | None = None) -> list:
        """Rows of a query. A query with a `list` block answers `{rows,total,…}`; the rest answer
        the bare array. Both come back as the list of rows."""
        status, body = self._request(
            "POST", "/api/query", {"name": name, "params": params or {}}
        )
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"query {name} answered {status}: {body}")
        data = body["data"]
        if isinstance(data, dict) and "rows" in data:
            return data["rows"]
        return data

    def page(self, name: str, params: dict | None = None) -> dict:
        """The whole page of a `list` query, `total` included."""
        status, body = self._request(
            "POST", "/api/query", {"name": name, "params": params or {}}
        )
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"query {name} answered {status}: {body}")
        return body["data"]

    def command(self, name: str, payload: dict):
        """`(status, body)` of a command, whatever the runtime answered."""
        return self._request("POST", "/api/command", {"name": name, "payload": payload})

    def run(self, name: str, payload: dict) -> dict:
        """A command that MUST succeed. Its `data` (`operations`, `new_ids`, …).

        The quantities are checked BEFORE the request leaves (hub#1772). Only here: `command` and
        `refused` are the doors a battery uses to prove a REJECTION, and several tests send an
        off-grid quantity on purpose to watch the module turn it down.
        """
        if name not in UNSCALED_COMMANDS:
            _guard_quantities(payload)
        status, body = self.command(name, payload)
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"command {name} answered {status}: {body}")
        return body["data"]

    def command_as(self, permissions: str, name: str, payload: dict):
        """Like `command`, but under a caller who holds ONLY `permissions` (comma-separated)
        instead of the battery's default `*` — a fresh `X-User-Id` too, so this restricted caller
        never inherits an audit trail from the battery's own admin identity."""
        return self._request(
            "POST",
            "/api/command",
            {"name": name, "payload": payload},
            user=f"{self.user}-restricted",
            permissions=permissions,
        )

    def refused(self, label: str, name: str, payload: dict, code: str) -> None:
        """The runtime must REFUSE the command with exactly this domain code — the code, never the
        prose (ADR-0398 §6): the till translates the code, nobody reads the sentence."""
        status, body = self.command(name, payload)
        got = (
            ((body or {}).get("error") or {}).get("code")
            if isinstance(body, dict)
            else None
        )
        if status == 200:
            self.failures.append(
                f"{label} — expected refusal `{code}`, the command SUCCEEDED: {body}"
            )
            print(f"  FAIL: {label} — expected refusal `{code}`, got success: {body}")
        elif got != code:
            self.failures.append(
                f"{label} — expected code [{code}], got [{got}] (HTTP {status}: {body})"
            )
            print(
                f"  FAIL: {label} — expected code [{code}], got [{got}] (HTTP {status})"
            )
        else:
            print(f"  ok: {label} refused with `{code}` (HTTP {status})")

    # The dispatcher's generic permission gate (`kernel_conformance_permissions.rs`) answers a
    # missing permission with ONE of two codes, by KERNEL configuration, not by module choice:
    # `permission_denied` when no role could ever approve it, `requires_elevation` when a manager
    # could — both are the gate holding, so a caller proving "this permission is required" accepts
    # either, the same way the old Rust e2e only asked `is_err()`.
    _PERMISSION_REFUSAL_CODES = ("permission_denied", "requires_elevation")

    def refused_permission_as(
        self, label: str, permissions: str, name: str, payload: dict
    ) -> None:
        """A caller holding only `permissions` must be REFUSED this command for lack of
        permission (HTTP 403, `permission_denied` or `requires_elevation`) — the dispatcher's
        generic gate, exercised here with `inventory`'s own commands rather than the kfx fixture."""
        status, body = self.command_as(permissions, name, payload)
        got = (
            ((body or {}).get("error") or {}).get("code")
            if isinstance(body, dict)
            else None
        )
        if status == 200:
            self.failures.append(
                f"{label} — expected a permission refusal, the command SUCCEEDED: {body}"
            )
            print(
                f"  FAIL: {label} — expected a permission refusal, got success: {body}"
            )
        elif status == 403 and got in self._PERMISSION_REFUSAL_CODES:
            print(f"  ok: {label} refused with `{got}` (HTTP 403)")
        else:
            self.failures.append(
                f"{label} — expected [403, {self._PERMISSION_REFUSAL_CODES}], "
                f"got [{status}, {got!r}] ({body})"
            )
            print(
                f"  FAIL: {label} — expected [403, {self._PERMISSION_REFUSAL_CODES}], "
                f"got [{status}, {got!r}]"
            )

    def query_as(self, permissions: str, name: str, params: dict | None = None) -> list:
        """Like `query`, but under a caller who holds ONLY `permissions` instead of the battery's
        default `*`."""
        status, body = self._request(
            "POST",
            "/api/query",
            {"name": name, "params": params or {}},
            user=f"{self.user}-restricted",
            permissions=permissions,
        )
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(
                f"query {name} (as {permissions}) answered {status}: {body}"
            )
        data = body["data"]
        if isinstance(data, dict) and "rows" in data:
            return data["rows"]
        return data

    # ── what the hub says about its events ───────────────────────────────────────────────

    def event_shape(self, event_name: str) -> dict | None:
        """`GET /api/hub/events/shape?name=…` — the fields of the NEWEST events of that name in this
        hub, each with one sample unless withheld (hub#715). `None` when the hub has never heard of
        the event. It is the only read of an emitted payload the runtime offers, and it is enough:
        a sample is the value of the most recent event, which is the one the battery just caused."""
        status, body = self._request(
            "GET", f"/api/hub/events/shape?name={event_name}&limit=1"
        )
        if status == 404:
            return None
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"events/shape {event_name} answered {status}: {body}")
        return body["data"]

    def event_field(self, event_name: str, path: str) -> dict | None:
        shape = self.event_shape(event_name)
        if shape is None:
            return None
        return next((f for f in shape.get("fields", []) if f.get("path") == path), None)

    # ── bookkeeping ──────────────────────────────────────────────────────────────────────

    def check(self, label: str, got, want) -> None:
        if got != want:
            self.failures.append(f"{label} — expected [{want!r}], got [{got!r}]")
            print(f"  FAIL: {label} — expected [{want!r}], got [{got!r}]")
        else:
            print(f"  ok: {label} = {got!r}")

    def check_true(self, label: str, condition: bool, detail="") -> None:
        if not condition:
            self.failures.append(f"{label} — {detail}" if detail else label)
            print(f"  FAIL: {label} {detail}")
        else:
            print(f"  ok: {label}")

    def finish(self, verdict: str) -> int:
        print()
        if self.failures:
            print(f"✗ {self.battery}: {len(self.failures)} failure(s):")
            for f in self.failures:
                print(f"  - {f}")
            return 1
        print(f"✓ {self.battery}: {verdict}")
        return 0


def unique(tag: str) -> str:
    """A value unique to THIS run — SKUs, category names, void reasons — so two runs against the
    same shared hub (or a re-run after a positive-control mutation) never collide on a row the
    previous run already wrote."""
    return f"hub-battery-{tag}-{uuid.uuid4().hex[:8]}"


def create_product(hub: Hub, **overrides) -> str:
    """Creates a product in the REAL catalogue through `inventory.products.create` and returns its
    id from `new_ids[0]` — never composed by hand nor resolved by searching the list back, so a
    battery is not tied to how `inventory` orders its rows.

    Defaults cover every field the schema demands (`tax_category_key` is required since
    inventory#38/#21: an untaxed product cannot be sold); `overrides` lets a test set only what it
    cares about (stock, unit_code, thresholds, …), same shape as the ported `sales_e2e.rs`/
    `inventory_*_e2e.rs` helpers."""
    payload = {
        "name": unique("product"),
        "sku": unique("sku"),
        "price": 1000,
        "cost": 0,
        "stock": 0,
        "product_type": "physical",
        "ean13": None,
        "description": "",
        "tax_category_key": "product.generic",
        "image": "",
    }
    payload.update(overrides)
    out = hub.run("inventory.products.create", payload)
    product_id = (out.get("new_ids") or [None])[0]
    if not isinstance(product_id, str) or not product_id:
        raise AssertionError(
            f"inventory.products.create did not answer the product id in new_ids[0]: {out}"
        )
    return product_id


def product(hub: Hub, product_id: str) -> dict:
    """The full row of one product, through the public query."""
    rows = hub.query("inventory.products.get", {"product_id": product_id})
    if not rows:
        raise AssertionError(f"inventory.products.get found nothing for {product_id}")
    return rows[0]


def stock_of(hub: Hub, product_id: str) -> float:
    return product(hub, product_id)["stock"]


def cash_method_id(hub: Hub) -> str:
    """Id of the CASH method from the hub's seeded catalogue — needed by any battery that drives
    stock through a REAL `sales.complete_sale` (never composed by hand, sales#20)."""
    rows = hub.query("sales.payment_methods")
    cash = next((r for r in rows if r.get("type") == "cash"), None)
    if cash is None:
        raise AssertionError(
            f"the hub's catalogue must carry the `cash` method: {rows}"
        )
    return cash["id"]


def wait_until(poll, accept=bool, timeout: float = 5.0, interval: float = 0.25):
    """Retries `poll()` (a zero-arg callable) until `accept(value)` is true or `timeout` runs out,
    then returns whatever `poll()` last answered — never raises, so the caller's own `check()`
    still names the mismatch instead of a bare timeout.

    Why this exists: `sale.completed`/`sale.voided` are written to the outbox inside the same
    transaction as the command, but the LISTENER of that event — `inventory.stock.decrease_on_sale`
    — only runs once the runtime's outbox relay picks the row up (a 1 s poll loop the real server
    always runs). A cross-module promise like "charging the sale decrements the stock" is therefore
    eventually-consistent by design, and asserting it without waiting would be timing the relay's
    poll tick, not the contract. There is no on-demand drain over HTTP (module-toolkit#135), so this
    is the only door: wait for the real relay, bounded, and let the caller's `check()` name what it
    actually saw when the wait runs out."""
    deadline = time.monotonic() + timeout
    value = poll()
    while not accept(value) and time.monotonic() < deadline:
        time.sleep(interval)
        value = poll()
    return value
