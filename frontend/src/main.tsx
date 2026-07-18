
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import introBg from "./assets/sugarcane-intro (1).mp4";
  import dashboardBg from "./assets/dashboard-bg.mp4";

  // Kick off the fetch for both cinematic videos as early as physically
  // possible — before React even renders — so the intro video's first
  // frame (and the dashboard video behind it) are already in flight by
  // the time their respective components mount.
  function preloadVideo(href: string) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = href;
    document.head.appendChild(link);
  }
  preloadVideo(introBg);
  preloadVideo(dashboardBg);

  createRoot(document.getElementById("root")!).render(<App />);
