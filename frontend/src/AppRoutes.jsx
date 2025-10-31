// src/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";
import PrintTenant from "./pages/PrintTenant";
import PageLayout from "./components/PageLayout";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminBuildings from "./components/AdminBuildings";
import AdminRooms from "./components/AdminRooms";
import AdminTenants from "./components/AdminTenants";
import AdminManagers from "./components/AdminManagers";
import AdminBills from "./pages/AdminBills";
import GenerateBill from "./pages/GenerateBill";
import PaymentProcessing from "./pages/PaymentProcessing";

// Manager Pages
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerBuildings from "./components/ManagerBuildings";
import ManagerRooms from "./components/ManagerRooms";
import ManagerTenants from "./components/ManagerTenants";
import TenantBills from "./pages/TenantBills";
import TenantPayment from "./pages/TenantPayment";


const AppRoutes = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={ 
          <PageLayout>
            <ProtectedRoute roles={["admin"]}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="buildings" element={<AdminBuildings />} />
                <Route path="rooms" element={<AdminRooms />} />
                <Route path="tenants" element={<AdminTenants />} />
                <Route path="managers" element={<AdminManagers />} />
                <Route path="bills" element={<AdminBills />} />
                <Route path="generate-bill" element={<GenerateBill />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </ProtectedRoute>
          </PageLayout>
        }
      />

      {/* Manager routes */}
      <Route
        path="/manager/*"
        element={
          <PageLayout>
            <ProtectedRoute roles={["manager"]}>
              <Routes>
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="buildings" element={<ManagerBuildings />} />
                <Route path="rooms" element={<ManagerRooms />} />
                <Route path="tenants" element={<ManagerTenants />} />
                <Route path="generate-bill" element={<GenerateBill />} />
                <Route path="*" element={<Navigate to="/manager/dashboard" replace />} />
              </Routes>
            </ProtectedRoute>
          </PageLayout>
        }
      />

      {/* Tenant / shared route */}
      <Route
        path="/"
        element={
          <PageLayout>

              <TenantBills />

          </PageLayout>
        }
      />

      {/* print route */}
      <Route path="/print/tenant/:id" element={<PageLayout><PrintTenant /></PageLayout>} />

      {/* Unauthorized */}
      <Route path="/unauthorized" element={<PageLayout><Unauthorized /></PageLayout>} />

      {/* Root redirect */}
      <Route path="/login" element={<PageLayout><Navigate to="/login" replace /></PageLayout>} />

      <Route path="/payment/:billId" element={<PageLayout><PaymentProcessing /></PageLayout>} />

      <Route path="/payment/public/:billId" element={<TenantPayment />} />



      {/* Fallback 404 */}
      <Route path="*" element={<PageLayout><h3>404 - Not Found</h3></PageLayout>} />
    </Routes>
  );
};

export default AppRoutes;
