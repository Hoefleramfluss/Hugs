# Lighthouse Performance & UX Tips

1. **Preload critical fonts**: The Inter font is already loaded via Google Fonts. Consider self-hosting and using `font-display: swap` (already configured) to avoid FOIT.
2. **Optimize hero images**: Ensure hero assets are high-resolution but compressed (WebP/AVIF). Provide descriptive alt text and leverage Next.js image `priority` for above-the-fold assets.
3. **Leverage caching**: Static assets served via `/public` should include long-lived caching headers (configured in `next.config.js`). When updating assets, fingerprint file names to prevent stale caches.
4. **Minimize third-party scripts**: Audit analytics and marketing tags regularly. Remove unused tags and load remaining scripts with `async` or `defer`.
5. **Use responsive images**: Confirm each `next/image` component specifies appropriate `sizes` to reduce over-downloading on mobile devices.
6. **Reduce unused JavaScript**: Review bundle analyzer reports (`NEXT_ANALYZE=1 next build`) and split large components with dynamic imports. Remove dead code paths in admin dashboards.
7. **Improve CLS**: Reserve layout space with fixed height containers for late-loading content (e.g., product cards, hero sections) to maintain layout stability.
8. **Monitor API latency**: The `apiSafeFetch` helper includes a fallback and timeout. Monitor backend response times to avoid long TTFB spikes during SSG.
9. **Implement PWA features**: Add a service worker and manifest for offline browsing of catalog data. Precache fallback products to serve static experiences when offline.
10. **Run scheduled audits**: Integrate Lighthouse CI or scheduled GitHub Actions to catch regressions. Track metrics such as FCP, LCP, TTI, and CLS.
