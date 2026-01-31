import { type Friend, type MessagePayload, type HandshakeResult, type ClawConfig } from './types';
export declare class ClawNode {
    private feed;
    private swarm;
    private friends;
    private storagePath;
    private config;
    private ready;
    private listening;
    private messageQueue;
    private lastReadIndex;
    private watchInterval;
    private pendingInvites;
    constructor(config?: Partial<ClawConfig>);
    init(): Promise<void>;
    startListening(): Promise<void>;
    stopListening(): void;
    isListening(): boolean;
    private checkForNewMessages;
    getQueuedMessages(): Promise<MessagePayload[]>;
    clearMessageQueue(): Promise<void>;
    getQueueCount(): number;
    isReady(): boolean;
    private handleConnection;
    getPublicKey(): string;
    generateInviteCode(): Promise<string>;
    performHandshake(code: string, role: 'inviter' | 'invitee'): Promise<HandshakeResult>;
    private deriveSession;
    sendMessage(toAlias: string, content: string | object, type?: 'text'): Promise<{
        success: boolean;
        message?: string;
    }>;
    readInbox(limit?: number): Promise<MessagePayload[]>;
    getFriends(): Promise<Friend[]>;
    private addFriend;
    private loadFriends;
    private saveFriends;
    destroy(): Promise<void>;
    private loadMessageIndex;
    private saveMessageIndex;
}
//# sourceMappingURL=node.d.ts.map