import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BrainWeave AI — 3D Knowledge Graph',
  description:
    'A premium 3D knowledge graph where you create nodes, connect ideas, and discover insights powered by AI.',
  keywords: ['knowledge graph', 'mind map', '3D', 'AI', 'ideas', 'notes'],
  openGraph: {
    title: 'BrainWeave AI',
    description: 'Visualize and connect your ideas in 3D',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-surface-950 text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
