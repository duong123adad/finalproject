import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  IconButton,
  InputAdornment,
  Stack,
  Link,
  useMediaQuery,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  Language,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isMobile = useMediaQuery("(max-width:600px)");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        "http://localhost:8000/api/auth/login",
        {
          username: username,
          password: password,
        }
      );

      // Lưu thông tin người dùng vào localStorage
      localStorage.setItem("authToken", response.data.accessToken);
      localStorage.setItem("userID", response.data._id);
      localStorage.setItem("userRole", response.data.role);
      localStorage.setItem("fullName", response.data.fullName);

      // Kiểm tra userRole và chuyển hướng phù hợp
      if (response.data.role === "customer") {
        navigate("/products_page");
      } else {
        navigate("/Sales_page");
      }
    } catch (err) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
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
        background: "linear-gradient(to right, #FFDEE9, #B5FFFC)",
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
          width: { xs: "100%", sm: 420 },
          maxWidth: "90%",
          position: "relative",
        }}
      >
        <Box display="flex" justifyContent="flex-end" width="100%" gap={1}>
          <IconButton onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton>
            <Language />
          </IconButton>
        </Box>

        <Typography
          variant="h4"
          fontWeight="bold"
          color="primary"
          textAlign="center"
        >
          Retail Shop
        </Typography>

        {error && (
          <Typography color="error" textAlign="center">
            {error}
          </Typography>
        )}

        <Box component="form" onSubmit={handleLogin} width="100%">
          <TextField
            label="Tên tài khoản"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            }
            label="Nhớ tài khoản"
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
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </Box>
        <Stack direction="row" justifyContent="space-between" width="100%">
          <Link
            href="#" 
            variant="body2"
            sx={{
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
            onClick={(e) => {
              e.preventDefault(); 
              navigate("/forgot-password"); 
            }}
          >
            Quên mật khẩu?
          </Link>
          <Link
            href="#"  
            variant="body2"
            sx={{
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
            onClick={(e) => {
              e.preventDefault(); 
              navigate("/register");
            }}
          >
            Tạo tài khoản
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
};

export default LoginPage;
