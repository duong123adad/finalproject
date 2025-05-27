import React, { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Stack, Alert } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const VerifyResetOTPPage = () => {
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false); // State cho thông báo thành công
    const navigate = useNavigate();

    useEffect(() => {
        const storedEmail = localStorage.getItem("resetEmail");
        if (!storedEmail) {
            navigate("/forgot-password"); // Nếu không có email, quay lại trang quên mật khẩu
        }
        setEmail(storedEmail);
    }, [navigate]);

    useEffect(() => {
        if (resetSuccess) {
            const timer = setTimeout(() => {
                navigate("/login");
            }, 2000); // Chuyển hướng sau 2 giây
            return () => clearTimeout(timer); // Cleanup timer
        }
    }, [resetSuccess, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setError("Mật khẩu mới không khớp");
            return;
        }

        setLoading(true);
        setError("");
        setResetSuccess(false); // Reset trạng thái thành công khi submit lại

        try {
            const response = await axios.post(
                "http://localhost:8000/api/auth/verify-reset-password",
                { otp, newPassword },
                {
                    withCredentials: true, // Important for sending cookies
                }
            );
            console.log("Password reset successful:", response.data);
            localStorage.removeItem("resetEmail");
            setResetSuccess(true); // Hiển thị thông báo thành công
        } catch (err) {
            setError(err.response?.data?.error || "Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại OTP và thử lại.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            display="flex"
            height="100vh"
            alignItems="center"
            justifyContent="center"
            sx={{
                background: "linear-gradient(to right, #E0F7FA, #B2EBF2)",
                px: 2,
            }}
        >
            <Stack
                spacing={3}
                p={4}
                sx={{
                    backgroundColor: "white",
                    borderRadius: 3,
                    boxShadow: 3,
                    width: { xs: "100%", sm: 360 },
                    maxWidth: "90%",
                }}
            >
                <Typography variant="h4" fontWeight="bold" color="primary" textAlign="center">
                    Đặt Lại Mật Khẩu
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Mã OTP đã được gửi đến email: <strong>{email}</strong>. Vui lòng nhập OTP và mật khẩu mới.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                )}
                {resetSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>Đặt lại mật khẩu thành công!</Alert>
                )}

                {!resetSuccess && (
                    <Box component="form" onSubmit={handleSubmit} width="100%">
                        <TextField
                            label="Mã OTP"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                        <TextField
                            label="Mật Khẩu Mới"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <TextField
                            label="Xác Nhận Mật Khẩu Mới"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2, bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
                            disabled={loading}
                        >
                            {loading ? "Đang đặt lại..." : "Đặt Lại Mật Khẩu"}
                        </Button>
                        <Button
                            fullWidth
                            sx={{ mt: 1 }}
                            onClick={() => navigate("/login")}
                        >
                            Quay lại đăng nhập
                        </Button>
                    </Box>
                )}
            </Stack>
        </Box>
    );
};

export default VerifyResetOTPPage;