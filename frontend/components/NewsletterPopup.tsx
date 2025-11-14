import React, { useState } from 'react';
import axios from 'axios';
import { XIcon } from './Icons';

interface NewsletterPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewsletterPopup: React.FC<NewsletterPopupProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const api = axios.create({
    baseURL: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/newsletter/subscribe', { email });
      setMessage(response.data.message || 'Thank you for subscribing!');
      setEmail('');
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 3000); // Close popup after 3 seconds on success
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface shadow-lg rounded-lg p-8 z-50">
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-primary">
            <XIcon />
        </button>
        <h2 className="text-2xl font-bold text-center mb-4">Join Our Newsletter</h2>
        <p className="text-center text-on-surface-variant mb-6">Get the latest updates, deals, and growing tips straight to your inbox.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-2 border rounded-md"
            />
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50"
            >
                {loading ? 'Subscribing...' : 'Subscribe'}
            </button>
        </form>
        {message && <p className="text-green-500 text-center mt-4">{message}</p>}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </>
  );
};

export default NewsletterPopup;