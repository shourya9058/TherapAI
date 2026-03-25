"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  SkipForward,
  PhoneOff,
  Users,
  Loader2,
  Send,
  X,
  ArrowLeft,
  Smile,
} from "lucide-react"
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../contexts/AuthContext';
import { recordConnection } from '../services/connectionService';
import { socketService } from "../services/socketService";

interface Message {
  text: string
  sender: string
  timestamp: number
}

// Emoji picker data
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '😎',
  '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
  '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
  '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
  '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟',
  '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐',
  '✋', '🖖', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
  '✨', '💫', '⭐', '🌟', '✴️', '🔥', '💥', '💯', '✅', '🎉',
]

const CATEGORIES = [
  { id: 'mental-health', name: 'Mental Health', icon: '💭', color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/40', hover: 'hover:border-blue-400', glow: 'hover:shadow-blue-500/50' },
  { id: 'career', name: 'Career Guidance', icon: '💼', color: 'from-green-500/20 to-green-600/20', border: 'border-green-500/40', hover: 'hover:border-green-400', glow: 'hover:shadow-green-500/50' },
  { id: 'relationship', name: 'Relationships', icon: '💕', color: 'from-pink-500/20 to-pink-600/20', border: 'border-pink-500/40', hover: 'hover:border-pink-400', glow: 'hover:shadow-pink-500/50' },
  { id: 'motivation', name: 'Motivation', icon: '🔥', color: 'from-orange-500/20 to-orange-600/20', border: 'border-orange-500/40', hover: 'hover:border-orange-400', glow: 'hover:shadow-orange-500/50' },
  { id: 'education', name: 'Education', icon: '📚', color: 'from-indigo-500/20 to-indigo-600/20', border: 'border-indigo-500/40', hover: 'hover:border-indigo-400', glow: 'hover:shadow-indigo-500/50' },
  { id: 'wellness', name: 'Wellness', icon: '🌿', color: 'from-teal-500/20 to-teal-600/20', border: 'border-teal-500/40', hover: 'hover:border-teal-400', glow: 'hover:shadow-teal-500/50' },
];

export default function VideoCallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connectionMode, setConnectionMode] = useState<'random' | 'expert' | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState<string>("")
  const [matchedUser, setMatchedUser] = useState<string | null>(null)
  const [expertCategory, setExpertCategory] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [remoteVideoStarted, setRemoteVideoStarted] = useState(false)
  const [remoteVideoOn, setRemoteVideoOn] = useState(true)    // remote camera status
  const [remoteAudioOn, setRemoteAudioOn] = useState(true)    // remote mic status

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteImgRef = useRef<HTMLImageElement>(null)  // Direct ref — no React state per frame!
  const videoFrameInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { 
    isVideoOn, 
    isAudioOn, 
    toggleVideo: rtcToggleVideo, 
    toggleAudio: rtcToggleAudio, 
    sendMessage,
    initMedia,
    startCall
  } = useWebRTC({
    localVideoRef,
    remoteVideoRef,
    onConnectionStateChange: useCallback((state: RTCPeerConnectionState) => {
      console.log("WebRTC Connection state:", state)
    }, []),
    onMessageReceived: useCallback((message: string) => {
      setMessages((prev) => [...prev, { text: message, sender: "Other", timestamp: Date.now() }])
    }, []),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize socket once on mount only
  useEffect(() => {
    const socket = socketService.connect();
    console.log('Socket connected:', socket.id);

    return () => {
      // Only truly disconnect when the page unmounts
      socketService.disconnect();
    };
  }, []); // ← empty deps: runs ONCE on mount

  // Separate effect for listening to match + chat + video events
  useEffect(() => {
    const socket = socketService.connect();

    const handleMatchFound = ({ roomId, partner, isOfferer }: { roomId: string; partner: { id: string; username: string; avatar: string }; isOfferer: boolean }) => {
      console.log('🤝 Partner found!', partner.username, 'room:', roomId);
      setMatchedUser(partner.username);
      setRoomId(roomId);
      setIsMatching(false);
      startCall(roomId, isOfferer);
      recordConnection(partner.id).catch(err => console.error('Failed to record connection:', err));
      // ✅ Video capture now handled separately in the roomId-keyed useEffect below
    };

    const handleCallEnded = () => {
      setMatchedUser(null);
      setRoomId(null);
      setMessages([]);
      setIsMatching(false);
      if (videoFrameInterval.current) clearInterval(videoFrameInterval.current);
    };

    // ✅ Receive chat messages via socket.io (guaranteed delivery regardless of WebRTC state)
    const handleChatMessage = (message: string) => {
      setMessages((prev) => [...prev, { text: message, sender: 'Other', timestamp: Date.now() }]);
    };

    // 🎥 OPTIMIZED: Direct ref update (no React state per frame = no re-renders = works on mobile!)
    const handleRemoteVideoFrame = ({ frame }: { frame: string }) => {
      if (remoteImgRef.current) {
        remoteImgRef.current.src = frame;
        // Only trigger ONE React state update to show the video (hides placeholder)
        if (remoteImgRef.current.style.display === 'none') {
          remoteImgRef.current.style.display = 'block';
          setRemoteVideoStarted(true);
        }
      }
    };

    // 🎥 Receive partner's camera/mic status in real-time
    const handleMediaStatus = ({ videoOn, audioOn }: { videoOn: boolean; audioOn: boolean }) => {
      if (videoOn !== undefined) setRemoteVideoOn(videoOn);
      if (audioOn !== undefined) setRemoteAudioOn(audioOn);
    };

    socket.on('match-found', handleMatchFound);
    socket.on('call-ended', handleCallEnded);
    socket.on('partner-disconnected', handleCallEnded);
    socket.on('chat-message', handleChatMessage);
    socket.on('remote-video-frame', handleRemoteVideoFrame);
    socket.on('media-status', handleMediaStatus);

    return () => {
      socket.off('match-found', handleMatchFound);
      socket.off('call-ended', handleCallEnded);
      socket.off('partner-disconnected', handleCallEnded);
      socket.off('chat-message', handleChatMessage);
      socket.off('remote-video-frame', handleRemoteVideoFrame);
      socket.off('media-status', handleMediaStatus);
      // ⚠️ NOT clearing videoFrameInterval here — that's handled by the roomId effect
    };
  }, [startCall]);

  // 🎥 STABLE video capture effect — keyed ONLY on roomId
  // This never gets cleared by startCall re-creation
  useEffect(() => {
    if (!roomId) return; // No call active

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    let interval: ReturnType<typeof setInterval>;

    // Wait for local video to be ready before starting
    const startCapture = () => {
      interval = setInterval(() => {
        const video = localVideoRef.current;
        if (!video || !ctx || video.readyState < 2 || video.videoWidth === 0) return;
        try {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -320, 0, 320, 240);
          ctx.restore();
          const frame = canvas.toDataURL('image/jpeg', 0.6);
          socketService.emit('video-frame', { roomId, frame });
        } catch (_) {
          // Video not ready yet, skip frame
        }
      }, 100); // 10fps
    };

    // 2s delay on mobile for camera init, then capture runs until roomId changes
    const timer = setTimeout(startCapture, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      console.log('🛑 Video capture stopped (roomId changed)');
    };
  }, [roomId]); // ⬅️ Only re-runs when room changes, NOT on every render

  // Reset remote status when call ends
  useEffect(() => {
    if (!matchedUser) {
      setRemoteVideoStarted(false);
      setRemoteVideoOn(true);
      setRemoteAudioOn(true);
      if (remoteImgRef.current) remoteImgRef.current.style.display = 'none';
    }
  }, [matchedUser]);

  // Wrapped toggles that also emit status to partner
  const toggleVideo = useCallback(() => {
    rtcToggleVideo();
    const newVal = !isVideoOn;
    if (roomId) socketService.emit('media-status', { roomId, videoOn: newVal, audioOn: isAudioOn });
  }, [rtcToggleVideo, isVideoOn, isAudioOn, roomId]);

  const toggleAudio = useCallback(() => {
    rtcToggleAudio();
    const newVal = !isAudioOn;
    if (roomId) socketService.emit('media-status', { roomId, videoOn: isVideoOn, audioOn: newVal });
  }, [rtcToggleAudio, isVideoOn, isAudioOn, roomId]);

  // Init media when mode is selected
  useEffect(() => {
    if (connectionMode) {
      initMedia();
    }
  }, [connectionMode, initMedia]);

  const handleSendMessage = (message: string): void => {
    if (message.trim() && roomId) {
      setMessages((prev) => [...prev, { text: message, sender: 'You', timestamp: Date.now() }]);
      // Primary: socket.io relay (always works)
      socketService.emit('chat-message', { roomId, message: message.trim() });
      // Secondary: WebRTC DataChannel (if P2P is up)
      sendMessage(message.trim());
      setChatInput('');
      setShowEmojiPicker(false);
    }
  }

  const handleEmojiSelect = (emoji: string): void => {
    setChatInput((prev) => prev + emoji)
  }

  const startMatching = (mode: 'random' | 'expert', category?: string): void => {
    setConnectionMode(mode)
    setIsMatching(true)
    if (category) setExpertCategory(category)
    
    socketService.emit('join-matchmaking', {
      mode,
      category,
      user: {
        _id: user?._id,
        username: user?.username,
        avatar: user?.avatar
      }
    })
  }

  const skipToNext = (): void => {
    if (roomId) {
      socketService.emit('end-call', { roomId });
    }
    setMessages([])
    setMatchedUser(null)
    setRoomId(null)
    setIsMatching(true)
    
    socketService.emit('join-matchmaking', {
      mode: connectionMode,
      category: expertCategory,
      user: {
        username: user?.username,
        avatar: user?.avatar
      }
    })
  }

  const goBack = (): void => {
    if (roomId) {
      socketService.emit('end-call', { roomId });
    }
    socketService.disconnect();
    navigate('/');
  }

  return (
    <AnimatePresence mode="wait">
      {/* Selection Screen */}
      {!connectionMode && !isMatching && (
        <motion.div 
          key="selection"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4"
        >
          <div className="text-center max-w-2xl">
            <h1 className="text-5xl font-bold text-white mb-4">Choose Your Connection</h1>
            <p className="text-gray-300 text-lg mb-12">How would you like to connect today?</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div
                onClick={() => startMatching('random')}
                className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-2 border-emerald-500/30 rounded-2xl p-8 cursor-pointer hover:scale-105 hover:border-emerald-400 transition-all duration-300 group"
              >
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Random Connect</h2>
                <p className="text-gray-300 text-sm mb-6">
                  Connect instantly with someone random. Anonymous and spontaneous conversations.
                </p>
                <div className="bg-emerald-500/20 rounded-lg py-2 px-4 text-emerald-300 text-sm font-semibold">
                  Free & Instant
                </div>
              </div>

              <div
                onClick={() => startMatching('expert')}
                className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-2 border-purple-500/30 rounded-2xl p-8 cursor-pointer hover:scale-105 hover:border-purple-400 transition-all duration-300 group"
              >
                <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Expert Connect</h2>
                <p className="text-gray-300 text-sm mb-6">
                  Connect with verified professionals for guidance on mental health, career, and more.
                </p>
                <div className="bg-purple-500/20 rounded-lg py-2 px-4 text-purple-300 text-sm font-semibold">
                  Verified Experts
                </div>
              </div>
            </div>

            <p className="text-gray-500 text-sm mt-8">
              All connections are anonymous. Your identity is protected.
            </p>
          </div>
        </motion.div>
      )}

      {/* Expert Category Selection */}
      {connectionMode === 'expert' && !expertCategory && !isMatching && (
        <motion.div 
          key="expert-categories"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 relative"
        >
          <div className="text-center max-w-5xl w-full">
            <button
              onClick={goBack}
              className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="mb-12">
              <h1 className="text-4xl font-bold text-white mb-3">Choose Your Focus</h1>
              <p className="text-gray-400 text-lg">Connect with an expert in your area of need</p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  onClick={() => startMatching('expert', category.id)}
                  className={`relative bg-gradient-to-br ${category.color} backdrop-blur-sm rounded-2xl p-8 cursor-pointer transition-all duration-300 border-2 ${category.border} ${category.hover} hover:scale-105 hover:shadow-2xl ${category.glow} group overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{category.icon}</div>
                    <h3 className="text-xl font-semibold text-white mb-2">{category.name}</h3>
                    <div className="w-12 h-1 bg-white/30 mx-auto rounded-full group-hover:w-20 transition-all duration-300"></div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-gray-500 text-sm mt-10">All sessions are confidential and anonymous</p>
          </div>
        </motion.div>
      )}

      {/* Matching Screen */}
      {isMatching && (
        <motion.div 
          key="matching"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden"
        >
          {/* Live Background Preview (Blurred) */}
          <div className="absolute inset-0 z-0 opacity-30 blur-2xl scale-110">
            <video
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => {
                const video = e.target as HTMLVideoElement;
                if (localVideoRef.current?.srcObject) {
                  video.srcObject = localVideoRef.current.srcObject;
                }
              }}
            />
          </div>

          <div className="relative z-10 text-center max-w-lg w-full">
            <div className="relative mb-8 w-48 h-48 mx-auto">
              {/* Circular Video Preview */}
              <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl z-10">
                <video
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                  onLoadedMetadata={(e) => {
                    const video = e.target as HTMLVideoElement;
                    if (localVideoRef.current?.srcObject) {
                      video.srcObject = localVideoRef.current.srcObject;
                    }
                  }}
                />
              </div>
              {/* Spinning Loader Ring */}
              <div className="absolute -inset-4 z-0">
                <Loader2 className={`w-full h-full ${connectionMode === 'expert' ? 'text-purple-400' : 'text-emerald-400'} animate-spin opacity-40`} />
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              {connectionMode === 'expert' ? 'Finding an Expert...' : 'Matching with Peer...'}
            </h2>
            <p className={`${connectionMode === 'expert' ? 'text-purple-200' : 'text-emerald-200'} mb-8 text-lg`}>
              {connectionMode === 'expert' 
                ? `Connecting you with a verified ${expertCategory?.replace('-', ' ')} specialist` 
                : 'Searching for an anonymous peer for professional support'}
            </p>

            <div className="flex items-center justify-center space-x-3 mb-12">
              <div className={`w-3 h-3 ${connectionMode === 'expert' ? 'bg-purple-400' : 'bg-emerald-400'} rounded-full animate-bounce shadow-lg`}></div>
              <div className={`w-3 h-3 ${connectionMode === 'expert' ? 'bg-purple-400' : 'bg-emerald-400'} rounded-full animate-bounce shadow-lg`} style={{ animationDelay: '0.1s' }}></div>
              <div className={`w-3 h-3 ${connectionMode === 'expert' ? 'bg-purple-400' : 'bg-emerald-400'} rounded-full animate-bounce shadow-lg`} style={{ animationDelay: '0.2s' }}></div>
            </div>

            <button
              onClick={goBack}
              className="px-10 py-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all font-bold border border-white/20 backdrop-blur-md shadow-xl hover:scale-105"
            >
              Cancel & Exit
            </button>
          </div>
        </motion.div>
      )}

      {/* Video Call Screen */}
      {!isMatching && matchedUser && (
        <motion.div 
          key="call"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col h-screen bg-gray-900 overflow-hidden relative"
        >
          {/* Header */}
          <div className="z-30 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="text-white hover:text-white/80 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-white font-semibold text-sm sm:text-base">{matchedUser}'s Consultation</h2>
                <p className="text-xs text-white/60">Live Session • Anonymous</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white text-xs font-mono">LIVE</span>
              </div>
              <button
                onClick={() => setShowChat(!showChat)}
                className={`p-2 rounded-full transition-all ${showChat ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <MessageSquare className="w-5 h-5" />
                {messages.length > 0 && !showChat && (
                  <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Video Area — fills remaining height */}
          <div className="flex-1 relative bg-black overflow-hidden">
            {/* Remote video — direct ref, src updated without React re-renders */}
            <img
              ref={remoteImgRef}
              alt="Remote video"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'none' }}
            />

            {/* Placeholder — shown until first frame arrives */}
            {!remoteVideoStarted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-center gap-4 p-6">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
                  <img src="/AvatarImages/PandaAvatar.png" alt="Partner" className="w-full h-full object-cover grayscale opacity-50" />
                </div>
                <div>
                  <p className="text-lg text-white font-medium">Connecting to {matchedUser}...</p>
                  <p className="text-sm text-gray-400 mt-1">Starting video stream...</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}

            {/* Remote camera OFF overlay — shown when partner turns off camera */}
            {remoteVideoStarted && !remoteVideoOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm z-10 gap-4">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                  <img src="/AvatarImages/PandaAvatar.png" alt={matchedUser ?? ''} className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-xl">{matchedUser}</p>
                  <p className="text-gray-400 text-sm mt-1 flex items-center justify-center gap-1.5">
                    <VideoOff className="w-4 h-4" /> Camera off
                  </p>
                </div>
              </div>
            )}

            {/* WebRTC hidden audio channel (P2P audio when available) */}
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute w-0 h-0 opacity-0" />

            {/* Remote mic indicator — bottom left */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {remoteAudioOn
                ? <Mic className="w-3.5 h-3.5 text-emerald-400" />
                : <MicOff className="w-3.5 h-3.5 text-red-400" />
              }
              <span className="text-white text-xs font-medium">{matchedUser}</span>
            </div>

            {/* Local Video PiP — top right, smaller on mobile */}
            <div className="absolute top-3 right-3 w-28 h-20 sm:w-40 sm:h-28 md:w-52 md:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Local camera OFF overlay */}
              {!isVideoOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                    <img src={`/AvatarImages/${user?.avatar || 'PandaAvatar'}.png`} alt="You" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/AvatarImages/PandaAvatar.png'; }} />
                  </div>
                  <span className="text-white text-[9px] font-semibold">You</span>
                </div>
              )}
              {/* Local labels */}
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-bold flex items-center gap-1">
                {isAudioOn ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-red-400" />}
                You
              </div>
            </div>

          </div> {/* end video area */}

          {/* Control Bar — fixed height, no overflow */}
          <div className="flex-shrink-0 z-30 bg-black/60 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-all duration-200 ${
                isAudioOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              }`}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all duration-200 ${
                isVideoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              }`}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-3 rounded-full transition-all duration-200 relative ${
                showChat ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {messages.length > 0 && !showChat && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 w-2.5 h-2.5 rounded-full border border-black/40" />
              )}
            </button>

            <button
              onClick={skipToNext}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={goBack}
              className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all duration-200"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>

          {/* Chat Panel — full-screen overlay on mobile, side panel on desktop */}
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 z-40 flex flex-col bg-white md:relative md:inset-auto md:w-[360px] md:border-l md:border-gray-200"
            >
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                  <h3 className="font-bold text-gray-900">Session Chat</h3>
                </div>
                <button onClick={() => setShowChat(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                    <div className="bg-purple-50 p-4 rounded-3xl">
                      <MessageSquare className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No messages yet.<br />Say something!</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={index} className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[80%] ${
                        message.sender === 'You'
                          ? 'bg-purple-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                      }`}>
                        {message.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200 focus-within:border-purple-300 transition-colors">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`transition-colors flex-shrink-0 ${showEmojiPicker ? 'text-purple-600' : 'text-gray-400 hover:text-purple-600'}`}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent py-1 text-gray-900 outline-none placeholder:text-gray-400 text-sm min-w-0"
                  />
                  <button
                    onClick={() => handleSendMessage(chatInput)}
                    disabled={!chatInput.trim()}
                    className="bg-purple-600 p-2 rounded-full text-white disabled:opacity-30 transition-all flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {showEmojiPicker && (
                  <div className="pt-3 max-h-36 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEmojiSelect(emoji)}
                          className="text-xl hover:bg-gray-100 p-1 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
