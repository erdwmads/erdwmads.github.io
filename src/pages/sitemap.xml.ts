import { contentPages, siteMetadata } from "../data/site";

export function GET() {
  const now = new Date().toISOString().slice(0, 10);
  const urls = contentPages.map((page) => {
    const loc = new URL(page.href, `${siteMetadata.url}/`).toString();
    const priority = page.href === "index.html" ? "1.0" : "0.7";

    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${now}</lastmod>`,
      "    <changefreq>weekly</changefreq>",
      `    <priority>${priority}</priority>`,
      "  </url>"
    ].join("\n");
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } }
  );
}
