import Hypercore from 'hypercore';
import Hyperswarm from 'hyperswarm';
import crypto from 'crypto';
import b4a from 'b4a';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { type Friend, type MessagePayload, type HandshakeResult, type ClawConfig } from './types';

// Detect Apple Silicon for Hypercore compatibility workaround
const isAppleSilicon = os.platform() === 'darwin' && os.arch() === 'arm64';

export class ClawNode {
  private feed: Hypercore | null = null;
  private swarm: any = null;
  private friends: Map<string, Friend> = new Map();
  private storagePath: string;
  private config: ClawConfig;
  private ready: boolean = false;
  private listening: boolean = false;
  private messageQueue: MessagePayload[] = [];
  private lastReadIndex: number = 0;
  private watchInterval: any = null;
  private pendingInvites: Map<string, { role: 'inviter' | 'invitee'; resolve: Function; reject: Function; timeout: any }> = new Map();

  constructor(config?: Partial<ClawConfig>) {
    this.storagePath = config?.storagePath || path.join(process.env.HOME || '.', '.claw-connect');
    this.config = {
      storagePath: this.storagePath,
      maxMessageSize: config?.maxMessageSize || 1024 * 1024, // 1MB
      handshakeTimeout: config?.handshakeTimeout || 60000, // 60s
      spamThreshold: config?.spamThreshold || 10, // msg/min
    };
  }

