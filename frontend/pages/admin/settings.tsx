import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import axios from 'axios'; // Use a dedicated instance or the global one
// FIX: Added import for React to resolve namespace error.
import React from 'react';

const AdminSettingsPage: NextPage = () => {
    const [settings, setSettings] = useState({
        siteName: '',
        contactEmail: '',
        maintenanceMode: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const api = axios.create({
        baseURL: '',
    });
    
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        api.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setSettings(res.data))
            .catch(err => setError('Failed to load settings.'))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess('');
        setError('');
        try {
            const token = localStorage.getItem('authToken');
            await api.put('/api/settings', settings, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess('Settings saved successfully!');
        } catch (err) {
            setError('Failed to save settings.');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-background text-on-surface p-8">
            <h1 className="text-3xl font-bold mb-8 text-primary">Site Settings</h1>
            <div className="max-w-2xl mx-auto bg-surface p-6 rounded-lg shadow-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="siteName" className="block text-sm font-medium">Site Name</label>
                        <input type="text" name="siteName" id="siteName" value={settings.siteName} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                    </div>
                    <div>
                        <label htmlFor="contactEmail" className="block text-sm font-medium">Contact Email</label>
                        <input type="email" name="contactEmail" id="contactEmail" value={settings.contactEmail} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="maintenanceMode" id="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <label htmlFor="maintenanceMode" className="ml-2 block text-sm">Enable Maintenance Mode</label>
                    </div>
                    
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-500">{success}</p>}

                    <div>
                        <button type="submit" className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminSettingsPage;