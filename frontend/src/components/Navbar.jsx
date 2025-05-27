import React, { useState, useEffect } from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
} from "@mui/material";
import { Logout, AccountCircle } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Navbar = ({ onLogout }) => {
    const [openDialog, setOpenDialog] = useState(false);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const userId = localStorage.getItem('userID');
            const authToken = localStorage.getItem('authToken');

            if (!userId || !authToken) {
                setUsername("Guest");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`http://localhost:8000/api/user/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                    },
                });
                setUsername(response.data.username); // Giả sử API trả về username
            } catch (error) {
                console.error("Lỗi khi lấy thông tin người dùng:", error);
                setError("Không thể tải thông tin người dùng.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []); // Chỉ chạy một lần sau khi component mount

    const handleLogoutClick = () => {
        setOpenDialog(true);
    };

    const handleConfirmLogout = () => {
        setOpenDialog(false);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userID');
        localStorage.removeItem('userRole');
        onLogout(); // Gọi hàm đăng xuất từ props (nếu có logic cụ thể nào đó ở component cha)
        navigate('/'); // Chuyển hướng về trang landing
    };

    const handleCancelLogout = () => {
        setOpenDialog(false);
    };

    return (
        <>
            <AppBar position="sticky" sx={{ backgroundColor: "#1976d2" }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <AccountCircle />
                        {loading ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : error ? (
                            <Typography variant="body1" color="error">{error}</Typography>
                        ) : (
                            <Typography variant="body1">Xin chào, {username}</Typography>
                        )}

                        <IconButton color="inherit" onClick={handleLogoutClick}>
                            <Logout />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            <Dialog open={openDialog} onClose={handleCancelLogout}>
                <DialogTitle>Xác nhận đăng xuất?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn chắc chắn muốn đăng xuất khỏi tài khoản của mình?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelLogout} color="inherit">
                        Hủy
                    </Button>
                    <Button onClick={handleConfirmLogout} color="error" autoFocus>
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Navbar;