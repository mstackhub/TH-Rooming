'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  LineChart, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ChevronDown
} from 'lucide-react';

export default function Navigation() {
  const { currentTab, setCurrentTab, currentUser, logout } = useApp();
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // Auto-expand settings dropdown when active tab is one of settings sub-tabs
  useEffect(() => {
    if (['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].includes(currentTab)) {
      setIsSettingsExpanded(true);
    }
  }, [currentTab]);

  if (!currentUser) return null;

  const allowedTabs = currentUser.permissions?.allowedTabs.split(',') || [];

  const allNavItems = [
    { id: 'scheduler', name: 'ตารางงานรายวัน (Scheduler)', icon: Clock },
    { id: 'calendar', name: 'ปฏิทินห้องไลฟ์ (Calendar)', icon: Calendar },
    { id: 'my-bookings', name: 'ประวัติการจองของฉัน (My Bookings)', icon: UserIcon },
    { id: 'campaign-schedule', name: 'แคมเปญทั้งหมด (Campaigns)', icon: BookOpen },
    { id: 'analytics', name: 'สถิติและการใช้งาน (Analytics)', icon: LineChart },
    { id: 'settings', name: 'ตั้งค่า (Settings)', icon: Settings, adminOnly: true }
  ];

  const visibleItems = allNavItems.filter(item => {
    if (item.id === 'settings') {
      return allowedTabs.some(tab => 
        ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].includes(tab)
      );
    }
    return allowedTabs.includes(item.id);
  });

  return (
    <aside id="app-sidebar" className="w-full lg:w-72 bg-white dark:bg-slate-900/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/85 flex flex-col shrink-0 transition-colors duration-300">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex flex-col select-none">
        <span className="text-base font-black text-slate-900 dark:text-white leading-tight tracking-tight">TH Booking</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase mt-0.5">Live Studio Portal</span>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 p-4 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto gap-1.5 text-slate-700 dark:text-slate-350 select-none">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isSettingsItem = item.id === 'settings';
          const isActive = isSettingsItem 
            ? ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].includes(currentTab)
            : currentTab === item.id;

          return (
            <div key={item.id} className="w-full flex flex-col gap-1 shrink-0">
              <button
                onClick={() => {
                  if (isSettingsItem) {
                    setIsSettingsExpanded(!isSettingsExpanded);
                    // Automatically switch to first allowed settings sub-tab if none are active
                    const currentIsSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].includes(currentTab);
                    if (!currentIsSub) {
                      const firstAllowedSub = ['rooms', 'brands', 'users', 'roles-mgmt', 'audit-log', 'settings'].find(t => allowedTabs.includes(t));
                      if (firstAllowedSub) {
                        setCurrentTab(firstAllowedSub);
                      }
                    }
                  } else {
                    setCurrentTab(item.id);
                  }
                }}
                className={`group flex items-center text-left w-full gap-3 px-4 py-3.5 text-xs lg:text-[13px] font-bold rounded-2xl transition-all cursor-pointer relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-brand-500 to-indigo-600 text-white shadow-lg shadow-brand-500/20' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {/* Active Item Vertical Accent Bar */}
                {isActive && !isSettingsItem && (
                  <div className="absolute left-0 top-1/3 bottom-1/3 w-1.5 bg-white rounded-r-full" />
                )}
                <Icon className={`w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                }`} />
                <span className="flex-1">{item.name}</span>
                {isSettingsItem && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSettingsExpanded ? 'rotate-180' : ''} ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`} />
                )}
              </button>

              {/* Indented Collapsible Settings Sub-menus */}
              {isSettingsItem && isSettingsExpanded && (
                <div className="pl-5 pr-2 py-1 flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 ml-6 mt-1.5 animate-in slide-in-from-top-1 duration-150">
                  {[
                    { id: 'rooms', name: 'ห้องสตูดิโอ' },
                    { id: 'brands', name: 'แบรนด์ลูกค้า' },
                    { id: 'users', name: 'ผู้ใช้งานระบบ' },
                    { id: 'roles-mgmt', name: 'ระดับสิทธิ์การจอง' },
                    { id: 'audit-log', name: 'ประวัติกิจกรรม' },
                    { id: 'settings', name: 'ตั้งค่าระบบการแจ้งเตือน' }
                  ].filter(sub => allowedTabs.includes(sub.id)).map(sub => {
                    const isSubActive = currentTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setCurrentTab(sub.id)}
                        className={`text-left px-3.5 py-2.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all ${
                          isSubActive
                            ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {sub.name}
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
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-3 overflow-hidden select-none">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-650 text-white flex items-center justify-center font-black text-sm shrink-0 uppercase shadow-inner">
              {currentUser.name ? currentUser.name.substring(0, 2) : 'US'}
            </div>
            {/* Active Status Dot */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold truncate leading-tight">{currentUser.name}</span>
            <span className="text-[9px] text-slate-455 dark:text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5">{currentUser.role}</span>
          </div>
        </div>
        <button
          onClick={logout}
          title="ออกจากระบบ"
          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
