import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const CheckoutSuccessPage: NextPage = () => {
    const router = useRouter();
    const { session_id } = router.query;
    const { clearCart } = useCart();

    useEffect(() => {
        // Clear the cart once the user lands on the success page.
        // This is a simple approach. A more robust solution might wait for a webhook
        // to confirm payment before clearing, or clear it based on the session_id.
        if (session_id) {
            clearCart();
        }
    }, [session_id, clearCart]);

    return (
        <div className="bg-background min-h-screen text-on-surface flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center text-center">
                <div className="p-8">
                    <h1 className="text-4xl font-bold text-primary mb-4">Thank You!</h1>
                    <p className="text-lg mb-8">Your order has been placed successfully.</p>
                    {session_id && <p className="text-sm text-on-surface-variant mb-8">Order ID: {session_id}</p>}
                    <Link href="/" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-md">
                        Continue Shopping
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default CheckoutSuccessPage;
