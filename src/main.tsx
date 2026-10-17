import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/visual-system.css";
import "./styles/midnight.css";
import "./styles/motion.css";
import "./styles/layout-refinement.css";

createRoot(document.getElementById("root")!).render(<App />);
