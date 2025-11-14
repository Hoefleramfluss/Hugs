import React, { useState, useEffect } from 'react';
import StorefrontView from './components/StorefrontView';
import AdminView from './components/AdminView';
import AgeVerification from './components/AgeVerification';
import { CartProvider } from './frontend/context/CartContext';
import ProductPage from './components/ProductPage';
import ImpressumPage from './frontend/pages/impressum';
import AgbPage from './frontend/pages/agb';
import DsgvoPage from './frontend/pages/dsgvo';
import RegisterPage from './frontend/pages/register';

const App: React.FC = () => {
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const ageVerified = localStorage.getItem('ageVerified') === 'true';
        setIsVerified(ageVerified);
    }, []);

    const handleVerification = () => {
        localStorage.setItem('ageVerified', 'true');
        setIsVerified(true);
    };

    if (!isVerified) {
        return <AgeVerification onVerify={handleVerification} />;
    }

    const path = window.location.pathname;
    
    const renderContent = () => {
        if (path.startsWith('/admin')) {
            return <AdminView />;
        }
        if (path.startsWith('/product/')) {
            const slug = path.split('/').pop() || '';
            return <ProductPage slug={slug} />;
        }
        if (path === '/impressum') return <ImpressumPage />;
        if (path === '/agb') return <AgbPage />;
        if (path === '/dsgvo') return <DsgvoPage />;
        if (path === '/register') return <RegisterPage />;
        
        // Default to storefront home
        return <StorefrontView />;
    }

    return (
        <CartProvider>
            {renderContent()}
        </CartProvider>
    );
};

export default App;
