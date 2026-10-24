import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beyond-2D | Architectural 3D Workspace',
  description: 'AI-Powered 2D Floor Plan to Interactive 3D Model Conversion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#1e1e1e] text-[#cfcfcf] antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
