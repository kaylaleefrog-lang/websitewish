
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import PublicListPage from "./app/PublicListPage.tsx";
  import "./styles/index.css";

  const sharedListMatch = window.location.pathname.match(/^\/list\/([^/]+)\/?$/);

  createRoot(document.getElementById("root")!).render(
    sharedListMatch ? <PublicListPage listId={sharedListMatch[1]} /> : <App />
  );
