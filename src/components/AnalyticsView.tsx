'use client';

import React, { useState, useMemo } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { parseTimeToMinutes, formatThaiDate } from '@/utils/time';
import * as XLSX from 'xlsx';
import { 
  Sparkles,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  ChevronDown,
  Tag,
  Users,
  Mic,
  BarChart3,
  ShieldAlert,
  AlertTriangle,
  Award,
  Star,
  List,
  FileSpreadsheet,
  Download,
  Search,
  Check,
  X,
  Filter,
  SlidersHorizontal,
  ChevronUp
} from 'lucide-react';

const THAI_DAY_NAMES = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

interface AnalyticsViewProps {
  subTab?: string;
}

export default function AnalyticsView({ subTab = 'analytics' }: AnalyticsViewProps) {
  const {
    calendarBookings,
    rooms,
    brands,
    mcList,
    mcTiers,
    allUsersAdmin
  } = useApp();

  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Custom Overload settings states
  const [overloadLimit, setOverloadLimit] = useState<number>(40);
  const [isOverloadEnabled, setIsOverloadEnabled] = useState<boolean>(false);

  // Dynamic Staff Filters States (Multi-select)
  const [selectedStaffEmails, setSelectedStaffEmails] = useState<string[]>([]);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [minHours, setMinHours] = useState<string>('');
  const [maxHours, setMaxHours] = useState<string>('');
  const [minLives, setMinLives] = useState<string>('');
  const [maxLives, setMaxLives] = useState<string>('');
  const [selectDate, setSelectDate] = useState<string>('');

  // Dynamic MC Filters States
  const [selectedMcIds, setSelectedMcIds] = useState<string[]>([]);
  const [selectedMcBrands, setSelectedMcBrands] = useState<string[]>([]);
  const [mcMinLives, setMcMinLives] = useState<string>('');
  const [mcMaxLives, setMcMaxLives] = useState<string>('');
  const [mcMinHours, setMcMinHours] = useState<string>('');
  const [mcMaxHours, setMcMaxHours] = useState<string>('');

  // Dropdown open states for MC Filters
  const [isMcDropdownOpen, setIsMcDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [mcSearchQuery, setMcSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');

  // Overview Dashboard Multi-select Filters States
  const [overviewSelectedRooms, setOverviewSelectedRooms] = useState<string[]>([]);
  const [overviewSelectedBrands, setOverviewSelectedBrands] = useState<string[]>([]);
  const [overviewSelectedMcIds, setOverviewSelectedMcIds] = useState<string[]>([]);
  const [overviewSelectedStaffEmails, setOverviewSelectedStaffEmails] = useState<string[]>([]);
  const [overviewStatusFilter, setOverviewStatusFilter] = useState<'all' | 'Confirmed' | 'Cancelled'>('all');
  const [overviewShiftFilter, setOverviewShiftFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  // Overview Dropdowns open states
  const [isOverviewRoomOpen, setIsOverviewRoomOpen] = useState(false);
  const [isOverviewBrandOpen, setIsOverviewBrandOpen] = useState(false);
  const [isOverviewMcOpen, setIsOverviewMcOpen] = useState(false);
  const [isOverviewStaffOpen, setIsOverviewStaffOpen] = useState(false);
  const [overviewRoomSearch, setOverviewRoomSearch] = useState('');
  const [overviewBrandSearch, setOverviewBrandSearch] = useState('');
  const [overviewMcSearch, setOverviewMcSearch] = useState('');
  const [overviewStaffSearch, setOverviewStaffSearch] = useState('');

  // Available options for Overview multi-select filters
  const overviewAvailableRooms = useMemo(() => {
    const list = new Set(rooms.map(r => r.name));
    calendarBookings.forEach(b => { if (b.roomName) list.add(b.roomName); });
    return Array.from(list).filter(Boolean).sort();
  }, [rooms, calendarBookings]);

  const overviewAvailableBrands = useMemo(() => {
    const list = new Set(brands.map(b => b.name));
    calendarBookings.forEach(b => { if (b.brandName) list.add(b.brandName); });
    return Array.from(list).filter(Boolean).sort();
  }, [brands, calendarBookings]);

  const overviewAvailableStaff = useMemo(() => {
    const staffMap = new Map<string, string>();
    allUsersAdmin.forEach(u => {
      staffMap.set(u.email.toLowerCase().trim(), u.name || u.email);
    });
    calendarBookings.forEach(b => {
      if (b.lsArtworkLayout) {
        try {
          const meta = typeof b.lsArtworkLayout === 'string' ? JSON.parse(b.lsArtworkLayout) : b.lsArtworkLayout;
          if (meta?.staffEmails && Array.isArray(meta.staffEmails)) {
            meta.staffEmails.forEach((em: string) => {
              if (em && !staffMap.has(em.toLowerCase().trim())) {
                const userObj = allUsersAdmin.find(u => u.email.toLowerCase() === em.toLowerCase().trim());
                staffMap.set(em.toLowerCase().trim(), userObj?.name || em);
              }
            });
          }
          if (meta?.liveSupportStaff && Array.isArray(meta.liveSupportStaff)) {
            meta.liveSupportStaff.forEach((st: any) => {
              const em = (st.email || st.name || '').toLowerCase().trim();
              if (em && !staffMap.has(em)) {
                staffMap.set(em, st.name || em);
              }
            });
          }
        } catch(e){}
      }
      if (b.briefLink && b.briefLink.includes('@')) {
        b.briefLink.split(',').map(x => x.trim()).filter(Boolean).forEach(em => {
          if (em && !staffMap.has(em.toLowerCase())) {
            const userObj = allUsersAdmin.find(u => u.email.toLowerCase() === em.toLowerCase());
            staffMap.set(em.toLowerCase(), userObj?.name || em);
          }
        });
      }
    });
    return Array.from(staffMap.entries()).map(([email, name]) => ({ email, name }));
  }, [allUsersAdmin, calendarBookings]);

  const isOverviewFiltered = overviewSelectedRooms.length > 0 || 
    overviewSelectedBrands.length > 0 || 
    overviewSelectedMcIds.length > 0 || 
    overviewSelectedStaffEmails.length > 0 || 
    overviewStatusFilter !== 'all' || 
    overviewShiftFilter !== 'all';

  const handleClearOverviewFilters = () => {
    setOverviewSelectedRooms([]);
    setOverviewSelectedBrands([]);
    setOverviewSelectedMcIds([]);
    setOverviewSelectedStaffEmails([]);
    setOverviewStatusFilter('all');
    setOverviewShiftFilter('all');
  };

  // Filter bookings list based on timeframe selection & overview multi-select filters
  const filteredBookings = useMemo(() => {
    let list = calendarBookings;
    
    const today = new Date();
    const limit = new Date();
    
    if (dateRange === 'month') {
      limit.setDate(today.getDate() - 30);
      const limitStr = limit.toISOString().split('T')[0];
      list = list.filter(b => b.date >= limitStr);
    } else if (dateRange === 'week') {
      limit.setDate(today.getDate() - 7);
      const limitStr = limit.toISOString().split('T')[0];
      list = list.filter(b => b.date >= limitStr);
    } else if (dateRange === 'custom') {
      list = list.filter(b => {
        if (!customStartDate && !customEndDate) return true;
        if (customStartDate && !customEndDate) return b.date >= customStartDate;
        if (!customStartDate && customEndDate) return b.date <= customEndDate;
        return b.date >= customStartDate && b.date <= customEndDate;
      });
    }

    // Overview Multi-select Filters (Applied on main overview dashboard)
    if (subTab === 'analytics' || subTab === 'analytics-rooms' || subTab === 'analytics-brands') {
      if (overviewSelectedRooms.length > 0) {
        list = list.filter(b => overviewSelectedRooms.includes(b.roomName));
      }
      if (overviewSelectedBrands.length > 0) {
        list = list.filter(b => overviewSelectedBrands.includes(b.brandName));
      }
      if (overviewSelectedMcIds.length > 0) {
        list = list.filter(b => {
          if (!b.mcId) return false;
          const ids = b.mcId.split(',').map(x => x.trim()).filter(Boolean);
          return ids.some(id => overviewSelectedMcIds.includes(id));
        });
      }
      if (overviewSelectedStaffEmails.length > 0) {
        list = list.filter(b => {
          let bStaffEmails: string[] = [];
          if (b.lsArtworkLayout) {
            try {
              const meta = typeof b.lsArtworkLayout === 'string' ? JSON.parse(b.lsArtworkLayout) : b.lsArtworkLayout;
              if (meta) {
                if (Array.isArray(meta.staffEmails)) {
                  bStaffEmails.push(...meta.staffEmails);
                }
                if (Array.isArray(meta.liveSupportStaff)) {
                  bStaffEmails.push(...meta.liveSupportStaff.map((st: any) => st.email || st.name));
                }
              }
            } catch(e){}
          }
          if (bStaffEmails.length === 0 && b.briefLink && b.briefLink.includes('@')) {
            bStaffEmails = b.briefLink.split(',').map(x => x.trim()).filter(Boolean);
          }
          const lowerStaff = bStaffEmails.map(s => (s || '').toLowerCase().trim());
          return overviewSelectedStaffEmails.some(selected => lowerStaff.includes(selected.toLowerCase().trim()));
        });
      }
      if (overviewStatusFilter !== 'all') {
        list = list.filter(b => (b.status || 'Confirmed') === overviewStatusFilter);
      }
      if (overviewShiftFilter !== 'all') {
        list = list.filter(b => {
          const startMin = parseTimeToMinutes(b.startTime);
          if (overviewShiftFilter === 'morning') return startMin >= 360 && startMin < 720;
          if (overviewShiftFilter === 'afternoon') return startMin >= 720 && startMin < 1080;
          if (overviewShiftFilter === 'evening') return startMin >= 1080 || startMin < 360;
          return true;
        });
      }
    }

    return list;
  }, [
    calendarBookings, 
    dateRange, 
    customStartDate, 
    customEndDate,
    subTab,
    overviewSelectedRooms,
    overviewSelectedBrands,
    overviewSelectedMcIds,
    overviewSelectedStaffEmails,
    overviewStatusFilter,
    overviewShiftFilter
  ]);

  // 1. KPI Calculations
  const kpis = useMemo(() => {
    const total = filteredBookings.length;
    const active = filteredBookings.filter(b => b.status !== 'Cancelled').length;
    const cancelled = total - active;
    
    let totalMins = 0;
    filteredBookings.forEach(b => {
      if (b.status !== 'Cancelled') {
        const start = parseTimeToMinutes(b.startTime);
        const end = parseTimeToMinutes(b.endTime);
        if (end > start) {
          totalMins += (end - start);
        }
      }
    });

    const activeBrands = new Set(filteredBookings.map(b => b.brandName)).size;

    return {
      total,
      active,
      cancelled,
      hours: totalMins / 60,
      brandsCount: activeBrands
    };
  }, [filteredBookings]);

  // 2. Peak Hours (0-23 hours distribution)
  const peakHoursData = useMemo(() => {
    const hoursCount = Array(24).fill(0);
    
    filteredBookings.forEach(b => {
      if (b.status === 'Cancelled') return;
      const start = Math.floor(parseTimeToMinutes(b.startTime) / 60);
      const end = Math.floor(parseTimeToMinutes(b.endTime) / 60);
      
      if (start >= 0 && end > start) {
        for (let h = start; h < end; h++) {
          if (h >= 0 && h < 24) {
            hoursCount[h]++;
          }
        }
      }
    });

    const max = Math.max(...hoursCount) || 1;
    return hoursCount.map((count, hr) => ({
      hourLabel: `${String(hr).padStart(2, '0')}:00`,
      count,
      percent: (count / max) * 100
    }));
  }, [filteredBookings]);

  // 3. Heatmap Matrix (Day-of-Week vs Room Booking Density)
  const heatmapData = useMemo(() => {
    // 7 days x rooms count matrix
    const roomList = rooms.filter(r => r.status === 'Active').map(r => r.name);
    const matrix: Record<number, Record<string, number>> = {};
    
    // Init matrix
    for (let day = 0; day < 7; day++) {
      matrix[day] = {};
      roomList.forEach(rName => {
        matrix[day][rName] = 0;
      });
    }

    filteredBookings.forEach(b => {
      if (b.status === 'Cancelled') return;
      const dayIndex = new Date(b.date).getDay();
      if (matrix[dayIndex] && roomList.includes(b.roomName)) {
        matrix[dayIndex][b.roomName]++;
      }
    });

    // Find max value in matrix for density color scaling
    let max = 1;
    for (let day = 0; day < 7; day++) {
      roomList.forEach(rName => {
        if (matrix[day][rName] > max) {
          max = matrix[day][rName];
        }
      });
    }

    return {
      rooms: roomList,
      matrix,
      max
    };
  }, [filteredBookings, rooms]);

  // 4. Advanced Analytics & Dynamic Insights
  const analyticsInsights = useMemo(() => {
    const brandHours: Record<string, number> = {};
    const brandBookings: Record<string, number> = {};
    const roomHours: Record<string, number> = {};
    const roomBookings: Record<string, number> = {};
    
    let totalMins = 0;
    
    filteredBookings.forEach(b => {
      if (b.status === 'Cancelled') return;
      
      const start = parseTimeToMinutes(b.startTime);
      const end = parseTimeToMinutes(b.endTime);
      
      if (end > start) {
        const diff = end - start;
        totalMins += diff;
        const hrs = diff / 60;
        
        brandHours[b.brandName] = (brandHours[b.brandName] || 0) + hrs;
        roomHours[b.roomName] = (roomHours[b.roomName] || 0) + hrs;
      }
      
      brandBookings[b.brandName] = (brandBookings[b.brandName] || 0) + 1;
      roomBookings[b.roomName] = (roomBookings[b.roomName] || 0) + 1;
    });
    
    // Sort Brands descending
    const sortedBrands = Object.keys(brandHours)
      .map(name => ({
        name,
        hours: brandHours[name],
        count: brandBookings[name] || 0
      }))
      .sort((a, b) => b.hours - a.hours);
      
    // Sort Rooms descending
    const sortedRooms = Object.keys(roomHours)
      .map(name => ({
        name,
        hours: roomHours[name],
        count: roomBookings[name] || 0
      }))
      .sort((a, b) => b.hours - a.hours);

    // Peak Hour calculation
    const peakHourIndex = peakHoursData.reduce((maxIdx, current, idx, arr) => 
      current.count > arr[maxIdx].count ? idx : maxIdx, 0
    );
    const peakHourInfo = peakHoursData[peakHourIndex];

    // Total cancellations & rate
    const totalCount = filteredBookings.length;
    const cancelCount = filteredBookings.filter(b => b.status === 'Cancelled').length;
    const cancelRate = totalCount > 0 ? (cancelCount / totalCount) * 100 : 0;

    // Generate Dynamic Smart Recommendations/Insights
    const recommendations: string[] = [];

    // 1. Peak Hour Insight
    if (peakHourInfo && peakHourInfo.count > 0) {
      recommendations.push(
        `ชั่วโมงยอดนิยมสะสมสูงสุดคือช่วงเวลา **${peakHourInfo.hourLabel} น.** (มีคิวไลฟ์สดสะสม ${peakHourInfo.count} รายการ) แนะนำให้ทีมเทคนิคและฝ่ายสนับสนุนจัดเตรียมเวรตรวจสอบเครื่องมืออุปกรณ์เพื่อความลื่นไหลสูงสุดในช่วงเวลาดังกล่าว`
      );
    } else {
      recommendations.push(
        `ชั่วโมงการใช้งานสตูดิโอค่อนข้างกระจายสม่ำเสมอ แนะนำตรวจเช็คประสิทธิภาพอุปกรณ์และทำความสะอาดกล้อง/ไฟตามรอบการใช้งานประจำวัน`
      );
    }

    // 2. Cancellation Rate Insight
    if (cancelRate > 10) {
      recommendations.push(
        `อัตราการยกเลิกคิวจองในระบบอยู่ที่ **${cancelRate.toFixed(0)}%** (สูงกว่าเกณฑ์มาตรฐาน 10%) พิจารณากำหนดข้อตกลงสิทธิ์ให้กดยกเลิกสแตนด์บายล่วงหน้าอย่างน้อย 24 ชั่วโมง หรือจัดส่งแจ้งเตือนทางกลุ่ม Line เพื่อให้ยืนยันคิวก่อนเริ่ม`
      );
    } else {
      recommendations.push(
        `อัตราการยกเลิกคิวต่ำมากเพียง **${cancelRate.toFixed(0)}%** บ่งบอกถึงการประสานงานที่มีประสิทธิภาพสูง แบรนด์คู่ค้าและทีมงานเข้าใช้งานสตูดิโอตรงเวลาอย่างดีเยี่ยม`
      );
    }

    // 3. Top Brand concentration Insight
    if (sortedBrands.length > 0) {
      const topBrand = sortedBrands[0];
      const totalHours = totalMins / 60;
      const pct = totalHours > 0 ? (topBrand.hours / totalHours) * 100 : 0;
      recommendations.push(
        `แบรนด์ **${topBrand.name}** เป็นลูกค้าหลักที่มีเวลาขึ้นไลฟ์สดสะสมมากที่สุด **${topBrand.hours.toFixed(1)} ชั่วโมง** (คิดเป็น ${pct.toFixed(0)}% ของชั่วโมงสะสมรวมทั้งหมด) แนะนำจัดเจ้าหน้าที่ประสานงานเฉพาะแบรนด์เพื่อมอบบริการสนับสนุนพรีเมียม`
      );
    }

    // 4. Room/Studio optimization Insight
    if (sortedRooms.length > 1) {
      const mostUsed = sortedRooms[0];
      const leastUsed = sortedRooms[sortedRooms.length - 1];
      const ratio = mostUsed.hours > 0 ? (leastUsed.hours / mostUsed.hours) * 100 : 0;
      
      if (ratio < 40) {
        recommendations.push(
          `การกระจายโหลดงานจองระหว่างห้องสตูดิโอยังไม่สมดุล ห้อง **${mostUsed.name}** ใช้งานสูงสุด แต่ห้อง **${leastUsed.name}** จองเพียง ${leastUsed.hours.toFixed(1)} ชม. (${ratio.toFixed(0)}% เทียบกับห้องหลัก) พิจารณาเสนอแนะให้ทีมจองโยกบางแคมเปญมาใช้ห้องรอง หรือปรับปรุงความน่าดึงดูดของอุปกรณ์ในห้องดังกล่าว`
        );
      } else {
        recommendations.push(
          `การกระจายการใช้งานสตูดิโอแต่ละห้องอยู่ในเกณฑ์สมดุลดีเฉลี่ยใกล้เคียงกัน ช่วยเฉลี่ยการสึกหรอของกล้อง ไฟ และสัญญาณเน็ตแต่ละห้องอย่างเป็นระบบ`
        );
      }
    }

    return {
      sortedBrands,
      sortedRooms,
      recommendations
    };
  }, [filteredBookings, peakHoursData]);

  // Staff Performance Analytics Calculations
  const staffAnalyticsData = useMemo(() => {
    const staffStats: Record<string, { email: string; name: string; hours: number; count: number; bookings: Booking[] }> = {};
    
    // Initialize stats with all users
    allUsersAdmin.forEach(u => {
      staffStats[u.email.toLowerCase()] = {
        email: u.email,
        name: u.name,
        hours: 0,
        count: 0,
        bookings: []
      };
    });

    filteredBookings.forEach(b => {
      if (b.status === 'Cancelled') return;

      let staffEmails: string[] = [];
      if (b.lsArtworkLayout) {
        try {
          const parsed = JSON.parse(b.lsArtworkLayout);
          if (parsed && Array.isArray(parsed.staffEmails)) {
            staffEmails = parsed.staffEmails;
          }
        } catch(e){}
      }
      if (staffEmails.length === 0 && b.briefLink && b.briefLink.includes('@')) {
        staffEmails = b.briefLink.split(',').map(x => x.trim()).filter(Boolean);
      }

      const start = parseTimeToMinutes(b.startTime);
      const end = parseTimeToMinutes(b.endTime);
      const hrs = end > start ? (end - start) / 60 : 0;

      staffEmails.forEach(email => {
        const key = email.toLowerCase().trim();
        if (!staffStats[key]) {
          const matchedUser = allUsersAdmin.find(u => u.email.toLowerCase() === key);
          staffStats[key] = {
            email,
            name: matchedUser?.name || email.split('@')[0],
            hours: 0,
            count: 0,
            bookings: []
          };
        }
        staffStats[key].hours += hrs;
        staffStats[key].count += 1;
        staffStats[key].bookings.push(b);
      });
    });

    // Filter and compute based on inputs
    let result = Object.values(staffStats);

    // Apply staff dynamic selected date filter
    if (selectDate) {
      result = result.map(staff => {
        const filteredBookings = staff.bookings.filter(b => b.date === selectDate);
        let totalHrs = 0;
        filteredBookings.forEach(b => {
          const start = parseTimeToMinutes(b.startTime);
          const end = parseTimeToMinutes(b.endTime);
          if (end > start) totalHrs += (end - start) / 60;
        });
        return {
          ...staff,
          hours: totalHrs,
          count: filteredBookings.length,
          bookings: filteredBookings
        };
      });
    }

    // Filter by selected staff emails (multi-select)
    if (selectedStaffEmails.length > 0) {
      const selectedLower = selectedStaffEmails.map(em => em.toLowerCase().trim());
      result = result.filter(s => selectedLower.includes(s.email.toLowerCase().trim()));
    }

    // Filter by min/max hours
    if (minHours !== '') {
      result = result.filter(s => s.hours >= parseFloat(minHours));
    }
    if (maxHours !== '') {
      result = result.filter(s => s.hours <= parseFloat(maxHours));
    }

    // Filter by min/max lives
    if (minLives !== '') {
      result = result.filter(s => s.count >= parseInt(minLives));
    }
    if (maxLives !== '') {
      result = result.filter(s => s.count <= parseInt(maxLives));
    }

    // Sort staff by total hours descending
    return result.sort((a, b) => b.hours - a.hours);
  }, [filteredBookings, allUsersAdmin, selectedStaffEmails, minHours, maxHours, minLives, maxLives, selectDate]);

  // MC Performance Analytics Calculations
  const mcAnalyticsData = useMemo(() => {
    const mcStats: Record<string, { id: string; name: string; hours: number; count: number; bookings: Booking[] }> = {};

    // Initialize with all MCs
    mcList.forEach(mc => {
      mcStats[mc.id] = {
        id: mc.id,
        name: mc.name,
        hours: 0,
        count: 0,
        bookings: []
      };
    });

    filteredBookings.forEach(b => {
      if (b.status === 'Cancelled') return;

      // Filter by selected brands
      if (selectedMcBrands.length > 0 && !selectedMcBrands.includes(b.brandName)) {
        return;
      }

      if (b.mcId) {
        const mcIds = b.mcId.split(',').map(x => x.trim()).filter(Boolean);
        const start = parseTimeToMinutes(b.startTime);
        const end = parseTimeToMinutes(b.endTime);
        const hrs = end > start ? (end - start) / 60 : 0;

        mcIds.forEach(id => {
          if (!mcStats[id]) {
            const matchedMc = mcList.find(mc => mc.id === id);
            mcStats[id] = {
              id,
              name: matchedMc?.name || 'MC ทั่วไป',
              hours: 0,
              count: 0,
              bookings: []
            };
          }
          mcStats[id].hours += hrs;
          mcStats[id].count += 1;
          mcStats[id].bookings.push(b);
        });
      }
    });

    let result = Object.values(mcStats);

    // 1. Filter by selected MCs (multi-select)
    if (selectedMcIds.length > 0) {
      result = result.filter(m => selectedMcIds.includes(m.id));
    }

    // 2. Filter by min/max live rounds
    if (mcMinLives !== '') {
      const minL = parseInt(mcMinLives, 10);
      if (!isNaN(minL)) result = result.filter(m => m.count >= minL);
    }
    if (mcMaxLives !== '') {
      const maxL = parseInt(mcMaxLives, 10);
      if (!isNaN(maxL)) result = result.filter(m => m.count <= maxL);
    }

    // 3. Filter by min/max accumulated hours
    if (mcMinHours !== '') {
      const minH = parseFloat(mcMinHours);
      if (!isNaN(minH)) result = result.filter(m => m.hours >= minH);
    }
    if (mcMaxHours !== '') {
      const maxH = parseFloat(mcMaxHours);
      if (!isNaN(maxH)) result = result.filter(m => m.hours <= maxH);
    }

    return result.sort((a, b) => b.hours - a.hours);
  }, [filteredBookings, mcList, selectedMcIds, selectedMcBrands, mcMinLives, mcMaxLives, mcMinHours, mcMaxHours]);

  // Max values for relative progress bar scaling
  const maxBrandHours = useMemo(() => {
    return Math.max(...analyticsInsights.sortedBrands.map(b => b.hours), 1);
  }, [analyticsInsights.sortedBrands]);

  const maxRoomHours = useMemo(() => {
    return Math.max(...analyticsInsights.sortedRooms.map(r => r.hours), 1);
  }, [analyticsInsights.sortedRooms]);

  const maxStaffHours = useMemo(() => {
    return Math.max(...staffAnalyticsData.map(s => s.hours), 1);
  }, [staffAnalyticsData]);

  const maxMcHours = useMemo(() => {
    return Math.max(...mcAnalyticsData.map(m => m.hours), 1);
  }, [mcAnalyticsData]);

  // Export Staff Analytics to CSV/Excel (เฉพาะตารางบันทึกการจัดไลฟ์แยกตาม Staff - Staff Sessions Logs)
  const handleExportStaffExcel = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Thai language support
    csvContent += "ลำดับ,ชื่อ Staff,อีเมล,คิวไลฟ์ทั้งหมด (ครั้ง),ชั่วโมงไลฟ์สะสม (ชม.),ประเมินสภาวะงาน (Status),แคมเปญล่าสุดที่ดูแล\n";

    staffAnalyticsData.forEach((staff, idx) => {
      const isOverloaded = isOverloadEnabled && staff.hours > overloadLimit;
      const highLoadThreshold = overloadLimit * 0.6;
      const status = isOverloaded 
        ? `Overloaded (> ${overloadLimit} ชม.)` 
        : (isOverloadEnabled && staff.hours > highLoadThreshold) 
          ? `High Load (> ${highLoadThreshold.toFixed(0)} ชม.)` 
          : 'Good Balance';
      const lastBooking = staff.bookings[staff.bookings.length - 1];
      const latestCampaign = lastBooking 
        ? `${lastBooking.brandName}${lastBooking.campaignName ? ` (${lastBooking.campaignName})` : ''} [${lastBooking.date}]` 
        : 'ไม่มีงานในระบบ';

      const escape = (val: string) => {
        const cleaned = (val || '').replace(/"/g, '""');
        return cleaned.includes(',') || cleaned.includes('\n') || cleaned.includes('"') ? `"${cleaned}"` : cleaned;
      };

      const columns = [
        String(idx + 1),
        staff.name,
        staff.email,
        String(staff.count),
        staff.hours.toFixed(1),
        status,
        latestCampaign
      ];

      csvContent += columns.map(col => escape(col)).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `staff_sessions_logs_${formattedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export MC Performance Analytics to Excel (.xlsx) with 2 detailed sheets
  const handleExportMcExcel = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let dateRangeLabel = 'ข้อมูลทั้งหมด';
    if (dateRange === 'month') dateRangeLabel = 'ย้อนหลัง_30_วัน';
    else if (dateRange === 'week') dateRangeLabel = 'ย้อนหลัง_7_วัน';
    else if (dateRange === 'custom') dateRangeLabel = `${customStartDate || 'start'}_ถึง_${customEndDate || 'end'}`;

    // --- Sheet 1: สรุปภาพรวมราย MC (MC Overview) ---
    const sheet1Data: any[][] = [
      [
        'ลำดับ',
        'ชื่อ MC',
        'ระดับ Tier',
        'จำนวนรอบไลฟ์สะสม (ครั้ง)',
        'เวลาจัดรายการสะสม (ชม.)',
        'รายชื่อแบรนด์ที่เคยไลฟ์',
        'จำนวนแบรนด์ทั้งหมด (แบรนด์)',
        'ช่วงเวลาไลฟ์ยอดนิยมประจำตัว',
        'แคมเปญล่าสุด'
      ]
    ];

    mcAnalyticsData.forEach((mc, idx) => {
      const matchedMcObj = mcList.find(m => m.id === mc.id);
      const tierObj = mcTiers.find(t => t.id === matchedMcObj?.tierId);
      const tierName = tierObj ? tierObj.name : '-';

      // Unique brands for this MC
      const mcBrands = Array.from(new Set(mc.bookings.map(b => b.brandName).filter(Boolean)));
      const brandStr = mcBrands.length > 0 ? mcBrands.join(', ') : '-';

      // Peak hour calculation
      const hoursCount = Array(24).fill(0);
      mc.bookings.forEach(b => {
        const hour = Math.floor(parseTimeToMinutes(b.startTime) / 60);
        if (hour >= 0 && hour < 24) hoursCount[hour]++;
      });
      const peakHour = hoursCount.reduce((maxIdx, val, idx, arr) => val > arr[maxIdx] ? idx : maxIdx, 0);
      const peakHourVal = hoursCount[peakHour];
      const peakHourStr = peakHourVal > 0 ? `${String(peakHour).padStart(2, '0')}:00 น. (${peakHourVal} ไลฟ์)` : '-';

      const lastBooking = mc.bookings[mc.bookings.length - 1];
      const latestInfo = lastBooking 
        ? `${lastBooking.brandName}${lastBooking.campaignName ? ` (${lastBooking.campaignName})` : ''} [${lastBooking.date} ${lastBooking.startTime}น.]`
        : 'ไม่มีงานในระบบ';

      sheet1Data.push([
        idx + 1,
        mc.name,
        tierName,
        mc.count,
        Number(mc.hours.toFixed(1)),
        brandStr,
        mcBrands.length,
        peakHourStr,
        latestInfo
      ]);
    });

    // --- Sheet 2: รายละเอียดคิวไลฟ์ของ MC (Detailed Live Sessions) ---
    const sheet2Data: any[][] = [
      [
        'วันที่',
        'เวลาเริ่มต้น',
        'เวลาสิ้นสุด',
        'ระยะเวลา (ชม.)',
        'ชื่อ MC',
        'ระดับ Tier',
        'แบรนด์',
        'ห้องสตูดิโอ',
        'ชื่อแคมเปญ',
        'ผู้สร้างคิว (Owner)',
        'ผู้ดูแลห้องไลฟ์ (Live Support Staff)',
        'หมายเหตุ / รายละเอียด'
      ]
    ];

    const detailedSessions: any[] = [];
    const validFilteredMcIds = new Set(mcAnalyticsData.map(m => m.id));

    filteredBookings.forEach(b => {
      if (b.status === 'Cancelled') return;
      if (!b.mcId) return;
      if (selectedMcBrands.length > 0 && !selectedMcBrands.includes(b.brandName)) return;

      const mcIds = b.mcId.split(',').map(x => x.trim()).filter(Boolean);
      const startM = parseTimeToMinutes(b.startTime);
      const endM = parseTimeToMinutes(b.endTime);
      const durationHours = endM > startM ? Number(((endM - startM) / 60).toFixed(1)) : 0;

      mcIds.forEach(id => {
        if (!validFilteredMcIds.has(id)) return;
        const matchedMc = mcList.find(m => m.id === id);
        const mcName = matchedMc?.name || 'MC ทั่วไป';
        const tierObj = mcTiers.find(t => t.id === matchedMc?.tierId);
        const tierName = tierObj ? tierObj.name : '-';

        let staffNames = '-';
        if (b.lsArtworkLayout) {
          try {
            const meta = typeof b.lsArtworkLayout === 'string' ? JSON.parse(b.lsArtworkLayout) : b.lsArtworkLayout;
            if (meta.liveSupportStaff && Array.isArray(meta.liveSupportStaff) && meta.liveSupportStaff.length > 0) {
              staffNames = meta.liveSupportStaff.map((st: any) => st.name || st.email).join(', ');
            }
          } catch(e){}
        }

        detailedSessions.push({
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          durationHours,
          mcName,
          tierName,
          brandName: b.brandName,
          roomName: b.roomName,
          campaignName: b.campaignName || '-',
          ownerName: b.ownerName || b.ownerEmail || '-',
          staffNames,
          remark: b.remark || b.briefText || '-'
        });
      });
    });

    // Sort detailed sessions by Date ASC, StartTime ASC, MC Name ASC
    detailedSessions.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.mcName.localeCompare(b.mcName);
    });

    detailedSessions.forEach(s => {
      sheet2Data.push([
        s.date,
        s.startTime,
        s.endTime,
        s.durationHours,
        s.mcName,
        s.tierName,
        s.brandName,
        s.roomName,
        s.campaignName,
        s.ownerName,
        s.staffNames,
        s.remark
      ]);
    });

    // Build Excel Workbook (.xlsx)
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    ws1['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 14 },
      { wch: 24 },
      { wch: 24 },
      { wch: 40 },
      { wch: 26 },
      { wch: 30 },
      { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'สรุปภาพรวมราย MC');

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 24 },
      { wch: 24 },
      { wch: 28 },
      { wch: 22 },
      { wch: 32 },
      { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'รายละเอียดคิวไลฟ์ (Sessions)');

    XLSX.writeFile(wb, `mc_analytics_report_${dateRangeLabel}_${formattedDate}.xlsx`);
  };

  // Export Overview Dashboard Report to Excel (.xlsx)
  const handleExportOverviewExcel = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let dateRangeLabel = 'ข้อมูลทั้งหมด';
    if (dateRange === 'month') dateRangeLabel = 'ย้อนหลัง_30_วัน';
    else if (dateRange === 'week') dateRangeLabel = 'ย้อนหลัง_7_วัน';
    else if (dateRange === 'custom') dateRangeLabel = `${customStartDate || 'start'}_ถึง_${customEndDate || 'end'}`;

    // --- Sheet 1: สรุป KPI และภาพรวม (Overview KPIs) ---
    const sheet1Data: any[][] = [
      ['หัวข้อตัวชี้วัด (KPI Metrics)', 'ค่าสถิติ (Value)'],
      ['ช่วงเวลาที่เลือก', dateRangeLabel],
      ['ชั่วโมงขึ้นไลฟ์สดรวม (Active Hours)', `${kpis.hours.toFixed(1)} ชม.`],
      ['จำนวนคิวจองที่ยืนยัน (Confirmed)', `${kpis.active} คิว`],
      ['จำนวนคิวจองที่ยกเลิก (Cancelled)', `${kpis.cancelled} คิว`],
      ['จำนวนแบรนด์ที่ Active', `${kpis.brandsCount} แบรนด์`],
      ['อัตราความสำเร็จของคิว (Success Rate)', `${kpis.total > 0 ? ((kpis.active / kpis.total) * 100).toFixed(1) : 0}%`],
      ['', ''],
      ['สรุป 5 อันดับแบรนด์ชั่วโมงสูงสุด (Top 5 Brands)', 'ชั่วโมงรวม (ชม.)', 'จำนวนคิว (ครั้ง)'],
      ...analyticsInsights.sortedBrands.slice(0, 5).map(b => [b.name, Number(b.hours.toFixed(1)), b.count]),
      ['', '', ''],
      ['สรุปการใช้งานห้องสตูดิโอ (Room Utilization)', 'ชั่วโมงรวม (ชม.)', 'จำนวนคิว (ครั้ง)'],
      ...analyticsInsights.sortedRooms.map(r => [r.name, Number(r.hours.toFixed(1)), r.count])
    ];

    // --- Sheet 2: รายการคิวจองทั้งหมดตามตัวกรอง (Filtered Bookings) ---
    const sheet2Data: any[][] = [
      [
        'วันที่',
        'เวลาเริ่มต้น',
        'เวลาสิ้นสุด',
        'ระยะเวลา (ชม.)',
        'สถานะ (Status)',
        'ห้องสตูดิโอ',
        'แบรนด์สินค้า',
        'ชื่อแคมเปญ',
        'รายชื่อ MC',
        'ผู้สร้างคิว (Owner)',
        'ผู้ดูแลห้องไลฟ์ (Live Support Staff)',
        'บรีฟ / รายละเอียด'
      ]
    ];

    filteredBookings.forEach(b => {
      const startM = parseTimeToMinutes(b.startTime);
      const endM = parseTimeToMinutes(b.endTime);
      const durationHours = endM > startM ? Number(((endM - startM) / 60).toFixed(1)) : 0;

      const mcNames = (() => {
        if (!b.mcId) return '-';
        const ids = b.mcId.split(',').map(x => x.trim()).filter(Boolean);
        const resolved = ids.map(id => mcList.find(m => m.id === id)?.name).filter(Boolean);
        return resolved.length > 0 ? resolved.join(', ') : b.mcId;
      })();

      let staffNames = '-';
      if (b.lsArtworkLayout) {
        try {
          const meta = typeof b.lsArtworkLayout === 'string' ? JSON.parse(b.lsArtworkLayout) : b.lsArtworkLayout;
          if (meta.liveSupportStaff && Array.isArray(meta.liveSupportStaff) && meta.liveSupportStaff.length > 0) {
            staffNames = meta.liveSupportStaff.map((st: any) => st.name || st.email).join(', ');
          }
        } catch(e){}
      }

      sheet2Data.push([
        b.date,
        b.startTime,
        b.endTime,
        durationHours,
        b.status || 'Confirmed',
        b.roomName,
        b.brandName,
        b.campaignName || '-',
        mcNames,
        b.ownerName || b.ownerEmail || '-',
        staffNames,
        b.remark || b.briefText || '-'
      ]);
    });

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    ws1['!cols'] = [{ wch: 45 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'สรุปภาพรวม KPI');

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
      { wch: 25 },
      { wch: 25 },
      { wch: 22 },
      { wch: 30 },
      { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'รายการคิวจองที่กรอง');

    XLSX.writeFile(wb, `overview_analytics_report_${dateRangeLabel}_${formattedDate}.xlsx`);
  };

  // RENDER DYNAMIC SUB-TABS VIEWS
  if (subTab === 'analytics-staff') {
    return (
      <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200 text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Users className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-400" />
              รายงานประสิทธิภาพการปฏิบัติงานของ Staff ผู้ดูแล
            </h2>
            <p className="text-xs text-slate-400 mt-1">วิเคราะห์ภาระงาน (Workload) ชั่วโมงดูแลสะสม และประเมินความสุ่มเสี่ยงเกิดความเหนื่อยล้าสะสม (Overload)</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={dateRange}
              onChange={(e) => {
                const val = e.target.value as any;
                setDateRange(val);
                if (val === 'custom') {
                  const today = new Date();
                  setCustomStartDate(today.toISOString().split('T')[0]);
                  setCustomEndDate(today.toISOString().split('T')[0]);
                }
              }}
              className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 focus:outline-none cursor-pointer shadow-xs"
            >
              <option value="all">ข้อมูลทั้งหมด (All History)</option>
              <option value="month">ย้อนหลัง 30 วัน (Last 30 Days)</option>
              <option value="week">ย้อนหลัง 7 วัน (Last 7 Days)</option>
              <option value="custom">กำหนดช่วงเวลาเอง...</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs animate-in fade-in duration-150">
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)} 
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none" 
                />
                <span className="text-slate-400 font-bold text-xs">ถึง</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)} 
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none" 
                />
              </div>
            )}

            <button
              onClick={handleExportStaffExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* Dynamic Filters Control Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">แผงควบคุมและตัวกรองข้อมูลละเอียด (Advanced Filters)</h3>
            <button 
              onClick={() => {
                setSelectedStaffEmails([]);
                setMinHours('');
                setMaxHours('');
                setMinLives('');
                setMaxLives('');
              }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all cursor-pointer"
            >
              ล้างตัวกรอง (Clear Filters)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Custom Multi-select Staff Selector */}
            <div className="relative flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                <span>1. รายชื่อ Staff (เลือกได้มากกว่า 1):</span>
                {selectedStaffEmails.length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedStaffEmails.length}/{allUsersAdmin.length}
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                className={`w-full text-xs font-semibold border ${
                  selectedStaffEmails.length > 0 ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 dark:border-slate-800'
                } bg-white dark:bg-slate-950 px-3 py-2 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left`}
              >
                <span className="truncate text-slate-800 dark:text-slate-200">
                  {selectedStaffEmails.length === 0
                    ? `ทั้งหมด (${allUsersAdmin.length} คน)`
                    : selectedStaffEmails.length === 1
                    ? allUsersAdmin.find(u => u.email.toLowerCase() === selectedStaffEmails[0]?.toLowerCase())?.name || selectedStaffEmails[0]
                    : `เลือกแล้ว (${selectedStaffEmails.length} คน)`}
                </span>
                {isStaffDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              {/* Staff Multi-select Dropdown Popover */}
              {isStaffDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsStaffDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                    {/* Search inside dropdown */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ Staff..."
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                      </div>
                    </div>

                    {/* Select All */}
                    <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                      <div
                        onClick={() => {
                          const isAll = selectedStaffEmails.length === allUsersAdmin.length && allUsersAdmin.length > 0;
                          if (isAll) {
                            setSelectedStaffEmails([]);
                          } else {
                            setSelectedStaffEmails(allUsersAdmin.map(u => u.email.toLowerCase()));
                          }
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedStaffEmails.length === allUsersAdmin.length && allUsersAdmin.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedStaffEmails.length === allUsersAdmin.length && allUsersAdmin.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>

                    {/* Staff List Checkboxes */}
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {allUsersAdmin
                        .filter(u => 
                          (u.name || '').toLowerCase().includes(staffSearchQuery.toLowerCase().trim()) || 
                          (u.email || '').toLowerCase().includes(staffSearchQuery.toLowerCase().trim())
                        )
                        .map(u => {
                          const isChecked = selectedStaffEmails.includes(u.email.toLowerCase());
                          return (
                            <div
                              key={u.email}
                              onClick={() => {
                                const em = u.email.toLowerCase();
                                if (isChecked) {
                                  setSelectedStaffEmails(selectedStaffEmails.filter(x => x !== em));
                                } else {
                                  setSelectedStaffEmails([...selectedStaffEmails, em]);
                                }
                              }}
                              className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                  {isChecked && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{u.name}</span>
                                  <span className="text-[10px] text-slate-400 font-normal select-none truncate">{u.email}</span>
                                </div>
                              </div>
                              {u.role && (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 ml-1">
                                  {u.role}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 2. Min Hours */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400">ชั่วโมงสะสม ขั้นต่ำ (Min):</span>
              <input 
                type="number" 
                min="0"
                placeholder="ชั่วโมง" 
                value={minHours} 
                onChange={(e) => setMinHours(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-2 rounded-xl focus:outline-none"
              />
            </div>

            {/* 3. Max Hours */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400">ชั่วโมงสะสม สูงสุด (Max):</span>
              <input 
                type="number" 
                min="0"
                placeholder="ชั่วโมง" 
                value={maxHours} 
                onChange={(e) => setMaxHours(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-2 rounded-xl focus:outline-none"
              />
            </div>

            {/* 4. Min Lives */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400">คิวไลฟ์สด ขั้นต่ำ (Min):</span>
              <input 
                type="number" 
                min="0"
                placeholder="คิวงาน" 
                value={minLives} 
                onChange={(e) => setMinLives(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-2 rounded-xl focus:outline-none"
              />
            </div>

            {/* 5. Max Lives */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400">คิวไลฟ์สด สูงสุด (Max):</span>
              <input 
                type="number" 
                min="0"
                placeholder="คิวงาน" 
                value={maxLives} 
                onChange={(e) => setMaxLives(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-2 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Selected Filter Tags */}
          {selectedStaffEmails.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-black text-slate-400 mr-1">Staff ที่เลือก:</span>
              {selectedStaffEmails.map(em => {
                const userObj = allUsersAdmin.find(u => u.email.toLowerCase() === em.toLowerCase());
                return (
                  <span
                    key={em}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800/60"
                  >
                    {userObj?.name || em}
                    <button
                      type="button"
                      onClick={() => setSelectedStaffEmails(selectedStaffEmails.filter(x => x !== em))}
                      className="hover:text-emerald-900 dark:hover:text-emerald-100 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Overload settings control panel */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 px-4 py-3 rounded-2xl w-full">
          <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none text-slate-700 dark:text-slate-200">
            <input 
              type="checkbox" 
              checked={isOverloadEnabled} 
              onChange={(e) => setIsOverloadEnabled(e.target.checked)}
              className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
            />
            เปิดใช้งานการแจ้งเตือนภาระงานเกิน (Overload Alert)
          </label>

          {isOverloadEnabled && (
            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <span className="text-xs text-slate-500">สีแดงเมื่อเกิน:</span>
              <input 
                type="number" 
                min="1" 
                max="1000"
                value={overloadLimit} 
                onChange={(e) => setOverloadLimit(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-20 text-center text-xs font-extrabold border border-slate-300 dark:border-slate-850 bg-white dark:bg-slate-950 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500" 
              />
              <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/20 px-2 py-1 rounded">
                ชม. {
                  dateRange === 'week' ? 'ต่อสัปดาห์' :
                  dateRange === 'month' ? 'ต่อเดือน' :
                  dateRange === 'custom' ? 'ต่อช่วงเวลาที่เลือก' : 'รวมทั้งหมด'
                }
              </span>
            </div>
          )}
        </div>

        {/* Staff Workload Leaderboard & Detailed List */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Workload Ranking List */}
          <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-500" />
                ภาระงาน Staff รายบุคคล (Support Staff Workload)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">ชั่วโมงปฏิบัติงานดูแลไลฟ์สะสม (สีแดงหากเปิดสัญลักษณ์แจ้งเตือนภาระงานเกิน {overloadLimit} ชม.)</p>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 max-h-[480px]">
              {staffAnalyticsData.map((staff, idx) => {
                const isOverloaded = isOverloadEnabled && staff.hours > overloadLimit;
                return (
                  <div key={staff.email} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border ${
                          isOverloaded 
                            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400' 
                            : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/40 dark:text-slate-450'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-extrabold truncate text-slate-900 dark:text-white">{staff.name}</span>
                      </div>
                      <div className={`text-[10px] font-bold ${isOverloaded ? 'text-rose-600 dark:text-rose-400 font-extrabold animate-pulse' : 'text-slate-500'}`}>
                        {staff.hours.toFixed(1)} ชม. ({staff.count} ไลฟ์)
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${(staff.hours / maxStaffHours) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {staffAnalyticsData.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic text-xs">ไม่พบข้อมูลการสแตนด์บายของ Staff ในตารางจอง</div>
              )}
            </div>
          </div>

          {/* Workload detailed analytics reports (Right) */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">ตารางบันทึกการจัดไลฟ์แยกตาม Staff (Staff Sessions Logs)</h3>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-200 dark:border-slate-800 text-slate-450 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3.5">ชื่อ Staff</th>
                    <th className="p-3.5 text-center">คิวไลฟ์ทั้งหมด</th>
                    <th className="p-3.5 text-center">ชั่วโมงไลฟ์สะสม</th>
                    <th className="p-3.5">ประเมินสภาวะงาน (Status)</th>
                    <th className="p-3.5">แคมเปญล่าสุดที่ดูแล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-350">
                  {staffAnalyticsData.map(staff => {
                    const isOverloaded = isOverloadEnabled && staff.hours > overloadLimit;
                    const highLoadThreshold = overloadLimit * 0.6;
                    const lastBooking = staff.bookings[staff.bookings.length - 1];
                    
                    return (
                      <tr key={staff.email} className="hover:bg-slate-50/40 dark:hover:bg-slate-805/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex flex-col">
                            <span className="font-normal text-slate-900 dark:text-white text-xs">{staff.name}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{staff.email}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-normal text-xs">{staff.count} ครั้ง</td>
                        <td className="p-3.5 text-center">
                          <span className={`font-normal text-xs ${isOverloaded ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-150'}`}>{staff.hours.toFixed(1)} ชม.</span>
                        </td>
                        <td className="p-3.5">
                          {isOverloaded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-50 dark:bg-rose-950/20 text-rose-650 dark:text-rose-400 border border-rose-200">
                              🚨 Overloaded (&gt;{overloadLimit}h)
                            </span>
                          ) : (isOverloadEnabled && staff.hours > highLoadThreshold) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400 border border-amber-250">
                              ⚠️ High Load (&gt;{highLoadThreshold.toFixed(0)}h)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border border-emerald-250">
                              ✅ Good Balance
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-[200px] truncate">
                          {lastBooking ? (
                            <div className="flex flex-col">
                              <span className="font-normal truncate text-slate-800 dark:text-slate-200">{lastBooking.brandName}</span>
                              <span className="text-[9px] text-slate-400 font-normal truncate">{formatThaiDate(lastBooking.date)} ({lastBooking.startTime}น.)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[10px]">ไม่มีงานในระบบ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subTab === 'analytics-mc') {
    return (
      <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200 text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Mic className="w-5.5 h-5.5 text-brand-500" />
              รายงานสถิติประสิทธิภาพ MC พิธีกรไลฟ์สดเชิงลึก
            </h2>
            <p className="text-xs text-slate-400 mt-1">วิเคราะห์ตารางงาน MC รายคน จำนวนครั้งการขึ้นจัดรายการ ช่วงเวลาไลฟ์ยอดนิยม และการประเมินการทำงานเชิงลึก</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={dateRange}
              onChange={(e) => {
                const val = e.target.value as any;
                setDateRange(val);
                if (val === 'custom') {
                  const today = new Date();
                  setCustomStartDate(today.toISOString().split('T')[0]);
                  setCustomEndDate(today.toISOString().split('T')[0]);
                }
              }}
              className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 focus:outline-none cursor-pointer shadow-xs"
            >
              <option value="all">ข้อมูลทั้งหมด (All History)</option>
              <option value="month">ย้อนหลัง 30 วัน (Last 30 Days)</option>
              <option value="week">ย้อนหลัง 7 วัน (Last 7 Days)</option>
              <option value="custom">กำหนดช่วงเวลาเอง...</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs animate-in fade-in duration-150">
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)} 
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none" 
                />
                <span className="text-slate-400 font-bold text-xs">ถึง</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)} 
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none" 
                />
              </div>
            )}

            <button
              onClick={handleExportMcExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="ส่งออกรายงานสถิติและตารางคิวไลฟ์ของ MC ตามช่วงเวลาที่เลือก (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Dynamic MC Filters Control Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-500" />
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">แผงควบคุมและตัวกรองข้อมูล MC (Advanced Filters)</h3>
              {(selectedMcIds.length > 0 || selectedMcBrands.length > 0 || mcMinLives !== '' || mcMaxLives !== '' || mcMinHours !== '' || mcMaxHours !== '') && (
                <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-[10px] font-black border border-brand-200/50">
                  กรองอยู่ ({[
                    selectedMcIds.length > 0 ? `MC ${selectedMcIds.length} คน` : null,
                    selectedMcBrands.length > 0 ? `แบรนด์ ${selectedMcBrands.length}` : null,
                    (mcMinLives !== '' || mcMaxLives !== '') ? 'จำนวนไลฟ์' : null,
                    (mcMinHours !== '' || mcMaxHours !== '') ? 'ชั่วโมงสะสม' : null,
                  ].filter(Boolean).join(' • ')})
                </span>
              )}
            </div>
            {(selectedMcIds.length > 0 || selectedMcBrands.length > 0 || mcMinLives !== '' || mcMaxLives !== '' || mcMinHours !== '' || mcMaxHours !== '') && (
              <button 
                onClick={() => {
                  setSelectedMcIds([]);
                  setSelectedMcBrands([]);
                  setMcMinLives('');
                  setMcMaxLives('');
                  setMcMinHours('');
                  setMcMaxHours('');
                  setMcSearchQuery('');
                  setBrandSearchQuery('');
                }}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" /> ล้างตัวกรอง (Clear Filters)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Multi-select MCs */}
            <div className="relative flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>1. รายชื่อ MC (เลือกได้มากกว่า 1)</span>
                {selectedMcIds.length > 0 && (
                  <span className="text-brand-600 dark:text-brand-400 font-bold">{selectedMcIds.length}/{mcList.length}</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsMcDropdownOpen(!isMcDropdownOpen);
                  setIsBrandDropdownOpen(false);
                }}
                className={`w-full text-xs font-semibold border ${
                  selectedMcIds.length > 0 ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-200 dark:border-slate-800'
                } bg-white dark:bg-slate-950 px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left`}
              >
                <span className="truncate text-slate-800 dark:text-slate-200">
                  {selectedMcIds.length === 0
                    ? `ทั้งหมด (${mcList.length} คน)`
                    : selectedMcIds.length === 1
                    ? mcList.find(m => m.id === selectedMcIds[0])?.name || '1 คน'
                    : `เลือกแล้ว (${selectedMcIds.length} คน)`}
                </span>
                {isMcDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              {/* MC Multi-select Dropdown Popover */}
              {isMcDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsMcDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                    {/* Search inside dropdown */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ MC..."
                          value={mcSearchQuery}
                          onChange={(e) => setMcSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                      </div>
                    </div>

                    {/* Select All */}
                    <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                      <div
                        onClick={() => {
                          const isAll = selectedMcIds.length === mcList.length && mcList.length > 0;
                          if (isAll) {
                            setSelectedMcIds([]);
                          } else {
                            setSelectedMcIds(mcList.map(m => m.id));
                          }
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedMcIds.length === mcList.length && mcList.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedMcIds.length === mcList.length && mcList.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>

                    {/* MC List Checkboxes */}
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {mcList
                        .filter(m => m.name.toLowerCase().includes(mcSearchQuery.toLowerCase().trim()))
                        .map(mc => {
                          const isChecked = selectedMcIds.includes(mc.id);
                          const tierObj = mcTiers.find(t => t.id === mc.tierId);
                          return (
                            <div
                              key={mc.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedMcIds(selectedMcIds.filter(id => id !== mc.id));
                                } else {
                                  setSelectedMcIds([...selectedMcIds, mc.id]);
                                }
                              }}
                              className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                  {isChecked && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{mc.name}</span>
                              </div>
                              {tierObj && (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                  {tierObj.name}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 2. Multi-select Brands */}
            <div className="relative flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>2. แบรนด์ (เลือกได้มากกว่า 1)</span>
                {selectedMcBrands.length > 0 && (
                  <span className="text-brand-600 dark:text-brand-400 font-bold">{selectedMcBrands.length}/{brands.length}</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsBrandDropdownOpen(!isBrandDropdownOpen);
                  setIsMcDropdownOpen(false);
                }}
                className={`w-full text-xs font-semibold border ${
                  selectedMcBrands.length > 0 ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-200 dark:border-slate-800'
                } bg-white dark:bg-slate-950 px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left`}
              >
                <span className="truncate text-slate-800 dark:text-slate-200">
                  {selectedMcBrands.length === 0
                    ? `ทั้งหมด (${brands.length} แบรนด์)`
                    : selectedMcBrands.length === 1
                    ? selectedMcBrands[0]
                    : `เลือกแล้ว (${selectedMcBrands.length} แบรนด์)`}
                </span>
                {isBrandDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              {/* Brand Multi-select Dropdown Popover */}
              {isBrandDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsBrandDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                    {/* Search inside dropdown */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อแบรนด์..."
                          value={brandSearchQuery}
                          onChange={(e) => setBrandSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                      </div>
                    </div>

                    {/* Select All */}
                    <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                      <div
                        onClick={() => {
                          const isAll = selectedMcBrands.length === brands.length && brands.length > 0;
                          if (isAll) {
                            setSelectedMcBrands([]);
                          } else {
                            setSelectedMcBrands(brands.map(b => b.name));
                          }
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedMcBrands.length === brands.length && brands.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedMcBrands.length === brands.length && brands.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>

                    {/* Brand List Checkboxes */}
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {brands
                        .filter(b => b.name.toLowerCase().includes(brandSearchQuery.toLowerCase().trim()))
                        .map(brand => {
                          const isChecked = selectedMcBrands.includes(brand.name);
                          return (
                            <div
                              key={brand.id || brand.name}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedMcBrands(selectedMcBrands.filter(b => b !== brand.name));
                                } else {
                                  setSelectedMcBrands([...selectedMcBrands, brand.name]);
                                }
                              }}
                              className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                  {isChecked && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{brand.name}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3. Min/Max Live Rounds */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                3. จำนวนครั้งที่ขึ้นไลฟ์ (รอบ)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="ต่ำสุด (Min)"
                  value={mcMinLives}
                  onChange={(e) => setMcMinLives(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="สูงสุด (Max)"
                  value={mcMaxLives}
                  onChange={(e) => setMcMaxLives(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* 4. Min/Max Accumulated Hours */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                4. เวลาจัดรายการสะสม (ชม.)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="ต่ำสุด (Min ชม.)"
                  value={mcMinHours}
                  onChange={(e) => setMcMinHours(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="สูงสุด (Max ชม.)"
                  value={mcMaxHours}
                  onChange={(e) => setMcMaxHours(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Selected filter tags / pills */}
          {(selectedMcIds.length > 0 || selectedMcBrands.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-black text-slate-400 mr-1">เงื่อนไขที่เลือก:</span>
              {selectedMcIds.map(id => {
                const mc = mcList.find(m => m.id === id);
                if (!mc) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60 text-[11px] font-bold rounded-lg"
                  >
                    🎤 {mc.name}
                    <button
                      type="button"
                      onClick={() => setSelectedMcIds(selectedMcIds.filter(x => x !== id))}
                      className="hover:text-rose-600 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              {selectedMcBrands.map(bName => (
                <span
                  key={bName}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-bold rounded-lg"
                >
                  🏢 {bName}
                  <button
                    type="button"
                    onClick={() => setSelectedMcBrands(selectedMcBrands.filter(x => x !== bName))}
                    className="hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* MC Performance Analytics Table grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Workload MC leaderboard (Left) */}
          <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Star className="w-4 h-4 text-brand-500" />
                ชั่วโมงสะสมการจัดไลฟ์ของ MC (MC Accumulated Hours)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">จัดอันดับพิธีกรที่มีเวลาออนแอร์ออกอากาศสดรวมมากที่สุดในระบบ</p>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 max-h-[480px]">
              {mcAnalyticsData.map((mc, idx) => (
                <div key={mc.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-850 dark:text-slate-450`}>
                        {idx + 1}
                      </span>
                      <span className="font-normal truncate text-slate-900 dark:text-white">{mc.name}</span>
                    </div>
                    <div className="text-[10px] font-normal text-slate-550 dark:text-slate-400">
                      {mc.hours.toFixed(1)} ชม. ({mc.count} คิว)
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(mc.hours / maxMcHours) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {mcAnalyticsData.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic text-xs">ไม่พบข้อมูลการรันคิวของ MC ในระบบ</div>
              )}
            </div>
          </div>

          {/* MC Sessions Log (Right) */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">สถิติและเซสชันการจัดรายการเชิงลึกของ MC</h3>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-200 dark:border-slate-800 text-slate-450 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3.5">ชื่อ MC</th>
                    <th className="p-3.5 text-center">ขึ้นไลฟ์สะสม</th>
                    <th className="p-3.5 text-center">เวลาจัดรายการสะสม</th>
                    <th className="p-3.5">ช่วงเวลาไลฟ์ยอดนิยมประจำตัว</th>
                    <th className="p-3.5">แคมเปญล่าสุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-350">
                  {mcAnalyticsData.map(mc => {
                    const lastBooking = mc.bookings[mc.bookings.length - 1];
                    
                    // Simple logic to find peak hour for this specific MC
                    const hoursCount = Array(24).fill(0);
                    mc.bookings.forEach(b => {
                      const hour = Math.floor(parseTimeToMinutes(b.startTime) / 60);
                      if (hour >= 0 && hour < 24) hoursCount[hour]++;
                    });
                    const peakHour = hoursCount.reduce((maxIdx, val, idx, arr) => val > arr[maxIdx] ? idx : maxIdx, 0);
                    const peakHourVal = hoursCount[peakHour];

                    return (
                      <tr key={mc.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-805/30 transition-colors">
                        <td className="p-3.5 font-normal text-slate-900 dark:text-white text-xs">{mc.name}</td>
                        <td className="p-3.5 text-center font-normal text-xs">{mc.count} ครั้ง</td>
                        <td className="p-3.5 text-center font-normal text-xs text-slate-800 dark:text-slate-150">{mc.hours.toFixed(1)} ชม.</td>
                        <td className="p-3.5">
                          {peakHourVal > 0 ? (
                            <span className="text-[10px] font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-0.5 rounded border border-indigo-200">
                              {String(peakHour).padStart(2, '0')}:00 น. ({peakHourVal} ไลฟ์)
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-[220px] truncate">
                          {lastBooking ? (
                            <div className="flex flex-col">
                              <span className="font-normal truncate text-slate-800 dark:text-slate-200">{lastBooking.brandName}</span>
                              <span className="text-[9px] text-slate-400 font-normal truncate">{formatThaiDate(lastBooking.date)} ({lastBooking.startTime}น.)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[10px]">ไม่มีงานในระบบ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Navigation with Dynamic Date Selectors & Export Excel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4 mb-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            สถิติและการใช้งานห้องไลฟ์สด
          </h2>
          <p className="text-xs text-slate-400 mt-1">วิเคราะห์แนวโน้มชั่วโมงไลฟ์ ช่วงเวลาหนาแน่น และความนิยมสตูดิโอรายแบรนด์</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full sm:w-36"
                placeholder="วันที่เริ่มต้น"
              />
              <span className="text-slate-400 font-bold text-xs">ถึง</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full sm:w-36"
                placeholder="วันที่สิ้นสุด"
              />
            </div>
          )}
          <select
            value={dateRange}
            onChange={(e) => {
              const val = e.target.value as any;
              setDateRange(val);
              if (val === 'custom') {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                setCustomStartDate(todayStr);
                setCustomEndDate(todayStr);
              }
            }}
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full sm:w-52 cursor-pointer"
          >
            <option value="all">ข้อมูลทั้งหมด (All History)</option>
            <option value="month">ย้อนหลัง 30 วัน (Last 30 Days)</option>
            <option value="week">ย้อนหลัง 7 วัน (Last 7 Days)</option>
            <option value="custom">กำหนดช่วงเวลาเอง (Custom Range...)</option>
          </select>

          {/* Export Overview Report to Excel */}
          <button
            type="button"
            onClick={handleExportOverviewExcel}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            title="Export รายงานภาพรวมและรายการคิวจองเป็น Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 1.1 Dynamic Overview Advanced Multi-Select Filters Control Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-500" />
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              ตัวกรองข้อมูลเชิงลึก (Advanced Multi-Filters)
            </h3>
            {isOverviewFiltered && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 rounded-full border border-brand-200 dark:border-brand-800 animate-in zoom-in-95">
                กรอง {overviewSelectedRooms.length + overviewSelectedBrands.length + overviewSelectedMcIds.length + overviewSelectedStaffEmails.length + (overviewStatusFilter !== 'all' ? 1 : 0) + (overviewShiftFilter !== 'all' ? 1 : 0)} รายการ
              </span>
            )}
          </div>
          {isOverviewFiltered && (
            <button
              type="button"
              onClick={handleClearOverviewFilters}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-450 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Multi-select Rooms */}
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              1. ห้องสตูดิโอ
            </label>
            <button
              type="button"
              onClick={() => setIsOverviewRoomOpen(!isOverviewRoomOpen)}
              className="w-full flex items-center justify-between gap-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500 text-left"
            >
              <span className="truncate">
                {overviewSelectedRooms.length === 0
                  ? 'ทุกห้อง (All)'
                  : overviewSelectedRooms.length === 1
                  ? overviewSelectedRooms[0]
                  : `เลือกแล้ว (${overviewSelectedRooms.length})`}
              </span>
              {isOverviewRoomOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {isOverviewRoomOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsOverviewRoomOpen(false)} />
                <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ค้นหาห้อง..."
                        value={overviewRoomSearch}
                        onChange={(e) => setOverviewRoomSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      />
                    </div>
                  </div>

                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div
                      onClick={() => {
                        const isAll = overviewSelectedRooms.length === overviewAvailableRooms.length && overviewAvailableRooms.length > 0;
                        if (isAll) {
                          setOverviewSelectedRooms([]);
                        } else {
                          setOverviewSelectedRooms([...overviewAvailableRooms]);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        overviewSelectedRooms.length === overviewAvailableRooms.length && overviewAvailableRooms.length > 0
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {overviewSelectedRooms.length === overviewAvailableRooms.length && overviewAvailableRooms.length > 0 && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                    </div>
                  </div>

                  <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                    {overviewAvailableRooms
                      .filter(r => r.toLowerCase().includes(overviewRoomSearch.toLowerCase().trim()))
                      .map(rName => {
                        const isChecked = overviewSelectedRooms.includes(rName);
                        return (
                          <div
                            key={rName}
                            onClick={() => {
                              if (isChecked) {
                                setOverviewSelectedRooms(overviewSelectedRooms.filter(r => r !== rName));
                              } else {
                                setOverviewSelectedRooms([...overviewSelectedRooms, rName]);
                              }
                            }}
                            className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{rName}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Multi-select Brands */}
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              2. แบรนด์สินค้า
            </label>
            <button
              type="button"
              onClick={() => setIsOverviewBrandOpen(!isOverviewBrandOpen)}
              className="w-full flex items-center justify-between gap-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500 text-left"
            >
              <span className="truncate">
                {overviewSelectedBrands.length === 0
                  ? 'ทุกแบรนด์ (All)'
                  : overviewSelectedBrands.length === 1
                  ? overviewSelectedBrands[0]
                  : `เลือกแล้ว (${overviewSelectedBrands.length})`}
              </span>
              {isOverviewBrandOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {isOverviewBrandOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsOverviewBrandOpen(false)} />
                <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ค้นหาแบรนด์..."
                        value={overviewBrandSearch}
                        onChange={(e) => setOverviewBrandSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      />
                    </div>
                  </div>

                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div
                      onClick={() => {
                        const isAll = overviewSelectedBrands.length === overviewAvailableBrands.length && overviewAvailableBrands.length > 0;
                        if (isAll) {
                          setOverviewSelectedBrands([]);
                        } else {
                          setOverviewSelectedBrands([...overviewAvailableBrands]);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        overviewSelectedBrands.length === overviewAvailableBrands.length && overviewAvailableBrands.length > 0
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {overviewSelectedBrands.length === overviewAvailableBrands.length && overviewAvailableBrands.length > 0 && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                    </div>
                  </div>

                  <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                    {overviewAvailableBrands
                      .filter(b => b.toLowerCase().includes(overviewBrandSearch.toLowerCase().trim()))
                      .map(bName => {
                        const isChecked = overviewSelectedBrands.includes(bName);
                        return (
                          <div
                            key={bName}
                            onClick={() => {
                              if (isChecked) {
                                setOverviewSelectedBrands(overviewSelectedBrands.filter(b => b !== bName));
                              } else {
                                setOverviewSelectedBrands([...overviewSelectedBrands, bName]);
                              }
                            }}
                            className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{bName}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. Multi-select MC & Tier */}
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              3. พิธีกร / MC
            </label>
            <button
              type="button"
              onClick={() => setIsOverviewMcOpen(!isOverviewMcOpen)}
              className="w-full flex items-center justify-between gap-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500 text-left"
            >
              <span className="truncate">
                {overviewSelectedMcIds.length === 0
                  ? 'ทุกคน (All MCs)'
                  : overviewSelectedMcIds.length === 1
                  ? mcList.find(m => m.id === overviewSelectedMcIds[0])?.name || '1 ท่าน'
                  : `เลือกแล้ว (${overviewSelectedMcIds.length})`}
              </span>
              {isOverviewMcOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {isOverviewMcOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsOverviewMcOpen(false)} />
                <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ค้นหา MC..."
                        value={overviewMcSearch}
                        onChange={(e) => setOverviewMcSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      />
                    </div>
                  </div>

                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div
                      onClick={() => {
                        const isAll = overviewSelectedMcIds.length === mcList.length && mcList.length > 0;
                        if (isAll) {
                          setOverviewSelectedMcIds([]);
                        } else {
                          setOverviewSelectedMcIds(mcList.map(m => m.id));
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        overviewSelectedMcIds.length === mcList.length && mcList.length > 0
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {overviewSelectedMcIds.length === mcList.length && mcList.length > 0 && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                    </div>
                  </div>

                  <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                    {mcList
                      .filter(m => m.name.toLowerCase().includes(overviewMcSearch.toLowerCase().trim()))
                      .map(mc => {
                        const isChecked = overviewSelectedMcIds.includes(mc.id);
                        const tier = mcTiers.find(t => t.id === mc.tierId);
                        return (
                          <div
                            key={mc.id}
                            onClick={() => {
                              if (isChecked) {
                                setOverviewSelectedMcIds(overviewSelectedMcIds.filter(id => id !== mc.id));
                              } else {
                                setOverviewSelectedMcIds([...overviewSelectedMcIds, mc.id]);
                              }
                            }}
                            className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{mc.name}</span>
                            </div>
                            {tier && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                {tier.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 4. Multi-select Live Support Staff */}
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              4. ผู้ดูแลห้องไลฟ์
            </label>
            <button
              type="button"
              onClick={() => setIsOverviewStaffOpen(!isOverviewStaffOpen)}
              className="w-full flex items-center justify-between gap-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500 text-left"
            >
              <span className="truncate">
                {overviewSelectedStaffEmails.length === 0
                  ? 'ทุกคน (All Staff)'
                  : overviewSelectedStaffEmails.length === 1
                  ? overviewAvailableStaff.find(s => s.email.toLowerCase() === overviewSelectedStaffEmails[0]?.toLowerCase())?.name || '1 ท่าน'
                  : `เลือกแล้ว (${overviewSelectedStaffEmails.length})`}
              </span>
              {isOverviewStaffOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {isOverviewStaffOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsOverviewStaffOpen(false)} />
                <div className="absolute top-full left-0 right-0 sm:w-64 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col z-30" style={{ maxHeight: '280px' }}>
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้ดูแล..."
                        value={overviewStaffSearch}
                        onChange={(e) => setOverviewStaffSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      />
                    </div>
                  </div>

                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div
                      onClick={() => {
                        const isAll = overviewSelectedStaffEmails.length === overviewAvailableStaff.length && overviewAvailableStaff.length > 0;
                        if (isAll) {
                          setOverviewSelectedStaffEmails([]);
                        } else {
                          setOverviewSelectedStaffEmails(overviewAvailableStaff.map(s => s.email.toLowerCase()));
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        overviewSelectedStaffEmails.length === overviewAvailableStaff.length && overviewAvailableStaff.length > 0
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {overviewSelectedStaffEmails.length === overviewAvailableStaff.length && overviewAvailableStaff.length > 0 && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                    </div>
                  </div>

                  <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                    {overviewAvailableStaff
                      .filter(s => s.name.toLowerCase().includes(overviewStaffSearch.toLowerCase().trim()) || s.email.toLowerCase().includes(overviewStaffSearch.toLowerCase().trim()))
                      .map(s => {
                        const isChecked = overviewSelectedStaffEmails.includes(s.email.toLowerCase());
                        return (
                          <div
                            key={s.email}
                            onClick={() => {
                              const target = s.email.toLowerCase();
                              if (isChecked) {
                                setOverviewSelectedStaffEmails(overviewSelectedStaffEmails.filter(em => em !== target));
                              } else {
                                setOverviewSelectedStaffEmails([...overviewSelectedStaffEmails, target]);
                              }
                            }}
                            className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs text-slate-700 dark:text-slate-300 select-none truncate font-medium">{s.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal select-none truncate">{s.email}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 5. Shift / Time of day filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              5. ช่วงเวลากะ (Shift)
            </label>
            <select
              value={overviewShiftFilter}
              onChange={(e) => setOverviewShiftFilter(e.target.value as any)}
              className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="all">ทุกช่วงเวลากะ (All)</option>
              <option value="morning">กะเช้า (06:00 - 12:00)</option>
              <option value="afternoon">กะบ่าย (12:00 - 18:00)</option>
              <option value="evening">กะดึก / ข้ามคืน (18:00+)</option>
            </select>
          </div>

          {/* 6. Booking Status filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              6. สถานะคิวจอง
            </label>
            <select
              value={overviewStatusFilter}
              onChange={(e) => setOverviewStatusFilter(e.target.value as any)}
              className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="all">สถานะทั้งหมด (All)</option>
              <option value="Confirmed">ยืนยันแล้ว (Confirmed)</option>
              <option value="Cancelled">ยกเลิกแล้ว (Cancelled)</option>
            </select>
          </div>
        </div>

        {/* Selected Filter Tags / Pills */}
        {isOverviewFiltered && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-black text-slate-400 mr-1">กำลังกรอง:</span>
            {overviewSelectedRooms.map(rName => (
              <span
                key={rName}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/60"
              >
                ห้อง: {rName}
                <button
                  type="button"
                  onClick={() => setOverviewSelectedRooms(overviewSelectedRooms.filter(r => r !== rName))}
                  className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {overviewSelectedBrands.map(bName => (
              <span
                key={bName}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-800/60"
              >
                แบรนด์: {bName}
                <button
                  type="button"
                  onClick={() => setOverviewSelectedBrands(overviewSelectedBrands.filter(b => b !== bName))}
                  className="hover:text-purple-900 dark:hover:text-purple-100 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {overviewSelectedMcIds.map(id => {
              const mc = mcList.find(m => m.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/60"
                >
                  MC: {mc?.name || id}
                  <button
                    type="button"
                    onClick={() => setOverviewSelectedMcIds(overviewSelectedMcIds.filter(i => i !== id))}
                    className="hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {overviewSelectedStaffEmails.map(em => {
              const staffObj = overviewAvailableStaff.find(s => s.email.toLowerCase() === em.toLowerCase());
              return (
                <span
                  key={em}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800/60"
                >
                  ผู้ดูแล: {staffObj?.name || em}
                  <button
                    type="button"
                    onClick={() => setOverviewSelectedStaffEmails(overviewSelectedStaffEmails.filter(i => i !== em))}
                    className="hover:text-emerald-900 dark:hover:text-emerald-100 cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {overviewShiftFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                กะ: {overviewShiftFilter === 'morning' ? 'กะเช้า (06:00-12:00)' : overviewShiftFilter === 'afternoon' ? 'กะบ่าย (12:00-18:00)' : 'กะดึก (18:00+)'}
                <button
                  type="button"
                  onClick={() => setOverviewShiftFilter('all')}
                  className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {overviewStatusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700">
                สถานะ: {overviewStatusFilter === 'Confirmed' ? 'ยืนยันแล้ว' : 'ยกเลิกแล้ว'}
                <button
                  type="button"
                  onClick={() => setOverviewStatusFilter('all')}
                  className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ชั่วโมงไลฟ์รวม (Active Hours)</span>
          <strong className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 flex items-baseline gap-1">
            {kpis.hours.toFixed(1)} <span className="text-xs text-slate-450 dark:text-slate-500">ชม.</span>
          </strong>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">คิวจองที่ยืนยัน (Confirmed)</span>
          <strong className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{kpis.active}</strong>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">คิวจองที่ยกเลิก (Cancelled)</span>
          <strong className="text-2xl font-extrabold text-rose-500 mt-2">{kpis.cancelled}</strong>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">แบรนด์ที่แอคทีฟ (Active Brands)</span>
          <strong className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-2">{kpis.brandsCount}</strong>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">อัตราคิวสำเร็จ (Success Rate)</span>
          <strong className="text-2xl font-extrabold text-indigo-500 mt-2">
            {kpis.total > 0 ? ((kpis.active / kpis.total) * 100).toFixed(0) : 0}%
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 3. Peak Hour Custom visual chart (Left) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-500" />
              ช่วงเวลาที่แบรนด์นิยมไลฟ์สด (Peak Hours)
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">กราฟสรุปจำนวนคิวแยกตามรายชั่วโมงในรอบวัน</p>
          </div>

          <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {peakHoursData.map(d => (
              <div
                key={d.hourLabel}
                className="peak-hour-bar flex-1"
                style={{ height: `${Math.max(d.percent, 3)}%` }}
              >
                <div className="tooltip">
                  <strong>{d.count} คิวจอง</strong>
                  <span className="block text-[8px] opacity-80 mt-0.5">เวลา {d.hourLabel} น.</span>
                </div>
              </div>
            ))}
          </div>

          {/* X axis Labels */}
          <div className="flex justify-between text-[8px] font-bold text-slate-400 px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>

        {/* 4. Day-of-Week heatmap (Right) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-6 overflow-hidden">
          <div>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-500" />
              ความหนาแน่นรายวันและสตูดิโอ (Studio Density Matrix)
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">ตาราง Heatmap สรุปคิวงานจองสะสมแยกตามแต่ละห้องไลฟ์สด</p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[400px] grid" style={{ gridTemplateColumns: `100px repeat(${heatmapData.rooms.length}, 1fr)` }}>
              {/* Heatmap header row */}
              <div className="text-[10px] font-bold text-slate-400 py-2 border-b border-slate-100 dark:border-slate-850">วันในสัปดาห์</div>
              {heatmapData.rooms.map(rName => (
                <div key={rName} className="text-[10px] font-extrabold text-slate-500 text-center py-2 border-b border-slate-100 dark:border-slate-850 truncate" title={rName}>
                  {rName}
                </div>
              ))}

              {/* Matrix cells */}
              {THAI_DAY_NAMES.map((dayName, dayIdx) => (
                <React.Fragment key={dayIdx}>
                  <div className="text-[10px] font-bold text-slate-450 dark:text-slate-400 py-3 border-b border-slate-100 dark:border-slate-850/50 flex items-center">
                    {dayName}
                  </div>
                  {heatmapData.rooms.map(rName => {
                    const val = heatmapData.matrix[dayIdx]?.[rName] || 0;
                    const ratio = val / heatmapData.max;
                    
                    // Intensity color styles
                    let cellBg = 'rgba(239, 246, 255, 0.4)'; // lowest blue
                    if (val > 0) {
                      cellBg = `rgba(59, 130, 246, ${Math.max(ratio * 0.85, 0.15)})`;
                    }
                    
                    const cellColor = val > 0 ? (ratio > 0.5 ? 'text-white' : 'text-slate-900 dark:text-white') : 'text-slate-300 dark:text-slate-700';

                    return (
                      <div
                        key={rName}
                        style={{ backgroundColor: cellBg }}
                        className={`heatmap-cell border border-slate-100 dark:border-slate-850/30 flex items-center justify-center font-extrabold text-[11px] py-3 transition-all ${cellColor}`}
                      >
                        {val}
                        <div className="tooltip">
                          <strong>{val} คิวงานจองสะสม</strong>
                          <span className="block text-[8px] opacity-80 mt-0.5">{dayName} - ห้อง {rName}</span>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. In-Depth Insights Section (Leaderboard and AI Recommendations) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Top 5 Brands Leaderboard */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-brand-500" />
              แบรนด์ขึ้นไลฟ์สูงสุด (Top 5 Active Brands)
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">จัดอันดับแบรนด์ตามชั่วโมงขึ้นไลฟ์สดสะสมในระบบ</p>
          </div>

          <div className="space-y-3.5 flex-1 py-1 overflow-y-auto">
            {analyticsInsights.sortedBrands.slice(0, 5).map((brand, idx) => (
              <div key={brand.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black border ${
                      idx === 0 
                        ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450' 
                        : idx === 1 
                        ? 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400'
                        : 'bg-slate-50/50 text-slate-400 border-slate-100 dark:bg-slate-800/20 dark:text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[120px]">{brand.name}</span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{brand.hours.toFixed(1)}</span> ชม. ({brand.count} คิว)
                  </div>
                </div>
                {/* Progress bar wrapper */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(brand.hours / maxBrandHours) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analyticsInsights.sortedBrands.length === 0 && (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 italic">ไม่มีข้อมูลสถิติแบรนด์ในช่วงเวลาที่เลือก</div>
            )}
          </div>
        </div>

        {/* Studio Room Utilization list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-500" />
              การใช้งานห้องสตูดิโอ (Room Utilization)
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">จัดอันดับสตูดิโอตามจำนวนชั่วโมงและอัตราการจัดไลฟ์</p>
          </div>

          <div className="space-y-3.5 flex-1 py-1 overflow-y-auto">
            {analyticsInsights.sortedRooms.map((room, idx) => (
              <div key={room.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200 font-bold truncate">{room.name}</span>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{room.hours.toFixed(1)}</span> ชม. ({room.count} คิว)
                  </div>
                </div>
                {/* Progress bar wrapper */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(room.hours / maxRoomHours) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analyticsInsights.sortedRooms.length === 0 && (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 italic">ไม่มีข้อมูลสถิติสตูดิโอในช่วงเวลาที่เลือก</div>
            )}
          </div>
        </div>

        {/* AI Recommendations Insight Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
              ข้อเสนอแนะและโอกาสพัฒนา (Smart Analytics Insights)
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">การวิเคราะห์เชิงปฏิบัติเพื่อการบริหารสตูดิโออย่างมีประสิทธิภาพสูงสุด</p>
          </div>

          <div className="flex-1 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {analyticsInsights.recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/50 text-[10px] leading-relaxed text-slate-650 dark:text-slate-350"
                dangerouslySetInnerHTML={{
                  __html: rec.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-brand-600 dark:text-brand-400">$1</strong>')
                }}
              />
            ))}
            {analyticsInsights.recommendations.length === 0 && (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 italic">ไม่มีข้อเสนอแนะข้อมูลในช่วงเวลานี้</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
