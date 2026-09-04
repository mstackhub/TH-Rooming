import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const BRANDS_LIST = [
  "Fineline - AI",
  "Fineline",
  "Tros",
  "Benice",
  "Dnee",
  "Jabs-Beauty",
  "Eversense",
  "Babimild",
  "Jabs-Tissue",
  "DNEE FB+SHP",
  "BioSafety",
  "Bonny bliss",
  "Big C",
  "Neo Beauty",
  "BetagroPet",
  "BEO",
  "Yassia",
  "Taupe",
  "Glory",
  "TandT",
  "Aristotle",
  "Hi-Q",
  "Oceanglass",
  "Kemissara",
  "Foremost",
  "Bostanten",
  "Club21",
  "Evony",
  "Subi",
  "Royal Canin"
];

async function getExistingBrands() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
  }
  const url = `${supabaseUrl}/rest/v1/brands?select=name`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch error ${res.status}: ${text}`);
  }
  return res.json();
}

async function postSupabase(path: string, data: any) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
  }
  const url = `${supabaseUrl}/rest/v1/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return { success: true };
}

const MOCK_BOOKINGS = [
  // Day 1: 2026-08-24
  { room_name: '(Special) Onsite LIVE Streaming 1', date: '2026-08-24', start_time: '09:00', end_time: '12:00', brand_name: 'Babimild', campaign_name: 'Baby Care Mega Live 8.24', brief_text: 'เน้นโปรโมชั่นครีมอาบน้ำเด็กและแป้งเด็กออร์แกนิค', brief_link: 'https://drive.google.com/sample-brief-1', ls_artwork_layout: 'Layout A (Theme Pastel Blue)', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'เตรียมฉากโทนสีฟ้าพาสเทล พร้อมของเล่นเด็กประกอบฉาก' },
  { room_name: '(Special) Onsite LIVE Streaming 2', date: '2026-08-24', start_time: '13:00', end_time: '16:00', brand_name: 'Dnee', campaign_name: 'Dnee Organic Special Session', brief_text: 'เปิดตัวผลิตภัณฑ์ซักผ้าเด็กกลิ่นใหม่', brief_link: 'https://drive.google.com/sample-brief-2', ls_artwork_layout: 'Layout B (Clean & Green)', owner_email: 'admintest', owner_name: 'admintest', status: 'Confirmed', remark: 'ต้องการไมค์ไวเลส 2 ตัวสำหรับพิธีกรคู่' },
  { room_name: 'Studio 1', date: '2026-08-24', start_time: '10:00', end_time: '13:00', brand_name: 'Fineline', campaign_name: 'Fineline Joy of Wash Live', brief_text: 'สาธิตพลังซักขจัดคราบและกลิ่นหอมติดทนนาน', brief_link: 'https://drive.google.com/sample-brief-3', ls_artwork_layout: 'Layout C (Vibrant Pink)', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'มีโต๊ะทดลองซักผ้าและตัวอย่างผ้าทดสอบ' },
  { room_name: 'Studio 2', date: '2026-08-24', start_time: '14:00', end_time: '17:00', brand_name: 'Benice', campaign_name: 'Benice Glowing Skin Shower Live', brief_text: 'โปรโมชั่นซื้อ 1 แถม 1 สบู่เหลวอาบน้ำ', brief_link: 'https://drive.google.com/sample-brief-4', ls_artwork_layout: 'Layout A (Rose Gold Tone)', owner_email: 'sarah.p@th.com', owner_name: 'Sarah Jenkins', status: 'Confirmed', remark: 'เตรียมมุมจัดวางผลิตภัณฑ์แบบไล่ระดับเฉดสี' },
  { room_name: 'Studio 3', date: '2026-08-24', start_time: '18:00', end_time: '21:00', brand_name: 'Tros', campaign_name: 'Tros Men Sport Fresh Rush', brief_text: 'เซ็ตผลิตภัณฑ์ดูแลผิวและน้ำหอมสำหรับผู้ชาย', brief_link: 'https://drive.google.com/sample-brief-5', ls_artwork_layout: 'Layout B (Sport Neon Black)', owner_email: 'alex.m@th.com', owner_name: 'Alex Morgan', status: 'Confirmed', remark: 'ไฟสตูดิโอเซ็ตเป็นโทน Cool Dark & Blue Neon' },
  { room_name: 'Shopee Studio A', date: '2026-08-24', start_time: '19:00', end_time: '22:00', brand_name: 'Jabs-Beauty', campaign_name: 'Jabs Wipes Flash Sale 8.24', brief_text: 'ทิชชู่เปียกสูตรอ่อนโยน Flash Sale ลด 50%', brief_link: 'https://drive.google.com/sample-brief-6', ls_artwork_layout: 'Layout Shopee Live Orange', owner_email: 'staff01@th.com', owner_name: 'Natthaporn S.', status: 'Confirmed', remark: 'ต่อระบบ OBS กับ Shopee Live Streaming' },
  { room_name: 'TikTok Studio 1', date: '2026-08-24', start_time: '20:00', end_time: '23:00', brand_name: 'Eversense', campaign_name: 'Eversense Chic Perfume Night', brief_text: 'น้ำหอมโคโลญจน์รุ่นลิมิเต็ด แจกโค้ด TikTok ลด 100.-', brief_link: 'https://drive.google.com/sample-brief-7', ls_artwork_layout: 'Layout TikTok Vertical Standard', owner_email: 'admintest', owner_name: 'admintest', status: 'Confirmed', remark: 'ตั้งค่ากล้องแนวตั้ง 9:16 ความละเอียด 1080p60' },

  // Day 2: 2026-08-25
  { room_name: 'Studio 1', date: '2026-08-25', start_time: '09:00', end_time: '12:00', brand_name: 'BioSafety', campaign_name: 'Oral Health Protection Day', brief_text: 'แปรงสีฟันและยาสีฟันเพื่อสุขภาพเหงือกที่ดี', brief_link: 'https://drive.google.com/sample-brief-8', ls_artwork_layout: 'Layout Dental Fresh Medical', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'จัดแท่นวางโมเดลฟันและผลิตภัณฑ์ตัวอย่าง' },
  { room_name: 'Studio 2', date: '2026-08-25', start_time: '11:00', end_time: '14:00', brand_name: 'Big C', campaign_name: 'Big C Fresh Mart Midday Live', brief_text: 'โปรโมชั่นสินค้าอุปโภคบริโภคราคาส่ง', brief_link: 'https://drive.google.com/sample-brief-9', ls_artwork_layout: 'Layout Supermarket Cart Theme', owner_email: 'admintest', owner_name: 'admintest', status: 'Confirmed', remark: 'มีพร็อพรถเข็น Big C ขนาดจำลอง' },
  { room_name: 'Studio 4', date: '2026-08-25', start_time: '13:30', end_time: '16:30', brand_name: 'Neo Beauty', campaign_name: 'Neo Beauty Summer Glam Makeup', brief_text: 'สอนแต่งหน้าลุคซัมเมอร์ด้วยเครื่องสำอางกันน้ำ', brief_link: 'https://drive.google.com/sample-brief-10', ls_artwork_layout: 'Layout Beauty Vanity Mirror', owner_email: 'sarah.p@th.com', owner_name: 'Sarah Jenkins', status: 'Confirmed', remark: 'ต้องการไฟ Ring Light และกระจกแต่งหน้าไฟ LED' },
  { room_name: 'Shopee Studio B', date: '2026-08-25', start_time: '15:00', end_time: '18:00', brand_name: 'BetagroPet', campaign_name: 'Betagro Pet Food Premium Live', brief_text: 'อาหารสุนัขและแมวเกรดพรีเมียม ส่งฟรีทั่วไทย', brief_link: 'https://drive.google.com/sample-brief-11', ls_artwork_layout: 'Layout Pet Playground', owner_email: 'alex.m@th.com', owner_name: 'Alex Morgan', status: 'Confirmed', remark: 'มีน้องสุนัขร่วมเข้าฉากไลฟ์ 1 ตัว' },
  { room_name: 'TikTok Studio 2', date: '2026-08-25', start_time: '18:00', end_time: '21:00', brand_name: 'BEO', campaign_name: 'BEO Official Store Opening Special', brief_text: 'อุปกรณ์สมาร์ทโฮมและไลฟ์สไตล์ไอที', brief_link: 'https://drive.google.com/sample-brief-12', ls_artwork_layout: 'Layout Tech Modern Dark', owner_email: 'staff01@th.com', owner_name: 'Natthaporn S.', status: 'Confirmed', remark: 'มีจอมอนิเตอร์พรีเซนต์ฟีเจอร์สินค้าต่อตรง' },
  { room_name: '(Special) Onsite LIVE Streaming 1', date: '2026-08-25', start_time: '19:00', end_time: '22:30', brand_name: 'Royal Canin', campaign_name: 'Royal Canin Nutrition First Expo', brief_text: 'สูตรอาหารเฉพาะสายพันธุ์ แนะนำโดยสัตวแพทย์', brief_link: 'https://drive.google.com/sample-brief-13', ls_artwork_layout: 'Layout Vet Clinic Style', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'สัตวแพทย์รับเชิญร่วมไลฟ์ 1 ท่าน' },

  // Day 3: 2026-08-26
  { room_name: 'Studio 3', date: '2026-08-26', start_time: '09:30', end_time: '12:30', brand_name: 'Yassia', campaign_name: 'Yassia Fashion Live Autumn 2026', brief_text: 'คอลเลกชันเสื้อผ้าทำงานและเดรสผ้าลินิน', brief_link: 'https://drive.google.com/sample-brief-14', ls_artwork_layout: 'Layout Boutique Studio Minimal', owner_email: 'sarah.p@th.com', owner_name: 'Sarah Jenkins', status: 'Confirmed', remark: 'เตรียมราวแขวนผ้าและมุมเปลี่ยนชุดด้านหลัง' },
  { room_name: 'Studio 5', date: '2026-08-26', start_time: '11:00', end_time: '14:00', brand_name: 'Taupe', campaign_name: 'Taupe Minimalist Collection Showcase', brief_text: 'กระเป๋าและเครื่องประดับสไตล์มินิมอลโมเดิร์น', brief_link: 'https://drive.google.com/sample-brief-15', ls_artwork_layout: 'Layout Art Gallery Concrete', owner_email: 'alex.m@th.com', owner_name: 'Alex Morgan', status: 'Confirmed', remark: 'จัดไฟแบบนุ่มนวล High-Key Lighting' },
  { room_name: 'Studio 1', date: '2026-08-26', start_time: '14:00', end_time: '17:00', brand_name: 'Glory', campaign_name: 'Glory Collagen Boost Live Stream', brief_text: 'คอลลาเจนไดเปปไทด์ผิวใส ซื้อ 2 กระปุกแถมวิตซี', brief_link: 'https://drive.google.com/sample-brief-16', ls_artwork_layout: 'Layout Healthy Pink Shine', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'เตรียมแก้วน้ำและตัวอย่างชงดื่มจริง' },
  { room_name: 'Shopee Studio A', date: '2026-08-26', start_time: '16:30', end_time: '19:30', brand_name: 'TandT', campaign_name: 'TandT Chic Brand Launch On-Air', brief_text: 'แบรนด์เสื้อผ้าสตรีทแวร์รุ่นใหม่ล่าสุด', brief_link: 'https://drive.google.com/sample-brief-17', ls_artwork_layout: 'Layout Urban Street Loft', owner_email: 'admintest', owner_name: 'admintest', status: 'Confirmed', remark: 'เปิดเพลง Background Track สไตล์ Lo-fi' },
  { room_name: 'TikTok Studio 1', date: '2026-08-26', start_time: '19:00', end_time: '22:00', brand_name: 'Aristotle', campaign_name: 'Aristotle Rose Bag Special Edition', brief_text: 'กระเป๋าดอกกุหลาบซิกเนเจอร์รุ่นฮิต', brief_link: 'https://drive.google.com/sample-brief-18', ls_artwork_layout: 'Layout Floral Rose Studio', owner_email: 'staff01@th.com', owner_name: 'Natthaporn S.', status: 'Confirmed', remark: 'จัดฉากดอกไม้สดประดับรอบโต๊ะวางสินค้า' },
  { room_name: '(Special) Onsite LIVE Streaming 2', date: '2026-08-26', start_time: '20:00', end_time: '23:00', brand_name: 'Hi-Q', campaign_name: 'Hi-Q Super Gold Live Family Camp', brief_text: 'นมผงสูตรพัฒนาการสมอง แจกของแถมเสริมทักษะ', brief_link: 'https://drive.google.com/sample-brief-19', ls_artwork_layout: 'Layout Kids Wonderland', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'มีของเล่นเสริมทักษะวางโชว์ประกอบรายการ' },

  // Day 4: 2026-08-27
  { room_name: 'Studio 2', date: '2026-08-27', start_time: '09:00', end_time: '12:00', brand_name: 'Oceanglass', campaign_name: 'Ocean Glassware Dining Style Live', brief_text: 'แก้วไวน์และชุดจานชามสำหรับดินเนอร์หรู', brief_link: 'https://drive.google.com/sample-brief-20', ls_artwork_layout: 'Layout Dining Table Luxury', owner_email: 'sarah.p@th.com', owner_name: 'Sarah Jenkins', status: 'Confirmed', remark: 'เตรียมโต๊ะอาหารปูผ้าดำพร้อมแก้วเช็ตเต็มรูปแบบ' },
  { room_name: 'Studio 4', date: '2026-08-27', start_time: '13:00', end_time: '16:00', brand_name: 'Kemissara', campaign_name: 'Kemissara Runway at Home Live', brief_text: 'เสื้อผ้าดีไซเนอร์แบรนด์ไทย ลดพิเศษเฉพาะในไลฟ์', brief_link: 'https://drive.google.com/sample-brief-21', ls_artwork_layout: 'Layout Runway White Minimal', owner_email: 'alex.m@th.com', owner_name: 'Alex Morgan', status: 'Confirmed', remark: 'ต้องการนางแบบลองชุด 1 คน' },
  { room_name: 'Shopee Studio B', date: '2026-08-27', start_time: '15:30', end_time: '18:30', brand_name: 'Foremost', campaign_name: 'Foremost Omega 9 Family Fun Live', brief_text: 'นมยูเอชทีสูตรโอเมก้า 3 6 9 ซื้อยกลังคุ้มที่สุด', brief_link: 'https://drive.google.com/sample-brief-22', ls_artwork_layout: 'Layout Farm & Nature Fresh', owner_email: 'admintest', owner_name: 'admintest', status: 'Confirmed', remark: 'มีเกมตอบคำถามชิงรางวัลในไลฟ์' },
  { room_name: 'TikTok Studio 2', date: '2026-08-27', start_time: '18:00', end_time: '21:00', brand_name: 'Bostanten', campaign_name: 'Bostanten Leather Goods Showcase', brief_text: 'กระเป๋าสตางค์และเข็มขัดหนังแท้สำหรับสุภาพบุรุษ', brief_link: 'https://drive.google.com/sample-brief-23', ls_artwork_layout: 'Layout Classic Wood & Leather', owner_email: 'staff01@th.com', owner_name: 'Natthaporn S.', status: 'Confirmed', remark: 'จัดไฟเน้น Texture ของงานหนังแท้' },
  { room_name: 'Studio 6', date: '2026-08-27', start_time: '19:30', end_time: '22:30', brand_name: 'Club21', campaign_name: 'Club21 Luxury Midnight Session', brief_text: 'แบรนด์เนมนำเข้า คอลเลกชันลดราคาประจำเดือน', brief_link: 'https://drive.google.com/sample-brief-24', ls_artwork_layout: 'Layout High-End Luxury Dark Gold', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'มีเจ้าหน้าที่ความปลอดภัยดูแลสินค้าแบรนด์เนม' },

  // Day 5: 2026-08-28 (Mega Payday)
  { room_name: 'Studio 1', date: '2026-08-28', start_time: '10:00', end_time: '13:00', brand_name: 'Evony', campaign_name: 'Evony Soft Touch Mask Payday Live', brief_text: 'หน้ากากอนามัยเกรดการแพทย์แบบระบายอากาศดี', brief_link: 'https://drive.google.com/sample-brief-25', ls_artwork_layout: 'Layout Medical Clean Green', owner_email: 'sarah.p@th.com', owner_name: 'Sarah Jenkins', status: 'Confirmed', remark: 'จัดแพ็คเกจยกลังพร้อมส่ง' },
  { room_name: 'Studio 3', date: '2026-08-28', start_time: '13:00', end_time: '16:00', brand_name: 'Subi', campaign_name: 'Subi Korean Snack Party Mega Live', brief_text: 'ขนมและบะหมี่กึ่งสำเร็จรูปยอดนิยมจากเกาหลี', brief_link: 'https://drive.google.com/sample-brief-26', ls_artwork_layout: 'Layout K-Food Street Vibe', owner_email: 'admintest', owner_name: 'admintest', status: 'Confirmed', remark: 'มีหม้อต้มรามยอนสาธิตการทำสด' },
  { room_name: 'Shopee Studio A', date: '2026-08-28', start_time: '16:00', end_time: '19:00', brand_name: 'Babimild', campaign_name: 'Babimild Payday Super Deals Live', brief_text: 'โปรโมชั่นวันเงินเดือนออก ยอดสั่งซื้อสูงสุดรับทอง', brief_link: 'https://drive.google.com/sample-brief-27', ls_artwork_layout: 'Layout Payday Grand Stage', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'ขึ้นกราฟิกนับถอยหลัง Flash Sale ทุกๆ 30 นาที' },
  { room_name: 'TikTok Studio 1', date: '2026-08-28', start_time: '19:00', end_time: '22:00', brand_name: 'Dnee', campaign_name: 'Dnee Kids Fun Live Streaming 8.28', brief_text: 'รวมไอเทมยอดฮิตของคุณแม่ แจกคูปองส่วนลด 200.-', brief_link: 'https://drive.google.com/sample-brief-28', ls_artwork_layout: 'Layout Party Balloon Theme', owner_email: 'staff01@th.com', owner_name: 'Natthaporn S.', status: 'Confirmed', remark: 'มีลูกโป่งตกแต่งฉากสตรีม' },
  { room_name: '(Special) Onsite LIVE Streaming 1', date: '2026-08-28', start_time: '20:00', end_time: '23:30', brand_name: 'Fineline', campaign_name: 'Fineline 8.28 Midnight Mega Sale Live', brief_text: 'ดีลเด็ดเที่ยงคืน น้ำยาปรับผ้านุ่มลดราคาสูงสุด 70%', brief_link: 'https://drive.google.com/sample-brief-29', ls_artwork_layout: 'Layout Midnight Festival Sparkle', owner_email: 'adminmark', owner_name: 'Mark2', status: 'Confirmed', remark: 'ทีมเทคนิคสแตนด์บายถ่ายทอดสด 2 แพลตฟอร์มพร้อมกัน' },

  // Day 6: 2026-08-29
  { room_name: '(Special) Onsite LIVE Streaming 2', date: '2026-08-29', start_time: '18:00', end_time: '22:00', brand_name: 'Royal Canin', campaign_name: 'Royal Canin Weekend Pet Expo Grand Live', brief_text: 'ไลฟ์ส่งท้ายสัปดาห์ แจกคอนโดแมวและปลอกคอพรีเมียม', brief_link: 'https://drive.google.com/sample-brief-30', ls_artwork_layout: 'Layout Pet Expo Festival Arena', owner_email: 'admintest', owner_name: 'admintest', status: 'Confirmed', remark: 'มีฉากเวทีจำลองและมุมโชว์คอนโดแมวของรางวัล' }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const action = searchParams.get('action') || 'brands';

  if (!secret || secret !== 'migrate1234') {
    return NextResponse.json({ success: false, message: 'Forbidden. Invalid secret code.' }, { status: 403 });
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, message: 'Missing SUPABASE_URL or SUPABASE_KEY.' }, { status: 500 });
  }

  try {
    if (action === 'filterUsers') {
      // Keep only masteradmin and mark
      const allUsers = await fetch(`${supabaseUrl}/rest/v1/users?select=email`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      }).then(r => r.json());

      const toDelete = (Array.isArray(allUsers) ? allUsers : [])
        .map((u: any) => u.email)
        .filter((email: string) => !['masteradmin', 'mark'].includes(email.toLowerCase().trim()));

      for (const email of toDelete) {
        await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'เคลียร์รายชื่อผู้ใช้งานเรียบร้อยแล้ว คงเหลือเฉพาะ 2 บัญชี: masteradmin และ mark',
        deletedUsers: toDelete,
        remainingUsers: ['masteradmin', 'mark']
      });
    }

    if (action === 'clearBookings') {
      // 1. Clear all records from bookings table
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      // 2. Clear all records from booking_change_requests table
      await fetch(`${supabaseUrl}/rest/v1/booking_change_requests?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      // 3. Clear any legacy change_requests table if exists
      await fetch(`${supabaseUrl}/rest/v1/change_requests?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }).catch(() => {});

      // 4. Clear chat messages if any
      await fetch(`${supabaseUrl}/rest/v1/chat_messages?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'ล้างข้อมูลการจองห้องไลฟ์ (Bookings) และคำขอแก้ไขคิว (Booking Change Requests) ทั้งหมดออกจากฐานข้อมูลเรียบร้อยแล้ว สะอาด 100%!',
        clearedAt: new Date().toISOString()
      });
    }

    if (action === 'seedMockBookings') {
      // 1. Ensure rooms exist
      const existingRooms = await fetch(`${supabaseUrl}/rest/v1/rooms?select=name`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      }).then(r => r.json());
      const roomSet = new Set((Array.isArray(existingRooms) ? existingRooms : []).map((r: any) => r.name));

      const distinctRooms = Array.from(new Set(MOCK_BOOKINGS.map(b => b.room_name)));
      const missingRooms = distinctRooms.filter(r => !roomSet.has(r));
      if (missingRooms.length > 0) {
        await postSupabase('rooms', missingRooms.map(name => ({ name, description: 'สตูดิโอถ่ายทอดสดระดับมืออาชีพ', status: 'Active' })));
      }

      // 2. Insert 30 mock bookings
      await postSupabase('bookings', MOCK_BOOKINGS);

      return NextResponse.json({
        success: true,
        message: `Successfully seeded ${MOCK_BOOKINGS.length} mock live studio bookings across various dates, times, rooms, and brands!`,
        totalBookingsSeeded: MOCK_BOOKINGS.length
      });
    }

    // Default action: Seed brands
    const existing = await getExistingBrands();
    const existingNames = new Set(existing.map((b: any) => b.name.toLowerCase()));

    const newBrandsToInsert = BRANDS_LIST.filter(name => !existingNames.has(name.toLowerCase()));

    if (newBrandsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All brands already exist in database. No new brands imported.',
        brandsImported: []
      });
    }

    const payload = newBrandsToInsert.map(name => ({
      name,
      description: '',
      status: 'Active'
    }));

    await postSupabase('brands', payload);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded/imported ${newBrandsToInsert.length} new brands to Supabase!`,
      brandsImported: newBrandsToInsert
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Import failed: ' + err.message }, { status: 500 });
  }
}
