"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClawNode = void 0;
const hypercore_1 = __importDefault(require("hypercore"));
const hyperswarm_1 = __importDefault(require("hyperswarm"));
const crypto_1 = __importDefault(require("crypto"));
const b4a_1 = __importDefault(require("b4a"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
// Detect Apple Silicon for Hypercore compatibility workaround
const isAppleSilicon = os_1.default.platform() === 'darwin' && os_1.default.arch() === 'arm64';
class ClawNode {
    constructor(config) {
        this.feed = null;
        this.swarm = null;
        this.friends = new Map();
        this.ready = false;
        this.listening = false;
        this.messageQueue = [];
        this.lastReadIndex = 0;
        this.watchInterval = null;
        this.pendingInvites = new Map();
        this.storagePath = config?.storagePath || path_1.default.join(process.env.HOME || '.', '.claw-connect');
        this.config = {
            storagePath: this.storagePath,
            maxMessageSize: config?.maxMessageSize || 1024 * 1024, // 1MB
            handshakeTimeout: config?.handshakeTimeout || 60000, // 60s
            spamThreshold: config?.spamThreshold || 10, // msg/min
        };
    }
    async init() {
        // Ensure storage directory exists
        await promises_1.default.mkdir(this.storagePath, { recursive: true });
        // Initialize Hypercore feed
        // @ts-ignore - hypercore doesn't have type definitions
        this.feed = new hypercore_1.default({ storage: path_1.default.join(this.storagePath, 'feed') });
        // Workaround for Hypercore native module issue on Apple Silicon
        // The ready() callback can hang due to Rust native extension blocking
        if (isAppleSilicon) {
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('[ClawNode] Apple Silicon timeout reached, proceeding anyway');
                    resolve();
                }, 30000); // 30 seconds - give native modules more time to initialize
                try {
                    this.feed.ready(() => {
                        clearTimeout(timeout);
                        resolve();
                    });
                }
                catch {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        }
        else {
            await new Promise((resolve) => {
                this.feed.ready(() => resolve());
            });
        }
        // Load friends
        await this.loadFriends();
        // Load last read index for message queue
        await this.loadMessageIndex();
        // Initialize Hyperswarm
        this.swarm = (0, hyperswarm_1.default)({});
        this.swarm.on('connection', (socket) => this.handleConnection(socket));
        this.swarm.join(this.feed.discoveryKey);
        this.ready = true;
    }
    async startListening() {
        if (!this.feed || this.listening)
            return;
        this.listening = true;
        console.log('[ClawNode] Started listening for messages and connections');
        // Set up polling for new messages (more reliable than Hypercore's native watch)
        this.watchInterval = setInterval(async () => {
            await this.checkForNewMessages();
        }, 2000); // Check every 2 seconds
        // Initial check
        await this.checkForNewMessages();
    }
    stopListening() {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
        }
        this.listening = false;
        console.log('[ClawNode] Stopped listening');
    }
    isListening() {
        return this.listening;
    }
    async checkForNewMessages() {
        if (!this.feed)
            return;
        try {
            const length = this.feed.length;
            if (length > this.lastReadIndex) {
                // Fetch new messages
                for (let i = this.lastReadIndex; i < length; i++) {
                    try {
                        const data = await this.feed.get(i);
                        const message = JSON.parse(data.toString());
                        this.messageQueue.push(message);
                        console.log(`[ClawNode] New message from ${message.from.slice(0, 8)}...`);
                    }
                    catch (err) {
                        // Skip missing entries
                    }
                }
                this.lastReadIndex = length;
                await this.saveMessageIndex();
            }
        }
        catch (err) {
            // Ignore errors during polling
        }
    }
    async getQueuedMessages() {
        await this.checkForNewMessages();
        return this.messageQueue;
    }
    async clearMessageQueue() {
        this.messageQueue = [];
    }
    getQueueCount() {
        return this.messageQueue.length;
    }
    isReady() {
        return this.ready;
    }
    async handleConnection(socket) {
        if (!this.feed)
            return;
        const remoteKey = socket.remotePublicKey?.toString('hex') || 'unknown';
        console.log(`[ClawNode] Connection from: ${remoteKey.slice(0, 8)}...`);
        await this.feed.replicate(socket);
    }
    getPublicKey() {
        if (!this.feed)
            throw new Error('Node not initialized');
        return b4a_1.default.toString(this.feed.key, 'hex');
    }
    async generateInviteCode() {
        if (!this.feed)
            throw new Error('Node not initialized');
        const randomBytes = b4a_1.default.toString(crypto_1.default.randomBytes(8), 'hex');
        return `claw-${randomBytes}`;
    }
    async performHandshake(code, role) {
        if (!this.feed || !this.swarm) {
            return { success: false, error: 'Node not initialized' };
        }
        const myPublicKey = this.getPublicKey();
        const { topic, sharedSecret } = this.deriveSession(code);
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.swarm?.destroy();
                resolve({ success: false, error: 'Handshake timeout - peer not online' });
            }, this.config.handshakeTimeout);
            this.swarm.join(topic, { client: true, server: true });
            // Use once() instead of on() - handler removes itself after first connection
            this.swarm.once('connection', async (socket) => {
                try {
                    const iv = crypto_1.default.randomBytes(12);
                    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', sharedSecret, iv);
                    const payload = JSON.stringify({ pubKey: myPublicKey });
                    let encrypted = cipher.update(payload, 'utf8', 'hex');
                    encrypted += cipher.final('hex');
                    const authTag = cipher.getAuthTag().toString('hex');
                    socket.write(JSON.stringify({ iv: iv.toString('hex'), authTag, data: encrypted }));
                    socket.once('data', async (data) => {
                        try {
                            const remote = JSON.parse(data.toString());
                            const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', sharedSecret, Buffer.from(remote.iv, 'hex'));
                            decipher.setAuthTag(Buffer.from(remote.authTag, 'hex'));
                            let decrypted = decipher.update(remote.data, 'hex', 'utf8') + decipher.final('utf8');
                            const peerData = JSON.parse(decrypted);
                            clearTimeout(timeout);
                            socket.end();
                            this.swarm.destroy();
                            // Save friend
                            await this.addFriend(peerData.pubKey, 'Linked Peer');
                            resolve({ success: true, code, peerKey: peerData.pubKey });
                        }
                        catch (err) {
                            clearTimeout(timeout);
                            socket.destroy();
                            this.swarm?.destroy();
                            resolve({ success: false, error: 'Handshake failed' });
                        }
                    });
                }
                catch (err) {
                    clearTimeout(timeout);
                    socket.destroy();
                    this.swarm?.destroy();
                    resolve({ success: false, error: 'Connection error' });
                }
            });
        });
    }
    deriveSession(inviteCode) {
        const hash = (input) => crypto_1.default.createHash('sha256').update(input).digest();
        return {
            topic: hash(`clawconnect/v1/topic/${inviteCode}`),
            sharedSecret: hash(`clawconnect/v1/secret/${inviteCode}`)
        };
    }
    async sendMessage(toAlias, content, type = 'text') {
        if (!this.feed)
            return { success: false, message: 'Node not initialized' };
        const friend = this.friends.get(toAlias);
        if (!friend) {
            return { success: false, message: `Friend '${toAlias}' not found` };
        }
        const payload = {
            id: crypto_1.default.randomUUID(),
            type,
            from: this.getPublicKey(),
            timestamp: Date.now(),
            content,
            meta: { urgency: 'medium' }
        };
        await this.feed.append(JSON.stringify(payload));
        return { success: true, message: 'Message appended to feed' };
    }
    async readInbox(limit = 10) {
        if (!this.feed)
            return [];
        const length = this.feed.length;
        const start = Math.max(0, length - limit);
        const messages = [];
        for (let i = start; i < length; i++) {
            try {
                const data = await this.feed.get(i);
                messages.push(JSON.parse(data.toString()));
            }
            catch (err) {
                // Skip missing entries
            }
        }
        return messages;
    }
    async getFriends() {
        return Array.from(this.friends.values());
    }
    async addFriend(key, _alias) {
        // Generate unique alias from public key (first 8 chars)
        const shortKey = key.slice(0, 8);
        const alias = `Friend_${shortKey}`;
        const friend = {
            alias,
            publicKey: key,
            trusted: true,
            addedAt: Date.now()
        };
        this.friends.set(alias, friend);
        await this.saveFriends();
        console.log(`[ClawNode] Added friend: ${alias}`);
    }
    async loadFriends() {
        try {
            const data = await promises_1.default.readFile(path_1.default.join(this.storagePath, 'friends.json'), 'utf-8');
            const list = JSON.parse(data);
            list.forEach((f) => this.friends.set(f.alias, f));
        }
        catch {
            // No friends file yet
        }
    }
    async saveFriends() {
        const list = Array.from(this.friends.values());
        await promises_1.default.writeFile(path_1.default.join(this.storagePath, 'friends.json'), JSON.stringify(list, null, 2));
    }
    async destroy() {
        this.stopListening();
        if (this.swarm) {
            this.swarm.destroy();
            this.swarm = null;
        }
        this.ready = false;
    }
    async loadMessageIndex() {
        try {
            const data = await promises_1.default.readFile(path_1.default.join(this.storagePath, 'message-index.json'), 'utf-8');
            const parsed = JSON.parse(data);
            this.lastReadIndex = parsed.index || 0;
        }
        catch {
            this.lastReadIndex = 0;
        }
    }
    async saveMessageIndex() {
        await promises_1.default.writeFile(path_1.default.join(this.storagePath, 'message-index.json'), JSON.stringify({ index: this.lastReadIndex }, null, 2));
    }
}
exports.ClawNode = ClawNode;
//# sourceMappingURL=node.js.map