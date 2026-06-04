import React, { useEffect, useRef, useState } from 'react';
import { ArrowsPointingInIcon, ArrowsPointingOutIcon, PhoneXMarkIcon } from '@heroicons/react/24/outline';

function VideoCall({ roomName, currentUser, onLeave, isAdmin, onEndCall }) {
  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);

  useEffect(() => {
    // Load Jitsi Meet External API script dynamically
    const scriptId = 'jitsi-external-api-script';
    let script = document.getElementById(scriptId);

    const initJitsi = () => {
      if (apiRef.current) return;

      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: currentUser?.name || 'DevCollab Member',
          email: currentUser?.email || ''
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false, // Jump straight in
          disableDeepLinking: true,
          readOnlyNameShare: true,
          enableWelcomePage: false,
          toolbarButtons: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'mute-video-everyone', 'security'
          ]
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#0f172a',
          MOBILE_APP_PROMO: false
        }
      };

      try {
        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        // Listen for Jitsi events
        api.addEventListener('readyToClose', () => {
          handleLeave();
        });

        api.addEventListener('videoConferenceLeft', () => {
          handleLeave();
        });
      } catch (err) {
        console.error('Error creating Jitsi Meet API:', err);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        setJitsiLoaded(true);
        initJitsi();
      };
      document.body.appendChild(script);
    } else {
      setJitsiLoaded(true);
      // Wait for script to be fully loaded and available on window
      if (window.JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        script.onload = () => initJitsi();
      }
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName]);

  const handleLeave = () => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    onLeave();
  };

  const handleEndCallForAll = async () => {
    if (window.confirm('Are you sure you want to end this video call for everyone in the project?')) {
      if (apiRef.current) {
        apiRef.current.executeCommand('hangup');
      }
      if (onEndCall) {
        await onEndCall();
      }
      handleLeave();
    }
  };

  return (
    <div
      className={`fixed transition-all duration-300 ease-in-out border border-slate-700/80 bg-slate-900 shadow-2xl z-50 overflow-hidden flex flex-col ${
        isMinimized
          ? 'bottom-4 right-4 w-80 h-56 rounded-xl animate-bounce-subtle'
          : 'inset-4 sm:inset-10 rounded-2xl'
      }`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 text-white select-none shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs sm:text-sm font-semibold tracking-wide truncate max-w-[120px] sm:max-w-[200px]">
            {isMinimized ? 'Call Minimized' : 'Live Project Video Call'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-800 rounded transition text-slate-400 hover:text-white"
            title={isMinimized ? 'Expand Video' : 'Minimize Video (PiP)'}
          >
            {isMinimized ? (
              <ArrowsPointingOutIcon className="h-5 w-5" />
            ) : (
              <ArrowsPointingInIcon className="h-5 w-5" />
            )}
          </button>

          {/* End Call / Leave Button */}
          {isAdmin ? (
            <button
              onClick={handleEndCallForAll}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded text-xs font-semibold text-white transition shadow-sm"
              title="End Call For Everyone"
            >
              <PhoneXMarkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded text-xs font-semibold text-white transition shadow-sm"
              title="Leave Call"
            >
              <PhoneXMarkIcon className="h-4 w-4" />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Jitsi Meeting Target Div */}
      <div className="flex-1 w-full h-full bg-slate-950 relative">
        {!jitsiLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
            <p className="text-sm font-medium">Connecting to secure server...</p>
          </div>
        )}
        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

export default VideoCall;
