import { useEffect } from "react";

export interface SeoConfig {
  title: string;
  description: string;
  /** Route path, e.g. "/" or "/propietarios" — used for canonical + og:url */
  path: string;
}

const BASE_URL = "https://canaescapes.com";

function upsertMeta(key: "name" | "property", keyVal: string, content: string) {
  let el = document.head.querySelector(`meta[${key}="${keyVal}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(key, keyVal);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Sets per-page document title and SEO/social meta tags. */
export function useSeo({ title, description, path }: SeoConfig) {
  useEffect(() => {
    const url = BASE_URL + path;
    document.title = title;
    upsertMeta("name", "description", description);
    upsertCanonical(url);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
  }, [title, description, path]);
}
