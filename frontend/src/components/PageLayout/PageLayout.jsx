// The frame around every page after login: top bar + sidebar + the page itself.
// Use it like this:  <PageLayout> ...page content... </PageLayout>

import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import TopBar from "../TopBar/TopBar";
import "./PageLayout.css";

export default function PageLayout({ children }) {
  // Is the sidebar open? (only matters on small screens)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="page-layout">
      {/* The menu button in the top bar opens / closes the sidebar */}
      <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="page-layout-body">
        <Sidebar isOpen={isSidebarOpen} onLinkClick={() => setIsSidebarOpen(false)} />

        {/* "children" is the page we put inside the layout */}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
