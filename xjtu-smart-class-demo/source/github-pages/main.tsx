import React from 'react';
import { createRoot } from 'react-dom/client';

import { CourseShell } from '@/components/course-shell';
import '@/app/globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('找不到页面挂载节点');
}

createRoot(root).render(
  <React.StrictMode>
    <CourseShell />
  </React.StrictMode>,
);

