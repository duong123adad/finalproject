import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';

const AddToInventory = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [createdBatches, setCreatedBatches] = useState([]);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState({
    receiptId: null,
    itemIndex: null,
    showDetails: false
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('http://localhost:8000/api/goodreceipt',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      const pendingReceipts = res.data.filter(r => r.status === 'draft' || r.status === 'partially_received');
      setReceipts(pendingReceipts);
    } catch (error) {
      console.error('Error fetching good receipts:', error);
      setError(error.response?.data?.message || 'Failed to load good receipts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleConfirm = async (receiptId) => {
    try {
      setProcessingId(receiptId);
      setError(null);
      setErrorDetails({ receiptId: null, itemIndex: null, showDetails: false });
      
      // Add authorization header if needed
      const token = localStorage.getItem('accessToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const res = await axios.patch(`http://localhost:8000/api/goodreceipt/confirm/${receiptId}`, {}, config);
      
      if (res.data.batches && Array.isArray(res.data.batches)) {
        // Map through batches to ensure consistent property names
        const formattedBatches = res.data.batches.map(batch => ({
          ...batch,
          productName: batch.productName || (batch.product && batch.product.name) || '',
          manufactureDate: batch.manufacture_day || batch.manufactureDate,
          expiryDate: batch.expiry_day || batch.expiryDate,
          import_price: batch.unitPrice || batch.import_price || 0
        }));
        setCreatedBatches(formattedBatches);
      }
      
      fetchReceipts();
      
      alert('Lô hàng đã được chuyển vào kho thành công!');
    } catch (error) {
      console.error('Error confirming good receipt:', error);
      
      // Enhanced error handling
      let errorMessage = 'Xác nhận thất bại: ';
      
      // Handle specific item validation errors
      if (error.response?.data?.itemIndex !== undefined) {
        const itemIndex = error.response.data.itemIndex;
        errorMessage += `${error.response.data.message}\n\n`;
        errorMessage += `Vui lòng kiểm tra lại thông tin phiếu nhập kho và đảm bảo tất cả sản phẩm có ID hợp lệ.`;
        
        // Save error details for rendering problem item details
        setErrorDetails({
          receiptId: processingId,
          itemIndex: itemIndex,
          showDetails: true
        });
        
        // Get the affected receipt to highlight it in the UI
        const affectedReceipt = receipts.find(r => r._id === receiptId);
        if (affectedReceipt && affectedReceipt.items && affectedReceipt.items[itemIndex]) {
          const problematicItem = affectedReceipt.items[itemIndex];
          errorMessage += `\n\nThông tin mục có vấn đề: ${problematicItem.productName || 'Sản phẩm không xác định'} (Vị trí: ${itemIndex + 1})`;
        }
      } else {
        // Generic error handling
        errorMessage += error.response?.data?.message || error.response?.data?.error || 'Đã xảy ra lỗi không xác định';
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const renderReceiptItemDetails = () => {
    if (!errorDetails.showDetails) return null;
    
    const receipt = receipts.find(r => r._id === errorDetails.receiptId);
    if (!receipt) return null;
    
    return (
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0', mt: 2 }}>
        <Typography variant="h6" gutterBottom>Chi tiết phiếu nhập có vấn đề:</Typography>
        <Typography><strong>ID phiếu:</strong> {receipt._id}</Typography>
        <Typography><strong>Nhà cung cấp:</strong> {receipt.supplier?.name || 'N/A'}</Typography>
        
        <Box mt={2}>
          <Typography variant="subtitle1"><strong>Danh sách sản phẩm:</strong></Typography>
          <Box sx={{ maxHeight: '250px', overflowY: 'auto', pl: 2, pr: 2 }}>
            {receipt.items?.map((item, idx) => (
              <Paper 
                key={idx}
                sx={{ 
                  p: 2, 
                  my: 1, 
                  bgcolor: idx === errorDetails.itemIndex ? '#ffebee' : '#fafafa',
                  border: idx === errorDetails.itemIndex ? '1px solid #f44336' : '1px solid #e0e0e0',
                }}
              >
                <Typography color={idx === errorDetails.itemIndex ? "error" : "textPrimary"}>
                  <strong>Mục #{idx + 1}:</strong> {idx === errorDetails.itemIndex ? '(Có vấn đề)' : ''}
                </Typography>
                <Box ml={2}>
                  <Typography><strong>Tên sản phẩm:</strong> {item.productName || 'N/A'}</Typography>
                  <Typography><strong>ID sản phẩm:</strong> {item.productId || 'Không xác định'}</Typography>
                  <Typography><strong>Số lượng:</strong> {item.quantity}</Typography>
                  <Typography><strong>Đơn vị:</strong> {item.unit || 'N/A'}</Typography>
                  <Typography><strong>Đơn giá:</strong> {item.unitPrice?.toLocaleString('vi-VN') || 'N/A'} VNĐ</Typography>
                </Box>
                {idx === errorDetails.itemIndex && (
                  <Box mt={1} p={1} bgcolor="#fff8e1" borderRadius={1}>
                    <Typography color="error">
                      <strong>Vấn đề:</strong> ID sản phẩm không tồn tại hoặc không hợp lệ. 
                      Vui lòng kiểm tra lại phiếu đặt hàng gốc và đảm bảo mã sản phẩm chính xác.
                    </Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        </Box>
        
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button 
            size="small" 
            variant="outlined" 
            color="primary" 
            onClick={() => setErrorDetails(prev => ({...prev, showDetails: false}))}
          >
            Ẩn chi tiết
          </Button>
        </Box>
      </Paper>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Chuyển phiếu nhập kho vào kho hàng
      </Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee' }}>
          <Typography color="error" sx={{ whiteSpace: 'pre-line' }}>{error}</Typography>
          {errorDetails.showDetails && (
            <Button 
              size="small" 
              variant="outlined" 
              color="error" 
              sx={{ mt: 1 }}
              onClick={() => setErrorDetails(prev => ({...prev, showDetails: !prev.showDetails}))}
            >
              {errorDetails.showDetails ? 'Ẩn chi tiết' : 'Hiển thị chi tiết'}
            </Button>
          )}
        </Paper>
      )}
      
      {errorDetails.showDetails && renderReceiptItemDetails()}

      {loading && receipts.length === 0 ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : receipts.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Không có phiếu nhập kho nào đang chờ xử lý</Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            maxHeight: '500px',
            overflowY: 'auto',
            mb: 4,
          }}
        >
          {receipts.map((receipt) => (
            <Paper 
              key={receipt._id} 
              sx={{ 
                p: 3, 
                mb: 2, 
                border: '1px solid #ddd',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: 3,
                  borderColor: theme.palette.primary.light
                }
              }}
            >
              <Stack direction={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={2}>
                <Box flex={1}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Phiếu #{receipt.receiptDate ? formatDate(receipt.receiptDate) : 'N/A'}
                  </Typography>
                  <Typography>ID: {receipt._id}</Typography>
                  <Typography>Nhà cung cấp: {receipt.supplier?.name || 'N/A'}</Typography>
                  <Typography>Số lượng mặt hàng: {receipt.items?.length || 0}</Typography>
                  <Typography>Tổng tiền: {receipt.totalAmount?.toLocaleString('vi-VN')} VNĐ</Typography>
                  <Box mt={1}>
                    <Chip
                      label={receipt.status === 'draft' ? 'Chờ xử lý' : 'Đã nhận một phần'}
                      color={receipt.status === 'draft' ? 'primary' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  disabled={processingId === receipt._id}
                  onClick={() => handleConfirm(receipt._id)}
                  startIcon={processingId === receipt._id ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{ minWidth: 150 }}
                >
                  {processingId === receipt._id ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      {createdBatches.length > 0 && (
        <Box mt={5}>
          <Divider />
          <Typography variant="h6" mt={3} mb={2} fontWeight="bold">
            Lô hàng đã được tạo:
          </Typography>
          <Stack spacing={2}>
            {createdBatches.map((batch) => (
              <Paper key={batch._id} sx={{ p: 3, bgcolor: '#f1f8e9', borderLeft: '4px solid #689f38' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Lô hàng ID: {batch._id}
                </Typography>
                <Stack direction={isMobile ? "column" : "row"} spacing={3} flexWrap="wrap">
                  <Box minWidth={200}>
                    <Typography><strong>Sản phẩm:</strong> {batch.productName || batch.product?.name || batch.productId}</Typography>
                    <Typography><strong>Số lượng:</strong> {batch.quantity}</Typography>
                  </Box>
                  <Box minWidth={200}>
                    <Typography><strong>Ngày SX:</strong> {formatDate(batch.manufactureDate)}</Typography>
                    <Typography><strong>Hạn SD:</strong> {formatDate(batch.expiryDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography><strong>Đơn giá:</strong> {batch.import_price?.toLocaleString('vi-VN') || 'N/A'} VNĐ</Typography>
                    <Typography><strong>Trạng thái:</strong> {batch.status || 'active'}</Typography>
                    <Typography><strong>Mã lô hàng:</strong> {batch.batchCode || 'N/A'}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default AddToInventory;