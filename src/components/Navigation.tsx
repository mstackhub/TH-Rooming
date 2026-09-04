'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Calendar, 
  CalendarClock,
  BookOpen, 
  LineChart, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ChevronDown,
  FileEdit,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sparkles
} from 'lucide-react';

interface NavigationProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Navigation({ mobileOpen = false, onCloseMobile }: NavigationProps) {
  const { currentTab, setCurrentTab, currentUser, logout, changeRequests } = useApp();
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('th_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('th_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const allowedTabs = currentUser?.permissions?.allowedTabs.split(',') || [];
  const isApprover = !!currentUser?.permissions?.isAdmin || currentUser?.role === 'Master Admin' || allowedTabs.includes('change-requests-edit');
  const myEmail = (currentUser?.email || '').toLowerCase().trim();

  const pendingRequestsCount = (changeRequests || []).filter(r => {
    if (!r || r.status !== 'Pending') return false;
    if (isApprover) return true;
    return (r.requesterEmail || '').toLowerCase().trim() === myEmail;
  }).length;

  // Auto-expand dropdowns when active tab is one of their sub-tabs
  useEffect(() => {
    if (['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(currentTab)) {
      setIsSettingsExpanded(true);
    }
    if (['analytics', 'analytics-staff', 'analytics-mc'].includes(currentTab)) {
      setIsAnalyticsExpanded(true);
    }
  }, [currentTab]);

  if (!currentUser) return null;

  const allNavItems = [
    { id: 'campaign-schedule', name: 'แคมเปญทั้งหมด', icon: BookOpen },
    { id: 'calendar', name: 'ปฏิทินห้องไลฟ์', icon: Calendar },
    { id: 'scheduler', name: 'ตารางงานรายวัน', icon: CalendarClock },
    { id: 'my-bookings', name: 'การจองของฉัน', icon: UserIcon },
    { id: 'change-requests', name: 'จัดการคำขอแก้ไขคิว', icon: FileEdit, badge: pendingRequestsCount },
    { id: 'analytics', name: 'รายงานและสถิติ', icon: LineChart },
    { id: 'settings', name: 'ตั้งค่าระบบ', icon: Settings, adminOnly: true }
  ];

  const visibleItems = allNavItems.filter(item => {
    if (item.id === 'settings') {
      return allowedTabs.some(tab => 
        ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(tab)
      );
    }
    if (item.id === 'analytics') {
      return allowedTabs.includes('analytics');
    }
    return allowedTabs.includes(item.id);
  });

  const handleTabClick = (tabId: string, isSettingsItem: boolean, isAnalyticsItem: boolean, isMobile: boolean) => {
    if (!isMobile && isCollapsed) {
      if (isSettingsItem) {
        const firstAllowedSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].find(t => allowedTabs.includes(t)) || 'rooms';
        setCurrentTab(firstAllowedSub);
      } else if (isAnalyticsItem) {
        setCurrentTab('analytics-staff');
      } else {
        setCurrentTab(tabId);
      }
      return;
    }

    if (isSettingsItem) {
      setIsSettingsExpanded(prev => !prev);
      const currentIsSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(currentTab);
      if (!currentIsSub) {
        const firstAllowedSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].find(t => allowedTabs.includes(t));
        if (firstAllowedSub) {
          setCurrentTab(firstAllowedSub);
        }
      }
    } else if (isAnalyticsItem) {
      setIsAnalyticsExpanded(prev => !prev);
      const currentIsSub = ['analytics-staff', 'analytics-mc'].includes(currentTab);
      if (!currentIsSub) {
        setCurrentTab('analytics-staff');
      }
    } else {
      setCurrentTab(tabId);
      if (isMobile && onCloseMobile) {
        onCloseMobile();
      }
    }
  };

  const handleSubTabClick = (subId: string, isMobile: boolean) => {
    setCurrentTab(subId);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  // Reusable Nav Content builder
  const renderNavContent = (isMobile: boolean = false) => {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Navigation Tabs */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto select-none">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isSettingsItem = item.id === 'settings';
            const isAnalyticsItem = item.id === 'analytics';
            
            const isActive = isSettingsItem 
              ? ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings', 'mc-live'].includes(currentTab)
              : isAnalyticsItem
                ? ['analytics-staff', 'analytics-mc'].includes(currentTab)
                : currentTab === item.id;

            return (
              <div key={item.id} className="w-full flex flex-col gap-1">
                <button
                  onClick={() => handleTabClick(item.id, isSettingsItem, isAnalyticsItem, isMobile)}
                  title={item.name}
                  className={`group flex items-center text-left transition-all cursor-pointer relative ${
                    !isMobile && isCollapsed
                      ? 'w-11 h-11 p-0 justify-center mx-auto rounded-2xl ' + (isActive 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs' 
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white')
                      : 'w-full gap-3 px-3.5 py-3 text-xs lg:text-[13px] rounded-2xl ' + (isActive 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs font-semibold' 
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium')
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                  }`} />

                  {(isMobile || !isCollapsed) && (
                    <>
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white shadow-xs">
                          {item.badge}
                        </span>
                      )}
                      {(isSettingsItem || isAnalyticsItem) && (
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isSettingsItem ? (isSettingsExpanded ? 'rotate-180' : '') : (isAnalyticsExpanded ? 'rotate-180' : '')
                        } ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      )}
                    </>
                  )}

