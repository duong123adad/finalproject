import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  useTheme,
  Chip,
  Stack,
  ImageList,
  ImageListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Badge,
  Popover,
  ButtonGroup,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  CircularProgress,
  Paper,
  Collapse,
  AppBar,
  Toolbar,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useNavigate } from "react-router-dom";

// Header component
const Header = ({
  cartItemCount,
  handleGoToCart,
  handleMenuOpen,
  anchorMenu,
  handleMenuClose,
  handleProfileClick,
  handleOrdersClick,
  handleLogoutClick,
}) => {
  const theme = useTheme();
  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        bgcolor: "#1976d2",
        color: "#fff",
        borderRadius: 2,
        mx: 2,
        mt: 2,
        mb: 2,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            letterSpacing: 2,
            color: "#fff",
            textShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          Cửa hàng bán lẻ DandP
        </Typography>
        <Box>
          <IconButton
            color="inherit"
            onClick={handleGoToCart}
            sx={{
              bgcolor: "#fff",
              color: "#1976d2",
              mx: 1,
              "&:hover": { bgcolor: "#e3f2fd" },
              borderRadius: 2,
            }}
          >
            <Badge
              badgeContent={cartItemCount > 0 ? cartItemCount : null}
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  fontWeight: "bold",
                  fontSize: 14,
                  minWidth: 22,
                  height: 22,
                },
              }}
            >
              <ShoppingCartIcon fontSize="medium" />
            </Badge>
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            sx={{
              bgcolor: "#fff",
              color: "#1976d2",
              mx: 1,
              "&:hover": { bgcolor: "#e3f2fd" },
              borderRadius: 2,
            }}
          >
            <AccountCircleIcon fontSize="medium" />
          </IconButton>
          <Menu
            anchorEl={anchorMenu}
            open={Boolean(anchorMenu)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { borderRadius: 2, minWidth: 180, mt: 1 },
            }}
          >
            <MenuItem onClick={handleProfileClick}>Hồ sơ</MenuItem>
            <MenuItem onClick={handleOrdersClick}>Các đơn hàng</MenuItem>
            <MenuItem onClick={handleLogoutClick}>Đăng xuất</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

