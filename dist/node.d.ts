import { type Friend, type MessagePayload, type HandshakeResult, type ClawConfig } from './types';
export declare class ClawNode {
    private feed;
    private swarm;
    private friends;
    private storagePath;
    private config;
    private ready;
    constructor(config?: Partial<ClawConfig>);
    init(): Promise<void>;
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
}
//# sourceMappingURL=node.d.ts.map