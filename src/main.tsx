import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-sans/400-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import App from "./App.tsx";
import "./index.css";
import { installAnchorContextInterceptor } from "./lib/anchorContext";

// Inject the anchor record context (deal vs project) into every edge-function
// call before anything renders.
installAnchorContextInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