const ProductListPage = () => {
  const [categories, setCategories] = useState([]);
  const [productsWithBatches, setProductsWithBatches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const primaryColor = "#e3f2fd";
  const activeColor = "#1976d2";
  const hoverColor = "#bbdefb";
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [remainingQuantity, setRemainingQuantity] = useState(0);
  const authToken = localStorage.getItem("authToken");
  const [cartItemCount, setCartItemCount] = useState(0);

  // User menu & dialogs
  const [anchorMenu, setAnchorMenu] = useState(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [openOrdersDialog, setOpenOrdersDialog] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchOrderTerm, setSearchOrderTerm] = useState("");
  const userId = localStorage.getItem("userID");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const fetchProductsWithBatches = async () => {
    try {
      const response = await axios.get(
        "https://panddretailshop.onrender.com/api/products/batch/products-with-batches"
      );
      if (response.data.success) {
        // Lọc sản phẩm có ít nhất 1 lô còn hàng
        const filtered = response.data.data.filter(product =>
          product.batches &&
          product.batches.some(
            batch =>
              (batch.initial_quantity || 0) - (batch.sold_quantity || 0) > 0
          )
        );
        setProductsWithBatches(filtered);
      }
    } catch (error) {
      console.error("Error fetching products with batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsWithBatchesByCategory = async (categoryId) => {
    try {
      const response = await axios.get(
        `https://panddretailshop.onrender.com/api/products/batch/products-with-batches?category=${categoryId}`
      );
      if (response.data.success) {
        // Lọc sản phẩm có ít nhất 1 lô còn hàng
        const filtered = response.data.data.filter(product =>
          product.batches &&
          product.batches.some(
            batch =>
              (batch.initial_quantity || 0) - (batch.sold_quantity || 0) > 0
          )
        );
        setProductsWithBatches(filtered);
      }
    } catch (error) {
      console.error("Error fetching products with batches by category:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        "https://panddretailshop.onrender.com/api/categories/tree"
      );
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setLoading(true);
    if (category) {
      fetchProductsWithBatchesByCategory(category._id);
    } else {
      fetchProductsWithBatches();
    }
  };

  const handleProductClick = (productId) => {
    const productDetails = productsWithBatches.find(
      (product) => product._id === productId
    );
    setSelectedProductDetails(productDetails);
    setOpenProductDialog(true);
  };

  const handleCloseProductDialog = () => {
    setOpenProductDialog(false);
    setSelectedProductDetails(null);
  };

  const handleGoToCart = () => {
    navigate("/cart_page");
  };

  const calculateTotalRemainingQuantity = (product) => {
    if (!product.batches || product.batches.length === 0) {
      return 0;
    }
    return product.batches.reduce(
      (total, batch) =>
        total +
        Math.max(0, (batch.initial_quantity || 0) - (batch.sold_quantity|| 0)),
      0
    );
  };

  const handleAddToCartClick = (event, product) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setCurrentProduct(product);
    setSelectedQuantity(1);
    const availableQuantity = calculateTotalRemainingQuantity(product);
    setRemainingQuantity(availableQuantity);
  };

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
  };

  const getLocalCartCount = () => {
    const cart = getLocalCart();
    return cart.length;
  };

  // Sync localCart to server on login
  useEffect(() => {
    if (authToken) {
      const localCart = getLocalCart();
      if (localCart.length > 0) {
        const payload = localCart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedUnitName: item.selectedUnitName,
        }));
        axios
          .post("https://panddretailshop.onrender.com/api/cart/add", payload, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
          .then(() => {
            setLocalCart([]);
            fetchCartInfo();
          })
          .catch(() => {});
      }
    }
    // eslint-disable-next-line
  }, [authToken]);

  const fetchCartInfo = async () => {
    if (!authToken) {
      setCartItemCount(getLocalCartCount());
      return;
    }
    try {
      const response = await axios.get("https://panddretailshop.onrender.com/api/cart", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.data && response.data.items) {
        setCartItemCount(response.data.items.length);
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      setCartItemCount(0);
    }
  };

  const handleAddToCartToApi = async (product, quantity, selectedUnitName) => {
    if (!authToken) {
      const localCart = getLocalCart();
      const baseUnit = product.units.find((unit) => unit.ratio === 1);
      const unitPrice = baseUnit ? baseUnit.salePrice : 0;
      const idx = localCart.findIndex(
        (item) =>
          item.productId === product._id &&
          item.selectedUnitName === selectedUnitName
      );
      if (idx !== -1) {
        localCart[idx].quantity += quantity;
      } else {
        localCart.push({
          productId: product._id,
          quantity,
          selectedUnitName,
          productName: product.name,
          productImage:
            product.images && product.images.length > 0
              ? product.images[0]
              : "",
          unitPrice: unitPrice,
        });
      }
      setLocalCart(localCart);
      setSnackbarMessage("Đã thêm vào giỏ hàng (chưa đăng nhập)");
      setSnackbarOpen(true);
      handleCloseQuantityPopover();
      setCartItemCount(localCart.length);
      return;
    }

    try {
      const response = await axios.post(
        "https://panddretailshop.onrender.com/api/cart/add",
        [
          {
            productId: product._id,
            quantity: quantity,
            selectedUnitName: selectedUnitName,
          },
        ],
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (response.data.message) {
        setSnackbarMessage(response.data.message);
        setSnackbarOpen(true);
        handleCloseQuantityPopover();
        fetchCartInfo();
      }
    } catch (error) {
      setSnackbarMessage("Có lỗi khi thêm sản phẩm vào giỏ hàng.");
      setSnackbarOpen(true);
    }
  };

  const handleAddToCart = () => {
    if (!currentProduct) return;
    const baseUnit = currentProduct.units.find((unit) => unit.ratio === 1);
    if (!baseUnit) {
      setSnackbarMessage(
        "Không thể thêm sản phẩm: không tìm thấy đơn vị cơ bản"
      );
      setSnackbarOpen(true);
      return;
    }
    const availableQuantity = calculateTotalRemainingQuantity(currentProduct);
    if ( availableQuantity <= selectedQuantity) {
      setSnackbarMessage(
        `Số lượng bạn chọn (${selectedQuantity}) vượt quá số lượng còn lại (${availableQuantity})`
      );
      setSnackbarOpen(true);
      return;
    }
    handleAddToCartToApi(currentProduct, selectedQuantity, baseUnit.name);
  };

  const handleCloseQuantityPopover = () => {
    setAnchorEl(null);
    setCurrentProduct(null);
    setRemainingQuantity(0);
  };

  const handleIncrementQuantity = () => {
    const availableQuantity = calculateTotalRemainingQuantity(currentProduct);
    if (selectedQuantity < availableQuantity) {
      setSelectedQuantity((prev) => prev + 1);
    }
  };

  const handleDecrementQuantity = () => {
    setSelectedQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleQuantityChange = (event) => {
    const value = parseInt(event.target.value);
    const availableQuantity = calculateTotalRemainingQuantity(currentProduct);
    if (!isNaN(value) && value >= 1 && value <= availableQuantity) {
      setSelectedQuantity(value);
    } else if (value > availableQuantity) {
      setSelectedQuantity(availableQuantity);
      setSnackbarMessage(`Số lượng tối đa có thể thêm là ${availableQuantity}`);
      setSnackbarOpen(true);
    } else {
      setSelectedQuantity(1);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    fetchCategories();
    fetchProductsWithBatches();
    fetchCartInfo();
    // eslint-disable-next-line
  }, []);

  const getBaseUnitPrice = (product) => {
    const baseUnit = product.units.find((unit) => unit.ratio === 1);
    return baseUnit ? baseUnit.salePrice : 0;
  };

  const calculateDiscountedPrice = (product) => {
    if (!product.discount || !product.discount.type) return null;
    const now = new Date();
    if (
      product.discount.startDate &&
      new Date(product.discount.startDate) > now
    )
      return null;
    if (product.discount.endDate && new Date(product.discount.endDate) < now)
      return null;
    const basePrice = getBaseUnitPrice(product);
    return product.discount.type === "percentage"
      ? basePrice * (1 - product.discount.value / 100)
      : Math.max(0, basePrice - product.discount.value);
  };

  const renderPrice = (product) => {
    const basePrice = getBaseUnitPrice(product);
    const discountedPrice = calculateDiscountedPrice(product);

    return (
      <Box>
        {discountedPrice ? (
          <>
            <Typography
              variant="h6"
              color={theme.palette.error.main}
              sx={{ textDecoration: "line-through", fontSize: "0.9rem" }}
            >
              {basePrice.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })}
            </Typography>
            <Typography
              variant="h6"
              color={theme.palette.success.main}
              sx={{ fontWeight: "bold" }}
            >
              {discountedPrice.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })}
            </Typography>
          </>
        ) : (
          <Typography
            variant="h6"
            color={theme.palette.success.main}
            sx={{ fontWeight: "bold" }}
          >
            {basePrice.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Typography>
        )}
      </Box>
    );
  };

  // User menu handlers
  const handleMenuOpen = (event) => setAnchorMenu(event.currentTarget);
  const handleMenuClose = () => setAnchorMenu(null);

  const handleProfileClick = async () => {
    setOpenProfileDialog(true);
    handleMenuClose();
    if (userId) {
      try {
        const response = await axios.get(
          `https://panddretailshop.onrender.com/api/user/${userId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        setCustomerInfo(response.data);
      } catch (error) {
        setCustomerInfo(null);
      }
    }
  };

  const handleOrdersClick = async () => {
    setOpenOrdersDialog(true);
    handleMenuClose();
    if (userId) {
      setLoadingOrders(true);
      try {
        const { data } = await axios.get(
          `https://panddretailshop.onrender.com/api/orders?customerId=${userId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        setOrders(data);
      } catch (error) {
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    }
  };

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
    handleMenuClose();
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userID");
    window.location.href = "/login";
  };

  // Sửa lỗi đóng dialog hồ sơ
  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
    setCustomerInfo(null);
  };
  const handleCloseOrdersDialog = () => setOpenOrdersDialog(false);
  const handleCloseLogoutDialog = () => setOpenLogoutDialog(false);

  // CustomerProfile component
  const CustomerProfile = ({ open, customer, onClose }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Thông tin cá nhân</DialogTitle>
      <DialogContent>
        {customer ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 2,
            }}
          >
            <Avatar
              alt={customer.fullName}
              src={customer.profileImage}
              sx={{ width: 80, height: 80, mb: 2 }}
            />
            <Typography variant="h6">{customer.fullName}</Typography>
            <Typography variant="subtitle1" color="text.secondary">
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
                  Địa chỉ: {customer.address.street}, {customer.address.city}
                </Typography>
              )}
              {customer.dateOfBirth && (
                <Typography variant="body2">
                  Ngày sinh:{" "}
                  {new Date(customer.dateOfBirth).toLocaleDateString()}
                </Typography>
              )}
              {customer.gender && (
                <Typography variant="body2">
                  Giới tính: {customer.gender}
                </Typography>
              )}
            </Stack>
          </Box>
        ) : (
          <Typography>Không có thông tin người dùng.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );

  // Đơn hàng dạng collapse giống CartPage
  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);

  const OrderItem = ({ order, expandedOrderId, toggleOrderDetails }) => (
    <Paper key={order._id} sx={{ mb: 2, p: 2 }}>
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
          primary={`Mã đơn hàng: ${order.orderNumber}`}
          secondary={
            <>
              {`Ngày đặt: ${new Date(order.createdAt).toLocaleDateString()} - `}
              {`Tổng tiền: ${formatCurrency(order.finalAmount)} - `}
              {`Trạng thái: ${
                order.paymentStatus === "unpaid"
                  ? "Chưa thanh toán"
                  : "Đã thanh toán"
              }`}
              {order.expirationDate &&
                ` - Hạn nhận: ${new Date(
                  order.expirationDate
                ).toLocaleDateString()}`}
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
                Vui lòng đến nhận hàng trước:{" "}
                {new Date(order.expirationDate).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </List>
      </Collapse>
    </Paper>
  );

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const renderCategories = (categoryList, level = 0) => {
    const marginLeft = level * 16;
    return categoryList.map((category) => (
      <React.Fragment key={category._id}>
        <ListItem disablePadding style={{ marginLeft }}>
          <ListItemButton
            onClick={() => handleCategoryClick(category)}
            sx={{
              backgroundColor:
                selectedCategory?._id === category._id
                  ? activeColor
                  : "transparent",
              color:
                selectedCategory?._id === category._id
                  ? "#fff"
                  : theme.palette.text.primary,
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              "&:hover": {
                backgroundColor: hoverColor,
                color: "#1976d2",
              },
              fontWeight: level === 0 ? "bold" : "normal",
              pl: 2 + level * 2,
            }}
          >
            <ListItemText
              primary={category.name}
              primaryTypographyProps={{
                style: { fontWeight: level === 0 ? "bold" : "normal" },
              }}
            />
          </ListItemButton>
        </ListItem>
        {category.subcategories &&
          renderCategories(category.subcategories, level + 1)}
      </React.Fragment>
    ));
  };

  const filteredProductsWithBatches = productsWithBatches.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box
      sx={{
        bgcolor: "#f7fafd",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Header
        cartItemCount={cartItemCount}
        handleGoToCart={handleGoToCart}
        handleMenuOpen={handleMenuOpen}
        anchorMenu={anchorMenu}
        handleMenuClose={handleMenuClose}
        handleProfileClick={handleProfileClick}
        handleOrdersClick={handleOrdersClick}
        handleLogoutClick={handleLogoutClick}
      />

      <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: 260,
            minWidth: 260,
            maxWidth: 260,
            borderRight: `1px solid #e3e3e3`,
            bgcolor: primaryColor,
            overflowY: "auto",
            height: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            boxShadow: 2,
            m: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              textAlign: "center",
              py: 2,
              bgcolor: "#1976d2",
              color: "#fff",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              fontWeight: "bold",
              letterSpacing: 1,
              boxShadow: 1,
            }}
          >
            Danh mục sản phẩm
          </Typography>
          <List sx={{ flexGrow: 1 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleCategoryClick(null)}
                sx={{
                  backgroundColor: !selectedCategory
                    ? activeColor
                    : "transparent",
                  color: !selectedCategory ? "#fff" : theme.palette.text.primary,
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
                  "&:hover": {
                    backgroundColor: hoverColor,
                    color: "#1976d2",
                  },
                  fontWeight: "bold",
                  pl: 2,
                }}
              >
                <ListItemText primary="Tất cả sản phẩm" />
              </ListItemButton>
            </ListItem>
            {renderCategories(categories)}
          </List>
        </Box>

        {/* Main content */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            overflowY: "auto",
            height: "calc(100vh - 120px)",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            m: 2,
            bgcolor: "#fff",
            boxShadow: 2,
          }}
        >
          <TextField
            label="Tìm kiếm sản phẩm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: "70%",
              mb: 3,
              mx: "auto",
              bgcolor: "#f7fafd",
              borderRadius: 2,
              boxShadow: 1,
            }}
            InputProps={{
              sx: { fontSize: 18, py: 1.5 },
            }}
            InputLabelProps={{
              sx: { fontSize: 16 },
            }}
          />

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={4}>
              {filteredProductsWithBatches.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 3,
                      borderRadius: 3,
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-6px) scale(1.03)",
                        boxShadow: 6,
                        borderColor: "#1976d2",
                      },
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {product.images?.length > 0 ? (
                      <ImageList cols={1} rowHeight={180} sx={{ m: 0 }}>
                        <ImageListItem>
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            style={{
                              objectFit: "contain",
                              height: 180,
                              width: "100%",
                              borderTopLeftRadius: 12,
                              borderTopRightRadius: 12,
                              background: "#f7fafd",
                            }}
                          />
                        </ImageListItem>
                      </ImageList>
                    ) : (
                      <CardMedia
                        component="img"
                        height="180"
                        image="https://via.placeholder.com/200"
                        alt={product.name}
                        sx={{
                          objectFit: "contain",
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                          background: "#f7fafd",
                        }}
                      />
                    )}

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography
                        gutterBottom
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: "#1976d2",
                          mb: 1,
                          fontSize: 20,
                        }}
                      >
                        {product.name}
                      </Typography>
                      {product.category && (
                        <Chip
                          label={product.category.name}
                          color="primary"
                          size="small"
                          sx={{
                            mb: 1,
                            bgcolor: "#e3f2fd",
                            color: "#1976d2",
                            fontWeight: "bold",
                          }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1, minHeight: 40 }}
                      >
                        {product.description?.substring(0, 80)}...
                      </Typography>
                      {renderPrice(product)}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        Đơn vị: {product.units.find((u) => u.ratio === 1)?.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="success.main"
                        sx={{
                          fontWeight: "bold",
                          mt: 1,
                          fontSize: 15,
                          letterSpacing: 0.5,
                        }}
                      >
                        Số lượng còn lại: {calculateTotalRemainingQuantity(product)}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={(e) => handleAddToCartClick(e, product)}
                          sx={{
                            flexGrow: 1,
                            bgcolor: "#1976d2",
                            color: "#fff",
                            fontWeight: "bold",
                            borderRadius: 2,
                            boxShadow: 1,
                            "&:hover": { bgcolor: "#1565c0" },
                          }}
                        >
                          Thêm
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleProductClick(product._id)}
                          sx={{
                            borderColor: "#1976d2",
                            color: "#1976d2",
                            fontWeight: "bold",
                            borderRadius: 2,
                            "&:hover": {
                              bgcolor: "#e3f2fd",
                              borderColor: "#1565c0",
                            },
                          }}
                        >
                          Chi tiết
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>
      {/* Popover chọn số lượng */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseQuantityPopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: 4, bgcolor: "#f7fafd" },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: 260,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: "#1976d2" }}
          >
            Chọn số lượng
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <ButtonGroup>
              <Button
                size="small"
                onClick={handleDecrementQuantity}
                sx={{
                  bgcolor: "#e3f2fd",
                  color: "#1976d2",
                  "&:hover": { bgcolor: "#bbdefb" },
                }}
              >
                <RemoveIcon fontSize="small" />
              </Button>
              <TextField
                size="small"
                type="number"
                value={selectedQuantity}
                onChange={handleQuantityChange}
                inputProps={{
                  min: 1,
                  max: remainingQuantity,
                  style: { textAlign: "center", width: "50px" },
                }}
                sx={{
                  mx: 1,
                  "& .MuiInputBase-root": { borderRadius: 2 },
                }}
              />
              <Button
                size="small"
                onClick={handleIncrementQuantity}
                sx={{
                  bgcolor: "#e3f2fd",
                  color: "#1976d2",
                  "&:hover": { bgcolor: "#bbdefb" },
                }}
              >
                <AddIcon fontSize="small" />
              </Button>
            </ButtonGroup>
            <Button
              variant="contained"
              onClick={handleAddToCart}
              color="primary"
              sx={{
                ml: 2,
                borderRadius: 2,
                fontWeight: "bold",
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#1565c0" },
              }}
            >
              Xác nhận
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Số lượng còn lại: {remainingQuantity}
          </Typography>
        </Box>
      </Popover>
      {/* Dialog chi tiết sản phẩm */}
      <Dialog
        open={openProductDialog}
        onClose={handleCloseProductDialog}
        fullWidth
        maxWidth="sm"
      >
        {selectedProductDetails && (
          <>
            <DialogTitle>{selectedProductDetails.name}</DialogTitle>
            <DialogContent>
              {selectedProductDetails.images?.length > 0 ? (
                <img
                  src={selectedProductDetails.images[0]}
                  alt={selectedProductDetails.name}
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <CardMedia
                  component="img"
                  height="200"
                  image="https://via.placeholder.com/200"
                  alt={selectedProductDetails.name}
                  sx={{ objectFit: "contain" }}
                />
              )}

              <Typography variant="subtitle1" gutterBottom>
                {renderPrice(selectedProductDetails)}
              </Typography>

              {selectedProductDetails.units?.map((unit, index) => (
                <Typography key={index} variant="body2">
                  {unit.name} ({unit.ratio}):{" "}
                  {unit.salePrice.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </Typography>
              ))}

              <Typography
                variant="body2"
                color="success.main"
                sx={{ fontWeight: "bold", mt: 1 }}
              >
                Số lượng còn lại:{" "}
                {calculateTotalRemainingQuantity(selectedProductDetails)}
              </Typography>

              {selectedProductDetails.discount && (
                <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.action.hover }}>
                  <Typography variant="subtitle2">
                    Khuyến mãi: {selectedProductDetails.discount.reason}
                  </Typography>
                  <Typography variant="body2">
                    Giảm {selectedProductDetails.discount.value}{" "}
                    {selectedProductDetails.discount.type === "percentage"
                      ? "%"
                      : "₫"}
                  </Typography>
                  <Typography variant="caption">
                    Từ{" "}
                    {new Date(
                      selectedProductDetails.discount.startDate
                    ).toLocaleDateString()}{" "}
                    đến{" "}
                    {new Date(
                      selectedProductDetails.discount.endDate
                    ).toLocaleDateString()}
                  </Typography>
                </Box>
              )}

              <Typography variant="body2" sx={{ mt: 2 }}>
                {selectedProductDetails.description}
              </Typography>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseProductDialog}>Đóng</Button>
              <Button
                onClick={(e) => {
                  handleCloseProductDialog();
                  const baseUnit = selectedProductDetails.units.find(
                    (unit) => unit.ratio === 1
                  );
                  if (baseUnit) {
                    handleAddToCartToApi(
                      selectedProductDetails,
                      1,
                      baseUnit.name
                    );
                  } else {
                    setSnackbarMessage(
                      "Không thể thêm sản phẩm: không tìm thấy đơn vị cơ bản"
                    );
                    setSnackbarOpen(true);
                  }
                }}
                color="primary"
                variant="contained"
              >
                Thêm vào giỏ
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      {/* Hồ sơ khách hàng */}
      <CustomerProfile
        open={openProfileDialog}
        customer={customerInfo}
        onClose={handleCloseProfileDialog}
      />
      {/* Đơn hàng dạng collapse giống CartPage */}
      <Dialog
        open={openOrdersDialog}
        onClose={handleCloseOrdersDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Đơn hàng của bạn</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tìm kiếm đơn hàng theo mã"
            variant="outlined"
            value={searchOrderTerm}
            onChange={(e) => setSearchOrderTerm(e.target.value)}
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
                    .includes(searchOrderTerm.toLowerCase())
              ).length > 0 ? (
                orders
                  .filter(
                    (order) =>
                      order.paymentStatus === "unpaid" &&
                      order.orderNumber
                        .toLowerCase()
                        .includes(searchOrderTerm.toLowerCase())
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
                    .includes(searchOrderTerm.toLowerCase())
              ).length > 0 ? (
                orders
                  .filter(
                    (order) =>
                      order.paymentStatus === "paid" &&
                      order.orderNumber
                        .toLowerCase()
                        .includes(searchOrderTerm.toLowerCase())
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
      {/* Đăng xuất */}
      <Dialog
        open={openLogoutDialog}
        onClose={handleCloseLogoutDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
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
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductListPage;