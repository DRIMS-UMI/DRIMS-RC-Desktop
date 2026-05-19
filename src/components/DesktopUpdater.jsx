import React, { useState, useEffect } from 'react';

const DesktopUpdater = () => {
  const [status, setStatus] = useState('idle'); // 'idle', 'checking', 'available', 'progress', 'downloaded', 'error'
  const [percent, setPercent] = useState(0);
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Only run if we are inside the Electron container
    if (!window.electron || !window.electron.onUpdateMessage) {
      return;
    }

    const unsubscribe = window.electron.onUpdateMessage((msg) => {
      console.log('Update message received in React:', msg);
      switch (msg.type) {
        case 'checking':
          setStatus('checking');
          break;
        case 'available':
          setStatus('available');
          setVersion(msg.version);
          setVisible(true);
          break;
        case 'progress':
          setStatus('progress');
          setPercent(msg.percent);
          setVisible(true);
          break;
        case 'downloaded':
          setStatus('downloaded');
          setVisible(true);
          break;
        case 'error':
          setStatus('error');
          setError(msg.message);
          // Auto hide errors after 6 seconds
          setTimeout(() => setVisible(false), 6000);
          break;
        case 'not-available':
          setStatus('idle');
          break;
        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!visible || status === 'idle' || status === 'checking') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-80 overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in text-white font-sans">
      <div className="flex items-start gap-3">
        {/* Animated icon based on status */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          {status === 'progress' ? (
            <svg className="h-5 w-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          ) : status === 'downloaded' ? (
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : status === 'error' ? (
            <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )}
        </div>

        {/* Content details */}
        <div className="flex-1">
          <h4 className="text-sm font-semibold tracking-wide">
            {status === 'available' && `Update v${version} Available`}
            {status === 'progress' && 'Downloading Update'}
            {status === 'downloaded' && 'Update Ready'}
            {status === 'error' && 'Update Failed'}
          </h4>
          
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {status === 'available' && 'A new version of DRIMS is being downloaded in the background...'}
            {status === 'progress' && `Please keep the app open. Progress: ${percent}%`}
            {status === 'downloaded' && 'The new version is downloaded and ready to run.'}
            {status === 'error' && `An error occurred: ${error || 'Unknown error'}`}
          </p>

          {/* Progress Bar */}
          {status === 'progress' && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div 
                  className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out" 
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2">
            {status === 'downloaded' ? (
              <>
                <button 
                  onClick={() => setVisible(false)} 
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Later
                </button>
                <button 
                  onClick={() => window.electron.restartAndInstall()} 
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
                >
                  Restart & Update
                </button>
              </>
            ) : (
              <button 
                onClick={() => setVisible(false)} 
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopUpdater;
