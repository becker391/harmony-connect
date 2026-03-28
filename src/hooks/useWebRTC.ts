import { useRef, useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { ENV } from '@/config/env';
import type { MediaState } from '@/types/rtc';

interface PeerStreams {
  [userId: string]: MediaStream;
}

export function useWebRTC(socket: Socket | null, roomId: string | null, myUserId: string) {
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<PeerStreams>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [mediaState, setMediaState] = useState<MediaState>({ audio: true, video: true, screen: false });

  const updateRemoteStreams = useCallback(() => {
    // Force re-render by creating new object
    setRemoteStreams(prev => ({ ...prev }));
  }, []);

  const createPeer = useCallback((remoteUserId: string, initiator: boolean): RTCPeerConnection => {
    if (peersRef.current[remoteUserId]) {
      peersRef.current[remoteUserId].close();
    }

    const pc = new RTCPeerConnection({ iceServers: ENV.ICE_SERVERS });
    peersRef.current[remoteUserId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }

    // Add screen tracks if sharing
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => pc.addTrack(t, screenStreamRef.current!));
    }

    pc.onicecandidate = ({ candidate }) => {
      if (socket && roomId) {
        socket.emit('signal:ice', { roomId, targetUserId: remoteUserId, candidate });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        setRemoteStreams(prev => ({ ...prev, [remoteUserId]: streams[0] }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        delete peersRef.current[remoteUserId];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[remoteUserId];
          return next;
        });
      }
    };

    if (initiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('signal:offer', {
            roomId,
            targetUserId: remoteUserId,
            sdp: pc.localDescription,
          });
        } catch (e) {
          console.error('Failed to create offer:', e);
        }
      };
    }

    return pc;
  }, [socket, roomId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = createPeer(fromUserId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('signal:answer', { roomId, targetUserId: fromUserId, sdp: pc.localDescription });
    };

    const handleAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      await peersRef.current[fromUserId]?.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    const handleIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: RTCIceCandidateInit | null }) => {
      if (candidate) {
        await peersRef.current[fromUserId]?.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleEnd = ({ fromUserId }: { fromUserId: string }) => {
      peersRef.current[fromUserId]?.close();
      delete peersRef.current[fromUserId];
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[fromUserId];
        return next;
      });
    };

    const handleUserJoined = ({ participant }: { participant: { userId: string } }) => {
      if (String(participant.userId) !== String(myUserId)) {
        createPeer(participant.userId, true);
      }
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      peersRef.current[userId]?.close();
      delete peersRef.current[userId];
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on('signal:offer', handleOffer);
    socket.on('signal:answer', handleAnswer);
    socket.on('signal:ice', handleIce);
    socket.on('signal:end', handleEnd);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:user_left', handleUserLeft);

    return () => {
      socket.off('signal:offer', handleOffer);
      socket.off('signal:answer', handleAnswer);
      socket.off('signal:ice', handleIce);
      socket.off('signal:end', handleEnd);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:user_left', handleUserLeft);
    };
  }, [socket, roomId, myUserId, createPeer]);

  const startMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaState(prev => ({ ...prev, audio, video }));
      return stream;
    } catch (e) {
      console.error('Failed to get media:', e);
      return null;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setMediaState(prev => ({ ...prev, audio: track.enabled }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setMediaState(prev => ({ ...prev, video: track.enabled }));
      }
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setMediaState(prev => ({ ...prev, screen: true }));

      // Add screen tracks to all peers
      Object.values(peersRef.current).forEach(pc => {
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
      });

      // Handle browser stop
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (e) {
      console.error('Failed to share screen:', e);
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      Object.values(peersRef.current).forEach(pc => {
        pc.getSenders()
          .filter(s => screenStreamRef.current!.getTracks().includes(s.track!))
          .forEach(s => pc.removeTrack(s));
      });
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setMediaState(prev => ({ ...prev, screen: false }));
    }
  }, []);

  const connectToPeers = useCallback((participants: { userId: string }[]) => {
    participants.forEach(p => {
      if (String(p.userId) !== String(myUserId)) {
        createPeer(p.userId, true);
      }
    });
  }, [myUserId, createPeer]);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setScreenStream(null);
    setRemoteStreams({});
  }, []);

  return {
    localStream,
    screenStream,
    remoteStreams,
    mediaState,
    startMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    connectToPeers,
    cleanup,
  };
}
