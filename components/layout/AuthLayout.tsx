import React from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden md:flex flex-col w-[28%] bg-[#1E2A2F] px-8 py-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
            <Image
              src="/hbatube_logo.png.png"
              alt="HBA Logo"
              width={40}
              height={40}
              className="object-contain w-full h-full"
            />
          </div>
          <div>
            <p className="text-white font-bold text-sm">HBA RMS</p>
            <p className="text-white/50 text-[10px]">V2.4 Branch Admin</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="mb-auto">
          <h1 className="text-white text-3xl font-bold leading-tight mb-4">
            HBA Filipino<br />Restaurant
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Authentic Pinoy flavors managed with institutional precision. Welcome to our unified RMS ecosystem.
          </p>
        </div>

        {/* Copyright */}
        <p className="text-white/30 text-xs">
          © 2026 HBA Restaurant Group. All Rights Reserved.
        </p>
      </div>

      {/* Right content */}
      <div className="flex-1 bg-[#F4F6F8] flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
