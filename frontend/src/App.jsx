// src/App.jsx
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import NavBar from "./components/NavBar";
import AppRoutes from "./AppRoutes";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div>
      {/* NavBar */}
      <NavBar />

      {/* Main content */}
      <main style={{ padding: 15 }}>
        <AppRoutes />
      </main>

      {/* Global Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
      <Footer />
    </div>
  );
}
