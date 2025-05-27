import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  IconButton,
  InputAdornment,
  Link,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(""); // Thêm state cho lỗi số điện thoại
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Hàm kiểm tra định dạng số điện thoại
  const validatePhone = (value) => {
    if (!value) return "Số điện thoại là bắt buộc";
    if (!/^\d{10,15}$/.test(value)) return "Số điện thoại phải từ 10-15 chữ số";
    return "";
  };

  // Xử lý thay đổi số điện thoại
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);
    setPhoneError(validatePhone(value));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Kiểm tra số điện thoại trước khi gửi
    const phoneValidation = validatePhone(phone);
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        "https://panddretailshop.onrender.com/api/auth/initiate-customer-signup",
        {
          username,
          password,
          fullName,
          email,
          phone,
        },
        {
          withCredentials: true, // Important for sending cookies in cross-origin requests
        }
      );
      // Lưu thông tin cần thiết và chuyển hướng đến trang xác thực OTP
      localStorage.setItem("registrationEmail", email);
      navigate("/verify-otp"); // Chuyển đến trang xác thực OTP
      console.log("OTP sent:", response.data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Đăng ký thất bại. Vui lòng thử lại."
      );
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
          width: { xs: "100%", sm: 480 },
          maxWidth: "90%",
        }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          color="primary"
          textAlign="center"
        >
          Tạo Tài Khoản
        </Typography>

        {error && (
          <Typography color="error" textAlign="center">
            {error}
          </Typography>
        )}

        <Box component="form" onSubmit={handleRegister} width="100%">
          <TextField
            label="Tên tài khoản"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label="Họ và tên"
            variant="outlined"
            fullWidth
            margin="normal"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <TextField
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Số điện thoại"
            variant="outlined"
            fullWidth
            margin="normal"
            value={phone}
            onChange={handlePhoneChange}
            required
            error={!!phoneError}
            helperText={phoneError}
          />
          <TextField
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Xác nhận mật khẩu"
            type={showConfirmPassword ? "text" : "password"}
            variant="outlined"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 2,
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            }}
            disabled={loading}
          >
            {loading ? "Đang đăng ký..." : "Đăng Ký"}
          </Button>
        </Box>
        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          Đã có tài khoản?{" "}
          <Link href="#" onClick={() => navigate("/login")} color="primary">
            Đăng nhập
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
};

export default RegisterPage;
