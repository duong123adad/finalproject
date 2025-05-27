import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  Fab,
} from "@mui/material";
import {
  ShoppingCart,
  Store,
  LocalShipping,
  Phone,
  Login,
  PersonAdd,
  Home,
  KeyboardArrowUp,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  // Handle scroll to top visibility
  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const features = [
    {
      icon: (
        <Store
          sx={{ fontSize: { xs: 30, md: 40 }, color: theme.palette.primary.main }}
        />
      ),
      title: "Cửa hàng trực tuyến",
      description: "Mua sắm dễ dàng với đa dạng sản phẩm chất lượng cao",
    },
    {
      icon: (
        <ShoppingCart
          sx={{ fontSize: { xs: 30, md: 40 }, color: theme.palette.primary.main }}
        />
      ),
      title: "Giỏ hàng thông minh",
      description: "Quản lý đơn hàng và thanh toán nhanh chóng, tiện lợi",
    },
    {
      icon: (
        <LocalShipping
          sx={{ fontSize: { xs: 30, md: 40 }, color: theme.palette.primary.main }}
        />
      ),
      title: "Giao hàng nhanh",
      description: "Đặt hàng và nhận tại cửa hàng hoặc giao hàng tận nơi",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        maxHeight: "100vh",
        overflow: "auto",
        scrollBehavior: "smooth",
        "&::-webkit-scrollbar": {
          width: "8px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "grey.200",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "primary.main",
          borderRadius: "4px",
          "&:hover": {
            backgroundColor: "primary.dark",
          },
        },
      }}
    >
      {/* Navigation Bar */}
      <AppBar position="sticky" sx={{ backgroundColor: theme.palette.primary.main }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: "bold",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Retail Shop
          </Typography>
          <Button
            color="inherit"
            startIcon={<PersonAdd sx={{ fontSize: { xs: 16, sm: 20 } }} />}
            onClick={() => navigate("/register")}
            sx={{
              mr: 1,
              px: { xs: 1, sm: 2 },
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
            }}
          >
            Đăng ký
          </Button>
          <Button
            color="inherit"
            startIcon={<Login sx={{ fontSize: { xs: 16, sm: 20 } }} />}
            onClick={() => navigate("/login")}
            variant="outlined"
            sx={{
              borderColor: "white",
              px: { xs: 1, sm: 2 },
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
              "&:hover": {
                borderColor: "white",
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Đăng nhập
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
          color: "white",
          py: { xs: 3, sm: 4, md: 6 },
          textAlign: "center",
        }}
      >
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: "bold",
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            Chào mừng đến với Retail Shop
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mb: { xs: 2, sm: 3, md: 4 },
              opacity: 0.9,
              fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
            }}
          >
            Trải nghiệm mua sắm hiện đại với công nghệ tiên tiến
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: { xs: 1, sm: 2 },
              justifyContent: "center",
              flexWrap: "wrap",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/products_page")}
              sx={{
                backgroundColor: "white",
                color: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.9)",
                },
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                width: { xs: "80%", sm: "auto" },
              }}
            >
              Khám phá sản phẩm
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate("/login")}
              sx={{
                borderColor: "white",
                color: "white",
                "&:hover": {
                  borderColor: "white",
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                width: { xs: "80%", sm: "auto" },
              }}
            >
              Đăng nhập ngay
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container
        maxWidth="lg"
        sx={{ py: { xs: 4, sm: 6, md: 8 }, px: { xs: 2, sm: 3 } }}
      >
        <Typography
          variant="h3"
          align="center"
          gutterBottom
          sx={{
            mb: { xs: 3, sm: 4, md: 6 },
            fontWeight: "bold",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
          }}
        >
          Tại sao chọn chúng tôi?
        </Typography>
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: "100%",
                  textAlign: "center",
                  p: { xs: 1, sm: 2 },
                  transition: "transform 0.3s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                  <Box sx={{ mb: { xs: 1, sm: 2 } }}>{feature.icon}</Box>
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      fontWeight: "bold",
                      fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.5rem" },
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.85rem", sm: "1rem" },
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action Section */}
      <Box
        sx={{
          backgroundColor: theme.palette.grey[100],
          py: { xs: 3, sm: 4, md: 6 },
          textAlign: "center",
        }}
      >
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: "bold",
              fontSize: { xs: "1.3rem", sm: "1.75rem", md: "2rem" },
            }}
          >
            Bắt đầu mua sắm ngay hôm nay
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: { xs: 2, sm: 3, md: 4 },
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
            }}
          >
            Đăng ký tài khoản để nhận những ưu đãi độc quyền và trải nghiệm mua sắm tốt nhất
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: { xs: 1, sm: 2 },
              justifyContent: "center",
              flexWrap: "wrap",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/register")}
              sx={{
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                width: { xs: "80%", sm: "auto" },
              }}
            >
              Tạo tài khoản miễn phí
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate("/products_page")}
              sx={{
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                width: { xs: "80%", sm: "auto" },
              }}
            >
              Xem sản phẩm
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: "white",
          py: { xs: 2, sm: 3 },
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="body1"
            sx={{
              mb: { xs: 1, sm: 2 },
              fontSize: { xs: "0.85rem", sm: "1rem" },
            }}
          >
            &copy; {new Date().getFullYear()} Retail Shop. Tất cả quyền được bảo lưu.
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: { xs: 1, sm: 2 },
              alignItems: "center",
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Phone sx={{ fontSize: { xs: 16, sm: 20 } }} />
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Liên hệ: 1900-xxxx | Email: support@retailshop.com
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Scroll to Top Button */}
      <Fab
        color="primary"
        size="small"
        aria-label="scroll to top"
        onClick={scrollToTop}
        sx={{
          position: "fixed",
          bottom: { xs: 16, sm: 20 },
          right: { xs: 16, sm: 20 },
          zIndex: 1000,
          opacity: showScrollTop ? 1 : 0,
          transform: showScrollTop ? "scale(1)" : "scale(0)",
          transition: "all 0.3s ease-in-out",
          width: { xs: 48, sm: 56 },
          height: { xs: 48, sm: 56 },
        }}
      >
        <KeyboardArrowUp sx={{ fontSize: { xs: 20, sm: 24 } }} />
      </Fab>
    </Box>
  );
};

export default HomePage;
