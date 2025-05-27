import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';

const QRPayment = ({ open, onClose, order, onPaymentSuccess }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleConfirmPaid = async () => {
    try {
      await axios.post(
        'http://localhost:8000/api/payment/confirm-manual',
        {
          orderId: order._id,
          transactionId: `MOMO_${Date.now()}`,
          note: 'Xác nhận thanh toán MoMo'
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (error) {
      alert('Có lỗi khi xác nhận thanh toán!');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Thanh toán đơn hàng #{order?.orderNumber}
      </DialogTitle>
      
      <DialogContent>
        {/* MoMo Payment */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Thanh toán qua MoMo
            </Typography>
            
            <Box textAlign="center">
              {/* Hiển thị số tiền cần chuyển */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(order?.finalAmount || 0)}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Số tiền cần chuyển
                </Typography>
              </Box>
              
              {/* Hiển thị hình ảnh QR MoMo từ thư mục public */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                border: '3px solid #e91e63',
                borderRadius: 2,
                p: 2,
                bgcolor: '#fff',
                mb: 3
              }}>
                <img
                  src="/momo-qr.jpg"
                  alt="MoMo QR Code"
                  style={{ 
                    maxWidth: '250px', 
                    height: 'auto',
                    borderRadius: '8px'
                  }}
                  onError={(e) => {
                    e.target.src = '/images/momo-qr.jpg';
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Đóng
        </Button>
        <Button 
          onClick={() => {
            alert('Vui lòng thông báo cho nhân viên để xác nhận thanh toán thủ công!');
          }} 
          variant="text"
        >
          Báo nhân viên
        </Button>
        <Button
          onClick={handleConfirmPaid}
          variant="contained"
          color="primary"
        >
          Xác nhận tạo hóa đơn thành công
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRPayment;
