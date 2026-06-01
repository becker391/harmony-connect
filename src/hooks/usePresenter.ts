import { useState, useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export type PresenterMsg =
  | { type: 'presenter:claim';   userId: string; username: string }
  | { type: 'presenter:release'; userId: string }
  | { type: 'presenter:request'; fromUserId: string; fromUsername: string }
  | { type: 'presenter:approve'; toUserId: string }
  | { type: 'presenter:deny';    toUserId: string };

export interface PresenterState {
  presenterId:   string | null;   // who is currently presenting
  presenterName: string | null;
  // inbound request waiting on the current presenter to approve/deny
  pendingRequest: { userId: string; username: string } | null;
  // outbound: we sent a request and are waiting
  requestPending: boolean;
  // we were denied
  denied: boolean;
}

const PREFIX = '__rtc:';

function encode(msg: PresenterMsg): string {
  return PREFIX + JSON.stringify(msg);
}

function decode(content: string): PresenterMsg | null {
  if (!content.startsWith(PREFIX)) return null;
  try { return JSON.parse(content.slice(PREFIX.length)); } catch { return null; }
}

export function usePresenter(
  socket: Socket | null,
  roomId: string | null,
  myUserId: string,
  myUsername: string,
) {
  const [state, setState] = useState<PresenterState>({
    presenterId: null,
    presenterName: null,
    pendingRequest: null,
    requestPending: false,
    denied: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Receive coordination messages ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handle = (msg: {
      content: string;
      senderId: string;
      username: string;
    }) => {
      const parsed = decode(msg.content);
      if (!parsed) return;

      setState((prev) => {
        switch (parsed.type) {
          case "presenter:claim":
            return {
              ...prev,
              presenterId: parsed.userId,
              presenterName: parsed.username,
              pendingRequest: null,
            };

          case "presenter:release":
            return {
              ...prev,
              presenterId:
                prev.presenterId === parsed.userId ? null : prev.presenterId,
              presenterName:
                prev.presenterId === parsed.userId ? null : prev.presenterName,
              pendingRequest: null,
            };

          case "presenter:request":
            // Only the current presenter should see this
            if (prev.presenterId !== myUserId) return prev;
            return {
              ...prev,
              pendingRequest: {
                userId: parsed.fromUserId,
                username: parsed.fromUsername,
              },
            };

          case "presenter:approve":
            // The person who requested gets this
            if (parsed.toUserId !== myUserId) return prev;
            return { ...prev, requestPending: false, denied: false };

          case "presenter:deny":
            if (parsed.toUserId !== myUserId) return prev;
            return { ...prev, requestPending: false, denied: true };

          default:
            return prev;
        }
      });
    };

    socket.on("chat:message", handle);
    return () => {
      socket.off("chat:message", handle);
    };
  }, [socket, myUserId]);

  // ── Broadcast helper ───────────────────────────────────────────────────────
  const broadcast = useCallback(
    (msg: PresenterMsg) => {
      if (!socket || !roomId) return;
      socket.emit("chat:message", {
        roomId,
        content: encode(msg),
        messageId: `rtc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
    },
    [socket, roomId],
  );

  // ── Re-sync on late join ────────────────────────────────────────────────────
  // When any participant joins (or rejoins) the room, re-broadcast the current
  // presenter state so the new arrival gets in sync without needing a reload.
  useEffect(() => {
    if (!socket) return;
    const resync = () => {
      if (stateRef.current.presenterId === myUserId) {
        broadcast({
          type: "presenter:claim",
          userId: myUserId,
          username: myUsername,
        });
      }
    };
    socket.on("room:user_joined", resync);
    return () => {
      socket.off("room:user_joined", resync);
    };
  }, [socket, broadcast, myUserId, myUsername]);

  // ── Public actions ─────────────────────────────────────────────────────────

  /** Call when you start screen sharing */
  const claimPresenter = useCallback(() => {
    setState((prev) => ({
      ...prev,
      presenterId: myUserId,
      presenterName: myUsername,
    }));
    broadcast({
      type: "presenter:claim",
      userId: myUserId,
      username: myUsername,
    });
  }, [broadcast, myUserId, myUsername]);

  /** Call when you stop screen sharing */
  const releasePresenter = useCallback(() => {
    setState((prev) => ({
      ...prev,
      presenterId: prev.presenterId === myUserId ? null : prev.presenterId,
      presenterName: prev.presenterId === myUserId ? null : prev.presenterName,
    }));
    broadcast({ type: "presenter:release", userId: myUserId });
  }, [broadcast, myUserId]);

  /** Call when you want to present but someone else already is */
  const requestPresenter = useCallback(() => {
    setState((prev) => ({ ...prev, requestPending: true, denied: false }));
    broadcast({
      type: "presenter:request",
      fromUserId: myUserId,
      fromUsername: myUsername,
    });
  }, [broadcast, myUserId, myUsername]);

  /** Current presenter approves the takeover request */
  const approveRequest = useCallback(() => {
    const req = stateRef.current.pendingRequest;
    if (!req) return;
    broadcast({ type: "presenter:approve", toUserId: req.userId });
    setState((prev) => ({ ...prev, pendingRequest: null }));
    // Caller is responsible for stopping their own screen share after this
  }, [broadcast]);

  /** Current presenter denies the takeover request */
  const denyRequest = useCallback(() => {
    const req = stateRef.current.pendingRequest;
    if (!req) return;
    broadcast({ type: "presenter:deny", toUserId: req.userId });
    setState((prev) => ({ ...prev, pendingRequest: null }));
  }, [broadcast]);

  /** Clear the denied flag after showing the toast */
  const clearDenied = useCallback(() => {
    setState((prev) => ({ ...prev, denied: false }));
  }, []);

  const clearPendingRequest = useCallback(() => {
    setState((prev) => ({ ...prev, requestPending: false }));
  }, []);

  return {
    ...state,
    claimPresenter,
    releasePresenter,
    requestPresenter,
    approveRequest,
    denyRequest,
    clearDenied,
    clearPendingRequest,
  };
}
