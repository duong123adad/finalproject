import React from "react";
import { AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import { Logout } from "@mui/icons-material";

const Header = ({ onLogout }) => {
  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Admin Dashboard
        </Typography>
        <IconButton color="inherit" onClick={onLogout}>
          <Logout />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
