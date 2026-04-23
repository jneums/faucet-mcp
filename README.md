# DFINITY Faucet MCP

An MCP server that wraps the official [DFINITY ledger faucet](https://github.com/dfinity/ledger-faucet) canister, making it trivial for AI agents to request test tokens on the Internet Computer.

## Tool

### `request_tokens`

Request free test tokens sent to a principal or account identifier.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `token_type` | `"icp"` \| `"icrc1"` | ✅ | Which test token: `icp` for TESTICP, `icrc1` for TICRC1 |
| `recipient` | `string` | ✅ | Principal ID or account identifier (hex, ICP only) |

**Example:**
```json
{
  "token_type": "icrc1",
  "recipient": "rdmx6-jaaaa-aaaah-qcaiq-cai"
}
```

Each call sends **10 tokens** to the recipient.

## Token Details

| Token | Canister ID | Standard |
|-------|-------------|----------|
| TESTICP | `xafvr-biaaa-aaaai-aql5q-cai` | ICP Ledger |
| TICRC1 | `3jkp5-oyaaa-aaaaj-azwqa-cai` | ICRC-1 |

## Development

```bash
npm install
mops install
dfx start --background
dfx deploy
npm test
```

## License

MIT
