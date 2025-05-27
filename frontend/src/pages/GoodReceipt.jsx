// frontend/src/components/CreateGoodReceipt.js
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
  Paper,
  Stack,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from "axios";
import { format } from 'date-fns';

const CreateGoodReceipt = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [batchInfo, setBatchInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [createdBatches, setCreatedBatches] = useState([]);
  const [error, setError] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [additionalItems, setAdditionalItems] = useState([]);
  // New state for tracking created receipt
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [receiptDetailsLoading, setReceiptDetailsLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const token = localStorage.getItem("authToken");

  // Utility functions for default dates
  const getFirstDayOfCurrentYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const getFirstDayOfNextYear = () => {
    const now = new Date();
    return `${now.getFullYear() + 1}-01-01`;
  };

  const isTokenValid = () => {
    if (!token) {
      alert("Vui lòng đăng nhập để tiếp tục.");
      return false;
    }
    return true;
  };

  const fetchOrders = async () => {
    if (!isTokenValid()) return;
    try {
      const purchaseOrdersRes = await axios.get("https://panddretailshop.onrender.com/api/purchaseOrder", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const purchaseOrders = purchaseOrdersRes.data;
      const filteredOrders = purchaseOrders.filter(
        (o) => o.status === "đã gửi NCC" || o.status === "đã nhận 1 phần"
      );

      setOrders(filteredOrders);
      console.log("Filtered purchase orders:", filteredOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchSupplierProducts = async (supplierId) => {
    if (!isTokenValid() || !supplierId) return;
    
    try {
      // First get all products
      const allProductsResponse = await axios.get("https://panddretailshop.onrender.com/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Get supplier details to get the list of products they supply
      const supplierResponse = await axios.get(`https://panddretailshop.onrender.com/api/suppliers/${supplierId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Filter products to only include those supplied by this supplier
      if (supplierResponse.data && supplierResponse.data.suppliedProducts) {
        const suppliedProductIds = supplierResponse.data.suppliedProducts.map(
          item => item.product
        );
        
        // Filter active products supplied by this supplier
        const filteredProducts = allProductsResponse.data.data.filter(product => 
          product.active !== false && 
          suppliedProductIds.includes(product._id)
        );
        
        setSupplierProducts(filteredProducts);
        console.log(`Found ${filteredProducts.length} products from supplier ${supplierResponse.data.name}`);
      } else {
        // If no suppliedProducts or unable to filter, use the direct API endpoint as fallback
        const response = await axios.get(`https://panddretailshop.onrender.com/api/products/supplier/${supplierId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSupplierProducts(response.data);
      }
    } catch (error) {
      console.error("Error fetching supplier products:", error);
      // Fallback to direct API call if the filtering approach fails
      try {
        const response = await axios.get(`https://panddretailshop.onrender.com/api/products/supplier/${supplierId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSupplierProducts(response.data);
      } catch (fallbackError) {
        console.error("Fallback request also failed:", fallbackError);
        setSupplierProducts([]);
      }
    }
  };

  const handleSelectOrder = async (orderId) => {
    if (!isTokenValid()) return;
    console.log("Đã chọn order ID:", orderId);
    try {
      const res = await axios.get(
        `https://panddretailshop.onrender.com/api/purchaseorder/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Chi tiết phiếu đặt hàng:", res.data);

      // Tính lại tổng giá trị từ các item trong res.data
      const itemsTotal = Array.isArray(res.data.items)
        ? res.data.items.reduce(
            (sum, item) =>
              sum +
              (Number(item.unitPrice || 0) *
                (Number(item.quantity || 0) - Number(item.receivedQuantity || 0))),
            0
          )
        : 0;

      setSelectedOrder({
        ...res.data,
        totalAmount: itemsTotal,
      });

      setAdditionalItems([]);

      if (res.data.supplier && res.data.supplier._id) {
        fetchSupplierProducts(res.data.supplier._id);
      }

      // Set default manufacture_day and expiry_day
      const defaultManufactureDay = getFirstDayOfCurrentYear();
      const defaultExpiryDay = getFirstDayOfNextYear();

      setBatchInfo(
        res.data.items.map((item) => ({
          product: item.product?._id || item.product,
          productName: item.product?.name || item.productName,
          quantity: (item.quantity - item.receivedQuantity), // default: số lượng nhập = số lượng đặt còn lại
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: (item.quantity - item.receivedQuantity) * item.unitPrice,
          manufacture_day: defaultManufactureDay,
          expiry_day: defaultExpiryDay,
        }))
      );
      console.log("Initial batchInfo:", batchInfo);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết phiếu đặt hàng:", error);
      alert("Không thể lấy thông tin chi tiết phiếu đặt hàng. Vui lòng thử lại!");
    }
  };

  const handleBatchChange = (index, field, value) => {
    const updated = [...batchInfo];
    if (field === "quantity") {
      const inputQuantity = Math.max(0, Math.min(Number(value))); 
      updated[index][field] = inputQuantity;
      // Also update quantity_unit with the same value
      updated[index].quantity_unit = inputQuantity;
      // Update totalPrice when quantity changes
      updated[index].totalPrice = inputQuantity * updated[index].unitPrice;
    } else if (field === "unitPrice") {
      updated[index][field] = Number(value);
      // Update totalPrice when unitPrice changes
      updated[index].totalPrice = updated[index].quantity * Number(value);
    } else {
      updated[index][field] = value;
    }
    setBatchInfo(updated);
  };

  const addItem = () => {
    if (supplierProducts.length === 0) {
      alert("Không có sản phẩm từ nhà cung cấp này hoặc nhà cung cấp chưa được chọn");
      return;
    }
    
    setAdditionalItems([
      ...additionalItems,
      {
        product: "",
        productName: "",
        quantity: 1,
        unit: "",
        unitPrice: 0,
        totalPrice: 0,
        manufacture_day: getFirstDayOfCurrentYear(),
        expiry_day: getFirstDayOfNextYear(),
      },
    ]);
  };

  const removeItem = (index) => {
    const updatedItems = [...additionalItems];
    updatedItems.splice(index, 1);
    setAdditionalItems(updatedItems);
  };

  const handleAdditionalItemChange = (index, field, value) => {
    const updatedItems = [...additionalItems];
    updatedItems[index][field] = value;

    if (field === "product") {
      const selectedProduct = supplierProducts.find(p => p._id === value);
      if (selectedProduct) {
        updatedItems[index].productName = selectedProduct.name;
        updatedItems[index].unit = selectedProduct.unit;
        if (selectedProduct.price) {
          updatedItems[index].unitPrice = selectedProduct.price;
        }
      }
    }

    if (field === "quantity" || field === "unit") {
      const selectedUnit = supplierProducts.find(p => p._id === updatedItems[index].product)?.units?.find(
        (u) => u.name === updatedItems[index].unit
      );
      const ratio = selectedUnit?.ratio || 1;
      updatedItems[index].calculatedQuantity = Number(updatedItems[index].quantity) * ratio;
    }

    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].totalPrice = 
        Number(updatedItems[index].quantity) * Number(updatedItems[index].unitPrice);
    }

    setAdditionalItems(updatedItems);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const handleSubmit = async () => {
    console.log("Hàm handleSubmit được gọi");

    if (!isTokenValid() || !selectedOrder) {
      alert("Vui lòng chọn phiếu đặt mua trước khi tạo phiếu nhập kho!");
      return;
    }

    if (loading || confirming) {
      return;
    }

    const isDataComplete = batchInfo.every(
      (item) =>
        item.product &&
        item.quantity > 0 &&
        item.manufacture_day &&
        item.expiry_day
    );

    const isAdditionalDataComplete = additionalItems.length === 0 || additionalItems.every(
      (item) =>
        item.product &&
        item.quantity > 0 &&
        item.unitPrice > 0 &&
        item.manufacture_day &&
        item.expiry_day
    );

    if (!isDataComplete || !isAdditionalDataComplete) {
      alert(
        "Vui lòng nhập đầy đủ thông tin cho tất cả sản phẩm (số lượng, ngày sản xuất, hạn sử dụng)!"
      );
      return;
    }

    const hasValidDates = batchInfo.every((item) => {
      const mfgDate = new Date(item.manufacture_day);
      const expDate = new Date(item.expiry_day);
      return expDate > mfgDate;
    }) && additionalItems.every((item) => {
      const mfgDate = new Date(item.manufacture_day);
      const expDate = new Date(item.expiry_day);
      return expDate > mfgDate;
    });

    if (!hasValidDates) {
      alert("Ngày hết hạn phải sau ngày sản xuất cho tất cả sản phẩm!");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userID = localStorage.getItem("userID");
      if (!userID) {
        alert("Không thể xác định người dùng, vui lòng đăng nhập lại");
        setLoading(false);
        return;
      }

      const allItems = [
        ...batchInfo.map(item => {
          const selectedUnit = selectedOrder.items.find(
            (orderItem) => orderItem.product?._id === item.product
          )?.product?.units?.find((u) => u.name === item.unit);
          const ratio = selectedUnit?.ratio || 1;

          return {
            productId: item.product,
            quantity: Number(item.quantity) * ratio, // quantity theo ratio
            unit: item.unit, // Unit name
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * Number(item.quantity),
            manufactureDate: item.manufacture_day,
            expiryDate: item.expiry_day,
            productName: item.productName,
            quantity_unit: Number(item.quantity), // Set quantity_unit as same as quantity (actual input)
          };
        }),
        ...additionalItems.map(item => {
          const selectedUnit = supplierProducts.find(
            (product) => product._id === item.product
          )?.units?.find((u) => u.name === item.unit);
          const ratio = selectedUnit?.ratio || 1;

          return {
            productId: item.product,
            quantity: Number(item.quantity) * ratio, // quantity theo ratio
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.unitPrice) * Number(item.quantity),
            manufactureDate: item.manufacture_day,
            expiryDate: item.expiry_day,
            productName: item.productName,
            quantity_unit: Number(item.quantity), // Set quantity_unit as same as quantity
          };
        })
      ];

      const additionalTotal = additionalItems.reduce((sum, item) => 
        sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      const totalAmount = selectedOrder.totalAmount + additionalTotal;

      const requestData = {
        purchaseOrderId: selectedOrder._id,
        supplierId: selectedOrder.supplier?._id || selectedOrder.supplierId,
        receivedBy: userID,
        totalAmount: totalAmount,
        items: allItems
      };

      console.log("Dữ liệu gửi đi:", JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        "https://panddretailshop.onrender.com/api/goodreceipt/from-po",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Response tạo phiếu nhập kho:", response.data);
      
      // Store created receipt ID
      const createdReceiptId = response.data._id;

      setConfirming(true);
      const confirmResponse = await axios.patch(
        `https://panddretailshop.onrender.com/api/goodreceipt/confirm/${response.data._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Response confirm:", confirmResponse.data);

      if (confirmResponse.data.batches && confirmResponse.data.batches.length > 0) {
        setCreatedBatches(confirmResponse.data.batches);
      }

      alert("Tạo phiếu nhập kho và nhập hàng vào kho thành công!");
      
      // Fetch and display the created receipt
      fetchReceiptDetails(createdReceiptId);
      
      // Reset form
      setSelectedOrder(null);
      setBatchInfo([]);
      setAdditionalItems([]);
      fetchOrders();

    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error);
      let errorMessage = "Tạo phiếu thất bại";
      if (error.response) {
        console.log("Dữ liệu lỗi:", error.response.data);
        errorMessage += `: ${error.response.status} - ${
          error.response.data.message || JSON.stringify(error.response.data)
        }`;
      } else if (error.request) {
        errorMessage += ": Không nhận được phản hồi từ server";
      } else {
        errorMessage += `: ${error.message}`;
      }

      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  // Tính tổng giá trị thực tế theo batchInfo và additionalItems
  const getTotalAmount = () => {
    const batchTotal = batchInfo.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)),
      0
    );
    const additionalTotal = additionalItems.reduce(
      (sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)),
      0
    );
    return batchTotal + additionalTotal;
  };

  // Function to fetch receipt details by ID
  const fetchReceiptDetails = async (receiptId) => {
    if (!isTokenValid() || !receiptId) return;
    
    try {
      setReceiptDetailsLoading(true);
      const response = await axios.get(
        `https://panddretailshop.onrender.com/api/goodreceipt/${receiptId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setCreatedReceipt(response.data);
      setShowReceiptDetails(true);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết phiếu nhập kho:", error);
      alert("Không thể lấy thông tin chi tiết phiếu nhập kho. Vui lòng thử lại!");
    } finally {
      setReceiptDetailsLoading(false);
    }
  };

  // Receipt Details Dialog
  const ReceiptDetailsDialog = () => (
    <Dialog
      open={showReceiptDetails}
      onClose={() => setShowReceiptDetails(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Chi tiết phiếu nhập kho {createdReceipt?.receiptNumber || createdReceipt?._id}
      </DialogTitle>
      <DialogContent dividers>
        {receiptDetailsLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : createdReceipt ? (
          <Box>
            <Typography variant="h6" mt={3} mb={1}>Danh sách sản phẩm</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>Số lượng</TableCell>
                    <TableCell>Đơn vị</TableCell>
                    <TableCell>Đơn giá</TableCell>
                    <TableCell>Thành tiền</TableCell>
                    <TableCell>Ngày SX</TableCell>
                    <TableCell>Hạn SD</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {createdReceipt.items && createdReceipt.items.map((item, index) => (
                    <TableRow key={`item-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.product?.name || "Không xác định"}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit || "Đơn vị"}</TableCell>
                      <TableCell>
                        {(item.price || 0).toLocaleString()} đ
                      </TableCell>
                      <TableCell>
                        {(item.totalPrice || (item.price * item.quantity) || 0).toLocaleString()} đ
                      </TableCell>
                      <TableCell>{formatDate(item.manufactureDate)}</TableCell>
                      <TableCell>{formatDate(item.expiryDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Typography variant="h6">
                Tổng giá trị: {(createdReceipt.totalAmount || 0).toLocaleString()} đ
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary">
            Không có thông tin phiếu nhập kho để hiển thị
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowReceiptDetails(false)}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box
      sx={{
        p: 3,
        height: "100vh",
        overflow: "auto",
        backgroundColor: "#f9f9f9",
      }}
    >
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Chuyển phiếu đặt mua thành phiếu nhập kho
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Chọn phiếu đặt mua</InputLabel>
        <Select
          value={selectedOrder?._id || ""}
          label="Chọn phiếu đặt mua"
          onChange={(e) => handleSelectOrder(e.target.value)}
        >
          {orders.map((order) => (
            <MenuItem key={order._id} value={order._id}>
              {order._id} - {order.supplier?.name || "Không rõ nhà cung cấp"}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedOrder && selectedOrder.items && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Danh sách sản phẩm
          </Typography>

          <Stack spacing={3}>
            {selectedOrder.items.map((item, index) => (
              <Paper
                key={item.product?._id || index}
                elevation={2}
                sx={{ p: 2, backgroundColor: "#fff" }}
              >
                <Box mb={2}>
                  <Typography fontWeight="bold" variant="h6">
                    {item.product?.name || item.productName || "Sản phẩm không xác định"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đơn vị: {item.unit || "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Số lượng đặt: {item.quantity || 0}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Số lượng nhập thực tế"
                      type="number"
                      fullWidth
                      value={batchInfo[index]?.quantity || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleBatchChange(index, "quantity", value);
                        // Also update quantity_unit with the same value since it's the actual input quantity
                        handleBatchChange(index, "quantity_unit", value);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Đơn giá"
                      type="number"
                      fullWidth
                      value={batchInfo[index]?.unitPrice || ""}
                      onChange={(e) => handleBatchChange(index, "unitPrice", e.target.value)}
                      InputProps={{
                        endAdornment: <span>đ</span>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Ngày sản xuất"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={batchInfo[index]?.manufacture_day || ""}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        handleBatchChange(index, "manufacture_day", newDate);
                        const current = batchInfo[index];
                        if (current.expiry_day && new Date(current.expiry_day) <= new Date(newDate)) {
                          const expDate = new Date(newDate);
                          expDate.setMonth(expDate.getMonth() + 6);
                          handleBatchChange(
                            index,  
                            "expiry_day",
                            expDate.toISOString().split('T')[0]
                          );
                        }
                      }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Hạn sử dụng"
                      type="date"
                      fullWidth
                      error={
                        batchInfo[index]?.manufacture_day &&
                        batchInfo[index]?.expiry_day &&
                        new Date(batchInfo[index].expiry_day) <= new Date(batchInfo[index].manufacture_day)
                      }
                      InputLabelProps={{ shrink: true }}
                      value={batchInfo[index]?.expiry_day || ""}
                      onChange={(e) =>
                        handleBatchChange(index, "expiry_day", e.target.value)
                      }
                      required
                      helperText={
                        batchInfo[index]?.manufacture_day &&
                        batchInfo[index]?.expiry_day &&
                        new Date(batchInfo[index].expiry_day) <= new Date(batchInfo[index].manufacture_day)
                          ? "Hạn sử dụng phải sau ngày sản xuất"
                          : ""
                      }
                    />
                  </Grid>
                </Grid>
                
                {/* Add total price display for each item */}
                <Box mt={1} display="flex" justifyContent="flex-end">
                  <Typography variant="body2" color="primary" fontWeight="bold">
                    Thành tiền: {((batchInfo[index]?.quantity || 0) * (batchInfo[index]?.unitPrice || 0)).toLocaleString()} đ
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Stack>

          <Box mt={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Thêm sản phẩm khác
                </Typography>
                {selectedOrder?.supplier && (
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Nhà cung cấp: <strong>{selectedOrder.supplier.name}</strong> 
                    {selectedOrder.supplier.email && ` (${selectedOrder.supplier.email})`}
                  </Typography>
                )}
                {supplierProducts.length > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    Có {supplierProducts.length} sản phẩm có thể thêm từ nhà cung cấp này
                  </Typography>
                ) : (
                  <Typography variant="caption" color="error">
                    Không có sản phẩm nào khác từ nhà cung cấp này
                  </Typography>
                )}
              </Box>
              <Button 
                variant="outlined" 
                startIcon={<AddCircleOutlineIcon />} 
                onClick={addItem}
                disabled={supplierProducts.length === 0}
              >
                Thêm sản phẩm
              </Button>
            </Box>
            
            {additionalItems.length > 0 && (
              <Stack spacing={3} mt={2}>
                {additionalItems.map((item, index) => (
                  <Paper
                    key={`additional-${index}`}
                    elevation={2}
                    sx={{ p: 2, backgroundColor: "#fff", borderLeft: '4px solid #2196f3' }}
                  >
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Sản phẩm bổ sung #{index + 1}
                      </Typography>
                      <IconButton 
                        color="error" 
                        onClick={() => removeItem(index)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Chọn sản phẩm</InputLabel>
                          <Select
                            value={item.product || ""}
                            label="Chọn sản phẩm"
                            onChange={(e) => handleAdditionalItemChange(index, "product", e.target.value)}
                          >
                            {supplierProducts.map((product) => (
                              <MenuItem key={product._id} value={product._id}>
                                {product.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          label="Số lượng"
                          type="number"
                          fullWidth
                          value={item.quantity || ""}
                          onChange={(e) => handleAdditionalItemChange(index, "quantity", e.target.value)}
                          inputProps={{ min: "1" }}
                          required
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <FormControl fullWidth>
                          <InputLabel>Đơn vị</InputLabel>
                          <Select
                            value={item.unit || ""}
                            label="Đơn vị"
                            onChange={(e) => handleAdditionalItemChange(index, "unit", e.target.value)}
                            disabled={!item.product}
                          >
                            {supplierProducts
                              .find((p) => p._id === item.product)?.units?.map((u) => (
                                <MenuItem key={u.name} value={u.name}>
                                  {u.name}
                                </MenuItem>
                              )) || []}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    
                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Đơn giá"
                          type="number"
                          fullWidth
                          value={item.unitPrice || ""}
                          onChange={(e) => handleAdditionalItemChange(index, "unitPrice", e.target.value)}
                          InputProps={{
                            endAdornment: <span>đ</span>,
                          }}
                          required
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Thành tiền"
                          type="number"
                          fullWidth
                          value={item.totalPrice || 0}
                          InputProps={{
                            readOnly: true,
                            endAdornment: <span>đ</span>,
                          }}
                        />
                      </Grid>
                    </Grid>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Ngày sản xuất"
                          type="date"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={item.manufacture_day || ""}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            handleAdditionalItemChange(index, "manufacture_day", newDate);
                            
                            const current = additionalItems[index];
                            if (current.expiry_day && new Date(current.expiry_day) <= new Date(newDate)) {
                              const expDate = new Date(newDate);
                              expDate.setMonth(expDate.getMonth() + 6);
                              handleAdditionalItemChange(
                                index,
                                "expiry_day",
                                expDate.toISOString().split('T')[0]
                              );
                            }
                          }}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Hạn sử dụng"
                          type="date"
                          fullWidth
                          error={item.manufacture_day && item.expiry_day && 
                                new Date(item.expiry_day) <= new Date(item.manufacture_day)}
                          InputLabelProps={{ shrink: true }}
                          value={item.expiry_day || ""}
                          onChange={(e) => 
                            handleAdditionalItemChange(index, "expiry_day", e.target.value)
                          }
                          required
                          helperText={
                            item.manufacture_day && 
                            item.expiry_day && 
                            new Date(item.expiry_day) <= new Date(item.manufacture_day)
                              ? "Hạn sử dụng phải sau ngày sản xuất"
                              : ""
                          }
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
            <Typography variant="h6">
              Tổng giá trị: {getTotalAmount().toLocaleString()} đ
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading || confirming}
              size="large"
              startIcon={loading || confirming ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? "Đang tạo phiếu..." : confirming ? "Đang nhập kho..." : "Tạo phiếu và nhập kho"}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Receipt Details Dialog */}
      {createdReceipt && <ReceiptDetailsDialog />}

      {/* If you want to show a button to view latest receipt */}
      {!showReceiptDetails && createdReceipt && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<VisibilityIcon />}
          onClick={() => setShowReceiptDetails(true)}
          sx={{ mb: 2 }}
        >
          Xem phiếu nhập kho đã tạo
        </Button>
      )}
    </Box>
  );
};

export default CreateGoodReceipt;