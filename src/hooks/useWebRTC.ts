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

  const isInitialized = useRef(false)
  const initInProgress = useRef(false)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const dataChannel = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const createPeerConnection = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      if (peerConnection.current) {
        peerConnection.current.close()
        peerConnection.current = null
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      })

      peerConnection.current = pc

      stream.getTracks().forEach((track: MediaStreamTrack) => {
        if (peerConnection.current) {
          peerConnection.current.addTrack(track, stream)
        }
      })

      pc.ontrack = (event) => {
        if (event.streams?.[0] && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setRemoteStream(event.streams[0])
          
          // Monitor remote audio track
          const audioTrack = event.streams[0].getAudioTracks()[0]
          if (audioTrack) {
            setRemoteAudioOn(audioTrack.enabled)
            
            // Listen for track changes
            audioTrack.onended = () => setRemoteAudioOn(false)
            audioTrack.onmute = () => setRemoteAudioOn(false)
            audioTrack.onunmute = () => setRemoteAudioOn(true)
          }
        }
      }

      pc.onconnectionstatechange = () => {
        onConnectionStateChange(pc.connectionState)
      }

      // Create data channel for chat and metadata
      dataChannel.current = pc.createDataChannel("chat")
      dataChannel.current.onopen = () => {
        console.log("Data channel opened")
      }
      dataChannel.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle different message types
          if (data.type === 'chat') {
            onMessageReceived(data.message)
          } else if (data.type === 'username') {
            onRemoteUserJoined(data.username)
          } else if (data.type === 'audioStatus') {
            setRemoteAudioOn(data.enabled)
          }
        } catch {
          // If not JSON, treat as plain text message
          onMessageReceived(event.data)
        }
      }

      // Handle incoming data channels
      pc.ondatachannel = (event) => {
        const receiveChannel = event.channel
        receiveChannel.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            
            if (data.type === 'chat') {
              onMessageReceived(data.message)
            } else if (data.type === 'username') {
              onRemoteUserJoined(data.username)
            } else if (data.type === 'audioStatus') {
              setRemoteAudioOn(data.enabled)
            }
          } catch {
            onMessageReceived(e.data)
          }
        }
      }

      return pc
    },
    [remoteVideoRef, onConnectionStateChange, onMessageReceived, onRemoteUserJoined]
  )

  const initMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) {
      console.log("Media already initialized")
      return localStreamRef.current
    }

    if (initInProgress.current) {
      console.log("Media initialization already in progress")
      return null
    }

    console.log("Initializing media...")
    initInProgress.current = true
    setIsLoading(true)
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      localStreamRef.current = stream
      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch((e: Error) => {
            console.log("Play error:", e)
          })
        }
      }

      // Set initial states based on tracks
      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      
      if (videoTrack) {
        setIsVideoOn(videoTrack.enabled)
      }
      if (audioTrack) {
        setIsAudioOn(audioTrack.enabled)
      }

      isInitialized.current = true
      return stream
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to access media devices"
      setError(errorMessage)
      console.error("Error initializing media:", errorMessage)
      return null
    } finally {
      setIsLoading(false)
      initInProgress.current = false
    }
  }, [localVideoRef])

  const setupPeerConnection = useCallback(
    async (stream: MediaStream, roomId: string, isOfferer: boolean): Promise<void> => {
      const pc = createPeerConnection(stream)

      // Listen for ICE candidates from remote
      socketService.on('signal', async ({ signal }) => {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.emit('signal', { roomId, signal: pc.localDescription });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
          } catch (e) {
            console.error("Error adding received ice candidate", e);
          }
        }
      });

      // Send local ICE candidates to remote
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('signal', { roomId, signal: event.candidate });
        }
      };

      try {
        if (isOfferer) {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socketService.emit('signal', { roomId, signal: pc.localDescription });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create peer connection"
        setError(errorMessage)
        console.error("Error setting up peer connection:", errorMessage)
      }
    },
    [createPeerConnection]
  )

  // Initialization is now controlled by the component
  const startCall = useCallback(async (roomId: string, isOfferer: boolean) => {
    try {
      const stream = await initMedia();
      if (stream) {
        await setupPeerConnection(stream, roomId, isOfferer);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call");
    }
  }, [initMedia, setupPeerConnection]);

  // Clean up socket listeners on unmount
  useEffect(() => {
    return () => {
      socketService.off('signal');
    };
  }, []);

  useEffect(() => {
    return (): void => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
        localStreamRef.current = null
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => {
          track.stop()
        })
      }

      if (peerConnection.current) {
        peerConnection.current.ontrack = null
        peerConnection.current.onconnectionstatechange = null
        peerConnection.current.close()
        peerConnection.current = null
      }

      if (dataChannel.current) {
        dataChannel.current.close()
        dataChannel.current = null
      }

      isInitialized.current = false
      initInProgress.current = false
    }
  }, [remoteStream])

  const toggleVideo = useCallback((): void => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }, [])

  const toggleAudio = useCallback((): void => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
        
        // Notify remote peer about audio status change
        if (dataChannel.current && dataChannel.current.readyState === "open") {
          dataChannel.current.send(JSON.stringify({
            type: 'audioStatus',
            enabled: !audioTrack.enabled
          }))
        }
      }
    }
  }, [])

  const retryConnection = useCallback(async (roomId: string, isOfferer: boolean): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      isInitialized.current = false
      initInProgress.current = false
      
      const stream = await initMedia()
      if (stream) {
        await setupPeerConnection(stream, roomId, isOfferer)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry connection")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [initMedia, setupPeerConnection])

  const sendMessage = useCallback(
    (message: string): void => {
      if (dataChannel.current && dataChannel.current.readyState === "open") {
        dataChannel.current.send(JSON.stringify({
          type: 'chat',
          message: message
        }))
      } else {
        console.warn("Data channel not ready for sending messages")
      }
    },
    []
  )

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