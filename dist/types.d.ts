export interface Identity {
    alias: string;
    publicKey: string;
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
    expiresAt?: number;
}
export interface ReputationScore {
    peerKey: string;
    score: number;
    reports: number;
    positiveInteractions: number;
}
export interface ClawConfig {
    storagePath: string;
    maxMessageSize: number;
    handshakeTimeout: number;
    spamThreshold: number;
}
//# sourceMappingURL=types.d.ts.map