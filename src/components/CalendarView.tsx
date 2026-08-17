'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { CustomSelect } from './CustomSelect';
import { formatThaiDate, parseTimeToMinutes, getAutoStatus } from '@/utils/time';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  CalendarDays,
  ListFilter,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Plus,
  Search,
  ChevronDown
} from 'lucide-react';

const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export default function CalendarView() {
  const {
    calendarBookings,
    rooms,
    brands,
    filters,
    setFilters,
    calendarSelectedDate,
    setCalendarSelectedDate,
    setActiveBookingIdForEdit,
    setActiveBookingCreateData,
    setIsImportModalOpen,
    currentUser
  } = useApp();

  // Calendar View mode states
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Month navigation states
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  // Brand dropdown filter states
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  const THAI_MONTH_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Click outside brand dropdown listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync calendarSelectedDate with monthly view when selected date changes
  useEffect(() => {
    if (calendarSelectedDate) {
      const selected = new Date(calendarSelectedDate);
      setCurrentMonth(selected.getMonth());
      setCurrentYear(selected.getFullYear());
    }
  }, [calendarSelectedDate]);

  // Navigate back/forth dynamically by mode
  const handlePrev = () => {
    if (viewMode === 'month') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    } else if (viewMode === 'week') {
      const date = new Date(calendarSelectedDate);
      date.setDate(date.getDate() - 7);
      setCalendarSelectedDate(date.toISOString().split('T')[0]);
    } else {
      const date = new Date(calendarSelectedDate);
      date.setDate(date.getDate() - 1);
      setCalendarSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    } else if (viewMode === 'week') {
      const date = new Date(calendarSelectedDate);
      date.setDate(date.getDate() + 7);
      setCalendarSelectedDate(date.toISOString().split('T')[0]);
    } else {
      const date = new Date(calendarSelectedDate);
      date.setDate(date.getDate() + 1);
      setCalendarSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setCalendarSelectedDate(todayStr);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Generate monthly grid date objects
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];
    
    // Add empty padding for previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ isPadding: true, dayNum: 0, dateStr: '' });
    }
    
    // Add active month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ isPadding: false, dayNum: i, dateStr });
    }
    
    return days;
  }, [currentYear, currentMonth]);

  // Generate 7 days of currently selected week
  const weekDays = useMemo(() => {
    const selected = new Date(calendarSelectedDate);
    const dayOfWeek = selected.getDay(); // 0 is Sunday
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - dayOfWeek); // Go back to Sunday

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        dayNum: date.getDate(),
        dateStr,
        dayName: THAI_DAY_NAMES[i]
      });
    }
    return days;
  }, [calendarSelectedDate]);

  // Filter bookings list
  const filteredBookings = useMemo(() => {
    return calendarBookings.filter(b => {
      if (b.status === 'Cancelled') return false;
      if (filters.room.length > 0 && !filters.room.includes(b.roomName)) return false;
      if (filters.brand.length > 0 && !filters.brand.includes(b.brandName)) return false;
      return true;
    });
  }, [calendarBookings, filters]);

  // List of bookings on the currently clicked calendar date (Strictly sorted 00:00 to 23:59)
  const selectedDateBookings = useMemo(() => {
    const list = filteredBookings.filter(b => b.date === calendarSelectedDate);
    return list.sort((a, b) => {
      const aMins = parseTimeToMinutes(a.startTime);
      const bMins = parseTimeToMinutes(b.startTime);
      return aMins - bMins;
    });
  }, [filteredBookings, calendarSelectedDate]);

  // Brand dropdown selection helpers
  const handleBrandCheckboxChange = (brandName: string, checked: boolean) => {
    setFilters(prev => {
      const brand = checked 
        ? [...prev.brand, brandName]
        : prev.brand.filter(b => b !== brandName);
      return { ...prev, brand };
    });
  };

  const handleSelectAllBrands = (checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      brand: checked ? brands.map(b => b.name) : []
    }));
  };

  const filteredBrandsForDropdown = useMemo(() => {
    return brands.map(b => b.name).filter(brand => 
      brand.toLowerCase().includes(brandSearchQuery.toLowerCase())
    );
  }, [brands, brandSearchQuery]);

  const canWrite = currentUser?.permissions?.canCreateBooking;

  // Dynamic header navigation label
  const headerDateLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${THAI_MONTH_NAMES[currentMonth]} ${currentYear + 543}`;
    } else if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `สัปดาห์: ${start.dayNum} - ${end.dayNum} ${THAI_MONTH_NAMES[new Date(end.dateStr).getMonth()]} ${new Date(end.dateStr).getFullYear() + 543}`;
    } else {
      return formatThaiDate(calendarSelectedDate);
    }
  }, [viewMode, currentMonth, currentYear, weekDays, calendarSelectedDate]);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-200 text-slate-800 dark:text-slate-200">
      
      {/* 1. Header Navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            ปฏิทินห้องไลฟ์สด ({viewMode === 'month' ? 'รายเดือน' : viewMode === 'week' ? 'รายสัปดาห์' : 'รายวัน'})
          </h2>
          <p className="text-xs text-slate-400 mt-1">ตรวจสอบตารางแคมเปญ คิวงานว่าง และดูการสรุปงานตามมุมมองที่สะดวก</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 select-none">
          {/* Month / Week / Day toggler */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('month')} 
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-350'
              }`}
            >
              รายเดือน
            </button>
            <button 
              onClick={() => setViewMode('week')} 
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-350'
              }`}
            >
              รายสัปดาห์
            </button>
            <button 
              onClick={() => setViewMode('day')} 
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-350'
              }`}
            >
              รายวัน
            </button>
          </div>

          {/* Left/Right step navigation */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
            <button onClick={handlePrev} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              วันนี้
            </button>
            <button onClick={handleNext} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <strong className="text-sm font-extrabold text-slate-800 dark:text-slate-200 ml-2 min-w-[150px] text-center">
            {headerDateLabel}
          </strong>

          {canWrite && (
            <div className="flex items-center gap-1.5 ml-2">
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> นำเข้าคิวจอง Excel
              </button>
              <button 
                onClick={() => setActiveBookingCreateData({ date: calendarSelectedDate, roomName: '', startTime: '13:00', endTime: '14:00' })}
                className="px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> จองห้องไลฟ์
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs select-none">
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold mr-1">
          <ListFilter className="w-3.5 h-3.5 text-brand-500" />
          <span>ตัวกรองปฏิทิน:</span>
        </div>

        {/* Room Filter */}
        <CustomSelect
          value={filters.room}
          onChange={(v) => setFilters(prev => ({ ...prev, room: v }))}
          options={[
            { value: '', label: 'ทุกห้องสตูดิโอ (All)' },
            ...rooms.map(r => ({ value: r.name, label: r.name }))
          ]}
          searchable={rooms.length > 5}
          searchPlaceholder="ค้นหาห้อง..."
          className="min-w-[160px]"
        />

        {/* Multi-Select Brand Filter */}
        <div className="relative" ref={brandDropdownRef}>
          <button
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className={`w-48 flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
              isBrandDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="truncate">
              {filters.brand.length === 0 
                ? 'ทุกแบรนด์สินค้า (All)' 
                : filters.brand.length === brands.length 
                  ? `เลือกทุกแบรนด์ (${filters.brand.length})` 
                  : filters.brand.join(', ')}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isBrandDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
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
                  onClick={() => handleSelectAllBrands(!(filters.brand.length === brands.length && brands.length > 0))}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    filters.brand.length === brands.length && brands.length > 0
                      ? 'bg-brand-500 border-brand-500'
                      : 'border-slate-300 dark:border-slate-650'
                  }`}>
                    {filters.brand.length === brands.length && brands.length > 0 && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                </div>
              </div>
              
              <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                {filteredBrandsForDropdown.map(brand => {
                  const isChecked = filters.brand.includes(brand);
                  return (
                    <div
                      key={brand}
                      onClick={() => handleBrandCheckboxChange(brand, !isChecked)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-brand-550/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-355'
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
      </div>

      {/* 3. Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Grid View (Left, cols-2 span) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden min-h-[450px]">
          
          {/* Monthly Layout */}
          {viewMode === 'month' && (
            <div className="animate-in fade-in duration-200">
              {/* Calendar Days headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 select-none">
                {THAI_DAY_NAMES.map((name, i) => (
                  <div key={i} className="py-2">{name}</div>
                ))}
              </div>

              {/* Calendar cells mapping */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  if (day.isPadding) {
                    return <div key={`pad-${index}`} className="calendar-day-box other-month bg-slate-50/40 dark:bg-slate-850/5 pointer-events-none opacity-40 min-h-[90px]" />;
                  }

                  const isSelected = day.dateStr === calendarSelectedDate;
                  const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                  
                  const dayBookings = filteredBookings.filter(b => b.date === day.dateStr);
                  dayBookings.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => {
                        setCalendarSelectedDate(day.dateStr);
                        if (canWrite) {
                          // Allow double click or single click to trigger creating booking prefilled with date
                          setActiveBookingCreateData({
                            date: day.dateStr,
                            roomName: rooms[0]?.name || 'Room 01',
                            startTime: '09:00',
                            endTime: '10:00'
                          });
                        }
                      }}
                      className={`calendar-day-box min-h-[100px] flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                        isSelected ? 'ring-2 ring-brand-500 dark:ring-brand-500 bg-brand-50/5 dark:bg-slate-800/10' : ''
                      }`}
                    >
                      <span className={`text-[10px] font-extrabold self-end w-5 h-5 flex items-center justify-center rounded-full select-none ${
                        isToday 
                          ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {day.dayNum}
                      </span>

                      <div className="flex flex-col gap-0.5 overflow-hidden w-full mt-1">
                        {dayBookings.slice(0, 3).map(b => {
                          const autoStatus = getAutoStatus(b);
                          
                          const now = new Date();
                          const localYear = now.getFullYear();
                          const localMonth = String(now.getMonth() + 1).padStart(2, '0');
                          const localDay = String(now.getDate()).padStart(2, '0');
                          const todayStr = `${localYear}-${localMonth}-${localDay}`;
                          const currentTotalMins = now.getHours() * 60 + now.getMinutes();
                          const startMins = parseTimeToMinutes(b.startTime);
                          const endMins = parseTimeToMinutes(b.endTime);
                          const isLiveNow = b.status !== 'Cancelled' && b.date === todayStr && currentTotalMins >= startMins && currentTotalMins < endMins;

                          let badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 border-blue-200 dark:border-blue-900/40';
                          if (isLiveNow) badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 border-rose-200 dark:border-rose-900/40';
                          else if (autoStatus === 'Completed') badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40';
                          else if (autoStatus === 'Cancelled') badgeColor = 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-500 border-slate-200';

                          return (
                            <div
                              key={b.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBookingIdForEdit(b.id);
                              }}
                              className={`calendar-badge border select-none truncate text-[8px] leading-tight px-1.5 py-0.5 rounded ${badgeColor}`}
                              title={`${b.brandName} (${b.startTime}-${b.endTime})`}
                            >
                              {b.startTime} {b.brandName}
                            </div>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 mt-0.5 text-right px-1 select-none">
                            +{dayBookings.length - 3} คิวเพิ่มเติม
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly Layout */}
          {viewMode === 'week' && (
            <div className="animate-in fade-in duration-200 space-y-4">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 select-none">
                {THAI_DAY_NAMES.map((name, i) => (
                  <div key={i} className="py-2 border-b border-slate-100 dark:border-slate-800">{name}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const isSelected = day.dateStr === calendarSelectedDate;
                  const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                  const dayBookings = filteredBookings.filter(b => b.date === day.dateStr);
                  dayBookings.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => {
                        setCalendarSelectedDate(day.dateStr);
                        if (canWrite) {
                          setActiveBookingCreateData({
                            date: day.dateStr,
                            roomName: rooms[0]?.name || 'Room 01',
                            startTime: '09:00',
                            endTime: '10:00'
                          });
                        }
                      }}
                      className={`calendar-day-box min-h-[300px] flex flex-col justify-between cursor-pointer p-2 rounded-xl transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                        isSelected ? 'ring-2 ring-brand-500 bg-brand-50/5 dark:bg-slate-800/10' : 'bg-slate-50/10 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-850'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-between gap-1 w-full border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className={`text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full select-none ${
                          isToday 
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {day.dayNum}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto w-full mt-2 scrollbar-none">
                        {dayBookings.map(b => {
                          const autoStatus = getAutoStatus(b);
                          
                          const now = new Date();
                          const localYear = now.getFullYear();
                          const localMonth = String(now.getMonth() + 1).padStart(2, '0');
                          const localDay = String(now.getDate()).padStart(2, '0');
                          const todayStr = `${localYear}-${localMonth}-${localDay}`;
                          const currentTotalMins = now.getHours() * 60 + now.getMinutes();
                          const startMins = parseTimeToMinutes(b.startTime);
                          const endMins = parseTimeToMinutes(b.endTime);
                          const isLiveNow = b.status !== 'Cancelled' && b.date === todayStr && currentTotalMins >= startMins && currentTotalMins < endMins;

                          let badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 border-blue-200';
                          if (isLiveNow) badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-350 border-rose-200';
                          else if (autoStatus === 'Completed') badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-350 border-emerald-200';
                          else if (autoStatus === 'Cancelled') badgeColor = 'bg-slate-50 text-slate-500 dark:bg-slate-900 border-slate-200';

                          return (
                            <div
                              key={b.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBookingIdForEdit(b.id);
                              }}
                              className={`p-1.5 border select-none text-[8px] leading-tight rounded-lg flex flex-col gap-0.5 hover:shadow-sm transition-all ${badgeColor}`}
                              title={`${b.brandName} (${b.startTime}-${b.endTime})`}
                            >
                              <span className="font-extrabold truncate">{b.startTime} - {b.endTime}</span>
                              <span className="font-black truncate">{b.brandName}</span>
                              <span className="opacity-80 truncate text-[7px]">{b.roomName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Layout */}
          {viewMode === 'day' && (
            <div className="animate-in fade-in duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">รายละเอียดคิวรายห้อง วันที่ {formatThaiDate(calendarSelectedDate)}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map(room => {
                  const roomBookings = filteredBookings.filter(b => b.date === calendarSelectedDate && b.roomName === room.name);
                  roomBookings.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

                  return (
                    <div 
                      key={room.id}
                      onClick={() => {
                        if (canWrite) {
                          setActiveBookingCreateData({
                            date: calendarSelectedDate,
                            roomName: room.name,
                            startTime: '09:00',
                            endTime: '10:00'
                          });
                        }
                      }}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-900/40 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/10 transition-colors"
                    >
                      <h4 className="font-black text-xs text-brand-600 dark:text-brand-400 mb-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                        {room.name}
                      </h4>
                      
                      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        {roomBookings.length === 0 ? (
                          <div className="py-6 text-center text-[10px] text-slate-400 italic hover:text-brand-500 font-medium">
                            ไม่มีคิวจองในห้องนี้ (คลิกการ์ดเพื่อจองคิวใหม่)
                          </div>
                        ) : (
                          roomBookings.map(b => (
                            <div 
                              key={b.id} 
                              onClick={() => setActiveBookingIdForEdit(b.id)}
                              className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{b.brandName}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-650 dark:text-slate-350">{b.startTime} - {b.endTime} น.</span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold truncate">{b.campaignName || 'ยังไม่ระบุชื่อแคมเปญ'}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Selected Date listings details list (Right Column) */}
        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden max-h-[500px] lg:max-h-none">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between shrink-0 select-none">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">คิวการไลฟ์ประจำวัน</span>
            <strong className="text-xs text-brand-600 dark:text-brand-400">{formatThaiDate(calendarSelectedDate)}</strong>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {selectedDateBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 italic text-xs h-full">
                <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <span>ไม่มีคิวการจองห้องในวันนี้</span>
              </div>
            ) : (
              selectedDateBookings.map(b => {
                const autoStatus = getAutoStatus(b);
                
                const now = new Date();
                const localYear = now.getFullYear();
                const localMonth = String(now.getMonth() + 1).padStart(2, '0');
                const localDay = String(now.getDate()).padStart(2, '0');
                const todayStr = `${localYear}-${localMonth}-${localDay}`;
                const currentTotalMins = now.getHours() * 60 + now.getMinutes();
                const startMins = parseTimeToMinutes(b.startTime);
                const endMins = parseTimeToMinutes(b.endTime);
                const isLiveNow = b.status !== 'Cancelled' && b.date === todayStr && currentTotalMins >= startMins && currentTotalMins < endMins;

                let statusColor = 'border-l-4 border-blue-500 bg-blue-50/20 text-blue-900 dark:text-blue-300';
                if (isLiveNow) statusColor = 'border-l-4 border-rose-500 bg-rose-50/20 text-rose-900 dark:text-rose-350';
                else if (autoStatus === 'Completed') statusColor = 'border-l-4 border-emerald-500 bg-emerald-50/20 text-emerald-900 dark:text-emerald-300';
                else if (autoStatus === 'Cancelled') statusColor = 'border-l-4 border-slate-400 bg-slate-50/20 text-slate-700 dark:text-slate-400';

                return (
                  <div
                    key={b.id}
                    onClick={() => setActiveBookingIdForEdit(b.id)}
                    className={`p-3 rounded-xl border border-slate-200 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between ${statusColor}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs truncate">{b.brandName}</span>
                        {isLiveNow && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-500 text-white animate-pulse">
                            🔴 LIVE NOW
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950/40 shrink-0">{b.startTime} - {b.endTime} น.</span>
                    </div>
                    <span className="text-[10px] text-slate-450 dark:text-slate-400 mt-1.5 truncate font-semibold">ห้อง: {b.roomName}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{b.campaignName}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
