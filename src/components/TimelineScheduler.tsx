'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CustomSelect } from './CustomSelect';
import { useApp, Booking } from '@/context/AppContext';
import { parseTimeToMinutes, formatThaiDate } from '@/utils/time';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Plus, 
  CalendarDays,
  ChevronDown,
  X,
  Sparkles,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export default function TimelineScheduler() {
  const {
    bookings,
    rooms,
    brands,
    filters,
    setFilters,
    selectedDate,
    setSelectedDate,
    schedulerSearch,
    setSchedulerSearch,
    setActiveBookingIdForEdit,
    setActiveBookingCreateData,
    setIsImportModalOpen,
    currentUser,
    refreshActiveTabData,
    highlightedBookingId,
    setHighlightedBookingId
  } = useApp();

  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom room order state
  const [customRoomOrder, setCustomRoomOrder] = useState<string[]>([]);
  const [draggedRoomName, setDraggedRoomName] = useState<string | null>(null);

  // Ref and click-outside for custom brand dropdown select
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-scroll and highlight booking in timeline scheduler
  useEffect(() => {
    if (highlightedBookingId && bookings.length > 0) {
      const b = bookings.find(x => x.id === highlightedBookingId);
      if (b) {
        const startMins = parseTimeToMinutes(b.startTime);
        if (startMins !== -1) {
          const cellWidth = 80;
          const leftVal = startMins * (cellWidth / 30);
          
          setTimeout(() => {
            const container = document.querySelector('.scheduler-container');
            if (container) {
              container.scrollTo({
                left: Math.max(0, leftVal - 150),
                behavior: 'smooth'
              });
            }
          }, 150);
        }
      }
    }
  }, [highlightedBookingId, bookings]);

  // Clear highlighted state after 5 seconds
  useEffect(() => {
    if (highlightedBookingId) {
      const timer = setTimeout(() => {
        setHighlightedBookingId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedBookingId, setHighlightedBookingId]);

  // Drag selection states
  const [dragStartSlot, setDragStartSlot] = useState<{ roomName: string; index: number } | null>(null);
  const [dragEndSlot, setDragEndSlot] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Check if a room is live now
  const isRoomLiveNow = useCallback((roomName: string) => {
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDate = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDate}`;
    
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMins = currentHours * 60 + currentMinutes;
    
    return bookings.some(b => {
      if (b.roomName !== roomName || b.date !== todayStr || b.status !== 'Live') return false;
      const startMins = parseTimeToMinutes(b.startTime);
      const endMins = parseTimeToMinutes(b.endTime);
      return currentTotalMins >= startMins && currentTotalMins <= endMins;
    });
  }, [bookings]);

  // Global mouseup cleanup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (dragStartSlot && dragEndSlot !== null) {
          const startIndex = Math.min(dragStartSlot.index, dragEndSlot);
          const endIndex = Math.max(dragStartSlot.index, dragEndSlot);
          
          const startTotalMins = startIndex * 30;
          // If start and end are same, default to 1 hour (2 slots) instead of 30 mins
          const endTotalMins = startIndex === endIndex ? startTotalMins + 60 : (endIndex + 1) * 30;
          
          const hhStart = String(Math.floor(startTotalMins / 60)).padStart(2, '0');
          const mmStart = String(startTotalMins % 60).padStart(2, '0');
          const hhEnd = String(Math.floor(endTotalMins / 60)).padStart(2, '0');
          const mmEnd = String(endTotalMins % 60).padStart(2, '0');
          
          setActiveBookingCreateData({
            date: selectedDate,
            roomName: dragStartSlot.roomName,
            startTime: `${hhStart}:${mmStart}`,
            endTime: `${hhEnd}:${mmEnd}`
          });
        }
        setDragStartSlot(null);
        setDragEndSlot(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartSlot, dragEndSlot, selectedDate, setActiveBookingCreateData]);

  // Generate 24 hours schedule headers (every 30 mins)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      slots.push(`${hh}:00`);
      slots.push(`${hh}:30`);
    }
    return slots;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActiveTabData();
    setIsRefreshing(false);
  };

  // Date handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Initialize room order when rooms load
  useEffect(() => {
    if (rooms.length > 0 && customRoomOrder.length === 0) {
      // Load saved order from localStorage if exists
      const saved = localStorage.getItem('th_room_order');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Merge in case rooms list changed
            const activeRoomNames = rooms.filter(r => r.status === 'Active').map(r => r.name);
            const ordered = parsed.filter(name => activeRoomNames.includes(name));
            const missing = activeRoomNames.filter(name => !ordered.includes(name));
            setCustomRoomOrder([...ordered, ...missing]);
            return;
          }
        } catch(e) {}
      }
      setCustomRoomOrder(rooms.filter(r => r.status === 'Active').map(r => r.name));
    }
  }, [rooms, customRoomOrder]);

  // Drag and Drop rooms list logic

  const handleDragStart = (e: React.DragEvent, roomName: string) => {
    setDraggedRoomName(roomName);
    e.dataTransfer.effectAllowed = 'move';
    // Required to enable dragging in Firefox
    e.dataTransfer.setData('text/plain', roomName);
  };

  const handleDragOver = (e: React.DragEvent, targetRoomName: string) => {
    e.preventDefault();
    if (!draggedRoomName || draggedRoomName === targetRoomName) return;

    setCustomRoomOrder(prev => {
      const idxSource = prev.indexOf(draggedRoomName);
      const idxTarget = prev.indexOf(targetRoomName);
      if (idxSource === -1 || idxTarget === -1) return prev;

      const next = [...prev];
      // Remove from old index
      next.splice(idxSource, 1);
      // Insert at new index
      next.splice(idxTarget, 0, draggedRoomName);
      return next;
    });
  };

  const handleDragEnd = () => {
    setDraggedRoomName(null);
    localStorage.setItem('th_room_order', JSON.stringify(customRoomOrder));
  };

  // Filters change
  const handleRoomCheckboxChange = (roomName: string, checked: boolean) => {
    setFilters(prev => {
      const nextRooms = checked
        ? [...prev.room, roomName]
        : prev.room.filter(r => r !== roomName);
      return { ...prev, room: nextRooms };
    });
  };

  const handleSelectAllRooms = (checked: boolean) => {
    const activeRoomsVal = rooms.filter(r => r.status === 'Active');
    setFilters(prev => ({
      ...prev,
      room: checked ? activeRoomsVal.map(r => r.name) : []
    }));
  };

  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const roomDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(e.target as Node)) {
        setIsRoomDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeRooms = useMemo(() => {
    const list = rooms.filter(r => r.status === 'Active');
    // Sort according to custom room order
    if (customRoomOrder.length > 0) {
      list.sort((a, b) => {
        let idxA = customRoomOrder.indexOf(a.name);
        let idxB = customRoomOrder.indexOf(b.name);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
      });
    }
    return list;
  }, [rooms, customRoomOrder]);

  const filteredRoomsForDropdown = useMemo(() => {
    return activeRooms.filter(r =>
      r.name.toLowerCase().includes(roomSearchQuery.toLowerCase())
    );
  }, [activeRooms, roomSearchQuery]);

  const visibleRooms = useMemo(() => {
    if (filters.room.length === 0) return activeRooms;
    return activeRooms.filter(r => filters.room.includes(r.name));
  }, [activeRooms, filters.room]);

  const handleStatusFilterChange = (status: string) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleBrandCheckboxChange = (brandName: string, checked: boolean) => {
    setFilters(prev => {
      const nextBrands = checked 
        ? [...prev.brand, brandName]
        : prev.brand.filter(b => b !== brandName);
      return { ...prev, brand: nextBrands };
    });
  };

  const handleSelectAllBrands = (checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      brand: checked ? brands.map(b => b.name) : []
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      room: [],
      brand: [],
      status: '',
      action: 'all'
    });
    setSchedulerSearch('');
  };

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // 1. Room name filter
      if (filters.room.length > 0 && !filters.room.includes(b.roomName)) return false;
      // 2. Multi brand filter
      if (filters.brand.length > 0 && !filters.brand.includes(b.brandName)) return false;
      // 3. Status filter
      if (filters.status && b.status !== filters.status) return false;
      // 4. Search bar query
      if (schedulerSearch) {
        const query = schedulerSearch.toLowerCase();
        const campaignMatch = String(b.campaignName || '').toLowerCase().includes(query);
        const brandMatch = String(b.brandName || '').toLowerCase().includes(query);
        const ownerMatch = String(b.ownerName || '').toLowerCase().includes(query);
        if (!campaignMatch && !brandMatch && !ownerMatch) return false;
      }
      return true;
    });
  }, [bookings, filters, schedulerSearch]);

  // Dynamic brand list matching query
  const filteredBrandsForDropdown = useMemo(() => {
    return brands.filter(b => 
      b.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
    );
  }, [brands, brandSearchQuery]);

  const hasActiveFilters = 
    filters.room.length > 0 || 
    filters.brand.length > 0 || 
    filters.status !== '' || 
    schedulerSearch !== '';

  const canWrite = currentUser?.permissions?.canCreateBooking;

  // Render booking item blocks helper
  const renderBookingBlocks = (roomName: string) => {
    const roomBookings = filteredBookings.filter(b => b.roomName === roomName);

    // Compute current time info once
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();

    return roomBookings.map(b => {
      const startMins = parseTimeToMinutes(b.startTime);
      const endMins = parseTimeToMinutes(b.endTime);
      
      if (startMins === -1 || endMins === -1 || endMins <= startMins) return null;

      // Width calculation: 80px cell = 30 minutes
      const cellWidth = 80;
      const leftVal = (startMins * (cellWidth / 30));
      const widthVal = ((endMins - startMins) * (cellWidth / 30));

      // Determine real-time visual state based on actual clock time
      // isLiveNow = today AND current time is within the booking window
      const isLiveNow = b.date === todayStr && currentTotalMins >= startMins && currentTotalMins < endMins;
      // isFinished = date has passed, OR today but booking end time has passed
      const isFinished = b.date < todayStr || (b.date === todayStr && currentTotalMins >= endMins);

      let statusColorClass: string;
      if (b.status === 'Cancelled') {
        statusColorClass = 'status-cancelled';
      } else if (isLiveNow) {
        statusColorClass = 'status-live'; // 🔴 Red = Currently live
      } else if (isFinished) {
        statusColorClass = 'status-completed'; // 🟢 Green = Already finished
      } else {
        statusColorClass = 'status-confirmed'; // 🔵 Blue = Upcoming / not yet live
      }

      return (
        <div
          key={b.id}
          className={`booking-bar ${statusColorClass} ${b.id === highlightedBookingId ? 'ring-4 ring-amber-500 shadow-lg shadow-amber-500/50 scale-[1.03] z-20 border-amber-400 animate-pulse' : ''}`}
          style={{
            left: `${leftVal}px`,
            width: `${widthVal}px`
          }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveBookingIdForEdit(b.id);
          }}
          title={`${b.brandName} - ${b.campaignName} (${b.startTime} - ${b.endTime})`}
        >
          <div className="font-extrabold truncate text-[10px] leading-tight select-none flex items-center gap-1.5">
            <span>{b.brandName}</span>
            {isLiveNow && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[7px] font-black bg-rose-200 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded animate-pulse shrink-0 select-none">
                LIVE NOW 🔴
              </span>
            )}
          </div>
          <div className="truncate text-[9px] opacity-90 leading-tight select-none">
            {b.campaignName}
          </div>
        </div>
      );
    });
  };

  // Render empty cell clicks
  const handleCellClick = (roomName: string, slotIndex: number) => {
    if (!canWrite) return;
    
    const startTotalMins = slotIndex * 30;
    const endTotalMins = startTotalMins + 60; // default 1 hour slot
    
    const hhStart = String(Math.floor(startTotalMins / 60)).padStart(2, '0');
    const mmStart = String(startTotalMins % 60).padStart(2, '0');
    const hhEnd = String(Math.floor(endTotalMins / 60)).padStart(2, '0');
    const mmEnd = String(endTotalMins % 60).padStart(2, '0');
    
    setActiveBookingCreateData({
      date: selectedDate,
      roomName,
      startTime: `${hhStart}:${mmStart}`,
      endTime: `${hhEnd}:${mmEnd}`
    });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Header controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            ตารางงานสตูดิโอรายวัน
          </h2>
          <p className="text-xs text-slate-400 mt-1">บริหารจัดการเวลาไลฟ์สด แยกตามแต่ละห้องสตูดิโอแบบเรียลไทม์</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Today and Nav buttons */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
            <button onClick={handlePrevDay} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              วันนี้
            </button>
            <button onClick={handleNextDay} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date input picker */}
          <div className="relative flex items-center border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-brand-500 max-w-[155px]">
            <CalendarDays className="w-3.5 h-3.5 text-slate-450 mr-1.5 shrink-0" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer bg-transparent border-0 p-0 w-full"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={handleRefresh}
              className={`p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all ${isRefreshing ? 'animate-spin' : ''}`}
              title="ดึงข้อมูลล่าสุด"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            {canWrite && (
              <>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" /> นำเข้าคิวจอง Excel
                </button>
                <button 
                  onClick={() => setActiveBookingCreateData({ date: selectedDate, roomName: '', startTime: '09:00', endTime: '10:00' })}
                  className="px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> จองห้องไลฟ์
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Thai Date banner display */}
      <div className="bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/40 p-4 rounded-xl flex items-center gap-2.5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold shadow-sm">
        <CalendarDays className="w-5 h-5 text-brand-600" />
        <span>ตารางการไลฟ์ประจำวันที่:</span>
        <strong className="text-brand-600 dark:text-brand-400">{formatThaiDate(selectedDate)}</strong>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-brand-500" />
            <span>ตัวกรอง:</span>
          </div>

          {/* Room Filter */}
          <div className="relative" ref={roomDropdownRef}>
            <button
              onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
              className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer min-w-[160px] ${
                isRoomDropdownOpen
                  ? 'border-brand-500 ring-2 ring-brand-400/30 dark:border-brand-500'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="truncate select-none">
                {filters.room.length === 0 
                  ? 'ทุกห้องสตูดิโอ (All)' 
                  : filters.room.length === activeRooms.length 
                    ? `เลือกทุกห้อง (${filters.room.length})` 
                    : filters.room.join(', ')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isRoomDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isRoomDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-full w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                {/* Search */}
                {activeRooms.length > 5 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาห้อง..."
                        value={roomSearchQuery}
                        onChange={(e) => setRoomSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      />
                    </div>
                  </div>
                )}
                
                {/* Select All */}
                <div className="p-1">
                  <div
                    onClick={() => handleSelectAllRooms(!(filters.room.length === activeRooms.length && activeRooms.length > 0))}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      filters.room.length === activeRooms.length && activeRooms.length > 0
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {filters.room.length === activeRooms.length && activeRooms.length > 0 && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                  </div>
                </div>
                
                {/* Room list */}
                <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                  {filteredRoomsForDropdown.map(room => {
                    const isChecked = filters.room.includes(room.name);
                    return (
                      <div
                        key={room.id}
                        onClick={() => handleRoomCheckboxChange(room.name, !isChecked)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-brand-50 dark:bg-brand-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs truncate select-none ${
                          isChecked ? 'text-brand-700 dark:text-brand-300 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'
                        }`}>{room.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Multi-brand filter checkbox dropdown */}
          <div className="relative" ref={brandDropdownRef}>
            <button
              onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
              className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer min-w-[160px] ${
                isBrandDropdownOpen
                  ? 'border-brand-500 ring-2 ring-brand-400/30 dark:border-brand-500'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="truncate select-none">
                {filters.brand.length === 0 
                  ? 'ทุกแบรนด์ (All)' 
                  : filters.brand.length === brands.length 
                    ? `เลือกทุกแบรนด์ (${filters.brand.length})` 
                    : filters.brand.join(', ')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isBrandDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-full w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                {/* Search */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาแบรนด์..."
                      value={brandSearchQuery}
                      onChange={(e) => setBrandSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>
                
                {/* Select All */}
                <div className="p-1">
                  <div
                    onClick={() => handleSelectAllBrands(!(filters.brand.length === brands.length && brands.length > 0))}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      filters.brand.length === brands.length && brands.length > 0
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-slate-300 dark:border-slate-600'
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
                
                {/* Brand list */}
                <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                  {filteredBrandsForDropdown.map(brand => {
                    const isChecked = filters.brand.includes(brand.name);
                    return (
                      <div
                        key={brand.id}
                        onClick={() => handleBrandCheckboxChange(brand.name, !isChecked)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-brand-50 dark:bg-brand-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs truncate select-none ${
                          isChecked ? 'text-brand-700 dark:text-brand-300 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'
                        }`}>{brand.name}</span>
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
            onChange={handleStatusFilterChange}
            options={[
              { value: '', label: 'ทุกสถานะ (All)' },
              { value: 'Confirmed', label: 'Confirmed' },
              { value: 'Completed', label: 'Completed' },
            ]}
            className="min-w-[160px]"
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button 
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg font-semibold transition-all cursor-pointer"
            >
              <X className="w-3 h-3" /> ล้างค่าตัวกรอง
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="search" 
            placeholder="ค้นหาแคมเปญ / แบรนด์..." 
            value={schedulerSearch}
            onChange={(e) => setSchedulerSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950 dark:text-white"
            autoComplete="off"
          />
        </div>
      </div>

      {/* 3. Timeline grid component */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="scheduler-container">
          {/* Rooms column (Sticky left) */}
          <div className="scheduler-rooms-col dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
            <div className="h-11 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 font-bold text-slate-500 text-xs bg-slate-50 dark:bg-slate-900 select-none">
              ห้องสตูดิโอ
            </div>
            
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleRooms.map(room => {
                const now = new Date();
                const localYear = now.getFullYear();
                const localMonth = String(now.getMonth() + 1).padStart(2, '0');
                const localDate = String(now.getDate()).padStart(2, '0');
                const todayStr = `${localYear}-${localMonth}-${localDate}`;
                
                const currentHours = now.getHours();
                const currentMinutes = now.getMinutes();
                const currentTotalMins = currentHours * 60 + currentMinutes;
                
                const liveBooking = bookings.find(b => {
                  if (b.roomName !== room.name || b.date !== todayStr || b.status !== 'Live') return false;
                  const startMins = parseTimeToMinutes(b.startTime);
                  const endMins = parseTimeToMinutes(b.endTime);
                  return currentTotalMins >= startMins && currentTotalMins <= endMins;
                });
                
                const isLive = !!liveBooking;

                return (
                  <div 
                    key={room.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, room.name)}
                    onDragOver={(e) => handleDragOver(e, room.name)}
                    onDragEnd={handleDragEnd}
                    className={`h-[60px] px-4 flex flex-col justify-center select-none min-w-0 cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-150 group relative ${
                      draggedRoomName === room.name ? 'opacity-40 border-y border-dashed border-brand-400 bg-brand-50/10' : ''
                    }`}
                  >
                    {/* Tiny drag indicator handle shown on hover */}
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-0.5 text-slate-355 dark:text-slate-600">
                      <div className="flex gap-0.5">
                        <span className="w-0.5 h-0.5 rounded-full bg-current"></span>
                        <span className="w-0.5 h-0.5 rounded-full bg-current"></span>
                      </div>
                      <div className="flex gap-0.5">
                        <span className="w-0.5 h-0.5 rounded-full bg-current"></span>
                        <span className="w-0.5 h-0.5 rounded-full bg-current"></span>
                      </div>
                      <div className="flex gap-0.5">
                        <span className="w-0.5 h-0.5 rounded-full bg-current"></span>
                        <span className="w-0.5 h-0.5 rounded-full bg-current"></span>
                      </div>
                    </div>

                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 pl-1.5">{room.name}</span>
                    {isLive && liveBooking ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-500 dark:text-rose-400 animate-pulse mt-0.5 select-none whitespace-nowrap">
                        🔴 LIVE NOW ({liveBooking.startTime} - {liveBooking.endTime})
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={room.description}>
                        {room.description || 'ห้องจัดไลฟ์สด'}
                      </span>
                    )}
                  </div>
                );
              })}
              {visibleRooms.length === 0 && (
                <div className="p-4 text-center text-xs italic text-slate-400">ไม่มีห้องตามตัวกรองที่เลือก</div>
              )}
            </div>
          </div>

          {/* Hours timeline column (Scrollable right) */}
          <div className="scheduler-timeline-col dark:bg-slate-900">
            {/* Timeline hours header */}
            <div className="h-11 border-b border-slate-200 dark:border-slate-800 flex bg-slate-50 dark:bg-slate-900 divide-x divide-slate-200 dark:divide-slate-800 select-none min-w-max">
              {timeSlots.map((slot, index) => (
                <div 
                  key={index} 
                  className="timeline-header-cell flex flex-col justify-center items-center py-1 shrink-0 text-[10px] font-bold text-slate-400"
                >
                  <span>{slot}</span>
                  <span className="text-[8px] font-medium opacity-50">{index % 2 === 0 ? 'เริ่ม' : 'ครึ่ง'}</span>
                </div>
              ))}
            </div>

            {/* Timeline grid rows with booking absolute blocks */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800 relative min-w-max">
              {visibleRooms.map(room => (
                <div key={room.id} className="timeline-row flex shrink-0 relative h-[60px]">
                  {/* Empty cells background grids */}
                  {timeSlots.map((_, index) => {
                    const isSelecting = isDragging && dragStartSlot && dragStartSlot.roomName === room.name &&
                      index >= Math.min(dragStartSlot.index, dragEndSlot ?? dragStartSlot.index) &&
                      index <= Math.max(dragStartSlot.index, dragEndSlot ?? dragStartSlot.index);

                    return (
                      <div
                        key={index}
                        onMouseDown={(e) => {
                          if (!canWrite) return;
                          if (e.button !== 0) return; // Only left click drag
                          setIsDragging(true);
                          setDragStartSlot({ roomName: room.name, index });
                          setDragEndSlot(index);
                        }}
                        onMouseEnter={() => {
                          if (isDragging && dragStartSlot && dragStartSlot.roomName === room.name) {
                            setDragEndSlot(index);
                          }
                        }}
                        className={`timeline-grid-cell shrink-0 select-none cursor-crosshair transition-colors ${
                          isSelecting 
                            ? 'bg-brand-500/25 border-brand-500/40 dark:bg-brand-500/25 dark:border-brand-500/40' 
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                        }`}
                        title={canWrite ? 'คลิกค้างแล้วลากเพื่อเลือกช่วงเวลาจองห้องไลฟ์สด' : ''}
                      />
                    );
                  })}
                  {/* Floating Booking Bars on top */}
                  {renderBookingBlocks(room.name)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
