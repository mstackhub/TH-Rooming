'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { parseTimeToMinutes } from '@/utils/time';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Check,
  RefreshCw
} from 'lucide-react';

interface ParsedRow {
  index: number;
  date: string;
  roomName: string;
  startTime: string;
  endTime: string;
  brandName: string;
  campaignName: string;
  briefText: string;
  remark: string;
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
    showToast
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
    const idxDate = headers.findIndex(h => h.includes('วัน') || h.includes('date'));
    const idxRoom = headers.findIndex(h => h.includes('ห้อง') || h.includes('room'));
    const idxStart = headers.findIndex(h => h.includes('เริ่ม') || h.includes('start'));
    const idxEnd = headers.findIndex(h => h.includes('สิ้นสุด') || h.includes('end'));
    const idxBrand = headers.findIndex(h => h.includes('แบรนด์') || h.includes('brand'));
    const idxCampaign = headers.findIndex(h => h.includes('แคมเปญ') || h.includes('campaign'));
    const idxBrief = headers.findIndex(h => h.includes('บรีฟ') || h.includes('รายละเอียด') || h.includes('brief'));
    const idxRemark = headers.findIndex(h => h.includes('หมายเหตุ') || h.includes('remark'));

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

      const dateVal = cells[idxDate].trim();
      const roomVal = cells[idxRoom].trim();
      const startVal = cells[idxStart].trim();
      const endVal = cells[idxEnd].trim();
      const brandVal = cells[idxBrand].trim();
      const campaignVal = idxCampaign !== -1 && cells[idxCampaign] ? cells[idxCampaign].trim() : '';
      const briefVal = idxBrief !== -1 && cells[idxBrief] ? cells[idxBrief].trim() : '';
      const remarkVal = idxRemark !== -1 && cells[idxRemark] ? cells[idxRemark].trim() : '';

      const startMins = parseTimeToMinutes(startVal);
      const endMins = parseTimeToMinutes(endVal);

      let success = true;
      let reason = '';

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

      // 2. Conflict database bookings
      if (success) {
        const conflict = calendarBookings.find(b => {
          if (b.status === 'Cancelled') return false;
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

      rows.push({
        index: i,
        date: dateVal,
        roomName: roomVal,
        startTime: startVal,
        endTime: endVal,
        brandName: brandVal,
        campaignName: campaignVal || 'Live Streaming',
        briefText: briefVal,
        remark: remarkVal,
        success,
        reason
      });
    }

    setParsedRows(rows);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showToast("กรุณาเลือกเฉพาะไฟล์สกุล .csv เท่านั้น", "warning");
      return;
    }
    setFileName(file.name);
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

    const bookingsList = validList.map(r => ({
      roomName: r.roomName,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      brandName: r.brandName,
      campaignName: r.campaignName,
      briefText: r.briefText,
      remark: r.remark,
      status: 'Confirmed'
    }));

    await apiCall('createBookingsBulk', { bookingsList }, (err) => {
      setLoading(false);
      if (err) {
        showToast("นำเข้าตารางคิวงานจองผิดพลาด: " + err, "error");
      } else {
        showToast(`นำเข้าคิวจองสำเร็จทั้งหมด ${validList.length} คิวงานแล้ว!`, "success");
        handleClose();
        refreshActiveTabData();
      }
    });
  };

  // Download template snippet
  const handleDownloadTemplate = () => {
    const headers = "Date,Room,Start Time,End Time,Brand,Campaign,Brief Tag,Brief Link,Remark\n";
    const example = `${new Date().toISOString().split('T')[0]},Room 01,09:00,10:00,Bau,7.7 Mid Year Sale,สเปคสินค้า,https://canva.com,จองผ่านเทมเพลต Excel\n`;
    
    // Attach BOM for Excel UTF-8 display compatibility
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), headers + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "th_booking_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isImportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl h-[calc(100%-48px)] max-h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-2xl z-10 overflow-hidden mx-4">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between shrink-0 select-none">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-500" />
            นำเข้าตารางคิวงานจอง (Bulk CSV Import)
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
              <span className="font-extrabold text-indigo-700 dark:text-indigo-400 block">คู่มือคำแนะนำการนำเข้าคิวจอง:</span>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-normal">
                กรุณาดาวน์โหลดไฟล์เทมเพลตตัวอย่างด้านขวา และทำการระบุข้อมูลวันที่เป็นรูปแบบ <strong>YYYY-MM-DD</strong>, 
                ชั่วโมงเวลาไลฟ์เป็นรูปแบบ <strong>HH:MM</strong> พร้อมระบุชื่อห้องและแบรนด์สะกดให้ตรงกับฐานข้อมูลสตูดิโอ
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0 cursor-pointer text-[10px] shadow-sm shadow-indigo-500/10"
            >
              <Download className="w-3.5 h-3.5" /> เทมเพลต CSV
            </button>
          </div>

          {/* Upload Box Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none ${
              dragActive 
                ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10' 
                : 'border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-800 bg-slate-50/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 text-slate-400 dark:text-slate-650" />
            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs mt-1">
              {fileName ? `ไฟล์ที่เลือก: ${fileName}` : 'ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่ออัพโหลดไฟล์'}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">รองรับเฉพาะสกุลไฟล์ .CSV (UTF-8)</span>
          </div>

          {/* Previews Container */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-extrabold">
                <span className="text-slate-700 dark:text-slate-350">ตารางรีวิวพรีวิวการตรวจสอบความถูกต้องคิวงาน:</span>
                <span className={conflictCount > 0 ? "text-rose-500 animate-pulse" : "text-emerald-500"}>
                  {`พร้อมจอง ${successCount} คิว / มีปัญหาติดขัด ${conflictCount} คิว`}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-48">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold select-none sticky top-0">
                      <th className="p-2.5">แถว</th>
                      <th className="p-2.5">วันที่ไลฟ์</th>
                      <th className="p-2.5">ห้องสตูดิโอ</th>
                      <th className="p-2.5">เวลาคิวไลฟ์</th>
                      <th className="p-2.5">แบรนด์ (แคมเปญ)</th>
                      <th className="p-2.5">ผลการตรวจสอบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {parsedRows.map((row) => (
                      <tr 
                        key={row.index}
                        className={row.success 
                          ? "bg-emerald-50/15 dark:bg-emerald-950/5 text-slate-800 dark:text-slate-300"
                          : "bg-rose-50/15 dark:bg-rose-950/5 text-slate-800 dark:text-slate-300"
                        }
                      >
                        <td className="p-2.5 font-bold text-slate-400">{row.index}</td>
                        <td className="p-2.5 font-bold">{row.date}</td>
                        <td className="p-2.5 font-extrabold text-slate-900 dark:text-white">{row.roomName}</td>
                        <td className="p-2.5 font-semibold">{row.startTime} - {row.endTime} น.</td>
                        <td className="p-2.5 font-bold text-brand-600 dark:text-brand-400">
                          {row.brandName} <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">({row.campaignName})</span>
                        </td>
                        <td className="p-2.5">
                          {row.success ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-450 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> พร้อมจอง
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-500 dark:text-rose-450 font-bold">
                              <XCircle className="w-3.5 h-3.5 shrink-0" /> {row.reason}
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
