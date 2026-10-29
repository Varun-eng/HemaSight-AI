import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/navbar';
import { FloatingChat } from '@/components/floating-chat'; // Make sure this is here

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
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <ThemeProvider>
          <Navbar />
          {children}
          <FloatingChat /> {/* Make sure this is here */}
        </ThemeProvider>
      </body>
    </html>
  );
}