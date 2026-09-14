import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import { parseJsonRpc, serializeJsonRpc } from './jsonrpc';

export class StdioBridge {
  private child: ChildProcess | null = null;

  constructor(private targetCommand: string, private targetArgs: string[]) {}

  public start() {
    this.child = spawn(this.targetCommand, this.targetArgs, {
      stdio: ['pipe', 'pipe', 'inherit'] // Intercept stdin/stdout, let stderr through
    });

    if (!this.child.stdin || !this.child.stdout) {
      throw new Error("Failed to initialize pipes to child process");
    }

    // Read from Parent (MCP Client) -> Send to Child (Razorpay server)
    const rlStdin = readline.createInterface({
      input: process.stdin,
      terminal: false
    });

    rlStdin.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const parsed = parseJsonRpc(trimmed);
      if (!parsed) {
        // Log malformed JSON error but don't crash
        console.error(`[Structura Proxy] Malformed JSON received from client`);
        return;
      }
      
      this.child!.stdin!.write(serializeJsonRpc(parsed) + '\n');
    });

    // Read from Child (Razorpay server) -> Send to Parent (MCP Client)
    const rlChildOut = readline.createInterface({
      input: this.child.stdout,
      terminal: false
    });

    rlChildOut.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const parsed = parseJsonRpc(trimmed);
      if (!parsed) {
        console.error(`[Structura Proxy] Malformed JSON received from server`);
        return;
      }
      
      process.stdout.write(serializeJsonRpc(parsed) + '\n');
    });

    this.child.on('exit', (code) => {
      process.exit(code || 0);
    });
    
    this.child.on('error', (err) => {
      console.error(`[Structura Proxy] Child process error: ${err.message}`);
      process.exit(1);
    });
    
    // Handle proxy process termination (Kill mid-session test)
    process.on('SIGINT', () => this.child?.kill('SIGINT'));
    process.on('SIGTERM', () => this.child?.kill('SIGTERM'));
  }
}
