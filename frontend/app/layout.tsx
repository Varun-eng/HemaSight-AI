import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/navbar';
import { FloatingChat } from '@/components/floating-chat';
import { Footer } from '@/components/footer'; // <-- 1. Make sure this is imported

export const metadata: Metadata = {
  title: 'HemaSight AI | Early Leukemia Detection',
  description: 'AI-powered leukemia screening, visualization, and monitoring.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* 2. Make sure body has flex flex-col and min-h-screen */}
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <ThemeProvider>
          <Navbar />
          
          {/* 3. Make sure main has flex-1 */}
          <main className="flex-1">
            {children}
          </main>
          
          <Footer /> {/* 4. Make sure Footer is here */}
          
          <FloatingChat />
        </ThemeProvider>
      </body>
    </html>
  );
}