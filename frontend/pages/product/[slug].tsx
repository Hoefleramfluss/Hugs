import Head from 'next/head';
import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import Image from 'next/image';
import { useState } from 'react';
import { Product, ProductVariant } from '../../types';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';
import RecommendedSlider from '../../components/RecommendedSlider';
import { fetchProductBySlugWithFallback, fetchProductsWithFallback } from '../../lib/staticProductData';
import {
  CANONICAL_BASE_URL,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_REVALIDATE_SECONDS,
  DEFAULT_TITLE,
} from '../../constants';

interface ProductPageProps {
  product: Product;
  relatedProducts: Product[];
}

const ProductPage: NextPage<ProductPageProps> = ({ product, relatedProducts }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);

  const handleAddToCart = () => {
    addToCart({
      id: selectedVariant.id,
      productId: product.id,
      title: product.title,
      sku: selectedVariant.sku,
      price: selectedVariant.priceOverride ?? product.price,
      quantity: quantity,
      imageUrl: product.images?.[0]?.url,
    });
  };

  if (!product) {
    return <div>Product not found</div>;
  }

  const pageTitle = `${product.title} | Hugs Garden Growshop`;
  const canonicalUrl = `${CANONICAL_BASE_URL}/product/${product.slug}`;
  const metaDescription = product.description || DEFAULT_META_DESCRIPTION;

  return (
    <div className="bg-background">
      <Head>
        <title>{pageTitle || DEFAULT_TITLE}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="twitter:card" content="summary_large_image" />
      </Head>
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div>
            <Image
              src={product.images?.[0]?.url || 'https://placehold.co/600x600?text=Product'}
              alt={product.images?.[0]?.altText || product.title}
              width={600}
              height={600}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full h-auto object-cover rounded-lg shadow-lg"
              priority
            />
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
            <p className="text-3xl font-bold text-primary mb-6">€{product.price.toFixed(2)}</p>
            <p className="text-on-surface-variant mb-6">{product.description}</p>
            
            {/* Variant Selector if more than one */}
            {product.variants.length > 1 && (
                <div className="mb-6">
                    {/* Add variant selector UI here */}
                </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                className="w-20 p-2 border rounded-md"
              />
              <button onClick={handleAddToCart} className="flex-grow bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-md">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </main>

      {relatedProducts.length > 0 && <RecommendedSlider products={relatedProducts} />}
      
      <Footer />
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const products = await fetchProductsWithFallback();
  const paths = products.map(product => ({
    params: { slug: product.slug },
  }));
  return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const [product, allProducts] = await Promise.all([
    fetchProductBySlugWithFallback(slug),
    fetchProductsWithFallback(),
  ]);

  if (!product) {
    return { notFound: true };
  }

  const relatedProducts = allProducts.filter(p => p.id !== product.id).slice(0, 4);

  return {
    props: {
      product,
      relatedProducts,
    },
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  };
};


export default ProductPage;
