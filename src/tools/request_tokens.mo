import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Result "mo:base/Result";
import Json "mo:json";
import Principal "mo:base/Principal";
import Error "mo:base/Error";

import ToolContext "ToolContext";

module {

  // The mainnet faucet canister
  let FAUCET_CANISTER_ID : Text = "nqoci-rqaaa-aaaap-qp53q-cai";

  // Actor interface for the faucet canister
  let faucet : actor {
    transfer_icrc1 : (Principal) -> async ();
    transfer_icp : (Text) -> async ();
  } = actor (FAUCET_CANISTER_ID);

  /// Tool configuration
  public func config() : McpTypes.Tool = {
    name = "request_tokens";
    title = ?"DFINITY Faucet";
    description = ?"Request free test tokens (TESTICP or TICRC1) from the DFINITY ledger faucet. Sends 10 tokens to the specified principal or account identifier.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("token_type", Json.obj([
          ("type", Json.str("string")),
          ("enum", Json.arr([Json.str("icp"), Json.str("icrc1")])),
          ("description", Json.str("Which test token to request: 'icp' for TESTICP or 'icrc1' for TICRC1"))
        ])),
        ("recipient", Json.obj([
          ("type", Json.str("string")),
          ("description", Json.str("The principal ID (e.g. 'rdmx6-jaaaa-aaaah-qcaiq-cai') or account identifier (hex string, ICP only) to send tokens to"))
        ]))
      ])),
      ("required", Json.arr([Json.str("token_type"), Json.str("recipient")])),
    ]);
    outputSchema = ?Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("success", Json.obj([
          ("type", Json.str("boolean")),
        ])),
        ("message", Json.obj([
          ("type", Json.str("string")),
        ])),
        ("token_type", Json.obj([
          ("type", Json.str("string")),
        ])),
        ("recipient", Json.obj([
          ("type", Json.str("string")),
        ])),
        ("amount", Json.obj([
          ("type", Json.str("string")),
        ])),
      ])),
      ("required", Json.arr([Json.str("success"), Json.str("message")])),
    ]);
  };

  /// Tool handler
  public func handle(_context : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {

      // Parse token_type
      let tokenType = switch (Result.toOption(Json.getAsText(_args, "token_type"))) {
        case (?t) { t };
        case (null) {
          return ToolContext.makeError("Missing 'token_type' argument. Must be 'icp' or 'icrc1'.", cb);
        };
      };

      // Parse recipient
      let recipient = switch (Result.toOption(Json.getAsText(_args, "recipient"))) {
        case (?r) { r };
        case (null) {
          return ToolContext.makeError("Missing 'recipient' argument. Provide a principal ID or account identifier.", cb);
        };
      };

      // Validate token_type
      if (tokenType != "icp" and tokenType != "icrc1") {
        return ToolContext.makeError("Invalid 'token_type': '" # tokenType # "'. Must be 'icp' or 'icrc1'.", cb);
      };

      // Call the faucet
      try {
        if (tokenType == "icrc1") {
          // ICRC1 requires a principal
          let principal = Principal.fromText(recipient);
          await faucet.transfer_icrc1(principal);
        } else {
          // ICP accepts either a principal or account identifier
          await faucet.transfer_icp(recipient);
        };

        let result = Json.obj([
          ("success", Json.bool(true)),
          ("message", Json.str("Successfully sent 10 " # (if (tokenType == "icp") "TESTICP" else "TICRC1") # " tokens to " # recipient)),
          ("token_type", Json.str(tokenType)),
          ("recipient", Json.str(recipient)),
          ("amount", Json.str("10")),
        ]);
        ToolContext.makeSuccess(result, cb);

      } catch (e) {
        let errorMsg = Error.message(e);
        let result = Json.obj([
          ("success", Json.bool(false)),
          ("message", Json.str("Faucet transfer failed: " # errorMsg)),
          ("token_type", Json.str(tokenType)),
          ("recipient", Json.str(recipient)),
        ]);
        ToolContext.makeSuccess(result, cb);
      };
    };
  };
};
