import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { Customer } from '../../../types';
import axios from 'axios';

const AdminCustomersPage: NextPage = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const api = axios.create({
            baseURL: '',
            headers: { Authorization: `Bearer ${token}` }
        });

        api.get('/api/customers')
            .then(res => setCustomers(res.data))
            .catch(err => console.error("Failed to fetch customers", err))
            .finally(() => setLoading(false));
    }, []);
    
    if (loading) return <div className="p-8">Loading customers...</div>;

    return (
        <div className="min-h-screen bg-background text-on-surface p-8">
            <h1 className="text-3xl font-bold mb-8 text-primary">Customers</h1>
            <div className="bg-surface rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-surface-light">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Joined On</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.id} className="border-b border-surface-light last:border-b-0 hover:bg-surface-light">
                                <td className="p-4">{customer.name || 'N/A'}</td>
                                <td className="p-4">{customer.email}</td>
                                <td className="p-4">{new Date(customer.createdAt).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <a href={`/admin/customers/${customer.id}`} className="text-blue-400 hover:text-blue-300">
                                        View
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminCustomersPage;
