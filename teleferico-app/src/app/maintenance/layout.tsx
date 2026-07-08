import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Maintenance | Teleférico Cerro Otto',
  description: 'Teleférico Cerro Otto is temporarily under maintenance.',
  themeColor: '#9f1212',
  robots: { index: false, follow: false },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
