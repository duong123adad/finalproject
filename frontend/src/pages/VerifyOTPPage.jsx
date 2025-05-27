import React, { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Stack, Alert } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const VerifyOTPPage = () => {
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [resendLoading, setResendLoading] = useState(false);
    const [resendError, setResendError] = useState("");
    const [resendSuccess, setResendSuccess] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const storedEmail = localStorage.getItem("registrationEmail");
        if (!storedEmail) {
            navigate("/register"); // Nếu không có email, quay lại trang đăng ký
        }
        setEmail(storedEmail);
    }, [navigate]);

    useEffect(() => {
        if (registrationSuccess) {
            const timer = setTimeout(() => {
                navigate("/login");
            }, 2000); // Chuyển hướng sau 3 giây
            return () => clearTimeout(timer); // Cleanup timer
        }
    }, [registrationSuccess, navigate]);

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await axios.post(
                "http://localhost:8000/api/auth/verify-customer-signup",
                { otp },
                {
                    withCredentials: true, // Important for sending cookies
                }
            );
            localStorage.removeItem("registrationEmail");
            console.log("Registration successful:", response.data);
            setRegistrationSuccess(true); // Hiển thị thông báo thành công
        } catch (err) {
            setError(err.response?.data?.error || "Xác thực OTP thất bại. Vui lòng kiểm tra lại.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setResendLoading(true);
        setResendError("");
        setResendSuccess(false);

        try {
            const storedEmail = localStorage.getItem("registrationEmail");
            if (!storedEmail) {
                setResendError("Không tìm thấy email đăng ký.");
                return;
            }
            const response = await axios.post(
                "http://localhost:8000/api/auth/initiate-customer-signup", // Gọi lại API gửi OTP
                { email: storedEmail },
                {
                    withCredentials: true, // Important for sending cookies
                }
            );
            setResendSuccess(true);
            console.log("OTP resend:", response.data);
        } catch (err) {
            setResendError(err.response?.data?.error || "Gửi lại OTP thất bại. Vui lòng thử lại sau.");
            console.error(err);
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <Box
            display="flex"
            height="100vh"
            alignItems="center"
            justifyContent="center"
            sx={{
                background: "linear-gradient(to right, #FFF8E1, #FFECB3)",
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
                    Xác Thực OTP
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Mã OTP đã được gửi đến email: <strong>{email}</strong>
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                )}
                {resendError && (
                    <Alert severity="error" sx={{ mt: 2 }}>{resendError}</Alert>
                )}
                {resendSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>OTP đã được gửi lại!</Alert>
                )}
                {registrationSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>Đăng ký tài khoản thành công!</Alert>
                )}

                {!registrationSuccess && (
                    <Box component="form" onSubmit={handleVerifyOTP} width="100%">
                        <TextField
                            label="Mã OTP"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2, bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
                            disabled={loading}
                        >
                            {loading ? "Đang xác thực..." : "Xác Thực"}
                        </Button>
                    </Box>
                )}

                {!registrationSuccess && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button
                            onClick={handleResendOTP}
                            disabled={resendLoading}
                            size="small"
                        >
                            {resendLoading ? "Đang gửi lại..." : "Gửi lại OTP"}
                        </Button>
                    </Box>
                )}
            </Stack>
        </Box>
    );
};

export default VerifyOTPPage;