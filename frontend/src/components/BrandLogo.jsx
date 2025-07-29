import React from 'react';

const BrandLogo = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">ULT</span>
      </div>
      <span className="font-semibold text-gray-800">ULT Deploy</span>
    </div>
  );
};

// Logo untuk sidebar
export const SidebarLogo = BrandLogo;

// Logo untuk halaman login (lebih besar dan centered)
export const LoginLogo = () => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-2xl">ULT</span>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">ULT FPEB</h1>
        <p className="text-sm text-gray-600">Unit Layanan Terpadu FPEB</p>
      </div>
    </div>
  );
};

export default BrandLogo;