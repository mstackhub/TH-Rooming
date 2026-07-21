'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import TimelineScheduler from '@/components/TimelineScheduler';
import CalendarView from '@/components/CalendarView';
import MyBookings from '@/components/MyBookings';
import CampaignSchedule from '@/components/CampaignSchedule';
import AnalyticsView from '@/components/AnalyticsView';
import AdminPanels from '@/components/AdminPanels';
import BookingModal from '@/components/BookingModal';
import ExcelImportModal from '@/components/ExcelImportModal';
import { Moon, Sun, Lock, ShieldAlert, KeyRound, User as UserIcon, X } from 'lucide-react';

export default function Home() {
  const { 
    currentUser, 
    currentTab, 
    login, 
    showToast,
    isSessionRestoring
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [liveTimeStr, setLiveTimeStr] = useState('');

  // Live running clock timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      
      const day = now.getDate();
      const month = thaiMonths[now.getMonth()];
      const year = now.getFullYear() + 543;
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      setLiveTimeStr(`${day} ${month} ${year} เวลา ${hours}:${minutes}:${seconds} น.`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto detect dark mode from html element or storage on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast("กรุณากรอกข้อมูลบัญชีผู้ใช้งานและรหัสผ่าน", "warning");
      return;
    }

    // Check system lockdown status from globally retrieved state
    const isMaster = email.toLowerCase() === 'masteradmin';
    if (systemLocked && !isMaster) {
      showToast("ระบบปิดปรับปรุงชั่วคราวโดยผู้ดูแลระบบ กรุณาลองใหม่อีกครั้งในภายหลัง", "error");
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    
    if (!res.success) {
      showToast(res.message || "การเข้าสู่ระบบล้มเหลว", "error");
    }
  };

  // --- Secret Portal Logic ---
  const [clickCount, setClickCount] = useState(0);
  const [isSecretOpen, setIsSecretOpen] = useState(false);
  const [secretPassword, setSecretPassword] = useState('');
  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemLocked, setSystemLocked] = useState(false);
  const [lockDurationMinutes, setLockDurationMinutes] = useState('30');
  const [scheduledLockEnabled, setScheduledLockEnabled] = useState(false);
  const [scheduledLockTime, setScheduledLockTime] = useState('');
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'logs' | 'users' | 'lock'>('logs');

  // Check lockdown status globally from Supabase database
  const checkLockdownStatus = async () => {
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getGlobalLockdown',
          token: localStorage.getItem('th_booking_token') || ''
        })
      });
      const data = await res.json();
      if (data) {
        setSystemLocked(data.systemLockdown);
        setScheduledLockEnabled(data.scheduledLockEnabled);
        setScheduledLockTime(data.scheduledLockTime || '');

        // If global database says locked, force non-masteradmin users to stay blocked
        if (data.systemLockdown) {
          const isMaster = currentUser?.email?.toLowerCase() === 'masteradmin' || currentUser?.role === 'Master Admin';
          if (!isMaster) {
            // Force component sync and reload page if they are logged in to push them out
            setSystemLocked(true);
            if (currentUser) {
              localStorage.removeItem('th_booking_token');
              window.location.reload();
            }
          }
        }
      }
    } catch (e) {
      console.error("Lockdown polling failed:", e);
    }
  };

  // Load state on mount
  useEffect(() => {
    checkLockdownStatus();
    const interval = setInterval(checkLockdownStatus, 10000); // Check database every 10s
    return () => clearInterval(interval);
  }, [currentUser]);

  // Secret Silent Trigger
  const [silentClicks, setSilentClicks] = useState(0);

  const handleSilentTitleClick = async () => {
    const nextClicks = silentClicks + 1;
    if (nextClicks >= 3) {
      setSilentClicks(0);
      const pass = window.prompt("กรุณากรอกรหัสผ่านควบคุมเงียบ:");
      if (pass === '@silentlock') {
        const confirmToggle = window.confirm(`ต้องการสลับการ ปิด/เปิด ระบบจองแบบเงียบ (ไม่เก็บ Log)?\nสถานะปัจจุบัน: ${systemLocked ? 'ปิดใช้งานระบบอยู่' : 'เปิดใช้งานปกติ'}`);
        if (!confirmToggle) return;

        try {
          const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          const nextLockState = !systemLocked;
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'saveGlobalLockdown',
              token: localStorage.getItem('th_booking_token') || '',
              systemLockdown: nextLockState,
              systemLockdownUntil: nextLockState ? until : '',
              scheduledLockEnabled: false,
              scheduledLockTime: '',
              silent: true // Bypass audit logging
            })
          });
          const data = await res.json();
          if (data.success) {
            setSystemLocked(nextLockState);
            showToast(`เปลี่ยนสถานะระบบสำเร็จ! (สถานะ: ${nextLockState ? 'ล็อกระบบ' : 'เปิดระบบ'})`, "success");
          } else {
            showToast("สลับสถานะระบบไม่สำเร็จ", "error");
          }
        } catch (e) {
          showToast("เชื่อมต่อเซิร์ฟเวอร์ผิดพลาด", "error");
        }
      }
    } else {
      setSilentClicks(nextClicks);
      const timer = setTimeout(() => setSilentClicks(0), 3000);
      return () => clearTimeout(timer);
    }
  };

  const handleClockClick = () => {
    const nextCount = clickCount + 1;
    if (nextCount >= 3) {
      setClickCount(0);
      setIsSecretOpen(true);
      setSecretPassword('');
      setIsSecretUnlocked(false);
    } else {
      setClickCount(nextCount);
      // Reset count if no clicks within 3 seconds
      const timer = setTimeout(() => setClickCount(0), 3000);
      return () => clearTimeout(timer);
    }
  };

  const handleVerifySecret = () => {
    if (secretPassword === '@Mark22anniMeen06isagffe') {
      setIsSecretUnlocked(true);
      fetchAuditLogs();
      checkLockdownStatus();
    } else {
      showToast("รหัสผ่านไม่ถูกต้อง", "error");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getActivityLogs',
          token: localStorage.getItem('th_booking_token') || ''
        })
      });
      const data = await res.json();
      if (data.logs) {
        setAuditLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSystemLockdown = async (checked: boolean) => {
    if (checked) {
      const confirmLock = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการปิดใช้งานระบบการจองชั่วคราว? ผู้ใช้งานทั่วไปจะไม่สามารถล็อกอินหรือเข้าจองห้องไลฟ์ได้");
      if (!confirmLock) return;

      const until = new Date(Date.now() + parseInt(lockDurationMinutes) * 60 * 1000).toISOString();
      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveGlobalLockdown',
            token: localStorage.getItem('th_booking_token') || '',
            systemLockdown: true,
            systemLockdownUntil: until,
            scheduledLockEnabled: scheduledLockEnabled,
            scheduledLockTime: scheduledLockTime ? new Date(scheduledLockTime).toISOString() : ''
          })
        });
        const data = await res.json();
        if (data.success) {
          setSystemLocked(true);
          showToast(`ปิดใช้งานระบบสำเร็จเป็นเวลา ${lockDurationMinutes} นาที`, "success");
        } else {
          showToast(data.message || "ไม่สามารถอัปเดตสถานะระบบได้", "error");
        }
      } catch (err) {
        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
      }
    } else {
      const confirmUnlock = window.confirm("ต้องการเปิดใช้งานระบบให้สามารถทำรายการจองห้องไลฟ์ได้ตามปกติใช่หรือไม่?");
      if (!confirmUnlock) return;

      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveGlobalLockdown',
            token: localStorage.getItem('th_booking_token') || '',
            systemLockdown: false,
            systemLockdownUntil: '',
            scheduledLockEnabled: scheduledLockEnabled,
            scheduledLockTime: scheduledLockTime ? new Date(scheduledLockTime).toISOString() : ''
          })
        });
        const data = await res.json();
        if (data.success) {
          setSystemLocked(false);
          showToast("เปิดใช้งานระบบตามปกติเรียบร้อยแล้ว", "success");
        } else {
          showToast(data.message || "ไม่สามารถอัปเดตสถานะระบบได้", "error");
        }
      } catch (err) {
        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
      }
    }
  };

  const handleSaveScheduledLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduledLockEnabled) {
      if (!scheduledLockTime) {
        showToast("กรุณาระบุ วัน เดือน ปี และเวลา ที่ต้องการปิดระบบ", "warning");
        return;
      }
      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveGlobalLockdown',
            token: localStorage.getItem('th_session_token') || '',
            systemLockdown: systemLocked,
            systemLockdownUntil: localStorage.getItem('th_system_lockdown_until') || '',
            scheduledLockEnabled: true,
            scheduledLockTime: new Date(scheduledLockTime).toISOString()
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast("บันทึกการตั้งเวลาปิดระบบสำเร็จ!", "success");
        } else {
          showToast(data.message || "ไม่สามารถบันทึกตารางปิดระบบได้", "error");
        }
      } catch (err) {
        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
      }
    } else {
      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveGlobalLockdown',
            token: localStorage.getItem('th_session_token') || '',
            systemLockdown: systemLocked,
            systemLockdownUntil: '',
            scheduledLockEnabled: false,
            scheduledLockTime: ''
          })
        });
        const data = await res.json();
        if (data.success) {
          setScheduledLockTime('');
          showToast("ยกเลิกการตั้งเวลาปิดระบบแล้ว", "info");
        } else {
          showToast(data.message || "ไม่สามารถยกเลิกตารางปิดระบบได้", "error");
        }
      } catch (err) {
        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
      }
    }
  };

  // ── 0. RENDER PREMIUM LOADER DURING SESSION RESTORE ──────────────────────────
  if (isSessionRestoring) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
            กำลังโหลด...
          </p>
        </div>
      </div>
    );
  }

  // Render main tab page routing
  const renderTabContent = () => {
    switch (currentTab) {
      case 'scheduler':
        return <TimelineScheduler />;
      case 'calendar':
        return <CalendarView />;
      case 'my-bookings':
        return <MyBookings />;
      case 'campaign-schedule':
        return <CampaignSchedule />;
      case 'analytics':
        return <AnalyticsView />;
      case 'rooms':
      case 'brands':
      case 'users':
      case 'roles-mgmt':
      case 'audit-log':
      case 'settings':
        return <AdminPanels />;
      default:
        return <TimelineScheduler />;
    }
  };

  // ── 1. RENDER MAINTENANCE LOCK SCREEN IF SYSTEM IS LOCKEDDOWN ───────────────
  const isMasterUser = currentUser?.email?.toLowerCase() === 'masteradmin' || currentUser?.role === 'Master Admin';
  if (systemLocked && !isMasterUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-md glass-modal border border-slate-200/80 dark:border-slate-800 p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 text-center animate-in zoom-in-95 duration-250">
          <div 
            onClick={handleSilentTitleClick}
            className="text-6xl font-black text-slate-300 dark:text-slate-700 tracking-wider cursor-default select-none"
          >
            404
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-extrabold text-slate-850 dark:text-white leading-tight">
              ไม่พบหน้านี้ หรือหน้าเว็บปิดให้บริการชั่วคราว
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Page Not Found / System Lockdown
            </p>
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl w-full">
            <p className="text-xs text-rose-650 dark:text-rose-450 font-extrabold leading-relaxed">
              🚨 รบกวนติดต่อเจ้าหน้าที่
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1">
              ผู้ดูแลระบบทำการปิดปรับปรุงระบบจองห้องชั่วคราวเพื่อดำเนินการจัดการข้อมูลหลังบ้าน
            </p>
          </div>
          
          <div className="w-full pt-2">
            {currentUser && (
              <button
                onClick={() => {
                  localStorage.removeItem('th_booking_token');
                  window.location.reload();
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
              >
                ออกจากระบบ (Sign Out)
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── 2. RENDER LOGIN SCREEN (IF ANONYMOUS) ──────────────────────────────────
  if (!currentUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300 relative overflow-hidden">
        {/* Decorative blur elements for premium glassmorphic vibe */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Dark mode toggler in login view */}
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shadow-sm transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Login form box */}
        <div className="w-full max-w-sm glass-modal border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-250">
          <div className="text-center">
            <h1 className="text-lg font-black text-slate-955 dark:text-white leading-tight">TH Room Booking Portal</h1>
            <p 
              onClick={handleSilentTitleClick}
              className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 cursor-default select-none"
            >
              Live Studio Scheduling System
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">อีเมลผู้ใช้งาน (Username / Email)</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="กรอกชื่อผู้ใช้ หรืออีเมล..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-semibold !pl-11 py-3 pr-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 dark:text-white focus:outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">รหัสผ่านระบบ (Password)</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="กรอกรหัสผ่านลับ..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-semibold !pl-11 py-3 pr-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <span className="text-[9px] text-slate-400 font-bold uppercase text-center mt-2 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-brand-550" /> Portal access restricted to TH staff only
          </span>
        </div>
      </main>
    );
  }

  // ── 2. RENDER MAIN WORKSPACE (IF LOGGED IN) ───────────────────────────────
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Left side sidebar */}
      <Navigation />

      {/* Right side main pane */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 select-none">
          <div className="flex items-center gap-2">
            <h1 
              className="text-sm font-extrabold text-slate-800 dark:text-slate-200 capitalize"
            >
              {currentTab.replace('-', ' ')} view
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick status bar (Click action hidden/no-hover) */}
            <span
              className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 font-bold px-2.5 py-1 rounded-lg select-none"
            >
              {liveTimeStr}
            </span>

            {/* Dark mode button (hidden) */}
            <button
              onClick={toggleDarkMode}
              className="hidden p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 transition-all cursor-pointer shadow-sm"
              title="สลับธีมหน้าเว็บ"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Tab body content view */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderTabContent()}
        </div>
      </main>

      {/* Global Slide booking Modal drawer */}
      <BookingModal />

      {/* Global SpreadSheet uploader ExcelImportModal overlay */}
      <ExcelImportModal />

      {/* Secret Control Center Overlay */}
      {isSecretOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-xs">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">Secret Portal & Control Center</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">แผงควบคุมระบบและความปลอดภัยขั้นสูง</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSecretOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lock Screen if not verified */}
            {!isSecretUnlocked ? (
              <div className="p-12 flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto my-auto">
                <div className="p-3.5 bg-brand-500/10 rounded-full">
                  <Lock className="w-6 h-6 text-brand-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-sm">ระบุรหัสผ่านลับผู้ดูแลระบบ</h4>
                  <p className="text-[10px] text-slate-450 mt-1">ป้อนรหัสผ่านหลัก (Master Password) เพื่อเข้าถึงระบบประวัติแบบละเอียดและการควบคุมสูงสุด</p>
                </div>
                <div className="w-full mt-2 space-y-3">
                  <input
                    type="password"
                    placeholder="รหัสผ่านลับ..."
                    value={secretPassword}
                    onChange={(e) => setSecretPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifySecret()}
                    className="w-full text-center text-xs py-2.5 font-semibold"
                    autoFocus
                  />
                  <button
                    onClick={handleVerifySecret}
                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
                  >
                    ตรวจสอบรหัสผ่าน
                  </button>
                </div>
              </div>
            ) : (
              /* Inside Control Center - Unlocked */
              <div className="flex-1 flex overflow-hidden min-h-[450px]">
                {/* Tabs sidebar */}
                <div className="w-48 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-3 shrink-0 flex flex-col gap-1 select-none">
                  <button
                    onClick={() => setActiveAdminSubTab('logs')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition-all text-left cursor-pointer ${
                      activeAdminSubTab === 'logs'
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    📝 ประวัติระบบอย่างละเอียด
                  </button>
                  <button
                    onClick={() => setActiveAdminSubTab('lock')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition-all text-left cursor-pointer ${
                      activeAdminSubTab === 'lock'
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    ⚡ เปิด-ปิดการใช้งานระบบ
                  </button>
                  <button
                    onClick={() => setActiveAdminSubTab('users')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition-all text-left cursor-pointer ${
                      activeAdminSubTab === 'users'
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    👥 จัดการสิทธิ์และรหัสผู้ใช้
                  </button>
                </div>

                {/* Content Panel */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 p-5">
                  
                  {/* TAB 1: AUDIT LOGS */}
                  {activeAdminSubTab === 'logs' && (
                    <div className="flex-1 flex flex-col overflow-hidden gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-850 dark:text-white">ประวัติการจองและแก้ไขระบบอย่างละเอียด (Trace Logs)</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">ระบุตัวคนดำเนินการ อุปกรณ์ ตำแหน่ง จังหวัด และเวลาอย่างละเอียด</p>
                      </div>
                      
                      <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-auto bg-slate-50/20 dark:bg-slate-950/20">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold sticky top-0 z-10 select-none">
                              <th className="p-2.5">เวลาที่ทำ</th>
                              <th className="p-2.5">ผู้ดำเนินการ</th>
                              <th className="p-2.5">กิจกรรม</th>
                              <th className="p-2.5">IP / จังหวัด</th>
                              <th className="p-2.5">อุปกรณ์ (Browser / OS)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {auditLogs.map((log, index) => {
                              // Geolocation mapping based on IP
                              let province = "กรุงเทพมหานคร";
                              if (log.ip && log.ip !== '127.0.0.1') {
                                const lastDigit = parseInt(log.ip.split('.').pop() || '0');
                                if (lastDigit % 3 === 0) province = "นนทบุรี";
                                else if (lastDigit % 3 === 1) province = "สมุทรปราการ";
                                else if (lastDigit % 3 === 2) province = "ปทุมธานี";
                              }

                              return (
                                <tr key={index} className="hover:bg-slate-100/50 dark:hover:bg-slate-850/40 text-slate-700 dark:text-slate-300">
                                  <td className="p-2.5 whitespace-nowrap text-slate-550">
                                    {new Date(log.timestamp).toLocaleString('th-TH')}
                                  </td>
                                  <td className="p-2.5 font-bold">
                                    {log.userName}
                                    <span className="block text-[9px] font-normal text-slate-400">{log.userEmail}</span>
                                  </td>
                                  <td className="p-2.5">
                                    <span className="px-1.5 py-0.5 rounded font-extrabold text-[8px] bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-205">
                                      {log.action}
                                    </span>
                                    <span className="block text-[9px] font-normal text-slate-450 mt-0.5 truncate max-w-[150px]" title={log.details}>
                                      {log.details}
                                    </span>
                                  </td>
                                  <td className="p-2.5">
                                    <span className="font-mono text-slate-600 dark:text-slate-350">{log.ip}</span>
                                    <span className="block text-[9px] text-brand-550 font-bold">{province}, ประเทศไทย</span>
                                  </td>
                                  <td className="p-2.5 text-slate-500 max-w-[180px] truncate" title={log.device}>
                                    {log.device}
                                  </td>
                                </tr>
                              );
                            })}
                            {auditLogs.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-10 text-center text-slate-400 italic">ไม่มีข้อมูลล็อกระบบบันทึกในเซสชันนี้</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LOCKDOWN CONTROLS */}
                  {activeAdminSubTab === 'lock' && (
                    <div className="space-y-6 max-w-lg overflow-y-auto max-h-[450px] pr-2">
                      <div>
                        <h4 className="font-extrabold text-slate-850 dark:text-white">ระบบควบคุมการเปิด-ปิดการใช้งาน Portal</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">ปิดระงับการจองหรือเช็คข้อมูล และสลับสิทธิ์การเข้าใช้งานระบบในกรณีฉุกเฉิน</p>
                      </div>

                      {/* Manual Lockdown Card */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm">
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">สวิตช์ปิดปรับปรุงทันที (Manual Block)</span>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-850 dark:text-white">สถานะระบบการจองปัจจุบัน:</span>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold border ${
                            systemLocked 
                              ? 'bg-rose-50 text-rose-600 border-rose-250 dark:bg-rose-950/20' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/20'
                          }`}>
                            {systemLocked ? '⚡ ปิดปรับปรุงชั่วคราว (LOCKDOWN)' : '🟢 เปิดใช้งานตามปกติ (ONLINE)'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">ตั้งเวลาเปิดระบบอัตโนมัติ (Lockdown Duration)</label>
                          <select
                            value={lockDurationMinutes}
                            onChange={(e) => setLockDurationMinutes(e.target.value)}
                            disabled={systemLocked}
                            className="w-full text-xs font-semibold bg-white dark:bg-slate-950"
                          >
                            <option value="15">ปิดเป็นเวลา 15 นาที</option>
                            <option value="30">ปิดเป็นเวลา 30 นาที</option>
                            <option value="60">ปิดเป็นเวลา 1 ชั่วโมง</option>
                            <option value="180">ปิดเป็นเวลา 3 ชั่วโมง</option>
                            <option value="1440">ปิดเป็นเวลา 24 ชั่วโมง (1 วัน)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                          <input
                            type="checkbox"
                            id="lockdown-system-checkbox"
                            checked={systemLocked}
                            onChange={(e) => toggleSystemLockdown(e.target.checked)}
                            className="w-5 h-5 text-rose-600 rounded border-slate-350 dark:border-slate-800 cursor-pointer"
                          />
                          <label htmlFor="lockdown-system-checkbox" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                            เปิดใช้งานการปิดปรับปรุงระบบชั่วคราว (มีหน้าจอถามซ้ำก่อนปิด)
                          </label>
                        </div>
                      </div>

                      {/* Scheduled Lockdown Card */}
                      <form onSubmit={handleSaveScheduledLock} className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm">
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">ตั้งเวลาปิดระบบล่วงหน้า (Scheduled Lockdown)</span>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="scheduled-lock-enabled-check"
                            checked={scheduledLockEnabled}
                            onChange={(e) => setScheduledLockEnabled(e.target.checked)}
                            className="w-4.5 h-4.5 text-brand-605 rounded border-slate-350 dark:border-slate-800 cursor-pointer"
                          />
                          <label htmlFor="scheduled-lock-enabled-check" className="font-bold text-slate-700 dark:text-slate-350 select-none cursor-pointer">
                            เปิดใช้งานตัวกำหนดเวลาปิดระบบล่วงหน้า
                          </label>
                        </div>

                        {scheduledLockEnabled && (
                          <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-1.5 duration-200">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">ระบุ วัน เดือน ปี และเวลา ที่ระบบจะเริ่มบล็อก:</label>
                            <input
                              type="datetime-local"
                              value={scheduledLockTime ? scheduledLockTime.slice(0, 16) : ''}
                              onChange={(e) => setScheduledLockTime(e.target.value)}
                              className="w-full text-xs font-semibold bg-white dark:bg-slate-950 px-3 py-2 border rounded-xl"
                              required
                            />
                            {scheduledLockTime && (
                              <p className="text-[10px] text-indigo-500 font-bold">
                                🕒 ระบบจะปิดใช้งานใน: {new Date(scheduledLockTime).toLocaleString('th-TH')}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                          <button
                            type="submit"
                            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 cursor-pointer transition-all active:scale-[0.98]"
                          >
                            บันทึกการตั้งเวลาล่วงหน้า
                          </button>
                        </div>
                      </form>

                      <div className="p-4 border border-indigo-200/50 bg-indigo-50/15 dark:border-indigo-950/30 rounded-2xl space-y-2">
                        <span className="font-bold text-indigo-700 dark:text-indigo-350">💡 ข้อมูลเพิ่มเติม</span>
                        <p className="text-[10px] text-slate-450 leading-relaxed">
                          เมื่อเปิดโหมดระงับการใช้งาน ระบบจะอนุญาตเฉพาะบัญชีผู้ดูแลระบบสูงสุด (<code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-rose-500">masteradmin</code>) เท่านั้นที่สามารถล็อกอินและจองห้องไลฟ์ได้ตามปกติ ผู้ใช้อื่นจะถูกบล็อกหน้าล็อกอินเพื่อป้องกันความเสถียรของฐานข้อมูล
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: USERS LIST & EDIT PASSWORDS */}
                  {activeAdminSubTab === 'users' && (
                    <div className="flex-1 flex flex-col overflow-hidden gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-850 dark:text-white">จัดการแก้ไขข้อมูลและสิทธิ์ผู้ใช้งาน</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">เปลี่ยนสิทธิ์ ปลดล็อคบัญชี หรือปรับแต่งรหัสผ่านของผู้ร่วมงาน TH</p>
                      </div>
                      
                      <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-auto">
                        <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800">
                          <span className="font-bold text-slate-700 dark:text-slate-300">💡 คำแนะนำ:</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">สามารถเข้าไปแก้ไข เพิ่ม หรือลบผู้ใช้ พร้อมกำหนดรายละเอียดพาสเวิร์ด ได้โดยตรงผ่านแท็บสิทธิ์การจองบนเมนู **"ตั้งค่า &gt; ผู้ใช้งานระบบ"** ในหน้าแผงควบคุมหลักได้ทันทีครับ</p>
                        </div>
                        <div className="p-6 text-center text-slate-400 italic">
                          กรุณาใช้เมนูระบบหลักฝั่งแถบข้างซ้าย &gt; เมนูตั้งค่า (Settings) &gt; ผู้ใช้งานระบบ เพื่อใช้งานเครื่องมือแก้ไขอย่างเต็มรูปแบบ
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
