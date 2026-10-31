import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/navbar';
import { FloatingChat } from '@/components/floating-chat';
import { Footer } from '@/components/footer'; // <-- Import Footer

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
      {/* Added flex-col and min-h-screen so the footer stays at the bottom of the page */}
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <ThemeProvider>
          <Navbar />
          
          {/* flex-1 ensures this main content takes up all available space, pushing the footer down */}
          <main className="flex-1">
            {children}
          </main>
          
          <Footer /> {/* <-- Add Footer here */}
          
          <FloatingChat />
        </ThemeProvider>
      </body>
    </html>
  );
}