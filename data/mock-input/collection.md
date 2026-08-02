# My structured collection

Fill in every section below, then run **Option A** from `prompts/phase-1-foundation.md`. Replace the bracketed placeholders. Keep it short and concrete; this is the spec the generator is built from. A filled-in example (the shipped bank scenario) follows at the bottom for reference.

---

## Collection

- **Name:** `[collection_name]`  (must match `EVENTS_COLLECTION` in `.env`)
- **One document is:** [one sentence: one order? one support ticket? one shipment?]
- **Approximate volume for the demo:** [e.g. ~60 records]

## Fields

| Field | Type | Notes / units |
|---|---|---|
| `_id` | string | stable id, e.g. `ord_0001` |
| `[field]` | `[string \| number \| Date \| boolean]` | [meaning; for numbers, the unit] |
| `[field]` | | |
| `[field]` | | |

## Enums

List every field whose value comes from a fixed set, and the allowed values.

- `[field]`: `[VALUE_A]`, `[VALUE_B]`, `[VALUE_C]`
- `[field]`: `[VALUE_A]`, `[VALUE_B]`

## Units and conventions

[e.g. amounts are stored in minor units (cents); timestamps are UTC BSON dates; quantities are integers.]

## Consistency rules

Rules the data must always obey, so answers stay coherent.

- [e.g. a record with status `SHIPPED` always has a non-null `shippedAt`.]
- [e.g. `total` equals the sum of its line-item amounts.]

## Verifiable facts (the anchors)

The specific questions your demo will ask, each with the answer the data must make true. The generator seeds a record for each and asserts it before loading, so these are the questions you can safely demo.

- [e.g. "largest order this month" -> exactly one order at $25,000, dated this month, and a larger one dated last month so the month filter matters.]
- [e.g. "total shipped value for customer_03" -> a specific figure that per-record amounts sum to.]
- [optional edge/anchor case, e.g. one record that violates a rule for the agent to flag.]

## Sample records (hand-author 3 to 5)

Paste representative documents you write from scratch. These are mock, not exported; they anchor field shapes, realistic value ranges, and naming. JSON is easiest.

```json
[
  {
    "_id": "ord_0001",
    "...": "..."
  }
]
```

---

## Reference: the shipped bank scenario, filled in

This is what a completed `collection.md` looks like, matching `data/sample/activity_events.ts`.

- **Name:** `activity_events`
- **One document is:** one operational event at a bank (a login, a balance query, a transfer, a user change).
- **Approximate volume:** ~60 records.

Fields: `_id` (string, `evt_0001`), `userId` / `userName` (string, the actor), `action` (string enum), `amount` (number, minor units, non-zero only for transfers), `channel` (string enum), `status` (string enum), `timestamp` (Date, UTC).

Enums: `action` = `LOGIN`, `BALANCE_QUERY`, `TRANSFER_INITIATED`, `TRANSFER_APPROVED`, `USER_CREATED`, `USER_MODIFIED`; `channel` = `WEB`, `MOBILE`, `API`, `BRANCH`; `status` = `SUCCESS`, `FAILED`, `PENDING`.

Units: `amount` in minor units (cents); `1500000` means 15,000.00.

Consistency rules: only `TRANSFER_INITIATED` and `TRANSFER_APPROVED` carry a non-zero `amount`; per-user successful-transfer totals sum to the global total.

Verifiable facts: "largest transfer this month" is a single $25,000.00 transfer dated this month, with a larger $30,000.00 transfer dated last month so the month filter matters; a dual-control violation where one operator both initiates and approves the same high-value transfer, for the hybrid demo.
