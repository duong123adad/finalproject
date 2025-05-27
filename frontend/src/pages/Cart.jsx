import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Paper,
  Box,
  Divider,
  CircularProgress,
  Collapse,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  AppBar,
  Toolbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ShopIcon from "@mui/icons-material/Shop";
import { useNavigate } from "react-router-dom";
import QRPayment from "../components/QRPayment";

// Footer component (simple, can move to separate file if needed)
const Footer = () => (
  <Box
    component="footer"
    sx={{
      mt: 4,
      py: 2,
      bgcolor: "#f5f5f5",
      textAlign: "center",
      borderTop: "1px solid #e0e0e0",
    }}
  >
    <Typography variant="body2" color="text.secondary">
      &copy; {new Date().getFullYear()} Cửa hàng bán lẻ DandP All rights
      reserved.
    </Typography>
  </Box>
);

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const CustomerProfile = ({ customer, onClose }) => (
  <Dialog
    open={!!customer}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      sx: { width: { xs: "98vw", sm: "90vw", md: "500px" } },
    }}
  >
    <DialogTitle>Thông tin cá nhân</DialogTitle>
    <DialogContent>
      {customer ? (
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Avatar
              alt={customer.fullName}
              src={customer.profileImage}
              sx={{ width: 80, height: 80 }}
            />
          </Box>
          <Typography variant="h6" gutterBottom align="center">
            {customer.fullName}
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            gutterBottom
            align="center"
          >
            @{customer.username}
          </Typography>
          <Divider sx={{ width: "80%", my: 2 }} />
          <Stack spacing={1} sx={{ width: "100%", textAlign: "center" }}>
            <Typography variant="body2">Email: {customer.email}</Typography>
            {customer.phone && (
              <Typography variant="body2">
                Điện thoại: {customer.phone}
              </Typography>
            )}
            {customer.address && (
              <Typography variant="body2">
                Địa chỉ: {customer.address.street}, {customer.address.city},{" "}
                {customer.address.state}, {customer.address.postalCode},{" "}
                {customer.address.country}
              </Typography>
            )}
            {customer.dateOfBirth && (
              <Typography variant="body2">
                Ngày sinh: {formatDate(customer.dateOfBirth)}
              </Typography>
            )}
            {customer.gender && (
              <Typography variant="body2">
                Giới tính: {customer.gender}
              </Typography>
            )}
          </Stack>
        </Paper>
      ) : (
        <Typography>Không có thông tin người dùng.</Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Đóng</Button>
    </DialogActions>
  </Dialog>
);

const CartHeader = ({
  onGoToProducts,
  onMenuOpen,
  anchorEl,
  isMenuOpen,
  handleMenuClose,
  handleProfileClick,
  handleOrdersClick,
  handleLogoutClick,
}) => (
  <AppBar
    position="static"
    color="default"
    elevation={1}
    sx={{ mb: { xs: 1, md: 3 } }}
  >
    <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1, sm: 2 } }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <IconButton color="inherit" onClick={onGoToProducts}>
          <ShopIcon sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }} />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            ml: 1,
            fontWeight: 700,
            color: "primary.main",
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
            whiteSpace: "nowrap",
          }}
        >
          Cửa hàng bán lẻ DandP
        </Typography>
      </Box>
      <Box>
        <IconButton color="inherit" onClick={onMenuOpen}>
          <AccountCircleIcon sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }} />
        </IconButton>
        <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
          <MenuItem onClick={handleProfileClick}>Hồ sơ</MenuItem>
          <MenuItem onClick={handleOrdersClick}>Đơn đặt hàng</MenuItem>
          <MenuItem onClick={handleLogoutClick}>Đăng xuất</MenuItem>
        </Menu>
      </Box>
    </Toolbar>
  </AppBar>
);

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [creatingPreorder, setCreatingPreorder] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userID");
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [openOrdersDialog, setOpenOrdersDialog] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [openQRPayment, setOpenQRPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [localCart, setLocalCartState] = useState([]);

  const authHeader = useCallback(
    () => ({
      headers: { Authorization: `Bearer ${authToken}` },
    }),
    [authToken]
  );

  const fetchCart = useCallback(async () => {
    try {
      const { data } = await axios.get(
        "https://panddretailshop.onrender.com/api/cart",
        authHeader()
      );
      setCart(data);
    } catch (error) {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const fetchOrders = useCallback(
    async (userId) => {
      setLoadingOrders(true);
      try {
        const { data } = await axios.get(
          `https://panddretailshop.onrender.com/api/orders?customerId=${userId}`,
          authHeader()
        );
        setOrders(data);
      } catch (error) {
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    },
    [authHeader]
  );

  const fetchUserInfo = useCallback(async () => {
    if (userId) {
      try {
        const response = await axios.get(
          `https://panddretailshop.onrender.com/api/user/${userId}`,
          authHeader()
        );
        setCustomerInfo(response.data);
      } catch (error) {
        setCustomerInfo(null);
      }
    } else {
      setCustomerInfo(null);
    }
  }, [userId, authHeader]);

  // Local cart helpers
  const getLocalCart = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("localCart") || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  };

  const setLocalCart = (cart) => {
    localStorage.setItem("localCart", JSON.stringify(cart));
    setLocalCartState(cart);
  };

  // Sync localCart to server on login
  useEffect(() => {
    if (authToken) {
      const localCartArr = getLocalCart();
      if (localCartArr.length > 0) {
        axios
          .post(
            "https://panddretailshop.onrender.com/api/cart/add",
            localCartArr,
            authHeader()
          )
          .then(() => {
            setLocalCart([]);
            fetchCart();
          })
          .catch(() => {});
      }
    }
    // eslint-disable-next-line
  }, [authToken]);

  // Khi chưa đăng nhập thì lấy localCart
  useEffect(() => {
    if (!authToken) {
      setLocalCartState(getLocalCart());
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchCart();
    if (userId && openOrdersDialog) {
      fetchOrders(userId);
    } else if (userId && !openOrdersDialog && orders.length > 0) {
      setOrders([]);
    }

    if (userId && openProfileDialog) {
      fetchUserInfo();
    } else {
      setCustomerInfo(null);
    }
  }, [
    userId,
    openOrdersDialog,
    fetchCart,
    fetchOrders,
    openProfileDialog,
    fetchUserInfo,
  ]);

  const updateCartToServer = async (itemsToSend) => {
    setUpdating(true);
    try {
      await axios.post(
        "https://panddretailshop.onrender.com/api/cart/add",
        itemsToSend,
        authHeader()
      );
      await fetchCart();
    } catch (error) {
      alert("Có lỗi xảy ra khi cập nhật giỏ hàng");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuantityChange = async (itemIndex, newQuantity) => {
    if (newQuantity < 1) return;
    if (!authToken) {
      const updated = [...localCart];
      updated[itemIndex].quantity = newQuantity;
      setLocalCart(updated);
      return;
    }
    try {
      setUpdating(true);
      const updatedItem = cart.items[itemIndex];
      await axios.put(
        `https://panddretailshop.onrender.com/api/cart/update/${updatedItem.product._id}`,
        {
          quantity: newQuantity,
          selectedUnitName: updatedItem.selectedUnitName,
        },
        authHeader()
      );
      await fetchCart();
    } catch (error) {
      alert("Có lỗi xảy ra khi cập nhật số lượng");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (productId, selectedUnitName) => {
    if (
      window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?")
    ) {
      if (!authToken) {
        const updated = localCart.filter(
          (item) =>
            !(
              item.productId === productId &&
              item.selectedUnitName === selectedUnitName  
            )
        );
        setLocalCart(updated);
        return;
      }
      try {
        await axios.delete(
          `https://panddretailshop.onrender.com/api/cart/remove/${productId}`,
          {
            headers: authHeader().headers,
            data: { selectedUnitName },
          }
        );
        await fetchCart();
      } catch (error) {
        alert("Có lỗi xảy ra khi xóa sản phẩm khỏi giỏ hàng.");
      }
    }
  };

  const handleClearCart = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?")) {
      if (!authToken) {
        setLocalCart([]);
        return;
      }
      try {
        await axios.delete("https://panddretailshop.onrender.com/api/cart", authHeader());
        setCart(null);
      } catch (error) {}
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const handleCreatePreorder = async () => {
    if (!authToken) {
      alert("Vui lòng đăng nhập để đặt hàng.");
      navigate("/login");
      return;
    }
    if (!cart?.items?.length) {
      alert("Giỏ hàng của bạn đang trống.");
      return;
    }

    setCreatingPreorder(true);
    try {
      await axios.post(
        "https://panddretailshop.onrender.com/api/orders",
        {
          orderType: "preorder",
          cartId: cart._id,
        },
        authHeader()
      );
      alert("Đơn hàng preorder đã được tạo thành công!");
      await fetchCart();
      if (userId && openOrdersDialog) {
        fetchOrders(userId);
      }
    } catch (error) {
      alert("Có lỗi xảy ra khi tạo đơn hàng preorder.");
    } finally {
      setCreatingPreorder(false);
    }
  };

  const handlePayOnline = async (order) => {
    // Nếu là đơn hàng preorder chưa thanh toán thì cập nhật trạng thái sang paid khi xác nhận
    setSelectedOrderForPayment(order);
    setOpenQRPayment(true);
  };

  const handlePaymentSuccess = () => {
    alert("Thanh toán thành công!");
    if (userId) {
      fetchOrders(userId);
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleProfileClick = () => {
    setOpenProfileDialog(true);
    handleMenuClose();
  };

  const handleCloseProfileDialog = () => setOpenProfileDialog(false);

  const handleOrdersClick = () => {
    setOpenOrdersDialog(true);
    if (userId && !openOrdersDialog) {
      fetchOrders(userId);
    }
    handleMenuClose();
  };

  const handleCloseOrdersDialog = () => setOpenOrdersDialog(false);

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
    handleMenuClose();
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userID");
    navigate("/login");
    
    setOpenLogoutDialog(false);
  };

  const handleCloseLogoutDialog = () => setOpenLogoutDialog(false);

  const handleGoToProducts = () => {
    navigate("/products_page");
  };

  const OrderItem = ({
    order,
    expandedOrderId,
    toggleOrderDetails,
    handlePayOnline,
  }) => (
    <Paper key={order._id} sx={{ mb: 2, p: { xs: 1, sm: 2 } }}>
      <ListItem
        secondaryAction={
          <IconButton onClick={() => toggleOrderDetails(order._id)}>
            {expandedOrderId === order._id ? (
              <ExpandLessIcon />
            ) : (
              <ExpandMoreIcon />
            )}
          </IconButton>
        }
      >
        <ListItemText
          primary={
            <Typography sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }}>
              Mã đơn hàng: {order.orderNumber}
            </Typography>
          }
          secondary={
            <>
              {`Ngày đặt: ${formatDate(order.createdAt)} - `}
              {`Tổng tiền: ${formatCurrency(order.finalAmount)} - `}
              {`Trạng thái: ${
                order.paymentStatus === "unpaid"
                  ? "Chưa thanh toán"
                  : "Đã thanh toán"
              }`}
              {order.expirationDate &&
                ` - Hạn nhận: ${formatDate(order.expirationDate)}`}
            </>
          }
        />
      </ListItem>
      <Collapse in={expandedOrderId === order._id} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <Divider />
          {order.products.map((productItem) => (
            <ListItem key={productItem._id} sx={{ pl: 2 }}>
              <ListItemText
                primary={`${productItem.productId.name} (${productItem.selectedUnitName}) x ${productItem.quantity}`}
                secondary={`Đơn giá: ${formatCurrency(
                  productItem.unitPrice
                )} - Tổng cộng: ${formatCurrency(productItem.itemTotal)}`}
              />
            </ListItem>
          ))}
          <Divider sx={{ mt: 1 }} />
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", mt: 1, pr: 2 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Tổng tiền: {formatCurrency(order.finalAmount)}
            </Typography>
          </Box>
          {order.expirationDate && order.orderType === "preorder" && (
            <Box sx={{ mt: 1, pr: 2 }}>
              <Typography variant="body2" color="text.secondary" align="right">
                Hết hạn vào: {new Date(order.expirationDate).toLocaleString()}
              </Typography>
              <Typography
                variant="body2"
                color="primary"
                align="right"
                sx={{ fontWeight: "bold" }}
              >
                Vui lòng đến nhận hàng trước: {formatDate(order.expirationDate)}
              </Typography>
            </Box>
          )}
          {order.paymentStatus === "unpaid" && (
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handlePayOnline(order)}
                sx={{ mr: 2 }}
              >
                Thanh toán ngay
              </Button>
            </Box>
          )}
        </List>
      </Collapse>
    </Paper>
  );

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ display: "flex", justifyContent: "center", pt: 4 }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <>
      {/* Header */}
      <CartHeader
        onGoToProducts={handleGoToProducts}
        onMenuOpen={handleMenuOpen}
        anchorEl={anchorEl}
        isMenuOpen={isMenuOpen}
        handleMenuClose={handleMenuClose}
        handleProfileClick={handleProfileClick}
        handleOrdersClick={handleOrdersClick}
        handleLogoutClick={handleLogoutClick}
      />

      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 1, md: 2 },
          mb: { xs: 2, md: 4 },
          px: { xs: 0.5, sm: 2 },
        }}
      >
        <CustomerProfile
          customer={customerInfo}
          onClose={handleCloseProfileDialog}
        />

        <Dialog
          open={openOrdersDialog}
          onClose={handleCloseOrdersDialog}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: { width: { xs: "98vw", sm: "90vw", md: "700px" } },
          }}
        >
          <DialogTitle>Đơn hàng của bạn</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Tìm kiếm đơn hàng theo mã"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 3, mt: 1 }}
            />

            {loadingOrders ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {/* Đơn hàng chưa hoàn thành */}
                <Typography
                  variant="h6"
                  sx={{ mb: 2, fontWeight: "bold", color: "#d32f2f" }}
                >
                  Đơn hàng chưa hoàn thành
                </Typography>
                {orders.filter(
                  (order) =>
                    order.paymentStatus === "unpaid" &&
                    order.orderNumber
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                ).length > 0 ? (
                  orders
                    .filter(
                      (order) =>
                        order.paymentStatus === "unpaid" &&
                        order.orderNumber
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                    )
                    .map((order) => (
                      <OrderItem
                        key={order._id}
                        order={order}
                        expandedOrderId={expandedOrderId}
                        toggleOrderDetails={toggleOrderDetails}
                        handlePayOnline={handlePayOnline}
                      />
                    ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Không có đơn hàng nào chưa hoàn thành
                  </Typography>
                )}

                {/* Đơn hàng đã hoàn thành */}
                <Typography
                  variant="h6"
                  sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#2e7d32" }}
                >
                  Đơn hàng đã hoàn thành
                </Typography>
                {orders.filter(
                  (order) =>
                    order.paymentStatus === "paid" &&
                    order.orderNumber
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                ).length > 0 ? (
                  orders
                    .filter(
                      (order) =>
                        order.paymentStatus === "paid" &&
                        order.orderNumber
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                    )
                    .map((order) => (
                      <OrderItem
                        key={order._id}
                        order={order}
                        expandedOrderId={expandedOrderId}
                        toggleOrderDetails={toggleOrderDetails}
                      />
                    ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Không có đơn hàng nào đã hoàn thành
                  </Typography>
                )}

                {orders.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Bạn chưa có đơn hàng nào.
                  </Typography>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseOrdersDialog}>Đóng</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openLogoutDialog}
          onClose={handleCloseLogoutDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          PaperProps={{
            sx: { width: { xs: "90vw", sm: "400px" } },
          }}
        >
          <DialogTitle id="alert-dialog-title">
            {"Xác nhận đăng xuất?"}
          </DialogTitle>
          <DialogContent>
            <Typography id="alert-dialog-description">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLogoutDialog}>Hủy</Button>
            <Button onClick={handleConfirmLogout} autoFocus>
              Đăng xuất
            </Button>
          </DialogActions>
        </Dialog>

        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            fontSize: { xs: "1.3rem", sm: "2rem" },
          }}
        >
          <ShoppingCartCheckoutIcon
            sx={{ mr: 1, fontSize: { xs: "1.5rem", sm: "2rem" } }}
          />
          Giỏ hàng của bạn
        </Typography>

        {/* Nếu chưa đăng nhập thì hiển thị localCart */}
        {!authToken ? (
          !localCart.length ? (
            <Paper sx={{ p: { xs: 2, md: 3 }, textAlign: "center" }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Giỏ hàng của bạn đang trống
              </Typography>
              <Button variant="contained" href="/products_page">
                Tiếp tục mua sắm
              </Button>
            </Paper>
          ) : (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 1.5, md: 3 }}
              sx={{ width: "100%" }}
            >
              <Box
                sx={{
                  flexGrow: 1,
                  height: { md: "70vh" },
                  overflowY: "auto", // Sửa: luôn có scroll dọc nếu tràn
                  mb: { xs: 2, md: 0 },
                }}
              >
                <List
                  sx={{
                    bgcolor: "background.paper",
                    height: { md: "100%" },
                    pr: { xs: 0, md: 2 },
                    "&::-webkit-scrollbar": { width: "6px" },
                    "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#888",
                      borderRadius: "4px",
                    },
                  }}
                >
                  {localCart.map((item, index) => (
                    <Paper key={index} sx={{ mb: 2, p: { xs: 1, md: 2 } }}>
                      <ListItem
                        sx={{
                          position: "relative",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "flex-start", sm: "center" },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={item.productImage || ""}
                            alt={item.productName || ""}
                            sx={{
                              width: { xs: 60, sm: 80 },
                              height: { xs: 60, sm: 80 },
                              mr: { xs: 0, sm: 2 },
                              mb: { xs: 1, sm: 0 },
                              borderRadius: 2,
                            }}
                            variant="rounded"
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 600,
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                              }}
                            >
                              {item.productName || item.productId}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Đơn vị: {item.selectedUnitName}
                              </Typography>
                            </>
                          }
                          sx={{ minWidth: 0 }}
                        />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            width: { xs: "100%", sm: "auto" },
                            mt: { xs: 1, sm: 0 },
                            flexWrap: { xs: "wrap", sm: "nowrap" },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <IconButton
                              onClick={() =>
                                handleQuantityChange(index, item.quantity - 1)
                              }
                            >
                              <RemoveIcon />
                            </IconButton>
                            <TextField
                              value={item.quantity}
                              size="small"
                              sx={{ width: 60 }}
                              inputProps={{
                                min: 1,
                                type: "number",
                                style: { textAlign: "center" },
                              }}
                              onChange={(e) =>
                                handleQuantityChange(
                                  index,
                                  parseInt(e.target.value) || 1
                                )
                              }
                            />
                            <IconButton
                              onClick={() =>
                                handleQuantityChange(index, item.quantity + 1)
                              }
                            >
                              <AddIcon />
                            </IconButton>
                          </Box>
                          <Typography
                            variant="h6"
                            sx={{
                              minWidth: 80,
                              textAlign: "right",
                              fontSize: { xs: "1rem", sm: "1.1rem" },
                            }}
                          >
                            {item.unitPrice
                              ? formatCurrency(item.quantity * item.unitPrice)
                              : `x${item.quantity}`}
                          </Typography>
                          <IconButton
                            onClick={() =>
                              handleRemoveItem(
                                item.productId,
                                item.selectedUnitName
                              )
                            }
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItem>
                    </Paper>
                  ))}
                </List>
              </Box>
              <Paper
                sx={{
                  p: { xs: 2, md: 3 },
                  position: { md: "sticky" },
                  top: { md: 16 },
                  width: { xs: "100%", md: "350px" },
                  minWidth: { xs: "unset", md: "320px" },
                  mt: { xs: 2, md: 0 },
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Đơn hàng
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" },
                    mb: 2,
                    gap: { xs: 0.5, sm: 0 },
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ textAlign: "left", width: "100%" }}
                  >
                    Tạm tính:
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ textAlign: "right", width: "100%" }}
                  >
                    {localCart.some((item) => item.unitPrice)
                      ? formatCurrency(
                          localCart.reduce(
                            (sum, item) =>
                              sum + item.quantity * (item.unitPrice || 0),
                            0
                          )
                        )
                      : `${localCart.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )} sản phẩm`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: { xs: 0.5, sm: 0 },
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ textAlign: "left", width: "100%" }}
                  >
                    Thành tiền:
                  </Typography>
                  <Typography
                    variant="h6"
                    color="primary"
                    sx={{ fontWeight: 600, textAlign: "right", width: "100%" }}
                  >
                    {localCart.some((item) => item.unitPrice)
                      ? formatCurrency(
                          localCart.reduce(
                            (sum, item) =>
                              sum + item.quantity * (item.unitPrice || 0),
                            0
                          )
                        )
                      : `${localCart.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )} sản phẩm`}
                  </Typography>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mb: 2, width: "100%" }}
                  onClick={handleCreatePreorder}
                >
                  Đặt hàng
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={handleClearCart}
                  sx={{ width: "100%" }}
                >
                  Xóa giỏ hàng
                </Button>
              </Paper>
            </Stack>
          )
        ) : !cart?.items?.length ? (
          <Paper sx={{ p: { xs: 2, md: 3 }, textAlign: "center" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Giỏ hàng của bạn đang trống
            </Typography>
            <Button variant="contained" href="/products_page">
              Tiếp tục mua sắm
            </Button>
          </Paper>
        ) : (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 1.5, md: 3 }}
            sx={{ width: "100%" }}
          >
            <Box
              sx={{
                flexGrow: 1,
                height: { md: "70vh" },
                overflowY: "auto", // Sửa: luôn có scroll dọc nếu tràn
                mb: { xs: 2, md: 0 },
              }}
            >
              <List
                sx={{
                  bgcolor: "background.paper",
                  height: { md: "100%" },
                  pr: { xs: 0, md: 2 },
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#888",
                    borderRadius: "4px",
                  },
                }}
              >
                {cart.items.map((item, index) => (
                  <Paper key={item._id} sx={{ mb: 2, p: { xs: 1, md: 2 } }}>
                    <ListItem
                      sx={{
                        position: "relative",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "center" },
                      }}
                    >
                      {updating && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: "rgba(255,255,255,0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CircularProgress size={24} />
                        </Box>
                      )}

                      <ListItemAvatar>
                        <Avatar
                          src={item.product.images[0]}
                          alt={item.product.name}
                          sx={{
                            width: { xs: 60, sm: 80 },
                            height: { xs: 60, sm: 80 },
                            mr: { xs: 0, sm: 2 },
                            mb: { xs: 1, sm: 0 },
                            borderRadius: 2,
                          }}
                          variant="rounded"
                        />
                      </ListItemAvatar>

                      <ListItemText
                        primary={
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: "1rem", sm: "1.1rem" },
                            }}
                          >
                            {item.product.name}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Đơn vị: {item.selectedUnitName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Đơn giá: {formatCurrency(item.unitPrice)}
                            </Typography>
                          </>
                        }
                        sx={{ minWidth: 0 }}
                      />

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          width: { xs: "100%", sm: "auto" },
                          mt: { xs: 1, sm: 0 },
                          flexWrap: { xs: "wrap", sm: "nowrap" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <IconButton
                            onClick={() =>
                              handleQuantityChange(index, item.quantity - 1)
                            }
                            disabled={updating}
                          >
                            <RemoveIcon />
                          </IconButton>

                          <TextField
                            value={item.quantity}
                            size="small"
                            sx={{ width: 60 }}
                            inputProps={{
                              min: 1,
                              type: "number",
                              style: { textAlign: "center" },
                            }}
                            onChange={(e) =>
                              handleQuantityChange(
                                index,
                                parseInt(e.target.value) || 1
                              )
                            }
                            disabled={updating}
                          />

                          <IconButton
                            onClick={() =>
                              handleQuantityChange(index, item.quantity + 1)
                            }
                            disabled={updating}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>

                        <Typography
                          variant="h6"
                          sx={{
                            minWidth: 80,
                            textAlign: "right",
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                          }}
                        >
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </Typography>

                        <IconButton
                          onClick={() =>
                            handleRemoveItem(
                              item.product._id,
                              item.selectedUnitName
                            )
                          }
                          color="error"
                          disabled={updating}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  </Paper>
                ))}
              </List>
            </Box>

            {cart?.items?.length > 0 && (
              <Paper
                sx={{
                  p: { xs: 2, md: 3 },
                  position: { md: "sticky" },
                  top: { md: 16 },
                  width: { xs: "100%", md: "350px" },
                  minWidth: { xs: "unset", md: "320px" },
                  mt: { xs: 2, md: 0 },
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Đơn hàng
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" },
                    mb: 2,
                    gap: { xs: 0.5, sm: 0 },
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ textAlign: "left", width: "100%" }}
                  >
                    Tạm tính:
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ textAlign: "right", width: "100%" }}
                  >
                    {formatCurrency(cart?.total || 0)}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: { xs: 0.5, sm: 0 },
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ textAlign: "left", width: "100%" }}
                  >
                    Thành tiền:
                  </Typography>
                  <Typography
                    variant="h6"
                    color="primary"
                    sx={{ fontWeight: 600, textAlign: "right", width: "100%" }}
                  >
                    {formatCurrency(cart?.total || 0)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mb: 2, width: "100%" }}
                  onClick={handleCreatePreorder}
                  disabled={
                    updating || creatingPreorder || !cart?.items?.length
                  }
                >
                  Đặt hàng
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={handleClearCart}
                  disabled={
                    updating || creatingPreorder || !cart?.items?.length
                  }
                  sx={{ width: "100%" }}
                >
                  Xóa giỏ hàng
                </Button>
              </Paper>
            )}
          </Stack>
        )}

        {/* Thêm button thanh toán online cho các đơn hàng chưa thanh toán */}
        {orders.map((order) => (
          <div key={order._id}>
            {/* Existing order display code */}
            {order.paymentStatus === "unpaid" && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => handlePayOnline(order)}
                sx={{ mt: 1 }}
              >
                Thanh toán online
              </Button>
            )}
          </div>
        ))}

        {/* QR Payment Dialog */}
        <QRPayment
          open={openQRPayment}
          onClose={() => setOpenQRPayment(false)}
          order={selectedOrderForPayment}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </Container>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default CartPage;