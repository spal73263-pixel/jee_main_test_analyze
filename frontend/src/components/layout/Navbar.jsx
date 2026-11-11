import React from 'react';
import { Menu, UploadCloud, LogOut, Sparkles, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onOpenSidebar }) => {
  const { user, logout, cloudStatus, syncing, triggerSync } = useAuth();
  const navigate = useNavigate();

  const isCloudReady = cloudStatus?.cloud_sync_ready;
  const driverLabel =
    cloudStatus?.storage_driver === 'local-file'
      ? 'LAN Sync'
      : cloudStatus?.requires_cloud_config
      ? 'Setup Cloud DB'
      : 'Cloud Synced';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between no-print">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100/80 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            JEE &amp; HSC Study Portal
          </span>
          {cloudStatus?.loaded && (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${
                isCloudReady
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={`Storage driver: ${cloudStatus.storage_driver}`}
            >
              {isCloudReady ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              <span>{driverLabel}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={triggerSync}
          disabled={syncing}
          title="Refresh synced progress from server"
          className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indigo-600' : ''}`} />
          <span className="hidden md:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Result</span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-indigo-700">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'S'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name || 'Student'}</p>
              <p className="text-[11px] text-slate-400 font-medium">{user?.email || 'Student Account'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
