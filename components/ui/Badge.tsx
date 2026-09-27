'use client';

import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'red' | 'admin' | 'staff' | 'customer';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  danger:  'bg-red-100 text-red-700 border border-red-200',
  info:    'bg-blue-100 text-blue-700 border border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  red:     'bg-red-100 text-red-700 border border-red-200',
  admin:   'bg-red-50 text-red-800 border border-red-200',
  staff:   'bg-gray-100 text-gray-700 border border-gray-200',
  customer:'bg-blue-50 text-blue-700 border border-blue-200',
};

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    PENDING:   'warning',
    PREPARING: 'info',
    READY:      'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };
  return <Badge variant={map[status] ?? 'neutral'}>{status}</Badge>;
}

export function UserStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'neutral'}>
      {status}
    </Badge>
  );
}

export function UserRoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === 'ADMIN' ? 'admin' : role === 'CUSTOMER' ? 'customer' : 'staff'}>
      {role}
    </Badge>
  );
}
