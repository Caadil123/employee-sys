// The starting point of the React app.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import DataTable from "datatables.net-react";
import DataTablesLibrary from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";

// Tell the React DataTable component which DataTables library to use.
// We do it ONE time here, so every page with a DataTable can use it.
DataTable.use(DataTablesLibrary);

// Put the app inside the <div id="root"> in index.html
createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* BrowserRouter lets us have different pages (addresses) */}
    <BrowserRouter>
      {/* AuthProvider shares the logged-in user with every page */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
