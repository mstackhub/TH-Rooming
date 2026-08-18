'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { parseTimeToMinutes, minutesToTimeStr } from '@/utils/time';
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
  ExternalLink
} from 'lucide-react';

export default function BookingModal() {
  const {
    activeBookingIdForEdit,
    setActiveBookingIdForEdit,
    activeBookingCreateData,
    setActiveBookingCreateData,
    rooms,
    brands,
    calendarBookings,
    currentUser,
    apiCall,
    refreshActiveTabData,
    showToast,
    setCurrentTab,
    setSelectedDate,
    setHighlightedBookingId,
    mcList,
    mcTiers
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [conflictMsg, setConflictMsg] = useState('');

  // Form Fields
  const [roomName, setRoomName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [brandName, setBrandName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [mcId, setMcId] = useState('');
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
      return calendarBookings.find(b => b.id === activeBookingIdForEdit) || null;
    }
    return null;
  }, [isEditMode, activeBookingIdForEdit, calendarBookings]);

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
        setMcId(matchedBooking.mcId || '');

        // Parse readiness statuses from lsArtworkLayout JSON
        let bStatus = 'Not Added';
        let aStatus = 'Not Added';
        let aLink = '';
        let updDate = '';
        let updBy = '';

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
        setMcId('');
      }
    }
  }, [isOpen, activeBookingIdForEdit, activeBookingCreateData]);

  if (!isOpen) return null;

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
      lastUpdatedBy: currentUser?.name || currentUser?.email || 'System'
    });

    const bookingPayload = {
      roomName,
      date,
      startTime,
      endTime,
      brandName,
      campaignName: campaignName.trim(),
      briefText: briefText.trim(),
      briefLink: briefLink.trim(),
      lsArtworkLayout: lsArtworkLayoutPayload,
      status: bookingStatus,
      remark: remark.trim(),
      mcId: mcId || null
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
      briefLnk: briefLink,
      rem: remark,
      bStatus: briefStatus,
      aStatus: artworkStatus,
      aLink: artworkLink,
      mcId: mcId
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
      setBriefLink(copyData.briefLnk);
      setRemark(copyData.rem);
      setBriefStatus(copyData.bStatus);
      setArtworkStatus(copyData.aStatus);
      setArtworkLink(copyData.aLink);
      setMcId(copyData.mcId);
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
  const isOwner = isEditMode && matchedBooking && matchedBooking.ownerEmail?.toLowerCase() === currentUser?.email?.toLowerCase();

  const canSave = isEditMode 
    ? (currentUser?.permissions?.canEditBooking && (isAdmin || isOwner)) 
    : currentUser?.permissions?.canCreateBooking;
    
  const canCancel = isEditMode && currentUser?.permissions?.canCancelBooking && (isAdmin || isOwner);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end animate-in fade-in duration-200">
      {/* Black backdrop */}
      <div 
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      />

      {/* Slide Drawer Panel */}
      <div 
        id="booking-modal-panel"
        className={`relative w-full max-w-lg h-full glass-modal bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xl z-10 transition-transform duration-300 transform translate-x-0 ${
          isShake ? 'animate-shake' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-500" />
              {isEditMode ? 'รายละเอียดและจัดการคิวไลฟ์' : 'สร้างรายการจองห้องไลฟ์สดใหม่'}
            </h3>
            {isEditMode && matchedBooking && (
              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                ผู้จอง: {matchedBooking.ownerName} ({matchedBooking.ownerEmail})
              </span>
            )}
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200">
          
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ห้องสตูดิโอ (Live Studio Room)</label>
                <select
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  disabled={!canSave}
                  className="w-full text-xs font-semibold"
                >
                  {rooms.filter(r => r.status === 'Active' || r.name === roomName).map(r => (
                    <option key={r.id} value={r.name}>{r.name}{r.status === 'Inactive' ? ' (ปิดใช้งาน)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Date Picker */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">วันที่จองห้องไลฟ์สด (Live Date)</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!canSave}
                  className="w-full text-xs font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Time selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">เวลาเริ่มไลฟ์สด (Start Time)</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!canSave}
                  className="w-full text-xs font-semibold"
                >
                  {hourOptions.map(slot => {
                    const slotMins = parseTimeToMinutes(slot);
                    // Check if slot falls within any booking time range for the selected date & room
                    const isOccupied = calendarBookings.some(b => {
                      if (b.status === 'Cancelled') return false;
                      if (isEditMode && matchedBooking && b.id === matchedBooking.id) return false;
                      if (b.date !== date || b.roomName !== roomName) return false;
                      
                      const start = parseTimeToMinutes(b.startTime);
                      const end = parseTimeToMinutes(b.endTime);
                      // If slot is inside start <= slot < end, it is occupied
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">เวลาจบการไลฟ์ (End Time)</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!canSave}
                  className="w-full text-xs font-semibold"
                >
                  {hourOptions.map(slot => {
                    const slotMins = parseTimeToMinutes(slot);
                    // Check if slot falls within any booking time range for the selected date & room
                    const isOccupied = calendarBookings.some(b => {
                      if (b.status === 'Cancelled') return false;
                      if (isEditMode && matchedBooking && b.id === matchedBooking.id) return false;
                      if (b.date !== date || b.roomName !== roomName) return false;
                      
                      const start = parseTimeToMinutes(b.startTime);
                      const end = parseTimeToMinutes(b.endTime);
                      // If slot is inside start < slot <= end, it is occupied
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
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">แบรนด์สินค้า (Brand Partner)</label>
              <select
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={!canSave}
                className="w-full text-xs font-semibold"
              >
                {brands.filter(b => b.status === 'Active' || b.name === brandName).map(b => (
                  <option key={b.id} value={b.name}>{b.name}{b.status === 'Inactive' ? ' (ปิดใช้งาน)' : ''}</option>
                ))}
              </select>
            </div>

            {/* MC Live selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">เลือก MC ไลฟ์สด (MC Live)</label>
              <select
                value={mcId}
                onChange={(e) => setMcId(e.target.value)}
                disabled={!canSave}
                className="w-full text-xs font-semibold"
              >
                <option value="">-- ไม่เลือก / ไม่ระบุ (No MC selected) --</option>
                {mcTiers.map(tier => {
                  const mcsInTier = mcList.filter(mc => mc.tierId === tier.id && (mc.status === 'Active' || mc.id === mcId));
                  if (mcsInTier.length === 0) return null;
                  return (
                    <optgroup key={tier.id} label={tier.name}>
                      {mcsInTier.map(mc => (
                        <option key={mc.id} value={mc.id}>
                          {mc.name}{mc.status === 'Inactive' ? ' (ปิดการใช้งาน)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Campaign Name input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ชื่อแคมเปญ / หัวข้อไลฟ์ (Campaign Name)</label>
              <input
                type="text"
                placeholder="เช่น 7.7 Mid Year Sale, Live เปิดตัวสินค้า"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                disabled={!canSave}
                className="w-full text-xs font-semibold"
              />
            </div>

            {/* Brief Label */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">รายละเอียด</label>
              <input
                type="text"
                placeholder="เช่น สเปคสินค้า, รายละเอียดไลฟ์"
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                disabled={!canSave}
                className="w-full text-xs font-semibold"
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ลิงค์ส่งงานอาร์ตเวิร์ก (Artwork URL Link)</label>
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
                  disabled={!canSave}
                  className="w-full text-xs font-semibold"
                />
              </div>

              {/* Last updated timestamp */}
              {isEditMode && lastUpdated && (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic flex items-center gap-1 select-none">
                  <span>แก้ไขล่าสุดเมื่อ: {new Date(lastUpdated).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
                  {lastUpdatedBy && <span>โดย {lastUpdatedBy}</span>}
                </div>
              )}
            </div>

            {/* Remarks input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">หมายเหตุคำขออื่นๆ (Remarks)</label>
              <textarea
                placeholder="เช่น ต้องการกล้องสเปคพิเศษ หรือขอแอดมินสนับสนุนเพิ่มเติม"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                disabled={!canSave}
                className="w-full text-xs"
              />
            </div>

            {/* Modal Actions controls */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 select-none text-xs">
              {/* Primary Save Button (Full Width) */}
              {canSave && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> {loading ? 'กำลังบันทึก...' : 'บันทึกรายการจอง'}
                </button>
              )}

              {/* Utility Row (Two Columns) */}
              <div className="grid grid-cols-2 gap-2.5">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleGoToScheduler}
                    className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
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

              {/* Danger Zone: Cancel Booking (Full Width) */}
              {canCancel && (
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
    </div>
  );
}
