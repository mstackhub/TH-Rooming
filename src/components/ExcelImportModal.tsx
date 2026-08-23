'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp, Booking } from '@/context/AppContext';
import { parseTimeToMinutes, generateBookingCustomId } from '@/utils/time';
import * as XLSX from 'xlsx';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Check,
  RefreshCw,
  PlusCircle,
  Edit3
} from 'lucide-react';

interface ParsedRow {
  index: number;
  bookingId?: string;
  displayCustomId?: string;
  date: string;
  roomName: string;
  startTime: string;
  endTime: string;
  brandName: string;
  campaignName: string;
  briefText: string;
  remark: string;
  mcName?: string;
  mcId?: string | null;
  isUpdateAction?: boolean;
  changesList?: string[];
  success: boolean;
  reason: string;
}

export default function ExcelImportModal() {
  const {
    isImportModalOpen,
    setIsImportModalOpen,
    rooms,
    brands,
    calendarBookings,
    apiCall,
    refreshActiveTabData,
    showToast,
    mcList
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [rawCSVRows, setRawCSVRows] = useState<string[][]>([]);

  // Automatically re-validate CSV rows if calendar bookings change (e.g. after clear)
  React.useEffect(() => {
    if (rawCSVRows.length > 0) {
      validateCSVBookings(rawCSVRows);
    }
  }, [calendarBookings]);

  const handleClose = () => {
    setFileName('');
    setParsedRows([]);
    setRawCSVRows([]);
    setIsImportModalOpen(false);
  };

  const handleDeleteAllBookings = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการจองทั้งหมดในระบบ? การดำเนินการนี้ไม่สามารถย้อนกลับได้")) {
      return;
    }
    
    setLoading(true);
    await apiCall('clearAllBookings', {}, async (err) => {
      if (err) {
        setLoading(false);
        showToast(err, "error");
      } else {
        showToast("ลบประวัติการจองทั้งหมดเรียบร้อยแล้ว", "success");
        await refreshActiveTabData();
        setLoading(false);
      }
    });
  };

  // CSV Row splitting parser
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row = [""];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i+1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  // Validate parsed rows
  const validateCSVBookings = (rawRows: string[][]) => {
    if (rawRows.length < 2) {
      showToast("ไฟล์นี้ไม่มีข้อมูลสำหรับนำเข้า", "error");
      return;
    }

    const headers = rawRows[0].map(h => h.trim().toLowerCase());
    
    // Column indices matching
    const idxId = headers.findIndex(h => h.includes('id') || h.includes('ไอดี') || h.includes('รหัส'));
    const idxDate = headers.findIndex(h => h.includes('วัน') || h.includes('date'));
    const idxRoom = headers.findIndex(h => h.includes('ห้อง') || h.includes('room'));
    const idxStart = headers.findIndex(h => h.includes('เริ่ม') || h.includes('start'));
    const idxEnd = headers.findIndex(h => h.includes('สิ้นสุด') || h.includes('end'));
    const idxBrand = headers.findIndex(h => h.includes('แบรนด์') || h.includes('brand'));
    const idxCampaign = headers.findIndex(h => h.includes('แคมเปญ') || h.includes('campaign'));
    const idxBrief = headers.findIndex(h => h.includes('บรีฟ') || h.includes('รายละเอียด') || h.includes('brief'));
    const idxRemark = headers.findIndex(h => h.includes('หมายเหตุ') || h.includes('remark'));
    const idxMc = headers.findIndex(h => h.includes('mc') || h.includes('พิธีกร'));

    if (idxDate === -1 || idxRoom === -1 || idxStart === -1 || idxEnd === -1 || idxBrand === -1) {
      showToast("คอลัมน์ในไฟล์ไม่ถูกต้องตามเทมเพลต กรุณาใช้ไฟล์ตัวอย่างที่กำหนดให้ดาวน์โหลด", "error");
      return;
    }

    const roomsList = rooms.map(r => r.name.toLowerCase().trim());
    const brandsList = brands.map(b => b.name.toLowerCase().trim());

    const rows: ParsedRow[] = [];
    
    for (let i = 1; i < rawRows.length; i++) {
      const cells = rawRows[i];
      // Skip empty row splits
      if (cells.length < 5 || !cells[idxDate] || !cells[idxRoom] || !cells[idxStart] || !cells[idxEnd] || !cells[idxBrand]) {
        continue;
      }

      const idVal = idxId !== -1 && cells[idxId] ? cells[idxId].trim() : '';
      const dateVal = cells[idxDate].trim();
      const roomVal = cells[idxRoom].trim();
      const startVal = cells[idxStart].trim();
      const endVal = cells[idxEnd].trim();
      const brandVal = cells[idxBrand].trim();
      const campaignVal = idxCampaign !== -1 && cells[idxCampaign] ? cells[idxCampaign].trim() : '';
      const briefVal = idxBrief !== -1 && cells[idxBrief] ? cells[idxBrief].trim() : '';
      const remarkVal = idxRemark !== -1 && cells[idxRemark] ? cells[idxRemark].trim() : '';
      const mcVal = idxMc !== -1 && cells[idxMc] ? cells[idxMc].trim() : '';

      const startMins = parseTimeToMinutes(startVal);
      const endMins = parseTimeToMinutes(endVal);

      let success = true;
      let reason = '';
      let resolvedMcId = '';

      // Check MC IDs
      if (mcVal) {
        const mcNames = mcVal.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        const resolvedIds: string[] = [];
        for (const name of mcNames) {
          const matched = mcList.find(m => m.name.toLowerCase().trim() === name);
          if (matched) {
            resolvedIds.push(matched.id);
          } else {
            success = false;
            reason = `ไม่พบรายชื่อ MC "${name}" ในระบบ`;
            break;
          }
        }
        resolvedMcId = resolvedIds.join(',');
      }

      // 1. Structural Checks
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        success = false;
        reason = 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD เช่น 2026-07-20';
      } else if (startMins === -1 || endMins === -1 || startMins >= endMins) {
        success = false;
        reason = 'ช่วงเวลาไม่ถูกต้อง เช่น 10:00 - 12:00';
      } else if (!roomsList.includes(roomVal.toLowerCase())) {
        success = false;
        reason = 'ไม่พบชื่อห้องสตูดิโอนี้ในระบบ';
      } else if (!brandsList.includes(brandVal.toLowerCase())) {
        success = false;
        reason = 'ไม่พบชื่อแบรนด์ลูกค้านี้ในระบบ';
      }

      // 2. Conflict database bookings: Check by ID first, then fallback to (date + room + start + end)
      let isUpdateAction = false;
      let matchedExistingBooking: Booking | null = null;
      const changesList: string[] = [];

      if (success) {
        // Step A: Search existing booking by Booking ID
        if (idVal) {
          const byId = calendarBookings.find(b => {
            if (b.status === 'Cancelled') return false;
            const customId = generateBookingCustomId(b, calendarBookings);
            return customId.toLowerCase() === idVal.toLowerCase() || b.id.toLowerCase() === idVal.toLowerCase();
          });
          if (byId) {
            matchedExistingBooking = byId;
            isUpdateAction = true;
          }
        }

        // Step B: Fallback search by exact (Date + Room + Start + End)
        if (!matchedExistingBooking) {
          const bySlot = calendarBookings.find(b => {
            if (b.status === 'Cancelled') return false;
            if (b.roomName.toLowerCase().trim() !== roomVal.toLowerCase() || b.date !== dateVal) return false;
            const bStart = parseTimeToMinutes(b.startTime);
            const bEnd = parseTimeToMinutes(b.endTime);
            return bStart === startMins && bEnd === endMins;
          });
          if (bySlot) {
            matchedExistingBooking = bySlot;
            isUpdateAction = true;
          }
        }

        // Step C: Check for overlapping collision with OTHER bookings
        const conflict = calendarBookings.find(b => {
          if (b.status === 'Cancelled') return false;
          if (matchedExistingBooking && b.id === matchedExistingBooking.id) return false;
          if (b.roomName.toLowerCase().trim() !== roomVal.toLowerCase() || b.date !== dateVal) return false;
          
          const bStart = parseTimeToMinutes(b.startTime);
          const bEnd = parseTimeToMinutes(b.endTime);
          return !(endMins <= bStart || startMins >= bEnd);
        });

        if (conflict) {
          success = false;
          reason = `ชนกับคิวแบรนด์ "${conflict.brandName}" (${conflict.startTime}-${conflict.endTime})`;
        }
      }

      // 3. Collision within the file rows
      if (success) {
        const fileConflict = rows.find(b => {
          if (b.roomName.toLowerCase().trim() !== roomVal.toLowerCase() || b.date !== dateVal) return false;
          const bStart = parseTimeToMinutes(b.startTime);
          const bEnd = parseTimeToMinutes(b.endTime);
          return !(endMins <= bStart || startMins >= bEnd);
        });

        if (fileConflict) {
          success = false;
          reason = `ชนกับคิวภายในไฟล์แถวที่ ${fileConflict.index} (${fileConflict.startTime}-${fileConflict.endTime})`;
        }
      }

      // 4. Compute diff / changes summary if it's an update
      if (success && isUpdateAction && matchedExistingBooking) {
        const prevMcNames = (() => {
          if (!matchedExistingBooking.mcId) return '';
          const ids = matchedExistingBooking.mcId.split(',').map(x => x.trim()).filter(Boolean);
          return ids.map(id => mcList.find(m => m.id === id)?.name).filter(Boolean).join(', ');
        })();

        if (mcVal && mcVal.toLowerCase() !== prevMcNames.toLowerCase()) {
          changesList.push(`🎤 MC: ${prevMcNames ? `เปลี่ยน "${prevMcNames}" ➔ "${mcVal}"` : `เพิ่ม "${mcVal}"`}`);
        }
        if (campaignVal && campaignVal !== matchedExistingBooking.campaignName) {
          changesList.push(`🏷️ แคมเปญ: "${matchedExistingBooking.campaignName || '-'}" ➔ "${campaignVal}"`);
        }
        if (matchedExistingBooking.roomName !== roomVal) {
          changesList.push(`🚪 ย้ายห้อง: ${matchedExistingBooking.roomName} ➔ ${roomVal}`);
        }
        if (matchedExistingBooking.startTime !== startVal || matchedExistingBooking.endTime !== endVal) {
          changesList.push(`🕒 เวลา: ${matchedExistingBooking.startTime}-${matchedExistingBooking.endTime} ➔ ${startVal}-${endVal}`);
        }
        if (briefVal && briefVal !== matchedExistingBooking.briefLink) {
          changesList.push(`📝 อัปเดตบรีฟ`);
        }
        if (remarkVal && remarkVal !== matchedExistingBooking.remark) {
          changesList.push(`💬 อัปเดตหมายเหตุ`);
        }

        if (changesList.length === 0) {
          changesList.push('ไม่มีข้อมูลเปลี่ยนแปลง (ข้อมูลตรงกับเดิม)');
        }
      }

      const rowDisplayId = idVal || (matchedExistingBooking ? generateBookingCustomId(matchedExistingBooking, calendarBookings) : generateBookingCustomId({ date: dateVal, roomName: roomVal, brandName: brandVal, startTime: startVal, endTime: endVal }, calendarBookings));

      rows.push({
        index: i,
        bookingId: idVal || (matchedExistingBooking ? matchedExistingBooking.id : undefined),
        displayCustomId: rowDisplayId,
        date: dateVal,
        roomName: roomVal,
        startTime: startVal,
        endTime: endVal,
        brandName: brandVal,
        campaignName: campaignVal || 'Live Streaming',
        briefText: briefVal,
        remark: remarkVal,
        mcName: mcVal,
        mcId: resolvedMcId || null,
        isUpdateAction, // Store the flag
        changesList,
        success,
        reason
      });
    }

    setParsedRows(rows);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');
    if (!isXlsx && !isCsv) {
      showToast("กรุณาเลือกไฟล์ .xlsx (Excel) หรือ .csv เท่านั้น", "warning");
      return;
    }
    setFileName(file.name);

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          // Convert all cells to string format
          const stringRows = jsonRows.map(row => (Array.isArray(row) ? row.map(cell => String(cell ?? '').trim()) : []));
          validateCSVBookings(stringRows);
        } catch (err: any) {
          showToast("ไม่สามารถเปิดอ่านไฟล์ Excel ได้: " + err.message, "error");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const raw = parseCSV(text);
          validateCSVBookings(raw);
        } catch (err: any) {
          showToast("ไม่สามารถเปิดอ่านไฟล์ CSV ได้: " + err.message, "error");
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  // Drag and drop event helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Stats
  const successCount = parsedRows.filter(r => r.success).length;
  const conflictCount = parsedRows.filter(r => !r.success).length;

  const isSubmitDisabled = successCount === 0 || conflictCount > 0;

  // Save Bulk Bookings
  const handleExecuteImport = async () => {
    const validList = parsedRows.filter(r => r.success);
    if (validList.length === 0) return;

    setLoading(true);

    const newCount = validList.filter(r => !r.isUpdateAction).length;
    const updateCount = validList.filter(r => r.isUpdateAction).length;

    const bookingsList = validList.map(r => ({
      id: r.bookingId || undefined,
      roomName: r.roomName,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      brandName: r.brandName,
      campaignName: r.campaignName,
      briefText: r.briefText,
      remark: r.remark,
      mcId: r.mcId || null,
      status: 'Confirmed'
    }));

    await apiCall('createBookingsBulk', { bookingsList }, (err) => {
      setLoading(false);
      if (err) {
        showToast("นำเข้าตารางคิวงานจองผิดพลาด: " + err, "error");
      } else {
        const msg = updateCount > 0 && newCount > 0
          ? `นำเข้าสำเร็จ! (สร้างคิวใหม่ ${newCount} คิว / อัปเดตข้อมูล ${updateCount} คิว)`
          : updateCount > 0
          ? `อัปเดตข้อมูลคิวจองเดิมสำเร็จทั้งหมด ${updateCount} คิว!`
          : `สร้างคิวจองใหม่สำเร็จทั้งหมด ${newCount} คิว!`;
        showToast(msg, "success");
        handleClose();
        refreshActiveTabData();
      }
    });
  };

  const handleDownloadTemplate = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'short' });

    // === Sheet 1: ตารางคิวจอง (Booking Schedule) ===
    const sheet1Data = [
      [
        'Booking ID',
        'Live Date',
        'Day',
        'Start Time',
        'End Time',
        'Room',
        'Brand',
        'Campaign Name',
        'MC Name',
        'Owner',
        'Artwork Link',
        'Booking Status',
        'Last Updated'
      ],
      [
        '', // Booking ID left empty for new booking
        formattedDate,
        dayOfWeek,
        '09:00',
        '12:00',
        rooms[0]?.name || '(Special) Onsite LIVE Streaming 1',
        brands[0]?.name || 'Aristotle',
        'Live Streaming Promo',
        mcList[0]?.name || 'อั้มอิ๊ง',
        'Master Admin',
        'https://drive.google.com/sample',
        'Confirmed',
        ''
      ],
      [
        '', // Booking ID left empty for new booking
        formattedDate,
        dayOfWeek,
        '13:00',
        '16:00',
        rooms[1]?.name || rooms[0]?.name || 'Room 02',
        brands[1]?.name || brands[0]?.name || 'Foremost',
        'Mid Month Live Event',
        mcList.slice(0, 2).map(m => m.name).join(', ') || 'แอน, มีน',
        'Master Admin',
        '',
        'Confirmed',
        ''
      ]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    ws1['!cols'] = [
      { wch: 22 }, // Booking ID
      { wch: 14 }, // Live Date
      { wch: 8 },  // Day
      { wch: 12 }, // Start Time
      { wch: 12 }, // End Time
      { wch: 32 }, // Room
      { wch: 22 }, // Brand
      { wch: 26 }, // Campaign Name
      { wch: 20 }, // MC Name
      { wch: 16 }, // Owner
      { wch: 30 }, // Artwork Link
      { wch: 14 }, // Booking Status
      { wch: 16 }  // Last Updated
    ];

    // === Sheet 2: คู่มือและข้อมูลอ้างอิง (Guide & Reference) ===
    const maxRefRows = Math.max(brands.length, rooms.length, mcList.length, 1);
    const sheet2Data: any[][] = [
      ['=== คู่มือและคำอธิบายการกรอกคอลัมน์ ===', '', '', ''],
      ['ชื่อคอลัมน์', 'ความจำเป็น', 'รูปแบบที่ถูกต้อง (Format)', 'คำอธิบายเพิ่มเติม'],
      ['Booking ID', 'ทางเลือก (Optional)', 'YYYYMMDDBrandSocialRoom (เช่น 20260823ARTTR01001)', '• สร้างคิวใหม่: ให้ "เว้นว่างไว้" ระบบจะสร้างรหัสให้อัตโนมัติ\n• อัปเดตข้อมูลเดิม: ให้ใส่ Booking ID เดิมจากที่ Export ออกมา'],
      ['Live Date', 'จำเป็น (Required)', 'YYYY-MM-DD (เช่น 2026-08-25)', 'วันที่จัดไลฟ์สด (ห้ามเว้นว่าง)'],
      ['Day', 'อัตโนมัติ', 'Mon, Tue, Wed, ...', 'ชื่อวันในสัปดาห์ (เว้นว่างได้)'],
      ['Start Time', 'จำเป็น (Required)', 'HH:MM (เช่น 09:00, 13:30)', 'เวลาเริ่มต้นไลฟ์ 24 ชม.'],
      ['End Time', 'จำเป็น (Required)', 'HH:MM (เช่น 12:00, 16:30)', 'เวลาสิ้นสุดไลฟ์ 24 ชม.'],
      ['Room', 'จำเป็น (Required)', 'ดูรายชื่อห้องในตารางด้านล่าง', 'ชื่อห้องสตูดิโอ (ต้องสะกดให้ตรงกับในระบบ)'],
      ['Brand', 'จำเป็น (Required)', 'ดูรายชื่อแบรนด์ในตารางด้านล่าง', 'ชื่อแบรนด์ลูกค้า (ต้องสะกดให้ตรงกับในระบบ)'],
      ['Campaign Name', 'ทางเลือก (Optional)', 'ข้อความ (เช่น 9.9 Mega Sale)', 'ชื่อแคมเปญไลฟ์ (หากเว้นว่าง ระบบจะใส่ Live Streaming)'],
      ['MC Name', 'ทางเลือก (Optional)', 'ดูรายชื่อ MC ในตารางด้านล่าง', 'ชื่อ MC (หากมีมากกว่า 1 คน ให้คั่นด้วยเครื่องหมายจุลภาค ,)'],
      ['Owner', 'ทางเลือก (Optional)', 'ชื่อผู้รับผิดชอบ', 'ชื่อผู้จอง (เว้นว่างได้)'],
      ['Artwork Link', 'ทางเลือก (Optional)', 'URL ลิงก์', 'ลิงก์เอกสาร บรีฟ หรือ Canva/Drive'],
      ['Booking Status', 'ทางเลือก (Optional)', 'Confirmed / Pending', 'สถานะการจอง (ค่าเริ่มต้นคือ Confirmed)'],
      [''],
      ['=== ข้อมูลอ้างอิงในระบบ (สามารถ Copy ชื่อไปวางในตารางได้เลย) ===', '', '', '', '', ''],
      ['ลำดับ', 'รายชื่อแบรนด์ลูกค้า (Brands)', 'ลำดับ', 'รายชื่อห้องสตูดิโอ (Rooms)', 'ลำดับ', 'รายชื่อ MC ทั้งหมด (MCs)']
    ];

    for (let r = 0; r < maxRefRows; r++) {
      sheet2Data.push([
        brands[r] ? r + 1 : '',
        brands[r]?.name || '',
        rooms[r] ? r + 1 : '',
        rooms[r]?.name || '',
        mcList[r] ? r + 1 : '',
        mcList[r]?.name || ''
      ]);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2['!cols'] = [
      { wch: 8 },  // No
      { wch: 28 }, // Brand Name
      { wch: 8 },  // No
      { wch: 34 }, // Room Name
      { wch: 8 },  // No
      { wch: 24 }  // MC Name
    ];

    // Build Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'ตารางคิวจอง');
    XLSX.utils.book_append_sheet(wb, ws2, 'คู่มือและข้อมูลอ้างอิง');

    // Download .xlsx file
    XLSX.writeFile(wb, 'th_booking_template.xlsx');
  };

  if (!isImportModalOpen) return null;

  const newRowsCount = parsedRows.filter(r => r.success && !r.isUpdateAction).length;
  const updateRowsCount = parsedRows.filter(r => r.success && r.isUpdateAction).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-[calc(100%-48px)] max-h-[640px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-2xl z-10 overflow-hidden mx-4">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between shrink-0 select-none">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-500" />
            นำเข้าตารางคิวงานจอง (Excel & CSV Import)
          </h3>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-650"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs text-slate-800 dark:text-slate-200">
          {/* Instructions banner */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl flex items-start justify-between gap-3 shadow-sm select-none">
            <div className="space-y-1">
              <span className="font-extrabold text-indigo-700 dark:text-indigo-400 block">เทมเพลต Excel พร้อมคู่มือ 2 Sheets ในตัว:</span>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-normal">
                กดดาวน์โหลดเทมเพลตเพื่อดูตารางคิวจอง (Sheet 1) และ <strong>คู่มือ + รายชื่อแบรนด์/ห้อง/MC อ้างอิง (Sheet 2)</strong> สามารถ Copy รายชื่อมาใส่ได้ทันที
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0 cursor-pointer text-[10px] shadow-sm shadow-indigo-500/10"
            >
              <Download className="w-3.5 h-3.5" /> เทมเพลต Excel (.xlsx)
            </button>
          </div>

          {/* Upload Box Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none ${
              dragActive 
                ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10' 
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 text-slate-400 dark:text-slate-650" />
            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
              {fileName ? `ไฟล์ที่เลือก: ${fileName}` : 'ลากไฟล์ Excel (.xlsx) หรือ CSV มาวางที่นี่ หรือคลิกเพื่ออัพโหลด'}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">รองรับทั้งไฟล์ Excel (.xlsx) และไฟล์ .csv (มี 2 Sheet พร้อมคู่มือในตัว)</span>
          </div>

          {/* Previews Container */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 font-extrabold text-xs">
                <span className="text-slate-700 dark:text-slate-350">ผลการตรวจสอบคิวงานในไฟล์:</span>
                <div className="flex items-center gap-2 text-[11px]">
                  {newRowsCount > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded-md font-bold">
                      ✨ สร้างใหม่ {newRowsCount} คิว
                    </span>
                  )}
                  {updateRowsCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-450 rounded-md font-bold">
                      ✏️ อัปเดต {updateRowsCount} คิว
                    </span>
                  )}
                  {conflictCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 dark:text-rose-450 rounded-md font-bold animate-pulse">
                      ❌ ติดขัด {conflictCount} คิว
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-56 shadow-inner">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold select-none sticky top-0 z-10">
                      <th className="p-2.5 w-10">แถว</th>
                      <th className="p-2.5">Booking ID</th>
                      <th className="p-2.5">วัน / เวลา / ห้อง</th>
                      <th className="p-2.5">แบรนด์ (แคมเปญ)</th>
                      <th className="p-2.5 w-28">ประเภท</th>
                      <th className="p-2.5">รายการเปลี่ยนแปลง / สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {parsedRows.map((row) => (
                      <tr 
                        key={row.index}
                        className={row.success 
                          ? (row.isUpdateAction ? "bg-amber-50/15 dark:bg-amber-950/10" : "bg-emerald-50/15 dark:bg-emerald-950/5")
                          : "bg-rose-50/15 dark:bg-rose-950/5"
                        }
                      >
                        <td className="p-2.5 font-bold text-slate-400">{row.index}</td>
                        <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400 select-all">
                          {row.displayCustomId || '-'}
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">{row.date}</span>
                            <span className="text-[9px] text-slate-400">{row.startTime}-{row.endTime} น. • {row.roomName}</span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-brand-600 dark:text-brand-400">{row.brandName}</span>
                            <span className="text-[9px] text-slate-400 truncate max-w-[150px]">{row.campaignName || '-'}</span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          {row.success ? (
                            row.isUpdateAction ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-450 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md text-[9px]">
                                <Edit3 className="w-3 h-3 shrink-0" /> อัปเดตคิวเดิม
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-450 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md text-[9px]">
                                <PlusCircle className="w-3 h-3 shrink-0" /> สร้างคิวใหม่
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 dark:text-rose-450 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md text-[9px]">
                              <XCircle className="w-3 h-3 shrink-0" /> ข้อผิดพลาด
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {row.success ? (
                            row.isUpdateAction ? (
                              <div className="flex flex-wrap gap-1">
                                {row.changesList && row.changesList.length > 0 ? (
                                  row.changesList.map((ch, idx) => (
                                    <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                                      {ch}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[9px]">ไม่มีการเปลี่ยนแปลง</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-450 font-bold text-[9px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 shrink-0" /> พร้อมบันทึกคิวจอง
                              </span>
                            )
                          ) : (
                            <span className="text-rose-500 dark:text-rose-450 font-bold text-[9px]">
                              {row.reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
          <button 
            type="button"
            onClick={handleDeleteAllBookings}
            disabled={loading}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            ลบการจองทั้งหมดในระบบ
          </button>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={handleClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              ปิด
            </button>
            
            <button 
              disabled={isSubmitDisabled || loading}
              onClick={handleExecuteImport}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center gap-1"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {loading ? 'กำลังนำเข้าข้อมูล...' : 'ยืนยันนำเข้าคิวจอง'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
