import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCartIcon, MenuIcon, XIcon } from './Icons';
import CartDrawer from './CartDrawer';

const Header = () => {
  const { cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <header className="bg-surface shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <a href="/" className="text-2xl font-bold text-primary">
              GrowShop
            </a>

            <nav className="hidden md:flex items-center space-x-6">
              <a href="/" className="text-on-surface hover:text-primary transition-colors">Home</a>
              {/* Add other links here e.g., Shop, About, Contact */}
            </nav>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative text-on-surface hover:text-primary transition-colors"
                aria-label="Open cart"
              >
                <ShoppingCartIcon />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
              <div className="md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Open menu">
                  {isMenuOpen ? <XIcon /> : <MenuIcon />}
                </button>
              </div>
            </div>
          </div>
          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden pb-4">
               <nav className="flex flex-col space-y-2">
                 <a href="/" className="text-on-surface hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Home</a>
              </nav>
            </div>
          )}
        </div>
      </header>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Header;
