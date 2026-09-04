-- ══════════════════════════════════════════════════════════════════════════════
-- MOCK UP: 30 Live Studio Bookings with diverse Dates, Times, Rooms & Brands
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO bookings (
  room_name,
  date,
  start_time,
  end_time,
  brand_name,
  campaign_name,
  brief_text,
  brief_link,
  ls_artwork_layout,
  owner_email,
  owner_name,
  status,
  remark
) VALUES
-- Day 1: 2026-08-24
('(Special) Onsite LIVE Streaming 1', '2026-08-24', '09:00', '12:00', 'Babimild', 'Baby Care Mega Live 8.24', 'เน้นโปรโมชั่นครีมอาบน้ำเด็กและแป้งเด็กออร์แกนิค', 'https://drive.google.com/sample-brief-1', 'Layout A (Theme Pastel Blue)', 'adminmark', 'Mark2', 'Confirmed', 'เตรียมฉากโทนสีฟ้าพาสเทล พร้อมของเล่นเด็กประกอบฉาก'),
('(Special) Onsite LIVE Streaming 2', '2026-08-24', '13:00', '16:00', 'Dnee', 'Dnee Organic Special Session', 'เปิดตัวผลิตภัณฑ์ซักผ้าเด็กกลิ่นใหม่', 'https://drive.google.com/sample-brief-2', 'Layout B (Clean & Green)', 'admintest', 'admintest', 'Confirmed', 'ต้องการไมค์ไวเลส 2 ตัวสำหรับพิธีกรคู่'),
('Studio 1', '2026-08-24', '10:00', '13:00', 'Fineline', 'Fineline Joy of Wash Live', 'สาธิตพลังซักขจัดคราบและกลิ่นหอมติดทนนาน', 'https://drive.google.com/sample-brief-3', 'Layout C (Vibrant Pink)', 'adminmark', 'Mark2', 'Confirmed', 'มีโต๊ะทดลองซักผ้าและตัวอย่างผ้าทดสอบ'),
('Studio 2', '2026-08-24', '14:00', '17:00', 'Benice', 'Benice Glowing Skin Shower Live', 'โปรโมชั่นซื้อ 1 แถม 1 สบู่เหลวอาบน้ำ', 'https://drive.google.com/sample-brief-4', 'Layout A (Rose Gold Tone)', 'sarah.p@th.com', 'Sarah Jenkins', 'Confirmed', 'เตรียมมุมจัดวางผลิตภัณฑ์แบบไล่ระดับเฉดสี'),
('Studio 3', '2026-08-24', '18:00', '21:00', 'Tros', 'Tros Men Sport Fresh Rush', 'เซ็ตผลิตภัณฑ์ดูแลผิวและน้ำหอมสำหรับผู้ชาย', 'https://drive.google.com/sample-brief-5', 'Layout B (Sport Neon Black)', 'alex.m@th.com', 'Alex Morgan', 'Confirmed', 'ไฟสตูดิโอเซ็ตเป็นโทน Cool Dark & Blue Neon'),
('Shopee Studio A', '2026-08-24', '19:00', '22:00', 'Jabs-Beauty', 'Jabs Wipes Flash Sale 8.24', 'ทิชชู่เปียกสูตรอ่อนโยน Flash Sale ลด 50%', 'https://drive.google.com/sample-brief-6', 'Layout Shopee Live Orange', 'staff01@th.com', 'Natthaporn S.', 'Confirmed', 'ต่อระบบ OBS กับ Shopee Live Streaming'),
('TikTok Studio 1', '2026-08-24', '20:00', '23:00', 'Eversense', 'Eversense Chic Perfume Night', 'น้ำหอมโคโลญจน์รุ่นลิมิเต็ด แจกโค้ด TikTok ลด 100.-', 'https://drive.google.com/sample-brief-7', 'Layout TikTok Vertical Standard', 'admintest', 'admintest', 'Confirmed', 'ตั้งค่ากล้องแนวตั้ง 9:16 ความละเอียด 1080p60'),

