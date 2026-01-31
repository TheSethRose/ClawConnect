// Type definitions for ClawConnect

export interface Identity {
  alias: string;
  publicKey: string; // Hex string
}

export interface Friend extends Identity {
  topic?: string;
  trusted: boolean;
  addedAt: number;
}

export type MessageType = 'text' | 'skill' | 'task_request' | 'status';

export interface MessagePayload {
  id: string;
  type: MessageType;
  from: string;
  timestamp: number;
  content: string | object;
  meta?: {
    urgency?: 'low' | 'medium' | 'high';
    mood?: string;
  };
}

export interface HandshakeResult {
  success: boolean;
  peerKey?: string;
  code?: string;
  error?: string;
}

export interface ModerationAction {
  type: 'mute' | 'block';
  peerKey: string;
  reason: string;
  expiresAt?: number; // Unix timestamp for temp mute
}

export interface ReputationScore {
  peerKey: string;
  score: number; // -100 to 100
  reports: number;
  positiveInteractions: number;
}

export interface ClawConfig {
  storagePath: string;
  maxMessageSize: number;
  handshakeTimeout: number; // milliseconds
  spamThreshold: number; // messages per minute
}
