'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { resolveMenuImage } from '@/lib/menu-image';

interface MenuPhotoProps {
  source: string | null | undefined;
  alt: string;
  className: string;
  sizes?: string;
  fallback: ReactNode;
  fallbackClassName: string;
}

export function MenuPhoto({ source, alt, className, sizes = '100vw', fallback, fallbackClassName }: MenuPhotoProps) {
  const [failedImage, setFailedImage] = useState('');
  const image = resolveMenuImage(source);
  if (!image || failedImage === image) return <div className={fallbackClassName}>{fallback}</div>;
  return <Image src={image} alt={alt} fill unoptimized sizes={sizes} className={className} onError={() => setFailedImage(image)} />;
}
