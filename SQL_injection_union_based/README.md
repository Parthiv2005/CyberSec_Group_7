# SQL Injection (UNION-based) — Cybersecurity Assignment

A product search page with two views of the same query. The vulnerable view concatenates
the product ID directly into the SQL string. The patched view binds the same ID as a
parameter instead.

**Roll number:** IIT2024086
**Variant:** SQL Injection — UNION-based data extraction

## Project structure

- `app.py` — Flask app, routes, and the SQLite setup (`products` and `users` tables).

## Run locally

Run `python app.py` from the repository root (after `pip install flask`) and open the
local demo at [127.0.0.1:5050](http://127.0.0.1:5050).

## How To

1. Open the home page and search `1` in the **vulnerable** box. The Keyboard product
   row comes back — ordinary use of the feature.
2. In the same vulnerable box, search `-1 UNION SELECT username, password, 0 FROM users --`.
   The page returns rows from the unrelated `users` table — usernames and plaintext
   passwords — instead of a product. Capture the screenshot here.
3. Show `search()` in `app.py`. The query is built with an f-string —
   `WHERE id = {product_id}` — so the submitted value becomes part of the SQL text
   itself rather than a value the SQL has to match.
4. Run the exact same payload in the **patched** box. No rows come back. Show
   `search_safe()`: the query is `WHERE id = ?` with `product_id` bound separately via
   `cur.execute(query, (product_id,))`, so the database treats it only as a literal
   value for `id`. Capture this empty result as the blocked-attempt screenshot.

**Root cause.** SQL injection occurs when untrusted input is concatenated into a query
string instead of being passed as data, so the database cannot distinguish a value the
user supplied from SQL syntax the user supplied. Anything appended after the intended
value — here, a `UNION SELECT` — is executed as part of the same query.

**Mitigation implemented.** Parameterized queries. The input is passed to the driver
separately from the SQL text and bound as a literal for its column, so it can never be
interpreted as query syntax, regardless of what it contains.

**Other mitigations.** Input validation with an allow-list can reject anything that
isn't a valid integer before it reaches the database. Least-privilege database accounts
limit how much an injected query can read or change even if one slips through — e.g. no
access to unrelated tables like `users`. Safe, generic error messages avoid leaking
schema details (table or column names) that an attacker could use to refine the attack.
