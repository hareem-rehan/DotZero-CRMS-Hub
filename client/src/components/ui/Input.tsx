import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#2D2D2D]">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`rounded-md border px-3 py-2.5 text-sm text-[#2D2D2D] placeholder-[#5D5B5B] outline-none transition-colors
            ${error ? 'border-[#EF323F] focus:ring-1 focus:ring-[#EF323F]' : 'border-[#D3D3D3] focus:border-[#2D2D2D] focus:ring-1 focus:ring-[#2D2D2D]'}
            disabled:bg-[#F7F7F7] disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[#EF323F]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
