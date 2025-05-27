import React, { useState } from "react";
import { Box, TextField, Button, Typography, Stack, Alert } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.post(
                "http://localhost:8000/api/auth/request-password-reset",
                { email },
                {
                  withCredentials: true, // Important for sending cookies
              }
            );
            setSuccess(response.data.message);
            // Lưu email để sử dụng ở trang Verify Reset OTP
            localStorage.setItem("resetEmail", email);
            setTimeout(() => {
                navigate("/verify-reset-otp");
            }, 2000); // Chuyển hướng sau 2 giây
        } catch (err) {
            setError(err.response?.data?.error || "Yêu cầu đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại email.");
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
                background: "linear-gradient(to right, #E3F2FD, #BBDEFB)",
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
                    Quên Mật Khẩu
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Vui lòng nhập email đã đăng ký để đặt lại mật khẩu.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} width="100%">
                    <TextField
                        label="Email"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        sx={{ mt: 2, bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
                        disabled={loading}
                    >
                        {loading ? "Đang gửi yêu cầu..." : "Gửi Yêu Cầu"}
                    </Button>
                    <Button
                        fullWidth
                        sx={{ mt: 1 }}
                        onClick={() => navigate("/login")}
                    >
                        Quay lại đăng nhập
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
};

export default ForgotPasswordPage;