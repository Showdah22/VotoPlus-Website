// Voto+ website · Blog RSS feed (SSG-generated).
//
// Genera un feed RSS 2.0 al build fetchando gli articoli pubblicati.
// Servito da /blog/rss.xml (path consistente con quello sul backend, ma la
// versione ufficiale in produzione \u00e8 questa statica, generata dall'Astro
// build su GitHub Pages).

import rss from "@astrojs/rss";
import { listAllPublishedSlugs, getApiBase } from "@/lib/blogApi";

export async function GET(context) {
  const articles = await listAllPublishedSlugs();
  return rss({
    title: "Voto+ \u00b7 Blog",
    description:
      "Guide, metodo di studio e novit\u00e0 di Voto+ per gli studenti italiani delle scuole superiori.",
    site: context.site ?? "https://votoplus.it",
    items: articles.map((a) => ({
      title: a.title,
      link: `/blog/${a.slug}`,
      pubDate: a.published_at ? new Date(a.published_at) : new Date(),
      description: a.excerpt || a.meta_description || "",
      categories: a.category_name ? [a.category_name] : undefined,
      author: a.author_name || undefined,
    })),
    customData: `<language>it-IT</language>`,
    stylesheet: false,
    trailingSlash: false,
  });
}
