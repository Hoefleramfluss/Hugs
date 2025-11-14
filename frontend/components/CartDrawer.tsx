import React from 'react';
import { useCart } from '../context/CartContext';
import { XIcon, PlusIcon, MinusIcon, TrashIcon } from './Icons';
import checkoutApi from '../services/checkout';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    try {
      const line_items = cart.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            images: item.imageUrl ? [item.imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

      const session = await checkoutApi.createCheckoutSession(line_items);
      window.location.href = session.url;
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Could not initiate checkout. Please try again.');
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface shadow-lg transform transition-transform z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-surface-light">
            <h2 className="text-xl font-bold">Your Cart</h2>
            <button onClick={onClose} className="hover:text-primary">
              <XIcon />
            </button>
          </header>
          
          {cart.length === 0 ? (
            <div className="flex-grow flex items-center justify-center">
              <p>Your cart is empty.</p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-start gap-4">
                  <img
                    src={item.imageUrl || 'https://placehold.co/100x100?text=Item'}
                    alt={item.title}
                    width="80"
                    height="80"
                    className="rounded-md object-cover"
                  />
                  <div className="flex-grow">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-on-surface-variant">{item.sku}</p>
                    <p className="font-bold text-primary">€{item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-surface-light hover:bg-primary/20"><MinusIcon /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-surface-light hover:bg-primary/20"><PlusIcon /></button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-on-surface-variant hover:text-red-500">
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {cart.length > 0 && (
            <footer className="p-4 border-t border-surface-light space-y-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Subtotal</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <button onClick={handleCheckout} className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-md">
                Proceed to Checkout
              </button>
               <button onClick={clearCart} className="w-full text-center text-sm text-on-surface-variant hover:text-red-500">
                Clear Cart
              </button>
            </footer>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
