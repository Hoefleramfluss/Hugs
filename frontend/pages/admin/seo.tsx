import { NextPage } from 'next';
import SEOHealth from '../../components/SEO/SEOHealth';
import SEOMetaEditor from '../../components/SEO/SEOMetaEditor';
import SEOJsonLdGenerator from '../../components/SEO/SEOJsonLdGenerator';

const AdminSEOPage: NextPage = () => {
    return (
        <div className="min-h-screen bg-background text-on-surface p-8">
            <h1 className="text-3xl font-bold mb-8 text-primary">SEO Management</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Global Meta Settings</h2>
                    <SEOMetaEditor />
                </div>
                <div className="bg-surface p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Site Health</h2>
                    <SEOHealth />
                </div>
                <div className="col-span-1 lg:col-span-2 bg-surface p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Organization JSON-LD</h2>
                     <SEOJsonLdGenerator />
                </div>
            </div>
        </div>
    );
};

export default AdminSEOPage;
