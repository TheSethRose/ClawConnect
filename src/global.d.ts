// Type declarations for modules without @types packages
declare module 'hypercore' {
  export default class Hypercore extends EventEmitter {
    ready(callback: () => void): void;
    append(data: any): Promise<number>;
    get(index: number): Promise<any>;
    length: number;
    key: Uint8Array;
    discoveryKey: Uint8Array;
    replicate(socket: any): void;
    destroy(): void;
  }
}

declare module 'hyperswarm' {
  export default function Hyperswarm(opts?: any): any;
}

declare module 'b4a' {
  export function from(input: string | Uint8Array, encoding?: string): Uint8Array;
  export function toString(input: Uint8Array, encoding?: string): string;
  export function equals(a: Uint8Array, b: Uint8Array): boolean;
  export function alloc(size: number): Uint8Array;
}
