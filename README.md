# 3ideas.co.uk

Static single-page website for 3ideas, served from GitHub Pages.

This is a hand-built static reproduction of the previous WordPress site
(X theme, "Integrity Light" stack) that was hosted at FastHosts. Reference
snapshot: <https://web.archive.org/web/20211125212025/https://3ideas.co.uk/>

## Structure

```
index.html      the whole site — one page
404.html        not-found page
styles.css      all styling (no framework, no build step)
script.js       progressive enhancement only: footer year + back-to-top
fonts/          self-hosted Lato (SIL Open Font License)
images/         original media exported from the WordPress install
CNAME           custom domain for GitHub Pages
.nojekyll       serve files as-is, no Jekyll processing
```

There is no build step and no dependencies. Edit the files and push.

## Local preview

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

## Deployment

GitHub Pages serves the `main` branch from the repository root. Pushing to
`main` publishes within a minute or so.
