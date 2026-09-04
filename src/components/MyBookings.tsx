'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { formatThaiDate, getAutoStatus } from '@/utils/time';
import { CustomSelect } from './CustomSelect';
import { 
  Search, 
  Filter, 
  ExternalLink,
  Edit2,
  Trash2,
  Lock,
  Compass,
  FileText,
  ChevronDown,
  Plus
} from 'lucide-react';

type SortKey = 'date' | 'roomName' | 'brandName' | 'startTime';
type SortOrder = 'asc' | 'desc';

export default function MyBookings() {
  const {
    myBookings,
    rooms,
    filters,
    setFilters,
    setActiveBookingIdForEdit,
    setActiveBookingCreateData,
    currentUser
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc'); // Default to descending
    }
  };

  // Date Range and Brand & Room Filters States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDates, setAllDates] = useState(true); // Default to true (Show all)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const roomDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize date range with today
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  // Click outside listener for brand & room dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(e.target as Node)) {
        setIsRoomDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Room dropdown selection helpers
  const handleRoomCheckboxChange = (roomName: string, checked: boolean) => {
    setFilters(prev => {
      const room = checked 
        ? [...prev.room, roomName]
        : prev.room.filter(r => r !== roomName);
      return { ...prev, room };
    });
  };

  const handleSelectAllRooms = (checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      room: checked ? rooms.map(r => r.name) : []
    }));
  };

  const filteredRoomsForDropdown = useMemo(() => {
    return rooms.map(r => r.name).filter(roomName => 
      roomName.toLowerCase().includes(roomSearchQuery.toLowerCase())
    );
  }, [rooms, roomSearchQuery]);

  // Extract brand list dynamically from user's bookings
  const myBrandsList = useMemo(() => {
    return [...new Set(myBookings.map(b => b.brandName))].sort();
  }, [myBookings]);

  // Filters and searches matching local states
  const filteredBookings = useMemo(() => {
    return myBookings.filter(b => {
      // 1. Room name filter
      if (filters.room.length > 0 && !filters.room.includes(b.roomName)) return false;
      // 2. Status filter
      if (filters.status && getAutoStatus(b) !== filters.status) return false;
      // 3. Brand filter (assigned/selected brands)
      if (selectedBrands.length > 0 && !selectedBrands.includes(b.brandName)) return false;
      // 4. Dynamic date range filter
      if (!allDates) {
        if (startDate && b.date < startDate) return false;
        if (endDate && b.date > endDate) return false;
      }
      // 5. Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const campaignMatch = String(b.campaignName || '').toLowerCase().includes(query);
        const brandMatch = String(b.brandName || '').toLowerCase().includes(query);
        const remarkMatch = String(b.remark || '').toLowerCase().includes(query);
        if (!campaignMatch && !brandMatch && !remarkMatch) return false;
      }
      return true;
    });
  }, [myBookings, filters, selectedBrands, allDates, startDate, endDate, searchQuery]);

  // Sort bookings
  const sortedBookings = useMemo(() => {
    const sorted = [...filteredBookings];
    sorted.sort((a, b) => {
      if (sortKey === 'date' || sortKey === 'startTime') {
        const timeA = `${a.date || ''} ${a.startTime || '00:00'}`;
        const timeB = `${b.date || ''} ${b.startTime || '00:00'}`;
        return sortOrder === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
      }

      let valA = String(a[sortKey] || '');
      let valB = String(b[sortKey] || '');
      return sortOrder === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
    });
    return sorted;
  }, [filteredBookings, sortKey, sortOrder]);

  const hasActiveFilters = filters.room.length > 0 || filters.status !== '' || selectedBrands.length > 0 || !allDates || searchQuery !== '';

  const clearFilters = () => {
    setFilters({
      room: [],
      brand: [],
      status: '',
      action: 'mine'
    });
    setSearchQuery('');
    setSelectedBrands([]);
    setAllDates(true);
  };

  const handleBrandCheckboxChange = (bName: string, checked: boolean) => {
    setSelectedBrands(prev => {
      if (checked) return [...prev, bName];
      return prev.filter(x => x !== bName);
    });
  };

  const handleSelectAllBrands = (checked: boolean) => {
    setSelectedBrands(checked ? myBrandsList : []);
  };

  const canCreateBooking = currentUser?.permissions?.isAdmin || currentUser?.role === 'Master Admin' || !!currentUser?.permissions?.canCreateBooking;

  return (
    <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-500" />
            การจองของฉัน
          </h2>
          <p className="text-xs text-slate-400 mt-1">คัดกรองเฉพาะตารางการจองห้องที่คุณเป็นเจ้าของรายการจองเพื่อจัดการได้โดยตรง</p>
        </div>

        {canCreateBooking && (
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setActiveBookingCreateData({
                date: today,
                roomName: rooms[0]?.name || '',
                startTime: '09:00',
                endTime: '10:00'
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
          >
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>จองห้องไลฟ์</span>
          </button>
        )}
      </div>

      {/* 2. Filters bar */}
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 text-brand-500" />
              <span>ตัวกรอง:</span>
            </div>

            {/* Room Multiselect dropdown */}
            <div className="relative" ref={roomDropdownRef}>
              <button
                onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 focus:outline-none transition-all duration-150 cursor-pointer min-w-[160px] ${
                  isRoomDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="truncate max-w-[130px]">
                  {filters.room.length === 0 
                    ? 'ทุกห้องสตูดิโอ (All)' 
                    : filters.room.length === rooms.length 
                      ? `เลือกทุกห้อง (${filters.room.length})` 
                      : filters.room.join(', ')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isRoomDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isRoomDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ค้นหาห้อง..."
                        value={roomSearchQuery}
                        onChange={(e) => setRoomSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="p-1">
                    <div
                      onClick={() => handleSelectAllRooms(!(filters.room.length === rooms.length && rooms.length > 0))}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        filters.room.length === rooms.length && rooms.length > 0
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {filters.room.length === rooms.length && rooms.length > 0 && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                    {filteredRoomsForDropdown.map(roomName => {
                      const isChecked = filters.room.includes(roomName);
                      return (
                        <div
                          key={roomName}
                          onClick={() => handleRoomCheckboxChange(roomName, !isChecked)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-650'
                          }`}>
                            {isChecked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{roomName}</span>
                        </div>
                      );
                    })}
                    {filteredRoomsForDropdown.length === 0 && (
                      <div className="px-3 py-3 text-xs text-slate-400 text-center">ไม่พบห้องสตูดิโอ</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Brand Multiselect dropdown */}
            <div className="relative" ref={brandDropdownRef}>
              <button
                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 focus:outline-none transition-all duration-150 cursor-pointer min-w-[160px] ${
                  isBrandDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="truncate max-w-[120px]">
                  {selectedBrands.length === 0 
                    ? 'ทุกแบรนด์ลูกค้า (All)' 
                    : selectedBrands.length === myBrandsList.length 
                      ? `เลือกทุกแบรนด์ (${selectedBrands.length})` 
                      : selectedBrands.join(', ')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isBrandDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ค้นหาแบรนด์..."
                        value={brandSearchQuery}
                        onChange={(e) => setBrandSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="p-1">
                    <div
                      onClick={() => handleSelectAllBrands(!(selectedBrands.length === myBrandsList.length && myBrandsList.length > 0))}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedBrands.length === myBrandsList.length && myBrandsList.length > 0
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedBrands.length === myBrandsList.length && myBrandsList.length > 0 && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-350 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                    {myBrandsList
                      .filter(brand => brand.toLowerCase().includes(brandSearchQuery.toLowerCase()))
                      .map(brand => {
                        const isChecked = selectedBrands.includes(brand);
                        return (
                          <div
                            key={brand}
                            onClick={() => handleBrandCheckboxChange(brand, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-850"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300'
                            }`}>
                              {isChecked && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{brand}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <CustomSelect
              value={filters.status}
              onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
              options={[
                { value: '', label: 'ทุกสถานะ (All)' },
                { value: 'Confirmed', label: 'Confirmed' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              className="min-w-[140px]"
            />

            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg font-semibold transition-all cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="search" 
              placeholder="ค้นหาคิวจอง..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950 dark:text-white"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Dynamic Date Filter row */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              id="all-dates-mybookings-check"
              checked={allDates}
              onChange={(e) => setAllDates(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-800"
            />
            <label htmlFor="all-dates-mybookings-check" className="font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              ดึงประวัติทุกวันที่ (All Dates History)
            </label>
          </div>

          {!allDates && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-250">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">เริ่มต้น:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="py-1 px-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">สิ้นสุด:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="py-1 px-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Tables Data */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-bold select-none uppercase tracking-wider">
                <th onClick={() => handleSort('date')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span>วันที่จอง</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {sortKey === 'date' ? (sortOrder === 'asc' ? '▲ (เก่าไปใหม่)' : '▼ (ใหม่ไปเก่า)') : '⇅'}
                    </span>
                  </div>
                </th>
                <th onClick={() => handleSort('roomName')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>ห้องสตูดิโอ</span>
                    {sortKey === 'roomName' && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">เวลาไลฟ์สด</th>
                <th onClick={() => handleSort('brandName')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>แบรนด์ลูกค้า</span>
                    {sortKey === 'brandName' && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">ชื่อแคมเปญ</th>
                <th className="py-3 px-4">สถานะคิว</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
              {sortedBookings.map(b => {
                const autoStatus = getAutoStatus(b);
                let statusBadge = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                if (autoStatus === 'Confirmed') statusBadge = 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent';
                else if (autoStatus === 'Completed') statusBadge = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
                else if (autoStatus === 'Cancelled') statusBadge = 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200 line-through';

                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/20 text-slate-800 dark:text-slate-200 transition-colors">
                    <td className="py-3.5 px-4 font-normal">{formatThaiDate(b.date)}</td>
                    <td className="py-3.5 px-4 font-normal text-slate-900 dark:text-white">{b.roomName}</td>
                    <td className="py-3.5 px-4 font-normal text-slate-600 dark:text-slate-400">{b.startTime} - {b.endTime} น.</td>
                    <td className="py-3.5 px-4 font-normal text-slate-900 dark:text-white">{b.brandName}</td>
                    <td className="py-3.5 px-4 font-normal text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={b.campaignName}>
                      {b.campaignName || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap ${statusBadge}`}>
                        {autoStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setActiveBookingIdForEdit(b.id)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-normal flex items-center gap-1.5 mx-auto transition-all cursor-pointer text-[11px]"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> เปิดจัดการ
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedBookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-450 italic dark:text-slate-500">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    ไม่มีคิวงานจองห้องที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