-- Day 2: 2026-08-25
('Studio 1', '2026-08-25', '09:00', '12:00', 'BioSafety', 'Oral Health Protection Day', 'แปรงสีฟันและยาสีฟันเพื่อสุขภาพเหงือกที่ดี', 'https://drive.google.com/sample-brief-8', 'Layout Dental Fresh Medical', 'adminmark', 'Mark2', 'Confirmed', 'จัดแท่นวางโมเดลฟันและผลิตภัณฑ์ตัวอย่าง'),
('Studio 2', '2026-08-25', '11:00', '14:00', 'Big C', 'Big C Fresh Mart Midday Live', 'โปรโมชั่นสินค้าอุปโภคบริโภคราคาส่ง', 'https://drive.google.com/sample-brief-9', 'Layout Supermarket Cart Theme', 'admintest', 'admintest', 'Confirmed', 'มีพร็อพรถเข็น Big C ขนาดจำลอง'),
('Studio 4', '2026-08-25', '13:30', '16:30', 'Neo Beauty', 'Neo Beauty Summer Glam Makeup', 'สอนแต่งหน้าลุคซัมเมอร์ด้วยเครื่องสำอางกันน้ำ', 'https://drive.google.com/sample-brief-10', 'Layout Beauty Vanity Mirror', 'sarah.p@th.com', 'Sarah Jenkins', 'Confirmed', 'ต้องการไฟ Ring Light และกระจกแต่งหน้าไฟ LED'),
('Shopee Studio B', '2026-08-25', '15:00', '18:00', 'BetagroPet', 'Betagro Pet Food Premium Live', 'อาหารสุนัขและแมวเกรดพรีเมียม ส่งฟรีทั่วไทย', 'https://drive.google.com/sample-brief-11', 'Layout Pet Playground', 'alex.m@th.com', 'Alex Morgan', 'Confirmed', 'มีน้องสุนัขร่วมเข้าฉากไลฟ์ 1 ตัว'),
('TikTok Studio 2', '2026-08-25', '18:00', '21:00', 'BEO', 'BEO Official Store Opening Special', 'อุปกรณ์สมาร์ทโฮมและไลฟ์สไตล์ไอที', 'https://drive.google.com/sample-brief-12', 'Layout Tech Modern Dark', 'staff01@th.com', 'Natthaporn S.', 'Confirmed', 'มีจอมอนิเตอร์พรีเซนต์ฟีเจอร์สินค้าต่อตรง'),
('(Special) Onsite LIVE Streaming 1', '2026-08-25', '19:00', '22:30', 'Royal Canin', 'Royal Canin Nutrition First Expo', 'สูตรอาหารเฉพาะสายพันธุ์ แนะนำโดยสัตวแพทย์', 'https://drive.google.com/sample-brief-13', 'Layout Vet Clinic Style', 'adminmark', 'Mark2', 'Confirmed', 'สัตวแพทย์รับเชิญร่วมไลฟ์ 1 ท่าน'),

