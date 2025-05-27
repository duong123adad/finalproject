import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Divider,
  Stack,
  IconButton,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import { format } from 'date-fns';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import StoreIcon from '@mui/icons-material/Store';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

const name = localStorage.getItem("fullName");

const InventoryHistory = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Set default date range to first day and last day of current month
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Last day of current month
    return lastDay;
  });
  
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  
  const authToken = localStorage.getItem("authToken");
  
  useEffect(() => {
    fetchSuppliers();
    fetchReceipts();
  }, []);
  
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/suppliers", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setSuppliers(response.data);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };
  
  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = "http://localhost:8000/api/goodreceipt";
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (supplierFilter) {
        params.append('supplier', supplierFilter);
      }
      
      if (startDate) {
        params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      }
      
      if (endDate) {
        // Set time to end of the day to include the entire end date
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.append('endDate', format(endOfDay, 'yyyy-MM-dd'));
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log("Fetching receipts with URL:", url);
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      setReceipts(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReceipt(null);
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleFilterChange = () => {
    setPage(0);
    fetchReceipts();
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleFilterChange();
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return <Chip label="Nháp" color="warning" size="small" />;
      case 'received':
        return <Chip label="Đã nhận" color="success" size="small" />;
      case 'partially_received':
        return <Chip label="Nhận một phần" color="info" size="small" />;
      case 'pending':
        return <Chip label="Chờ xử lý" color="default" size="small" />;
      case 'cancelled':
        return <Chip label="Đã hủy" color="error" size="small" />;
      default:
        return <Chip label={status || "Không xác định"} color="default" size="small" />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
        {/* <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
          Lịch sử nhập kho
        </Typography> */}
        
        <Paper sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Tìm kiếm"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={handleFilterChange}>
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Nhà cung cấp</InputLabel>
                <Select
                  value={supplierFilter}
                  label="Nhà cung cấp"
                  onChange={(e) => setSupplierFilter(e.target.value)}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {suppliers.map(supplier => (
                    <MenuItem key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Button 
                fullWidth 
                variant="contained" 
                onClick={handleFilterChange}
                startIcon={<FilterAltIcon />}
              >
                Lọc
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Từ ngày"
                value={startDate}
                onChange={setStartDate}
                format="dd/MM/yyyy"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Đến ngày"
                value={endDate}
                onChange={setEndDate}
                format="dd/MM/yyyy"
                minDate={startDate || undefined}
              />
            </Grid>
          </Grid>
        </Paper>
        
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
            {error}
          </Paper>
        ) : receipts.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">Không tìm thấy phiếu nhập kho nào</Typography>
          </Paper>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader aria-label="sticky table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '200px' }}>Mã phiếu</TableCell>
                    <TableCell>Ngày nhận</TableCell>
                    <TableCell>Nhà cung cấp</TableCell>
                    <TableCell>Số sản phẩm</TableCell>
                    <TableCell>Tổng tiền</TableCell>
                    <TableCell align="center">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((receipt) => (
                      <TableRow hover key={receipt._id}>
                        <TableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {receipt._id}
                        </TableCell>
                        <TableCell>{formatDate(receipt.receiptDate)}</TableCell>
                        <TableCell>{receipt.supplier?.name || 'N/A'}</TableCell>
                        <TableCell align="center">{receipt.items?.length || 0}</TableCell>
                        <TableCell>
                          <Typography fontWeight="bold">
                            {receipt.totalAmount 
                              ? receipt.totalAmount.toLocaleString() + ' đ'
                              : receipt.items?.reduce((total, item) => 
                                  total + (item.totalPrice || (item.price * item.quantity) || 0), 0).toLocaleString() + ' đ'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewDetails(receipt)}
                          >
                            Xem phiếu
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={receipts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          {selectedReceipt ? (
            <>
              <DialogTitle>
                Chi tiết phiếu nhập kho
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StoreIcon color="primary" />
                      <Typography variant="subtitle1">
                        <strong>Nhà cung cấp:</strong> {selectedReceipt.supplier?.name || 'N/A'}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarMonthIcon color="primary" />
                      <Typography variant="subtitle1">
                        <strong>Ngày nhận:</strong> {formatDate(selectedReceipt.receiptDate)}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonIcon color="primary" />
                      <Typography variant="subtitle1">
                        <strong>Người nhận:</strong> {name || 'N/A'}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ConfirmationNumberIcon color="primary" />
                      <Typography variant="subtitle1">
                        <strong>Mã đơn đặt hàng:</strong> {selectedReceipt.purchaseOrder || 'N/A'}
                      </Typography>
                    </Stack>
                  </Grid>
                  
                  {selectedReceipt.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        <strong>Ghi chú:</strong>
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="body2">{selectedReceipt.notes}</Typography>
                      </Paper>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Danh sách sản phẩm
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Sản phẩm</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                            <TableCell>Đơn vị</TableCell>
                            <TableCell align="right">Đơn giá</TableCell>
                            <TableCell align="right">Thành tiền</TableCell>
                            <TableCell>Ngày SX</TableCell>
                            <TableCell>Hạn SD</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedReceipt.items?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell sx={{ maxWidth: 150, textOverflow: 'ellipsis' }}>
                                {item.product?.name || item.productName || 'N/A'}
                              </TableCell>
                              <TableCell align="center">{item.quantity_unit}</TableCell>
                              <TableCell>{item.unit || 'N/A'}</TableCell>
                              <TableCell align="center">
                                {item.price ? item.price.toLocaleString() + ' đ' : 'N/A'}
                              </TableCell>
                              <TableCell align="center">
                                {item.totalPrice ? item.totalPrice.toLocaleString() + ' đ' : 
                                 (item.price && item.quantity) ? (item.price * item.quantity).toLocaleString() + ' đ' : 'N/A'}
                              </TableCell>
                              <TableCell>{formatDate(item.manufactureDate || item.manufacture_day)}</TableCell>
                              <TableCell>{formatDate(item.expiryDate || item.expiry_day)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog}>Đóng</Button>
              </DialogActions>
            </>
          ) : (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          )}
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default InventoryHistory;
