/**
 * Build step: write per-route HTML files with the correct <title>, meta
 * description, canonical and Open Graph tags baked in, so search engines and
 * social previews get the right metadata before any JavaScript runs.
 *
 * Output (in dist/public):
 *   index.html               -> homepage (canonical "/")
 *   services/index.html, book/index.html, ... -> one per page in shared/seoPages
 *   app.html                 -> generic SPA shell (no canonical) for dynamic routes
 *   404.html                 -> SPA shell with noindex; Vercel serves it with HTTP 404
 *
 * Run after `vite build`.
 */
import fs from "fs";
import path from "path";
import { BASE_URL, SITE_NAME, indexablePages, type SeoPage } from "../shared/seoPages";

const outDir = path.resolve(process.cwd(), "dist/public");
const shellPath = path.join(outDir, "index.html");
const shell = fs.readFileSync(shellPath, "utf8");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setMeta(html: string, attr: "name" | "property", key: string, value: string) {
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" data-rh="true" />`;
  const re = new RegExp(`<meta ${attr}="${key}"[^>]*>`);
  return re.test(html) ? html.replace(re, tag) : html.replace("</title>", `</title>\n    ${tag}`);
}

function renderPage(page: SeoPage) {
  const fullTitle = `${page.title} | ${SITE_NAME}`;
  const url = `${BASE_URL}${page.path}`;
  let html = shell.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = setMeta(html, "name", "description", page.description);
  html = setMeta(html, "name", "robots", "index, follow");
  html = setMeta(html, "property", "og:title", fullTitle);
  html = setMeta(html, "property", "og:description", page.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", fullTitle);
  html = setMeta(html, "name", "twitter:description", page.description);
  html = html.replace(
    "</title>",
    `</title>\n    <link rel="canonical" href="${url}" data-rh="true" />`,
  );
  return html;
}

// 1. Generic shells first (from the untouched build output)
fs.writeFileSync(path.join(outDir, "app.html"), shell);
fs.writeFileSync(
  path.join(outDir, "404.html"),
  setMeta(shell, "name", "robots", "noindex, follow").replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>Page Not Found | ${SITE_NAME}</title>`,
  ),
);

// 2. One file per indexable page
for (const page of indexablePages) {
  if (page.hidden) continue;
  const file =
    page.path === "/"
      ? shellPath
      : path.join(outDir, page.path.replace(/^\//, ""), "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderPage(page));
  console.log(`[prerender-head] ${page.path} -> ${path.relative(outDir, file)}`);
}
