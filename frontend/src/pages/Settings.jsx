import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Divider,
  Snackbar,
  Alert,
  InputAdornment
} from '@mui/material';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [expiryThreshold, setExpiryThreshold] = useState(settings.expiryThresholdDays.toString());
  const [quantityThreshold, setQuantityThreshold] = useState(settings.lowQuantityThreshold.toString());
  const [discount7, setDiscount7] = useState(settings.discountPercent7 || "30");
  const [discount14, setDiscount14] = useState(settings.discountPercent14 || "15");
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const handleExpiryThresholdChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setExpiryThreshold(value);
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setQuantityThreshold(value);
  };

  const handleDiscount7Change = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setDiscount7(value);
  };

  const handleDiscount14Change = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setDiscount14(value);
  };

  const handleSave = () => {
    const expiryValue = parseInt(expiryThreshold, 10);
    const quantityValue = parseInt(quantityThreshold, 10);
    const discount7Value = parseInt(discount7, 10);
    const discount14Value = parseInt(discount14, 10);

    if (isNaN(expiryValue) || expiryValue <= 0) {
      setNotification({
        open: true,
        message: 'Số ngày cảnh báo hết hạn không hợp lệ',
        severity: 'error'
      });
      return;
    }
    if (isNaN(quantityValue) || quantityValue <= 0) {
      setNotification({
        open: true,
        message: 'Ngưỡng số lượng thấp không hợp lệ',
        severity: 'error'
      });
      return;
    }
    if (isNaN(discount7Value) || discount7Value < 0 || discount7Value > 100) {
      setNotification({
        open: true,
        message: 'Phần trăm giảm giá 7 ngày không hợp lệ',
        severity: 'error'
      });
      return;
    }
    if (isNaN(discount14Value) || discount14Value < 0 || discount14Value > 100) {
      setNotification({
        open: true,
        message: 'Phần trăm giảm giá 14 ngày không hợp lệ',
        severity: 'error'
      });
      return;
    }

    updateSettings({
      expiryThresholdDays: expiryValue,
      lowQuantityThreshold: quantityValue,
      discountPercent7: discount7Value,
      discountPercent14: discount14Value,
    });

    setNotification({
      open: true,
      message: 'Đã lưu cài đặt thành công',
      severity: 'success'
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Cài đặt hệ thống
      </Typography>
      
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Cài đặt ngưỡng cảnh báo hàng tồn kho mặc định
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Ngưỡng cảnh báo sắp hết hạn mặc định"
            value={expiryThreshold}
            onChange={handleExpiryThresholdChange}
            fullWidth
            helperText="Số ngày trước khi sản phẩm hết hạn sẽ hiển thị cảnh báo (có thể thiết lập riêng cho từng sản phẩm)"
            InputProps={{
              endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
            }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Giảm giá (%) khi còn ≤ 7 ngày"
              value={discount7}
              onChange={handleDiscount7Change}
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                inputProps: { min: 0, max: 100 }
              }}
              sx={{ flex: 1 }}
              helperText="Áp dụng cho sản phẩm còn hạn ≤ 7 ngày"
            />
            <TextField
              label="Giảm giá (%) khi còn ≤ 14 ngày"
              value={discount14}
              onChange={handleDiscount14Change}
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                inputProps: { min: 0, max: 100 }
              }}
              sx={{ flex: 1 }}
              helperText="Áp dụng cho sản phẩm còn hạn ≤ 14 ngày"
            />
          </Box>
          
          <Alert severity="info" sx={{ mt: -2 }}>
            <Typography variant="body2">
              Lưu ý: Những sản phẩm đạt đến ngưỡng sắp hết hạn sẽ được tự động giảm giá theo phần trăm bạn thiết lập ở trên. Nhân viên có thể bỏ hoặc thêm tùy chọn giảm giá trong khi bán sản phẩm.
            </Typography>
          </Alert>
          
          <TextField
            label="Ngưỡng cảnh báo số lượng thấp mặc định"
            value={quantityThreshold}
            onChange={handleQuantityChange}
            fullWidth
            helperText="Số lượng tồn kho thấp sẽ hiển thị cảnh báo (có thể thiết lập riêng cho từng sản phẩm)"
            InputProps={{
              endAdornment: <InputAdornment position="end">sản phẩm</InputAdornment>,
            }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSave}
            >
              Lưu cài đặt
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;