                  {/* Collapsed notification badge indicator */}
                  {!isMobile && isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>

                {/* Indented Collapsible Analytics Sub-menus */}
                {(isMobile || !isCollapsed) && isAnalyticsItem && isAnalyticsExpanded && (
                  <div className="pl-3 pr-2 py-1 flex flex-col gap-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5 mt-1 animate-in slide-in-from-top-1 duration-150">
                    {[
                      { id: 'analytics-staff', name: 'ประสิทธิภาพ Staff' },
                      { id: 'analytics-mc', name: 'ประสิทธิภาพ MC' }
                    ].map(sub => {
                      const isSubActive = currentTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubTabClick(sub.id, isMobile)}
                          className={`text-left px-3 py-2 rounded-xl text-xs cursor-pointer transition-all focus:outline-none ${
                            isSubActive
                              ? 'bg-emerald-50/80 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Indented Collapsible Settings Sub-menus */}
                {(isMobile || !isCollapsed) && isSettingsItem && isSettingsExpanded && (
                  <div className="pl-3 pr-2 py-1 flex flex-col gap-1 border-l-2 border-slate-200 dark:border-slate-800 ml-5 mt-1 animate-in slide-in-from-top-1 duration-150">
                    {[
                      { id: 'rooms', name: 'ห้องสตูดิโอ' },
                      { id: 'brands', name: 'แบรนด์ลูกค้า' },
                      { id: 'mc-live', name: 'การจัดการ MC ไลฟ์สด' },
                      { id: 'users', name: 'ผู้ใช้งานระบบ' },
                      { id: 'roles-mgmt', name: 'ระดับสิทธิ์การจอง' },
                      { id: 'audit-log', name: 'ประวัติกิจกรรม' },
                      { id: 'settings', name: 'ตั้งค่าระบบการแจ้งเตือน' }
                    ].filter(sub => allowedTabs.includes(sub.id)).map(sub => {
                      const isSubActive = currentTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubTabClick(sub.id, isMobile)}
                          className={`text-left px-3 py-2 rounded-xl text-xs cursor-pointer transition-all focus:outline-none flex items-center justify-between ${
                            isSubActive
                              ? 'bg-emerald-50/80 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                          }`}
                        >
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className={`p-3.5 lg:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 flex items-center text-slate-800 dark:text-slate-200 ${
          !isMobile && isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-3'
        }`}>
          <div className={`flex items-center gap-3 overflow-hidden select-none ${!isMobile && isCollapsed ? 'justify-center' : ''}`}>
            <div className="relative shrink-0">
              <div 
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-650 text-white flex items-center justify-center font-black text-sm shrink-0 uppercase shadow-md shadow-indigo-500/20"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.name ? currentUser.name.substring(0, 2) : 'US'}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
            </div>
            {(isMobile || !isCollapsed) && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold truncate leading-tight text-slate-900 dark:text-white">{currentUser.name}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider truncate mt-0.5">{currentUser.role}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={logout}
            title="ออกจากระบบ"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR (Visible on lg >= 1024px) ───────────────────────── */}
      <aside 
        id="app-sidebar" 
        className={`hidden lg:flex ${
          isCollapsed ? 'lg:w-20' : 'lg:w-72'
        } bg-white dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 flex-col shrink-0 transition-all duration-300 z-20 h-screen`}
      >
        {/* Desktop Sidebar Header */}
        <div className={`p-4 lg:p-5 border-b border-slate-100 dark:border-slate-800/80 select-none ${
          isCollapsed ? 'flex flex-col items-center justify-center gap-2' : ''
        }`}>
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate">Tuesday House</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase mt-0.5">Live Studio Portal</span>
              </div>
              <button
                onClick={toggleCollapse}
                title="หุบเมนูด้านข้าง (เหลือเฉพาะไอคอน)"
                className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white dark:bg-slate-900 border border-slate-800 font-black text-xs flex items-center justify-center shadow-md shadow-black/20 tracking-tighter">
                TH
              </div>
              <button
                onClick={toggleCollapse}
                title="ขยายเมนูด้านข้าง"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
              >
                <PanelLeftOpen className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>

        {/* Desktop Nav body */}
        <div className="flex-1 overflow-hidden">
          {renderNavContent(false)}
        </div>
      </aside>

      {/* ── MOBILE & TABLET HAMBURGER DRAWER (Visible when mobileOpen on < 1024px) ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
            onClick={onCloseMobile} 
          />

          {/* Sliding Drawer Container */}
          <div className="relative w-[285px] sm:w-[320px] max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 border-r border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-950 text-white dark:bg-slate-900 border border-slate-800 font-black text-xs flex items-center justify-center shadow-sm">
                  TH
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">Tuesday House</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Live Portal</span>
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="ปิดเมนู"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Nav Content */}
            <div className="flex-1 overflow-hidden">
              {renderNavContent(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
