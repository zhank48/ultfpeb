import React from 'react';

const BrandLogo = () => {
  return (
    <div className="flex items-center space-x-2">
      <img 
        src="/logoultfpeb.png" 
        alt="ULT FPEB Logo" 
        className="w-8 h-8 object-contain"
      />
      <span className="font-semibold text-gray-800">ULT FPEB</span>
    </div>
  );
};

// Logo untuk sidebar
export const SidebarLogo = ({ onClick }) => {
  return (
    <div 
      className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <img 
        src="/logoultfpeb.png" 
        alt="ULT FPEB Logo" 
        className="w-8 h-8 object-contain"
      />
      <span className="font-semibold text-gray-800">ULT FPEB</span>
    </div>
  );
};

// Logo untuk halaman login (lebih besar dan centered)
export const LoginLogo = () => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-20 h-20 flex items-center justify-center">
        <img 
          src="/logoultfpeb.png" 
          alt="ULT FPEB Logo" 
          className="w-16 h-16 object-contain max-w-none"
          style={{ maxWidth: '64px', maxHeight: '64px' }}
        />
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img 
            src="/logoultfpeb.png" 
            alt="ULT FPEB Logo" 
            className="w-8 h-8 object-contain"
            style={{ maxWidth: '32px', maxHeight: '32px' }}
          />
          <h1 className="text-2xl font-bold text-gray-800">ULT FPEB</h1>
        </div>
        <p className="text-sm text-gray-600">Unit Layanan Terpadu FPEB</p>
      </div>
    </div>
  );
};

export default BrandLogo;