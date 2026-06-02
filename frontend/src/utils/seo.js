import { useEffect } from 'react';

/**
 * Lightweight per-route SEO hook for our Vite + React SPA.
 *
 * Why this exists: the static SEO in `index.html` covers the homepage well, but
 * each route should also update the visible <title> and <meta name="description">
 * so users see meaningful tab titles and so search engines that DO execute JS
 * (Google does, eventually) can index per-route variants.
 *
 * Usage inside a page component:
 *
 *   useSeo({
 *     title: 'Subscribe — Anand Sandesh Karyalay',
 *     description: 'Subscribe to the Anand Sandesh magazine in a few clicks.',
 *     canonical: 'https://anandsandeshkaryalay.online/form',
 *     noindex: false
 *   });
 */
export function useSeo({ title, description, canonical, noindex = false } = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const previousTitle = document.title;
    if (title) document.title = title;

    const setMeta = (name, content) => {
      if (!content) return null;
      let tag = document.querySelector(`meta[name="${name}"]`);
      const previous = tag ? tag.getAttribute('content') : null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
      return { tag, previous };
    };

    const setProperty = (property, content) => {
      if (!content) return null;
      let tag = document.querySelector(`meta[property="${property}"]`);
      const previous = tag ? tag.getAttribute('content') : null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
      return { tag, previous };
    };

    const setCanonical = (href) => {
      if (!href) return null;
      let link = document.querySelector('link[rel="canonical"]');
      const previous = link ? link.getAttribute('href') : null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
      return { link, previous };
    };

    const desc = setMeta('description', description);
    const ogTitle = setProperty('og:title', title);
    const ogDesc = setProperty('og:description', description);
    const ogUrl = setProperty('og:url', canonical);
    const canon = setCanonical(canonical);
    const robots = noindex
      ? setMeta('robots', 'noindex, nofollow')
      : null;

    return () => {
      document.title = previousTitle;
      if (desc?.previous != null) desc.tag.setAttribute('content', desc.previous);
      if (ogTitle?.previous != null) ogTitle.tag.setAttribute('content', ogTitle.previous);
      if (ogDesc?.previous != null) ogDesc.tag.setAttribute('content', ogDesc.previous);
      if (ogUrl?.previous != null) ogUrl.tag.setAttribute('content', ogUrl.previous);
      if (canon?.previous != null) canon.link.setAttribute('href', canon.previous);
      if (robots?.previous != null) robots.tag.setAttribute('content', robots.previous);
    };
  }, [title, description, canonical, noindex]);
}
