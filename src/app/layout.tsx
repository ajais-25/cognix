import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ChatDataProvider } from "@/context/ChatDataContext";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('cognix-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cognix — AI Chat & Document Intelligence",
  description:
    "Ask anything with real-time web search, or upload a PDF and chat with it using RAG-powered document intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        <AuthProvider>
          <SidebarProvider>
            <ChatDataProvider>
              <Toaster position="top-center" />
              {children}
            </ChatDataProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

