import React, { useState, useEffect } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  useTheme,
  alpha,
  styled,
} from "@mui/material";
import {
  Home,
  Settings,
  AccountCircle,
  Logout,
  Warehouse,
  ExpandLess,
  ExpandMore,
  Description,
  Inventory,
  RecentActors,
  PointOfSale,
  Category,
  Handshake,
  DashboardCustomize,
  Inventory2,
  MoveToInbox,
  BarChart,
  Receipt,
  ProductionQuantityLimits,
  PriceChange,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const drawerWidth = 260;

const StyledListItemButton = styled(ListItemButton)(({ theme, active }) => ({
  margin: "4px 8px",
  borderRadius: "8px",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  ...(active && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    "& .MuiListItemIcon-root": {
      color: theme.palette.primary.main,
    },
    "& .MuiListItemText-primary": {
      fontWeight: 600,
      color: theme.palette.primary.main,
    },
  }),
}));

const StyledSubListItemButton = styled(ListItemButton)(({ theme, active }) => ({
  margin: "2px 8px",
  paddingLeft: "24px",
  borderRadius: "8px",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
  ...(active && {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    "& .MuiListItemIcon-root": {
      color: theme.palette.primary.main,
    },
    "& .MuiListItemText-primary": {
      fontWeight: 600,
      color: theme.palette.primary.main,
    },
  }),
}));

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [openInventory, setOpenInventory] = useState(false);
  const [openDashboard, setOpenDashboard] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [openStockManagement, setOpenStockManagement] = useState(false);
  const [openStatistics, setOpenStatistics] = useState(false);
  const [localRole, setLocalRole] = useState(localStorage.getItem("userRole"));
  const fullName = localStorage.getItem("fullName") || "Người dùng";

  useEffect(() => {
    const handleStorageChange = () => {
      setLocalRole(localStorage.getItem("userRole"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    setLocalRole(localStorage.getItem("userRole"));
  }, [location.pathname]);

  const role = localRole;

  const isActive = (path) => location.pathname === path;
  const isActiveGroup = (prefix) => location.pathname.startsWith(prefix);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (token) {
        navigate("/login");
      }

      const response = await axios.post(
        "http://localhost:8000/api/auth/logout",
        {},
        {
          headers: {
            token: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userID");
        localStorage.removeItem("userRole");
        localStorage.removeItem("fullName");
        localStorage.removeItem("role");
        localStorage.removeItem("userName");
        navigate("/login");
      }
    } catch (error) {
      if (error.response?.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userID");
        localStorage.removeItem("role");
        navigate("/login");
      }
    }
  };

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
  };

  const handleCloseLogoutDialog = () => {
    setOpenLogoutDialog(false);
  };

  const handleConfirmLogout = () => {
    setOpenLogoutDialog(false);
    handleLogout();
  };

  // Nếu là customer, chỉ hiển thị Trang chủ
  if (role === "customer") {
    return (
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
            border: "none",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <List sx={{ p: 1 }}>
            <StyledListItemButton
              onClick={() => navigate("/homepage")}
              active={isActive("/homepage") ? 1 : 0}
            >
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Trang chủ" />
            </StyledListItemButton>
          </List>
        </Box>
      </Drawer>
    );
  }

  return (
    <>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
            border: "none",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <List sx={{ p: 1 }}>
            {/* Bán hàng - Hiển thị cho tất cả các role trừ customer */}
            <StyledListItemButton
              onClick={() => navigate("/Sales_page")}
              active={isActive("/Sales_page") ? 1 : 0}
            >
              <ListItemIcon>
                <PointOfSale />
              </ListItemIcon>
              <ListItemText primary="Bán hàng" />
            </StyledListItemButton>

            {/* Thống kê và các mục con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <>
                <StyledListItemButton
                  onClick={() => setOpenStatistics(!openStatistics)}
                  active={isActiveGroup("/statistics") ? 1 : 0}
                >
                  <ListItemIcon>
                    <BarChart />
                  </ListItemIcon>
                  <ListItemText primary="Thống kê" />
                  {openStatistics ? <ExpandLess /> : <ExpandMore />}
                </StyledListItemButton>

                <Collapse in={openStatistics} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("/statistics/inoutpage")}
                      active={isActive("/statistics/inoutpage") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Receipt />
                      </ListItemIcon>
                      <ListItemText primary="Danh thu & chi phí" />
                    </StyledSubListItemButton>
                  </List>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("/statistics/productperformance")}
                      active={
                        isActive("/statistics/productperformance") ? 1 : 0
                      }
                    >
                      <ListItemIcon>
                        <ProductionQuantityLimits />
                      </ListItemIcon>
                      <ListItemText primary="Hiệu suất sản phẩm" />
                    </StyledSubListItemButton>
                  </List>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("/price-history")}
                      active={isActive("/price-history") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <PriceChange />
                      </ListItemIcon>
                      <ListItemText primary="Lịch sử thay đổi giá" />
                    </StyledSubListItemButton>
                  </List>
                </Collapse>
              </>
            )}

            {/* Inventory và các mục con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <>
                <StyledListItemButton
                  onClick={() => setOpenInventory(!openInventory)}
                  active={isActiveGroup("/inventory") ? 1 : 0}
                >
                  <ListItemIcon>
                    <MoveToInbox />
                  </ListItemIcon>
                  <ListItemText primary="Nhập hàng" />
                  {openInventory ? <ExpandLess /> : <ExpandMore />}
                </StyledListItemButton>

                <Collapse in={openInventory} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("/inventory/purchase-order")}
                      active={isActive("/inventory/purchase-order") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu đặt hàng" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/inventory/receipt")}
                      active={isActive("/inventory/receipt") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Inventory />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu nhập kho" />
                    </StyledSubListItemButton>
                  </List>
                </Collapse>
              </>
            )}

            {/* Quản lý tồn kho với các menu con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <StyledListItemButton
                onClick={() => setOpenStockManagement(!openStockManagement)}
                active={
                  isActiveGroup("/Batchs_page") ||
                  isActiveGroup("/return-history") ||
                  isActiveGroup("/Inventory-history")
                    ? 1
                    : 0
                }
              >
                <ListItemIcon>
                  <Warehouse />
                </ListItemIcon>
                <ListItemText primary="Quản lý tồn kho" />
                {openStockManagement ? <ExpandLess /> : <ExpandMore />}
              </StyledListItemButton>
            )}

            {role === "admin" && (
              <Collapse in={openStockManagement} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  <StyledSubListItemButton
                    onClick={() => navigate("/Batchs_page")}
                    active={isActive("/Batchs_page") ? 1 : 0}
                  >
                    <ListItemIcon>
                      <Inventory />
                    </ListItemIcon>
                    <ListItemText primary="Danh sách tồn kho" />
                  </StyledSubListItemButton>
                  <StyledSubListItemButton
                    onClick={() => navigate("/return-history")}
                    active={isActive("/return-history") ? 1 : 0}
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText primary="Lịch sử trả hàng" />
                  </StyledSubListItemButton>
                  <StyledSubListItemButton
                    onClick={() => navigate("/Inventory-history")}
                    active={isActive("/Inventory-history") ? 1 : 0}
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText primary="Lịch sử nhập kho" />
                  </StyledSubListItemButton>
                </List>
              </Collapse>
            )}

            {/* Quản lý chung và các mục con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <>
                <StyledListItemButton
                  onClick={() => setOpenDashboard(!openDashboard)}
                  active={
                    isActiveGroup("/products_manager") ||
                    isActiveGroup("/categories") ||
                    isActiveGroup("/suppliers") ||
                    isActiveGroup("/users") ||
                    isActiveGroup("/profile")
                      ? 1
                      : 0
                  }
                >
                  <ListItemIcon>
                    <DashboardCustomize />
                  </ListItemIcon>
                  <ListItemText primary="Quản lý chung" />
                  {openDashboard ? <ExpandLess /> : <ExpandMore />}
                </StyledListItemButton>

                <Collapse in={openDashboard} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("products_manager")}
                      active={isActive("/products_manager") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Inventory2 />
                      </ListItemIcon>
                      <ListItemText primary="Danh mục sản phẩm" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/categories")}
                      active={isActive("/categories") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Category />
                      </ListItemIcon>
                      <ListItemText primary="Loại sản phẩm" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/suppliers")}
                      active={isActive("/suppliers") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Handshake />
                      </ListItemIcon>
                      <ListItemText primary="Nhà cung cấp" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/users")}
                      active={isActive("/users") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <RecentActors />
                      </ListItemIcon>
                      <ListItemText primary="Nhân viên" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/profile")}
                      active={isActive("/profile") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <AccountCircle />
                      </ListItemIcon>
                      <ListItemText primary="Hồ sơ" />
                    </StyledSubListItemButton>
                  </List>
                </Collapse>
              </>
            )}
          </List>

          <Box sx={{ flexGrow: 1 }} />
          <List sx={{ p: 1 }}>
            <StyledListItemButton
              onClick={() => navigate("/settings")}
              active={isActive("/settings") ? 1 : 0}
            >
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Cài đặt" />
            </StyledListItemButton>

            <StyledListItemButton
              onClick={handleLogoutClick}
              sx={{
                color: theme.palette.error.main,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <ListItemIcon sx={{ color: theme.palette.error.main }}>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Đăng xuất" />
            </StyledListItemButton>
          </List>
        </Box>
      </Drawer>

      <Dialog open={openLogoutDialog} onClose={handleCloseLogoutDialog}>
        <DialogTitle sx={{ fontWeight: 600 }}>Xác nhận đăng xuất</DialogTitle>
        <DialogContent>Bạn có chắc chắn muốn đăng xuất không?</DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseLogoutDialog} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handleConfirmLogout}
            variant="contained"
            color="error"
            autoFocus
          >
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
