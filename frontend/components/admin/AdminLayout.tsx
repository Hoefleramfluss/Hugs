import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  title?: string;
  children: ReactNode;
}

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/page-builder', label: 'Website Builder' },
];

const AdminLayout = ({ title, children }: AdminLayoutProps) => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="bg-surface shadow-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-2xl font-bold text-primary">
            HUGS Admin
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-on-surface-light hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        {title && <h1 className="text-3xl font-bold mb-8 text-primary">{title}</h1>}
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
