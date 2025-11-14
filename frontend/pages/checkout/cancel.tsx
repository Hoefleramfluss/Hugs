import { NextPage } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const CheckoutCancelPage: NextPage = () => {
    return (
        <div className="bg-background min-h-screen text-on-surface flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center text-center">
                <div className="p-8">
                    <h1 className="text-4xl font-bold text-secondary mb-4">Order Cancelled</h1>
                    <p className="text-lg mb-8">Your order was cancelled. Your cart has been saved if you'd like to try again.</p>
                    <Link href="/" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-md">
                        Return to Shop
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default CheckoutCancelPage;
