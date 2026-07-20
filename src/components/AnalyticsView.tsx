'use client';

import React, { useState, useMemo } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { parseTimeToMinutes } from '@/utils/time';
import { 
  Sparkles,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  ChevronDown,
  Building
} from 'lucide-react';

const THAI_DAY_NAMES = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

export default function AnalyticsView() {
  const {
    calendarBookings,
    rooms,
    brands
  } = useApp();

  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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

  // Max values for relative progress bar scaling
  const maxBrandHours = useMemo(() => {
    return Math.max(...analyticsInsights.sortedBrands.map(b => b.hours), 1);
  }, [analyticsInsights.sortedBrands]);

  const maxRoomHours = useMemo(() => {
    return Math.max(...analyticsInsights.sortedRooms.map(r => r.hours), 1);
  }, [analyticsInsights.sortedRooms]);

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
