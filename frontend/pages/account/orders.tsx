import { NextPage } from 'next';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';

const mockOrders = [
    { id: 'ORD-123', date: '2023-10-26', total: 45.99, status: 'Shipped' },
    { id: 'ORD-124', date: '2023-10-28', total: 129.50, status: 'Processing' },
];

const OrdersPage: NextPage = () => {
    return (
        <PageLayout>
            <div className="container mx-auto px-4 py-16">
                <h1 className="text-3xl font-bold mb-8">My Orders</h1>
                <div className="bg-surface rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="p-4">Order ID</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockOrders.map(order => (
                                <tr key={order.id} className="border-b last:border-0">
                                    <td className="p-4 font-mono text-primary">
                                        <Link href={`/account/orders/${order.id}`}>{order.id}</Link>
                                    </td>
                                    <td className="p-4">{order.date}</td>
                                    <td className="p-4">€{order.total.toFixed(2)}</td>
                                    <td className="p-4">{order.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageLayout>
    );
};

export default OrdersPage;
