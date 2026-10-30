import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/visual-system.css";
import "./styles/midnight.css";
import "./styles/motion.css";
import "./styles/layout-refinement.css";
import "./styles/typography.css";



import "./overview-proposal/overview.css";
import "./overview-proposal/quiet.css";
import "./overview-proposal/orange.css";
import "./overview-proposal/sections.css";

import "@/styles/clarity-polish.css";

createRoot(document.getElementById("root")!).render(<App />);
