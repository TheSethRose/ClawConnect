"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = void 0;
const node_1 = require("./node");
// Global node instance
let node = null;
function getNode() {
    if (!node) {
        throw new Error('ClawConnect not initialized. Run `claw_connect_init` first.');
    }
    return node;
}
exports.tools = {
    /**
     * Initialize ClawConnect node
     */
    claw_connect_init: {
        description: 'Initialize ClawConnect P2P messaging node',
        parameters: {
            type: 'object',
            properties: {
                storagePath: {
                    type: 'string',
                    description: 'Optional: Custom storage path (default: ~/.claw-connect)'
                }
            },
            required: []
        },
        async run(args = {}) {
            try {
                const nodeInstance = new node_1.ClawNode({
                    storagePath: args.storagePath
                });
                await nodeInstance.init();
                node = nodeInstance;
                const publicKey = nodeInstance.getPublicKey();
                return {
                    success: true,
                    message: 'ClawConnect initialized!',
                    publicKey: publicKey.slice(0, 16) + '...',
                    instructions: 'Run `claw_connect_start` to begin listening for connections, then `claw_connect_invite` to create an invite code.'
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to initialize: ${error.message}`
                };
            }
        }
    },
    /**
     * Start listening for connections and messages (keeps node running in background)
     */
    claw_connect_start: {
        description: 'Start listening for incoming connections and messages. Call this to keep the node running.',
        parameters: {
            type: 'object',
            properties: {}
        },
        async run() {
            try {
                const nodeInstance = getNode();
                await nodeInstance.startListening();
                return {
                    success: true,
                    message: 'ClawConnect is now listening for connections and messages!',
                    listening: true,
                    instructions: 'Use `claw_connect_check` to see if you have new messages. Share your invite code with friends so they can connect to you.'
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to start listening: ${error.message}`
                };
            }
        }
    },
    /**
     * Check for new messages in the queue
     */
    claw_connect_check: {
        description: 'Check for new messages and connection requests',
        parameters: {
            type: 'object',
            properties: {}
        },
        async run() {
            try {
                const nodeInstance = getNode();
                const queuedMessages = await nodeInstance.getQueuedMessages();
                const queueCount = nodeInstance.getQueueCount();
                const friends = await nodeInstance.getFriends();
                return {
                    success: true,
                    newMessages: queuedMessages.length,
                    listening: nodeInstance.isListening(),
                    friendsCount: friends.length,
                    message: queueCount > 0
                        ? `You have ${queueCount} new message(s). Use claw_connect_read to view them.`
                        : 'No new messages. Keep listening for incoming connections.',
                    instructions: queueCount > 0
                        ? 'Run `claw_connect_read` to see your new messages.'
                        : 'Share your invite code so others can connect to you.'
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to check messages: ${error.message}`
                };
            }
        }
    },
    /**
     * Generate an invite code to share with a friend
     */
    claw_connect_invite: {
        description: 'Generate an invite code to link with a friend',
        parameters: {
            type: 'object',
            properties: {}
        },
        async run() {
            try {
                const nodeInstance = getNode();
                const code = await nodeInstance.generateInviteCode();
                return {
                    success: true,
                    message: 'Invite code generated! Share this with your friend:',
                    code,
                    instructions: 'Your friend should run `claw_connect_join` with this code.'
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to generate invite: ${error.message}`
                };
            }
        }
    },
    /**
     * Join a friend's ClawConnect network using their invite code
     */
    claw_connect_join: {
        description: 'Join a friend\'s ClawConnect network using their invite code',
        parameters: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'The invite code from your friend (format: claw-xxxxxxx)'
                }
            },
            required: ['code']
        },
        async run(args) {
            try {
                const nodeInstance = getNode();
                if (!args.code.startsWith('claw-')) {
                    return {
                        success: false,
                        message: 'Invalid invite code format. Must start with "claw-"'
                    };
                }
                const result = await nodeInstance.performHandshake(args.code, 'invitee');
                if (result.success) {
                    return {
                        success: true,
                        message: 'Successfully linked! You can now send and receive messages.',
                        peerKey: result.peerKey?.slice(0, 16) + '...'
                    };
                }
                else {
                    return {
                        success: false,
                        message: `Handshake failed: ${result.error}`
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to join: ${error.message}`
                };
            }
        }
    },
    /**
     * Send a message to a linked friend
     */
    claw_connect_send: {
        description: 'Send a message to a linked friend',
        parameters: {
            type: 'object',
            properties: {
                to: {
                    type: 'string',
                    description: 'Friend alias (from claw_connect_friends list)'
                },
                message: {
                    type: 'string',
                    description: 'Message content'
                }
            },
            required: ['to', 'message']
        },
        async run(args) {
            try {
                const nodeInstance = getNode();
                const result = await nodeInstance.sendMessage(args.to, args.message);
                return {
                    success: result.success,
                    message: result.message
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to send: ${error.message}`
                };
            }
        }
    },
    /**
     * Read messages from your inbox
     */
    claw_connect_read: {
        description: 'Read messages from your inbox (last N messages)',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of recent messages to fetch (default: 10)'
                }
            },
            required: []
        },
        async run(args = {}) {
            try {
                const nodeInstance = getNode();
                const messages = await nodeInstance.readInbox(args.limit || 10);
                return {
                    success: true,
                    messages: messages.map(m => ({
                        id: m.id.slice(0, 8),
                        from: m.from.slice(0, 16) + '...',
                        type: m.type,
                        content: m.content,
                        timestamp: new Date(m.timestamp).toISOString()
                    })),
                    count: messages.length
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to read inbox: ${error.message}`
                };
            }
        }
    },
    /**
     * List linked friends
     */
    claw_connect_friends: {
        description: 'List all linked friends',
        parameters: {
            type: 'object',
            properties: {}
        },
        async run() {
            try {
                const nodeInstance = getNode();
                const friends = await nodeInstance.getFriends();
                return {
                    success: true,
                    friends: friends.map(f => ({
                        alias: f.alias,
                        publicKey: f.publicKey.slice(0, 16) + '...',
                        trusted: f.trusted,
                        addedAt: new Date(f.addedAt).toISOString()
                    })),
                    count: friends.length
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to get friends: ${error.message}`
                };
            }
        }
    },
    /**
     * Get ClawConnect status
     */
    claw_connect_status: {
        description: 'Check ClawConnect node status',
        parameters: {
            type: 'object',
            properties: {}
        },
        async run() {
            try {
                const nodeInstance = getNode();
                const friends = await nodeInstance.getFriends();
                return {
                    success: true,
                    initialized: nodeInstance.isReady(),
                    publicKey: nodeInstance.getPublicKey().slice(0, 16) + '...',
                    friendCount: friends.length
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Status check failed: ${error.message}`
                };
            }
        }
    },
    /**
     * Cleanup and shutdown
     */
    claw_connect_destroy: {
        description: 'Shutdown ClawConnect node and cleanup',
        parameters: {
            type: 'object',
            properties: {}
        },
        async run() {
            try {
                if (node) {
                    await node.destroy();
                    node = null;
                }
                return {
                    success: true,
                    message: 'ClawConnect node destroyed'
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to destroy: ${error.message}`
                };
            }
        }
    }
};
//# sourceMappingURL=index.js.map