import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://xjtu-smart-class-demo.yiqingyuteddy.chatgpt.site'),
  title: '数智课堂｜西安交通大学管理学院',
  description: '西安交通大学管理学院“智能分析”历年课程资料、AI 检索、互动小测与作业演示平台。',
  openGraph: {
    title: '数智课堂｜西安交通大学管理学院',
    description: '智能分析历年课件、作业、数据和代码的一体化中文课程空间。',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '数智课堂课程学习空间' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '数智课堂｜西安交通大学管理学院',
    description: '智能分析历年课件、作业、数据和代码的一体化中文课程空间。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
