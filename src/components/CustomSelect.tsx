'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  label?: string;
  id?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'เลือก...',
  searchable = false,
  searchPlaceholder = 'ค้นหา...',
  className = '',
  label,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const selectId = id ?? uid;

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  const selectedLabel = options.find(o => o.value === value)?.label ?? placeholder;

  const filteredOptions = searchable
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px] mb-1"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`
          w-full flex items-center justify-between gap-2
          border border-slate-200 dark:border-slate-700
          rounded-xl px-3 py-2
          bg-white dark:bg-slate-950
          text-slate-800 dark:text-slate-200
          text-xs font-semibold
          shadow-sm
          hover:border-brand-400 dark:hover:border-brand-500
          focus:outline-none focus:ring-2 focus:ring-brand-400/40
          transition-all duration-150 cursor-pointer
          ${isOpen ? 'border-brand-500 ring-2 ring-brand-400/30 dark:border-brand-500' : ''}
        `}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="
            absolute left-0 top-full mt-1.5 z-50
            min-w-full w-max max-w-xs
            bg-white dark:bg-slate-950
            border border-slate-200 dark:border-slate-700
            rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          "
          style={{ maxHeight: '280px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search bar */}
          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="
                    w-full pl-7 pr-3 py-1.5
                    text-xs rounded-lg
                    border border-slate-200 dark:border-slate-700
                    bg-slate-50 dark:bg-slate-900
                    text-slate-800 dark:text-slate-200
                    placeholder-slate-400
                    focus:outline-none focus:ring-1 focus:ring-brand-400
                  "
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400 text-center">ไม่พบรายการ</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center justify-between gap-2
                      px-3 py-2 rounded-lg
                      text-xs font-medium text-left
                      transition-colors duration-100 cursor-pointer
                      ${isSelected
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3 h-3 shrink-0 text-brand-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