-- Day 3: 2026-08-26
('Studio 3', '2026-08-26', '09:30', '12:30', 'Yassia', 'Yassia Fashion Live Autumn 2026', 'คอลเลกชันเสื้อผ้าทำงานและเดรสผ้าลินิน', 'https://drive.google.com/sample-brief-14', 'Layout Boutique Studio Minimal', 'sarah.p@th.com', 'Sarah Jenkins', 'Confirmed', 'เตรียมราวแขวนผ้าและมุมเปลี่ยนชุดด้านหลัง'),
('Studio 5', '2026-08-26', '11:00', '14:00', 'Taupe', 'Taupe Minimalist Collection Showcase', 'กระเป๋าและเครื่องประดับสไตล์มินิมอลโมเดิร์น', 'https://drive.google.com/sample-brief-15', 'Layout Art Gallery Concrete', 'alex.m@th.com', 'Alex Morgan', 'Confirmed', 'จัดไฟแบบนุ่มนวล High-Key Lighting'),
('Studio 1', '2026-08-26', '14:00', '17:00', 'Glory', 'Glory Collagen Boost Live Stream', 'คอลลาเจนไดเปปไทด์ผิวใส ซื้อ 2 กระปุกแถมวิตซี', 'https://drive.google.com/sample-brief-16', 'Layout Healthy Pink Shine', 'adminmark', 'Mark2', 'Confirmed', 'เตรียมแก้วน้ำและตัวอย่างชงดื่มจริง'),
('Shopee Studio A', '2026-08-26', '16:30', '19:30', 'TandT', 'TandT Chic Brand Launch On-Air', 'แบรนด์เสื้อผ้าสตรีทแวร์รุ่นใหม่ล่าสุด', 'https://drive.google.com/sample-brief-17', 'Layout Urban Street Loft', 'admintest', 'admintest', 'Confirmed', 'เปิดเพลง Background Track สไตล์ Lo-fi'),
('TikTok Studio 1', '2026-08-26', '19:00', '22:00', 'Aristotle', 'Aristotle Rose Bag Special Edition', 'กระเป๋าดอกกุหลาบซิกเนเจอร์รุ่นฮิต', 'https://drive.google.com/sample-brief-18', 'Layout Floral Rose Studio', 'staff01@th.com', 'Natthaporn S.', 'Confirmed', 'จัดฉากดอกไม้สดประดับรอบโต๊ะวางสินค้า'),
('(Special) Onsite LIVE Streaming 2', '2026-08-26', '20:00', '23:00', 'Hi-Q', 'Hi-Q Super Gold Live Family Camp', 'นมผงสูตรพัฒนาการสมอง แจกของแถมเสริมทักษะ', 'https://drive.google.com/sample-brief-19', 'Layout Kids Wonderland', 'adminmark', 'Mark2', 'Confirmed', 'มีของเล่นเสริมทักษะวางโชว์ประกอบรายการ'),

-- Day 4: 2026-08-27
('Studio 2', '2026-08-27', '09:00', '12:00', 'Oceanglass', 'Ocean Glassware Dining Style Live', 'แก้วไวน์และชุดจานชามสำหรับดินเนอร์หรู', 'https://drive.google.com/sample-brief-20', 'Layout Dining Table Luxury', 'sarah.p@th.com', 'Sarah Jenkins', 'Confirmed', 'เตรียมโต๊ะอาหารปูผ้าดำพร้อมแก้วเช็ตเต็มรูปแบบ'),
('Studio 4', '2026-08-27', '13:00', '16:00', 'Kemissara', 'Kemissara Runway at Home Live', 'เสื้อผ้าดีไซเนอร์แบรนด์ไทย ลดพิเศษเฉพาะในไลฟ์', 'https://drive.google.com/sample-brief-21', 'Layout Runway White Minimal', 'alex.m@th.com', 'Alex Morgan', 'Confirmed', 'ต้องการนางแบบลองชุด 1 คน'),
('Shopee Studio B', '2026-08-27', '15:30', '18:30', 'Foremost', 'Foremost Omega 9 Family Fun Live', 'นมยูเอชทีสูตรโอเมก้า 3 6 9 ซื้อยกลังคุ้มที่สุด', 'https://drive.google.com/sample-brief-22', 'Layout Farm & Nature Fresh', 'admintest', 'admintest', 'Confirmed', 'มีเกมตอบคำถามชิงรางวัลในไลฟ์'),
('TikTok Studio 2', '2026-08-27', '18:00', '21:00', 'Bostanten', 'Bostanten Leather Goods Showcase', 'กระเป๋าสตางค์และเข็มขัดหนังแท้สำหรับสุภาพบุรุษ', 'https://drive.google.com/sample-brief-23', 'Layout Classic Wood & Leather', 'staff01@th.com', 'Natthaporn S.', 'Confirmed', 'จัดไฟเน้น Texture ของงานหนังแท้'),
('Studio 6', '2026-08-27', '19:30', '22:30', 'Club21', 'Club21 Luxury Midnight Session', 'แบรนด์เนมนำเข้า คอลเลกชันลดราคาประจำเดือน', 'https://drive.google.com/sample-brief-24', 'Layout High-End Luxury Dark Gold', 'adminmark', 'Mark2', 'Confirmed', 'มีเจ้าหน้าที่ความปลอดภัยดูแลสินค้าแบรนด์เนม'),