  async init(): Promise<void> {
    // Ensure storage directory exists
    await fs.mkdir(this.storagePath, { recursive: true });

    // Initialize Hypercore feed
    // @ts-ignore - hypercore doesn't have type definitions
    this.feed = new Hypercore({ storage: path.join(this.storagePath, 'feed') });

    // Workaround for Hypercore native module issue on Apple Silicon
    // The ready() callback can hang due to Rust native extension blocking
    if (isAppleSilicon) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[ClawNode] Timeout reached, proceeding anyway');
          resolve();
        }, 5000);

        try {
          this.feed!.ready(() => {
            clearTimeout(timeout);
            resolve();
          });
        } catch {
          clearTimeout(timeout);
          resolve();
        }
      });
    } else {
      await new Promise<void>((resolve) => {
        this.feed!.ready(() => resolve());
      });
    }

    // Load friends
    await this.loadFriends();

    // Load last read index for message queue
    await this.loadMessageIndex();

    // Initialize Hyperswarm
    this.swarm = Hyperswarm({});
    this.swarm.on('connection', (socket: any) => this.handleConnection(socket));
    this.swarm.join(this.feed!.discoveryKey);

    this.ready = true;
  }

  async startListening(): Promise<void> {
    if (!this.feed || this.listening) return;

    this.listening = true;
    console.log('[ClawNode] Started listening for messages and connections');

    // Set up polling for new messages (more reliable than Hypercore's native watch)
    this.watchInterval = setInterval(async () => {
      await this.checkForNewMessages();
    }, 2000); // Check every 2 seconds

    // Initial check
    await this.checkForNewMessages();
  }

  stopListening(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.listening = false;
    console.log('[ClawNode] Stopped listening');
  }

  isListening(): boolean {
    return this.listening;
  }

  private async checkForNewMessages(): Promise<void> {
    if (!this.feed) return;

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
          } catch (err) {
            // Skip missing entries
          }
        }
        this.lastReadIndex = length;
        await this.saveMessageIndex();
      }
    } catch (err) {
      // Ignore errors during polling
    }
  }

  async getQueuedMessages(): Promise<MessagePayload[]> {
    await this.checkForNewMessages();
    return this.messageQueue;
  }

  async clearMessageQueue(): Promise<void> {
    this.messageQueue = [];
  }

  getQueueCount(): number {
    return this.messageQueue.length;
  }

  isReady(): boolean {
    return this.ready;
  }

  private async handleConnection(socket: any): Promise<void> {
    if (!this.feed) return;
    
    const remoteKey = socket.remotePublicKey?.toString('hex') || 'unknown';
    console.log(`[ClawNode] Connection from: ${remoteKey.slice(0, 8)}...`);
    
    await this.feed.replicate(socket);
  }

  getPublicKey(): string {
    if (!this.feed) throw new Error('Node not initialized');
    return b4a.toString(this.feed.key, 'hex');
  }

  async generateInviteCode(): Promise<string> {
    if (!this.feed) throw new Error('Node not initialized');
    const randomBytes = b4a.toString(crypto.randomBytes(8), 'hex');
    return `claw-${randomBytes}`;
  }

  async performHandshake(code: string, role: 'inviter' | 'invitee'): Promise<HandshakeResult> {
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

      this.swarm!.join(topic, { client: true, server: true });

      this.swarm!.on('connection', async (socket: any) => {
        try {
          const iv = crypto.randomBytes(12);
          const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
          const payload = JSON.stringify({ pubKey: myPublicKey });
          let encrypted = cipher.update(payload, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          const authTag = cipher.getAuthTag().toString('hex');

          socket.write(JSON.stringify({ iv: iv.toString('hex'), authTag, data: encrypted }));

          socket.once('data', async (data: Buffer) => {
            try {
              const remote = JSON.parse(data.toString());
              const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, Buffer.from(remote.iv, 'hex'));
              decipher.setAuthTag(Buffer.from(remote.authTag, 'hex'));
              let decrypted = decipher.update(remote.data, 'hex', 'utf8') + decipher.final('utf8');
              const peerData = JSON.parse(decrypted);

              clearTimeout(timeout);
              socket.end();
              this.swarm!.destroy();

              // Save friend
              await this.addFriend(peerData.pubKey, 'Linked Peer');

              resolve({ success: true, code, peerKey: peerData.pubKey });
            } catch (err) {
              socket.destroy();
            }
          });
        } catch (err) {
          socket.destroy();
        }
      });

      this.swarm!.flush();
    });
  }

  private deriveSession(inviteCode: string): { topic: Buffer; sharedSecret: Buffer } {
    const hash = (input: string) => crypto.createHash('sha256').update(input).digest();
    return {
      topic: hash(`clawconnect/v1/topic/${inviteCode}`),
      sharedSecret: hash(`clawconnect/v1/secret/${inviteCode}`)
    };
  }

  async sendMessage(toAlias: string, content: string | object, type: 'text' = 'text'): Promise<{ success: boolean; message?: string }> {
    if (!this.feed) return { success: false, message: 'Node not initialized' };

    const friend = this.friends.get(toAlias);
    if (!friend) {
      return { success: false, message: `Friend '${toAlias}' not found` };
    }

    const payload: MessagePayload = {
      id: crypto.randomUUID(),
      type,
      from: this.getPublicKey(),
      timestamp: Date.now(),
      content,
      meta: { urgency: 'medium' }
    };

    await this.feed.append(JSON.stringify(payload));
    return { success: true, message: 'Message appended to feed' };
  }

  async readInbox(limit: number = 10): Promise<MessagePayload[]> {
    if (!this.feed) return [];

    const length = this.feed.length;
    const start = Math.max(0, length - limit);
    const messages: MessagePayload[] = [];

    for (let i = start; i < length; i++) {
      try {
        const data = await this.feed.get(i);
        messages.push(JSON.parse(data.toString()));
      } catch (err) {
        // Skip missing entries
      }
    }

    return messages;
  }

  async getFriends(): Promise<Friend[]> {
    return Array.from(this.friends.values());
  }

  private async addFriend(key: string, _alias: string): Promise<void> {
    // Generate unique alias from public key (first 8 chars)
    const shortKey = key.slice(0, 8);
    const alias = `Friend_${shortKey}`;

    const friend: Friend = {
      alias,
      publicKey: key,
      trusted: true,
      addedAt: Date.now()
    };
    this.friends.set(alias, friend);
    await this.saveFriends();
    console.log(`[ClawNode] Added friend: ${alias}`);
  }

  private async loadFriends(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.storagePath, 'friends.json'), 'utf-8');
      const list = JSON.parse(data);
      list.forEach((f: Friend) => this.friends.set(f.alias, f));
    } catch {
      // No friends file yet
    }
  }

  private async saveFriends(): Promise<void> {
    const list = Array.from(this.friends.values());
    await fs.writeFile(path.join(this.storagePath, 'friends.json'), JSON.stringify(list, null, 2));
  }

  async destroy(): Promise<void> {
    this.stopListening();
    if (this.swarm) {
      this.swarm.destroy();
      this.swarm = null;
    }
    this.ready = false;
  }

  private async loadMessageIndex(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.storagePath, 'message-index.json'), 'utf-8');
      const parsed = JSON.parse(data);
      this.lastReadIndex = parsed.index || 0;
    } catch {
      this.lastReadIndex = 0;
    }
  }

  private async saveMessageIndex(): Promise<void> {
    await fs.writeFile(
      path.join(this.storagePath, 'message-index.json'),
      JSON.stringify({ index: this.lastReadIndex }, null, 2)
    );
  }
}
