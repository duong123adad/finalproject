import React, { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import CreateOrder from "../components/CreateOrder"; 
import ManagerOrder from "../components/ManagerOrder"; 

function SalePage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Bán hàng và quản lý đơn hàng"
      >
        <Tab label="Bán hàng - Tạo đơn hàng" />
        <Tab label="Quản lý đơn hàng" />
      </Tabs>
      <TabPanel value={activeTab} index={0}>
        <CreateOrder />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <ManagerOrder />
      </TabPanel>
    </Box>
  );
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default SalePage;
