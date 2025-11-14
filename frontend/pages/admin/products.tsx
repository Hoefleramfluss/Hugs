import { GetServerSideProps, NextPage } from 'next';
import api from '../../services/api';
// Fix: Use relative path for type imports
import { Product } from '../../types';
import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';

interface AdminProductsPageProps {
  initialProducts: Product[];
}

const AdminProductsPage: NextPage<AdminProductsPageProps> = ({ initialProducts }) => {
  const [products, setProducts] = useState(initialProducts);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const router = useRouter();

  const handleSetPDW = async (productId: string) => {
    setLoadingProductId(productId);
    try {
        // This API call triggers the atomic swap on the backend
        await api.setProductOfWeek(productId);
        // Refresh the page to show the new state
        router.replace(router.asPath);
    } catch (error) {
        console.error("Failed to set product of the week:", error);
        alert("Error: Could not set product of the week.");
    } finally {
        setLoadingProductId(null);
    }
  };

  return (
    <AdminLayout title="Manage Products">
      <div className="bg-surface rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-surface-light">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">SKU (Default)</th>
              <th className="p-4">Price</th>
              <th className="p-4">Product of Week</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-b border-surface-light last:border-b-0 hover:bg-surface-light">
                <td className="p-4">{product.title}</td>
                <td className="p-4">{product.variants[0]?.sku || 'N/A'}</td>
                <td className="p-4">€{product.price.toFixed(2)}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleSetPDW(product.id)}
                    disabled={product.productOfWeek || !!loadingProductId}
                    className={`py-1 px-3 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      product.productOfWeek 
                        ? 'bg-secondary text-background cursor-default' 
                        : 'bg-primary/20 text-primary hover:bg-primary/40'
                    }`}
                  >
                    {loadingProductId === product.id ? 'Saving...' : product.productOfWeek ? 'Active' : 'Set as PDW'}
                  </button>
                </td>
                <td className="p-4">
                  {/* Placeholder for edit/delete buttons */}
                  <button className="text-blue-400 hover:text-blue-300">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  // In a real app, you'd verify admin credentials here
  try {
    const products = await api.getProducts();
    return {
      props: { initialProducts: products },
    };
  } catch (error) {
    console.error("Failed to fetch products for admin page:", error);
    return {
      props: { initialProducts: [] },
    };
  }
};

export default AdminProductsPage;
