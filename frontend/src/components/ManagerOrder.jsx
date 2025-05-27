import React, { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PrintIcon from "@mui/icons-material/Print";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import axios from "axios";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

function ManagerOrder() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const authToken = localStorage.getItem("authToken");
  const [filterTimeRange, setFilterTimeRange] = useState("day");
  const [filterDate, setFilterDate] = useState(new Date());
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [weekPickerDate, setWeekPickerDate] = useState(new Date());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [
    searchQuery,
    filterPaymentStatus,
    filterTimeRange,
    filterDate,
    filterStartDate,
    filterEndDate,
    authToken,
  ]);

  // Add helper function for consistent price calculation
  const calculateOrderTotal = (order) => {
    if (order.products && order.products.length > 0) {
      return order.products.reduce((sum, item) => {
        const originalPrice = (item.originalUnitPrice || 0) * (item.quantity || 0);
        // For list view, use discount from batchesUsed if available
        const discountPercent = item.batchesUsed?.[0]?.batchId?.discountInfo?.discountValue || 0;
        const discountAmount = (originalPrice * discountPercent) / 100;
        return sum + (originalPrice - discountAmount);
      }, 0);
    }
    return order.finalAmount || 0;
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("searchQuery", searchQuery);
      if (filterPaymentStatus)
        params.append("paymentStatus", filterPaymentStatus);

      if (filterTimeRange === "day" && filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.append("startDate", startOfDay.toISOString());
        params.append("endDate", endOfDay.toISOString());
      } else if (filterTimeRange === "week" && weekPickerDate) {
        const start = startOfWeek(weekPickerDate, { locale: vi });
        const end = endOfWeek(weekPickerDate, { locale: vi });
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        params.append("startDate", start.toISOString());
        params.append("endDate", end.toISOString());
      } else if (filterTimeRange === "month" && filterDate) {
        const start = startOfMonth(filterDate);
        const end = endOfMonth(filterDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        params.append("startDate", start.toISOString());
        params.append("endDate", end.toISOString());
      } else if (
        filterTimeRange === "custom" &&
        filterStartDate &&
        filterEndDate
      ) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        params.append("startDate", start.toISOString());
        params.append("endDate", end.toISOString());
      }

      const response = await axios.get(
        `http://localhost:8000/api/orders?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      setOrders(response.data);

      // Calculate revenue and invoice count
      let revenue = 0;
      const invoiceCount = response.data.length;
      
      response.data.forEach(order => {
        revenue += calculateOrderTotal(order);
      });

      setTotalRevenue(revenue);
      setTotalInvoices(invoiceCount);
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
      showSnackbar("Lỗi khi tải danh sách đơn hàng", "error");
    }
  };

  const handleSearchChange = (event) => setSearchQuery(event.target.value);
  const handleFilterPaymentStatusChange = (event) =>
    setFilterPaymentStatus(event.target.value);
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedOrder(null);
  };

  const handleFilterTimeRangeChange = (event) => {
    setFilterTimeRange(event.target.value);
    setFilterDate(null);
    setFilterStartDate(null);
    setFilterEndDate(null);
    setWeekPickerDate(new Date());
  };

  const handleWeekChange = (newDate) => setWeekPickerDate(newDate);
  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

  const renderSortIcon = (key) =>
    sortConfig.key === key
      ? sortConfig.direction === "asc"
        ? "↑"
        : "↓"
      : null;

  const getSortValue = (order, key) => {
    switch (key) {
      case "orderNumber":
        return order.orderNumber;
      case "customerName":
        return order.customerId?.fullName?.toLowerCase() || "";
      case "createdAt":
        return new Date(order.createdAt).getTime();
      case "employeeName":
        return order.employeeId?.fullName?.toLowerCase() || "";
      case "finalAmount":
        return calculateOrderTotal(order);
      case "paymentStatus":
        return order.paymentStatus;
      default:
        return "";
    }
  };

  const sortedOrders = useMemo(() => {
    if (!sortConfig.key) return orders;
    return [...orders].sort((a, b) => {
      const valueA = getSortValue(a, sortConfig.key);
      const valueB = getSortValue(b, sortConfig.key);
      return sortConfig.direction === "asc"
        ? valueA < valueB
          ? -1
          : 1
        : valueA > valueB
        ? -1
        : 1;
    });
  }, [orders, sortConfig]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={vi}
      localeText={{
        previousMonth: "Tháng trước",
        nextMonth: "Tháng sau",
        cancelButtonLabel: "Hủy",
        okButtonLabel: "Chọn",
      }}
    >
      <Box sx={{ width: "100%", p: 2 }}>
        {/* Revenue and Invoice Summary */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tổng doanh thu
                </Typography>
                <Typography variant="h5" component="div" color="primary">
                  {totalRevenue.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tổng số hóa đơn
                </Typography>
                <Typography variant="h5" component="div" color="secondary">
                  {totalInvoices}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Trung bình/hóa đơn
                </Typography>
                <Typography variant="h6" component="div">
                  {totalInvoices > 0
                    ? (totalRevenue / totalInvoices).toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })
                    : "0 ₫"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <TextField
            label="Tìm kiếm theo mã đơn, tên KH/NV"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>TT Thanh toán</InputLabel>
            <Select
              value={filterPaymentStatus}
              onChange={handleFilterPaymentStatusChange}
              label="TT Thanh toán"
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="unpaid">Chưa thanh toán</MenuItem>
              <MenuItem value="partial">Thanh toán một phần</MenuItem>
              <MenuItem value="paid">Đã thanh toán</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Lọc theo thời gian</InputLabel>
            <Select
              value={filterTimeRange}
              onChange={handleFilterTimeRangeChange}
              label="Lọc theo thời gian"
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="day">Ngày</MenuItem>
              <MenuItem value="month">Tháng</MenuItem>
              <MenuItem value="custom">Khoảng thời gian</MenuItem>
            </Select>
          </FormControl>
          {filterTimeRange === "day" && (
            <DatePicker
              label="Chọn ngày"
              value={filterDate}
              onChange={(newValue) => setFilterDate(newValue)}
              sx={{ flex: 0.5 }}
              format="dd/MM/yyyy"
            />
          )}
          {filterTimeRange === "month" && (
            <DatePicker
              label="Chọn tháng"
              value={filterDate}
              onChange={(newValue) => setFilterDate(newValue)}
              views={["year", "month"]}
              openTo="month"
              format="MM/yyyy"
              sx={{ flex: 0.5 }}
              localeText={{
                month: "Tháng",
                year: "Năm",
                previousMonth: "Tháng trước",
                nextMonth: "Tháng sau",
                cancelButtonLabel: "Hủy",
                okButtonLabel: "Chọn",
              }}
            />
          )}
          {filterTimeRange === "custom" && (
            <>
              <DatePicker
                label="Từ ngày"
                value={filterStartDate}
                onChange={(newValue) => setFilterStartDate(newValue)}
                sx={{ flex: 0.5 }}
              />
              <DatePicker
                label="Đến ngày"
                value={filterEndDate}
                onChange={(newValue) => setFilterEndDate(newValue)}
                sx={{ flex: 0.5 }}
              />
            </>
          )}
        </Stack>

        <TableContainer
          component={Paper}
          sx={{ maxHeight: 500, overflow: "auto" }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  onClick={() => handleSort("orderNumber")}
                  style={{ cursor: "pointer" }}
                >
                  Mã đơn hàng {renderSortIcon("orderNumber")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("customerName")}
                  style={{ cursor: "pointer" }}
                >
                  Khách hàng {renderSortIcon("customerName")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("createdAt")}
                  style={{ cursor: "pointer" }}
                >
                  Ngày tạo {renderSortIcon("createdAt")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("employeeName")}
                  style={{ cursor: "pointer" }}
                >
                  Nhân viên {renderSortIcon("employeeName")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("finalAmount")}
                  style={{ cursor: "pointer", fontWeight: "bold" }}
                >
                  Tổng thành tiền {renderSortIcon("finalAmount")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("paymentStatus")}
                  style={{ cursor: "pointer", width: "150px" }}
                >
                  TT Thanh toán {renderSortIcon("paymentStatus")}
                </TableCell>
                <TableCell align="right">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.map((order) => {
                const calculatedFinalAmount = calculateOrderTotal(order);
                return (
                  <TableRow key={order._id}>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>
                      {order.customerId?.fullName || "Khách vãng lai"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: vi,
                      })}
                    </TableCell>
                    <TableCell>{order.employeeId?.fullName || "N/A"}</TableCell>
                    <TableCell>
                      <strong>
                        {calculatedFinalAmount.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                      </strong>
                    </TableCell>
                    <TableCell sx={{ width: "150px" }}>
                      {renderPaymentStatus(order.paymentStatus)}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleViewDetails(order)}>
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedOrder && (
          <OrderDetailDialog
            open={isDetailsOpen}
            onClose={handleCloseDetails}
            order={selectedOrder}
            authToken={authToken}
            refreshOrders={fetchOrders}
            showSnackbar={showSnackbar}
          />
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}

function OrderDetailDialog({
  open,
  onClose,
  order,
  authToken,
  refreshOrders,
  showSnackbar,
}) {
  const [batchDetails, setBatchDetails] = useState({});
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState({ ...order });

  useEffect(() => {
    if (order?.products) {
      const uniqueBatchIds = new Set();
      order.products.forEach((product) => {
        if (product.batchesUsed?.length > 0) {
          product.batchesUsed.forEach((batch) => {
            if (batch.batchId) {
              // Handle both string IDs and object IDs
              const batchId = typeof batch.batchId === 'string' ? batch.batchId : batch.batchId._id;
              uniqueBatchIds.add(batchId);
            }
          });
        }
      });
      if (uniqueBatchIds.size > 0) {
        fetchBatchDetails(Array.from(uniqueBatchIds));
      }
    }
  }, [order, authToken]);

  const fetchBatchDetails = async (batchIds) => {
    setLoadingBatches(true);
    try {
      const batchPromises = batchIds.map((batchId) =>
        axios.get(`http://localhost:8000/api/batches/${batchId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      );
      const responses = await Promise.all(batchPromises);
      const batchData = responses.reduce((acc, res) => {
        acc[res.data._id] = res.data;
        return acc;
      }, {});
      setBatchDetails(batchData);
    } catch (error) {
      console.error("Lỗi khi tải thông tin batch:", error);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Add helper function for calculating item price with batch discount
  const calculateItemPrice = (item, batchDetails) => {
    const originalPrice = (item.originalUnitPrice || 0) * (item.quantity || 0);
    
    // Get discount from batch details or from the populated batchId
    let discountPercent = 0;
    
    if (item.batchesUsed?.length > 0) {
      const firstBatch = item.batchesUsed[0];
      
      // Check if batchId is populated with discount info
      if (firstBatch.batchId?.discountInfo?.discountValue) {
        discountPercent = firstBatch.batchId.discountInfo.discountValue;
      }
      // Otherwise check in our fetched batch details
      else if (firstBatch.batchId) {
        const batchId = typeof firstBatch.batchId === 'string' ? firstBatch.batchId : firstBatch.batchId._id;
        const batchDetail = batchDetails[batchId];
        if (batchDetail?.discountInfo?.isDiscounted) {
          discountPercent = batchDetail.discountInfo.discountValue || 0;
        }
      }
    }
    
    const discountAmount = (originalPrice * discountPercent) / 100;
    return {
      originalPrice,
      discountPercent,
      discountAmount,
      finalPrice: originalPrice - discountAmount
    };
  };

  // Calculate total for payment dialog
  const calculateOrderTotalForPayment = () => {
    if (order.products && order.products.length > 0) {
      return order.products.reduce((sum, item) => {
        const { finalPrice } = calculateItemPrice(item, batchDetails);
        return sum + finalPrice;
      }, 0);
    }
    return order.finalAmount || 0;
  };

  const handleCompletePayment = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8000/api/orders/${order._id}/complete-payment`,
        { amountPaid: parseFloat(amountPaid) },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (response.data) {
        showSnackbar("Thanh toán thành công", "success");
        refreshOrders();
        setIsPaymentDialogOpen(false);
        onClose();
      }
    } catch (error) {
      console.error("Lỗi khi hoàn thành thanh toán:", error);
      showSnackbar("Lỗi khi thực hiện thanh toán", "error");
    }
  };

  const handleUpdateOrder = async () => {
    try {
      const response = await axios.patch(
        `http://localhost:8000/api/orders/${order._id}`,
        editedOrder,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (response.data) {
        showSnackbar("Cập nhật đơn hàng thành công", "success");
        refreshOrders();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật đơn hàng:", error);
      showSnackbar("Lỗi khi cập nhật đơn hàng", "error");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Chi tiết đơn hàng #{order.orderNumber}</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Thông tin khách hàng
          </Typography>
          <Typography>
            Khách hàng: {order.customerId?.fullName || "Khách vãng lai"}
          </Typography>
          {order.customerId?.phone && (
            <Typography>Điện thoại: {order.customerId.phone}</Typography>
          )}
          {order.customerId?.address && (
            <Typography>Địa chỉ: {order.customerId.address}</Typography>
          )}

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Thông tin đơn hàng
          </Typography>
          <Typography>
            Ngày tạo:{" "}
            {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", {
              locale: vi,
            })}
          </Typography>
          <Typography>
            Nhân viên: {order.employeeId?.fullName || "N/A"}
          </Typography>
          <Typography>
            TT Thanh toán: {renderPaymentStatus(order.paymentStatus)}
          </Typography>
          <Typography>
            Phương thức:{" "}
            {{
              cash: "Tiền mặt",
              transfer: "Chuyển khoản",
            }[order.paymentMethod] || order.paymentMethod}
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Sản phẩm
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Số lượng</TableCell>
                  <TableCell>Đơn vị</TableCell>
                  <TableCell>Giá gốc</TableCell>
                  <TableCell>Giảm giá (%)</TableCell>
                  <TableCell>Thành tiền</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.products.map((item, idx) => {
                  const { originalPrice, discountPercent, discountAmount, finalPrice } = calculateItemPrice(item, batchDetails);
                  return (
                    <TableRow key={item._id || idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        {item.productId?.name || "Đang tải..."}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.selectedUnitName}</TableCell>
                      <TableCell>
                        {(item.originalUnitPrice || 0).toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                      </TableCell>
                      <TableCell>
                        {discountPercent > 0 ? (
                          <>
                            <span style={{ color: "#d32f2f", fontWeight: "bold" }}>
                              {discountPercent}%
                            </span>
                            <br />
                            <span style={{ color: "#2e7d32", fontSize: "0.875rem" }}>
                              (-{discountAmount.toLocaleString("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              })})
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#666" }}>0%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span style={{ fontWeight: "bold" }}>
                          {finalPrice.toLocaleString("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          })}
                        </span>
                        {discountPercent > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "#666", textDecoration: "line-through" }}>
                            {originalPrice.toLocaleString("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            })}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Tổng giá gốc */}
                <TableRow>
                  <TableCell colSpan={6} align="right">
                    <strong>Tổng giá gốc:</strong>
                  </TableCell>
                  <TableCell>
                    <strong>
                      {order.products
                        .reduce((sum, item) => {
                          const { originalPrice } = calculateItemPrice(item, batchDetails);
                          return sum + originalPrice;
                        }, 0)
                        .toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                    </strong>
                  </TableCell>
                </TableRow>
                {/* Tổng giảm giá */}
                <TableRow>
                  <TableCell colSpan={6} align="right">
                    <strong >Tổng giảm giá:</strong>
                  </TableCell>
                  <TableCell>
                    <strong>
                      {order.products
                        .reduce((sum, item) => {
                          const { discountAmount } = calculateItemPrice(item, batchDetails);
                          return sum + discountAmount;
                        }, 0)
                        .toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                    </strong>
                  </TableCell>
                </TableRow>
                {/* Tổng thành tiền */}
                <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell colSpan={6} align="right">
                    <strong style={{ fontSize: "1.1rem" }}>Tổng thành tiền:</strong>
                  </TableCell>
                  <TableCell>
                    <strong style={{ fontSize: "1.1rem", color: "#1976d2" }}>
                      {order.products
                        .reduce((sum, item) => {
                          const { finalPrice } = calculateItemPrice(item, batchDetails);
                          return sum + finalPrice;
                        }, 0)
                        .toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                    </strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          {order.orderType === "preorder" &&
            order.paymentStatus === "unpaid" && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsPaymentDialogOpen(true)}
              >
                Hoàn thành thanh toán
              </Button>
            )}
          <Button onClick={onClose}>Đóng</Button>
          <Button onClick={() => window.print()} startIcon={<PrintIcon />}>
            In hóa đơn
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
      >
        <DialogTitle>Hoàn thành thanh toán</DialogTitle>
        <DialogContent>
          <TextField
            label="Số tiền thanh toán"
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            fullWidth
            margin="normal"
            InputProps={{ inputProps: { min: 0 } }}
          />
          <Typography variant="subtitle1">
            Tổng tiền cần thanh toán:{" "}
            {calculateOrderTotalForPayment().toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Typography>
          {amountPaid && (
            <Typography
              variant="subtitle1"
              color={
                parseFloat(amountPaid) < calculateOrderTotalForPayment() ? "error" : "inherit"
              }
            >
              Tiền thừa:{" "}
              {Math.max(
                parseFloat(amountPaid) - calculateOrderTotalForPayment(),
                0
              ).toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)}>Hủy bỏ</Button>
          <Button
            onClick={handleCompletePayment}
            color="primary"
            variant="contained"
            disabled={
              !amountPaid || isNaN(amountPaid) || parseFloat(amountPaid) <= 0
            }
          >
            Xác nhận thanh toán
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const renderPaymentStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case "unpaid":
    case "pending":
      return "Chưa thanh toán";
    case "partial":
      return "Thanh toán một phần";
    case "paid":
      return "Đã thanh toán";
    default:
      return paymentStatus;
  }
};

export default ManagerOrder;
