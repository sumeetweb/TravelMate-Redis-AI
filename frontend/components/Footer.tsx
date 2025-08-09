import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-[#FF2D00] border-t border-[#FF2D00] mt-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-center items-center">
      <div className="flex flex-col items-center w-full">
        <img src="/img/logo.png" alt="TravelMate AI Logo" className="h-10 w-16 object-contain mb-2" />
        <p className="text-xs text-white font-semibold">&copy; {new Date().getFullYear()} TravelMate. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
