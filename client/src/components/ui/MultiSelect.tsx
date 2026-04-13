'use client';

import { useState, useRef, useEffect } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  error?: string;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  error,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  };

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);

  return (
    <div ref={ref} className="flex flex-col gap-1 relative">
      {label && <label className="text-sm font-medium text-[#2D2D2D]">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-[42px] w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#EF323F] ${error ? 'border-red-500' : 'border-[#D3D3D3]'}`}
      >
        <span className="flex flex-wrap gap-1">
          {selectedLabels.length === 0 ? (
            <span className="text-[#9E9E9E]">{placeholder}</span>
          ) : (
            selectedLabels.map((l) => (
              <span
                key={l}
                className="inline-flex items-center rounded bg-[#EF323F]/10 px-1.5 py-0.5 text-xs text-[#EF323F]"
              >
                {l}
              </span>
            ))
          )}
        </span>
        <svg
          className={`ml-2 h-4 w-4 flex-shrink-0 text-[#5D5B5B] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg border border-[#D3D3D3] bg-white shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[#5D5B5B]">No options</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {options.map((opt) => {
                const selected = value.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#F7F7F7] ${selected ? 'font-medium text-[#EF323F]' : 'text-[#2D2D2D]'}`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${selected ? 'border-[#EF323F] bg-[#EF323F]' : 'border-[#D3D3D3]'}`}
                      >
                        {selected && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 12 12"
                          >
                            <path
                              d="M10 3L5 8.5 2 5.5"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </svg>
                        )}
                      </span>
                      {opt.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
