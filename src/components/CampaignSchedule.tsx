'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp, Booking, AuditLog } from '@/context/AppContext';
import { formatThaiDate, parseTimeToMinutes, getAutoStatus, generateBookingCustomId } from '@/utils/time';
import { CustomSelect } from './CustomSelect';
import { 
  Search, 
  Filter, 
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  Clock,
  User,
  HardDrive,
  Palette,
  Table as TableIcon,
  Link2,
  FileSpreadsheet,
  BookOpen,
  AlertCircle,
  AlertTriangle,
  Check,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Info,
  History,
  Eye,
  UploadCloud
} from 'lucide-react';

export default function CampaignSchedule() {
  const {
    calendarBookings,
    rooms,
    brands,
    currentUser,
    setActiveBookingIdForEdit,
    setActiveBookingCreateData,
    setSelectedDate,
    setHighlightedBookingId,
    setCurrentTab,
    auditLogs,
    mcList,
    allUsersAdmin,
    setIsImportModalOpen
  } = useApp();

  // Filter & Search States - Default to current full month (e.g. กันยายน / September)
  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const currentYearNum = new Date().getFullYear();
  const defaultLastDay = new Date(currentYearNum, currentMonthNum, 0).getDate();
  const defaultStartStr = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}-01`;
  const defaultEndStr = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}-${String(defaultLastDay).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(defaultEndStr);
  const [allDates, setAllDates] = useState(false);
  
  // Upgraded Multi-Select Arrays
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonthNum]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedBookingStatuses, setSelectedBookingStatuses] = useState<string[]>([]);
  const [selectedLiveProgresses, setSelectedLiveProgresses] = useState<string[]>([]);
  
  // New Multi-Select Filters
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedScales, setSelectedScales] = useState<string[]>([]);
  const [vipFilter, setVipFilter] = useState<'all' | 'vip' | 'normal'>('all');

  const [sortVal, setSortVal] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // KPI Filter and Action Required Quick Filter states
  const [kpiFilter, setKpiFilter] = useState<'all' | 'upcoming' | 'live' | 'completed' | 'action_required'>('all');
  const [actionFilter, setActionFilter] = useState<'none' | 'missing_brief' | 'missing_artwork' | 'pending_confirm' | 'starting_soon' | 'conflict'>('none');

  // Selected row highlighting
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Dropdown open control states
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isProgressDropdownOpen, setIsProgressDropdownOpen] = useState(false);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  const [isScaleDropdownOpen, setIsScaleDropdownOpen] = useState(false);

  // Dropdown search values
  const [monthSearchQuery, setMonthSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [progressSearchQuery, setProgressSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [scaleSearchQuery, setScaleSearchQuery] = useState('');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // References for click-outside hooks
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const roomDropdownRef = useRef<HTMLDivElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const ownerDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const progressDropdownRef = useRef<HTMLDivElement>(null);
  const staffDropdownRef = useRef<HTMLDivElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);
  const scaleDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Initialize dates to current full month
  useEffect(() => {
    const today = new Date();
    const localYear = today.getFullYear();
    const localMonth = today.getMonth() + 1;
    const lastDay = new Date(localYear, localMonth, 0).getDate();
    const monthStr = String(localMonth).padStart(2, '0');
    setStartDate(`${localYear}-${monthStr}-01`);
    setEndDate(`${localYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`);
    setSelectedMonths([localMonth]);
  }, []);

  // Click outside listener for all custom dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(target)) setIsMonthDropdownOpen(false);
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(target)) setIsRoomDropdownOpen(false);
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(target)) setIsBrandDropdownOpen(false);
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(target)) setIsOwnerDropdownOpen(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) setIsStatusDropdownOpen(false);
      if (progressDropdownRef.current && !progressDropdownRef.current.contains(target)) setIsProgressDropdownOpen(false);
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(target)) setIsStaffDropdownOpen(false);
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(target)) setIsChannelDropdownOpen(false);
      if (scaleDropdownRef.current && !scaleDropdownRef.current.contains(target)) setIsScaleDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Reset page to 1 on filters change
  useEffect(() => {
    setPage(1);
  }, [
    startDate, endDate, allDates, selectedMonths, selectedRooms, selectedBrands, 
    selectedOwners, selectedBookingStatuses, selectedLiveProgresses, sortVal, 
    searchQuery, kpiFilter, actionFilter, selectedStaffs, selectedChannels, selectedScales, vipFilter
  ]);

  // Automatically update start and end dates when month filters change
  useEffect(() => {
    if (selectedMonths.length > 0) {
      const currentYear = new Date().getFullYear();
      
      // Find the min and max month value selected
      const minMonth = Math.min(...selectedMonths);
      const maxMonth = Math.max(...selectedMonths);
      
      // Start date: 1st of the minMonth
      const startMonthStr = String(minMonth).padStart(2, '0');
      const calculatedStartDate = `${currentYear}-${startMonthStr}-01`;
      
      // End date: last day of the maxMonth
      // Creating date with next month 0 day returns the last day of the target month
      const lastDay = new Date(currentYear, maxMonth, 0).getDate();
      const endMonthStr = String(maxMonth).padStart(2, '0');
      const calculatedEndDate = `${currentYear}-${endMonthStr}-${String(lastDay).padStart(2, '0')}`;
      
      setStartDate(calculatedStartDate);
      setEndDate(calculatedEndDate);
    }
  }, [selectedMonths]);

  // Determine user permission context
  const isAdmin = currentUser?.permissions?.isAdmin || currentUser?.role === 'Master Admin';

  // 1. Filter Bookings by owner visibility (Everyone sees all bookings now)
  const visibleBookings = useMemo(() => {
    return calendarBookings;
  }, [calendarBookings]);

  // 2. Parse and build metadata helpers
  const parseArtworkMetadata = (b: Booking) => {
    let briefStatus = 'Not Added';
    let artworkStatus = 'Not Added';
    let artworkLink = '';
    let artworks = [] as any[];
    let lastUpdated = b.createdAt || '';
    let lastUpdatedBy = b.ownerName || '';
    let customId = '';

    if (b.lsArtworkLayout) {
      try {
        const parsed = JSON.parse(b.lsArtworkLayout);
        if (Array.isArray(parsed)) {
          artworks = parsed;
          briefStatus = b.briefLink ? 'Submitted' : 'Not Added';
          artworkStatus = parsed.length > 0 ? 'Submitted' : 'Not Added';
          artworkLink = parsed[0]?.url || '';
        } else if (parsed && typeof parsed === 'object') {
          artworks = parsed.artworks || [];
          briefStatus = parsed.briefStatus || (b.briefLink ? 'Submitted' : 'Not Added');
          artworkStatus = parsed.artworkStatus || (artworks.length > 0 ? 'Submitted' : 'Not Added');
          artworkLink = artworks[0]?.url || '';
          lastUpdated = parsed.lastUpdated || lastUpdated;
          lastUpdatedBy = parsed.lastUpdatedBy || lastUpdatedBy;
          customId = parsed.customId || '';
        }
      } catch (e) {
        briefStatus = b.briefLink ? 'Submitted' : 'Not Added';
        artworkLink = b.lsArtworkLayout.startsWith('http') ? b.lsArtworkLayout : '';
        artworkStatus = artworkLink ? 'Submitted' : 'Not Added';
        if (artworkLink) {
          artworks = [{ type: 'Link', url: artworkLink }];
        }
      }
    } else {
      briefStatus = b.briefLink ? 'Submitted' : 'Not Added';
    }

    if (b.briefLink && briefStatus === 'Not Added') {
      briefStatus = 'Submitted';
    }
    if (artworkLink && artworkStatus === 'Not Added') {
      artworkStatus = 'Submitted';
    }

    const displayCustomId = generateBookingCustomId(b, calendarBookings);

    return {
      briefStatus,
      artworkStatus,
      artworkLink,
      artworks,
      lastUpdated,
      lastUpdatedBy,
      customId: displayCustomId
    };
  };

  // Time elapsed formatter helper
  const formatTimeElapsed = (timestampStr: string) => {
    if (!timestampStr) return '';
    const date = new Date(timestampStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'อัปเดตเมื่อครู่นี้';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `อัปเดต ${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `อัปเดต ${hours} ชั่วโมงที่แล้ว`;
    const days = Math.floor(hours / 24);
    return `อัปเดต ${days} วันที่แล้ว`;
  };

  // 3. Find booking conflicts
  const bookingConflicts = useMemo(() => {
    const conflicts = new Set<string>();
    const active = calendarBookings.filter(b => b.status !== 'Cancelled');
    
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      const aStart = parseTimeToMinutes(a.startTime);
      const aEnd = parseTimeToMinutes(a.endTime);
      
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        if (a.roomName === b.roomName && a.date === b.date) {
          const bStart = parseTimeToMinutes(b.startTime);
          const bEnd = parseTimeToMinutes(b.endTime);
          
          if (aStart < bEnd && aEnd > bStart) {
            conflicts.add(a.id);
            conflicts.add(b.id);
          }
        }
      }
    }
    return conflicts;
  }, [calendarBookings]);

  // 4. Calculate issues list for a booking
  const getBookingIssues = (b: Booking, metadata: ReturnType<typeof parseArtworkMetadata>) => {
    const issues: string[] = [];
    
    // Check missing brief
    if (!b.briefLink && !b.briefText) {
      issues.push('ไม่มีลิงค์หรือรายละเอียดบรีฟ');
    }

    // Check missing artwork
    if (!metadata.artworkLink) {
      issues.push('ยังไม่มีลิงค์ Artwork');
    }

    // Check pending confirm
    if ((b.status as string) === 'Pending') {
      issues.push('รอการยืนยันจองห้อง');
    }

    // Check conflict
    if (bookingConflicts.has(b.id)) {
      issues.push('เวลาทับซ้อนกับคิวอื่น');
    }

    // Check starting soon within 24 hours but work not approved
    const today = new Date();
    const bookingTime = new Date(`${b.date}T${b.startTime}`);
    const timeDiffHours = (bookingTime.getTime() - today.getTime()) / (1000 * 60 * 60);
    const isStartingSoon = timeDiffHours > 0 && timeDiffHours <= 24;
    const isMissingWork = (!b.briefLink && !b.briefText) || !metadata.artworkLink;

    if (isStartingSoon && isMissingWork) {
      issues.push('ใกล้ไลฟ์สดแต่งานบรีฟ/อาร์ตเวิร์กไม่ครบ');
    }

    return {
      issues,
      isStartingSoon,
      isMissingWork,
      isUrgent: isStartingSoon && isMissingWork,
      timeDiffHours
    };
  };

  // 5. Calculate live progress status dynamically
  const getLiveProgressStatus = (b: Booking, isMissingWork: boolean): 'Upcoming' | 'Starting Soon' | 'Live Now' | 'Completed' | 'Cancelled' => {
    if (b.status === 'Cancelled') return 'Cancelled';

    const today = new Date();
    const localYear = today.getFullYear();
    const localMonth = String(today.getMonth() + 1).padStart(2, '0');
    const localDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;
    const currentTotalMins = today.getHours() * 60 + today.getMinutes();

    if (b.status === 'Completed' || b.date < todayStr) return 'Completed';

    const startMins = parseTimeToMinutes(b.startTime);
    const endMins = parseTimeToMinutes(b.endTime);

    if (b.date === todayStr) {
      if (currentTotalMins >= startMins && currentTotalMins < endMins) {
        return 'Live Now';
      }
      if (currentTotalMins >= endMins) {
        return 'Completed';
      }
    }

    const bookingTime = new Date(`${b.date}T${b.startTime}`);
    const timeDiffHours = (bookingTime.getTime() - today.getTime()) / (1000 * 60 * 60);

    if (timeDiffHours <= 0) {
      return 'Completed';
    }

    // Starting Soon: เหลือไม่เกิน 1 ชม. ก่อนเริ่มไลฟ์
    if (timeDiffHours <= 1) {
      return 'Starting Soon';
    }

    // Upcoming: ภายใน 24 ชม. แต่เหลือมากกว่า 1 ชม. (รวมถึงกรณีจองในอนาคตอื่นๆ ด้วย)
    return 'Upcoming';
  };

  // 6. Base Date filters (including Month Filter)
  const bookingsInDateRange = useMemo(() => {
    return visibleBookings.filter(b => {
      // 1. Month filter check (If selectedMonths has items, check the month of b.date)
      if (selectedMonths.length > 0) {
        if (!b.date) return false;
        const parts = b.date.split('-');
        const bookingMonth = parts.length >= 2 ? parseInt(parts[1], 10) : new Date(b.date).getMonth() + 1;
        if (!selectedMonths.includes(bookingMonth)) return false;
      }

      if (allDates) return true;
      if (!startDate || !endDate) return true;
      return b.date >= startDate && b.date <= endDate;
    });
  }, [visibleBookings, startDate, endDate, allDates, selectedMonths]);

  // Extract lists dynamically for dropdowns
  const activeRoomsList = useMemo(() => {
    return rooms.length > 0 
      ? rooms.map(r => r.name)
      : [...new Set(bookingsInDateRange.map(b => b.roomName))].sort();
  }, [rooms, bookingsInDateRange]);

  const activeBrandsList = useMemo(() => {
    return [...new Set(bookingsInDateRange.map(b => b.brandName))].sort();
  }, [bookingsInDateRange]);

  const activeOwnersList = useMemo(() => {
    return [...new Set(bookingsInDateRange.map(b => b.ownerName))].sort();
  }, [bookingsInDateRange]);

  // 7. Calculate overall stats for KPIs
  const kpiStats = useMemo(() => {
    let total = 0;
    let upcoming = 0;
    let live = 0;
    let completed = 0;
    let actionRequired = 0;

    bookingsInDateRange.forEach(b => {
      if (b.status === 'Cancelled') return;
      total++;

      const meta = parseArtworkMetadata(b);
      const { isMissingWork, issues } = getBookingIssues(b, meta);
      const progress = getLiveProgressStatus(b, isMissingWork);

      if (issues.length > 0) {
        actionRequired++;
      }

      if (progress === 'Live Now') {
        live++;
      } else if (progress === 'Completed') {
        completed++;
      } else {
        upcoming++;
      }
    });

    return { total, upcoming, live, completed, actionRequired };
  }, [bookingsInDateRange, bookingConflicts]);

  // 8. Calculate Action Required counts
  const actionRequiredCounts = useMemo(() => {
    let missingBrief = 0;
    let missingArtwork = 0;
    let pendingConfirm = 0;
    let startingSoon = 0;
    let conflict = 0;

    bookingsInDateRange.forEach(b => {
      if (b.status === 'Cancelled') return;
      const meta = parseArtworkMetadata(b);
      const { isMissingWork } = getBookingIssues(b, meta);

      if (!b.briefLink && !b.briefText) {
        missingBrief++;
      }
      if (!meta.artworkLink) {
        missingArtwork++;
      }
      if ((b.status as string) === 'Pending') {
        pendingConfirm++;
      }
      
      const today = new Date();
      const bookingTime = new Date(`${b.date}T${b.startTime}`);
      const timeDiffHours = (bookingTime.getTime() - today.getTime()) / (1000 * 60 * 60);
      const isStartingSoon = timeDiffHours > 0 && timeDiffHours <= 24;

      if (isStartingSoon && isMissingWork) {
        startingSoon++;
      }
      if (bookingConflicts.has(b.id)) {
        conflict++;
      }
    });

    return { missingBrief, missingArtwork, pendingConfirm, startingSoon, conflict };
  }, [bookingsInDateRange, bookingConflicts]);

  // 9. Filtering logic
  const filteredBookings = useMemo(() => {
    return bookingsInDateRange.filter(b => {
      const meta = parseArtworkMetadata(b);
      const { isMissingWork, issues, isStartingSoon } = getBookingIssues(b, meta);
      const progressStatus = getLiveProgressStatus(b, isMissingWork);

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          b.campaignName.toLowerCase().includes(query) ||
          b.brandName.toLowerCase().includes(query) ||
          b.ownerName.toLowerCase().includes(query) ||
          b.roomName.toLowerCase().includes(query) ||
          b.briefText.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Room filter (multi-select)
      if (selectedRooms.length > 0 && !selectedRooms.includes(b.roomName)) return false;

      // Brand filter (multi-select)
      if (selectedBrands.length > 0 && !selectedBrands.includes(b.brandName)) return false;

      // Owner filter (multi-select)
      if (selectedOwners.length > 0 && !selectedOwners.includes(b.ownerName)) return false;

      // Booking status filter (multi-select)
      if (selectedBookingStatuses.length > 0 && !selectedBookingStatuses.includes(getAutoStatus(b))) return false;

      // Live progress filter (multi-select)
      if (selectedLiveProgresses.length > 0 && !selectedLiveProgresses.includes(progressStatus)) return false;

      // KPI Card selection filters
      if (kpiFilter !== 'all') {
        if (kpiFilter === 'upcoming' && progressStatus !== 'Upcoming' && progressStatus !== 'Starting Soon') return false;
        if (kpiFilter === 'live' && progressStatus !== 'Live Now') return false;
        if (kpiFilter === 'completed' && progressStatus !== 'Completed') return false;
        if (kpiFilter === 'action_required' && issues.length === 0) return false;
      }

      // Action Required Quick Card filter
      if (actionFilter !== 'none') {
        if (actionFilter === 'missing_brief' && (b.briefLink || b.briefText)) return false;
        if (actionFilter === 'missing_artwork' && meta.artworkLink) return false;
        if (actionFilter === 'pending_confirm' && (b.status as string) !== 'Pending') return false;
        if (actionFilter === 'starting_soon' && !(isStartingSoon && isMissingWork)) return false;
        if (actionFilter === 'conflict' && !bookingConflicts.has(b.id)) return false;
      }

      // VIP Filter
      let isImportant = false;
      let scale = 'Medium Scale';
      let channel = '';
      let staffEmails: string[] = [];
      if (b.lsArtworkLayout) {
        try {
          const parsed = JSON.parse(b.lsArtworkLayout);
          if (parsed && typeof parsed === 'object') {
            isImportant = !!parsed.isImportant;
            scale = parsed.scale || 'Medium Scale';
            channel = (parsed.liveChannel === 'Other' ? (parsed.customLiveChannel || '') : (parsed.liveChannel || '')).trim();
            if (Array.isArray(parsed.staffEmails)) {
              staffEmails = parsed.staffEmails;
            }
          }
        } catch(e){}
      }
      if (staffEmails.length === 0 && b.briefLink && b.briefLink.includes('@')) {
        staffEmails = b.briefLink.split(',').map(x => x.trim()).filter(Boolean);
      }

      if (vipFilter === 'vip' && !isImportant) return false;
      if (vipFilter === 'normal' && isImportant) return false;

      // Scale Filter (multi-select)
      if (selectedScales.length > 0 && !selectedScales.includes(scale)) return false;

      // Channel Filter (multi-select)
      if (selectedChannels.length > 0 && !selectedChannels.includes(channel)) return false;

      // Support Staff Filter (multi-select: matches if any of the selected staffs match any of the booking's staff emails)
      if (selectedStaffs.length > 0) {
        const hasMatchingStaff = selectedStaffs.some(email => staffEmails.some(se => se.toLowerCase() === email.toLowerCase()));
        if (!hasMatchingStaff) return false;
      }

      return true;
    });
  }, [
    bookingsInDateRange, searchQuery, selectedRooms, selectedBrands, selectedOwners,
    selectedBookingStatuses, selectedLiveProgresses, kpiFilter, actionFilter, bookingConflicts,
    selectedStaffs, selectedChannels, selectedScales, vipFilter
  ]);

  // 10. Sorting logic
  const sortedBookings = useMemo(() => {
    const sorted = [...filteredBookings];
    sorted.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortVal.startsWith('date')) {
        valA = `${a.date} ${a.startTime}`;
        valB = `${b.date} ${b.startTime}`;
      } else if (sortVal.startsWith('room')) {
        valA = a.roomName;
        valB = b.roomName;
      } else if (sortVal.startsWith('brand')) {
        valA = a.brandName;
        valB = b.brandName;
      } else if (sortVal.startsWith('owner')) {
        valA = a.ownerName;
        valB = b.ownerName;
      }

      if (sortVal.endsWith('asc')) {
        return valA.localeCompare(valB);
      } else {
        return valB.localeCompare(valA);
      }
    });
    return sorted;
  }, [filteredBookings, sortVal]);

  // 11. Pagination slice
  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedBookings.slice(start, start + pageSize);
  }, [sortedBookings, page, pageSize]);

  const totalPages = Math.ceil(sortedBookings.length / pageSize) || 1;

  // Custom Month dropdown handlers
  const THAI_MONTHS_LIST = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' }
  ];

  const handleMonthCheckboxChange = (monthVal: number, checked: boolean) => {
    setSelectedMonths(prev => {
      return checked ? [...prev, monthVal] : prev.filter(m => m !== monthVal);
    });
  };

  const handleSelectAllMonths = (checked: boolean) => {
    setSelectedMonths(checked ? THAI_MONTHS_LIST.map(m => m.value) : []);
  };

  // Custom Staff dropdown handlers
  const handleStaffCheckboxChange = (email: string, checked: boolean) => {
    setSelectedStaffs(prev => {
      return checked ? [...prev, email] : prev.filter(e => e !== email);
    });
  };

  // Custom Channel dropdown handlers
  const handleChannelCheckboxChange = (chan: string, checked: boolean) => {
    setSelectedChannels(prev => {
      return checked ? [...prev, chan] : prev.filter(c => c !== chan);
    });
  };

  // Custom Scale dropdown handlers
  const handleScaleCheckboxChange = (scale: string, checked: boolean) => {
    setSelectedScales(prev => {
      return checked ? [...prev, scale] : prev.filter(s => s !== scale);
    });
  };

  // Custom Room dropdown handlers
  const handleRoomCheckboxChange = (roomName: string, checked: boolean) => {
    setSelectedRooms(prev => {
      return checked ? [...prev, roomName] : prev.filter(r => r !== roomName);
    });
  };

  const handleSelectAllRooms = (checked: boolean) => {
    setSelectedRooms(checked ? activeRoomsList : []);
  };

  // Custom Brand drop handler
  const handleBrandCheckboxChange = (brandName: string, checked: boolean) => {
    setSelectedBrands(prev => {
      return checked 
        ? [...prev, brandName]
        : prev.filter(b => b !== brandName);
    });
  };

  const handleSelectAllBrands = (checked: boolean) => {
    setSelectedBrands(checked ? activeBrandsList : []);
  };

  // Custom Owner dropdown handlers
  const handleOwnerCheckboxChange = (ownerName: string, checked: boolean) => {
    setSelectedOwners(prev => {
      return checked ? [...prev, ownerName] : prev.filter(o => o !== ownerName);
    });
  };

  const handleSelectAllOwners = (checked: boolean) => {
    setSelectedOwners(checked ? activeOwnersList : []);
  };

  // Custom Status dropdown handlers
  const STATUS_LIST = [
    { value: 'Pending', label: 'Pending (รอการยืนยัน)' },
    { value: 'Confirmed', label: 'Confirmed (ยืนยันแล้ว)' },
    { value: 'Completed', label: 'Completed (เสร็จสิ้น)' }
  ];

  const handleStatusCheckboxChange = (statusVal: string, checked: boolean) => {
    setSelectedBookingStatuses(prev => {
      return checked ? [...prev, statusVal] : prev.filter(s => s !== statusVal);
    });
  };

  const handleSelectAllStatuses = (checked: boolean) => {
    setSelectedBookingStatuses(checked ? STATUS_LIST.map(s => s.value) : []);
  };

  // Custom Live Progress dropdown handlers
  const PROGRESS_LIST = [
    { value: 'Upcoming', label: 'Upcoming (รอวันถัดไป)' },
    { value: 'Starting Soon', label: 'Starting Soon (เริ่มใน 24 ชม.)' },
    { value: 'Live Now', label: '🔴 Live Now (กำลังสด)' },
    { value: 'Completed', label: 'Completed (จบไลฟ์แล้ว)' },
    { value: 'Cancelled', label: 'Cancelled (ยกเลิกแล้ว)' }
  ];

  const handleProgressCheckboxChange = (progressVal: string, checked: boolean) => {
    setSelectedLiveProgresses(prev => {
      return checked ? [...prev, progressVal] : prev.filter(p => p !== progressVal);
    });
  };

  const handleSelectAllProgresses = (checked: boolean) => {
    setSelectedLiveProgresses(checked ? PROGRESS_LIST.map(p => p.value) : []);
  };

  const filteredBrandsForDropdown = useMemo(() => {
    return activeBrandsList.filter(b => 
      b.toLowerCase().includes(brandSearchQuery.toLowerCase())
    );
  }, [activeBrandsList, brandSearchQuery]);

  // Clear all filters action (resets back to current month default)
  const clearAllFilters = () => {
    const today = new Date();
    const localYear = today.getFullYear();
    const localMonth = today.getMonth() + 1;
    const lastDay = new Date(localYear, localMonth, 0).getDate();
    const monthStr = String(localMonth).padStart(2, '0');

    setSelectedMonths([localMonth]);
    setStartDate(`${localYear}-${monthStr}-01`);
    setEndDate(`${localYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`);
    setAllDates(false);
    setSelectedRooms([]);
    setSelectedBrands([]);
    setSelectedOwners([]);
    setSelectedBookingStatuses([]);
    setSelectedLiveProgresses([]);
    setSelectedStaffs([]);
    setSelectedChannels([]);
    setSelectedScales([]);
    setVipFilter('all');
    setSearchQuery('');
    setKpiFilter('all');
    setActionFilter('none');
  };

  // Render Status styling badges
  const getBookingStatusBadge = (status: string) => {
    let classes = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (status === 'Confirmed') classes = 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent';
    if (status === 'Completed') classes = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    if (status === 'Cancelled') classes = 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through';
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${classes}`}>{status}</span>;
  };

  const getLiveProgressBadge = (status: string) => {
    let classes = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (status === 'Live Now') classes = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800 font-extrabold';
    if (status === 'Starting Soon') classes = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-bold';
    if (status === 'Upcoming') classes = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-bold';
    if (status === 'Completed') classes = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-bold';
    if (status === 'Cancelled') classes = 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 line-through';
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${classes}`}>{status}</span>;
  };

  // Activity log mapper for timeline history
  const getLogsForBooking = (b: Booking, logs: AuditLog[]) => {
    return logs.filter(log => {
      if (log.target === b.id) return true;
      if (log.details && log.details.includes(b.id)) return true;
      if (log.action === 'CREATE_BOOKING') {
        const timeStr = `${b.startTime}-${b.endTime}`;
        if (log.target === b.roomName && log.details && log.details.includes(b.date) && log.details.includes(timeStr)) {
          return true;
        }
      }
      return false;
    });
  };

  // Export CSV Handler matching filters
  const handleExportCSV = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Booking ID,Live Date,Day,Start Time,End Time,Room,Brand,Campaign Name,MC Name,Owner,Artwork Link,Booking Status,Last Updated\n";

    sortedBookings.forEach(b => {
      const meta = parseArtworkMetadata(b);
      
      const escape = (val: string) => {
        const cleaned = (val || '').replace(/"/g, '""');
        return cleaned.includes(',') || cleaned.includes('\n') || cleaned.includes('"') ? `"${cleaned}"` : cleaned;
      };

      const dayOfWeek = (() => {
        if (!b.date) return '';
        const d = new Date(b.date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { weekday: 'short' });
      })();

      const mcName = (() => {
        if (!b.mcId) return '';
        const ids = b.mcId.split(',').map(x => x.trim()).filter(Boolean);
        const names = ids.map(id => {
          const matched = mcList.find(m => m.id === id);
          return matched ? matched.name : 'MC ทั่วไป';
        });
        return names.join(', ');
      })();

      const bookingId = meta.customId || b.id || '';

      const columns = [
        bookingId,
        b.date,
        dayOfWeek,
        b.startTime,
        b.endTime,
        b.roomName,
        b.brandName,
        b.campaignName,
        mcName,
        b.ownerName,
        meta.artworkLink || '',
        getAutoStatus(b),
        meta.lastUpdated ? new Date(meta.lastUpdated).toLocaleString('th-TH') : ''
      ];

      csvContent += columns.map(col => escape(col)).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `campaigns_report_${formattedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Detail Modal Trigger helper
  const openBookingDetail = (bookingId: string) => {
    setActiveBookingIdForEdit(bookingId);
  };

  return (
    <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200 text-slate-800 dark:text-slate-200">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5.5 h-5.5 text-brand-500 dark:text-white" />
            แคมเปญทั้งหมด
          </h2>
          <p className="text-xs text-slate-400 mt-1">บริหารความพร้อม จัดเตรียมบรีฟ อาร์ตเวิร์ก และคิวจองสตูดิโอให้ครบถ้วนก่อนการออกอากาศสด</p>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUser?.permissions?.canCreateBooking && (
            <button
              onClick={() => {
                const today = new Date();
                const formatted = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                setActiveBookingCreateData({ date: formatted, roomName: activeRoomsList[0] || '', startTime: '09:00', endTime: '10:00' });
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-emerald-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> จองห้องไลฟ์
            </button>
          )}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> นำเข้าคิวจอง Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. Section 1: Campaign Summary KPIs (Clean Minimalist Monochrome) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI: Total Campaigns */}
        <div 
          onClick={() => {
            setKpiFilter('all');
            setActionFilter('none');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between h-24 ${
            kpiFilter === 'all' && actionFilter === 'none'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">แคมเปญทั้งหมด</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpiStats.total}</span>
          <div className="absolute right-3.5 bottom-3.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        {/* KPI: Upcoming */}
        <div 
          onClick={() => {
            setKpiFilter('upcoming');
            setActionFilter('none');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between h-24 ${
            kpiFilter === 'upcoming'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">เตรียมเริ่มไลฟ์</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpiStats.upcoming}</span>
          <div className="absolute right-3.5 bottom-3.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* KPI: Live Now */}
        <div 
          onClick={() => {
            setKpiFilter('live');
            setActionFilter('none');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between h-24 ${
            kpiFilter === 'live'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">กำลังไลฟ์ตอนนี้</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpiStats.live}</span>
          <div className="absolute right-3.5 bottom-3.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* KPI: Completed */}
        <div 
          onClick={() => {
            setKpiFilter('completed');
            setActionFilter('none');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between h-24 ${
            kpiFilter === 'completed'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">เสร็จสิ้นแล้ว</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpiStats.completed}</span>
          <div className="absolute right-3.5 bottom-3.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        {/* KPI: Action Required */}
        <div 
          onClick={() => {
            setKpiFilter('action_required');
            setActionFilter('none');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between h-24 col-span-2 lg:col-span-1 ${
            kpiFilter === 'action_required'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">ต้องดำเนินการอีก</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{kpiStats.actionRequired}</span>
          <div className="absolute right-3.5 bottom-3.5 p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-amber-500">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Section 2: Action Required Detail Quick Filters (De-cluttered) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="shrink-0">
          <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            สิ่งที่ค้างดำเนินการ (Pending Action Items)
          </h3>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">คลิกการ์ดด่วนเพื่อกรองรายชื่อที่มีปัญหาด้านเอกสารหรืองานกราฟิกที่ต้องรีบเคลียร์</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto flex-1 max-w-2xl">
          {/* Box: Missing Brief */}
          <div
            onClick={() => {
              setActionFilter(actionFilter === 'missing_brief' ? 'none' : 'missing_brief');
              setKpiFilter('all');
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-left cursor-pointer transition-all ${
              actionFilter === 'missing_brief'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <div className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">ขาดข้อมูลบรีฟ</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{actionRequiredCounts.missingBrief} แคมเปญ</div>
          </div>

          {/* Box: Missing Artwork */}
          <div
            onClick={() => {
              setActionFilter(actionFilter === 'missing_artwork' ? 'none' : 'missing_artwork');
              setKpiFilter('all');
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-left cursor-pointer transition-all ${
              actionFilter === 'missing_artwork'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <div className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">ขาด Artwork</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{actionRequiredCounts.missingArtwork} แคมเปญ</div>
          </div>

          {/* Box: Starting Soon */}
          <div
            onClick={() => {
              setActionFilter(actionFilter === 'starting_soon' ? 'none' : 'starting_soon');
              setKpiFilter('all');
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-left cursor-pointer transition-all ${
              actionFilter === 'starting_soon'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <div className="text-[14px] text-slate-600 dark:text-slate-400 font-normal">ไลฟ์ภายใน 24 ชม.</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{actionRequiredCounts.startingSoon} คิวงาน</div>
          </div>
        </div>
      </div>

      {/* 4. Section 3: Filter & Search Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-xs space-y-4">
        
        {/* Row 1: Primary filter & Search */}
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อแคมเปญ แบรนด์ หรือผู้จอง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Advanced toggle button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showAdvancedFilters 
                ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/20 dark:text-brand-350' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> 
            {showAdvancedFilters ? 'ซ่อนตัวกรองขั้นสูง' : 'แสดงตัวกรองขั้นสูง'}
          </button>

          {/* Clear Filters helper */}
          {(selectedMonths.length > 0 || selectedRooms.length > 0 || selectedBrands.length > 0 || 
            selectedOwners.length > 0 || selectedBookingStatuses.length > 0 || selectedLiveProgresses.length > 0 || 
            selectedStaffs.length > 0 || selectedChannels.length > 0 || selectedScales.length > 0 || vipFilter !== 'all' ||
            searchQuery || kpiFilter !== 'all' || actionFilter !== 'none') && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        {/* Row 2: Advanced filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-850 animate-in slide-in-from-top-2 duration-150">
            {/* Start Date */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ช่วงเวลาเริ่มต้น (Start Date)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={allDates}
                className="w-full text-xs"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ช่วงเวลาสิ้นสุด (End Date)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={allDates}
                className="w-full text-xs"
              />
            </div>

            {/* Month selector (multi-select) */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ช่วงเวลาเดือน (Months)</label>
              <div className="relative" ref={monthDropdownRef}>
                <button
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isMonthDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedMonths.length === 0 
                      ? 'ทุกเดือน (All)' 
                      : selectedMonths.length === THAI_MONTHS_LIST.length 
                        ? `เลือกทุกเดือน (${selectedMonths.length})` 
                        : selectedMonths.map(m => THAI_MONTHS_LIST.find(x => x.value === m)?.label).join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isMonthDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาเดือน..."
                          value={monthSearchQuery}
                          onChange={(e) => setMonthSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <div
                        onClick={() => handleSelectAllMonths(!(selectedMonths.length === THAI_MONTHS_LIST.length && THAI_MONTHS_LIST.length > 0))}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedMonths.length === THAI_MONTHS_LIST.length && THAI_MONTHS_LIST.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedMonths.length === THAI_MONTHS_LIST.length && THAI_MONTHS_LIST.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {THAI_MONTHS_LIST.filter(m => m.label.includes(monthSearchQuery)).map(m => {
                        const isChecked = selectedMonths.includes(m.value);
                        return (
                          <div
                            key={m.value}
                            onClick={() => handleMonthCheckboxChange(m.value, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{m.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Room selector */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ห้องสตูดิโอ (Room)</label>
              <div className="relative" ref={roomDropdownRef}>
                <button
                  onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isRoomDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedRooms.length === 0 
                      ? 'ทุกห้อง (All)' 
                      : selectedRooms.length === activeRoomsList.length 
                        ? `เลือกทุกห้อง (${selectedRooms.length})` 
                        : selectedRooms.join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isRoomDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isRoomDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาห้อง..."
                          value={roomSearchQuery}
                          onChange={(e) => setRoomSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <div
                        onClick={() => handleSelectAllRooms(!(selectedRooms.length === activeRoomsList.length && activeRoomsList.length > 0))}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedRooms.length === activeRoomsList.length && activeRoomsList.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedRooms.length === activeRoomsList.length && activeRoomsList.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {activeRoomsList.filter(r => r.toLowerCase().includes(roomSearchQuery.toLowerCase())).map(room => {
                        const isChecked = selectedRooms.includes(room);
                        return (
                          <div
                            key={room}
                            onClick={() => handleRoomCheckboxChange(room, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{room}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Brand MultiSelect */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">แบรนด์ลูกค้า (Brand)</label>
              <div className="relative" ref={brandDropdownRef}>
                <button
                  onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isBrandDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedBrands.length === 0 
                      ? 'ทุกแบรนด์ (All)' 
                      : selectedBrands.length === activeBrandsList.length 
                        ? `เลือกทุกแบรนด์ (${selectedBrands.length})` 
                        : selectedBrands.join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isBrandDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
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
                        onClick={() => handleSelectAllBrands(!(selectedBrands.length === activeBrandsList.length && activeBrandsList.length > 0))}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedBrands.length === activeBrandsList.length && activeBrandsList.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedBrands.length === activeBrandsList.length && activeBrandsList.length > 0 && (
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
                        const isChecked = selectedBrands.includes(brand);
                        return (
                          <div
                            key={brand}
                            onClick={() => handleBrandCheckboxChange(brand, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
            </div>

            {/* Owner dropdown */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ผู้รับผิดชอบ (Owner)</label>
              <div className="relative" ref={ownerDropdownRef}>
                <button
                  onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isOwnerDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedOwners.length === 0 
                      ? 'ทุกคน (All)' 
                      : selectedOwners.length === activeOwnersList.length 
                        ? `เลือกทุกคน (${selectedOwners.length})` 
                        : selectedOwners.join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isOwnerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isOwnerDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาผู้รับผิดชอบ..."
                          value={ownerSearchQuery}
                          onChange={(e) => setOwnerSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <div
                        onClick={() => handleSelectAllOwners(!(selectedOwners.length === activeOwnersList.length && activeOwnersList.length > 0))}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedOwners.length === activeOwnersList.length && activeOwnersList.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedOwners.length === activeOwnersList.length && activeOwnersList.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {activeOwnersList.filter(o => o.toLowerCase().includes(ownerSearchQuery.toLowerCase())).map(owner => {
                        const isChecked = selectedOwners.includes(owner);
                        return (
                          <div
                            key={owner}
                            onClick={() => handleOwnerCheckboxChange(owner, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{owner}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Status Selector */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">สถานะการจอง (Booking Status)</label>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isStatusDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedBookingStatuses.length === 0 
                      ? 'ทุกสถานะ (All)' 
                      : selectedBookingStatuses.length === STATUS_LIST.length 
                        ? `เลือกทุกสถานะ (${selectedBookingStatuses.length})` 
                        : selectedBookingStatuses.map(s => STATUS_LIST.find(x => x.value === s)?.label).join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isStatusDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาสถานะ..."
                          value={statusSearchQuery}
                          onChange={(e) => setStatusSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <div
                        onClick={() => handleSelectAllStatuses(!(selectedBookingStatuses.length === STATUS_LIST.length && STATUS_LIST.length > 0))}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedBookingStatuses.length === STATUS_LIST.length && STATUS_LIST.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedBookingStatuses.length === STATUS_LIST.length && STATUS_LIST.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {STATUS_LIST.filter(s => s.label.toLowerCase().includes(statusSearchQuery.toLowerCase())).map(status => {
                        const isChecked = selectedBookingStatuses.includes(status.value);
                        return (
                          <div
                            key={status.value}
                            onClick={() => handleStatusCheckboxChange(status.value, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{status.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Progress Status Selector */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">การดำเนินเวลาไลฟ์ (Live Progress)</label>
              <div className="relative" ref={progressDropdownRef}>
                <button
                  onClick={() => setIsProgressDropdownOpen(!isProgressDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isProgressDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedLiveProgresses.length === 0 
                      ? 'ทุกขั้นตอน (All)' 
                      : selectedLiveProgresses.length === PROGRESS_LIST.length 
                        ? `เลือกทุกขั้นตอน (${selectedLiveProgresses.length})` 
                        : selectedLiveProgresses.map(p => PROGRESS_LIST.find(x => x.value === p)?.label).join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isProgressDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isProgressDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาขั้นตอน..."
                          value={progressSearchQuery}
                          onChange={(e) => setProgressSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <div
                        onClick={() => handleSelectAllProgresses(!(selectedLiveProgresses.length === PROGRESS_LIST.length && PROGRESS_LIST.length > 0))}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedLiveProgresses.length === PROGRESS_LIST.length && PROGRESS_LIST.length > 0
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selectedLiveProgresses.length === PROGRESS_LIST.length && PROGRESS_LIST.length > 0 && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold select-none">เลือกทั้งหมด (Select All)</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col overflow-y-auto flex-1 px-1 pb-1">
                      {PROGRESS_LIST.filter(p => p.label.toLowerCase().includes(progressSearchQuery.toLowerCase())).map(progress => {
                        const isChecked = selectedLiveProgresses.includes(progress.value);
                        return (
                          <div
                            key={progress.value}
                            onClick={() => handleProgressCheckboxChange(progress.value, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{progress.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VIP Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ไลฟ์สำคัญ (VIP / Importance)</label>
              <CustomSelect
                value={vipFilter}
                onChange={setVipFilter as any}
                options={[
                  { value: 'all', label: 'ทั้งหมด (All)' },
                  { value: 'vip', label: '⭐ เฉพาะไลฟ์สำคัญ (VIP Only)' },
                  { value: 'normal', label: 'ไลฟ์ทั่วไป (Normal)' }
                ]}
              />
            </div>

            {/* Support Staff (multi-select) */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ผู้ดูแลห้องไลฟ์ (Support Staff)</label>
              <div className="relative" ref={staffDropdownRef}>
                <button
                  onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isStaffDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedStaffs.length === 0 
                      ? 'ทุกคน (All)' 
                      : selectedStaffs.map(email => allUsersAdmin.find(u => u.email === email)?.name || email.split('@')[0]).join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isStaffDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isStaffDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col" style={{ maxHeight: '280px' }}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ค้นหาผู้ดูแล..."
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 rounded-lg bg-transparent text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col overflow-y-auto flex-1 p-1">
                      {allUsersAdmin.filter(u => u.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(staffSearchQuery.toLowerCase())).map(u => {
                        const isChecked = selectedStaffs.includes(u.email);
                        return (
                          <div
                            key={u.email}
                            onClick={() => handleStaffCheckboxChange(u.email, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{u.name} ({u.email.split('@')[0]})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Channel (multi-select) */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ช่องทางการไลฟ์สด (Live Channel)</label>
              <div className="relative" ref={channelDropdownRef}>
                <button
                  onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isChannelDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedChannels.length === 0 ? 'ทุกช่องทาง (All)' : selectedChannels.join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isChannelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isChannelDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col animate-in fade-in duration-100" style={{ maxHeight: '280px' }}>
                    <div className="flex flex-col overflow-y-auto flex-1 p-1">
                      {['Facebook', 'TikTok', 'Shopee', 'Lazada'].filter(c => c.toLowerCase().includes(channelSearchQuery.toLowerCase())).map(chan => {
                        const isChecked = selectedChannels.includes(chan);
                        return (
                          <div
                            key={chan}
                            onClick={() => handleChannelCheckboxChange(chan, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{chan}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Scale (multi-select) */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">ขนาดของไลฟ์สด (Live Scale)</label>
              <div className="relative" ref={scaleDropdownRef}>
                <button
                  onClick={() => setIsScaleDropdownOpen(!isScaleDropdownOpen)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm hover:border-brand-400 dark:hover:border-brand-500 focus:outline-none transition-all duration-150 cursor-pointer ${
                    isScaleDropdownOpen ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="truncate">
                    {selectedScales.length === 0 ? 'ทุกขนาด (All)' : selectedScales.join(', ')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isScaleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isScaleDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden flex flex-col animate-in fade-in duration-100" style={{ maxHeight: '200px' }}>
                    <div className="flex flex-col overflow-y-auto flex-1 p-1">
                      {['Small Scale', 'Medium Scale', 'Large Scale'].map(sc => {
                        const isChecked = selectedScales.includes(sc);
                        return (
                          <div
                            key={sc}
                            onClick={() => handleScaleCheckboxChange(sc, !isChecked)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                            <span className={`text-xs truncate select-none ${isChecked ? 'text-brand-600 font-bold' : ''}`}>{sc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sorting */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[10px]">การจัดเรียง (Sort By)</label>
              <CustomSelect
                value={sortVal}
                onChange={setSortVal}
                options={[
                  { value: 'date-desc', label: 'วันที่จัดไลฟ์: ใหม่สุด (Newest)' },
                  { value: 'date-asc', label: 'วันที่จัดไลฟ์: เก่าสุด (Oldest)' },
                  { value: 'room-asc', label: 'ห้องสตูดิโอ: ก-ฮ' },
                  { value: 'brand-asc', label: 'แบรนด์ลูกค้า: ก-ฮ' },
                  { value: 'owner-asc', label: 'ผู้ดูแลคิว: ก-ฮ' },
                ]}
              />
            </div>

            {/* Checkbox: All dates history */}
            <div className="flex items-center gap-2 h-10 mt-3 select-none cursor-pointer">
              <input
                type="checkbox"
                id="all-dates-scheduler-check"
                checked={allDates}
                onChange={(e) => setAllDates(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded border-slate-200 dark:border-slate-800"
              />
              <label htmlFor="all-dates-scheduler-check" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                ดึงประวัติทุกวันที่ (All Dates History)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 5. Section 3: Upgraded Campaign Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1150px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold select-none uppercase tracking-wide">
                <th className="p-4 w-36">ID</th>
                <th className="p-4 w-40">วันที่ไลฟ์</th>
                <th className="p-4 w-28">ห้อง</th>
                <th className="p-4">รายละเอียดแคมเปญ</th>
                <th className="p-4 w-36">MC</th>
                <th className="p-4 w-40">ผู้รับผิดชอบ</th>
                <th className="p-4 w-48">ความพร้อมงาน</th>
                <th className="p-4 w-32 text-center">สถานะ</th>
                <th className="p-4 w-28 min-w-[110px] text-center sticky right-0 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-[-4px_0_12px_rgba(0,0,0,0.04)] z-10 whitespace-nowrap">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-[12px]">
              {paginatedBookings.map(b => {
                const meta = parseArtworkMetadata(b);
                const { issues, isUrgent, isMissingWork } = getBookingIssues(b, meta);
                const progressStatus = getLiveProgressStatus(b, isMissingWork);
                const isConflict = bookingConflicts.has(b.id);
                const isSelected = selectedRowId === b.id;

                // Row Highlighting styling
                let rowBgStyle = 'hover:bg-slate-100/75 dark:hover:bg-slate-800/50';
                let rowBorder = 'border-l-0';
                
                if (isSelected) {
                  rowBgStyle = 'bg-slate-100/90 dark:bg-slate-800/80';
                  rowBorder = 'border-l-4 border-l-slate-400 dark:border-l-slate-500';
                } else if (isConflict) {
                  rowBgStyle = 'bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-100/40 dark:hover:bg-rose-900/30';
                  rowBorder = 'border-l-4 border-l-rose-500';
                } else if (isUrgent) {
                  rowBgStyle = 'bg-amber-50/30 dark:bg-amber-950/5 hover:bg-amber-100/40 dark:hover:bg-amber-900/20';
                  rowBorder = 'border-l-4 border-l-amber-500';
                }

                return (
                  <tr 
                    key={b.id} 
                    className={`group ${rowBgStyle} ${rowBorder} text-slate-800 dark:text-slate-200 transition-colors cursor-pointer`}
                    onClick={() => setSelectedRowId(b.id)}
                  >
                    {/* 1. ID Column */}
                    <td className="p-4">
                      <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold tracking-tight select-all">
                        {meta.customId || b.id.substring(0, 8)}
                      </span>
                    </td>

                    {/* 2. Live Date & Time */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-normal text-slate-900 dark:text-white">{formatThaiDate(b.date)}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {b.startTime} - {b.endTime} น.
                        </span>
                      </div>
                    </td>
                    
                    {/* 3. Room */}
                    <td className="p-4 font-normal text-slate-900 dark:text-white">{b.roomName}</td>
                    
                    {/* 4. Campaign Details (Brand & Campaign Name) */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5 max-w-[220px]">
                        <span className="font-normal text-slate-900 dark:text-white text-xs hover:underline cursor-pointer flex items-center gap-1" onClick={() => openBookingDetail(b.id)}>
                          {(() => {
                            let isImportant = false;
                            if (b.lsArtworkLayout) {
                              try {
                                const parsed = JSON.parse(b.lsArtworkLayout);
                                isImportant = !!parsed?.isImportant;
                              } catch(e){}
                            }
                            return isImportant && <span className="text-amber-500 shrink-0 select-none animate-pulse" title="แคมเปญสำคัญ/VIP">⭐ VIP</span>;
                          })()}
                          <span>{b.brandName}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-normal animate-in fade-in" title={b.campaignName}>
                          {b.campaignName || <span className="text-slate-400 dark:text-slate-650 italic font-normal">ยังไม่ระบุชื่อแคมเปญ</span>}
                        </span>
                      </div>
                    </td>

                    {/* 5. MC Column */}
                    <td className="p-4">
                      {(() => {
                        if (!b.mcId) return <span className="text-slate-400 italic text-[11px]">-</span>;
                        const ids = b.mcId.split(',').map(x => x.trim()).filter(Boolean);
                        const names = ids.map(id => mcList.find(mc => mc.id === id)?.name).filter(Boolean);
                        if (names.length === 0) return <span className="text-slate-400 italic text-[11px]">-</span>;
                        return (
                          <span className="text-[11px] text-slate-700 dark:text-slate-300 font-normal truncate block max-w-[140px]" title={`MC: ${names.join(', ')}`}>
                            🎤 {names.join(', ')}
                          </span>
                        );
                      })()}
                    </td>
                    
                    {/* 6. Owner */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-normal text-slate-900 dark:text-white">{b.ownerName}</span>
                        {meta.lastUpdated && (
                          <span className="text-[9px] text-slate-450 dark:text-slate-500 font-normal italic">
                            {formatTimeElapsed(meta.lastUpdated)}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* 7. Readiness (Brief & Artwork Link) */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                        {/* Artwork Link */}
                        {meta.artworkLink ? (
                          <a href={meta.artworkLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 rounded text-[10px] font-extrabold hover:bg-emerald-100/50 transition-all w-fit">
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> ลิงค์ส่งงาน Artwork
                          </a>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5">
                            <XCircle className="w-3.5 h-3.5 shrink-0" /> ไม่มี Artwork
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* 8. Status (Live Progress & Booking Status) */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <div className="flex justify-center">{getLiveProgressBadge(progressStatus)}</div>
                        <span className="text-[9px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wide">
                          Booking: {getAutoStatus(b)}
                        </span>
                      </div>
                    </td>

                    {/* 9. Eye icon column (Sticky Right) */}
                    <td 
                      className="sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-100/75 dark:group-hover:bg-slate-800/50 z-10 px-4 py-4 border-l border-slate-200 dark:border-slate-800 shadow-[-4px_0_12px_rgba(0,0,0,0.04)] text-center w-28 min-w-[110px] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBookingDetail(b.id);
                      }}
                      title="ดูรายละเอียดแคมเปญ"
                    >
                      <button className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-full transition-all text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center mx-auto cursor-pointer">
                        <Eye className="w-4.5 h-4.5 text-slate-500 dark:text-slate-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {/* Empty state conditional renderer */}
              {paginatedBookings.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center select-none">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-full text-slate-400">
                        <Info className="w-6 h-6" />
                      </div>
                      <p className="text-slate-455 dark:text-slate-500 italic">
                        {bookingsInDateRange.length === 0 
                          ? 'ยังไม่มีข้อมูลการจองหรือแคมเปญเกิดขึ้นในช่วงเวลานี้' 
                          : 'ไม่พบรายการแคมเปญที่สอดคล้องกับตรรกะตัวกรองที่คุณเลือก'}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={clearAllFilters}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          ล้างตัวกรอง (Clear Filters)
                        </button>
                        {currentUser?.permissions?.canCreateBooking && (
                          <button
                            onClick={() => {
                              const today = new Date();
                              const formatted = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                              setActiveBookingCreateData({ date: formatted, roomName: activeRoomsList[0] || '', startTime: '09:00', endTime: '10:00' });
                            }}
                            className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-extrabold rounded-lg cursor-pointer"
                          >
                            สร้างแคมเปญแรก
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-455 dark:text-slate-500 font-semibold select-none bg-white dark:bg-slate-900 z-20">
            <div className="flex items-center gap-2">
              <span>แสดงผล</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-xs border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 bg-white dark:bg-slate-955 dark:text-slate-300 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span>รายการ จากทั้งหมด <strong className="text-slate-700 dark:text-slate-300">{sortedBookings.length}</strong> รายการ</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                ก่อนหน้า
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-6 h-6 rounded text-[10px] cursor-pointer ${
                    page === i + 1
                      ? 'bg-brand-500 text-white font-bold'
                      : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
