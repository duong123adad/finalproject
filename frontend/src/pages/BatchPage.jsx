import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  IconButton,
  Collapse,
  FormHelperText,
  Pagination,
} from "@mui/material";
import { format, isBefore, addDays } from "date-fns";
import axios from "axios";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useSettings } from "../contexts/SettingsContext";
import { useNavigate } from "react-router-dom";

function ShelfInventoryPage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [shelfData, setShelfData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warningFilter, setWarningFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransferBatch, setSelectedTransferBatch] = useState(null);
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferError, setTransferError] = useState(null);
  const [warehouseTransferDialogOpen, setWarehouseTransferDialogOpen] =
    useState(false);
  const [selectedWarehouseTransferBatch, setSelectedWarehouseTransferBatch] =
    useState(null);
  const [warehouseTransferQuantity, setWarehouseTransferQuantity] =
    useState("");
  const [warehouseTransferError, setWarehouseTransferError] = useState(null);
  const [openRows, setOpenRows] = useState({});
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedReturnBatch, setSelectedReturnBatch] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnError, setReturnError] = useState(null);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [returnDate, setReturnDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [returnType, setReturnType] = useState("return");

  // Hàm hủy lô hàng
  const handleCancelBatch = async (batch) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn hủy toàn bộ lô hàng này? Thao tác này không thể hoàn tác."
      )
    )
      return;
    try {
      await axios.post(
        "https://panddretailshop.onrender.com/api/orders/cancel-batch",
        {
          batchId: batch._id,
          reason: "Hủy lô hàng từ giao diện quản lý",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      alert("Đã hủy lô hàng và tạo hóa đơn 0 đồng.");
      fetchData();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Lỗi khi hủy lô hàng. Có thể lô này đang được giữ bởi đơn đặt trước."
      );
    }
  };

  const handleOpenReturnDialog = (batch) => {
    setSelectedReturnBatch(batch);
    setReturnDialogOpen(true);
    setReturnQuantity("");
    setReturnReason("");
    setReturnError(null);
    setReturnSuccess(false);
    setReturnDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleReturnQuantityChange = (event) => {
    setReturnQuantity(event.target.value.replace(/\D/g, ""));
  };

  const handleReturnReasonChange = (event) => {
    setReturnReason(event.target.value);
  };

  const handleReturnDateChange = (event) => {
    setReturnDate(event.target.value);
  };

  const handleReturnTypeChange = (event) => {
    setReturnType(event.target.value);
  };

  const handleReturnSubmit = async () => {
    if (!returnQuantity || parseInt(returnQuantity) <= 0) {
      setReturnError("Vui lòng nhập số lượng hợp lệ");
      return;
    }
    const totalAvailable =
      selectedReturnBatch.remaining_quantity +
      selectedReturnBatch.quantity_on_shelf;
    if (parseInt(returnQuantity) > totalAvailable) {
      setReturnError(
        `Số lượng đổi/trả không thể vượt quá tổng số lượng hiện có (${totalAvailable})`
      );
      return;
    }
    if (!returnReason.trim()) {
      setReturnError("Vui lòng nhập lý do đổi/trả hàng");
      return;
    }
    try {
      const response = await axios.post("https://panddretailshop.onrender.com/api/returns", {
        batchId: selectedReturnBatch._id,
        supplierId: selectedReturnBatch.supplier?._id,
        quantity: parseInt(returnQuantity),
        reason: returnReason,
        returnDate: returnDate,
        productId: selectedReturnBatch.product?._id,
        type: returnType,
      });
      if (selectedReturnBatch.supplier?.contact?.email) {
        try {
          await axios.post(
            `https://panddretailshop.onrender.com/api/returns/${response.data._id}/resend-email`
          );
          alert("Email đã được gửi thành công đến nhà cung cấp.");
        } catch (emailError) {
          console.error("Lỗi khi gửi email:", emailError);
          alert(
            "Phiếu đã được tạo nhưng không thể gửi email đến nhà cung cấp."
          );
        }
      }
      setReturnSuccess(true);
      await fetchData();
      setTimeout(() => {
        setReturnDialogOpen(false);
      }, 2000);
    } catch (err) {
      setReturnError(
        err.response?.data?.message ||
          err.message ||
          "Lỗi khi trả hàng cho nhà cung cấp"
      );
    }
  };

  const handleOpenTransferDialog = (batch) => {
    setSelectedTransferBatch(batch);
    setTransferDialogOpen(true);
    setTransferQuantity("");
    setTransferError(null);
  };

  const handleOpenWarehouseTransferDialog = (batch) => {
    setSelectedWarehouseTransferBatch(batch);
    setWarehouseTransferDialogOpen(true);
    setWarehouseTransferQuantity("");
    setWarehouseTransferError(null);
  };

  const handleTransferQuantityChange = (event) => {
    setTransferQuantity(event.target.value.replace(/\D/g, ""));
  };

  const handleTransferSubmit = async () => {
    if (!transferQuantity || parseInt(transferQuantity) <= 0) {
      setTransferError("Vui lòng nhập số lượng hợp lệ");
      return;
    }
    try {
      await axios.put(
        `https://panddretailshop.onrender.com/api/batches/${selectedTransferBatch._id}/transfer-to-shelf`,
        { quantity: parseInt(transferQuantity) }
      );
      await fetchData();
      setTransferDialogOpen(false);
    } catch (err) {
      setTransferError(
        err.response?.data?.message || err.message || "Lỗi khi chuyển hàng"
      );
    }
  };

  const handleWarehouseTransferQuantityChange = (event) => {
    setWarehouseTransferQuantity(event.target.value.replace(/\D/g, ""));
  };

  const handleWarehouseTransferSubmit = async () => {
    if (
      !warehouseTransferQuantity ||
      parseInt(warehouseTransferQuantity) <= 0
    ) {
      setWarehouseTransferError("Vui lòng nhập số lượng hợp lệ");
      return;
    }
    if (
      parseInt(warehouseTransferQuantity) >
      selectedWarehouseTransferBatch.quantity_on_shelf
    ) {
      setWarehouseTransferError(
        "Số lượng không thể lớn hơn số lượng trên quầy"
      );
      return;
    }
    try {
      await axios.put(
        `https://panddretailshop.onrender.com/api/batches/${selectedWarehouseTransferBatch._id}/transfer-to-warehouse`,
        { quantity: parseInt(warehouseTransferQuantity) }
      );
      await fetchData();
      setWarehouseTransferDialogOpen(false);
    } catch (err) {
      setWarehouseTransferError(
        err.response?.data?.message || err.message || "Lỗi khi chuyển hàng"
      );
    }
  };

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await axios.get("https://panddretailshop.onrender.com/api/suppliers", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      setSuppliers(response.data);
    } catch (err) {
      console.error("Lỗi khi tải danh sách nhà cung cấp:", err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("https://panddretailshop.onrender.com/api/batches", {
        params: { search: searchTerm, status: statusFilter },
      });
      setShelfData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Lỗi khi tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSuppliers();
    // eslint-disable-next-line
  }, [searchTerm, statusFilter]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleWarningFilterChange = (event) => {
    setWarningFilter(event.target.value);
  };

  const handleSupplierFilterChange = (event) => {
    setSupplierFilter(event.target.value);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const productQuantities = useMemo(() => {
    const quantities = {};
    shelfData.forEach((item) => {
      const productId = item.product?._id;
      if (productId) {
        quantities[productId] = quantities[productId] || {
          initial: 0,
          shelf: 0,
          remaining: 0,
        };
        quantities[productId].initial += item.initial_quantity;
        quantities[productId].shelf += item.quantity_on_shelf;
        quantities[productId].remaining += item.remaining_quantity;
      }
    });
    return quantities;
  }, [shelfData]);

  const getExpiryThreshold = (product) => {
    if (
      product &&
      product.expiryThresholdDays !== undefined &&
      product.expiryThresholdDays !== null &&
      product.expiryThresholdDays !== ""
    ) {
      return product.expiryThresholdDays;
    }
    return settings.expiryThresholdDays;
  };

  const getLowQuantityThreshold = (product) => {
    if (
      product &&
      product.lowQuantityThreshold !== undefined &&
      product.lowQuantityThreshold !== null &&
      product.lowQuantityThreshold !== ""
    ) {
      return product.lowQuantityThreshold;
    }
    return settings.lowQuantityThreshold;
  };

  const isNearingExpiry = (expiryDate, product) => {
    if (!expiryDate) return false;
    const threshold = getExpiryThreshold(product);
    return isBefore(new Date(expiryDate), addDays(new Date(), threshold));
  };

  const sortedShelfData = useMemo(() => {
    const now = new Date();
    const withWarnings = shelfData.map((item) => {
      let warnings = [];
      const expiryDate = item.expiry_day ? new Date(item.expiry_day) : null;
      const expiryThreshold = getExpiryThreshold(item.product);
      const lowQtyThreshold = getLowQuantityThreshold(item.product);
      if (expiryDate && isBefore(expiryDate, addDays(now, expiryThreshold))) {
        warnings.push("Sắp hết hạn");
      }
      if (item.quantity_on_shelf <= lowQtyThreshold) {
        warnings.push("Ít trên quầy");
      }
      if (item.remaining_quantity <= lowQtyThreshold) {
        warnings.push("Ít trong kho");
      }
      return { ...item, warnings };
    });
    const prioritizedData = [...withWarnings].sort((a, b) => {
      if (a.warnings.length > 0 && b.warnings.length === 0) {
        return -1;
      }
      if (a.warnings.length === 0 && b.warnings.length > 0) {
        return 1;
      }
      return 0;
    });
    if (!sortColumn) {
      return prioritizedData;
    }
    return prioritizedData.sort((a, b) => {
      let valueA, valueB;
      if (sortColumn === "productName") {
        valueA = a.product?.name || "";
        valueB = b.product?.name || "";
      } else if (sortColumn === "batchCode") {
        valueA = a.batchCode || "";
        valueB = b.batchCode || "";
      } else if (sortColumn === "shelfQuantity") {
        valueA = a.quantity_on_shelf;
        valueB = b.quantity_on_shelf;
      } else if (sortColumn === "warehouseQuantity") {
        valueA = a.remaining_quantity;
        valueB = b.remaining_quantity;
      } else if (sortColumn === "totalQuantity") {
        valueA = (a.quantity_on_shelf || 0) + (a.remaining_quantity || 0);
        valueB = (b.quantity_on_shelf || 0) + (b.remaining_quantity || 0);
      } else if (sortColumn === "manufactureDay") {
        valueA = a.manufacture_day ? new Date(a.manufacture_day) : null;
        valueB = b.manufacture_day ? new Date(b.manufacture_day) : null;
      } else if (sortColumn === "expiryDay") {
        valueA = a.expiry_day ? new Date(a.expiry_day) : null;
        valueB = b.expiry_day ? new Date(b.expiry_day) : null;
      } else if (sortColumn === "importDate") {
        valueA = a.createdAt ? new Date(a.createdAt) : null;
        valueB = b.createdAt ? new Date(b.createdAt) : null;
      } else if (sortColumn === "status") {
        valueA = a.status || "";
        valueB = b.status || "";
      }
      if (valueA == null || valueB == null) {
        return valueA == null ? 1 : -1;
      }
      if (typeof valueA === "string") {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      if (sortDirection === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  }, [shelfData, sortColumn, sortDirection, settings]);

  const groupedByProduct = useMemo(() => {
    const grouped = {};
    sortedShelfData.forEach((item) => {
      if (!item.product) return;
      const productId = item.product._id;
      const productName = item.product.name;
      if (!grouped[productId]) {
        grouped[productId] = {
          productId,
          productName,
          batches: [],
          totalShelfQuantity: 0,
          totalWarehouseQuantity: 0,
          warnings: new Set(),
          earliestExpiryDate: null,
          latestManufactureDate: null,
        };
      }
      grouped[productId].batches.push(item);
      grouped[productId].totalShelfQuantity += item.quantity_on_shelf;
      grouped[productId].totalWarehouseQuantity += item.remaining_quantity;
      if (item.expiry_day) {
        const expiryDate = new Date(item.expiry_day);
        if (
          !grouped[productId].earliestExpiryDate ||
          expiryDate < new Date(grouped[productId].earliestExpiryDate)
        ) {
          grouped[productId].earliestExpiryDate = item.expiry_day;
        }
      }
      if (item.manufacture_day) {
        const manufactureDate = new Date(item.manufacture_day);
        if (
          !grouped[productId].latestManufactureDate ||
          manufactureDate > new Date(grouped[productId].latestManufactureDate)
        ) {
          grouped[productId].latestManufactureDate = item.manufacture_day;
        }
      }
      item.warnings.forEach((warning) => {
        grouped[productId].warnings.add(warning);
      });
    });
    let groupedArray = Object.values(grouped);
    groupedArray.forEach((product) => {
      product.totalQuantity =
        product.totalShelfQuantity + product.totalWarehouseQuantity;
      if (sortColumn) {
        product.batches.sort((a, b) => {
          let valueA, valueB;
          if (sortColumn === "batchCode") {
            valueA = a.batchCode || "";
            valueB = b.batchCode || "";
          } else if (sortColumn === "shelfQuantity") {
            valueA = a.quantity_on_shelf;
            valueB = b.quantity_on_shelf;
          } else if (sortColumn === "warehouseQuantity") {
            valueA = a.remaining_quantity;
            valueB = b.remaining_quantity;
          } else if (sortColumn === "totalQuantity") {
            valueA = (a.quantity_on_shelf || 0) + (a.remaining_quantity || 0);
            valueB = (b.quantity_on_shelf || 0) + (b.remaining_quantity || 0);
          } else if (sortColumn === "manufactureDay") {
            valueA = a.manufacture_day ? new Date(a.manufacture_day) : null;
            valueB = b.manufacture_day ? new Date(b.manufacture_day) : null;
          } else if (sortColumn === "expiryDay") {
            valueA = a.expiry_day ? new Date(a.expiry_day) : null;
            valueB = b.expiry_day ? new Date(b.expiry_day) : null;
          } else if (sortColumn === "importDate") {
            valueA = a.createdAt ? new Date(a.createdAt) : null;
            valueB = b.createdAt ? new Date(b.createdAt) : null;
          } else {
            return 0;
          }
          if (valueA == null || valueB == null) {
            return valueA == null ? 1 : -1;
          }
          if (typeof valueA === "string") {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
          }
          if (sortDirection === "asc") {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
          } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
          }
        });
      }
    });
    if (sortColumn) {
      groupedArray.sort((a, b) => {
        let valueA, valueB;
        if (sortColumn === "productName") {
          valueA = a.productName || "";
          valueB = b.productName || "";
        } else if (sortColumn === "totalQuantity") {
          valueA = a.totalQuantity;
          valueB = b.totalQuantity;
        } else if (
          sortColumn === "shelfQuantity" ||
          sortColumn === "totalShelfQuantity"
        ) {
          valueA = a.totalShelfQuantity;
          valueB = b.totalShelfQuantity;
        } else if (
          sortColumn === "warehouseQuantity" ||
          sortColumn === "totalWarehouseQuantity"
        ) {
          valueA = a.totalWarehouseQuantity;
          valueB = b.totalWarehouseQuantity;
        } else if (sortColumn === "manufactureDay") {
          valueA = a.latestManufactureDate
            ? new Date(a.latestManufactureDate)
            : null;
          valueB = b.latestManufactureDate
            ? new Date(b.latestManufactureDate)
            : null;
        } else if (sortColumn === "expiryDay") {
          valueA = a.earliestExpiryDate ? new Date(a.earliestExpiryDate) : null;
          valueB = b.earliestExpiryDate ? new Date(b.earliestExpiryDate) : null;
        } else if (sortColumn === "importDate") {
          valueA = a.createdAt ? new Date(a.createdAt) : null;
          valueB = b.createdAt ? new Date(b.createdAt) : null;
        }
        if (valueA == null || valueB == null) {
          return valueA == null ? 1 : -1;
        }
        if (typeof valueA === "string") {
          valueA = valueA.toLowerCase();
          valueB = valueB.toLowerCase();
        }
        if (sortDirection === "asc") {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
      });
    }
    return groupedArray;
  }, [sortedShelfData, sortColumn, sortDirection]);

  const handleBatchClick = (batchId) => {
    const batchInfo = shelfData.find((item) => item._id === batchId);
    setSelectedBatch(batchInfo);
    setBatchDialogOpen(true);
  };

  const handleCloseBatchDialog = () => {
    setBatchDialogOpen(false);
    setSelectedBatch(null);
  };

  const handleProductClick = (productId) => {
    const productInfo = shelfData.find(
      (item) => item.product?._id === productId
    )?.product;
    const quantities = productQuantities[productId] || {
      initial: 0,
      shelf: 0,
      remaining: 0,
    };
    setSelectedProduct({
      ...productInfo,
      overallTotalQuantity: quantities.initial,
      overallShelfQuantity: quantities.shelf,
      overallWarehouseQuantity: quantities.remaining,
    });
    setProductDialogOpen(true);
  };

  const handleCloseProductDialog = () => {
    setProductDialogOpen(false);
    setSelectedProduct(null);
  };

  const toggleRow = (productId) => {
    setOpenRows((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    setOpenRows({});
  };

  const filteredGroupedByProduct = useMemo(() => {
    let filtered = groupedByProduct;
    if (warningFilter) {
      filtered = filtered.filter((group) =>
        Array.from(group.warnings).includes(warningFilter)
      );
    }
    if (supplierFilter) {
      filtered = filtered.filter((group) => {
        return group.batches.some(
          (batch) => batch.supplier && batch.supplier._id === supplierFilter
        );
      });
    }
    return filtered;
  }, [groupedByProduct, warningFilter, supplierFilter]);

  const paginatedGroupedByProduct = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredGroupedByProduct.slice(startIndex, endIndex);
  }, [filteredGroupedByProduct, page, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredGroupedByProduct.length / itemsPerPage);
  }, [filteredGroupedByProduct, itemsPerPage]);

  const handleNavigateToGoodReceipt = (productId, productName) => {
    const url = `/inventory/purchase-order?preselected-product=${productId}&product-name=${encodeURIComponent(
      productName
    )}`;
    window.open(url, "_blank");
  };

  return (
    <Container
      maxWidth="xl"
      sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Quản lý hàng tồn kho và trên quầy
      </Typography>
      <Box mb={2}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Tìm kiếm (Tên/Mã Lô hàng)"
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label" shrink>
              Trạng Thái Lô
            </InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              label="Trạng Thái Lô"
              onChange={handleStatusChange}
              displayEmpty
              renderValue={(value) => (value === "" ? "Tất cả" : value)}
              inputProps={{
                "aria-label": "Trạng thái lô hàng",
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="hoạt động">Hoạt động</MenuItem>
              <MenuItem value="không hoạt động">Không hoạt động</MenuItem>
              <MenuItem value="hết hạn">Hết hạn</MenuItem>
              <MenuItem value="hết hàng">Hết hàng</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="warning-filter-label" shrink>
              Cảnh báo
            </InputLabel>
            <Select
              labelId="warning-filter-label"
              id="warning-filter"
              value={warningFilter}
              label="Cảnh báo"
              onChange={handleWarningFilterChange}
              displayEmpty
              renderValue={(value) => (value === "" ? "Tất cả" : value)}
              inputProps={{
                "aria-label": "Cảnh báo",
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="Sắp hết hạn">Sắp hết hạn</MenuItem>
              <MenuItem value="Ít trên quầy">Ít trên quầy</MenuItem>
              <MenuItem value="Ít trong kho">Ít trong kho</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="supplier-filter-label" shrink>
              Nhà cung cấp
            </InputLabel>
            <Select
              labelId="supplier-filter-label"
              id="supplier-filter"
              value={supplierFilter}
              label="Nhà cung cấp"
              onChange={handleSupplierFilterChange}
              displayEmpty
              renderValue={(value) => {
                if (value === "") return "Tất cả";
                const selectedSupplier = suppliers.find((s) => s._id === value);
                return selectedSupplier
                  ? selectedSupplier.name
                  : "Không xác định";
              }}
              inputProps={{
                "aria-label": "Nhà cung cấp",
              }}
              disabled={loadingSuppliers}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          flex={1}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 400,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TableContainer
            component={Paper}
            sx={{
              flex: 1,
              maxHeight: "calc(110vh - 260px)",
              "& .MuiTable-root": { minWidth: 1000 },
            }}
          >
            <Table stickyHeader aria-label="shelf inventory table">
              <TableHead>
                <TableRow>
                  <TableCell width="30px"></TableCell>
                  <TableCell>STT</TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("productName")}
                  >
                    Tên Sản Phẩm{" "}
                    {sortColumn === "productName" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("totalQuantity")}
                  >
                    Tổng số Lượng{" "}
                    {sortColumn === "totalQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("totalShelfQuantity")}
                  >
                    Tổng số Lượng Trên Quầy{" "}
                    {sortColumn === "totalShelfQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("totalWarehouseQuantity")}
                  >
                    Tổng số Lượng Trong Kho{" "}
                    {sortColumn === "totalWarehouseQuantity" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("manufactureDay")}
                  >
                    Ngày Sản Xuất gần nhất{" "}
                    {sortColumn === "manufactureDay" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("expiryDay")}
                  >
                    Hạn Sử Dụng gần nhất{" "}
                    {sortColumn === "expiryDay" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </TableCell>
                  <TableCell>Cảnh báo</TableCell>
                  <TableCell>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedGroupedByProduct.map((group, index) => (
                  <React.Fragment key={group.productId}>
                    <TableRow>
                      <TableCell>
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          onClick={() => toggleRow(group.productId)}
                        >
                          {openRows[group.productId] ? (
                            <KeyboardArrowUpIcon />
                          ) : (
                            <KeyboardArrowDownIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        {(page - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell
                        component="th"
                        scope="row"
                        style={{
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                        onClick={() => handleProductClick(group.productId)}
                      >
                        {group.productName}
                      </TableCell>
                      <TableCell align="right">{group.totalQuantity}</TableCell>
                      <TableCell
                        align="right"
                        style={
                          group.totalShelfQuantity <=
                          getLowQuantityThreshold(group.batches[0]?.product)
                            ? { color: "red", fontWeight: "bold" }
                            : {}
                        }
                      >
                        {group.totalShelfQuantity}
                      </TableCell>
                      <TableCell
                        align="right"
                        style={
                          group.totalWarehouseQuantity <=
                          getLowQuantityThreshold(group.batches[0]?.product)
                            ? { color: "red", fontWeight: "bold" }
                            : {}
                        }
                      >
                        {group.totalWarehouseQuantity}
                      </TableCell>
                      <TableCell>
                        {group.latestManufactureDate
                          ? format(
                              new Date(group.latestManufactureDate),
                              "dd/MM/yyyy"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell
                        style={
                          group.earliestExpiryDate &&
                          isNearingExpiry(
                            group.earliestExpiryDate,
                            group.batches[0]?.product
                          )
                            ? { color: "red" }
                            : {}
                        }
                      >
                        {group.earliestExpiryDate
                          ? format(
                              new Date(group.earliestExpiryDate),
                              "dd/MM/yyyy"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {Array.from(group.warnings).map((warning, idx) => (
                          <Chip
                            key={idx}
                            label={warning}
                            color="warning"
                            size="small"
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          sx={{
                            fontSize: "0.7rem",
                            padding: "4px 8px",
                            textTransform: "none",
                          }}
                          onClick={() =>
                            handleNavigateToGoodReceipt(
                              group.productId,
                              group.productName
                            )
                          }
                        >
                          Nhập hàng
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={10}
                      >
                        <Collapse
                          in={openRows[group.productId]}
                          timeout="auto"
                          unmountOnExit
                        >
                          <Box sx={{ margin: 1 }}>
                            <Typography
                              variant="h6"
                              gutterBottom
                              component="div"
                            >
                              Chi tiết lô hàng
                            </Typography>
                            <Table size="small" aria-label="batch details">
                              <TableHead>
                                <TableRow>
                                  <TableCell
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSort("batchCode")}
                                  >
                                    Mã Lô Hàng{" "}
                                    {sortColumn === "batchCode" &&
                                      (sortDirection === "asc" ? "▲" : "▼")}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSort("shelfQuantity")}
                                  >
                                    Số Lượng Trên Quầy{" "}
                                    {sortColumn === "shelfQuantity" &&
                                      (sortDirection === "asc" ? "▲" : "▼")}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                      handleSort("warehouseQuantity")
                                    }
                                  >
                                    Số Lượng Trong Kho{" "}
                                    {sortColumn === "warehouseQuantity" &&
                                      (sortDirection === "asc" ? "▲" : "▼")}
                                  </TableCell>
                                  <TableCell
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSort("manufactureDay")}
                                  >
                                    Ngày Sản Xuất{" "}
                                    {sortColumn === "manufactureDay" &&
                                      (sortDirection === "asc" ? "▲" : "▼")}
                                  </TableCell>
                                  <TableCell
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSort("expiryDay")}
                                  >
                                    Hạn Sử Dụng{" "}
                                    {sortColumn === "expiryDay" &&
                                      (sortDirection === "asc" ? "▲" : "▼")}
                                  </TableCell>
                                  <TableCell
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSort("importDate")}
                                  >
                                    Ngày Nhập{" "}
                                    {sortColumn === "importDate" &&
                                      (sortDirection === "asc" ? "▲" : "▼")}
                                  </TableCell>
                                  <TableCell
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSort("status")}
                                  >
                                    Trạng Thái Lô{" "}
                                    {sortColumn === "status" &&
                                      (sortDirection === "asc" ? "▲" : "▼")}
                                  </TableCell>
                                  <TableCell>Cảnh báo</TableCell>
                                  <TableCell>Thao tác</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {group.batches
                                  .filter(
                                    (batch) =>
                                      (batch.quantity_on_shelf || 0) +
                                        (batch.remaining_quantity || 0) >
                                      0
                                  )
                                  .map((batch) => (
                                    <TableRow key={batch._id}>
                                      <TableCell
                                        style={{
                                          cursor: "pointer",
                                          color: "blue",
                                          textDecoration: "underline",
                                        }}
                                        onClick={() =>
                                          handleBatchClick(batch._id)
                                        }
                                      >
                                        {batch.batchCode || batch._id}
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        style={
                                          batch.quantity_on_shelf <=
                                          getLowQuantityThreshold(batch.product)
                                            ? {
                                                color: "red",
                                                fontWeight: "bold",
                                              }
                                            : {}
                                        }
                                      >
                                        {batch.quantity_on_shelf}
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        style={
                                          batch.remaining_quantity <=
                                          getLowQuantityThreshold(batch.product)
                                            ? {
                                                color: "red",
                                                fontWeight: "bold",
                                              }
                                            : {}
                                        }
                                      >
                                        {batch.remaining_quantity}
                                      </TableCell>
                                      <TableCell>
                                        {batch.manufacture_day
                                          ? format(
                                              new Date(batch.manufacture_day),
                                              "dd/MM/yyyy"
                                            )
                                          : "-"}
                                      </TableCell>
                                      <TableCell
                                        style={
                                          batch.expiry_day &&
                                          isNearingExpiry(
                                            batch.expiry_day,
                                            batch.product
                                          )
                                            ? { color: "red" }
                                            : {}
                                        }
                                      >
                                        {batch.expiry_day
                                          ? format(
                                              new Date(batch.expiry_day),
                                              "dd/MM/yyyy"
                                            )
                                          : "-"}
                                      </TableCell>
                                      <TableCell>
                                        {batch.createdAt
                                          ? format(
                                              new Date(batch.createdAt),
                                              "dd/MM/yyyy"
                                            )
                                          : "-"}
                                      </TableCell>
                                      <TableCell>{batch.status}</TableCell>
                                      <TableCell>
                                        {batch.warnings.map((warning, idx) => (
                                          <Chip
                                            key={idx}
                                            label={warning}
                                            color="warning"
                                            size="small"
                                            sx={{ mr: 0.5 }}
                                          />
                                        ))}
                                      </TableCell>
                                      <TableCell>
                                        <Stack direction="row" spacing={1}>
                                          <Button
                                            size="small"
                                            sx={{
                                              fontSize: "0.7rem",
                                              padding: "2px 6px",
                                              margin: "0 2px",
                                              textTransform: "none",
                                            }}
                                            variant="contained"
                                            onClick={() =>
                                              handleOpenTransferDialog(batch)
                                            }
                                            disabled={
                                              batch.remaining_quantity <= 0
                                            }
                                          >
                                            chuyển lên quầy
                                          </Button>
                                          <Button
                                            size="small"
                                            sx={{
                                              fontSize: "0.7rem",
                                              padding: "2px 6px",
                                              margin: "0 2px",
                                              textTransform: "none",
                                            }}
                                            variant="outlined"
                                            color="primary"
                                            onClick={() =>
                                              handleOpenWarehouseTransferDialog(
                                                batch
                                              )
                                            }
                                            disabled={
                                              batch.quantity_on_shelf <= 0
                                            }
                                          >
                                            chuyển xuống kho
                                          </Button>
                                          <Button
                                            size="small"
                                            sx={{
                                              fontSize: "0.7rem",
                                              padding: "2px 6px",
                                              margin: "0 2px",
                                              textTransform: "none",
                                            }}
                                            variant="outlined"
                                            color="error"
                                            onClick={() =>
                                              handleOpenReturnDialog(batch)
                                            }
                                            disabled={
                                              batch.remaining_quantity +
                                                batch.quantity_on_shelf <=
                                                0 || !batch.supplier
                                            }
                                          >
                                            đổi/trả hàng NCC
                                          </Button>
                                          <Button
                                            size="small"
                                            sx={{
                                              fontSize: "0.7rem",
                                              padding: "2px 6px",
                                              margin: "0 2px",
                                              textTransform: "none",
                                            }}
                                            variant="outlined"
                                            color="secondary"
                                            onClick={() =>
                                              handleCancelBatch(batch)
                                            }
                                            disabled={
                                              (batch.quantity_on_shelf || 0) +
                                                (batch.remaining_quantity ||
                                                  0) <=
                                              0
                                            }
                                          >
                                            Hủy lô hàng
                                          </Button>
                                        </Stack>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredGroupedByProduct.length > 0 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 2 }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
          {filteredGroupedByProduct.length === 0 && !loading && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Không tìm thấy sản phẩm nào phù hợp với bộ lọc đã chọn
              </Typography>
            </Box>
          )}
        </Box>
      )}
      <Dialog open={batchDialogOpen} onClose={handleCloseBatchDialog}>
        <DialogTitle>Thông tin Lô hàng</DialogTitle>
        <DialogContent>
          {selectedBatch && (
            <Box>
              <Typography>
                Mã Lô: {selectedBatch.batchCode || selectedBatch._id}
              </Typography>
              <Typography>
                Ngày Sản Xuất:{" "}
                {selectedBatch.manufacture_day
                  ? format(
                      new Date(selectedBatch.manufacture_day),
                      "dd/MM/yyyy"
                    )
                  : "-"}
              </Typography>
              <Typography
                style={
                  selectedBatch.expiry_day &&
                  isNearingExpiry(
                    selectedBatch.expiry_day,
                    selectedBatch.product
                  )
                    ? { color: "red" }
                    : {}
                }
              >
                Hạn Sử Dụng:{" "}
                {selectedBatch.expiry_day
                  ? format(new Date(selectedBatch.expiry_day), "dd/MM/yyyy")
                  : "-"}
              </Typography>
              <Typography>
                Ngày Nhập:{" "}
                {selectedBatch.createdAt
                  ? format(new Date(selectedBatch.createdAt), "dd/MM/yyyy")
                  : "-"}
              </Typography>
              <Typography>
                Số lượng ban đầu: {selectedBatch.initial_quantity}
              </Typography>
              <Typography
                style={
                  selectedBatch.remaining_quantity <=
                  getLowQuantityThreshold(selectedBatch?.product)
                    ? { color: "red", fontWeight: "bold" }
                    : {}
                }
              >
                Số lượng còn lại: {selectedBatch.remaining_quantity}
              </Typography>
              <Typography>
                Số lượng đã bán: {selectedBatch.sold_quantity}
              </Typography>
              <Typography>
                Số lượng bị mất: {selectedBatch.lost_quantity}
              </Typography>
              <Typography
                style={
                  selectedBatch.quantity_on_shelf <=
                  getLowQuantityThreshold(selectedBatch?.product)
                    ? { color: "red", fontWeight: "bold" }
                    : {}
                }
              >
                Số lượng trên quầy: {selectedBatch?.quantity_on_shelf}
              </Typography>
              <Typography>Trạng thái: {selectedBatch.status}</Typography>
              {selectedBatch.supplier && (
                <Typography>
                  Nhà cung cấp: {selectedBatch.supplier.name}
                </Typography>
              )}
              {selectedBatch.discountInfo?.isDiscounted && (
                <Typography>
                  Giảm giá: {selectedBatch.discountInfo.discountValue}
                  {selectedBatch.discountInfo.discountType === "percentage"
                    ? "%"
                    : ""}
                </Typography>
              )}
              <Typography>
                Ngày tạo:{" "}
                {format(
                  new Date(selectedBatch.createdAt),
                  "dd/MM/yyyy HH:mm:ss"
                )}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBatchDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
      >
        <DialogTitle>Chuyển hàng lên quầy</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, pt: 2 }}>
            <TextField
              fullWidth
              label="Số lượng chuyển"
              value={transferQuantity}
              onChange={handleTransferQuantityChange}
              error={!!transferError}
              helperText={transferError}
            />
            <Typography variant="body2" color="text.secondary" mt={1}>
              Có sẵn trong kho: {selectedTransferBatch?.remaining_quantity}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleTransferSubmit}
            variant="contained"
            color="primary"
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={warehouseTransferDialogOpen}
        onClose={() => setWarehouseTransferDialogOpen(false)}
      >
        <DialogTitle>Chuyển hàng xuống kho</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, pt: 2 }}>
            <TextField
              fullWidth
              label="Số lượng chuyển"
              value={warehouseTransferQuantity}
              onChange={handleWarehouseTransferQuantityChange}
              error={!!warehouseTransferError}
              helperText={warehouseTransferError}
            />
            <Typography variant="body2" color="text.secondary" mt={1}>
              Có sẵn trên quầy:{" "}
              {selectedWarehouseTransferBatch?.quantity_on_shelf}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarehouseTransferDialogOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleWarehouseTransferSubmit}
            variant="contained"
            color="primary"
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Đổi/trả hàng cho nhà cung cấp</DialogTitle>
        <DialogContent>
          {returnSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Đã tạo phiếu trả hàng thành công!
            </Alert>
          ) : (
            <Box sx={{ minWidth: 300, pt: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Sản phẩm:</strong> {selectedReturnBatch?.product?.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Mã lô:</strong>{" "}
                {selectedReturnBatch?.batchCode || selectedReturnBatch?._id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Nhà cung cấp:</strong>{" "}
                {selectedReturnBatch?.supplier?.name || "Không có thông tin"}
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>Loại phiếu</InputLabel>
                <Select
                  value={returnType}
                  onChange={handleReturnTypeChange}
                  label="Loại phiếu"
                >
                  <MenuItem value="return">Trả hàng</MenuItem>
                  <MenuItem value="exchange">Đổi hàng</MenuItem>
                </Select>
                <FormHelperText>
                  {returnType === "return"
                    ? "Trả hàng: Trừ số lượng khi phiếu được chuyển thành hoàn thành"
                    : "Đổi hàng: Không trừ số lượng từ kho/quầy"}
                </FormHelperText>
              </FormControl>
              <TextField
                fullWidth
                margin="normal"
                label="Ngày lập phiếu"
                type="date"
                value={returnDate}
                onChange={handleReturnDateChange}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Số lượng đổi/trả"
                value={returnQuantity}
                onChange={handleReturnQuantityChange}
                error={!!returnError && returnError.includes("số lượng")}
              />
              <FormControl
                fullWidth
                margin="normal"
                error={!!returnError && returnError.includes("lý do")}
              >
                <InputLabel id="return-reason-label">
                  Lý do đổi/trả hàng
                </InputLabel>
                <Select
                  labelId="return-reason-label"
                  value={returnReason}
                  onChange={handleReturnReasonChange}
                  label="Lý do đổi/trả hàng"
                >
                  <MenuItem value="Sản phẩm hỏng">Sản phẩm hỏng</MenuItem>
                  <MenuItem value="Sản phẩm hết hạn">Sản phẩm hết hạn</MenuItem>
                  <MenuItem value="Sản phẩm bị lỗi">Sản phẩm bị lỗi</MenuItem>
                  <MenuItem value="Chất lượng không đạt">
                    Chất lượng không đạt
                  </MenuItem>
                  <MenuItem value="Nhập sai/thừa">Nhập sai/thừa</MenuItem>
                  <MenuItem value="Đổi trả theo thỏa thuận">
                    Đổi trả theo thỏa thuận
                  </MenuItem>
                  <MenuItem value="Lý do khác">Lý do khác</MenuItem>
                </Select>
                {returnReason === "Lý do khác" && (
                  <TextField
                    margin="normal"
                    label="Chi tiết lý do"
                    fullWidth
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                )}
                {!!returnError && returnError.includes("lý do") && (
                  <FormHelperText>{returnError}</FormHelperText>
                )}
              </FormControl>
              <Typography variant="body2" color="text.secondary" mt={2}>
                <strong>Tổng số lượng có thể đổi/trả:</strong>{" "}
                {selectedReturnBatch
                  ? selectedReturnBatch.remaining_quantity +
                    selectedReturnBatch.quantity_on_shelf
                  : 0}
              </Typography>
              {returnError &&
                !returnError.includes("lý do") &&
                !returnError.includes("số lượng") && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {returnError}
                  </Alert>
                )}
            </Box>
          )}
        </DialogContent>
        {!returnSuccess && (
          <DialogActions>
            <Button onClick={() => setReturnDialogOpen(false)}>Hủy</Button>
            <Button
              onClick={handleReturnSubmit}
              variant="contained"
              color="primary"
              disabled={!selectedReturnBatch?.supplier}
            >
              Tạo phiếu đổi/trả hàng
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Container>
  );
}

export default ShelfInventoryPage;
