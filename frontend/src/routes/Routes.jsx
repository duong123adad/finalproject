import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Page404 from "../pages/Notfound404";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import MainLayout from "../layouts/MainLayout"; // Layout chứa Sidebar
import HomePage from "../pages/HomePage";
import ProductManager from "../pages/ProductManager";
import ProductsPage from "../pages/ProductsPage";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import User from "../pages/User";
import PurchaseOrder from "../pages/PurchaseOrder";
import GoodReceipt from "../pages/GoodReceipt";
// import AddToInventoy from "../pages/AddToInventory";
import ProductPage from "../pages/ProductsPage";
import CartPage from "../pages/Cart";
import CategoryPage from "../pages/CategoryPage";
import SupplierPage from "../pages/SupplierPage";
import VerifyOTPPage from "../pages/VerifyOTPPage";
import VerifyResetOTPPage from "../pages/VerifyResetOTP";
import SalesPage from "../pages/SalesPage";
import BatchPage from "../pages/BatchPage";
import ReturnHistory from "../pages/ReturnHistory";
import InventoryPage from "../pages/InventoryHistory";
import InOutPage from "../pages/inoutpage";
import ProductPerformance from "../pages/ProductPerformance";
import PriceHistory from "../pages/PriceHistory";

const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(
    () => !!localStorage.getItem("authToken")
  );
  const [userRole, setUserRole] = React.useState(() =>
    localStorage.getItem("userRole")
  );

  React.useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem("authToken"));
      setUserRole(localStorage.getItem("userRole"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return { isLoggedIn, userRole };
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isLoggedIn, userRole } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/homePage" />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="verify-otp" element={<VerifyOTPPage />} />
        <Route path="verify-reset-otp" element={<VerifyResetOTPPage />} />
        <Route path="products_page" element={<ProductsPage />}>
          <Route path="cart_page" element={<CartPage />} />
        </Route>
        <Route path="cart_page" element={<CartPage />} />

        {/* Chỉ khách hàng mới truy cập được homepage */}
        <Route
          path="homepage"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* Protected routes with layout */}
        <Route path="/" element={<ProtectedRoute children={<MainLayout />} />}>
          {/* Routes accessible to all logged-in users */}
          <Route index element={<HomePage />} />
          <Route path="Sales_page" element={<SalesPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />

          {/* Routes accessible only to admin */}
          <Route
            path="products_manager"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<ProductManager />}
              />
            }
          />
          <Route
            path="suppliers"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<SupplierPage />}
              />
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={["admin"]} children={<User />} />
            }
          />
          <Route
            path="inventory/purchase-order"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<PurchaseOrder />}
              />
            }
          />
          <Route
            path="inventory/receipt"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<GoodReceipt />}
              />
            }
          />
          <Route
            path="categories"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<CategoryPage />}
              />
            }
          />
          <Route
            path="Batchs_page"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<BatchPage />}
              />
            }
          />
          <Route
            path="return-history"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<ReturnHistory />}
              />
            }
          />
          <Route
            path="Inventory-history"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<InventoryPage />}
              />
            }
          />
          <Route
            path="statistics/inoutpage"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<InOutPage />}
              />
            }
          />
          <Route
            path="statistics/productperformance"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<ProductPerformance />}
              />
            }
          />
          <Route
            path="price-history"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
                children={<PriceHistory />}
              />
            }
          />
        </Route>
        {/* 404 page */}
        <Route path="*" element={<Page404 />} />
        <Route
          path="/unauthorized"
          element={<div>Trang không tìm thấy</div>}
        />
        {/* Optional Unauthorized page */}
      </Routes>
    </Router>
  );
};

export default AppRouter;