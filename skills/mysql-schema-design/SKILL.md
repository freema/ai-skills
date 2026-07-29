---
name: mysql-schema-design
description: "Design MySQL 8 schemas that enforce data integrity — naming conventions, NOT NULL/DEFAULT semantics, datetime vs timestamp, DECIMAL for money, FK ON DELETE rules, CHECK constraints, collations, primary keys, index hygiene. Trigger: 'CREATE TABLE', 'design a schema', 'database migration', 'MySQL schema', 'add a column', 'foreign key'."
---

# MySQL Schema Design — rules that don't betray you

Distilled from [MySQL: deset pravidel pro schéma, které nezradí](https://phpfashion.com/cs/deset-pravidel-pro-navrh-mysql-schematu) by David Grudl (phpfashion.com).

**Core principle: the database is the last guardian of integrity.** The application validates for the user (nice messages, their language); the database *guarantees* — across imports, migrations, manual SQL, second applications, buggy code. Agreements don't survive in data. Only what the schema enforces survives.

Applies to **MySQL 8.0.16+** (enforced CHECK constraints) and **InnoDB**.

## Rule 0: Strict mode is the precondition

Without strict `sql_mode` every rule below degrades from a guarantee to a suggestion with a silent fallback (ENUM out of range → stores `''`, overflow → clamps, long VARCHAR input → truncates, missing NOT NULL column → `0`/`''`).

Set it **on the server**, not per-connection, and **from day one**:

```
STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

Enabling strict mode over a database that already contains truncated/zeroed data means crashes on the first UPDATE of an affected row — months later.

## Rule 1: Table names are singular — `post`, not `posts`

- Singular maps 1:1 to the domain class (`Post` ↔ `post`) with no translation layer.
- It keeps table families together alphabetically: `post`, `post_slug`, `post_tag` — `posts` would sort away from its relatives.

Names in a database are a **public API**, not an internal detail (queries, reports, exports, integrations depend on them). Renaming a column is the same caliber as changing a public method signature. Therefore:

- `snake_case`, lowercase, nothing that requires quoting.
- PK is always `id`; FK is `<singular>_id`; self-reference is `parent_id`. With multiple FKs to one table, the name carries the **role**, not the target: `author_id`, `reporter_id`.
- Module prefix only when it starts to hurt (`shop_order`); inside a module, FKs don't repeat the prefix.
- Encode **meaning, not implementation**: units yes (`weight_grams`, `timeout_seconds` — a bare number would be ambiguous), types no (`amount_int`, `data_json` just restate the schema).

## Rule 2: NOT NULL, and DEFAULTs that don't lie

Nullable **only when the absence of a value is a fact about the world**, not a technical state. For numbers and dates this decides itself. For strings you suddenly have two empties (`NULL` and `''`) — pick one and write it into the schema. Usually:

```sql
`meta_title` varchar(160) NOT NULL DEFAULT '',
```

(In PHP both `null` and `''` are falsy, so the distinction you carefully keep in the DB is invisible to the app anyway.) The rare exception — `''` = "deliberately empty, don't inherit" vs `NULL` = "not filled in" — is allowed, but the meaning **must** go into `COMMENT`.

Why be stingy with NULL? It behaves unexpectedly:

- `WHERE col <> 'x'` does **not** return NULL rows — the most common silent bug.
- `col NOT IN (subquery)` returns nothing if the subquery contains a single NULL.
- `UNIQUE` treats NULLs as mutually distinct (any number pass); `GROUP BY` merges them into one group.

**DEFAULT is a semantic claim, not a patch.** Only default when the value is domain-meaningful at row creation. `status DEFAULT 'draft'` — yes, orders really start as drafts. `price DEFAULT 0` on a mandatory price — no; that zero is indistinguishable from a real value and cancels the protection strict mode gave you. Let a mandatory field without a value fail.

## Rule 3: `_at` is a moment, `_date` is a day

- **Moment in a row's life** → suffix `_at`, type `datetime`: `created_at`, `published_at`, `deleted_at`, `expires_at` (future is still a moment — the suffix follows the type, not the past tense).
- **Calendar day, timezone-independent** → `<noun>_date`, type `date`: `birth_date`, `invoice_date`, `due_date`.

A calendar day stored as datetime is a bug waiting to fire: midnight gets glued on, then a timezone conversion shifts it — 15 Mar 00:00 becomes 14 Mar 23:00 and the birth date is suddenly a day earlier. **A calendar day has no zone, so don't give it one.**

Columns like `valid_from`/`valid_to` have no suffix and that's fine — pick the type by domain (subscription runs from a moment → datetime; coupon valid from a day → date).

One vocabulary across the schema: always `created_at`, never a mix of `create_time` and `date_added`. And mirror-wise: the same name must not mean two different things in two tables.

## Rule 4: TIMESTAMP — never

Two reasons, each sufficient alone: the year-2038 limit, and the hidden conversion by connection timezone (what you store and what you read back differ by who asks). Use `DATETIME` — stores what it gets, returns what it stored.

Discipline moves to you: the convention prescribes **consistency**, not UTC — whole database in one zone, convert at display time. Beware: `DEFAULT CURRENT_TIMESTAMP` and `NOW()` insert time in the **session** zone; if the server `default_time_zone` diverges from historical data, new rows silently get a different zone.

## Rule 5: "X changed" is not "something changed"

Two columns that look the same and aren't — ask: *what should this column measure?*

- **`modified_at`** measures a **domain change** ("last edited" from the reader's perspective). Toggling a flag or recomputing a view counter must not move it. `ON UPDATE CURRENT_TIMESTAMP` is wrong here — a trigger watching only the listed columns must maintain it.
- **`updated_at`** measures **"something changed"** — a row version / concurrency token. Here `ON UPDATE CURRENT_TIMESTAMP` is exactly right, and a trigger would be worse (it would have to enumerate every editable column and silently go stale when the eleventh is added).

```sql
DELIMITER ;;

-- BEFORE, because only there does SET NEW.* have any effect
CREATE TRIGGER `page_before_update_touch_modified_at`
BEFORE UPDATE ON `page` FOR EACH ROW
BEGIN
    -- COLLATE bin on both sides: without it a diacritics fix doesn't count as a change (rule 11)
    IF NEW.content COLLATE utf8mb4_0900_bin <> OLD.content COLLATE utf8mb4_0900_bin
       -- <=> is NULL-safe equality; the trigger must not override a manually set date (migration, import)
       AND NEW.modified_at <=> OLD.modified_at THEN
        SET NEW.modified_at = CURRENT_TIMESTAMP;
    END IF;
END;;

DELIMITER ;
```

**Every magically maintained column needs a `COMMENT`** naming what fills it. Especially `updated_at` ("concurrency token, ON UPDATE is intentional") — otherwise a future reader "fixes" it into a trigger and silently breaks optimistic locking.

## Rule 6: A boolean is an adjective — the procedure, not the shape

Don't mandate an `is_` prefix (that's Hungarian notation for a type), but don't ban it either. The procedure:

1. **Verify it should be a boolean at all.** A state whose *moment* matters belongs in a timestamp (`read_at` carries both for free). More than two states → enum. A value derivable from another column shouldn't be stored (subcategory = has `parent_id`).
2. **Try an adjective/participle**: `published`, `visible`, `pinned`. Always **positive polarity** — `WHERE NOT disabled` is a puzzle.
3. **When no adjective fits, reframe**: `use_avatar` → `avatar_enabled`, `hide_price` → `price_visible`, `noindex` → `indexable`.
4. **Otherwise `is_`** — a legitimate fallback, not a failure. Permissions always `can_`.

Searching for the adjective is *diagnostic*: it surfaces columns that shouldn't be booleans, derivable columns, and reversed polarity. A mechanical prefix would cement all of that. Also, the main surface isn't SQL but templates: `{if $user->avatarsVisible}` reads as a sentence; `isXxx` is the shape of a *method* across the ecosystem.

Column type: always `tinyint(1) NOT NULL` with a default chosen by the **safe state** semantics (`enabled DEFAULT 1` is fine — don't flip names for the aesthetics of zero).

## Rule 7: VARCHAR(255) is cargo cult

255 comes from historical limits (1-byte length prefix, 767 B key limit) — neither holds in utf8mb4 (255 chars ≈ up to 1020 B, prefix is 2 bytes anyway, key limit is 3072 B). It optimizes nothing; it's a number copied from someone else's table.

**Length is a domain declaration and strict mode enforces it.** Best are lengths you can defend with a standard: `email varchar(254)` (RFC), `country char(2)` (ISO 3166), `variable_symbol varchar(10)` (bank won't take longer). Where no standard exists, a consciously chosen cap (`slug varchar(100)`) is still better than 255 — you know *why* you chose it; the point of a cap is to bound data and cut off garbage, not to hit a magic constant.

- `TEXT` is 64 KB **bytes**, not characters — for HTML article content go straight to `MEDIUMTEXT`.
- `ENUM` is not a mistake for a small fixed set (1 byte in every index, values readable from `information_schema`, appending a value is `ALGORITHM=INSTANT`). Costs: `ORDER BY` sorts by internal order; `WHERE status = 1` compares against position, not value.

## Rule 8: Money is DECIMAL

`FLOAT`/`DOUBLE` are banned for anything computed or compared exactly — binary approximation, `SUM()` accumulates errors, `= 0.3` doesn't work. Leave float for measurements where approximation is inherent (sensors, coordinates).

DECIMAL vs integer cents: integer cents are fine **in the application**, but in a column they carry the interpretation outside the schema — someone will eventually print them without dividing by 100. Ideal split: **`DECIMAL` in the schema, integers or a money object in code**, conversion in one place. The driver returns DECIMAL as a string precisely because PHP has no exact decimal type — don't cast to float, that throws away exactly what you paid for.

- Scale by domain: `DECIMAL(9,2)` amounts, `(9,4)` unit prices/rates, `(12,6)` exchange rates.
- Non-negativity via CHECK, not `UNSIGNED` (deprecated on DECIMAL since 8.0.17).
- Trap even under strict mode: inserting higher precision **silently rounds** (warning only). Rounding is a domain decision — make it consciously. `ROUND()` is half-away-from-zero; there is no banker's rounding.

## Rule 9: ON DELETE by the nature of the relationship

Foreign keys explicit, with **both** clauses. `ON UPDATE CASCADE` as default — with surrogate keys it practically never fires (ids don't change), but when renumbering does happen it runs atomically instead of forcing `SET FOREIGN_KEY_CHECKS=0` (which leaves orphans).

`ON DELETE` has a single decision question: **is the child a part of the parent, or an independent thing that points at it?**

| relationship | rule | example |
|---|---|---|
| composition | `CASCADE` | `order_item` → `customer_order`, pivot tables |
| association | `RESTRICT` | `post.author_id` → `user` |
| detachment with meaning | `SET NULL` | `log.user_id` after anonymization |

`SET NULL` is the worst possible default — the reference evaporates, the child dangles, and it forces a nullable column. Use it only where an orphaned child still makes sense and NULL *means* something.

Two traps: **cascade deletes don't fire triggers** (InnoDB handles it below the SQL layer), so trigger-held invariants get bypassed. And cascades only apply to **hard** deletes — with soft delete no real DELETE arrives and your carefully designed cascade is dead code.

## Rule 10: CHECK for invariants, not policy

CHECK constraints are enforced since 8.0.16 — use them. The axis: **domain invariant** (timeless truth — `price >= 0`, end not before start) belongs in the schema; **business policy** ("orders over 10 000 need approval") changes next year and would mean a migration.

Best use: what no other mechanism can express — relationships between columns of the same row, conditional requiredness (`A -> B` written as `NOT A OR B`):

```sql
CONSTRAINT `chk_order_shipped_needs_date`
    CHECK (`status` <> 'shipped' OR `shipped_at` IS NOT NULL),
```

**Name constraints by the rule, not the columns** — the name appears in the user-facing error. Test: read the name in a log and know what happened without opening the schema.

CHECK can't: span rows (no subqueries), use non-deterministic functions (`CURDATE()` is forbidden), or reference an `AUTO_INCREMENT` column. Don't add redundant CHECKs where a cheaper mechanism already guarantees it — `CHECK (age >= 0)` over `TINYINT UNSIGNED` is noise plus a per-write cost.

## Rule 11: Collation: 0900, or your CHECKs just sit there

`utf8mb4` always, never `utf8` (a 3-byte alias that breaks emoji). Collations from the `utf8mb4_0900_*` family (UCA 9.0) — legacy `czech_ci`, `unicode_ci` (UCA 4.0!), `general_ci`, `utf8mb4_bin` have no reason to exist in a new schema.

The part you learn from production, not docs: **comparisons and REGEXP in CHECK respect the column's collation.** Under the default `_ai_ci` this constraint happily passes `'CS'` and `'cs_CZ'`:

```sql
CHECK (`lang` REGEXP '^[a-z]{2}$')
```

Format/membership CHECKs are only meaningful over a column with `_bin`, `ascii_bin`, or `_as_cs` collation. Same trap bites triggers (rule 5): without `COLLATE utf8mb4_0900_bin`, fixing "reditel" to "ředitel" doesn't count as a change.

## Rule 12: An ascii column returns 500 instead of 404

Slugs, coupon codes, logins, API tokens hold pure ASCII, so `CHARACTER SET ascii` looks like a smart 1-byte-per-char choice. But **charset is chosen by what the column is compared against, not what lies in it** — and these are exactly the columns you search by, with values coming from outside:

```sql
-- slug varchar(100) CHARACTER SET ascii
SELECT * FROM post WHERE slug = 'muj-clanek';  -- works
SELECT * FROM post WHERE slug = 'můj-článek';  -- ERROR 1267 Illegal mix of collations
```

The connection is utf8mb4; once the incoming value contains a single non-ASCII character, conversion is impossible and the query **errors instead of returning empty**. The app never gets the chance to serve a 404 — the visitor gets a 500 for typing a diacritic in the URL. Tests won't catch it (they test existing/missing values, not values with diacritics). It's the `ascii` charset that fails, not `_bin` — every string operator from `=` to `CONCAT`, even on an empty table.

Ask "can a non-ascii value reach the comparison?", not "is the data ascii?". Keep ascii for columns filled exclusively by the app and never queried from outside (`lang`, `country`, `ip_address`). Everything else gets `utf8mb4_0900_bin` — a wrong ascii choice is an outage; a wrong utf8mb4 choice is a few bytes.

## Rule 13: The primary key propagates

`INT UNSIGNED AUTO_INCREMENT` as the default PK; `BIGINT` for tables that are pure insert streams. Why economize here when it would be premature optimization elsewhere? In InnoDB the PK is physically part of **every secondary index** and must be type-identical in **every FK** pointing at it — you pay its size (1 + indexes + references) times.

- `AUTO_INCREMENT` follows the **maximum, not the row count**. It never recycles; gaps from rollbacks or `INSERT IGNORE` stay. A queue or log exhausts `INT` with a few million live rows. Judge by lifetime inserts, not resident rows.
- **The risk is asymmetric.** Undersizing is a production incident (INSERT fails; `ALTER` to BIGINT is a long, heavy operation at the worst moment). Oversizing costs 4 bytes per row. When in doubt, take `BIGINT`.
- `UNSIGNED` matters on `INT` (doubles the range to 4.29 billion, often decides you don't need BIGINT). On `BIGINT` skip it — the signed range is already absurd and the upper half is unreachable from PHP anyway.

## The rest is hygiene

- **Name every index and constraint yourself.** Auto-generated `post_ibfk_1` numbering diverges between environments (drop/re-add, dump vs migrations) — then `DROP FOREIGN KEY post_ibfk_2` passes on one environment and fails (or drops the wrong thing) on another.
- **Hybrid naming**: constraints with prefix (`fk_post_blog`, `chk_post_lang_format`) because their name lands in error messages; indexes without prefix, read only by whoever tunes queries.
- **Technical vs performance indexes**: the FK-backing index and `UNIQUE` on the natural key exist from the start — they're constraints, not optimizations. Others are born from real queries (`EXPLAIN`, slow log). Name accordingly: technical by columns, performance by the query it serves (`post_listing`).
- An index no query uses is pure cost — slows every write, eats buffer pool.
- **Leftmost prefix**: index `(a, b, c)` serves `a`, `a+b`, `a+b+c` — not `b` alone. Recipe: equality columns first, then at most one range/sort column; the index stops filtering after the range column.
- The PK is implicitly appended to every secondary index — don't repeat it there; covering indexes often come for free (the main reason behind rule 13).
- Don't index a low-cardinality column alone (a boolean filters nothing); as part of a composite at the right position it's fine.
- Index `(a)` next to `(a, b)` is redundant — leftmost prefix covers it.
- An FK column must copy the target PK's type **exactly**, including `UNSIGNED`, or the FK won't even create.

## When to break all of this

Unbreakable: the zeroth preconditions (strict mode, utf8mb4, explicit FKs) and facts about MySQL. Everything else may be broken **with a reason that would stand as a decision record** — concrete, written down, surviving "why is it like this here?" two years later. "I don't like it" isn't a reason; "this table has 500M rows and we won't survive a rebuild" is.

Put the deviation where the reader meets it: in the column's or table's `COMMENT`. Not in a commit message, not in a wiki. **`SHOW CREATE TABLE` is the only documentation that travels with the data.**

Why pour this energy into the schema when the app is faster to write? **Because you'll rewrite the application one day. Not the data.**
