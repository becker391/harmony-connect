export interface Participant {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: string;
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  username: string;
  content: string;
  timestamp: string;
  roomId: string;
}

export interface UserCredentials {
  username: string;
  token: string;
  userId: string;
}

export interface RoomState {
  roomId: string;
  participants: Participant[];
  isConnected: boolean;
}

export type MediaState = {
  audio: boolean;
  video: boolean;
  screen: boolean;
};
