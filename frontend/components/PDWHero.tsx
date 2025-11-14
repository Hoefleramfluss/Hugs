import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Product } from '../types';

interface PDWHeroProps {
  product: Product;
}

const formatTimeLeft = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const PDWHero: React.FC<PDWHeroProps> = ({ product }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;

    const now = Date.now();
    const promoEndsAt = (product as unknown as { promoEndsAt?: string })?.promoEndsAt
      ? new Date((product as unknown as { promoEndsAt?: string }).promoEndsAt as string).getTime()
      : now + 48 * 3600 * 1000;

    const updateCountdown = () => {
      const diff = promoEndsAt - Date.now();
      setTimeLeft(diff > 0 ? formatTimeLeft(diff) : null);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [product]);

  if (!product) return null;

  const imageUrl = product.images?.[0]?.url ?? 'https://placehold.co/1200x600?text=Produkt+der+Woche';

  const handleShareClick = () => {
    if (typeof window === 'undefined') return;

    try {
      (window as typeof window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer?.push?.({
        event: 'pdw_click',
        product: product.slug,
      });
    } catch (_) {
      // no-op: analytics optional
    }
  };

  return (
    <section className="relative bg-black text-white overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={imageUrl}
          alt={product.images?.[0]?.altText ?? product.title}
          fill
          priority
          sizes="(min-width: 1024px) 70vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
      </div>

      <div className="relative container mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
              Produkt der Woche
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">{product.title}</h1>
            <p className="max-w-3xl text-base text-white/80 md:text-lg">{product.description}</p>
            <p className="text-3xl font-bold text-primary-100 md:text-4xl">€{product.price.toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/product/${product.slug}`}
              className="inline-flex items-center rounded-full bg-primary px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-primary-dark"
            >
              Zum Produkt
            </Link>
            <button
              type="button"
              onClick={handleShareClick}
              className="rounded-full border border-white px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Teile
            </button>
          </div>

          {timeLeft && (
            <div className="rounded-full bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Aktion endet in: <span className="font-bold text-white">{timeLeft}</span>
            </div>
          )}

          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl">
            <Image
              src={imageUrl}
              alt={product.images?.[0]?.altText ?? product.title}
              width={1200}
              height={700}
              sizes="(min-width: 1280px) 60vw, (min-width: 768px) 75vw, 100vw"
              className="h-full w-full object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PDWHero;
