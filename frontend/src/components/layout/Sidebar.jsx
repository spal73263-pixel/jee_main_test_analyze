import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  BarChart3,
  BookOpen,
  Layers,
  AlertTriangle,
  Clock,
  GitCompare,
  Target,
  Calendar,
  History,
  Settings,
  X
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Upload Test', path: '/upload', icon: UploadCloud },
  { name: 'Test Analysis', path: '/test-analysis', icon: BarChart3 },
  { name: 'Weak Topics & Reminders', path: '/weak-topics', icon: AlertTriangle },
  { name: 'Test Comparison', path: '/compare', icon: GitCompare },
  { name: 'Study Planner', path: '/study-planner', icon: Calendar },
  { name: 'Test History', path: '/history', icon: History },
  { name: 'Profile & Settings', path: '/profile', icon: Settings },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const profile = user?.profile || {};

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* App Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-primary-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 font-bold text-lg">
              Ω
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">JEE Analyzer</span>
              <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">AI Test Intelligence</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Analytics & Planning
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Target Status Pill */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>Target {profile.target_year || 2026}</span>
              <span className="text-indigo-600 font-bold">{profile.target_percentile || 99.0}+ %ile</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
              <span>{profile.daily_study_hours || 6.5} hrs/day</span>
              <span>Goal: {profile.target_marks || 220} Marks</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
