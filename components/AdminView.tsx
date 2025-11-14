import React, { useEffect, useState } from 'react';
import AdminDashboardPage from '../frontend/pages/admin/dashboard';
import AdminProductsPage from '../frontend/pages/admin/products';
import AdminCustomersPage from '../frontend/pages/admin/customers/index';
import AdminSettingsPage from '../frontend/pages/admin/settings';
import AdminSEOPage from '../frontend/pages/admin/seo';
import PageBuilderAdminPage from '../frontend/pages/admin/page-builder/[slug]';
import AdminLoginPage from '../frontend/pages/admin/index';

const AdminSidebar: React.FC = () => {
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        window.location.href = '/admin';
    };

    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col">
            <div className="p-4 text-2xl font-bold border-b border-gray-700">Admin Panel</div>
            <nav className="flex-grow p-4 space-y-2">
                <a href="/admin/dashboard" className="block p-2 rounded hover:bg-gray-700">Dashboard</a>
                <a href="/admin/products" className="block p-2 rounded hover:bg-gray-700">Products</a>
                <a href="/admin/customers" className="block p-2 rounded hover:bg-gray-700">Customers</a>
                <a href="/admin/page-builder/home" className="block p-2 rounded hover:bg-gray-700">Page Builder</a>
                <a href="/admin/seo" className="block p-2 rounded hover:bg-gray-700">SEO</a>
                <a href="/admin/settings" className="block p-2 rounded hover:bg-gray-700">Settings</a>
            </nav>
            <div className="p-4 border-t border-gray-700">
                <button onClick={handleLogout} className="w-full text-left p-2 rounded hover:bg-red-500">Logout</button>
            </div>
        </div>
    );
};


const AdminView: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [path, setPath] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        setIsAuthenticated(!!token);
        setPath(window.location.pathname);
    }, []);

    if (!isAuthenticated) {
        return <AdminLoginPage />;
    }

    const renderPage = () => {
        if (path.startsWith('/admin/products')) return <AdminProductsPage initialProducts={[]} />;
        if (path.startsWith('/admin/customers')) return <AdminCustomersPage />;
        if (path.startsWith('/admin/settings')) return <AdminSettingsPage />;
        if (path.startsWith('/admin/seo')) return <AdminSEOPage />;
        if (path.startsWith('/admin/page-builder')) return <PageBuilderAdminPage />;
        // Default to dashboard
        return <AdminDashboardPage />;
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

export default AdminView;
