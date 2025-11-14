import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import api from '../../../services/api';
import { Page, Section } from '../../../types';

const defaultPropsByType: Record<string, Record<string, string>> = {
  hero: {
    title: 'New Hero Title',
    subtitle: 'Add a compelling subtitle',
  },
  'product-grid': {
    title: 'Featured Products',
  },
};

const PageBuilderDetail: NextPage = () => {
  const router = useRouter();
  const { slug } = router.query;
  const [page, setPage] = useState<Page | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newSectionType, setNewSectionType] = useState('hero');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || typeof slug !== 'string') return;
    const fetchPage = async () => {
      try {
        const fetched = await api.getPageBySlug(slug);
        setPage(fetched);
      } catch (err) {
        console.error('Failed to fetch page', err);
        setError('Could not load this page.');
      }
    };
    fetchPage();
  }, [router.isReady, slug]);

  const handlePropChange = (sectionId: string, key: string, value: string) => {
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId
            ? { ...section, props: { ...section.props, [key]: value } }
            : section
        ),
      };
    });
  };

  const handleAddProp = (sectionId: string) => {
    const propKey = prompt('Enter new property key');
    if (!propKey) return;
    handlePropChange(sectionId, propKey, '');
  };

  const handleRemoveSection = (sectionId: string) => {
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.filter((section) => section.id !== sectionId),
      };
    });
  };

  const handleAddSection = () => {
    if (!page || typeof slug !== 'string') return;
    const timestamp = Date.now();
    const newSection: Section = {
      id: `section-${timestamp}`,
      type: newSectionType,
      props: { ...(defaultPropsByType[newSectionType] ?? { title: 'New section' }) },
    };
    setPage({ ...page, sections: [...page.sections, newSection] });
  };

  const handleSave = async () => {
    if (!page || typeof slug !== 'string') return;
    try {
      setIsSaving(true);
      const updated = await api.updatePageSections(slug, page.sections);
      setPage(updated);
    } catch (err) {
      console.error('Failed to save page', err);
      alert('Could not save page. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sectionTypes = useMemo(() => Object.keys(defaultPropsByType), []);

  if (error) {
    return (
      <AdminLayout title="Website Builder">
        <p className="text-red-500">{error}</p>
      </AdminLayout>
    );
  }

  if (!page) {
    return (
      <AdminLayout title="Website Builder">
        <p>Loading page builder...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Editing: ${page.title}`}>
      <div className="flex items-center gap-4 mb-8">
        <label className="text-sm text-on-surface-light">
          Add Section:
          <select
            className="ml-2 border border-surface-light rounded px-2 py-1"
            value={newSectionType}
            onChange={(e) => setNewSectionType(e.target.value)}
          >
            {sectionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        <button
          onClick={handleAddSection}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Add Section
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-auto bg-secondary text-background px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Page'}
        </button>
      </div>

      <div className="space-y-6">
        {page.sections.map((section) => (
          <div key={section.id} className="bg-surface rounded-lg p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-on-surface-light uppercase tracking-wide">Section</p>
                <h2 className="text-xl font-semibold">{section.type}</h2>
              </div>
              <button
                onClick={() => handleRemoveSection(section.id)}
                className="text-red-500 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(section.props).map(([key, value]) => (
                <label key={key} className="block text-sm">
                  <span className="text-on-surface-light uppercase tracking-wide text-xs">{key}</span>
                  <input
                    className="mt-1 w-full border border-surface-light rounded px-3 py-2"
                    value={String(value)}
                    onChange={(e) => handlePropChange(section.id, key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => handleAddProp(section.id)}
              className="mt-4 text-sm text-primary hover:underline"
            >
              + Add property
            </button>
          </div>
        ))}

        {page.sections.length === 0 && (
          <div className="text-center text-on-surface-light">
            No sections yet. Use the “Add Section” controls above to get started.
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PageBuilderDetail;
