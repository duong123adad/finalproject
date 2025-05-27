// frontend/src/components/CreateOrder.js
import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Divider,
  Autocomplete,
  FormHelperText,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import QRPayment from './QRPayment';

const CreateOrder = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState({});
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [token] = useState(localStorage.getItem("authToken"));
  const [hasUserSelectedBatch, setHasUserSelectedBatch] = useState(false);
  const [cashReceivedError, setCashReceivedError] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productsRes = await axios.get(
          "http://localhost:8000/api/products/batch/products-with-batches",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Lọc các sản phẩm có ít nhất một lô hàng với quantity_on_shelf > 0
        const productsWithStock = productsRes.data.data.filter((product) =>
          product.batches.some((batch) => batch.quantity_on_shelf > 0)
        );

        setProducts(productsWithStock);
        setFilteredProducts(productsWithStock);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);

      setLoadingCustomers(true);
      try {
        const customersRes = await axios.get(
          "http://localhost:8000/api/user?role=customer",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCustomers(customersRes.data);
      } catch (error) {
        console.error(error);
      }
      setLoadingCustomers(false);
    };
    fetchData();
  }, [token]);
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.startsWith("BATCH-")) {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/products/batch/${value}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const productWithStock = {
          ...res.data.data.product,
          warehouse: res.data.data.batch.remaining_quantity,
          shelf: res.data.data.batch.quantity_on_shelf,
          searchedBatch: res.data.data.batch,
        };
        setFilteredProducts([productWithStock]);
      } catch (error) {
        setFilteredProducts([]);
      }
    } else {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleProductClick = async (product) => {
    setLoading(true);
    try {
      let availableBatches = [];

      if (product.searchedBatch) {
        if (product.searchedBatch.quantity_on_shelf > 0) {
          availableBatches = [product.searchedBatch];
        }
      } else {
        const res = await axios.get(
          `http://localhost:8000/api/batches/product/${product.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        availableBatches = res.data.filter((b) => b.quantity_on_shelf > 0);
      }

      setBatches(availableBatches);
      setSelectedProduct(product);
      setSelectedBatches({});
      setSelectedUnit(product.units[0]);
      setHasUserSelectedBatch(false);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };
  const handleBatchQtyChange = (batchId, value) => {
    const batch = batches.find((b) => b._id === batchId);
    const maxQty = Math.floor(
      batch.quantity_on_shelf / (selectedUnit?.ratio || 1)
    );

    const newValue = Math.min(Math.max(1, parseInt(value || 1)), maxQty);
    setSelectedBatches((prev) => ({
      ...prev,
      [batchId]: newValue,
    }));
    setHasUserSelectedBatch(true);
  };

  const autoSelectBatches = () => {
    if (!selectedProduct || !selectedUnit) return [];

    const requiredBaseQty = 1 * selectedUnit.ratio;
    const goodBatches = batches
      .filter((b) => b.quantity_on_shelf >= requiredBaseQty)
      .sort((a, b) => new Date(a.expiry_day) - new Date(b.expiry_day));
    if (goodBatches.length > 0) {
      const bestBatch = goodBatches[0];
      const baseUnit = selectedProduct.units.find((u) => u.ratio === 1);
      const discount = bestBatch.discountInfo || {};
      const unitPriceBase = discount.isDiscounted
        ? baseUnit.salePrice * (1 - discount.discountValue / 100)
        : baseUnit.salePrice;

      const selectedBatchInfo = {
        ...bestBatch,
        _id: bestBatch._id,
        batchCode: bestBatch.batchCode,
        discountInfo: bestBatch.discountInfo,
        quantity: requiredBaseQty,
        unitPrice: unitPriceBase * selectedUnit.ratio,
        unitName: selectedUnit.name,
        discountRate: discount.isDiscounted ? discount.discountValue : 0,
      };
      return [selectedBatchInfo];
    }
    return [];
  };
  const handleAddToOrder = () => {
    if (!selectedProduct || !selectedUnit) return;

    let selected;
    if (!hasUserSelectedBatch) {
      selected = autoSelectBatches();
      if (selected.length === 0) {
        alert(
          `Không có lô phù hợp cho sản phẩm ${selectedProduct.name} (${selectedUnit.name})`
        );
        return;
      }
    } else {
      selected = batches
        .filter((b) => selectedBatches[b._id] > 0)
        .map((b) => {
          const baseUnit = selectedProduct.units.find((u) => u.ratio === 1);
          const discount = b.discountInfo || {};
          const unitPriceBase = discount.isDiscounted
            ? baseUnit.salePrice * (1 - discount.discountValue / 100)
            : baseUnit.salePrice;

          return {
            ...b,
            quantity: selectedBatches[b._id] * (selectedUnit?.ratio || 1),
            unitPrice: unitPriceBase * selectedUnit.ratio,
            unitName: selectedUnit.name,
            discountRate: discount.isDiscounted ? discount.discountValue : 0,
          };
        });
    }

    const updatedOrderItems = [...orderItems];

    selected.forEach((batch) => {
      // Tìm theo sản phẩm, đơn vị và mức giảm giá
      const existingItemIndex = updatedOrderItems.findIndex(
        (item) =>
          item.product.id === selectedProduct.id &&
          item.selectedUnit.name === selectedUnit.name &&
          item.discountRate === batch.discountRate
      );

      if (existingItemIndex !== -1) {
        // Nếu đã có item với cùng sản phẩm, đơn vị và mức giảm giá
        const existingItem = updatedOrderItems[existingItemIndex];
        const existingBatchIndex = existingItem.batches.findIndex((b) => b._id === batch._id);

        if (existingBatchIndex !== -1) {
          // Tăng số lượng nếu đã có batch này
          existingItem.batches[existingBatchIndex].quantity += batch.quantity;
        } else {
          // Thêm batch mới vào item hiện có
          existingItem.batches.push(batch);
        }

        // Cập nhật tổng
        existingItem.total = existingItem.batches.reduce(
          (sum, b) => sum + b.unitPrice * (b.quantity / existingItem.selectedUnit.ratio),
          0
        );
      } else {
        // Tạo item mới nếu chưa có sản phẩm + đơn vị + mức giảm giá này
        const newItem = {
          product: selectedProduct,
          selectedUnit,
          batches: [batch],
          total: batch.unitPrice * (batch.quantity / selectedUnit.ratio),
          discountRate: batch.discountRate,
        };
        updatedOrderItems.push(newItem);
      }
    });

    setOrderItems(updatedOrderItems);
    setSelectedProduct(null);
    setSelectedUnit(null);
    setSelectedBatches({});
    setHasUserSelectedBatch(false);
  };
  const handleRemoveItem = (index) => {
    setOrderItems((items) => items.filter((_, i) => i !== index));
  };
  const handleUpdateQuantity = (itemIndex, batchIndex, newValue) => {
    const updatedItems = [...orderItems];
    const item = updatedItems[itemIndex];
    const batch = item.batches[batchIndex];

    const maxQty = Math.floor(
      batch.quantity_on_shelf / item.selectedUnit.ratio
    );

    let newQty = parseInt(newValue || 1);
    if (isNaN(newQty)) newQty = 1;
    newQty = Math.max(1, Math.min(newQty, maxQty));

    batch.quantity = newQty * item.selectedUnit.ratio;
    item.total = item.batches.reduce(
      (sum, b) => sum + b.unitPrice * (b.quantity / item.selectedUnit.ratio),
      0
    );

    setOrderItems(updatedItems);
  };

  const handleSubmitOrder = async () => {
    // Đối với thanh toán online (momo), không cần kiểm tra tiền mặt
    if (paymentMethod === 'cash' || paymentMethod === 'card' || paymentMethod === 'transfer') {
      if (!cashReceived) {
        setCashReceivedError("Vui lòng nhập số tiền khách đưa.");
        return;
      }

      const paidAmount = parseFloat(cashReceived);
      if (isNaN(paidAmount) || paidAmount < 0) {
        setCashReceivedError("Số tiền không hợp lệ.");
        return;
      }

      if (paidAmount < subtotal) {
        setCashReceivedError("Số tiền khách đưa không đủ.");
        return;
      }
    }

    setCashReceivedError("");
    setSubmittingOrder(true);

    const orderData = {
      items: orderItems.map((item) => ({
        product: item.product.id,
        quantity:
          item.batches.reduce((sum, b) => sum + b.quantity, 0) /
          item.selectedUnit.ratio,
        selectedUnit: {
          name: item.selectedUnit.name,
          ratio: item.selectedUnit.ratio,
        },
        batchesUsed: item.batches.map((b) => ({
          batchId: b._id,
          quantity: b.quantity,
          unitPrice: b.unitPrice,
          discountRate: item.discountRate || 0,
        })),
      })),
      paymentMethod,
      amountPaid: paymentMethod === 'momo' ? subtotal : parseFloat(cashReceived),
      customerId: selectedCustomer?.id || null,
      orderType: "instore",
    };

    try {
      const res = await axios.post(
        "http://localhost:8000/api/orders",
        orderData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (paymentMethod === 'momo') {
        // Tạo object order với thông tin cần thiết cho QR Payment
        const orderWithPaymentInfo = {
          ...res.data,
          finalAmount: subtotal,
          orderNumber: res.data.orderNumber,
          _id: res.data._id
        };
        setCreatedOrder(orderWithPaymentInfo);
        setShowQRPayment(true);
      } else {
        alert(`Đơn hàng ${res.data.orderNumber} tạo thành công!`);
        setOrderItems([]);
        setCashReceived("");
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error(error);
      alert("Tạo đơn thất bại!");
    }
    setSubmittingOrder(false);
  };

  const handlePaymentSuccess = () => {
    alert(`Đơn hàng ${createdOrder.orderNumber} thanh toán thành công!`);
    setOrderItems([]);
    setCashReceived("");
    setSelectedCustomer(null);
    setShowQRPayment(false);
    setCreatedOrder(null);
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const change = cashReceived ? parseFloat(cashReceived) - subtotal : 0;

  return (
    <>
      <Container
        maxWidth="xl"
        sx={{
          mt: 2,
          height: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
          px: 1,
        }}
      >
        <Paper
          sx={{
            p: 2,
            mb: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Autocomplete
              sx={{ flex: 1 }}
              options={customers}
              getOptionLabel={(option) => `${option.fullName} (${option.phone})`}
              loading={loadingCustomers}
              value={selectedCustomer}
              onChange={(_, newValue) => setSelectedCustomer(newValue)}
              size="small"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Chọn khách hàng"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              sx={{ flex: 2 }}
              variant="outlined"
              label="Tìm kiếm sản phẩm hoặc mã lô"
              value={searchTerm}
              onChange={handleSearch}
              size="small"
              InputProps={{ endAdornment: <SearchIcon /> }}
            />
          </Box>

          <Grid container spacing={1} sx={{ flex: 1, overflow: "hidden" }}>
            <Grid item xs={5} sx={{ height: "100%", overflow: "hidden" }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Danh sách sản phẩm
              </Typography>
              <Box
                sx={{
                  height: "calc(100% - 32px)",
                  overflow: "auto",
                  pr: 0.5,
                }}
              >
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <Paper
                      key={product._id}
                      sx={{
                        p: 1.5,
                        mb: 0.5,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                      onClick={() => handleProductClick(product)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 0.5 }}>
                        {product.category?.name || product.category}
                        {product.warehouse !== undefined &&
                          ` | Kho: ${product.warehouse} | Quầy: ${product.shelf}`}
                      </Typography>
                      {product.units?.[0]?.salePrice && (
                        <Typography variant="caption" color="primary" sx={{ display: "block", fontWeight: 500 }}>
                          {product.units[0].salePrice.toLocaleString()}đ/
                          {product.units[0].name}
                        </Typography>
                      )}
                    </Paper>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}
                  >
                    Hiện không có sản phẩm nào còn hàng trên quầy.
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid
              item
              xs={7}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Đơn hàng ({orderItems.length} sản phẩm)
              </Typography>

              <Box
                sx={{
                  flex: 1,
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                {orderItems.map((item, itemIndex) => (
                  <Box
                    key={itemIndex}
                    sx={{
                      p: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                          {item.product.name}
                          {item.discountRate > 0 && (
                            <Typography
                              component="span"
                              variant="caption"
                              color="success.main"
                              sx={{ ml: 1, fontWeight: 600 }}
                            >
                              (-{item.discountRate}%)
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 0.5 }}>
                          Đơn vị: {item.selectedUnit.name}
                        </Typography>
                        {item.batches.map((batch, batchIndex) => {
                          const currentQty = batch.quantity / item.selectedUnit.ratio;
                          const maxQty = Math.floor(batch.quantity_on_shelf / item.selectedUnit.ratio);
                          const truncateString = (str, maxLength = 8) => {
                            return str.length > maxLength
                              ? str.substring(0, maxLength - 3) + "..."
                              : str;
                          };
                          return (
                            <Box
                              key={batch._id}
                              sx={{
                                mt: 0.5,
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              <Chip
                                label={`${truncateString(batch.batchCode)} - ${batch.unitPrice.toLocaleString()}đ`}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  height: 24,
                                  fontSize: "0.7rem",
                                  "& .MuiChip-label": { px: 1 }
                                }}
                              />
                              <TextField
                                type="number"
                                value={currentQty}
                                onChange={(e) =>
                                  handleUpdateQuantity(
                                    itemIndex,
                                    batchIndex,
                                    e.target.value
                                  )
                                }
                                inputProps={{
                                  min: 0,
                                  max: maxQty,
                                  style: {
                                    textAlign: "center",
                                    padding: "4px 6px",
                                    fontSize: "0.75rem",
                                  },
                                }}
                                sx={{
                                  width: 60,
                                  "& .MuiOutlinedInput-root": {
                                    height: 28,
                                  },
                                  "& input[type=number]": {
                                    MozAppearance: "textfield",
                                  },
                                  "& input[type=number]::-webkit-outer-spin-button": {
                                    WebkitAppearance: "none",
                                    margin: 0,
                                  },
                                  "& input[type=number]::-webkit-inner-spin-button": {
                                    WebkitAppearance: "none",
                                    margin: 0,
                                  },
                                }}
                                error={currentQty > maxQty || currentQty < 0}
                              />
                              <Typography variant="caption" color="textSecondary">
                                {item.selectedUnit.name}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80, textAlign: "right" }}>
                          {item.total.toLocaleString()}đ
                        </Typography>
                        <IconButton 
                          onClick={() => handleRemoveItem(itemIndex)}
                          size="small"
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                ))}
                {orderItems.length === 0 && (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <Typography variant="body2" color="textSecondary" sx={{ fontStyle: "italic" }}>
                      Chưa có sản phẩm nào trong đơn hàng
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              >
                <Grid container spacing={1}>
                  {paymentMethod !== 'momo' && (
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Tiền khách đưa"
                        value={cashReceived}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setCashReceived(value);
                          if (!value) {
                            setCashReceivedError(
                              "Vui lòng nhập số tiền khách đưa."
                            );
                          } else if (parseFloat(value) < subtotal) {
                            setCashReceivedError("Số tiền khách đưa không đủ.");
                          } else {
                            setCashReceivedError("");
                          }
                        }}
                        InputProps={{ endAdornment: "đ" }}
                        error={!!cashReceivedError}
                        helperText={cashReceivedError}
                        required
                        size="small"
                      />
                    </Grid>
                  )}
                  <Grid item xs={paymentMethod === 'momo' ? 12 : 6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Phương thức TT</InputLabel>
                      <Select
                        value={paymentMethod}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value);
                          if (e.target.value === 'momo') {
                            setCashReceived("");
                            setCashReceivedError("");
                          }
                        }}
                      >
                        <MenuItem value="cash">Tiền mặt</MenuItem>
                        <MenuItem value="momo">Chuyển khoản</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Tổng cộng:</Typography>
                      <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600 }}>
                        {subtotal.toLocaleString()}đ
                      </Typography>
                    </Box>
                    {paymentMethod !== 'momo' && cashReceived && !cashReceivedError && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2">Tiền thừa:</Typography>
                        <Typography
                          variant="body2"
                          color={change >= 0 ? "success.main" : "error"}
                          sx={{ fontWeight: 500 }}
                        >
                          {Math.abs(change).toLocaleString()}đ
                        </Typography>
                      </Box>
                    )}
                    {paymentMethod === 'momo' && (
                      <Box
                        sx={{
                          mb: 1,
                          p: 1,
                          bgcolor: 'info.light',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="info.contrastText">
                          Thanh toán qua MoMo: {subtotal.toLocaleString()}đ
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSubmitOrder}
                      disabled={
                        orderItems.length === 0 ||
                        (paymentMethod !== 'momo' && (!!cashReceivedError || !cashReceived)) ||
                        submittingOrder
                      }
                      startIcon={submittingOrder ? <CircularProgress size={18} /> : null}
                      sx={{ py: 1 }}
                    >
                      {submittingOrder 
                        ? "Đang tạo đơn..." 
                        : paymentMethod === 'momo'
                          ? `Tạo đơn & thanh toán (${orderItems.length})`
                          : `Tạo đơn hàng (${orderItems.length})`
                      }
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Dialog open={!!selectedProduct} fullWidth maxWidth="lg">
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">
                Chọn lô hàng - {selectedProduct?.name}
              </Typography>
              <FormControl sx={{ minWidth: 120 }} size="small">
                <InputLabel>Đơn vị</InputLabel>
                <Select
                  value={selectedUnit?.name || ""}
                  onChange={(e) => {
                    const unit = selectedProduct.units.find(
                      (u) => u.name === e.target.value
                    );
                    setSelectedUnit(unit);
                    setSelectedBatches({});
                    setHasUserSelectedBatch(false);
                  }}
                >
                  {selectedProduct?.units?.map((unit) => (
                    <MenuItem key={unit.name} value={unit.name}>
                      {unit.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            {batches.length === 0 ? (
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{
                  p: 2,
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                Hiện không có lô hàng nào trên quầy
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Mã lô</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>HSD</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Giá gốc</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Giảm giá</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Kho</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Quầy</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Số lượng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batches.map((batch) => {
                      const baseUnit = selectedProduct?.units?.find(
                        (u) => u.ratio === 1
                      );
                      const discount = batch.discountInfo || {};
                      const daysRemaining = batch.daysUntilExpiry || 0;

                      return (
                        <TableRow key={batch._id}>
                          <TableCell>
                            <Typography variant="body2">
                              {batch.batchCode}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {format(new Date(batch.expiry_day), "dd/MM/yyyy", {
                                locale: vi,
                              })}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ({daysRemaining} ngày)
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {(
                                (baseUnit?.salePrice || 0) *
                                (selectedUnit?.ratio || 1)
                              ).toLocaleString()}
                              đ
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: "success.main" }}>
                            {discount.isDiscounted && (
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {discount.discountValue}%
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {batch.remaining_quantity}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {batch.quantity_on_shelf}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={selectedBatches[batch._id] || 0}
                              onChange={(e) =>
                                handleBatchQtyChange(batch._id, e.target.value)
                              }
                              inputProps={{ min: 1 }}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions sx={{ pt: 1 }}>
            <Button onClick={() => setSelectedProduct(null)}>Hủy</Button>
            <Button
              variant="contained"
              onClick={handleAddToOrder}
              disabled={!selectedProduct || batches.length === 0}
            >
              Thêm vào đơn (
              {!hasUserSelectedBatch
                ? 1
                : Object.values(selectedBatches).reduce((a, b) => a + b, 0)}
              )
            </Button>
          </DialogActions>
        </Dialog>

        <QRPayment
          open={showQRPayment}
          onClose={() => setShowQRPayment(false)}
          order={createdOrder}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </Container>
    </>
  );
};

export default CreateOrder;
