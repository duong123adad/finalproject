import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  useTheme,
  Dialog, // Import Dialog
  DialogTitle, // Import DialogTitle
  DialogContent, // Import DialogContent
  DialogActions, // Import DialogActions
  Button, // Import Button
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  startOfWeek,
  endOfWeek,
  getWeek,
  getMonth,
  getYear,
  format as formatDateFns,
} from "date-fns";

const COLORS = ["#1976d2", "#43a047", "#e53935", "#fbc02d", "#8e24aa"];

const formatCurrency = (value) =>
  value?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) ||
  "0 ₫";

const InOutPage = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [goodReceipts, setGoodReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filterType, setFilterType] = useState("month");
  const [filterDate, setFilterDate] = useState(new Date());
  const [filterStart, setFilterStart] = useState(null);
  const [filterEnd, setFilterEnd] = useState(null);
  const [error, setError] = useState(""); // Thêm state cho lỗi
  const [receivedByUser, setReceivedByUser] = useState(null);

  // States for Good Receipt Detail Dialog
  const [openGoodReceiptDialog, setOpenGoodReceiptDialog] = useState(false);
  const [selectedGoodReceipt, setSelectedGoodReceipt] = useState(null);
  const [loadingGoodReceiptDetail, setLoadingGoodReceiptDetail] =
    useState(false);

  // States for Order Detail Dialog
  const [openOrderDetailDialog, setOpenOrderDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  // Lấy token từ localStorage
  const token = localStorage.getItem("authToken");

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const config = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {};

        // Phiếu nhập kho (chi)
        const grRes = await axios.get(
          "https://panddretailshop.onrender.com/api/goodreceipt",
          config
        );

        // Hóa đơn bán hàng (thu)
        const orderRes = await axios.get(
          "https://panddretailshop.onrender.com/api/orders",
          config
        );

        // Xử lý dữ liệu phiếu nhập kho (goodReceipts)
        let receiptsData = [];
        if (Array.isArray(grRes.data)) {
          receiptsData = grRes.data;
        } else if (grRes.data && typeof grRes.data === "object") {
          if (Array.isArray(grRes.data.data)) {
            receiptsData = grRes.data.data;
          } else if (Array.isArray(grRes.data.results)) {
            receiptsData = grRes.data.results;
          } else if (
            grRes.data.receipts &&
            Array.isArray(grRes.data.receipts)
          ) {
            receiptsData = grRes.data.receipts;
          }
        }
        setGoodReceipts(receiptsData);

        // Xử lý dữ liệu orders
        let ordersData = [];
        if (Array.isArray(orderRes.data)) {
          ordersData = orderRes.data;
        } else if (orderRes.data && typeof orderRes.data === "object") {
          if (Array.isArray(orderRes.data.data)) {
            ordersData = orderRes.data.data;
          } else if (Array.isArray(orderRes.data.results)) {
            ordersData = orderRes.data.results;
          } else if (
            orderRes.data.orders &&
            Array.isArray(orderRes.data.orders)
          ) {
            ordersData = orderRes.data.orders;
          }
        }
        setOrders(ordersData);
      } catch (e) {
        console.error("Error fetching data:", e);
        setGoodReceipts([]);
        setOrders([]);

        if (e.response) {
          console.log("Error response:", e.response);
          if (e.response.status === 401) {
            setError("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
          } else {
            setError(
              `Không thể tải dữ liệu thu chi. Lỗi: ${e.response.status} - ${e.response.statusText}`
            );
          }
        } else if (e.request) {
          setError(
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng."
          );
        } else {
          setError(`Lỗi không xác định: ${e.message}`);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  const fetchGoodReceiptDetail = async (id) => {
    setLoadingGoodReceiptDetail(true);
    try {
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const res = await axios.get(
        `https://panddretailshop.onrender.com/api/goodreceipt/${id}`,
        config
      );
      const receipt = res.data.data || res.data;

      // Fetch thông tin người nhận
      if (receipt.receivedBy) {
        const userRes = await axios.get(
          `https://panddretailshop.onrender.com/api/user/${receipt.receivedBy}`,
          config
        );
        setReceivedByUser(userRes.data);
      }

      setSelectedGoodReceipt(receipt);
      setOpenGoodReceiptDialog(true);
    } catch (error) {
      console.error("Error fetching good receipt detail:", error);
      setError("Không thể tải chi tiết phiếu nhập kho.");
    } finally {
      setLoadingGoodReceiptDetail(false);
    }
  };
  const translateStatus = (status) => {
    switch (status) {
      case "received":
        return "Đã nhập kho";
      case "pending":
        return "Đang chờ";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };
  const translatePaymentStatus = (status) => {
    switch (status) {
      case "paid":
        return "Đã thanh toán";
      case "pending":
        return "Đang chờ thanh toán";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };
  // Function to fetch Order detail
  const fetchOrderDetail = async (id) => {
    setLoadingOrderDetail(true);
    try {
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const res = await axios.get(
        `https://panddretailshop.onrender.com/api/orders/${id}`,
        config
      );
      setSelectedOrder(res.data.data || res.data); // Adjust based on your API response structure
      setOpenOrderDetailDialog(true);
    } catch (error) {
      console.error("Error fetching order detail:", error);
      setError("Không thể tải chi tiết hóa đơn bán hàng.");
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  // Filter by time
  const filterByDate = (date, type) => {
    if (!date) return true;
    let d = new Date(date);
    if (filterType === "month") {
      return (
        d.getMonth() === filterDate.getMonth() &&
        d.getFullYear() === filterDate.getFullYear()
      );
    }
    if (filterType === "day") {
      return (
        d.getDate() === filterDate.getDate() &&
        d.getMonth() === filterDate.getMonth() &&
        d.getFullYear() === filterDate.getFullYear()
      );
    }
    if (filterType === "custom" && filterStart && filterEnd) {
      return d >= filterStart && d <= filterEnd;
    }
    return true;
  };

  // Tổng hợp dữ liệu thu/chi
  const {
    totalIn,
    totalOut,
    chartData,
    pieData,
    tableIn,
    tableOut,
    chartType,
  } = useMemo(() => {
    // Thu: hóa đơn bán hàng đã thanh toán
    const filteredOrders = orders.filter((o) =>
      filterByDate(o.createdAt, "in")
    );

    // Chi: phiếu nhập kho - không lọc theo trạng thái
    const filteredReceipts = goodReceipts.filter((r) =>
      filterByDate(r.receiptDate || r.createdAt, "out")
    );

    // Tổng giá trị thu/chi
    // Tính lại tổng thu giống như chi tiết hóa đơn (không chỉ lấy finalAmount)
    const totalIn = filteredOrders.reduce((sum, o) => {
      let calculatedFinalAmount = 0;
      if (o.products && o.products.length > 0) {
        calculatedFinalAmount = o.products.reduce((s, item) => {
          let discountPercent = 0;
          if (
            item.batchesUsed &&
            item.batchesUsed[0] &&
            item.batchesUsed[0].batchId &&
            item.batchesUsed[0].batchId.discountInfo &&
            typeof item.batchesUsed[0].batchId.discountInfo.discountValue ===
              "number"
          ) {
            discountPercent =
              item.batchesUsed[0].batchId.discountInfo.discountValue;
          }
          const originalPrice =
            (item.originalUnitPrice || 0) * (item.quantity || 0);
          const discountAmount = (originalPrice * discountPercent) / 100;
          const finalPrice = originalPrice - discountAmount;
          return s + finalPrice;
        }, 0);
      } else {
        calculatedFinalAmount = o.finalAmount || 0;
      }
      return sum + calculatedFinalAmount;
    }, 0);

    const totalOut = filteredReceipts.reduce(
      (sum, r) => sum + (r.totalAmount || 0),
      0
    );

    // Dữ liệu biểu đồ theo ngày/tháng
    let chartMap = {};
    let chartData = [];
    let chartType = "bar";

    if (filterType === "month") {
      chartType = "bar";
      // Helper: lấy tuần trong tháng và ngày bắt đầu/kết thúc tuần
      const getWeekOfMonth = (date) => {
        const d = new Date(date);
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const weekNum = Math.ceil((d.getDate() + firstDay.getDay()) / 7);

        // Tính ngày bắt đầu/kết thúc tuần
        const weekStart = startOfWeek(d, { weekStartsOn: 1 }); // Thứ 2
        const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
        // Đảm bảo nằm trong tháng đang lọc
        const month = d.getMonth();
        const start =
          weekStart.getMonth() === month
            ? weekStart
            : new Date(d.getFullYear(), month, 1);
        const end =
          weekEnd.getMonth() === month
            ? weekEnd
            : new Date(d.getFullYear(), month + 1, 0);

        // Format ngày
        const startStr = formatDateFns(start, "dd/MM");
        const endStr = formatDateFns(end, "dd/MM");
        return `Tuần ${weekNum} (${startStr} - ${endStr})`;
      };

      chartMap = {};
      filteredOrders.forEach((o) => {
        const key = getWeekOfMonth(o.createdAt);
        let calculatedFinalAmount = 0;
        if (o.products && o.products.length > 0) {
          calculatedFinalAmount = o.products.reduce((s, item) => {
            let discountPercent = 0;
            if (
              item.batchesUsed &&
              item.batchesUsed[0] &&
              item.batchesUsed[0].batchId &&
              item.batchesUsed[0].batchId.discountInfo &&
              typeof item.batchesUsed[0].batchId.discountInfo.discountValue ===
                "number"
            ) {
              discountPercent =
                item.batchesUsed[0].batchId.discountInfo.discountValue;
            }
            const originalPrice =
              (item.originalUnitPrice || 0) * (item.quantity || 0);
            const discountAmount = (originalPrice * discountPercent) / 100;
            const finalPrice = originalPrice - discountAmount;
            return s + finalPrice;
          }, 0);
        } else {
          calculatedFinalAmount = o.finalAmount || 0;
        }
        chartMap[key] = chartMap[key] || { name: key, Thu: 0, Chi: 0 };
        chartMap[key].Thu += calculatedFinalAmount;
      });
      filteredReceipts.forEach((r) => {
        const key = getWeekOfMonth(r.receiptDate || r.createdAt);
        chartMap[key] = chartMap[key] || { name: key, Thu: 0, Chi: 0 };
        chartMap[key].Chi += r.totalAmount || 0;
      });
      // Sắp xếp tuần theo thứ tự tuần 1, 2, 3, 4, 5
      chartData = Object.values(chartMap).sort((a, b) => {
        const getNum = (name) =>
          parseInt((name || "").replace(/[^0-9]/g, ""), 10) || 0;
        return getNum(a.name) - getNum(b.name);
      });
    } else {
      // Biểu đồ Bar: theo ngày (custom hoặc day)
      chartType = "bar";
      const groupBy = "day";
      const groupKey = (date) => {
        if (!date) return "N/A";
        const d = new Date(date);
        return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      };

      chartMap = {};
      filteredOrders.forEach((o) => {
        const key = groupKey(o.createdAt);
        let calculatedFinalAmount = 0;
        if (o.products && o.products.length > 0) {
          calculatedFinalAmount = o.products.reduce((s, item) => {
            let discountPercent = 0;
            if (
              item.batchesUsed &&
              item.batchesUsed[0] &&
              item.batchesUsed[0].batchId &&
              item.batchesUsed[0].batchId.discountInfo &&
              typeof item.batchesUsed[0].batchId.discountInfo.discountValue ===
                "number"
            ) {
              discountPercent =
                item.batchesUsed[0].batchId.discountInfo.discountValue;
            }
            const originalPrice =
              (item.originalUnitPrice || 0) * (item.quantity || 0);
            const discountAmount = (originalPrice * discountPercent) / 100;
            const finalPrice = originalPrice - discountAmount;
            return s + finalPrice;
          }, 0);
        } else {
          calculatedFinalAmount = o.finalAmount || 0;
        }
        chartMap[key] = chartMap[key] || { name: key, Thu: 0, Chi: 0 };
        chartMap[key].Thu += calculatedFinalAmount;
      });
      filteredReceipts.forEach((r) => {
        const key = groupKey(r.receiptDate || r.createdAt);
        chartMap[key] = chartMap[key] || { name: key, Thu: 0, Chi: 0 };
        chartMap[key].Chi += r.totalAmount || 0;
      });
      chartData = Object.values(chartMap).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    // Pie chart
    const pieData = [
      { name: "Thu (Bán hàng)", value: totalIn },
      { name: "Chi (Nhập hàng)", value: totalOut },
    ];

    // Bảng chi tiết
    const tableIn = filteredOrders;
    const tableOut = filteredReceipts;

    return {
      totalIn,
      totalOut,
      chartData,
      pieData,
      tableIn,
      tableOut,
      chartType,
    };
  }, [orders, goodReceipts, filterType, filterDate, filterStart, filterEnd]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box sx={{ height: "100vh", overflow: "auto" }}>
        {/* <Typography variant="h4" fontWeight="bold" gutterBottom>
          Báo cáo thu chi (Phiếu nhập kho & Hóa đơn bán hàng)
        </Typography> */}
        {/* Hiển thị lỗi nếu có */}
        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: "#ffebee" }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              select
              label="Lọc theo"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="month">Tháng</MenuItem>
              <MenuItem value="day">Ngày</MenuItem>
              <MenuItem value="custom">Khoảng thời gian</MenuItem>
            </TextField>
            {(filterType === "month" || filterType === "day") && (
              <DatePicker
                label={filterType === "month" ? "Chọn tháng" : "Chọn ngày"}
                views={filterType === "month" ? ["year", "month"] : undefined}
                value={filterDate}
                onChange={setFilterDate}
                format={filterType === "month" ? "MM/yyyy" : "dd/MM/yyyy"}
              />
            )}
            {filterType === "custom" && (
              <>
                <DatePicker
                  label="Từ ngày"
                  value={filterStart}
                  onChange={setFilterStart}
                  format="dd/MM/yyyy"
                />
                <DatePicker
                  label="Đến ngày"
                  value={filterEnd}
                  onChange={setFilterEnd}
                  format="dd/MM/yyyy"
                  minDate={filterStart}
                />
              </>
            )}
            <Box flex={1} />
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Tổng thu (bán hàng)
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(totalIn)}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Tổng chi (nhập hàng)
                </Typography>
                <Typography variant="h6" color="error.main">
                  {formatCurrency(totalOut)}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Lợi nhuận gộp
                </Typography>
                <Typography
                  variant="h6"
                  color={
                    totalIn - totalOut >= 0 ? "success.main" : "error.main"
                  }
                >
                  {formatCurrency(totalIn - totalOut)}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2, height: 350 }}>
                <Typography variant="h6" gutterBottom>
                  {filterType === "month"
                    ? "Biểu đồ thu chi theo tuần trong tháng"
                    : "Biểu đồ thu chi theo ngày"}
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(label) =>
                        filterType === "month"
                          ? `Tuần: ${label}`
                          : `Ngày: ${label}`
                      }
                    />
                    <Legend />
                    <Bar dataKey="Thu" fill={theme.palette.success.main} />
                    <Bar dataKey="Chi" fill={theme.palette.error.main} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, height: 350 }}>
                <Typography variant="h6" gutterBottom>
                  Tỷ lệ thu/chi
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(1)}%`
                      }
                    >
                      {pieData.map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Chi tiết phiếu nhập kho (Chi)
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="40px">STT</TableCell>
                        <TableCell>ID Phiếu</TableCell>
                        <TableCell>Ngày nhập</TableCell>
                        <TableCell>Nhà cung cấp</TableCell>
                        <TableCell align="right">Tổng tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableOut.map((r, index) => (
                        <TableRow key={r._id || r.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell
                            onClick={() =>
                              fetchGoodReceiptDetail(r._id || r.id)
                            }
                            sx={{
                              cursor: "pointer",
                              color: theme.palette.primary.main,
                            }}
                          >
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ maxWidth: 120 }}
                            >
                              {r._id || r.id || "N/A"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {r.receiptDate || r.createdAt
                              ? new Date(
                                  r.receiptDate || r.createdAt
                                ).toLocaleDateString("vi-VN")
                              : ""}
                          </TableCell>
                          <TableCell>
                            {r.supplier?.name ||
                              (typeof r.supplier === "object" &&
                              r.supplier !== null
                                ? r.supplier.name ||
                                  r.supplier.companyName ||
                                  "N/A"
                                : "N/A")}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(r.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {tableOut.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Chi tiết hóa đơn bán hàng (Thu)
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="40px">STT</TableCell>
                        <TableCell>ID Hóa đơn</TableCell>
                        <TableCell>Ngày bán</TableCell>
                        <TableCell>Khách hàng</TableCell>
                        <TableCell align="right">Tổng tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableIn.map((o, index) => {
                        // Tính lại tổng thành tiền giống chi tiết phiếu mua
                        let calculatedFinalAmount = 0;
                        if (o.products && o.products.length > 0) {
                          calculatedFinalAmount = o.products.reduce(
                            (sum, item) => {
                              // Nếu có discountPercent từ batch, lấy discountPercent, nếu không thì 0
                              let discountPercent = 0;
                              if (
                                item.batchesUsed &&
                                item.batchesUsed[0] &&
                                item.batchesUsed[0].batchId &&
                                item.batchesUsed[0].batchId.discountInfo &&
                                typeof item.batchesUsed[0].batchId.discountInfo
                                  .discountValue === "number"
                              ) {
                                discountPercent =
                                  item.batchesUsed[0].batchId.discountInfo
                                    .discountValue;
                              }
                              const originalPrice =
                                (item.originalUnitPrice || 0) *
                                (item.quantity || 0);
                              const discountAmount =
                                (originalPrice * discountPercent) / 100;
                              const finalPrice = originalPrice - discountAmount;
                              return sum + finalPrice;
                            },
                            0
                          );
                        } else {
                          calculatedFinalAmount = o.finalAmount || 0;
                        }
                        return (
                          <TableRow key={o._id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell
                              onClick={() => fetchOrderDetail(o._id)}
                              sx={{
                                cursor: "pointer",
                                color: theme.palette.primary.main,
                              }}
                            >
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ maxWidth: 120 }}
                              >
                                {o._id || "N/A"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {o.createdAt
                                ? new Date(o.createdAt).toLocaleDateString(
                                    "vi-VN"
                                  )
                                : ""}
                            </TableCell>
                            <TableCell>
                              {o.customerId?.fullName || "Khách vãng lai"}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(calculatedFinalAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {tableIn.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
      {/* Good Receipt Detail Dialog */}
      <Dialog
        open={openGoodReceiptDialog}
        onClose={() => setOpenGoodReceiptDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết Phiếu nhập kho: {selectedGoodReceipt?._id}
        </DialogTitle>
        <DialogContent dividers>
          {loadingGoodReceiptDetail ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : selectedGoodReceipt ? (
            <Grid container spacing={2}>
              {/* Phần thông tin cơ bản */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>ID Phiếu:</strong> {selectedGoodReceipt._id}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Ngày nhập:</strong>{" "}
                  {selectedGoodReceipt.receiptDate
                    ? new Date(
                        selectedGoodReceipt.receiptDate
                      ).toLocaleDateString("vi-VN")
                    : "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Nhà cung cấp:</strong>{" "}
                  {selectedGoodReceipt.supplier?.name ||
                    selectedGoodReceipt.supplier?.companyName ||
                    "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Người nhận:</strong>{" "}
                  {receivedByUser?.fullName || "Đang tải..."}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Tổng tiền:</strong>{" "}
                  {formatCurrency(selectedGoodReceipt.totalAmount)}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Trạng thái:</strong>{" "}
                  {translateStatus(selectedGoodReceipt.status) || "N/A"}
                </Typography>
              </Grid>

              {/* Phần danh sách sản phẩm */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  <strong>Danh sách sản phẩm:</strong>
                </Typography>
                <TableContainer component={Paper} sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>STT</TableCell>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell>Số lượng</TableCell>
                        <TableCell>Giá nhập</TableCell>
                        <TableCell>Ngày SX</TableCell>
                        <TableCell>Ngày HH</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedGoodReceipt.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{item.product?.name || "N/A"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                          <TableCell>
                            {item.manufactureDate
                              ? new Date(
                                  item.manufactureDate
                                ).toLocaleDateString("vi-VN")
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {item.expiryDate
                              ? new Date(item.expiryDate).toLocaleDateString(
                                  "vi-VN"
                                )
                              : "N/A"}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Phần ghi chú */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  <strong>Ghi chú:</strong>{" "}
                  {selectedGoodReceipt.notes || "Không có"}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography>Không có dữ liệu chi tiết.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGoodReceiptDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
      {/* Order Detail Dialog */}
      <Dialog
        open={openOrderDetailDialog}
        onClose={() => setOpenOrderDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết Hóa đơn bán hàng: {selectedOrder?._id}
        </DialogTitle>
        <DialogContent dividers>
          {loadingOrderDetail ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : selectedOrder ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>ID Hóa đơn:</strong> {selectedOrder._id}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Ngày bán:</strong>{" "}
                  {selectedOrder.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleDateString(
                        "vi-VN"
                      )
                    : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Khách hàng:</strong>{" "}
                  {selectedOrder.customerId?.fullName || "Khách vãng lai"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Loại đơn hàng:</strong>{" "}
                  {selectedOrder.orderType || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Trạng thái thanh toán:</strong>{" "}
                  {translatePaymentStatus(selectedOrder.paymentStatus)}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Phương thức thanh toán:</strong>{" "}
                  {selectedOrder.paymentMethod === "cash"
                    ? "Tiền mặt"
                    : "Chuyển khoản"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  <strong>Tổng tiền:</strong>{" "}
                  {formatCurrency(
                    selectedOrder.finalAmount ||
                      selectedOrder.products?.reduce((sum, item) => {
                        let discountPercent = 0;
                        if (
                          item.batchesUsed &&
                          item.batchesUsed[0] &&
                          item.batchesUsed[0].batchId &&
                          item.batchesUsed[0].batchId.discountInfo &&
                          typeof item.batchesUsed[0].batchId.discountInfo
                            .discountValue === "number"
                        ) {
                          discountPercent =
                            item.batchesUsed[0].batchId.discountInfo
                              .discountValue;
                        }
                        const originalPrice =
                          (item.originalUnitPrice || 0) * (item.quantity || 0);
                        const discountAmount =
                          (originalPrice * discountPercent) / 100;
                        const finalPrice = originalPrice - discountAmount;
                        return sum + finalPrice;
                      }, 0) ||
                      0
                  )}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  <strong>Danh sách sản phẩm:</strong>
                </Typography>
                <TableContainer component={Paper} sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>STT</TableCell>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell>Số lượng</TableCell>
                        <TableCell>Đơn giá</TableCell>
                        <TableCell>Chiết khấu (%)</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.products &&
                      selectedOrder.products.length > 0 ? (
                        selectedOrder.products.map((item, idx) => {
                          const originalPrice =
                            (item.originalUnitPrice || 0) *
                            (item.quantity || 0);
                          let discountPercent = 0;
                          if (
                            item.batchesUsed &&
                            item.batchesUsed[0] &&
                            item.batchesUsed[0].batchId &&
                            item.batchesUsed[0].batchId.discountInfo &&
                            typeof item.batchesUsed[0].batchId.discountInfo
                              .discountValue === "number"
                          ) {
                            discountPercent =
                              item.batchesUsed[0].batchId.discountInfo
                                .discountValue;
                          }
                          const discountAmount =
                            (originalPrice * discountPercent) / 100;
                          const finalPrice = originalPrice - discountAmount;
                          return (
                            <TableRow key={idx}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                {item.productId?.name || "N/A"}{" "}
                                {/* Sửa từ product sang productId */}
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                {formatCurrency(item.originalUnitPrice)}
                              </TableCell>
                              <TableCell>
                                {(item.batchesUsed?.[0]?.batchId?.discountInfo
                                  ?.discountValue || 0) + "%"}{" "}
                                {/* Thêm xử lý mặc định 0% */}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(finalPrice)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            Không có sản phẩm nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  <strong>Ghi chú:</strong> {selectedOrder.notes || "Không có"}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography>Không có dữ liệu chi tiết.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOrderDetailDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default InOutPage;
