import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'CoC Scenario Studio', description: 'シーンを描き、因果をつなぐ。ChatGPTと併用するシナリオ制作スタジオ。' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ja"><body>{children}</body></html>; }
