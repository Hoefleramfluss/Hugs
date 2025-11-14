import { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import api from '../../../services/api';
import { Page } from '../../../types';

const PageBuilderIndex: NextPage = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setLoading(true);
        const allPages = await api.getPages();
        setPages(allPages);
      } catch (err) {
        console.error('Failed to fetch pages:', err);
        setError('Could not load pages.');
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, []);

  return (
    <AdminLayout title="Website Builder">
      {loading && <p>Loading available pages...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-2">
          {pages.map((page) => (
            <div key={page.id} className="bg-surface rounded-lg p-6 shadow">
              <h2 className="text-xl font-semibold text-primary mb-2">{page.title}</h2>
              <p className="text-sm text-on-surface-light mb-4">Slug: {page.slug}</p>
              <Link
                href={`/admin/page-builder/${page.slug}`}
                className="inline-block bg-primary text-white font-semibold px-4 py-2 rounded hover:bg-primary-dark"
              >
                Open Builder
              </Link>
            </div>
          ))}
          {pages.length === 0 && (
            <div className="bg-surface rounded-lg p-6 shadow text-center">
              <p>No pages found. Seed data only includes the home page.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default PageBuilderIndex;
