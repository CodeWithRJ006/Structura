export interface JsonRpcMessage {
  jsonrpc: string;
  id?: string | number | null;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export function parseJsonRpc(line: string): JsonRpcMessage | null {
  try {
    return JSON.parse(line) as JsonRpcMessage;
  } catch (err) {
    return null;
  }
}

export function serializeJsonRpc(msg: JsonRpcMessage): string {
  return JSON.stringify(msg);
}
