import Hypercore from 'hypercore';
import Hyperswarm from 'hyperswarm';
import crypto from 'crypto';
import b4a from 'b4a';
import path from 'path';
import fs from 'fs/promises';
import { type Friend, type MessagePayload, type HandshakeResult, type ClawConfig } from './types';

export class ClawNode {
  private feed: Hypercore<any> | null = null;
  private swarm: Hyperswarm | null = null;
  private friends: Map<string, Friend> = new Map();
  private storagePath: string;
  private config: ClawConfig;
  private ready: boolean = false;

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
    this.feed = new Hypercore(path.join(this.storagePath, 'feed'));
    await new Promise<void>((resolve) => {
      this.feed!.ready(() => resolve());
    });

    // Load friends
    await this.loadFriends();

    // Initialize Hyperswarm
    this.swarm = new Hyperswarm();
    this.swarm.on('connection', (socket: any) => this.handleConnection(socket));
    this.swarm.join(this.feed!.discoveryKey);

    this.ready = true;
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

          socket.once('data', (data: Buffer) => {
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

  private async addFriend(key: string, alias: string): Promise<void> {
    const friend: Friend = {
      alias,
      publicKey: key,
      trusted: true,
      addedAt: Date.now()
    };
    this.friends.set(alias, friend);
    await this.saveFriends();
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
    if (this.swarm) {
      this.swarm.destroy();
      this.swarm = null;
    }
    this.ready = false;
  }
}
