import { contentPages, siteMetadata } from "../data/site";

// No lastmod or changefreq: a build-date stamp on every URL says nothing about when a page changed.
// Home is listed at the site root, matching its canonical URL.
export function GET() {
  const urls = contentPages.map((page) => {
    const loc = new URL(page.href === "index.html" ? "" : page.href, `${siteMetadata.url}/`).toString();
    const priority = page.href === "index.html" ? "1.0" : "0.7";

    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <priority>${priority}</priority>`,
      "  </url>"
    ].join("\n");
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } }
  );
}
