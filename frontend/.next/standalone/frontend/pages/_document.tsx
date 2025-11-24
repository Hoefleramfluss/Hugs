import { Html, Head, Main, NextScript } from 'next/document';
import {
  CANONICAL_BASE_URL,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_TITLE,
} from '../constants';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content={DEFAULT_META_DESCRIPTION} />
        <meta property="og:title" content={DEFAULT_TITLE} />
        <meta property="og:description" content={DEFAULT_META_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={CANONICAL_BASE_URL} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </Head>
      <body className="bg-background text-on-surface">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
