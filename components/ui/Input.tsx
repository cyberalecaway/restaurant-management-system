'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#1A2332]">
          {label}
          {props.required && <span className="ml-1 text-[#D92F2F]" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAAB8]">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-required={Boolean(props.required)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`
            w-full px-3 py-2 text-sm text-[#1A2332] bg-white
            border rounded-md outline-none transition-colors
            placeholder:text-[#9BAAB8]
            ${error ? 'border-red-400 focus:border-red-500' : 'border-[#DDE3E8] focus:border-[#D92F2F]'}
            ${leftIcon ? 'pl-9' : ''}
            ${rightIcon ? 'pr-9' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAAB8]">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}

type PasswordInputProps = Omit<InputProps, 'type'>;

export function PasswordInput({ label, error, className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <Input
      label={label}
      error={error}
      type={show ? 'text' : 'password'}
      className={className}
      rightIcon={
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="text-[#9BAAB8] hover:text-[#6B7A8D] transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = '', id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[#1A2332]">
          {label}
          {props.required && <span className="ml-1 text-[#D92F2F]" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        aria-required={Boolean(props.required)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={`
          w-full px-3 py-2 text-sm text-[#1A2332] bg-white
          border rounded-md outline-none transition-colors cursor-pointer
          ${error ? 'border-red-400 focus:border-red-500' : 'border-[#DDE3E8] focus:border-[#D92F2F]'}
          ${className}
        `}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p id={`${selectId}-error`} className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
