import React from 'react';
import { createRoot } from 'react-dom/client';
import { CourseShell } from '@/components/course-shell';
import { LearningProvider } from './session';
import '@/app/globals.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LearningProvider>
      <CourseShell />
    </LearningProvider>
  </React.StrictMode>,
);
