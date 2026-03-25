"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { socketService } from "../services/socketService"

interface UseWebRTCOptions {
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onMessageReceived?: (message: string) => void
  onRemoteUserJoined?: (username: string) => void
}

interface UseWebRTCReturn {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isVideoOn: boolean
  isAudioOn: boolean
  remoteAudioOn: boolean
  isLoading: boolean
  error: string | null
  toggleVideo: () => void
  toggleAudio: () => void
  retryConnection: (roomId: string, isOfferer: boolean) => Promise<boolean>
  initMedia: () => Promise<MediaStream | null>
  startCall: (roomId: string, isOfferer: boolean) => Promise<void>
  dataChannel: RTCDataChannel | null
  sendMessage: (message: string) => void
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  // Free TURN servers (multiple for redundancy)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turns:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  // Backup free TURN
  {
    urls: "turn:relay1.expressturn.com:3478",
    username: "efVNF9I7GKFZPDUKQL",
    credential: "2FLoLFV4Ly2VPnKm",
  },
];

export const useWebRTC = ({
  localVideoRef,
  remoteVideoRef,
  onConnectionStateChange = () => {},
  onMessageReceived = () => {},
  onRemoteUserJoined = () => {},
}: UseWebRTCOptions): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [remoteAudioOn, setRemoteAudioOn] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initInProgress = useRef(false)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const dataChannel = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  // Buffer for ICE candidates that arrive before remote description is set
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
  const remoteDescSet = useRef(false)

  const remoteStreamRef = useRef<MediaStream>(new MediaStream())

  const createPeerConnection = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      // Clean up any existing connection
      if (peerConnection.current) {
        peerConnection.current.close()
        peerConnection.current = null
      }
      pendingCandidates.current = []
      remoteDescSet.current = false
      // Reset remote stream accumulator
      remoteStreamRef.current = new MediaStream()
      setRemoteStream(null)

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 })
      peerConnection.current = pc

      // Add local tracks
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        pc.addTrack(track, stream)
      })

      // When we get remote tracks, display them
      // CRITICAL: Handle BOTH event.streams (desktop) AND bare event.track (iOS/Android)
      pc.ontrack = (event) => {
        console.log("🎥 Remote track received:", event.track.kind, "streams:", event.streams.length)
        
        const rs = remoteStreamRef.current
        
        if (event.streams && event.streams.length > 0) {
          // Standard path: use the stream directly
          event.streams[0].getTracks().forEach(track => {
            if (!rs.getTracks().includes(track)) rs.addTrack(track)
          })
        } else {
          // Mobile/iOS path: add bare track to our accumulator stream
          rs.addTrack(event.track)
        }

        // Make sure video element shows the stream
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rs
          remoteVideoRef.current.play().catch((e) => console.warn("Remote play error:", e))
        }
        setRemoteStream(rs)

        const audioTrack = rs.getAudioTracks()[0]
        if (audioTrack) {
          setRemoteAudioOn(audioTrack.enabled)
          audioTrack.onmute = () => setRemoteAudioOn(false)
          audioTrack.onunmute = () => setRemoteAudioOn(true)
        }
      }

      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState)
        onConnectionStateChange(pc.connectionState)
      }

      pc.onicegatheringstatechange = () => {
        console.log("🧊 ICE gathering:", pc.iceGatheringState)
      }

      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE connection:", pc.iceConnectionState)
      }

      // Handle incoming data channels (answerer side)
      pc.ondatachannel = (event) => {
        console.log("📡 Data channel received")
        dataChannel.current = event.channel
        setupDataChannelListeners(event.channel)
      }

      return pc
    },
    [remoteVideoRef, onConnectionStateChange, onMessageReceived, onRemoteUserJoined]
  )

  const setupDataChannelListeners = (channel: RTCDataChannel) => {
    channel.onopen = () => console.log("💬 Data channel open")
    channel.onclose = () => console.log("💬 Data channel closed")
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "chat") onMessageReceived(data.message)
        else if (data.type === "username") onRemoteUserJoined(data.username)
        else if (data.type === "audioStatus") setRemoteAudioOn(data.enabled)
      } catch {
        onMessageReceived(event.data)
      }
    }
  }

  const initMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current
    if (initInProgress.current) return null

    console.log("🎬 Initializing media...")
    initInProgress.current = true
    setIsLoading(true)
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })

      localStreamRef.current = stream
      setLocalStream(stream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch((e) => console.warn("Local play error:", e))
      }

      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      if (videoTrack) setIsVideoOn(videoTrack.enabled)
      if (audioTrack) setIsAudioOn(audioTrack.enabled)

      return stream
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to access camera/mic"
      setError(msg)
      console.error("❌ Media error:", msg)
      return null
    } finally {
      setIsLoading(false)
      initInProgress.current = false
    }
  }, [localVideoRef])

  const setupPeerConnection = useCallback(
    async (stream: MediaStream, roomId: string, isOfferer: boolean): Promise<void> => {
      const pc = createPeerConnection(stream)

      // Create data channel (offerer side only — answerer gets it via ondatachannel)
      if (isOfferer) {
        const dc = pc.createDataChannel("chat")
        dataChannel.current = dc
        setupDataChannelListeners(dc)
      }

      // ⚠️ CRITICAL: Remove any old signal listeners BEFORE adding a new one
      socketService.off("signal")

      socketService.on("signal", async ({ signal }: { signal: RTCSessionDescriptionInit | RTCIceCandidateInit }) => {
        try {
          const desc = signal as RTCSessionDescriptionInit
          if (desc.type === "offer") {
            console.log("📨 Received offer")
            await pc.setRemoteDescription(new RTCSessionDescription(desc))
            remoteDescSet.current = true
            // Flush any buffered ICE candidates
            for (const c of pendingCandidates.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) => console.warn("Buffered ICE error:", e))
            }
            pendingCandidates.current = []
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            socketService.emit("signal", { roomId, signal: pc.localDescription })
          } else if (desc.type === "answer") {
            console.log("📨 Received answer")
            await pc.setRemoteDescription(new RTCSessionDescription(desc))
            remoteDescSet.current = true
            // Flush buffered candidates
            for (const c of pendingCandidates.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) => console.warn("Buffered ICE error:", e))
            }
            pendingCandidates.current = []
          } else {
            // ICE Candidate
            const candidate = signal as RTCIceCandidateInit
            if (candidate.candidate) {
              if (remoteDescSet.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) =>
                  console.warn("ICE error:", e)
                )
              } else {
                // Buffer until remote desc is set
                pendingCandidates.current.push(candidate)
              }
            }
          }
        } catch (e) {
          console.error("❌ Signal handling error:", e)
        }
      })

      // Send ICE candidates as they're gathered
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit("signal", { roomId, signal: event.candidate.toJSON() })
        }
      }

      // Offerer creates and sends the offer
      if (isOfferer) {
        try {
          console.log("📤 Creating offer...")
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socketService.emit("signal", { roomId, signal: pc.localDescription })
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to create offer")
          console.error("❌ Offer error:", err)
        }
      }
    },
    [createPeerConnection]
  )

  const startCall = useCallback(
    async (roomId: string, isOfferer: boolean) => {
      try {
        const stream = await initMedia()
        if (stream) {
          await setupPeerConnection(stream, roomId, isOfferer)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start call")
      }
    },
    [initMedia, setupPeerConnection]
  )

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      socketService.off("signal")
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
      peerConnection.current?.close()
      peerConnection.current = null
      dataChannel.current?.close()
      dataChannel.current = null
      initInProgress.current = false
    }
  }, [])

  const toggleVideo = useCallback((): void => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0]
      if (track) {
        track.enabled = !track.enabled
        setIsVideoOn(track.enabled)
      }
    }
  }, [])

  const toggleAudio = useCallback((): void => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0]
      if (track) {
        track.enabled = !track.enabled
        setIsAudioOn(track.enabled)
        if (dataChannel.current?.readyState === "open") {
          dataChannel.current.send(JSON.stringify({ type: "audioStatus", enabled: track.enabled }))
        }
      }
    }
  }, [])

  const retryConnection = useCallback(
    async (roomId: string, isOfferer: boolean): Promise<boolean> => {
      try {
        setIsLoading(true)
        setError(null)
        initInProgress.current = false
        localStreamRef.current = null
        const stream = await initMedia()
        if (stream) {
          await setupPeerConnection(stream, roomId, isOfferer)
          return true
        }
        return false
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to retry")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [initMedia, setupPeerConnection]
  )

  const sendMessage = useCallback((message: string): void => {
    if (dataChannel.current?.readyState === "open") {
      dataChannel.current.send(JSON.stringify({ type: "chat", message }))
    } else {
      console.warn("⚠️ DataChannel not open, message not sent via P2P")
    }
  }, [])

  return {
    localStream,
    remoteStream,
    isVideoOn,
    isAudioOn,
    remoteAudioOn,
    isLoading,
    error,
    toggleVideo,
    toggleAudio,
    retryConnection,
    initMedia,
    startCall,
    dataChannel: dataChannel.current,
    sendMessage,
  }
}