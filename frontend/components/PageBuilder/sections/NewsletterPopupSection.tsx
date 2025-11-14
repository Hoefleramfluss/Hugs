import React from 'react';

// This component might not render anything visually in the page builder itself.
// Its presence in the page's section list could be used as a trigger
// to display the actual NewsletterPopup component on the live/preview page.

const NewsletterPopupSection: React.FC = () => {
  return (
    <div className="p-4 my-2 bg-blue-100 border border-blue-400 text-center">
      <p className="font-semibold">Newsletter Popup</p>
      <p className="text-sm">This section enables the newsletter popup on the page. Configure it in the site-wide settings.</p>
    </div>
  );
};

export default NewsletterPopupSection;
