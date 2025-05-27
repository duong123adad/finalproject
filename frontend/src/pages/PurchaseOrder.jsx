import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Checkbox,
  Paper,
  Stack,
  useMediaQuery,
  useTheme,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TableSortLabel,
  Autocomplete,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import ListAltIcon from '@mui/icons-material/ListAlt';
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';

const UNITS = ["thùng", "bao", "chai", "lọ", "lon", "hộp", "gói", "cái", "kg", "liter","thùng 30", "thùng 24", "thùng 12", "lốc 6", "bao 10", "bao 15", "bao 20", "bao 5", "lốc 12"];
const STATUSES = [
  { value: "đã gửi NCC", label: "Đã gửi NCC" },
  // { value: "hoàn thành", label: "Hoàn thành" },
  { value: "đã hủy", label: "Đã hủy" },
  { value: "completed", label: "Hoàn thành" },


];

// Custom styled tabs to match sales page
const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.primary.main,
    height: 3,
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.pxToRem(16),
  marginRight: theme.spacing(1),
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeightMedium,
  },
  '&.Mui-focusVisible': {
    backgroundColor: 'rgba(100, 95, 228, 0.32)',
  },
}));

const PurchaseOrderManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [orders, setOrders] = useState([]);
  const [editOrder, setEditOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDateError, setDeliveryDateError] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("Tại cửa hàng");
  const [paymentMethod, setPaymentMethod] = useState("Thanh toán khi nhận hàng");
  const [showPreview, setShowPreview] = useState(false);
  const [approvalDate, setApprovalDate] = useState(null);
  const [orderStatus, setOrderStatus] = useState("đã gửi NCC");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("orderDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchParams] = useSearchParams();

  // Thời gian lọc theo ngày giao dự kiến, mặc định từ ngày đầu đến ngày cuối tháng hiện tại
  const [expectedStartDate, setExpectedStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Set to first day of current month
    return d;
  });
  const [expectedEndDate, setExpectedEndDate] = useState(() => {
    const d = new Date();
    // Set to last day of current month
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedSupplier]);

  useEffect(() => {
    fetchSuppliers(selectedProduct);
  }, [selectedProduct]);

  // Thêm useEffect để xử lý preselected product từ URL
  useEffect(() => {
    const preselectedProductId = searchParams.get('preselected-product');
    const productName = searchParams.get('product-name');
    
    if (preselectedProductId && productName && products.length > 0) {
      // Kiểm tra xem sản phẩm có tồn tại trong danh sách không
      const product = products.find(p => p._id === preselectedProductId);
      if (product) {
        setSelectedProduct(preselectedProductId);
        // Đặt tab về tab tạo phiếu đặt hàng
        setTabValue(0);
        // Tự động chọn đơn vị đầu tiên của sản phẩm
        if (product.units && product.units.length > 0) {
          setUnit(product.units[0].name);
        }
        // Xóa các tham số URL sau khi đã xử lý
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('preselected-product');
        newSearchParams.delete('product-name');
        navigate({ search: newSearchParams.toString() }, { replace: true });
      }
    }
  }, [products, searchParams, navigate]);

  const fetchSuppliers = async (productId = null) => {
    try {
      const response = await axios.get("https://panddretailshop.onrender.com/api/suppliers");
      let filteredSuppliers = response.data;
      
      if (productId) {
        // Filter suppliers that provide the selected product
        filteredSuppliers = response.data.filter(supplier => 
          supplier.suppliedProducts && 
          supplier.suppliedProducts.some(item => item.product === productId)
        );
      }
      
      setSuppliers(filteredSuppliers);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get("https://panddretailshop.onrender.com/api/products");
      const activeProducts = response.data.data.filter(product => product.active !== false);
      if (selectedSupplier) {
        const supplierData = await axios.get(`https://panddretailshop.onrender.com/api/suppliers/${selectedSupplier}`);
        const suppliedProductIds = supplierData.data.suppliedProducts.map(item => item.product);
        const filteredProducts = activeProducts.filter(product => suppliedProductIds.includes(product._id));
        setProducts(filteredProducts);
      } else {
        setProducts(activeProducts);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get("https://panddretailshop.onrender.com/api/purchaseOrder");
      setOrders(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddItem = () => {
    const product = products.find((p) => p._id === selectedProduct);
    if (!product || !selectedProduct || quantity <= 0 || !unit) return;
    const existingIndex = orderItems.findIndex(item => item.product === selectedProduct && item.unit === unit);
    if (existingIndex !== -1) {
      setOrderItems(orderItems.map((item, index) => 
        index === existingIndex ? {
          ...item,
          quantity: item.quantity + Number(quantity),
        } : item
      ));
    } else {
      setOrderItems([...orderItems, {
        product: selectedProduct,
        name: product.name,
        quantity: Number(quantity),
        unit,
      }]);
    }
    setSelectedProduct("");
    setQuantity(1);
    setUnit("");
  };

  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter((item) => item.product !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setOrderItems(prev => prev.map(item => {
      if (item.product === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handlePreviewOrder = () => {
    if (!selectedSupplier || orderItems.length === 0) {
      if (!selectedSupplier) {
        alert("Vui lòng chọn nhà cung cấp");
      } else if (orderItems.length === 0) {
        alert("Vui lòng thêm sản phẩm vào đơn hàng");
      }
      return;
    }
    
    if (!validateDeliveryDate(expectedDeliveryDate)) {
      return;
    }
    
    setShowPreview(true);
  };

  const validateDeliveryDate = (date) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(date);
    
    if (deliveryDate < currentDate) {
      setDeliveryDateError("Ngày giao hàng dự kiến phải bằng hoặc sau ngày hiện tại");
      return false;
    }
    
    setDeliveryDateError("");
    return true;
  };

  const handleDeliveryDateChange = (e) => {
    const newDate = e.target.value;
    setExpectedDeliveryDate(newDate);
    validateDeliveryDate(newDate);
  };

  const handleSubmit = async () => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(expectedDeliveryDate);
    
    if (!selectedSupplier || orderItems.length === 0) {
      if (!selectedSupplier) {
        alert("Vui lòng chọn nhà cung cấp");
      } else if (orderItems.length === 0) {
        alert("Vui lòng thêm sản phẩm vào đơn hàng");
      }
      return;
    }
    
    if (!validateDeliveryDate(expectedDeliveryDate)) {
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        supplier: selectedSupplier,
        supplierName: suppliers.find(s => s._id === selectedSupplier)?.name || "",
        items: orderItems.map(({ product, name, quantity, unit }) => ({
          product,
          productName: name,
          quantity,
          unit,
          conversionRate: products.find(p => p._id === product)?.units.find(u => u.name === unit)?.ratio || 1,
        })),
        sendEmailFlag: sendEmail,
        expectedDeliveryDate,
        notes,
        deliveryAddress,
        paymentMethod,
        createdBy: localStorage.getItem("fullName") || "Không xác định",
        status: orderStatus,
        createdByName: localStorage.getItem("fullName") || "Không xác định",
        orderDate: new Date().toISOString(),
        approvalDate: orderStatus === "approved" ? new Date().toISOString() : null,
      };
      await axios.post("https://panddretailshop.onrender.com/api/purchaseOrder", payload);
      alert("Tạo phiếu đặt hàng thành công!");
      setSelectedSupplier("");
      setOrderItems([]);
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Lỗi khi tạo phiếu đặt hàng!");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order) => {
    // Add "đã hủy" to the list of read-only statuses
    const isReadOnly = ["hoàn thành", "completed", "đã hủy"].includes(order.status);
    setEditOrder({
      ...order,
      expectedDeliveryDate: order.expectedDeliveryDate.split("T")[0],
      deliveryAddress: order.deliveryAddress || "",
      paymentMethod: order.paymentMethod || "",
      notes: order.notes || "",
      status: order.status || "draft",
      originalStatus: order.status || "draft",
      approvalDate: order.approvalDate || null,
      isReadOnly, // Add a flag to indicate read-only mode
    });
    setEditOrderItems(order.items);
    setOpenDialog(true);
  };

  const handleEditOrderItemChange = (index, field, value) => {
    setEditOrderItems(prev => {
      const updatedItems = [...prev];
      updatedItems[index] = { 
        ...updatedItems[index], 
        [field]: value,
      };
      return updatedItems;
    });
  };

  const handleUpdateOrder = async () => {
    if (new Date(editOrder.expectedDeliveryDate) <= new Date(editOrder.orderDate)) return;
    try {
      const isNewlyApproved = editOrder.status === "đã gửi NCC" && editOrder.originalStatus !== "đã gửi NCC";
      const payload = {
        ...editOrder,
        supplier: editOrder.supplier._id,
        supplierName: suppliers.find(s => s._id === editOrder.supplier._id)?.name || editOrder.supplierName,
        items: editOrderItems.map(({ product, quantity, unit }) => ({
          product: product._id,
          productName: product.name || "",
          quantity,
          unit,
          conversionRate: products.find(p => p._id === product._id)?.units.find(u => u.name === unit)?.ratio || 1,
        })),
        approvalDate: isNewlyApproved ? new Date().toISOString() : editOrder.approvalDate,
      };
      await axios.put(`https://panddretailshop.onrender.com/api/purchaseOrder/${editOrder._id}`, payload);
      alert("Cập nhật phiếu đặt hàng thành công!");
      setOpenDialog(false);
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi cập nhật phiếu!");
    }
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await axios.delete(`https://panddretailshop.onrender.com/api/purchaseOrder/${confirmDeleteId}`);
      alert("Xóa phiếu đặt hàng thành công!");
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa phiếu!");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleResendEmail = async (order) => {
    try {
      await axios.post(`https://panddretailshop.onrender.com/api/purchaseOrder/${order._id}/resend-email`);
      alert("Gửi lại email thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi gửi lại email!");
    }
  };

  const getFilteredAndSortedOrders = () => {
    return orders
      .filter(order => {
        const matchesSearch = (
          order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.createdByName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        // Lọc theo ngày giao dự kiến
        const orderDate = new Date(order.expectedDeliveryDate);
        const matchesDate =
          (!expectedStartDate || orderDate >= new Date(expectedStartDate.setHours(0,0,0,0))) &&
          (!expectedEndDate || orderDate <= new Date(expectedEndDate.setHours(23,59,59,999)));
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const modifier = sortOrder === "asc" ? 1 : -1;
        switch (sortBy) {
          case "orderDate":
            return (new Date(a.orderDate) - new Date(b.orderDate)) * modifier;
          case "expectedDeliveryDate":
            return (new Date(a.expectedDeliveryDate) - new Date(b.expectedDeliveryDate)) * modifier;
          case "status":
            return a.status.localeCompare(b.status) * modifier;
          default:
            return 0;
        }
      });
  };

  const handleSort = (column) => {
    setSortBy(prev => column === prev ? prev : column);
    setSortOrder(prev => column === sortBy ? (prev === "asc" ? "desc" : "asc") : "asc");
  };

  const formatPrice = (value) => {
    if (value === undefined || value === null || value === 0) return "";
    return value.toLocaleString("vi-VN") + " đ";
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "success";
      case "đã gửi NCC": return "warning";
      case "đã hủy": return "error";
      case "hoàn thành": return "success";
      default: return "default";
    }
  };
  
  const getStatusText = (status) => {
    return STATUSES.find(s => s.value === status)?.label || status;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
    <Box sx={{ 
      maxWidth: 1400, 
      mx: "auto", 
      height: 'calc(100vh - 64px)', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      p: 2
    }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <StyledTabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="purchase order tabs"
        >
          <StyledTab 
            icon={<NoteAddIcon />} 
            iconPosition="start" 
            label="Tạo phiếu đặt hàng" 
          />
          <StyledTab 
            icon={<ListAltIcon />} 
            iconPosition="start" 
            label="Danh sách phiếu đặt hàng" 
          />
        </StyledTabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
        {/* Tab 1: Create Purchase Order */}
        {tabValue === 0 && (
          <Box sx={{ pb: 2 }}>
            <Typography variant="h5" mb={3} fontWeight="600" color="primary.main">
              Tạo phiếu đặt hàng
            </Typography>
            
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 4, height: 20, bgcolor: 'primary.main', borderRadius: 1 }} />
                Thông tin nhà cung cấp
              </Typography>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option) => option.name || ""}
                value={suppliers.find(sup => sup._id === selectedSupplier) || null}
                onChange={(event, newValue) => {
                  setSelectedSupplier(newValue ? newValue._id : "");
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Chọn nhà cung cấp" 
                    variant="outlined"
                    size="medium"
                  />
                )}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Paper>

            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Box sx={{ width: 4, height: 20, bgcolor: 'primary.main', borderRadius: 1 }} />
                Thông tin sản phẩm
              </Typography>
              <Grid container spacing={2} alignItems="end">
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={products}
                    getOptionLabel={(option) => `${option.name} - (${option.units[0]?.name || "N/A"})`}
                    value={products.find(p => p._id === selectedProduct) || null}
                    onChange={(event, newValue) => {
                      setSelectedProduct(newValue ? newValue._id : "");
                      // Reset supplier when product changes
                      if (!newValue) {
                        setSelectedSupplier("");
                      }
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Sản phẩm" size="medium" />
                    )}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    label="Số lượng"
                    type="number"
                    fullWidth
                    size="medium"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="medium">
                    <InputLabel>Đơn vị</InputLabel>
                    <Select
                      value={unit}
                      label="Đơn vị"
                      onChange={(e) => setUnit(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      {products.find(p => p._id === selectedProduct)?.units.map(u => (
                        <MenuItem key={u.name} value={u.name}>{u.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={3} md={2}>
                  <Button
                    variant="contained"
                    onClick={handleAddItem}
                    fullWidth
                    size="large"
                    startIcon={<AddIcon />}
                    sx={{ 
                      height: 56,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Thêm
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Box sx={{ width: 4, height: 20, bgcolor: 'primary.main', borderRadius: 1 }} />
                Thông tin giao hàng
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="Địa chỉ giao hàng"
                    fullWidth
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Ghi chú"
                    fullWidth
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Ngày giao hàng dự kiến"
                    type="date"
                    fullWidth
                    value={expectedDeliveryDate}
                    onChange={handleDeliveryDateChange}
                    InputLabelProps={{ shrink: true }}
                    error={!!deliveryDateError}
                    helperText={deliveryDateError}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Phương thức thanh toán"
                    fullWidth
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái phiếu</InputLabel>
                    <Select
                      value={orderStatus}
                      label="Trạng thái phiếu"
                      onChange={(e) => setOrderStatus(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      {STATUSES.map(status => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {orderItems.length > 0 && !showPreview && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 4, height: 20, bgcolor: 'primary.main', borderRadius: 1 }} />
                    Danh sách sản phẩm đã chọn ({orderItems.length} sản phẩm)
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={handlePreviewOrder}
                    startIcon={<VisibilityIcon />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Xem trước phiếu
                  </Button>
                </Box>
                
                <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, width: 60 }}>STT</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Tên sản phẩm</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 120 }}>Đơn vị</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 140 }}>Số lượng</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 100, textAlign: 'center' }}>Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{index + 1}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <Chip label={item.unit} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                setOrderItems(prev => 
                                  prev.map((prevItem, idx) => 
                                    idx === index 
                                      ? { 
                                          ...prevItem, 
                                          quantity: newQuantity,
                                        } 
                                      : prevItem
                                  )
                                );
                              }}
                              InputProps={{ inputProps: { min: 1 } }}
                              sx={{ 
                                '& .MuiOutlinedInput-root': { borderRadius: 1 },
                                width: 100
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton 
                              onClick={() => handleRemoveItem(item.product)}
                              color="error"
                              size="small"
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: 'error.lighter',
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ 
                  mt: 3, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2
                }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Gửi email cho nhà cung cấp"
                  />

                  <Button 
                    variant="contained" 
                    onClick={handleSubmit} 
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                    size="large"
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4
                    }}
                  >
                    {loading ? "Đang tạo phiếu..." : "Tạo phiếu đặt hàng"}
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* Tab 2: Purchase Order List */}
        {tabValue === 1 && (
          <Box sx={{ pb: 2 }}>
            <Typography variant="h5" mb={3} fontWeight="600" color="primary.main">
              Danh sách phiếu đặt hàng
            </Typography>
            
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Tìm kiếm phiếu đặt hàng"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Lọc theo trạng thái</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Lọc theo trạng thái"
                      onChange={(e) => setStatusFilter(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      {STATUSES.map(status => (
                        <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <DatePicker
                      label="Từ ngày dự kiến"
                      value={expectedStartDate}
                      onChange={setExpectedStartDate}
                      format="dd/MM/yyyy"
                      slotProps={{ 
                        textField: { 
                          fullWidth: true, 
                          size: "medium",
                          sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                        } 
                      }}
                      maxDate={expectedEndDate}
                    />
                    <DatePicker
                      label="Đến ngày dự kiến"
                      value={expectedEndDate}
                      onChange={setExpectedEndDate}
                      format="dd/MM/yyyy"
                      slotProps={{ 
                        textField: { 
                          fullWidth: true, 
                          size: "medium",
                          sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                        } 
                      }}
                      minDate={expectedStartDate}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ 
                        maxWidth: 90, 
                        width: 90, 
                        minWidth: 60,
                        fontWeight: 600,
                        color: 'white'
                      }}>
                        <TableSortLabel
                          active={sortBy === "_id"}
                          direction={sortOrder}
                          onClick={() => handleSort("_id")}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Mã phiếu
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'white' }}>
                        <TableSortLabel
                          active={sortBy === "supplier"}
                          direction={sortOrder}
                          onClick={() => handleSort("supplier")}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Nhà cung cấp
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'white' }}>
                        <TableSortLabel
                          active={sortBy === "orderDate"}
                          direction={sortOrder}
                          onClick={() => handleSort("orderDate")}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Ngày đặt hàng
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'white' }}>
                        <TableSortLabel
                          active={sortBy === "createdByName"}
                          direction={sortOrder}
                          onClick={() => handleSort("createdByName")}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Người lập đơn
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'white' }}>
                        <TableSortLabel
                          active={sortBy === "expectedDeliveryDate"}
                          direction={sortOrder}
                          onClick={() => handleSort("expectedDeliveryDate")}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Ngày giao dự kiến
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'white' }}>
                        <TableSortLabel
                          active={sortBy === "status"}
                          direction={sortOrder}
                          onClick={() => handleSort("status")}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Trạng thái
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>
                        Hành động
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredAndSortedOrders().map((order, index) => (
                      <TableRow 
                        key={order._id}
                        hover
                        sx={{ 
                          '&:nth-of-type(even)': { bgcolor: 'grey.50' },
                          '&:hover': { bgcolor: 'primary.lighter' }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{order._id}</TableCell>
                        <TableCell>{order.supplier.name}</TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell>{order.createdByName || "Không xác định"}</TableCell>
                        <TableCell>{new Date(order.expectedDeliveryDate).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(order.status)}
                            color={getStatusColor(order.status)}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {["hoàn thành", "completed", "đã hủy"].includes(order.status) ? (
                              <IconButton 
                                onClick={() => handleEdit(order)}
                                color="primary"
                                size="small"
                                sx={{ '&:hover': { transform: 'scale(1.1)' } }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            ) : (
                              <>
                                <IconButton 
                                  onClick={() => handleEdit(order)}
                                  color="primary"
                                  size="small"
                                  sx={{ '&:hover': { transform: 'scale(1.1)' } }}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton 
                                  onClick={() => handleDelete(order._id)}
                                  color="error"
                                  size="small"
                                  sx={{ '&:hover': { transform: 'scale(1.1)' } }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                                <Button 
                                  onClick={() => handleResendEmail(order)}
                                  size="small"
                                  variant="outlined"
                                  sx={{ 
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    borderRadius: 1
                                  }}
                                >
                                  Gửi lại Email
                                </Button>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Confirm Delete Dialog */}
            <Dialog
              open={!!confirmDeleteId}
              onClose={() => setConfirmDeleteId(null)}
              PaperProps={{ sx: { borderRadius: 2 } }}
            >
              <DialogTitle sx={{ fontWeight: 600 }}>Xác nhận xóa phiếu đặt hàng</DialogTitle>
              <DialogContent>
                <Typography>Bạn có chắc chắn muốn xóa phiếu đặt hàng này không?</Typography>
              </DialogContent>
              <DialogActions sx={{ p: 3, gap: 1 }}>
                <Button 
                  onClick={() => setConfirmDeleteId(null)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Hủy
                </Button>
                <Button 
                  onClick={confirmDelete} 
                  color="error" 
                  variant="contained"
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Xóa
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {/* Preview Dialog */}
        <Dialog
          open={showPreview}
          onClose={() => setShowPreview(false)}
          fullWidth
          maxWidth="md"
          scroll="paper"
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white' }}>
            Xem trước phiếu đặt hàng
          </DialogTitle>
          <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto', p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Thông tin chung
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Nhà cung cấp:</strong> {suppliers.find(s => s._id === selectedSupplier)?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Ngày đặt hàng:</strong> {new Date().toLocaleDateString('vi-VN')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Ngày giao hàng dự kiến:</strong> {new Date(expectedDeliveryDate).toLocaleDateString('vi-VN')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Phương thức thanh toán:</strong> {paymentMethod || "Chưa có"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      <strong>Địa chỉ giao hàng:</strong> {deliveryAddress || "Chưa có"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      <strong>Ghi chú:</strong> {notes || "Không có"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <strong>Trạng thái:</strong>
                      <Chip
                        label={getStatusText(orderStatus)}
                        color={getStatusColor(orderStatus)}
                        size="small"
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Người lập đơn:</strong> {localStorage.getItem("fullName") || "Không xác định"}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Danh sách sản phẩm
                </Typography>
                <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Tên sản phẩm</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Đơn vị</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Số lượng</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <Chip label={item.unit} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                setOrderItems(prev => 
                                  prev.map((prevItem, idx) => 
                                    idx === index 
                                      ? { 
                                          ...prevItem, 
                                          quantity: newQuantity,
                                        } 
                                      : prevItem
                                  )
                                );
                              }}
                              InputProps={{ inputProps: { min: 1 } }}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton 
                              color="error" 
                              onClick={() => handleRemoveItem(item.product)}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                  }
                  label="Gửi email cho nhà cung cấp"
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setShowPreview(false)}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Quay lại chỉnh sửa
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSubmit}
              sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
            >
              Xác nhận tạo phiếu
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
          fullWidth 
          maxWidth="md" 
          scroll="paper"
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white' }}>
            {editOrder?.isReadOnly ? 'Xem chi tiết phiếu đặt hàng' : 'Chỉnh sửa phiếu đặt hàng'}
          </DialogTitle>
          <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto', p: 3 }}>
            {editOrder && (
              <Stack spacing={3} mt={2}>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.name || ""}
                  value={suppliers.find(sup => sup._id === (editOrder.supplier?._id || "")) || null}
                  onChange={(event, newValue) => {
                    setEditOrder({ 
                      ...editOrder, 
                      supplier: { ...editOrder.supplier, _id: newValue ? newValue._id : "" }
                    });
                  }}
                  disabled={editOrder.isReadOnly}
                  renderInput={(params) => (
                    <TextField {...params} label="Nhà cung cấp" />
                  )}
                />

                <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Tên sản phẩm</TableCell>
                        <TableCell sx={{ width: '150px', fontWeight: 600 }}>Đơn vị</TableCell>
                        <TableCell sx={{ width: '100px', fontWeight: 600 }}>Số lượng</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editOrderItems.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell>
                            <Autocomplete
                              options={UNITS}
                              value={item.unit}
                              onChange={(event, newValue) => 
                                handleEditOrderItemChange(index, "unit", newValue)
                              }
                              disabled={editOrder.isReadOnly}
                              renderInput={(params) => (
                                <TextField {...params} label="Đơn vị" size="small" />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) => 
                                handleEditOrderItemChange(index, "quantity", Number(e.target.value))
                              }
                              disabled={editOrder.isReadOnly}
                              size="small"
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TextField
                  label="Ngày giao hàng dự kiến"
                  type="date"
                  value={editOrder.expectedDeliveryDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setEditOrder({ ...editOrder, expectedDeliveryDate: newDate });
                  }}
                  disabled={editOrder.isReadOnly}
                  fullWidth
                />

                <TextField
                  label="Địa chỉ giao hàng"
                  value={editOrder.deliveryAddress}
                  onChange={(e) => setEditOrder({ ...editOrder, deliveryAddress: e.target.value })}
                  disabled={editOrder.isReadOnly}
                  fullWidth
                />

                <TextField
                  label="Phương thức thanh toán"
                  value={editOrder.paymentMethod}
                  onChange={(e) => setEditOrder({ ...editOrder, paymentMethod: e.target.value })}
                  disabled={editOrder.isReadOnly}
                  fullWidth
                />

                <TextField
                  label="Ghi chú"
                  multiline
                  rows={4}
                  value={editOrder.notes}
                  onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })}
                  disabled={editOrder.isReadOnly}
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={editOrder.status}
                    label="Trạng thái"
                    onChange={(e) => setEditOrder({ ...editOrder, status: e.target.value })}
                    disabled={editOrder.isReadOnly}
                  >
                    {STATUSES.map(status => (
                      <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Ngày lập đơn"
                      value={new Date(editOrder.orderDate).toLocaleDateString('vi-VN')}
                      InputProps={{ readOnly: true }}
                      fullWidth
                    />
                  </Grid>
                  {editOrder.status === "approved" && (
                    <Grid item xs={6}>
                      <TextField
                        label="Ngày duyệt đơn"
                        value={editOrder.approvalDate ? new Date(editOrder.approvalDate).toLocaleDateString('vi-VN') : "Chưa duyệt"}
                        InputProps={{ readOnly: true }}
                        fullWidth
                      />
                    </Grid>
                  )}
                </Grid>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Đóng
            </Button>
            {!editOrder?.isReadOnly && (
              <Button 
                onClick={handleUpdateOrder} 
                variant="contained"
                sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
              >
                Cập nhật
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
    </LocalizationProvider>
  );
};

export default PurchaseOrderManagement;