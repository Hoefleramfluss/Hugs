import Head from 'next/head';
import { GetStaticProps, NextPage } from 'next';
import { Product } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PDWHero from '../components/PDWHero';
import ProductCard from '../components/ProductCard';
import {
  CANONICAL_BASE_URL,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_REVALIDATE_SECONDS,
} from '../constants';
import { fetchProductsWithFallback } from '../lib/staticProductData';

interface HomePageProps {
  productOfWeek: Product | null;
  otherProducts: Product[];
}

const HomePage: NextPage<HomePageProps> = ({ productOfWeek, otherProducts }) => {
  const pageTitle = 'Hugs Garden Growshop | Premium Indoor Gardening Supplies';
  const canonicalUrl = `${CANONICAL_BASE_URL}/`;

  return (
    <div className="bg-background">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={DEFAULT_META_DESCRIPTION} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={DEFAULT_META_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="twitter:card" content="summary_large_image" />
      </Head>
      <Header />
      <main>
        {productOfWeek && <PDWHero product={productOfWeek} />}

        <div className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {productOfWeek ? 'More Products' : 'Our Products'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {otherProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const allProducts = await fetchProductsWithFallback();
  const productOfWeek = allProducts.find(p => p.productOfWeek) || null;
  const otherProducts = allProducts.filter(p => p.id !== productOfWeek?.id);

  return {
    props: {
      productOfWeek,
      otherProducts,
    },
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  };
};

export default HomePage;
