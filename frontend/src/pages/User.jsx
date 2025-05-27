import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ListUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'employee',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      const token = localStorage.getItem('authToken');
      try {
        const response = await axios.get('http://localhost:8000/api/user?role=employee', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(response.data);
      } catch (err) {
        setError('Không thể tải danh sách nhân viên');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const renderAddress = (address) => {
    if (!address) return 'Không có địa chỉ';

    const { street, city, state, postalCode, country } = address;
    return (
      <>
        {street && <div>{street}</div>}
        {city && <div>{city}</div>}
        {state && <div>{state}</div>}
        {postalCode && <div>{postalCode}</div>}
        {country && <div>{country}</div>}
      </>
    );
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewEmployee({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'employee',
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewEmployee({
      ...newEmployee,
      [name]: value,
    });
  };

  const handleAddEmployee = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await axios.post('http://localhost:8000/api/auth/create-employee', newEmployee, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccessMessage('Tạo tài khoản nhân viên thành công!');
      setOpenSnackbar(true);
      // Sau khi thêm thành công, tải lại danh sách nhân viên
      const fetchEmployees = async () => {
        try {
          const response = await axios.get('http://localhost:8000/api/user?role=employee', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUsers(response.data);
          handleCloseAddDialog();
        } catch (err) {
          setError('Lỗi khi tải lại danh sách nhân viên');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể thêm nhân viên');
      console.error(err);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="h6" color="error" align="center" mt={4}>
        {error}
      </Typography>
    );
  }

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={4} px={2}>
        <Typography variant="h4">
          Danh Sách Nhân Viên
        </Typography>
        <Button variant="contained" color="primary" onClick={handleOpenAddDialog}>
          Thêm Nhân Viên
        </Button>
      </Box>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User name</TableCell>
              <TableCell>Họ và tên</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Địa Chỉ</TableCell>
              <TableCell>Vai trò</TableCell>
              <TableCell>Ngày Tạo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user._id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>{renderAddress(user.address)}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog thêm nhân viên */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Thêm Nhân Viên Mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="username"
            name="username"
            label="Tên đăng nhập"
            type="text"
            fullWidth
            variant="outlined"
            value={newEmployee.username}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            id="fullName"
            name="fullName"
            label="Họ và tên"
            type="text"
            fullWidth
            variant="outlined"
            value={newEmployee.fullName}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            id="email"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={newEmployee.email}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            id="phone"
            name="phone"
            label="Số điện thoại"
            type="text"
            fullWidth
            variant="outlined"
            value={newEmployee.phone}
            onChange={handleInputChange}
          />
          {/* Vai trò đã mặc định là employee */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Hủy</Button>
          <Button onClick={handleAddEmployee} color="primary">
            Thêm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar thông báo thành công */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ListUsers;