# Reflected XSS — Variant 2

This local teaching application uses HTML, CSS and JavaScript. An Express server reflects a query parameter into the HTML response. The vulnerable page is intentionally unsafe: run it only on your own machine and do not deploy it.

## Run

Install Node.js, open a terminal in this folder, and run:

```bash
npm install
npm start
```

Open http://127.0.0.1:8000/ and press Ctrl+C to stop the server.

## Demonstrate and capture evidence

1. Open **Vulnerable**, enter `apple`, and search.
2. Enter the exact payload below and click Search:

   ```html
   <script>alert('XSS')</script>
   ```

3. The server reflects the value of the `q` URL parameter in its HTML response. The browser interprets the script tag and displays an alert. Capture the popup and URL.
4. Open **Fixed**, enter the same payload and search. The payload appears as text and the alert does not execute. Capture a screenshot for the assignment.
5. Show the relevant branch in `server.js` and explain it in your own 2–3 minute narration. The URL may show encoded characters; the server decodes them when reading the query parameter. The input is not stored.

## Root cause and fix

The vulnerable route concatenates untrusted input into an HTML paragraph without encoding. The browser treats the reflected input as HTML, so the injected script runs. The fixed route applies `escapeHtml` to the input before inserting it into the HTML text context. This makes the same payload display as text. Other contexts such as JavaScript, URLs, and CSS need context-specific handling.

## Other mitigation ideas for the viva

- **Framework auto-escaping:** templates escape untrusted values by default in supported contexts; do not mark untrusted values as safe.
- **HTML sanitization:** for permitted rich HTML, use a maintained allow-list sanitizer to remove dangerous elements and attributes.
- **Content Security Policy:** restricts script sources and can reduce the impact of injection; it supplements output encoding.
- **HttpOnly cookies:** prevent JavaScript from reading those cookies, but do not stop XSS from executing or acting in the victim's session.
- **Safe DOM sinks:** use `textContent` rather than `innerHTML` for untrusted text, and validate URL destinations separately.

Only output encoding is implemented. Review your lecture slides for the alternatives and explain them in your own words.

## Ownership declaration

| Member name | Roll number | Category | Variant implemented |
| --- | --- | --- | --- |
| Fill in your name | Fill in your roll number | XSS | Variant 2: reflected XSS |

Add the other members' actual contributions in the group repository. Understand and adapt your implementation before the individual viva. Record the video and capture screenshots yourself.
