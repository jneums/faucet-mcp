/**
 * Tool-Specific Test Suite for DFINITY Faucet MCP
 */

import { describe, beforeAll, afterAll, it, expect, inject } from 'vitest';
import { PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@icp-sdk/core/candid';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { idlFactory as mcpServerIdlFactory } from '../.dfx/local/canisters/faucet_mcp/service.did.js';
import type { _SERVICE as McpServerService } from '../.dfx/local/canisters/faucet_mcp/service.did.d.ts';
import type { Actor } from '@dfinity/pic';
import path from 'node:path';

const MCP_SERVER_WASM_PATH = path.resolve(
  __dirname,
  '../.dfx/local/canisters/faucet_mcp/faucet_mcp.wasm',
);

describe('Faucet MCP Tool Tests', () => {
  let pic: PocketIc;
  let serverActor: Actor<McpServerService>;
  let canisterId: any;
  let testOwner = createIdentity('test-owner');

  beforeAll(async () => {
    const picUrl = inject('PIC_URL');
    
    pic = await PocketIc.create(picUrl);
    canisterId = await pic.createCanister();
    
    const initArg = IDL.encode(
      [IDL.Opt(IDL.Record({ owner: IDL.Opt(IDL.Principal) }))],
      [[{ owner: [testOwner.getPrincipal()] }]],
    );
    
    await pic.installCode({
      canisterId,
      wasm: MCP_SERVER_WASM_PATH,
      arg: initArg.buffer as ArrayBufferLike,
    });
    
    serverActor = pic.createActor<McpServerService>(
      mcpServerIdlFactory,
      canisterId,
    );
  });

  afterAll(async () => {
    await pic?.tearDown();
  });

  describe('request_tokens Tool', () => {
    it('should appear in tools/list', async () => {
      serverActor.setIdentity(new AnonymousIdentity());

      const rpcPayload = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 'test-tools-list',
      };
      const body = new TextEncoder().encode(JSON.stringify(rpcPayload));

      const httpResponse = await serverActor.http_request_update({
        method: 'POST',
        url: '/mcp',
        headers: [['Content-Type', 'application/json']],
        body,
        certificate_version: [],
      });

      expect(httpResponse.status_code).toBe(200);
      
      const responseBody = JSON.parse(
        new TextDecoder().decode(httpResponse.body as Uint8Array),
      );

      const tools = responseBody.result.tools;
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe('request_tokens');
      expect(tools[0].description).toContain('faucet');
    });

    it('should reject missing token_type', async () => {
      serverActor.setIdentity(new AnonymousIdentity());

      const rpcPayload = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'request_tokens',
          arguments: { recipient: 'rdmx6-jaaaa-aaaah-qcaiq-cai' }
        },
        id: 'test-missing-token-type',
      };
      const body = new TextEncoder().encode(JSON.stringify(rpcPayload));

      const httpResponse = await serverActor.http_request_update({
        method: 'POST',
        url: '/mcp',
        headers: [['Content-Type', 'application/json']],
        body,
        certificate_version: [],
      });

      const responseBody = JSON.parse(
        new TextDecoder().decode(httpResponse.body as Uint8Array),
      );

      expect(responseBody.result.isError).toBe(true);
      expect(responseBody.result.content[0].text).toContain('token_type');
    });

    it('should reject missing recipient', async () => {
      serverActor.setIdentity(new AnonymousIdentity());

      const rpcPayload = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'request_tokens',
          arguments: { token_type: 'icrc1' }
        },
        id: 'test-missing-recipient',
      };
      const body = new TextEncoder().encode(JSON.stringify(rpcPayload));

      const httpResponse = await serverActor.http_request_update({
        method: 'POST',
        url: '/mcp',
        headers: [['Content-Type', 'application/json']],
        body,
        certificate_version: [],
      });

      const responseBody = JSON.parse(
        new TextDecoder().decode(httpResponse.body as Uint8Array),
      );

      expect(responseBody.result.isError).toBe(true);
      expect(responseBody.result.content[0].text).toContain('recipient');
    });

    it('should reject invalid token_type', async () => {
      serverActor.setIdentity(new AnonymousIdentity());

      const rpcPayload = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'request_tokens',
          arguments: { token_type: 'bitcoin', recipient: 'rdmx6-jaaaa-aaaah-qcaiq-cai' }
        },
        id: 'test-invalid-token-type',
      };
      const body = new TextEncoder().encode(JSON.stringify(rpcPayload));

      const httpResponse = await serverActor.http_request_update({
        method: 'POST',
        url: '/mcp',
        headers: [['Content-Type', 'application/json']],
        body,
        certificate_version: [],
      });

      const responseBody = JSON.parse(
        new TextDecoder().decode(httpResponse.body as Uint8Array),
      );

      expect(responseBody.result.isError).toBe(true);
      expect(responseBody.result.content[0].text).toContain('Invalid');
    });
  });
});
