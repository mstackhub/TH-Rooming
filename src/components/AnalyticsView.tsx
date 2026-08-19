'use client';

import React, { useState, useMemo } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { parseTimeToMinutes, formatThaiDate } from '@/utils/time';
import { 
  Sparkles,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  ChevronDown,
  Building,
  Users,
  Mic,
  BarChart3,
  ShieldAlert,
  AlertTriangle,
  Award,
  Star,
  List
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
    allUsersAdmin
  } = useApp();

  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Custom Overload settings states
  const [overloadLimit, setOverloadLimit] = useState<number>(40);
  const [isOverloadEnabled, setIsOverloadEnabled] = useState<boolean>(false);

  // Dynamic Staff Filters States
  const [selectedStaffEmail, setSelectedStaffEmail] = useState<string>('');
  const [minHours, setMinHours] = useState<string>('');
  const [maxHours, setMaxHours] = useState<string>('');
  const [minLives, setMinLives] = useState<string>('');
  const [maxLives, setMaxLives] = useState<string>('');
  const [selectDate, setSelectDate] = useState<string>('');

  // Filter bookings list based on timeframe selection
  const filteredBookings = useMemo(() => {
    if (dateRange === 'all') return calendarBookings;
    
    const today = new Date();
    const limit = new Date();
    
    if (dateRange === 'month') {
      limit.setDate(today.getDate() - 30);
      const limitStr = limit.toISOString().split('T')[0];
      return calendarBookings.filter(b => b.date >= limitStr);
    } else if (dateRange === 'week') {
      limit.setDate(today.getDate() - 7);
      const limitStr = limit.toISOString().split('T')[0];
      return calendarBookings.filter(b => b.date >= limitStr);
    } else if (dateRange === 'custom') {
      return calendarBookings.filter(b => {
        if (!customStartDate && !customEndDate) return true;
        if (customStartDate && !customEndDate) return b.date >= customStartDate;
        if (!customStartDate && customEndDate) return b.date <= customEndDate;
        return b.date >= customStartDate && b.date <= customEndDate;
      });
    }
    return calendarBookings;
  }, [calendarBookings, dateRange, customStartDate, customEndDate]);

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

    // Filter by selected staff email
    if (selectedStaffEmail) {
      result = result.filter(s => s.email.toLowerCase() === selectedStaffEmail.toLowerCase());
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
  }, [filteredBookings, allUsersAdmin, selectedStaffEmail, minHours, maxHours, minLives, maxLives, selectDate]);

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

    return Object.values(mcStats).sort((a, b) => b.hours - a.hours);
  }, [filteredBookings, mcList]);

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

  // RENDER DYNAMIC SUB-TABS VIEWS
  if (subTab === 'analytics-staff') {
    return (
      <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-200 text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Users className="w-5.5 h-5.5 text-brand-500" />
              รายงานประสิทธิภาพการปฏิบัติงานของ Staff ผู้ดูแล
            </h2>
            <p className="text-xs text-slate-400 mt-1">วิเคราะห์ภาระงาน (Workload) ชั่วโมงดูแลสะสม และประเมินความสุ่มเสี่ยงเกิดความเหนื่อยล้าสะสม (Overload)</p>
          </div>
          
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
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="all">ข้อมูลทั้งหมด (All History)</option>
            <option value="month">ย้อนหลัง 30 วัน (Last 30 Days)</option>
            <option value="week">ย้อนหลัง 7 วัน (Last 7 Days)</option>
            <option value="custom">กำหนดช่วงเวลาเอง...</option>
          </select>
        </div>

        {/* Dynamic Filters Control Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">แผงควบคุมและตัวกรองข้อมูลละเอียด (Advanced Filters)</h3>
            <button 
              onClick={() => {
                setSelectedStaffEmail('');
                setMinHours('');
                setMaxHours('');
                setMinLives('');
                setMaxLives('');
                setSelectDate('');
              }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all cursor-pointer"
            >
              ล้างตัวกรอง (Clear Filters)
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Staff Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400">รายชื่อ Staff:</span>
              <select 
                value={selectedStaffEmail} 
                onChange={(e) => setSelectedStaffEmail(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-2 rounded-xl focus:outline-none"
              >
                <option value="">ทั้งหมด (All Staff)</option>
                {allUsersAdmin.map(u => (
                  <option key={u.email} value={u.email}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Select Date (Dynamic) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400">เลือกวันที่ทำงาน:</span>
              <input 
                type="date" 
                value={selectDate} 
                onChange={(e) => setSelectDate(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded-xl focus:outline-none"
              />
            </div>

            {/* 3. Min Hours */}
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

            {/* 4. Max Hours */}
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

            {/* 5. Min Lives */}
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

            {/* 6. Max Lives */}
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
        </div>

        {/* Custom date range & Overload settings control panel */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl w-full">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="text-xs font-bold border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg px-2.5 py-1.5 focus:outline-none" />
              <span className="text-slate-400 font-bold text-xs">ถึง</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="text-xs font-bold border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg px-2.5 py-1.5 focus:outline-none" />
            </div>
          )}

          {/* Overload Controls */}
          <div className="flex items-center gap-4 ml-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800 w-full sm:w-auto">
            <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
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
                  className="w-24 text-center text-xs font-extrabold border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500" 
                />
                <span className="text-xs text-slate-505 font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/20 px-2 py-1 rounded">
                  ชม. {
                    dateRange === 'week' ? 'ต่อสัปดาห์' :
                    dateRange === 'month' ? 'ต่อเดือน' :
                    dateRange === 'custom' ? 'ต่อช่วงเวลาที่เลือก' : 'รวมทั้งหมด'
                  }
                </span>
              </div>
            )}
          </div>
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
                        className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-rose-500' : 'bg-brand-500'}`}
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-350">
                  {staffAnalyticsData.map(staff => {
                    const isOverloaded = isOverloadEnabled && staff.hours > overloadLimit;
                    const highLoadThreshold = overloadLimit * 0.6;
                    const lastBooking = staff.bookings[staff.bookings.length - 1];
                    
                    return (
                      <tr key={staff.email} className="hover:bg-slate-50/40 dark:hover:bg-slate-805/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs">{staff.name}</span>
                            <span className="text-[9px] text-slate-400 font-semibold">{staff.email}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-xs">{staff.count} ครั้ง</td>
                        <td className="p-3.5 text-center">
                          <span className={`font-extrabold text-xs ${isOverloaded ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-150'}`}>{staff.hours.toFixed(1)} ชม.</span>
                        </td>
                        <td className="p-3.5">
                          {isOverloaded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-rose-50 dark:bg-rose-950/20 text-rose-650 dark:text-rose-400 border border-rose-200">
                              🚨 Overloaded (&gt;{overloadLimit}h)
                            </span>
                          ) : (isOverloadEnabled && staff.hours > highLoadThreshold) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-50 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400 border border-amber-250">
                              ⚠️ High Load (&gt;{highLoadThreshold.toFixed(0)}h)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border border-emerald-250">
                              ✅ Good Balance
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-[200px] truncate">
                          {lastBooking ? (
                            <div className="flex flex-col">
                              <span className="font-extrabold truncate text-slate-800 dark:text-slate-200">{lastBooking.brandName}</span>
                              <span className="text-[9px] text-slate-400 font-semibold truncate">{formatThaiDate(lastBooking.date)} ({lastBooking.startTime}น.)</span>
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
      <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-200 text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Mic className="w-5.5 h-5.5 text-brand-500" />
              รายงานสถิติประสิทธิภาพ MC พิธีกรไลฟ์สดเชิงลึก
            </h2>
            <p className="text-xs text-slate-400 mt-1">วิเคราะห์ตารางงาน MC รายคน จำนวนครั้งการขึ้นจัดรายการ ช่วงเวลาไลฟ์ยอดนิยม และการประเมินการทำงานเชิงลึก</p>
          </div>
          
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
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="all">ข้อมูลทั้งหมด (All History)</option>
            <option value="month">ย้อนหลัง 30 วัน (Last 30 Days)</option>
            <option value="week">ย้อนหลัง 7 วัน (Last 7 Days)</option>
            <option value="custom">กำหนดช่วงเวลาเอง...</option>
          </select>
        </div>

        {/* Custom date range fields */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 p-3.5 rounded-2xl w-fit">
            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg px-2.5 py-1.5 focus:outline-none" />
            <span className="text-slate-400 font-bold text-xs">ถึง</span>
            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg px-2.5 py-1.5 focus:outline-none" />
          </div>
        )}

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
                      <span className="font-extrabold truncate text-slate-900 dark:text-white">{mc.name}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-550 dark:text-slate-400">
                      {mc.hours.toFixed(1)} ชม. ({mc.count} คิว)
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-350">
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
                        <td className="p-3.5 font-extrabold text-slate-900 dark:text-white text-xs">{mc.name}</td>
                        <td className="p-3.5 text-center font-bold text-xs">{mc.count} ครั้ง</td>
                        <td className="p-3.5 text-center font-extrabold text-xs text-slate-800 dark:text-slate-150">{mc.hours.toFixed(1)} ชม.</td>
                        <td className="p-3.5">
                          {peakHourVal > 0 ? (
                            <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-0.5 rounded border border-indigo-200">
                              🕒 {String(peakHour).padStart(2, '0')}:00 น. ({peakHourVal} ไลฟ์)
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-[220px] truncate">
                          {lastBooking ? (
                            <div className="flex flex-col">
                              <span className="font-extrabold truncate text-slate-800 dark:text-slate-200">{lastBooking.brandName}</span>
                              <span className="text-[9px] text-slate-400 font-semibold truncate">{formatThaiDate(lastBooking.date)} ({lastBooking.startTime}น.)</span>
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
    <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Navigation with Dynamic Date Selectors */}
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
        </div>
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
              <Building className="w-4 h-4 text-brand-500" />
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
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
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
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
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
