import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import axios from 'axios';
// import { formatCurrency } from '../utils/formatCurrency.js';

// Local currency formatter function
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

const ProductPerformance = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('month');
  const [filterDate, setFilterDate] = useState(new Date());
  const [filterStart, setFilterStart] = useState(null);
  const [filterEnd, setFilterEnd] = useState(null);
  const [topCount, setTopCount] = useState(10);

  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // console.log('Fetching orders from:', 'https://panddretailshop.onrender.com/api/order');
      // console.log('Auth token:', authToken ? 'Present' : 'Missing');
      
      // Try multiple possible endpoints
      let response;
      const possibleEndpoints = [
        'https://panddretailshop.onrender.com/api/order',
        'https://panddretailshop.onrender.com/api/orders',
        'https://panddretailshop.onrender.com/api/order',
        'https://panddretailshop.onrender.com/api/orders'
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          // console.log(`Trying endpoint: ${endpoint}`);
          response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          // console.log(`Success with endpoint: ${endpoint}`);
          break;
        } catch (endpointError) {
          // console.log(`Failed with endpoint: ${endpoint}`, endpointError.response?.status);
          if (endpoint === possibleEndpoints[possibleEndpoints.length - 1]) {
            throw endpointError; // Throw the last error if all endpoints fail
          }
        }
      }
      
      // console.log('Response status:', response.status);
      // console.log('Response data:', response.data);
      
      // Handle different response structures
      const ordersData = response.data?.orders || response.data?.data || response.data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      // console.error('Lỗi khi lấy dữ liệu đơn hàng:', error);
      // console.error('Error response:', error.response?.data);
      // console.error('Error status:', error.response?.status);
      
      // For development, set some mock data to test the UI
      // console.log('Setting mock data for development...');
      setOrders([]);
      setError(`API không khả dụng (${error.response?.status || error.message}). Hiển thị dữ liệu mẫu.`);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    // console.log('All orders:', orders);
    // console.log('Orders length:', orders.length);
    
    // Filter orders - since the data shows orders are already 'paid', we'll focus on that
    let filtered = orders.filter(order => {
      // Log each order to see its structure
      // console.log('Order status:', order.status, 'Payment status:', order.paymentStatus);
      
      // Check for paid orders (since that's what we see in the data)
      const isPaid = order.paymentStatus === 'paid';
      
      // If there's no status field or it's undefined, assume completed if paid
      const isCompleted = !order.status || order.status === 'completed' || order.status === 'instore';
      
      return isPaid && isCompleted;
    });

    console.log('Filtered orders after status filter:', filtered.length);

    const now = new Date();
    
    switch (filterType) {
      case 'day':
        if (filterDate) {
          const selectedDate = new Date(filterDate);
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.createdAt);
            return (
              orderDate.getDate() === selectedDate.getDate() &&
              orderDate.getMonth() === selectedDate.getMonth() &&
              orderDate.getFullYear() === selectedDate.getFullYear()
            );
          });
        }
        break;
      case 'month':
        if (filterDate) {
          const selectedDate = new Date(filterDate);
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.createdAt);
            return (
              orderDate.getMonth() === selectedDate.getMonth() &&
              orderDate.getFullYear() === selectedDate.getFullYear()
            );
          });
        }
        break;
      case 'custom':
        if (filterStart && filterEnd) {
          const start = new Date(filterStart);
          const end = new Date(filterEnd);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= start && orderDate <= end;
          });
        }
        break;
      default:
        break;
    }

    // console.log('Final filtered orders:', filtered.length);
    return filtered;
  }, [orders, filterType, filterDate, filterStart, filterEnd]);

  const productStats = useMemo(() => {
    const stats = {};
    
    // console.log('Processing product stats from orders:', filteredOrders.length);

    filteredOrders.forEach(order => {
      // console.log('Processing order:', order._id, 'Products:', order.products?.length);
      
      if (order.products && order.products.length > 0) {
        order.products.forEach(item => {
          // console.log('Processing product item:', item);
          
          const productId = item.productId?._id || item.productId;
          const productName = item.productId?.name || 'Sản phẩm không xác định';
          const quantity = item.quantity || 0;
          
          // Calculate actual quantity sold = quantity * unitRatio
          const unitRatio = item.productId?.unitRatio || 1;
          const quantitySold = quantity * unitRatio;
          
          // Calculate actual price (use finalUnitPrice if available, otherwise originalUnitPrice)
          let actualPrice = 0;
          if (item.finalUnitPrice) {
            actualPrice = item.finalUnitPrice * quantity;
          } else if (item.batchesUsed && item.batchesUsed.length > 0) {
            actualPrice = item.batchesUsed.reduce((sum, batch) => {
              let discountPercent = 0;
              if (
                batch.batchId &&
                batch.batchId.discountInfo &&
                typeof batch.batchId.discountInfo.discountValue === 'number'
              ) {
                discountPercent = batch.batchId.discountInfo.discountValue;
              }
              const originalPrice = (item.originalUnitPrice || 0) * quantity;
              const discountAmount = (originalPrice * discountPercent) / 100;
              return sum + (originalPrice - discountAmount);
            }, 0);
          } else {
            actualPrice = (item.originalUnitPrice || 0) * quantity;
          }

          if (!stats[productId]) {
            stats[productId] = {
              productId,
              productName,
              totalQuantity: 0,
              totalRevenue: 0,
              orderCount: 0,
            };
          }

          stats[productId].totalQuantity += quantitySold;
          stats[productId].totalRevenue += actualPrice;
          stats[productId].orderCount += 1;
        });
      }
    });

    // console.log('Product stats:', Object.values(stats));
    return Object.values(stats);
  }, [filteredOrders]);

  const topSellingProducts = useMemo(() => {
    return [...productStats]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, topCount);
  }, [productStats, topCount]);

  const leastSellingProducts = useMemo(() => {
    return [...productStats]
      .sort((a, b) => a.totalQuantity - b.totalQuantity)
      .slice(0, topCount);
  }, [productStats, topCount]);

  const topRevenueProducts = useMemo(() => {
    return [...productStats]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, topCount);
  }, [productStats, topCount]);

  const chartData = useMemo(() => {
    return topSellingProducts.map(product => ({
      name: product.productName.length > 20 
        ? `${product.productName.substring(0, 20)}...` 
        : product.productName,
      quantity: product.totalQuantity,
      revenue: product.totalRevenue,
    }));
  }, [topSellingProducts]);

  const pieData = useMemo(() => {
    return topSellingProducts.slice(0, 5).map((product, index) => ({
      name: product.productName,
      value: product.totalQuantity,
      color: `hsl(${index * 72}, 70%, 50%)`,
    }));
  }, [topSellingProducts]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box sx={{ height: '100vh', overflow: 'auto' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h1" gutterBottom>
            Thống kê hiệu suất sản phẩm
          </Typography>

          {/* Bộ lọc */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Lọc theo thời gian</InputLabel>
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label="Lọc theo thời gian"
                  >
                    <MenuItem value="day">Ngày</MenuItem>
                    <MenuItem value="month">Tháng</MenuItem>
                    <MenuItem value="custom">Khoảng thời gian</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {filterType === 'day' && (
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Chọn ngày"
                    value={filterDate}
                    onChange={(newValue) => setFilterDate(newValue)}
                    format="dd/MM/yyyy"
                  />
                </Grid>
              )}

              {filterType === 'month' && (
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Chọn tháng"
                    value={filterDate}
                    onChange={(newValue) => setFilterDate(newValue)}
                    views={['year', 'month']}
                    openTo="month"
                    format="MM/yyyy"
                  />
                </Grid>
              )}

              {filterType === 'custom' && (
                <>
                  <Grid item xs={12} sm={6} md={2}>
                    <DatePicker
                      label="Từ ngày"
                      value={filterStart}
                      onChange={(newValue) => setFilterStart(newValue)}
                      format="dd/MM/yyyy"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <DatePicker
                      label="Đến ngày"
                      value={filterEnd}
                      onChange={(newValue) => setFilterEnd(newValue)}
                      format="dd/MM/yyyy"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Số lượng hiển thị</InputLabel>
                  <Select
                    value={topCount}
                    onChange={(e) => setTopCount(e.target.value)}
                    label="Số lượng hiển thị"
                  >
                    <MenuItem value={5}>Top 5</MenuItem>
                    <MenuItem value={10}>Top 10</MenuItem>
                    <MenuItem value={20}>Top 20</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Tổng quan */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tổng sản phẩm đã bán
                  </Typography>
                  <Typography variant="h5">
                    {productStats.reduce((sum, p) => sum + p.totalQuantity, 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tổng doanh thu
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(productStats.reduce((sum, p) => sum + p.totalRevenue, 0))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Số loại sản phẩm
                  </Typography>
                  <Typography variant="h5">
                    {productStats.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Đơn hàng đã xử lý
                  </Typography>
                  <Typography variant="h5">
                    {filteredOrders.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Biểu đồ */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Top sản phẩm bán nhiều nhất (Số lượng)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tỷ lệ bán hàng (Top 5)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Bảng thống kê */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom color="success.main">
                  Top sản phẩm bán nhiều nhất
                </Typography>
                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hạng</TableCell>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Doanh thu</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topSellingProducts.map((product, index) => (
                        <TableRow key={product.productId}>
                          <TableCell>
                            <Chip 
                              label={index + 1} 
                              color={index < 3 ? "primary" : "default"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.productName}
                          </TableCell>
                          <TableCell align="right">{product.totalQuantity}</TableCell>
                          <TableCell align="right">{formatCurrency(product.totalRevenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom color="warning.main">
                  Top sản phẩm bán ít nhất
                </Typography>
                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hạng</TableCell>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Doanh thu</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leastSellingProducts.map((product, index) => (
                        <TableRow key={product.productId}>
                          <TableCell>
                            <Chip 
                              label={index + 1} 
                              color="warning"
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.productName}
                          </TableCell>
                          <TableCell align="right">{product.totalQuantity}</TableCell>
                          <TableCell align="right">{formatCurrency(product.totalRevenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Bảng top doanh thu */}
          <Paper sx={{ p: 3, mt: 3, maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom color="primary.main">
              Top sản phẩm có doanh thu cao nhất
            </Typography>
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Hạng</TableCell>
                    <TableCell>Tên sản phẩm</TableCell>
                    <TableCell align="right">Số lượng bán</TableCell>
                    <TableCell align="right">Doanh thu</TableCell>
                    <TableCell align="right">Số đơn hàng</TableCell>
                    <TableCell align="right">Trung bình/đơn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topRevenueProducts.map((product, index) => (
                    <TableRow key={product.productId}>
                      <TableCell>
                        <Chip 
                          label={index + 1} 
                          color={index < 3 ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.productName}
                      </TableCell>
                      <TableCell align="right">{product.totalQuantity}</TableCell>
                      <TableCell align="right">{formatCurrency(product.totalRevenue)}</TableCell>
                      <TableCell align="right">{product.orderCount}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(product.totalRevenue / product.orderCount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Container>
      </Box>
    </LocalizationProvider>
  );
};

export default ProductPerformance;
