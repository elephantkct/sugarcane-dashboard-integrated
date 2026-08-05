
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import dashboardBg from "./assets/dashboard-bg-web.mp4";

  // Kick off the fetch for the dashboard hero video as early as physically
  // possible — before React even renders — so it's already in flight by
  // the time the Overview page mounts.
  function preloadVideo(href: string) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = href;
    document.head.appendChild(link);
  }
  preloadVideo(dashboardBg);

  createRoot(document.getElementById("root")!).render(<App />);
