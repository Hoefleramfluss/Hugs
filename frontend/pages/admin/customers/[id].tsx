import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { Customer } from '../../../types';
import axios from 'axios';

const CustomerDetailPage: NextPage = () => {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = window.location.pathname.split('/').pop();
        if (id) {
            const token = localStorage.getItem('authToken');
            const api = axios.create({
                baseURL: '',
                headers: { Authorization: `Bearer ${token}` }
            });
            api.get(`/api/customers/${id}`)
                .then(res => setCustomer(res.data))
                .catch(err => console.error("Failed to fetch customer", err))
                .finally(() => setLoading(false));
        }
    }, []);

    if (loading) return <div className="p-8">Loading customer details...</div>;
    if (!customer) return <div className="p-8">Customer not found.</div>;

    return (
        <div className="min-h-screen bg-background text-on-surface p-8">
            <div className="mb-8">
                <a href="/admin/customers" className="text-primary hover:underline">
                    &larr; Back to Customers
                </a>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-primary">{customer.name || customer.email}</h1>
            <p className="text-on-surface-variant mb-8">Joined on {new Date(customer.createdAt).toLocaleDateString()}</p>

            <div className="bg-surface rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
                <div className="space-y-2">
                    <p><strong>ID:</strong> {customer.id}</p>
                    <p><strong>Email:</strong> {customer.email}</p>
                    <p><strong>Name:</strong> {customer.name || 'Not provided'}</p>
                </div>
            </div>

             <div className="mt-8 bg-surface rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Order History</h2>
                {customer.orders && customer.orders.length > 0 ? (
                    <p>Order history would be displayed here.</p>
                ) : (
                    <p>No orders found for this customer.</p>
                )}
            </div>
        </div>
    );
};

export default CustomerDetailPage;