-- Day 5: 2026-08-28 (Mega Payday)
('Studio 1', '2026-08-28', '10:00', '13:00', 'Evony', 'Evony Soft Touch Mask Payday Live', 'หน้ากากอนามัยเกรดการแพทย์แบบระบายอากาศดี', 'https://drive.google.com/sample-brief-25', 'Layout Medical Clean Green', 'sarah.p@th.com', 'Sarah Jenkins', 'Confirmed', 'จัดแพ็คเกจยกลังพร้อมส่ง'),
('Studio 3', '2026-08-28', '13:00', '16:00', 'Subi', 'Subi Korean Snack Party Mega Live', 'ขนมและบะหมี่กึ่งสำเร็จรูปยอดนิยมจากเกาหลี', 'https://drive.google.com/sample-brief-26', 'Layout K-Food Street Vibe', 'admintest', 'admintest', 'Confirmed', 'มีหม้อต้มรามยอนสาธิตการทำสด'),
('Shopee Studio A', '2026-08-28', '16:00', '19:00', 'Babimild', 'Babimild Payday Super Deals Live', 'โปรโมชั่นวันเงินเดือนออก ยอดสั่งซื้อสูงสุดรับทอง', 'https://drive.google.com/sample-brief-27', 'Layout Payday Grand Stage', 'adminmark', 'Mark2', 'Confirmed', 'ขึ้นกราฟิกนับถอยหลัง Flash Sale ทุกๆ 30 นาที'),
('TikTok Studio 1', '2026-08-28', '19:00', '22:00', 'Dnee', 'Dnee Kids Fun Live Streaming 8.28', 'รวมไอเทมยอดฮิตของคุณแม่ แจกคูปองส่วนลด 200.-', 'https://drive.google.com/sample-brief-28', 'Layout Party Balloon Theme', 'staff01@th.com', 'Natthaporn S.', 'Confirmed', 'มีลูกโป่งตกแต่งฉากสตรีม'),
('(Special) Onsite LIVE Streaming 1', '2026-08-28', '20:00', '23:30', 'Fineline', 'Fineline 8.28 Midnight Mega Sale Live', 'ดีลเด็ดเที่ยงคืน น้ำยาปรับผ้านุ่มลดราคาสูงสุด 70%', 'https://drive.google.com/sample-brief-29', 'Layout Midnight Festival Sparkle', 'adminmark', 'Mark2', 'Confirmed', 'ทีมเทคนิคสแตนด์บายถ่ายทอดสด 2 แพลตฟอร์มพร้อมกัน'),

-- Day 6: 2026-08-29
('(Special) Onsite LIVE Streaming 2', '2026-08-29', '18:00', '22:00', 'Royal Canin', 'Royal Canin Weekend Pet Expo Grand Live', 'ไลฟ์ส่งท้ายสัปดาห์ แจกคอนโดแมวและปลอกคอพรีเมียม', 'https://drive.google.com/sample-brief-30', 'Layout Pet Expo Festival Arena', 'admintest', 'admintest', 'Confirmed', 'มีฉากเวทีจำลองและมุมโชว์คอนโดแมวของรางวัล');
