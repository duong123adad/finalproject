import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent
} from "@mui/material";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";

function ReturnHistory() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [returnTypeFilter, setReturnTypeFilter] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  
  const navigate = useNavigate();
  
  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {};
      if (supplierFilter) params.supplierId = supplierFilter;
      if (statusFilter) params.status = statusFilter;
      if (returnTypeFilter) params.type = returnTypeFilter;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      
      const response = await axios.get("http://localhost:8000/api/returns", {
        params,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      setReturns(response.data);
      
      // Fetch statistics
      const statsResponse = await axios.get("http://localhost:8000/api/returns/statistics", {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      
      setStatistics(statsResponse.data);
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/suppliers",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          }
        }
        
      );
      setSuppliers(response.data);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };
  
  useEffect(() => {
    fetchSuppliers();
    fetchReturns();
  }, []);
  
  const handleViewDetails = (returnItem) => {
    setSelectedReturn(returnItem);
    setDialogOpen(true);
  };
  
  const handleFilterChange = () => {
    fetchReturns();
  };
  
  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.patch(`http://localhost:8000/api/returns/${id}/status`, { status });
      fetchReturns();
      if (selectedReturn && selectedReturn._id === id) {
        setSelectedReturn(prev => ({ ...prev, status }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật trạng thái");
    }
  };
  
  const handleResendEmail = async (id) => {
    try {
      await axios.post(`http://localhost:8000/api/returns/${id}/resend-email`);
      alert("Email đã được gửi lại thành công.");
    } catch (err) {
      alert(err.response?.data?.message || "Không thể gửi lại email.");
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "success";
      case "pending": return "warning";
      case "cancelled": return "error";
      default: return "default";
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case "completed": return "Hoàn thành";
      case "pending": return "Đang xử lý";
      case "cancelled": return "Đã hủy";
      default: return status;
    }
  };
  
  const getTypeText = (type) => {
    switch (type) {
      case "return": return "Trả hàng";
      case "exchange": return "Đổi hàng";
      default: return type || "Trả hàng";
    }
  };
  
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Lịch sử đổi trả hàng cho nhà cung cấp
      </Typography>
        
      {/* Statistics Cards */}
      {statistics && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" gutterBottom>
            Thống kê đổi trả
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Tổng số phiếu đổi/trả
                  </Typography>
                  <Typography variant="h4">
                    {statistics.statistics.reduce((sum, item) => sum + item.returnCount, 0)}
                  </Typography>
                  <Typography variant="body2">
                    Từ {format(new Date(statistics.period.startDate), "dd/MM/yyyy")} 
                    {" đến "} 
                    {format(new Date(statistics.period.endDate), "dd/MM/yyyy")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Tổng số lượng đã đổi/trả
                  </Typography>
                  <Typography variant="h4">
                    {statistics.statistics.reduce((sum, item) => sum + item.totalQuantity, 0)}
                  </Typography>
                  <Typography variant="body2">
                    Đơn vị sản phẩm
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Số nhà cung cấp thực hiện đổi/trả hàng
                  </Typography>
                  <Typography variant="h4">
                    {statistics.statistics.length}
                  </Typography>
                  <Typography variant="body2">
                    Trong khoảng thời gian đã chọn
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Filter Section */}
      <Paper>
        <Typography variant="h6" gutterBottom>
          Bộ lọc
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <TextField
              label="Từ ngày"
              type="date"
              fullWidth
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Đến ngày"
              type="date"
              fullWidth
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Nhà cung cấp</InputLabel>
              <Select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                label="Nhà cung cấp"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Trạng thái"
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="completed">Hoàn thành</MenuItem>
                <MenuItem value="pending">Đang xử lý</MenuItem>
                <MenuItem value="cancelled">Đã hủy</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Loại phiếu</InputLabel>
              <Select
                value={returnTypeFilter}
                onChange={(e) => setReturnTypeFilter(e.target.value)}
                label="Loại phiếu"
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="return">Trả hàng</MenuItem>
                <MenuItem value="exchange">Đổi hàng</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleFilterChange}
            >
              Lọc
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Returns List */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : returns.length === 0 ? (
        <Alert severity="info">
          Không tìm thấy phiếu trả hàng nào phù hợp với điều kiện tìm kiếm
        </Alert>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Mã phiếu</TableCell>
                  <TableCell>Ngày tạo</TableCell> {/* Added creation date column */}
                  <TableCell>Ngày trả</TableCell>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Loại phiếu</TableCell>
                  <TableCell>Số lượng</TableCell>
                  <TableCell>Nhà cung cấp</TableCell>
                  <TableCell>Lý do</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returns.map((returnItem) => (
                  <TableRow key={returnItem._id} hover>
                    <TableCell>{returnItem.returnNumber || returnItem._id.substring(0, 8)}</TableCell>
                    <TableCell>
                      {format(new Date(returnItem.createdAt), "dd/MM/yyyy HH:mm")} {/* Added creation date/time */}
                    </TableCell>
                    <TableCell>
                      {format(new Date(returnItem.returnDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {returnItem.productId?.name || "Sản phẩm không xác định"} {/* Ensure product name is displayed */}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeText(returnItem.type)}
                        color={returnItem.type === "return" ? "error" : "info"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{returnItem.quantity}</TableCell>
                    <TableCell>
                      {returnItem.supplierId?.name || "Nhà cung cấp không xác định"}
                    </TableCell>
                    <TableCell>
                      {returnItem.reason && returnItem.reason.length > 30
                        ? returnItem.reason.substring(0, 30) + "..."
                        : returnItem.reason}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(returnItem.status)}
                        color={getStatusColor(returnItem.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => handleViewDetails(returnItem)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      
      {/* Return Detail Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedReturn && (
          <>
            <DialogTitle>
              Chi tiết phiếu {getTypeText(selectedReturn.type).toLowerCase()} #{selectedReturn.returnNumber || selectedReturn._id.substring(0, 8)}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Thông tin chung:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Stack spacing={1}>
                      <Typography>
                        <strong>Ngày trả:</strong>{" "}
                        {format(new Date(selectedReturn.returnDate), "dd/MM/yyyy")}
                      </Typography>
                      <Typography>
                        <strong>Người tạo phiếu:</strong>{" "}
                        {selectedReturn.createdBy?.fullName || "Không xác định"}
                      </Typography>
                      <Typography>
                        <strong>Ngày tạo:</strong>{" "}
                        {format(new Date(selectedReturn.createdAt), "dd/MM/yyyy HH:mm")}
                      </Typography>
                      <Typography>
                        <strong>Loại phiếu:</strong>{" "}
                        <Chip
                          label={getTypeText(selectedReturn.type)}
                          color={selectedReturn.type === "return" ? "error" : "info"}
                          size="small"
                        />
                      </Typography>
                      <Typography>
                        <strong>Trạng thái:</strong>{" "}
                        <Chip
                          label={getStatusText(selectedReturn.status)}
                          color={getStatusColor(selectedReturn.status)}
                          size="small"
                        />
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Chi tiết sản phẩm:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Stack spacing={1}>
                      <Typography>
                        <strong>Sản phẩm:</strong>{" "}
                        {selectedReturn.productId?.name || "Không xác định"} {/* Ensure product name is displayed */}
                      </Typography>
                      <Typography>
                        <strong>Mã lô hàng:</strong>{" "}
                        {selectedReturn.batchId?.batchCode || selectedReturn.batchId?._id?.substring(0, 8) || "Không xác định"}
                      </Typography>
                      <Typography>
                        <strong>Số lượng:</strong> {selectedReturn.quantity}
                      </Typography>
                      <Typography>
                        <strong>Nhà cung cấp:</strong>{" "}
                        {selectedReturn.supplierId?.name || "Không xác định"}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Lý do trả hàng:
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}
                  >
                    <Typography>{selectedReturn.reason}</Typography>
                  </Paper>
                </Grid>
                
                {/* Add an info message for completed returns */}
                {/* {selectedReturn.status === 'completed' && (
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Phiếu đã hoàn thành không thể hủy. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.
                    </Alert>
                  </Grid>
                )} */}
                
                {selectedReturn.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Ghi chú:
                    </Typography>
                    <Paper
                      elevation={0}
                      sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}
                    >
                      <Typography>{selectedReturn.notes}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              {selectedReturn.status === 'pending' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleStatusUpdate(selectedReturn._id, 'completed')}
                  >
                    Xác nhận hoàn thành
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleStatusUpdate(selectedReturn._id, 'cancelled')}
                  >
                    Hủy phiếu
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleResendEmail(selectedReturn._id)}
                  >
                    Gửi lại email
                  </Button>
                </>
              )}
              <Button onClick={() => setDialogOpen(false)}>Đóng</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}

export default ReturnHistory;
