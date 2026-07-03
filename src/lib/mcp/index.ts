import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "quantum-docs-mcp",
  title: "Quantum Document Management MCP",
  version: "0.1.0",
  instructions:
    "Agent integration surface for the Quantum Document Management app. Use `echo` to verify connectivity. Additional tools can be added as the integration grows.",
  tools: [echoTool],
});
