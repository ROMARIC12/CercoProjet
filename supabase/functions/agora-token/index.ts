import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora Token Generation - Version 006 (Compatible with Agora SDK)
// Based on official Agora token algorithm

const VERSION = "006";

const Privileges = {
  kJoinChannel: 1,
  kPublishAudioStream: 2,
  kPublishVideoStream: 3,
  kPublishDataStream: 4,
};

// Helper functions for byte manipulation
function writeUInt16LE(buffer: Uint8Array, value: number, offset: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
}

function writeUInt32LE(buffer: Uint8Array, value: number, offset: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
  buffer[offset + 3] = (value >> 24) & 0xff;
}

class ByteBuf {
  private buffer: Uint8Array;
  private position: number;

  constructor(size: number = 1024) {
    this.buffer = new Uint8Array(size);
    this.position = 0;
  }

  pack(): Uint8Array {
    return this.buffer.slice(0, this.position);
  }

  putUint16(v: number): this {
    writeUInt16LE(this.buffer, v, this.position);
    this.position += 2;
    return this;
  }

  putUint32(v: number): this {
    writeUInt32LE(this.buffer, v, this.position);
    this.position += 4;
    return this;
  }

  putBytes(bytes: Uint8Array): this {
    this.putUint16(bytes.length);
    this.buffer.set(bytes, this.position);
    this.position += bytes.length;
    return this;
  }

  putString(str: string): this {
    const encoder = new TextEncoder();
    return this.putBytes(encoder.encode(str));
  }

  putTreeMapUInt32(map: Record<number, number>): this {
    const keys = Object.keys(map).map(Number);
    this.putUint16(keys.length);
    for (const key of keys) {
      this.putUint16(key);
      this.putUint32(map[key]);
    }
    return this;
  }
}

// CRC32 implementation
function crc32(str: string): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  let crc = 0xffffffff;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  for (let i = 0; i < bytes.length; i++) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// HMAC-SHA256 implementation
async function hmacSha256(key: string, data: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const dataBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}

// Base64 encode
function base64Encode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

// Build Message
function packMessage(salt: number, ts: number, messages: Record<number, number>): Uint8Array {
  const buf = new ByteBuf();
  buf.putUint32(salt);
  buf.putUint32(ts);
  buf.putTreeMapUInt32(messages);
  return buf.pack();
}

// Build AccessToken Content
function packContent(signature: Uint8Array, crcChannel: number, crcUid: number, m: Uint8Array): Uint8Array {
  const buf = new ByteBuf();
  buf.putBytes(signature);
  buf.putUint32(crcChannel);
  buf.putUint32(crcUid);
  buf.putBytes(m);
  return buf.pack();
}

// Generate Agora RTC Token
async function buildTokenWithUid(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: number,
  privilegeExpiredTs: number
): Promise<string> {
  const salt = Math.floor(Math.random() * 0xffffffff);
  const ts = Math.floor(Date.now() / 1000) + 24 * 3600;
  const uidStr = uid === 0 ? "" : String(uid);
  
  // Build messages based on role
  const messages: Record<number, number> = {};
  messages[Privileges.kJoinChannel] = privilegeExpiredTs;
  
  // Publisher role (1) gets all privileges
  if (role === 1 || role === 0 || role === 101) {
    messages[Privileges.kPublishAudioStream] = privilegeExpiredTs;
    messages[Privileges.kPublishVideoStream] = privilegeExpiredTs;
    messages[Privileges.kPublishDataStream] = privilegeExpiredTs;
  }
  
  // Pack message
  const m = packMessage(salt, ts, messages);
  
  // Create signature input
  const encoder = new TextEncoder();
  const appIdBytes = encoder.encode(appId);
  const channelBytes = encoder.encode(channelName);
  const uidBytes = encoder.encode(uidStr);
  
  const toSign = new Uint8Array(appIdBytes.length + channelBytes.length + uidBytes.length + m.length);
  toSign.set(appIdBytes, 0);
  toSign.set(channelBytes, appIdBytes.length);
  toSign.set(uidBytes, appIdBytes.length + channelBytes.length);
  toSign.set(m, appIdBytes.length + channelBytes.length + uidBytes.length);
  
  // Generate signature
  const signature = await hmacSha256(appCertificate, toSign);
  
  // Calculate CRC
  const crcChannel = crc32(channelName);
  const crcUid = crc32(uidStr);
  
  // Pack content
  const content = packContent(signature, crcChannel, crcUid, m);
  
  // Build final token
  return VERSION + appId + base64Encode(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Agora] Received request:', req.method);

  try {
    const { channelName, role = 'publisher', uid } = await req.json();
    
    console.log('[Agora] Request params:', { channelName, role, uid });

    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      console.error('[Agora] Missing credentials - appId:', !!appId, 'appCertificate:', !!appCertificate);
      return new Response(
        JSON.stringify({ error: 'Configuration Agora manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!channelName) {
      return new Response(
        JSON.stringify({ error: 'Channel name requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random UID if not provided
    const userUid = uid || Math.floor(Math.random() * 100000);
    
    // Token expires in 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Determine role (1 = publisher, 2 = subscriber)
    const agoraRole = role === 'audience' ? 2 : 1;

    console.log('[Agora] Starting token build...');
    
    // Build the token
    const token = await buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      userUid,
      agoraRole,
      privilegeExpiredTs
    );

    console.log('[Agora] Token generated successfully for channel:', channelName);

    return new Response(
      JSON.stringify({
        token,
        appId,
        uid: userUid,
        channelName,
        expiresAt: privilegeExpiredTs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Agora] Error generating token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
