import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Box } from "@mui/material";

const MainLayout = () => {
  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - 240px)`, // 240px là chiều rộng của sidebar
        }}
      >
        <Outlet /> {/* Đây là nơi nội dung trang sẽ được render */}
      </Box>
    </Box>
  );
};

export default MainLayout;