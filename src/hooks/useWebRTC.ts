import { useRef, useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { ENV } from '@/config/env';
import type { MediaState } from '@/types/rtc';

interface PeerStreams { [userId: string]: MediaStream }

export function useWebRTC(socket: Socket | null, roomId: string | null, myUserId: string) {
  const peersRef        = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef  = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [remoteStreams, setRemoteStreams] = useState<PeerStreams>({});
  const [localStream,   setLocalStream]  = useState<MediaStream | null>(null);
  const [screenStream,  setScreenStream] = useState<MediaStream | null>(null);
  const [mediaState,    setMediaState]   = useState<MediaState>({ audio: false, video: false, screen: false });

  // ── Peer factory ────────────────────────────────────────────────────────────
  const createPeer = useCallback((remoteUserId: string, initiator: boolean): RTCPeerConnection => {
    peersRef.current[remoteUserId]?.close();

    const pc = new RTCPeerConnection({ iceServers: [...ENV.ICE_SERVERS] });
    peersRef.current[remoteUserId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => pc.addTrack(t, screenStreamRef.current!));
    }

    pc.onicecandidate = ({ candidate }) => {
      socket?.emit('signal:ice', { roomId, targetUserId: remoteUserId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) setRemoteStreams(prev => ({ ...prev, [remoteUserId]: streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        delete peersRef.current[remoteUserId];
        setRemoteStreams(prev => { const n = { ...prev }; delete n[remoteUserId]; return n; });
      }
    };

    if (initiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('signal:offer', { roomId, targetUserId: remoteUserId, sdp: pc.localDescription });
        } catch (e) { console.error('offer error', e); }
      };
    }

    return pc;
  }, [socket, roomId]);

  // ── Socket signal handlers ──────────────────────────────────────────────────
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
      if (candidate) await peersRef.current[fromUserId]?.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleEnd = ({ fromUserId }: { fromUserId: string }) => {
      peersRef.current[fromUserId]?.close();
      delete peersRef.current[fromUserId];
      setRemoteStreams(prev => { const n = { ...prev }; delete n[fromUserId]; return n; });
    };

    const handleUserJoined = ({ participant }: { participant: { userId: string } }) => {
      if (String(participant.userId) !== String(myUserId)) createPeer(participant.userId, true);
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      peersRef.current[userId]?.close();
      delete peersRef.current[userId];
      setRemoteStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
    };

    socket.on('signal:offer',     handleOffer);
    socket.on('signal:answer',    handleAnswer);
    socket.on('signal:ice',       handleIce);
    socket.on('signal:end',       handleEnd);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:user_left',   handleUserLeft);

    return () => {
      socket.off('signal:offer',     handleOffer);
      socket.off('signal:answer',    handleAnswer);
      socket.off('signal:ice',       handleIce);
      socket.off('signal:end',       handleEnd);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:user_left',   handleUserLeft);
    };
  }, [socket, roomId, myUserId, createPeer]);

  // ── Media ───────────────────────────────────────────────────────────────────
  const startMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaState(prev => ({ ...prev, audio, video }));
      Object.values(peersRef.current).forEach(pc => {
        stream.getTracks().forEach(track => {
          const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
          sender ? sender.replaceTrack(track) : pc.addTrack(track, stream);
        });
      });
      return stream;
    } catch (e) {
      console.error('getUserMedia failed:', e);
      return null;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMediaState(prev => ({ ...prev, audio: track.enabled }));
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMediaState(prev => ({ ...prev, video: track.enabled }));
  }, []);

  // ── Screen share — pure stream management, no presenter logic ───────────────
  const startScreenShare = useCallback(async (onEnded?: () => void) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setMediaState(prev => ({ ...prev, screen: true }));
      Object.values(peersRef.current).forEach(pc => {
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
      });
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShareStream(stream);
        onEnded?.();
      };
      return stream;
    } catch (e) {
      console.error('getDisplayMedia failed:', e);
      return null;
    }
  }, []);

  const stopScreenShareStream = (stream: MediaStream) => {
    Object.values(peersRef.current).forEach(pc => {
      pc.getSenders()
        .filter(s => s.track && stream.getTracks().includes(s.track))
        .forEach(s => pc.removeTrack(s));
    });
    stream.getTracks().forEach(t => t.stop());
  };

  const stopScreenShare = useCallback(() => {
    const stream = screenStreamRef.current;
    if (!stream) return;
    stopScreenShareStream(stream);
    screenStreamRef.current = null;
    setScreenStream(null);
    setMediaState(prev => ({ ...prev, screen: false }));
  }, []);

  // ── Peers ───────────────────────────────────────────────────────────────────
  const connectToPeers = useCallback((participants: { userId: string }[]) => {
    participants.forEach(p => {
      if (String(p.userId) !== String(myUserId)) createPeer(p.userId, true);
    });
  }, [myUserId, createPeer]);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current  = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setScreenStream(null);
    setRemoteStreams({});
    setMediaState({ audio: false, video: false, screen: false });
  }, []);

  return {
    localStream, screenStream, remoteStreams, mediaState,
    startMedia, toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare,
    connectToPeers, cleanup,
  };
}
