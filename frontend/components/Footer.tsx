const Footer = () => {
  return (
    <footer className="bg-surface-light">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">GrowShop</h3>
            <p className="text-on-surface-variant">Your one-stop shop for premium head & grow supplies.</p>
          </div>
          <div>
            <h4 className="font-semibold text-on-surface mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="/" className="hover:text-primary transition-colors">Home</a></li>
              <li><a href="/admin" className="hover:text-primary transition-colors">Admin Login</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-on-surface mb-4">Legal</h4>
             <ul className="space-y-2">
              <li><a href="/impressum" className="hover:text-primary transition-colors">Impressum</a></li>
              <li><a href="/agb" className="hover:text-primary transition-colors">AGB</a></li>
              <li><a href="/dsgvo" className="hover:text-primary transition-colors">Datenschutz</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-on-surface-variant mt-8 pt-8 border-t border-surface">
          <p>&copy; {new Date().getFullYear()} GrowShop. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
