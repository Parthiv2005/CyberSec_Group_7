
# Exploit payload to try on /search:
#   id = -1 UNION SELECT username, password 0 FROM users --


import sqlite3
from flask import Flask, request, g

app = Flask(__name__)
DB = "shop.db"


def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.executescript("""
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS users;

        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT,
            price REAL
        );
        CREATE TABLE users (
            username TEXT,
            password TEXT
        );

        INSERT INTO products VALUES (1, 'Keyboard', 1200.0);
        INSERT INTO products VALUES (2, 'Mouse', 500.0);
        INSERT INTO products VALUES (3, 'Monitor', 9000.0);

        -- sensitive table an attacker should NOT be able to read
        INSERT INTO users VALUES ('admin', 'S3cretPass!');
        INSERT INTO users VALUES ('bob', 'bobpass123');
    """)
    conn.commit()
    conn.close()


def get_conn():
    if "conn" not in g:
        g.conn = sqlite3.connect(DB)
    return g.conn


@app.teardown_appcontext
def close_conn(exc):
    conn = g.pop("conn", None)
    if conn is not None:
        conn.close()


# ---------------------------------------------------------------------
# (a) VULNERABLE implementation
# Root cause: user input is concatenated directly into the SQL string,
# so an attacker can append UNION SELECT ... to pull data from another
# table (here: the `users` table) through the `products` search field.
# ---------------------------------------------------------------------
@app.route("/search")
def search():
    product_id = request.args.get("id", "")
    conn = get_conn()
    cur = conn.cursor()

    query = f"SELECT id, name, price FROM products WHERE id = {product_id}"
    try:
        cur.execute(query)
        rows = cur.fetchall()
    except sqlite3.Error as e:
        return f"<pre>Query: {query}\nError: {e}</pre>"

    return render_rows(query, rows)


# ---------------------------------------------------------------------
# (d) MITIGATION implemented: parameterized query (prepared statement).
# The same payload is now treated as plain data for the `id` column,
# not as SQL, so the UNION SELECT attack fails / returns no rows.
# ---------------------------------------------------------------------
@app.route("/search_safe")
def search_safe():
    product_id = request.args.get("id", "")
    conn = get_conn()
    cur = conn.cursor()

    query = "SELECT id, name, price FROM products WHERE id = ?"
    try:
        cur.execute(query, (product_id,))
        rows = cur.fetchall()
    except sqlite3.Error as e:
        return f"<pre>Query: {query}  params=({product_id!r},)\nError: {e}</pre>"

    return render_rows(f"{query}  params=({product_id!r},)", rows)


def render_rows(query_shown, rows):
    html = [f"<p><b>Executed:</b> {query_shown}</p><table border=1 cellpadding=5>"]
    html.append("<tr><th>col1</th><th>col2</th><th>col3</th></tr>")
    for r in rows:
        html.append("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>")
    html.append("</table>")
    return "\n".join(html)


@app.route("/")
def home():
    return """
    <h2>Mini Shop - Product Search</h2>

    <h3>Search (vulnerable)</h3>
    <form action="/search" method="get">
        Product ID: <input type="text" name="id" size="40">
        <input type="submit" value="Search">
    </form>

    <h3>Search (patched)</h3>
    <form action="/search_safe" method="get">
        Product ID: <input type="text" name="id" size="40">
        <input type="submit" value="Search">
    </form>
    """


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5050, debug=True)
