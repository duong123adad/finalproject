import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Avatar,
  Stack
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  FilterList,
  Search,
  History,
  PriceChange,
  Assessment,
  Refresh
} from '@mui/icons-material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import axios from 'axios';

const PriceHistory = () => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statistics, setStatistics] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    changeType: '',
    startDate: '',
    endDate: '',
    productId: ''
  });

  const authHeader = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await axios.get(
        `https://panddretailshop.onrender.com/api/priceHistory?${queryParams}`,
        { headers: authHeader() }
      );

      if (response.data.success) {
        setPriceHistory(response.data.data);
        setTotalRecords(response.data.pagination.totalRecords);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải lịch sử thay đổi giá');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await axios.get(
        `https://panddretailshop.onrender.com/api/priceHistory/statistics?${queryParams}`,
        { headers: authHeader() }
      );

      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê:', err);
    }
  };

  useEffect(() => {
    fetchPriceHistory();
    fetchStatistics();
  }, [page, rowsPerPage, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      changeType: '',
      startDate: '',
      endDate: '',
      productId: ''
    });
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getChangeTypeIcon = (changeType) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp color="success" />;
      case 'decrease':
        return <TrendingDown color="error" />;
      default:
        return <PriceChange color="info" />;
    }
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'increase':
        return 'success';
      case 'decrease':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatPercentage = (percentage) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History color="primary" />
          Lịch sử thay đổi giá
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Theo dõi và quản lý các thay đổi giá sản phẩm trong hệ thống
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Tổng số thay đổi
                    </Typography>
                    <Typography variant="h4">
                      {statistics.general.totalChanges}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <History />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Tăng giá
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {statistics.general.priceIncreases}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <TrendingUp />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Giảm giá
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {statistics.general.priceDecreases}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <TrendingDown />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Thay đổi TB
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(statistics.general.avgPriceChange || 0)}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <Assessment />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList />
          Bộ lọc
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Tìm kiếm sản phẩm"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Loại thay đổi</InputLabel>
              <Select
                value={filters.changeType}
                onChange={(e) => handleFilterChange('changeType', e.target.value)}
                label="Loại thay đổi"
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="increase">Tăng giá</MenuItem>
                <MenuItem value="decrease">Giảm giá</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Từ ngày"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Đến ngày"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={1}>
            <Tooltip title="Đặt lại bộ lọc">
              <IconButton 
                color="secondary" 
                onClick={handleResetFilters}
                sx={{ 
                  width: '100%', 
                  height: 56,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Price History Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sản phẩm</TableCell>
                <TableCell>Đơn vị</TableCell>
                <TableCell align="right">Giá cũ</TableCell>
                <TableCell align="right">Giá mới</TableCell>
                <TableCell align="center">Thay đổi</TableCell>
                <TableCell align="center">Phần trăm</TableCell>
                <TableCell>Người thay đổi</TableCell>
                <TableCell>Thời gian</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : priceHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body1" color="text.secondary">
                      Không có dữ liệu lịch sử thay đổi giá
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                priceHistory.map((history) => (
                  <TableRow key={history._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {history.productId?.images?.[0] && (
                          <Avatar
                            src={history.productId.images[0]}
                            alt={history.productId.name}
                            sx={{ width: 32, height: 32 }}
                          />
                        )}
                        <Box>
                          <Typography variant="subtitle2">
                            {history.productId?.name || 'Không xác định'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {history.productId?.SKU || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={history.unitName} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(history.oldPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(history.newPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={getChangeTypeIcon(history.changeType)}
                        label={formatCurrency(history.priceChange)}
                        color={getChangeTypeColor(history.changeType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={history.changeType === 'increase' ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {formatPercentage(history.changePercentage)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {history.changedBy?.fullName || 'Không xác định'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{history.changedBy?.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(history.changeDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
          }
        />
      </Paper>
    </Container>
  );
};

export default PriceHistory;
