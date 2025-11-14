import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import StatCard from '../../components/admin/Dashboard/StatCard';
import SalesChart from '../../components/admin/Dashboard/SalesChart';
import AdminLayout from '../../components/admin/AdminLayout';

interface DashboardStats {
    totalRevenue: number;
    newOrders: number;
    newCustomers: number;
    salesData: { name: string; sales: number }[];
}

const AdminDashboardPage: NextPage = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch stats from API
        // This is a placeholder for an API call
        const fetchStats = async () => {
            setLoading(true);
            // const apiStats = await api.getDashboardStats();
            const mockStats: DashboardStats = {
                totalRevenue: 54230.50,
                newOrders: 120,
                newCustomers: 45,
                salesData: [
                    { name: 'Jan', sales: 4000 },
                    { name: 'Feb', sales: 3000 },
                    { name: 'Mar', sales: 5000 },
                    { name: 'Apr', sales: 4500 },
                    { name: 'May', sales: 6000 },
                    { name: 'Jun', sales: 5800 },
                ],
            };
            setStats(mockStats);
            setLoading(false);
        };
        fetchStats();
    }, []);


    if (loading) return <div className="p-8">Loading Dashboard...</div>;
    if (!stats) return <div className="p-8">Could not load dashboard data.</div>;

    return (
        <AdminLayout title="Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Revenue" value={`€${stats.totalRevenue.toFixed(2)}`} />
                <StatCard title="New Orders" value={stats.newOrders.toString()} />
                <StatCard title="New Customers" value={stats.newCustomers.toString()} />
            </div>
            <div className="bg-surface p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Sales Overview</h2>
                <SalesChart data={stats.salesData} />
            </div>
        </AdminLayout>
    );
};

export default AdminDashboardPage;
