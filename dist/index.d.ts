/**
 * ClawConnect Skill - Decentralized Agent-to-Agent Messaging
 *
 * Tools for P2P messaging between OpenClaw agents using Hypercore + Hyperswarm.
 *
 * Usage:
 * 1. Run `claw_connect_init` to initialize the node
 * 2. Run `claw_connect_invite` to generate an invite code (share with friend)
 * 3. Friend runs `claw_connect_join` with your invite code
 * 4. Use `claw_connect_send` and `claw_connect_read` to exchange messages
 */
export declare const tools: {
    /**
     * Initialize ClawConnect node
     */
    claw_connect_init: {
        description: string;
        parameters: {
            type: string;
            properties: {
                storagePath: {
                    type: string;
                    description: string;
                };
            };
            required: never[];
        };
        run(args?: {
            storagePath?: string;
        }): Promise<{
            success: boolean;
            message: string;
            publicKey: string;
            instructions: string;
        } | {
            success: boolean;
            message: string;
            publicKey?: undefined;
            instructions?: undefined;
        }>;
    };
    /**
     * Generate an invite code to share with a friend
     */
    claw_connect_invite: {
        description: string;
        parameters: {
            type: string;
            properties: {};
        };
        run(): Promise<{
            success: boolean;
            message: string;
            code: string;
            instructions: string;
        } | {
            success: boolean;
            message: string;
            code?: undefined;
            instructions?: undefined;
        }>;
    };
    /**
     * Join a friend's ClawConnect network using their invite code
     */
    claw_connect_join: {
        description: string;
        parameters: {
            type: string;
            properties: {
                code: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        run(args: {
            code: string;
        }): Promise<{
            success: boolean;
            message: string;
            peerKey?: undefined;
        } | {
            success: boolean;
            message: string;
            peerKey: string;
        }>;
    };
    /**
     * Send a message to a linked friend
     */
    claw_connect_send: {
        description: string;
        parameters: {
            type: string;
            properties: {
                to: {
                    type: string;
                    description: string;
                };
                message: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        run(args: {
            to: string;
            message: string;
        }): Promise<{
            success: boolean;
            message: string | undefined;
        }>;
    };
    /**
     * Read messages from your inbox
     */
    claw_connect_read: {
        description: string;
        parameters: {
            type: string;
            properties: {
                limit: {
                    type: string;
                    description: string;
                };
            };
            required: never[];
        };
        run(args?: {
            limit?: number;
        }): Promise<{
            success: boolean;
            messages: {
                id: string;
                from: string;
                type: import("./types").MessageType;
                content: string | object;
                timestamp: string;
            }[];
            count: number;
            message?: undefined;
        } | {
            success: boolean;
            message: string;
            messages?: undefined;
            count?: undefined;
        }>;
    };
    /**
     * List linked friends
     */
    claw_connect_friends: {
        description: string;
        parameters: {
            type: string;
            properties: {};
        };
        run(): Promise<{
            success: boolean;
            friends: {
                alias: string;
                publicKey: string;
                trusted: boolean;
                addedAt: string;
            }[];
            count: number;
            message?: undefined;
        } | {
            success: boolean;
            message: string;
            friends?: undefined;
            count?: undefined;
        }>;
    };
    /**
     * Get ClawConnect status
     */
    claw_connect_status: {
        description: string;
        parameters: {
            type: string;
            properties: {};
        };
        run(): Promise<{
            success: boolean;
            initialized: boolean;
            publicKey: string;
            friendCount: number;
            message?: undefined;
        } | {
            success: boolean;
            message: string;
            initialized?: undefined;
            publicKey?: undefined;
            friendCount?: undefined;
        }>;
    };
    /**
     * Cleanup and shutdown
     */
    claw_connect_destroy: {
        description: string;
        parameters: {
            type: string;
            properties: {};
        };
        run(): Promise<{
            success: boolean;
            message: string;
        }>;
    };
};
export type ClawConnectTools = typeof tools;
//# sourceMappingURL=index.d.ts.map