import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

console.log('Main.jsx loading...');
console.log('Root element:', document.getElementById("root"));

try {
  createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StrictMode>
    </BrowserRouter>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  document.getElementById('root').innerHTML = `<div style="padding: 20px; color: red;"><h2>Error: ${error.message}</h2><p>${error.stack}</p></div>`;
}
