import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import ToastContainer from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "TH Booking - Live Studio Room Booking Portal",
  description: "ระบบจองห้องไลฟ์สดและสตูดิโอ แบบเรียลไทม์เพื่อจัดการแคมเปญแบรนด์ลูกค้า",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950">
        <AppProvider>
          {children}
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
