import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/QueryProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DotZero CR Portal',
  description: 'Change Request Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-white text-[#2D2D2D]`}>
        <QueryProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
