'use client';

import { useState } from 'react';
import { TodoProvider } from '../context/TodoContext';
import Sidebar, { ViewType } from '../components/Sidebar';
import ListView from '../components/ListView';
import DayPlanner from '../components/DayPlanner';
import ArchiveView from '../components/ArchiveView';
import { ListType } from '../types';

const LIST_TYPES: ListType[] = ['todo-werk', 'todo-thuis', 'misschien', 'ideeen', 'boodschappen', 'kopen', 'cultuur'];

function AppContent() {
  const [view, setView] = useState<ViewType>('planner');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="p-6 lg:p-10">
          {view === 'planner' && <DayPlanner />}
          {view === 'archief' && <ArchiveView />}
          {LIST_TYPES.includes(view as ListType) && (
            <ListView listType={view as ListType} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <TodoProvider>
      <AppContent />
    </TodoProvider>
  );
}
