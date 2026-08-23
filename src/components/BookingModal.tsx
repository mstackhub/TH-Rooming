'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { parseTimeToMinutes, minutesToTimeStr, generateBookingCustomId, formatThaiDate } from '@/utils/time';
import { 
  X, 
  Clock, 
  Calendar, 
  MapPin, 
  Tag, 
  Plus, 
  FileText, 
  Trash2, 
  Lock, 
  Unlock, 
  AlertOctagon, 
  Save, 
  Trash, 
  HelpCircle, 
  HardDrive, 
  Palette, 
  Table as TableIcon, 
  Link2,
  Copy,
  ExternalLink,
  Send,
  FileEdit,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

function safeDateLocaleString(val: any): string {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('th-TH');
  } catch (e) {
    return String(val);
  }
}

export default function BookingModal() {
  const {
    activeBookingIdForEdit,
    setActiveBookingIdForEdit,
    activeBookingCreateData,
    setActiveBookingCreateData,
    rooms,
    brands,
    calendarBookings,
    bookings,
    currentUser,
    apiCall,
    refreshActiveTabData,
    showToast,
    setCurrentTab,
    setSelectedDate,
    setHighlightedBookingId,
    mcList,
    mcTiers,
    allUsersAdmin,
    settings,
    changeRequests,
    setChangeRequests
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [conflictMsg, setConflictMsg] = useState('');

  // 14-day lock & Change Request dialog states
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestDialogType, setRequestDialogType] = useState<'edit' | 'cancel'>('edit');
  const [requestDialogDetails, setRequestDialogDetails] = useState('');
  const [requestDialogSubmitting, setRequestDialogSubmitting] = useState(false);

  // Form Fields
  const [roomName, setRoomName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [brandName, setBrandName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  
  // Support Multi MCs up to 4. We store them as comma-separated IDs in the same mcId DB column.
  const [selectedMcIds, setSelectedMcIds] = useState<string[]>([]);
  // Support Multi Staff/Users up to 4. We map them into the briefLink column as comma-separated emails.
  const [selectedStaffEmails, setSelectedStaffEmails] = useState<string[]>([]);

  // Scale: Full Scale, Medium Scale (Default), Mini Scale
  const [scale, setScale] = useState<'Full Scale' | 'Medium Scale' | 'Mini Scale'>('Medium Scale');
  
  // Important Live (Star/VIP indicator)
  const [isImportant, setIsImportant] = useState(false);

  // Live Channel configuration
  const [liveChannel, setLiveChannel] = useState<string>('Facebook');
  const [customLiveChannel, setCustomLiveChannel] = useState<string>('');

  const [briefText, setBriefText] = useState('');
  const [briefLink, setBriefLink] = useState('');
  const [remark, setRemark] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'Confirmed' | 'Live' | 'Completed' | 'Cancelled'>('Confirmed');
  const [briefStatus, setBriefStatus] = useState('Not Added');
  const [artworkStatus, setArtworkStatus] = useState('Not Added');
  const [artworkLink, setArtworkLink] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastUpdatedBy, setLastUpdatedBy] = useState('');

  const isOpen = activeBookingIdForEdit !== null || activeBookingCreateData !== null;
  const isEditMode = activeBookingIdForEdit !== null;

  // Time slots list helper
  const hourOptions = useMemo(() => {
    const list = [];
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      list.push(`${hh}:00`);
      list.push(`${hh}:30`);
    }
    list.push(`23:59`); // Max limit
    return list;
  }, []);

  // Match edit booking or populate creation params
  const matchedBooking = useMemo(() => {
    if (isEditMode && activeBookingIdForEdit) {
      return (calendarBookings || []).find(b => b.id === activeBookingIdForEdit) || 
             (bookings || []).find(b => b.id === activeBookingIdForEdit) || null;
    }
    return null;
  }, [isEditMode, activeBookingIdForEdit, calendarBookings, bookings]);

  // Populate data
  useEffect(() => {
    if (isOpen) {
      setConflictMsg('');
      
      if (isEditMode && matchedBooking) {
        setRoomName(matchedBooking.roomName);
        setDate(matchedBooking.date);
        setStartTime(matchedBooking.startTime);
        setEndTime(matchedBooking.endTime);
        setBrandName(matchedBooking.brandName);
        setCampaignName(matchedBooking.campaignName);
        setBriefText(matchedBooking.briefText);
        setBriefLink(matchedBooking.briefLink);
        setRemark(matchedBooking.remark);
        setBookingStatus(matchedBooking.status as any);

        // Load multiple MC IDs
        if (matchedBooking.mcId) {
          setSelectedMcIds(matchedBooking.mcId.split(',').map(x => x.trim()).filter(Boolean));
        } else {
          setSelectedMcIds([]);
        }

        // Load staff emails from briefLink (if it contains emails) OR metadata JSON payload
        let matchedStaffEmails: string[] = [];
        if (matchedBooking.lsArtworkLayout) {
          try {
            const parsed = JSON.parse(matchedBooking.lsArtworkLayout);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.staffEmails)) {
              matchedStaffEmails = parsed.staffEmails;
            }
          } catch (e) {}
        }
        if (matchedStaffEmails.length === 0 && matchedBooking.briefLink && matchedBooking.briefLink.includes('@')) {
          matchedStaffEmails = matchedBooking.briefLink.split(',').map(x => x.trim()).filter(Boolean);
        }
        setSelectedStaffEmails(matchedStaffEmails);

        // Parse readiness statuses from lsArtworkLayout JSON
        let bStatus = 'Not Added';
        let aStatus = 'Not Added';
        let aLink = '';
        let updDate = '';
        let updBy = '';
        let matchedScale: any = 'Medium Scale';
        let matchedImportant = false;
        let matchedChannel = 'Facebook';
        let matchedCustomChannel = '';

        if (matchedBooking.lsArtworkLayout) {
          try {
            const parsed = JSON.parse(matchedBooking.lsArtworkLayout);
            if (Array.isArray(parsed)) {
              bStatus = matchedBooking.briefLink ? 'Submitted' : 'Not Added';
              aStatus = parsed.length > 0 ? 'Submitted' : 'Not Added';
              aLink = parsed[0]?.url || '';
            } else if (parsed && typeof parsed === 'object') {
              bStatus = parsed.briefStatus || (matchedBooking.briefLink ? 'Submitted' : 'Not Added');
              aStatus = parsed.artworkStatus || (parsed.artworks?.length > 0 ? 'Submitted' : 'Not Added');
              aLink = parsed.artworks?.[0]?.url || '';
              updDate = parsed.lastUpdated || '';
              updBy = parsed.lastUpdatedBy || '';
              matchedScale = parsed.scale || 'Medium Scale';
              matchedImportant = !!parsed.isImportant;
              matchedChannel = parsed.liveChannel || 'Facebook';
              matchedCustomChannel = parsed.customLiveChannel || '';
            }
          } catch (e) {
            bStatus = matchedBooking.briefLink ? 'Submitted' : 'Not Added';
            aLink = matchedBooking.lsArtworkLayout.startsWith('http') ? matchedBooking.lsArtworkLayout : '';
            aStatus = aLink ? 'Submitted' : 'Not Added';
          }
        } else {
          bStatus = matchedBooking.briefLink ? 'Submitted' : 'Not Added';
        }

        setBriefStatus(bStatus);
        setArtworkStatus(aStatus);
        setArtworkLink(aLink);
        setLastUpdated(updDate);
        setLastUpdatedBy(updBy);
        setScale(matchedScale);
        setIsImportant(matchedImportant);
        setLiveChannel(matchedChannel);
        setCustomLiveChannel(matchedCustomChannel);
      } else if (activeBookingCreateData) {
        // Pre-fill fields from click action
        setRoomName(activeBookingCreateData.roomName || (rooms[0]?.name || ''));
        setDate(activeBookingCreateData.date);
        setStartTime(activeBookingCreateData.startTime);
        setEndTime(activeBookingCreateData.endTime);
        setBrandName(brands[0]?.name || '');
        setCampaignName('');
        setBriefText('');
        setBriefLink('');
        setRemark('');
        setBookingStatus('Confirmed');
        setBriefStatus('Not Added');
        setArtworkStatus('Not Added');
        setArtworkLink('');
        setLastUpdated('');
        setLastUpdatedBy('');
        setSelectedMcIds([]);
        setSelectedStaffEmails([]);
        setScale('Medium Scale');
        setIsImportant(false);
        setLiveChannel('Facebook');
        setCustomLiveChannel('');
      }
    }
  }, [isOpen, activeBookingIdForEdit, activeBookingCreateData, matchedBooking]);

  const handleClose = () => {
    setActiveBookingIdForEdit(null);
    setActiveBookingCreateData(null);
  };

  // 2. Validate Overlaps / Booking Conflict Detection
  const checkTimeOverlap = () => {
    const requestedStart = parseTimeToMinutes(startTime);
    const requestedEnd = parseTimeToMinutes(endTime);
    
    if (requestedStart === -1 || requestedEnd === -1) return "ช่วงเวลาไม่ถูกต้อง";
    if (requestedEnd <= requestedStart) return "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น";

    // Compare with all database bookings
    for (const b of calendarBookings) {
      if (b.status === 'Cancelled') continue;
      // Skip comparing against itself in edit mode
      if (isEditMode && b.id === matchedBooking?.id) continue;
      
      // Compare only same room and same date
      if (b.roomName === roomName && b.date === date) {
        const bStart = parseTimeToMinutes(b.startTime);
        const bEnd = parseTimeToMinutes(b.endTime);
        
        // Check intersection
        const overlap = (requestedStart < bEnd && requestedEnd > bStart);
        if (overlap) {
          return `คิวทับซ้อนกับแบรนด์ "${b.brandName}" (ช่วงเวลา ${b.startTime} - ${b.endTime} น.)`;
        }
      }
    }
    return null;
  };

  // 3. Save Form
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    const allowedToSave = isEditMode 
      ? currentUser?.permissions?.canEditBooking 
      : currentUser?.permissions?.canCreateBooking;

    if (!allowedToSave) {
      showToast(isEditMode ? "ท่านไม่มีสิทธิ์ในการแก้ไขข้อมูลรายการจองห้องไลฟ์สด" : "ท่านไม่มีสิทธิ์ในการสร้างรายการจองห้องไลฟ์สด", "error");
      return;
    }

    if (!roomName) return showToast("กรุณาเลือกห้องสตูดิโอ", "warning");
    if (!brandName) return showToast("กรุณาเลือกแบรนด์ลูกค้า", "warning");
    if (!date) return showToast("กรุณากรอกวันที่จองห้อง", "warning");

    // Check Conflict
    const conflict = checkTimeOverlap();
    if (conflict) {
      setConflictMsg(conflict);
      setIsShake(true);
      setTimeout(() => setIsShake(false), 4000);
      showToast(conflict, "error");
      return;
    }

    setLoading(true);
    setConflictMsg('');

    let artworksArray = [] as any[];
    if (isEditMode && matchedBooking && matchedBooking.lsArtworkLayout) {
      try {
        const parsed = JSON.parse(matchedBooking.lsArtworkLayout);
        if (Array.isArray(parsed)) {
          artworksArray = parsed;
        } else if (parsed && typeof parsed === 'object') {
          artworksArray = parsed.artworks || [];
        }
      } catch (e) {
        if (matchedBooking.lsArtworkLayout.startsWith('http')) {
          artworksArray = [{ type: 'Link', url: matchedBooking.lsArtworkLayout }];
        }
      }
    }

    if (artworkLink.trim()) {
      const existing = artworksArray.find(a => a.url === artworkLink.trim());
      if (existing) {
        artworksArray = [existing];
      } else {
        let type = 'Link';
        if (artworkLink.includes('drive.google.com')) type = 'Google Drive';
        else if (artworkLink.includes('canva.com')) type = 'Canva';
        else if (artworkLink.includes('docs.google.com/spreadsheets')) type = 'Google Sheet';
        artworksArray = [{ type, url: artworkLink.trim() }];
      }
    } else {
      artworksArray = [];
    }

    const lsArtworkLayoutPayload = JSON.stringify({
      artworks: artworksArray,
      briefStatus: briefStatus,
      artworkStatus: artworkStatus,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: currentUser?.name || currentUser?.email || 'System',
      scale: scale,
      isImportant: isImportant,
      liveChannel: liveChannel,
      customLiveChannel: customLiveChannel,
      staffEmails: selectedStaffEmails
    });

    const bookingPayload = {
      roomName,
      date,
      startTime,
      endTime,
      brandName,
      campaignName: campaignName.trim(),
      briefText: briefText.trim(),
      // Keep briefLink mapping to briefText/briefLink URL or blank (or copy staff selection for backup)
      briefLink: selectedStaffEmails.join(','),
      lsArtworkLayout: lsArtworkLayoutPayload,
      status: bookingStatus,
      remark: remark.trim(),
      // mcId maps comma-separated selected MC IDs
      mcId: selectedMcIds.join(',') || null
    };

    if (isEditMode && matchedBooking) {
      // Update
      await apiCall('updateBooking', { bookingId: matchedBooking.id, bookingData: bookingPayload }, (err) => {
        setLoading(false);
        if (err) {
          showToast(err, "error");
        } else {
          showToast(`แก้ไขข้อมูลคิวจอง ${brandName} สำเร็จ`, "success");
          handleClose();
          refreshActiveTabData();
        }
      });
    } else {
      // Create
      await apiCall('createBooking', { bookingData: bookingPayload }, (err, data) => {
        setLoading(false);
        if (err) {
          showToast(err, "error");
        } else {
          showToast(`จองห้องสตูดิโอสำหรับแบรนด์ "${brandName}" สำเร็จเรียบร้อยแล้ว`, "success");
          handleClose();
          refreshActiveTabData();
        }
      });
    }
  };

  // 4. Cancel booking handler
  const handleCancelBooking = async () => {
    if (!isEditMode || !matchedBooking) return;
    if (!currentUser?.permissions?.canCancelBooking) {
      showToast("ท่านไม่มีสิทธิ์ในการยกเลิกรายการจองห้องไลฟ์สด", "error");
      return;
    }
    if (!window.confirm("ต้องการยกเลิกการจองห้องสตูดิโอนี้ใช่หรือไม่? คิวงานจะเปลี่ยนสถานะเป็น Cancelled ทันที")) return;

    setLoading(true);
    await apiCall('cancelBooking', { bookingId: matchedBooking.id }, (err) => {
      setLoading(false);
      if (err) {
        showToast(err, "error");
      } else {
        showToast("ยกเลิกรายการจองห้องเรียบร้อยแล้ว", "success");
        handleClose();
        refreshActiveTabData();
      }
    });
  };

  const handleDuplicate = () => {
    const copyData = {
      brand: brandName,
      campaign: campaignName,
      briefTxt: briefText,
      rem: remark,
      bStatus: briefStatus,
      aStatus: artworkStatus,
      aLink: artworkLink,
      mcIds: selectedMcIds,
      staffEmails: selectedStaffEmails,
      scale: scale,
      isImportant: isImportant,
      liveChannel: liveChannel,
      customLiveChannel: customLiveChannel
    };

    setActiveBookingIdForEdit(null);
    setActiveBookingCreateData({
      date: date,
      roomName: roomName,
      startTime: startTime,
      endTime: endTime
    });

    setTimeout(() => {
      setBrandName(copyData.brand);
      setCampaignName(copyData.campaign ? `${copyData.campaign} (Copy)` : 'Copy');
      setBriefText(copyData.briefTxt);
      setRemark(copyData.rem);
      setBriefStatus(copyData.bStatus);
      setArtworkStatus(copyData.aStatus);
      setArtworkLink(copyData.aLink);
      setSelectedMcIds(copyData.mcIds);
      setSelectedStaffEmails(copyData.staffEmails);
      setScale(copyData.scale);
      setIsImportant(copyData.isImportant);
      setLiveChannel(copyData.liveChannel);
      setCustomLiveChannel(copyData.customLiveChannel);
    }, 50);

    showToast("คัดลอกแคมเปญเรียบร้อย กรุณาตรวจสอบวันเวลาและจัดเก็บ", "info");
  };

  const handleGoToScheduler = () => {
    if (!isEditMode || !matchedBooking) return;
    setSelectedDate(matchedBooking.date);
    setHighlightedBookingId(matchedBooking.id);
    setCurrentTab('scheduler');
    handleClose();
  };

  const isAdmin = currentUser?.permissions?.isAdmin || currentUser?.role === 'Master Admin';
  const hasEditPerm = isEditMode 
    ? (!!currentUser?.permissions?.canEditBooking || isAdmin)
    : (!!currentUser?.permissions?.canCreateBooking || isAdmin);
  const hasCancelPerm = isEditMode && (!!currentUser?.permissions?.canCancelBooking || isAdmin);

  const daysUntilBooking = useMemo(() => {
    if (!matchedBooking?.date) return 999;
    try {
      const parts = matchedBooking.date.split('-');
      if (parts.length === 3) {
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      }
    } catch (e) {}
    return 999;
  }, [matchedBooking?.date]);

  const isLocked14Days = isEditMode && daysUntilBooking < 14;
  const requiresChangeRequest = isLocked14Days && !isAdmin;

  const pendingChangeReq = useMemo(() => {
    if (!matchedBooking || !Array.isArray(changeRequests)) return null;
    return changeRequests.find(r => r && r.bookingId === matchedBooking.id && r.status === 'Pending') || null;
  }, [matchedBooking, changeRequests]);

  const lastHandledReq = useMemo(() => {
    if (!matchedBooking || !Array.isArray(changeRequests)) return null;
    return changeRequests.find(r => r && r.bookingId === matchedBooking.id && r.status === 'Approved') || null;
  }, [matchedBooking, changeRequests]);

  // Direct save without change request: allowed when >= 14 days OR user is Admin
  const canDirectSave = hasEditPerm && (!isLocked14Days || isAdmin);
  const canDirectCancel = hasCancelPerm && (!isLocked14Days || isAdmin);

  const handleOpenEditRequest = () => {
    setRequestDialogType('edit');
    const changes: string[] = [];
    if (matchedBooking) {
      if (roomName && roomName !== matchedBooking.roomName) changes.push(`ห้อง: ${matchedBooking.roomName} -> ${roomName}`);
      if (date && date !== matchedBooking.date) changes.push(`วันที่: ${matchedBooking.date} -> ${date}`);
      if ((startTime && startTime !== matchedBooking.startTime) || (endTime && endTime !== matchedBooking.endTime)) {
        changes.push(`เวลา: ${matchedBooking.startTime}-${matchedBooking.endTime} -> ${startTime}-${endTime}`);
      }
      if (brandName && brandName !== matchedBooking.brandName) changes.push(`แบรนด์: ${matchedBooking.brandName} -> ${brandName}`);
      if (campaignName && campaignName !== matchedBooking.campaignName) changes.push(`แคมเปญ: ${matchedBooking.campaignName} -> ${campaignName}`);
      if (briefText && briefText !== matchedBooking.briefText) changes.push(`บรีฟ: ${matchedBooking.briefText || '-'} -> ${briefText}`);
      if (remark && remark !== matchedBooking.remark) changes.push(`หมายเหตุ: ${matchedBooking.remark || '-'} -> ${remark}`);
    }
    const defaultText = changes.length > 0 
      ? `รายการที่ต้องการขอแก้ไข:\n${changes.map(c => '• ' + c).join('\n')}\n\nเหตุผลความจำเป็น: `
      : '';
    setRequestDialogDetails(defaultText);
    setIsRequestDialogOpen(true);
  };

  const handleOpenCancelRequest = () => {
    setRequestDialogType('cancel');
    setRequestDialogDetails('');
    setIsRequestDialogOpen(true);
  };

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedBooking) return;
    if (!requestDialogDetails.trim()) {
      showToast('กรุณาระบุรายละเอียดและเหตุผลที่ต้องการขอเปลี่ยนแปลง', 'warning');
      return;
    }
    setRequestDialogSubmitting(true);
    const customId = generateBookingCustomId(matchedBooking, calendarBookings);
    
    await apiCall('createChangeRequest', {
      bookingId: matchedBooking.id,
      bookingCustomId: customId,
      requestType: requestDialogType,
      requestDetails: requestDialogDetails.trim()
    }, (err, res) => {
      setRequestDialogSubmitting(false);
      if (err) {
        showToast(err, 'error');
      } else {
        showToast('ส่งคำร้องเรียบร้อยแล้ว ผู้รับผิดชอบจะดำเนินการตรวจสอบ', 'success');
        if (res && res.changeRequest) {
          setChangeRequests(prev => [res.changeRequest, ...(prev || []).filter(x => x.id !== res.changeRequest.id)]);
        }
        setIsRequestDialogOpen(false);
        setRequestDialogDetails('');
        handleClose();
        refreshActiveTabData();
      }
    });
  };

  // Toggle MC Selection (Max 4)
  const handleToggleMc = (mcIdVal: string) => {
    if (!hasEditPerm) return;
    setSelectedMcIds(prev => {
      if (prev.includes(mcIdVal)) {
        return prev.filter(id => id !== mcIdVal);
      }
      if (prev.length >= 4) {
        showToast("สามารถเลือก MC ได้สูงสุด 4 คนเท่านั้น", "warning");
        return prev;
      }
      return [...prev, mcIdVal];
    });
  };

  // Toggle Staff Selection (Max 4)
  const handleToggleStaff = (email: string) => {
    if (!hasEditPerm) return;
    setSelectedStaffEmails(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      }
      if (prev.length >= 4) {
        showToast("สามารถเลือกผู้ดูแลระบบห้องไลฟ์ได้สูงสุด 4 คนเท่านั้น", "warning");
        return prev;
      }
      return [...prev, email];
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Black backdrop */}
      <div 
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      />

      {/* Centered Modal Panel */}
      <div 
        id="booking-modal-panel"
        className={`relative w-full max-w-lg md:max-w-xl max-h-[90vh] glass-modal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col rounded-3xl shadow-2xl z-10 animate-in zoom-in duration-200 ${
          isShake ? 'animate-shake' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-500" />
              {isEditMode ? 'รายละเอียดและจัดการคิวไลฟ์' : 'สร้างรายการจองห้องไลฟ์สดใหม่'}
            </h3>
            {isEditMode && matchedBooking && (() => {
              const displayCustomId = generateBookingCustomId(matchedBooking, calendarBookings);
              return (
                <div className="flex flex-col gap-0.5 mt-0.5 select-none font-bold">
                  {displayCustomId && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wide">
                      คิวจอง ID: {displayCustomId}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                    ผู้จอง: {matchedBooking.ownerName} ({matchedBooking.ownerEmail})
                  </span>
                </div>
              );
            })()}
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-slate-450"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Pending Change Request Alert */}
          {pendingChangeReq && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3.5 rounded-2xl flex items-start gap-2.5 text-amber-900 dark:text-amber-300">
              <Clock className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <strong className="font-extrabold block">⏳ คิวนี้มีคำร้องขอที่อยู่ระหว่างรอการพิจารณา</strong>
                <span className="text-[10px] opacity-90 block mt-0.5">
                  ประเภท: {pendingChangeReq.requestType === 'cancel' ? 'ขอยกเลิกคิว' : 'ขอแก้ไขข้อมูล'} | ส่งเมื่อ: {safeDateLocaleString(pendingChangeReq.createdAt)}
                </span>
                <span className="text-[10px] opacity-80 block mt-0.5 bg-white/60 dark:bg-slate-900/40 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
                  {pendingChangeReq.requestDetails}
                </span>
              </div>
            </div>
          )}

          {/* Last Approved Change Request History */}
          {!pendingChangeReq && lastHandledReq && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-2xl flex items-start gap-2 text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-[10px]">
                <strong className="font-extrabold block">✅ คิวนี้ได้รับการแก้ไขตามคำร้องแล้ว</strong>
                <span>
                  เมื่อ: {safeDateLocaleString(lastHandledReq.handledAt)} โดย: {lastHandledReq.handlerName || 'ผู้ดูแลระบบ'}
                </span>
                {lastHandledReq.handlerNote && (
                  <span className="block mt-0.5 italic text-emerald-700 dark:text-emerald-400">
                    หมายเหตุ: {lastHandledReq.handlerNote}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 14-Day Lock Rule Warning Banner */}
          {requiresChangeRequest && (
            <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 p-3.5 rounded-2xl flex items-start gap-2.5 text-indigo-950 dark:text-indigo-300 shadow-xs">
              <Lock className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-extrabold block">🔒 กฎการแก้ไขคิวล่วงหน้า (14-Day Lock Rule)</strong>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 block mt-0.5 leading-relaxed">
                  คิวนี้จะเริ่มไลฟ์ในอีก <strong className="text-indigo-600 dark:text-indigo-400">{daysUntilBooking} วัน</strong> (น้อยกว่า 14 วัน) ระบบล็อคการแก้ไขและยกเลิกโดยตรง หากต้องการเปลี่ยนแปลงกรุณากดปุ่ม <strong>"ส่งคำร้องขอแก้ไข"</strong> หรือ <strong>"ส่งคำร้องขอยกเลิก"</strong> ด้านล่าง
                </span>
              </div>
            </div>
          )}

          {/* Booking conflicts display */}
          {conflictMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-900 dark:text-rose-350">
              <AlertOctagon className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-extrabold block">ตรวจพบความทับซ้อนของช่วงเวลา!</strong>
                <span className="text-[10px] opacity-90 block mt-0.5">{conflictMsg}</span>
              </div>
            </div>
          )}

          {/* Form Fields controls */}
          <form onSubmit={handleSaveBooking} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              {/* Studio Room selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ห้องสตูดิโอ (Live Studio Room)</label>
                <select
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {rooms.filter(r => r.status === 'Active' || r.name === roomName).map(r => (
                    <option key={r.id} value={r.name}>{r.name}{r.status === 'Inactive' ? ' (ปิดใช้งาน)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Date Picker */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">วันที่จองห้องไลฟ์สด (Live Date)</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Time selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">เวลาเริ่มไลฟ์สด (Start Time)</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {hourOptions.map(slot => {
                    const slotMins = parseTimeToMinutes(slot);
                    const isOccupied = calendarBookings.some(b => {
                      if (b.status === 'Cancelled') return false;
                      if (isEditMode && matchedBooking && b.id === matchedBooking.id) return false;
                      if (b.date !== date || b.roomName !== roomName) return false;
                      const start = parseTimeToMinutes(b.startTime);
                      const end = parseTimeToMinutes(b.endTime);
                      return slotMins >= start && slotMins < end;
                    });
                    
                    return (
                      <option key={`start-${slot}`} value={slot}>
                        {slot} น. {isOccupied ? ' (ใช้งานแล้ว)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* End Time selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">เวลาจบการไลฟ์ (End Time)</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {hourOptions.map(slot => {
                    const slotMins = parseTimeToMinutes(slot);
                    const isOccupied = calendarBookings.some(b => {
                      if (b.status === 'Cancelled') return false;
                      if (isEditMode && matchedBooking && b.id === matchedBooking.id) return false;
                      if (b.date !== date || b.roomName !== roomName) return false;
                      const start = parseTimeToMinutes(b.startTime);
                      const end = parseTimeToMinutes(b.endTime);
                      return slotMins > start && slotMins <= end;
                    });

                    return (
                      <option key={`end-${slot}`} value={slot}>
                        {slot} น. {isOccupied ? ' (ใช้งานแล้ว)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Brand Customer selector */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">แบรนด์สินค้า (Brand Partner)</label>
                <select
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {brands.filter(b => b.status === 'Active' || b.name === brandName).map(b => (
                    <option key={b.id} value={b.name}>{b.name}{b.status === 'Inactive' ? ' (ปิดใช้งาน)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Scale Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ขนาดของไลฟ์สด (Live Scale)</label>
                <select
                  value={scale}
                  onChange={(e) => setScale(e.target.value as any)}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  <option value="Medium Scale">Medium Scale (Default)</option>
                  <option value="Full Scale">Full Scale</option>
                  <option value="Mini Scale">Mini Scale</option>
                </select>
              </div>
            </div>

            {/* Toggle Important Live Selector */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  ⭐ ไลฟ์สดสำคัญ (VIP / ดารา / ไลฟ์ใหญ่)
                </span>
                <span className="text-[9px] text-slate-455 dark:text-slate-400 font-semibold leading-tight">
                  เปิดการใช้งานนี้เพื่อเน้นย้ำและติดสัญลักษณ์ดาวแจ้งเตือนให้ทีมงานทุกคนทราบ
                </span>
              </div>
              <button
                type="button"
                onClick={() => hasEditPerm && setIsImportant(!isImportant)}
                disabled={!hasEditPerm}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isImportant ? 'bg-amber-500' : 'bg-slate-205 dark:bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isImportant ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Live Streaming Channel Selection dropdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ช่องทางการไลฟ์สด (Live Channel)</label>
                <select
                  value={liveChannel}
                  onChange={(e) => {
                    setLiveChannel(e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomLiveChannel('');
                    }
                  }}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {(settings?.liveChannels || 'Facebook,TikTok,Shopee,Lazada')
                    .split(',')
                    .map(x => x.trim())
                    .filter(Boolean)
                    .map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))
                  }
                  <option value="Other">อื่นๆ (ระบุเอง)</option>
                </select>
              </div>

              {/* Custom Channel Input (Visible if 'Other' or 'อื่นๆ (ระบุเอง)' is selected) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">
                  ระบุช่องทางอื่น {liveChannel === 'Other' && <span className="text-rose-500 font-bold">*</span>}
                </label>
                <input
                  type="text"
                  placeholder="เช่น YouTube, Zoom, LINE"
                  value={customLiveChannel}
                  onChange={(e) => setCustomLiveChannel(e.target.value)}
                  disabled={!hasEditPerm || liveChannel !== 'Other'}
                  className={`w-full text-xs font-semibold rounded-xl border p-2.5 bg-white dark:bg-slate-900 ${
                    liveChannel === 'Other' 
                      ? 'border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400' 
                      : 'border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                  required={liveChannel === 'Other'}
                />
              </div>
            </div>

            {/* Multi MC Live selector (Max 4) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">
                เลือก MC ไลฟ์สด (MC Live) <span className="text-slate-400 font-bold">(เลือกได้สูงสุด 4 คน)</span>
              </label>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/30 flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                {(mcList || []).length === 0 ? (
                  <span className="text-slate-400 font-semibold text-[10px]">ไม่มีข้อมูลผู้ดำเนินรายการ (MC) ในระบบ</span>
                ) : (
                  (mcList || []).filter(mc => mc && (mc.status === 'Active' || selectedMcIds.includes(mc.id))).map(mc => {
                    const isSelected = selectedMcIds.includes(mc.id);
                    const tier = (mcTiers || []).find(t => t && t.id === mc.tierId);
                    return (
                      <button
                        type="button"
                        key={mc.id}
                        onClick={() => handleToggleMc(mc.id)}
                        disabled={!hasEditPerm}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:border-slate-350'
                        }`}
                      >
                        <span>{mc.name}</span>
                        {tier && (
                          <span className={`text-[8px] font-black uppercase px-1 rounded ${
                            isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {tier.name.replace('Tier ', '')}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Staff / System Support selector (Max 4) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">
                เลือกผู้ดูแลห้องไลฟ์ (Live Support Staff) <span className="text-slate-400 font-bold">(เลือกได้สูงสุด 4 คน)</span>
              </label>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/30 flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                {(allUsersAdmin || []).length === 0 ? (
                  <span className="text-slate-400 font-semibold text-[10px]">ไม่มีข้อมูลผู้ใช้งานระบบ</span>
                ) : (
                  (allUsersAdmin || []).filter(u => u.status === 'Active' || selectedStaffEmails.includes(u.email)).map(u => {
                    const isSelected = selectedStaffEmails.includes(u.email);
                    return (
                      <button
                        type="button"
                        key={u.email}
                        onClick={() => handleToggleStaff(u.email)}
                        disabled={!hasEditPerm}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:border-slate-350'
                        }`}
                      >
                        <span>{u.name || u.email.split('@')[0]}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Campaign Name input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ชื่อแคมเปญ / หัวข้อไลฟ์ (Campaign Name)</label>
              <input
                type="text"
                placeholder="เช่น 7.7 Mid Year Sale, Live เปิดตัวสินค้า"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                disabled={!hasEditPerm}
                className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
              />
            </div>

            {/* Brief Label */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">รายละเอียด</label>
              <input
                type="text"
                placeholder="เช่น สเปคสินค้า, รายละเอียดไลฟ์"
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                disabled={!hasEditPerm}
                className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
              />
            </div>

            {/* Live Production Readiness Section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-brand-500" />
                ความพร้อมเตรียมงานไลฟ์สด (Live Production Readiness)
              </h4>

              {/* Artwork Link Input */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">ลิงค์ส่งงานอาร์ตเวิร์ก (Artwork URL Link)</label>
                  {artworkLink && (
                    <a
                      href={artworkLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> เปิดลิงค์ Artwork
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="เช่น ลิงค์ Google Drive โฟลเดอร์งาน หรือลิงค์ Canva"
                  value={artworkLink}
                  onChange={(e) => setArtworkLink(e.target.value)}
                  disabled={!hasEditPerm}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                />
              </div>

              {/* Last updated timestamp */}
              {isEditMode && lastUpdated && (
                <div className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold italic flex items-center gap-1 select-none">
                  <span>แก้ไขล่าสุดเมื่อ: {safeDateLocaleString(lastUpdated)}</span>
                  {lastUpdatedBy && <span>โดย {lastUpdatedBy}</span>}
                </div>
              )}
            </div>

            {/* Remarks input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">หมายเหตุคำขออื่นๆ (Remarks)</label>
              <textarea
                placeholder="เช่น ต้องการกล้องสเปคพิเศษ หรือขอแอดมินสนับสนุนเพิ่มเติม"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                disabled={!hasEditPerm}
                className="w-full text-xs rounded-xl border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 min-h-[70px]"
              />
            </div>

            {/* Modal Actions controls */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 select-none text-xs">
              
              {/* If 14-Day Lock applies and user is not admin -> Show Change Request Buttons */}
              {requiresChangeRequest ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleOpenEditRequest}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> ส่งคำร้องขอแก้ไขคิวไลฟ์ (Request Edit)
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCancelRequest}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ส่งคำร้องขอยกเลิกคิว (Request Cancel)
                  </button>
                </div>
              ) : (
                /* Primary Direct Save Button (Full Width) */
                canDirectSave && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> {loading ? 'กำลังบันทึก...' : 'บันทึกรายการจอง'}
                  </button>
                )
              )}

              {/* Utility Row (Two Columns) */}
              <div className="grid grid-cols-2 gap-2.5">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleGoToScheduler}
                    className="py-2.5 bg-indigo-55/60 hover:bg-indigo-100/80 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" /> ดูใน Scheduler
                  </button>
                )}
                {isEditMode && currentUser?.permissions?.canCreateBooking && (
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> คัดลอกแคมเปญ
                  </button>
                )}
              </div>

              {/* Danger Zone: Direct Cancel Booking (Full Width) */}
              {!requiresChangeRequest && canDirectCancel && (
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash className="w-3.5 h-3.5" /> ยกเลิกรายการจอง
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* REQUEST SUBMISSION DIALOG */}
      {isRequestDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsRequestDialogOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                {requestDialogType === 'edit' ? <FileEdit className="w-4 h-4 text-indigo-500" /> : <Trash2 className="w-4 h-4 text-rose-500" />}
                {requestDialogType === 'edit' ? 'ส่งคำร้องขอแก้ไขข้อมูลคิวไลฟ์' : 'ส่งคำร้องขอยกเลิกคิวไลฟ์'}
              </h3>
              <button onClick={() => setIsRequestDialogOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitChangeRequest} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-300">
                เนื่องจากคิวนี้มีกำหนดการไลฟ์ในอีก <strong>{daysUntilBooking} วัน (ต่ำกว่า 14 วัน)</strong> คำร้องนี้จะถูกส่งไปยัง <strong>"เมนูจัดการคำขอแก้ไข"</strong> เพื่อให้ผู้รับผิดชอบพิจารณาและอัปเดตระบบ
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {requestDialogType === 'edit' ? 'ระบุสิ่งที่ต้องการขอแก้ไข และเหตุผลความจำเป็น *' : 'ระบุเหตุผลการขอยกเลิกคิว *'}
                </label>
                <textarea
                  rows={4}
                  placeholder={requestDialogType === 'edit' 
                    ? "เช่น ขอเปลี่ยนเวลาเป็น 14:00 - 16:00 น. เนื่องจากสินค้าตัวอย่างมาส่งล่าช้า หรือขอเปลี่ยน MC เป็นคุณ..."
                    : "เช่น แบรนด์แจ้งเลื่อนแคมเปญกะทันหัน หรือมีปัญหาด้านสต็อกสินค้า"
                  }
                  value={requestDialogDetails}
                  onChange={(e) => setRequestDialogDetails(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestDialogOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={requestDialogSubmitting}
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                    requestDialogType === 'edit' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25' 
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {requestDialogSubmitting ? 'กำลังส่งคำร้อง...' : 'ยืนยันการส่งคำร้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
