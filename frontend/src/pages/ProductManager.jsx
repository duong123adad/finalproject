import React, { useState, useEffect } from "react";
import {
    Container,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Grid,
    Box,
    IconButton,
    Snackbar,
    Alert,
    CircularProgress,
    Autocomplete,
    InputAdornment,
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useFormik } from "formik";
import * as yup from "yup";
import { useSettings } from '../contexts/SettingsContext';

const productSchema = yup.object({
    name: yup.string().required("Tên sản phẩm là bắt buộc"),
    category: yup.string().required("Danh mục là bắt buộc"),
    units: yup.array().of(
        yup.object().shape({
            name: yup.string().required("Tên đơn vị là bắt buộc"),
            ratio: yup.number().min(1, "Tỷ lệ phải lớn hơn hoặc bằng 1").required("Tỷ lệ là bắt buộc"),
            salePrice: yup.number().min(0, "Giá bán phải lớn hơn hoặc bằng 0").required("Giá bán là bắt buộc"),
        })
    ).required("Đơn vị là bắt buộc"),
    description: yup.string(),
    active: yup.boolean(),
    suppliers: yup.array().of(
        yup.object().shape({
            supplier: yup.string().required("Nhà cung cấp là bắt buộc"),
            minOrderQuantity: yup.number().min(1, "Số lượng tối thiểu phải lớn hơn hoặc bằng 1"),
            leadTime: yup.number().min(0, "Thời gian giao hàng phải lớn hơn hoặc bằng 0"),
            isPrimary: yup.boolean(),
        })
    ),
    barcode: yup.string(),
    expiryThresholdDays: yup.number().min(0, "Ngưỡng cảnh báo hết hạn phải >= 0"),
    lowQuantityThreshold: yup.number().min(0, "Ngưỡng cảnh báo số lượng thấp phải >= 0"),
});

const defaultUnits = [
    { name: "cái", ratio: 1, salePrice: 0 },
];

const validateUnits = (units) => {
    const ratioSet = new Set();
    let hasRatio1 = false;

    for (const unit of units) {
        if (ratioSet.has(unit.ratio)) return false;
        ratioSet.add(unit.ratio);
        if (unit.ratio === 1) hasRatio1 = true;
    }

    return hasRatio1;
};

const ProductManager = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success",
    });
    const [imagePreviews, setImagePreviews] = useState([]); // [{src, isNew}]
    const [selectedImages, setSelectedImages] = useState([]); // array of File
    const [removedOldImages, setRemovedOldImages] = useState([]); // array of url string
    const [searchTerm, setSearchTerm] = useState("");
    const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: "", description: "" });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
    const token = localStorage.getItem("authToken");

    const { settings } = useSettings();

    const predefinedUnits = ["cái", "gói", "bao", "thùng", "thùng 24","thùng 30", "túi", "chai", "lọ", "lon",  "hộp", "kg", "gram", "liter", "ml"];

    const handleOpenCategoryDialog = () => {
        setNewCategory({ name: "", description: "" });
        setOpenCategoryDialog(true);
    };

    const handleCloseCategoryDialog = () => {
        setOpenCategoryDialog(false);
    };

    const handleCreateCategory = async () => {
        try {
            const response = await axios.post("http://localhost:8000/api/categories", newCategory, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCategories([...categories, response.data]);
            setSnackbar({
                open: true,
                message: "Tạo danh mục mới thành công",
                severity: "success",
            });
            handleCloseCategoryDialog();
        } catch (error) {
            console.error("Error creating category:", error);
            setSnackbar({
                open: true,
                message: "Lỗi khi tạo danh mục mới",
                severity: "error",
            });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Remove pagination parameters
                let url = `http://localhost:8000/api/products`;
                if (selectedCategoryFilter) {
                    url += `?category=${selectedCategoryFilter}`;
                }
                const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
                    axios.get(url, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("http://localhost:8000/api/categories", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("http://localhost:8000/api/suppliers", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                // Handle different response formats
                setProducts(Array.isArray(productsRes.data.data) 
                    ? productsRes.data.data 
                    : Array.isArray(productsRes.data) 
                    ? productsRes.data 
                    : []);
                setCategories(categoriesRes.data);
                setSuppliers(suppliersRes.data);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setSnackbar({
                    open: true,
                    message: "Lỗi khi tải dữ liệu",
                    severity: "error",
                });
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedCategoryFilter, token]); // Remove page from dependencies

    const formik = useFormik({
        initialValues: {
            name: "",
            category: "",
            description: "",
            units: defaultUnits,
            suppliers: [],
            active: false,
            images: [],
            barcode: "",
            expiryThresholdDays: "",
            lowQuantityThreshold: "",
        },
        validationSchema: productSchema,
        validate: (values) => {
            const errors = {};
            if (!validateUnits(values.units)) {
                errors.units = "Đơn vị phải có ít nhất một đơn vị với tỷ lệ là 1 và không được trùng tỷ lệ.";
            }
            return errors;
        },
        onSubmit: async (values) => {
            setSubmitLoading(true);
            try {
                const formData = new FormData();
                formData.append("name", values.name);
                formData.append("category", values.category);
                formData.append("description", values.description || "");
                formData.append("active", values.active);
                formData.append("barcode", values.barcode || "");
                
                // Simplified handling of threshold values
                if (values.expiryThresholdDays) {
                    formData.append("expiryThresholdDays", values.expiryThresholdDays);
                }
                
                if (values.lowQuantityThreshold) {
                    formData.append("lowQuantityThreshold", values.lowQuantityThreshold);
                }

                values.units.forEach((unit, index) => {
                    formData.append(`units[${index}][name]`, unit.name);
                    formData.append(`units[${index}][ratio]`, unit.ratio);
                    formData.append(`units[${index}][salePrice]`, unit.salePrice);
                });

                const processedSuppliers = values.suppliers.map((s) => ({
                    supplier: s.supplier,
                    isPrimary: s.isPrimary || false,
                }));
                formData.append("suppliers", JSON.stringify(processedSuppliers));

                // Xử lý ảnh cũ bị xóa (chỉ khi sửa)
                if (currentProduct && removedOldImages.length > 0) {
                    formData.append("removedImages", JSON.stringify(removedOldImages));
                }
                // Ảnh mới
                selectedImages.forEach((image) => {
                    formData.append("images", image);
                });

                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                };

                let response;
                if (currentProduct) {
                    response = await axios.patch(
                        `http://localhost:8000/api/products/${currentProduct._id}`,
                        formData,
                        config
                    );
                } else {
                    response = await axios.post(
                        "http://localhost:8000/api/products",
                        formData,
                        config
                    );
                }

                setSnackbar({
                    open: true,
                    message: currentProduct
                        ? "Cập nhật sản phẩm thành công"
                        : "Thêm sản phẩm thành công",
                    severity: "success",
                });

                handleCloseDialog();
                const updatedProducts = await axios.get("http://localhost:8000/api/products", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProducts(Array.isArray(updatedProducts.data.data) ? updatedProducts.data.data : []);
            } catch (error) {
                console.error("Lỗi khi gửi dữ liệu đến API:", error.response?.data || error.message);
                setSnackbar({
                    open: true,
                    message: error.response?.data?.message || "Lỗi khi lưu sản phẩm",
                    severity: "error",
                });
            } finally {
                setSubmitLoading(false);
            }
        },
    });

    const handleSupplierChange = (index, field, value) => {
        const newSuppliers = [...formik.values.suppliers];
        newSuppliers[index] = {
            ...newSuppliers[index],
            [field]: value,
        };
        formik.setFieldValue("suppliers", newSuppliers);
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setSelectedImages(prev => [...prev, ...newFiles]);
            const newPreviews = newFiles.map((file) => ({
                src: URL.createObjectURL(file),
                isNew: true
            }));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const handleRemoveImage = (index) => {
        const preview = imagePreviews[index];
        if (preview.isNew) {
            // Remove from selectedImages
            const newSelected = [...selectedImages];
            // Find the index of the preview in selectedImages (by order)
            let newIdx = 0;
            for (let i = 0, count = 0; i < imagePreviews.length; ++i) {
                if (imagePreviews[i].isNew) {
                    if (i === index) {
                        newSelected.splice(count, 1);
                        break;
                    }
                    count++;
                }
            }
            setSelectedImages(newSelected);
        } else {
            // Mark old image as removed
            setRemovedOldImages(prev => [...prev, preview.src]);
        }
        // Remove from previews
        const newPreviews = [...imagePreviews];
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const handleOpenAddDialog = () => {
        setCurrentProduct(null);
        formik.resetForm();
        formik.setFieldValue("units", defaultUnits);
        formik.setFieldValue("expiryThresholdDays", "");
        formik.setFieldValue("lowQuantityThreshold", "");
        setImagePreviews([]);
        setSelectedImages([]);
        setRemovedOldImages([]);
        setOpenDialog(true);
    };

    const handleOpenEditDialog = (product) => {
        setCurrentProduct(product);
        formik.setValues({
            name: product.name,
            category: product.category?._id || product.category || "",
            description: product.description || "",
            units: product.units || [],
            suppliers: (product.suppliers || []).map((s) => ({
                supplier: s.supplier?._id || s.supplier || "",
                minOrderQuantity: s.minOrderQuantity || 1,
                leadTime: s.leadTime || 0,
                isPrimary: s.isPrimary || false,
            })),
            active: product.active,
            images: [],
            barcode: product.barcode || "",
            expiryThresholdDays: product.expiryThresholdDays || "",
            lowQuantityThreshold: product.lowQuantityThreshold || "",
        });
        // Hiển thị ảnh cũ (server) và reset ảnh mới
        setImagePreviews((product.images || []).map(url => ({ src: url, isNew: false })));
        setSelectedImages([]);
        setRemovedOldImages([]);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setImagePreviews([]);
        setSelectedImages([]);
        setRemovedOldImages([]);
    };

    const handleDeleteProduct = async (id) => {
        // Find the product to determine its current active status
        const product = products.find(p => p._id === id);
        
        if (!product) return;
        
        // Different confirmation message based on active status
        const confirmMessage = product.active 
            ? "Bạn có chắc chắn muốn đánh dấu sản phẩm này thành không hoạt động?"
            : "Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm này?";
            
        const confirmDelete = window.confirm(confirmMessage);
        if (!confirmDelete) return;

        try {
            if (product.active) {
                // Soft delete - update to inactive
                await axios.patch(
                    `http://localhost:8000/api/products/${id}`,
                    { active: false },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                
                setProducts(
                    products.map((p) => (p._id === id ? { ...p, active: false } : p))
                );
                
                setSnackbar({
                    open: true,
                    message: "Sản phẩm đã được đánh dấu là không hoạt động",
                    severity: "success",
                });
            } else {
                // Hard delete - remove from database
                await axios.delete(
                    `http://localhost:8000/api/products/${id}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                
                // Remove from the products list
                setProducts(
                    products.filter((p) => p._id !== id)
                );
                
                setSnackbar({
                    open: true,
                    message: "Sản phẩm đã được xóa thành công",
                    severity: "success",
                });
            }
        } catch (error) {
            console.error("Error processing product deletion:", error);
            setSnackbar({
                open: true,
                message: "Lỗi khi xử lý sản phẩm",
                severity: "error",
            });
        }
    };

    const handleAddSupplier = () => {
        formik.setFieldValue("suppliers", [
            ...formik.values.suppliers,
            { supplier: "", minOrderQuantity: 1, leadTime: 0, isPrimary: false },
        ]);
    };

    const handleRemoveSupplier = (index) => {
        const newSuppliers = [...formik.values.suppliers];
        newSuppliers.splice(index, 1);
        formik.setFieldValue("suppliers", newSuppliers);
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Lọc theo tên sản phẩm (vẫn giữ searchTerm)
    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenDetailsDialog = (product) => {
        setCurrentProduct(product);
        setOpenDetailsDialog(true);
    };

    const handleCloseDetailsDialog = () => {
        setOpenDetailsDialog(false);
        setCurrentProduct(null);
    };

    if (isLoading) {
        return (
            <Container
                maxWidth="lg"
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "80vh",
                }}
            >
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                }}
            >
                <Typography variant="h4" component="h1">
                    Danh mục sản phẩm
                </Typography>
                <TextField
                    variant="outlined"
                    size="small"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ marginRight: 2 }}
                />
                <FormControl sx={{ minWidth: 200, marginRight: 2 }}>
                    <InputLabel id="filter-category-label">Lọc theo danh mục</InputLabel>
                    <Select
                        labelId="filter-category-label"
                        value={selectedCategoryFilter}
                        label="Lọc theo danh mục"
                        onChange={(e) => {
                            setSelectedCategoryFilter(e.target.value);
                        }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {Array.isArray(categories) &&
                            categories.map((category) => (
                                <MenuItem key={category._id} value={category._id}>
                                    {category.category_name || category.name || "Không rõ danh mục"}
                                </MenuItem>
                            ))}
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddDialog}
                >
                    Thêm Sản phẩm
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Hình ảnh</TableCell> {/* New column for images */}
                            <TableCell>Tên sản phẩm</TableCell>
                            <TableCell>Danh mục</TableCell>
                            <TableCell>Giá bán theo đơn vị</TableCell>
                            <TableCell>Đơn vị</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Hành động</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.isArray(filteredProducts) &&
                            filteredProducts
                                .sort((a, b) => {
                                    if (a.active === b.active) return 0;
                                    return a.active ? -1 : 1;
                                })
                                .map((product, index) => (
                                    <TableRow key={product._id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            {product.images && product.images.length > 0 ? (
                                                <img
                                                    src={product.images[0]}
                                                    alt="Product"
                                                    style={{ width: 50, height: 50, objectFit: "cover" }}
                                                />
                                            ) : (
                                                "Không có hình ảnh"
                                            )}
                                        </TableCell> {/* Display the first image */}
                                        <TableCell>{product.name}</TableCell>
                                        <TableCell>{product.category?.name || "Không có danh mục"}</TableCell>
                                        <TableCell>
                                            {product.units && product.units.length > 0
                                                ? product.units[0].salePrice.toLocaleString("vi-VN", {
                                                    style: "currency",
                                                    currency: "VND",
                                                })
                                                : "Chưa có giá"}
                                        </TableCell>
                                        <TableCell>
                                            {(product.units || []).map((unit) => unit.name).join(", ")}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={product.active ? "Hoạt động" : "Không hoạt động"}
                                                color={product.active ? "success" : "error"}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton onClick={() => handleOpenEditDialog(product)}>
                                                <EditIcon color="primary" />
                                            </IconButton>
                                            <IconButton onClick={() => handleDeleteProduct(product._id)}>
                                                <DeleteIcon color="error" />
                                            </IconButton>
                                            <Button
                                                variant="text"
                                                color="primary"
                                                onClick={() => handleOpenDetailsDialog(product)}
                                            >
                                                Xem chi tiết
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                    </TableBody>
                </Table>
            </TableContainer>
            
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>
                    {currentProduct ? "Chỉnh sửa Sản phẩm" : "Thêm Sản phẩm Mới"}
                </DialogTitle>
                <form onSubmit={formik.handleSubmit}>
                    <DialogContent dividers>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Thông tin cơ bản
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    id="name"
                                    name="name"
                                    label="Tên sản phẩm *"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    error={formik.touched.name && Boolean(formik.errors.name)}
                                    helperText={formik.touched.name && formik.errors.name}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="category-label">Danh mục *</InputLabel>
                                    <Select
                                        labelId="category-label"
                                        id="category"
                                        name="category"
                                        value={formik.values.category}
                                        onChange={formik.handleChange}
                                        error={formik.touched.category && Boolean(formik.errors.category)}
                                    >
                                        {Array.isArray(categories) &&
                                            categories.map((category) => (
                                                <MenuItem key={category._id} value={category._id}>
                                                    {category.category_name || category.name || "Không rõ danh mục"}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                    {formik.touched.category && formik.errors.category && (
                                        <Typography color="error" variant="caption">
                                            {formik.errors.category}
                                        </Typography>
                                    )}
                                </FormControl>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleOpenCategoryDialog}
                                    sx={{ mt: 1 }}
                                >
                                    Tạo danh mục mới
                                </Button>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="status-label">Trạng thái *</InputLabel>
                                    <Select
                                        labelId="status-label"
                                        id="status"
                                        name="status"
                                        value={formik.values.active ? "active" : "inactive"}
                                        onChange={(e) =>
                                            formik.setFieldValue("active", e.target.value === "active")
                                        }
                                    >
                                        <MenuItem value="active">Hoạt động</MenuItem>
                                        <MenuItem value="inactive">Không hoạt động</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    id="barcode"
                                    name="barcode"
                                    label="Mã vạch"
                                    value={formik.values.barcode}
                                    onChange={formik.handleChange}
                                    error={formik.touched.barcode && Boolean(formik.errors.barcode)}
                                    helperText={formik.touched.barcode && formik.errors.barcode}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    id="expiryThresholdDays"
                                    name="expiryThresholdDays"
                                    label="Ngưỡng cảnh báo hết hạn (ngày)"
                                    type="number"
                                    value={formik.values.expiryThresholdDays}
                                    helperText="Nếu để trống, sẽ sử dụng giá trị mặc định trong cài đặt"
                                    onChange={formik.handleChange}
                                    margin="normal"
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    id="lowQuantityThreshold"
                                    name="lowQuantityThreshold"
                                    label="Ngưỡng cảnh báo số lượng thấp"
                                    type="number"
                                    value={formik.values.lowQuantityThreshold}
                                    helperText="Nếu để trống, sẽ sử dụng giá trị mặc định trong cài đặt"
                                    onChange={formik.handleChange}
                                    margin="normal"
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">sản phẩm</InputAdornment>,
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    id="description"
                                    name="description"
                                    label="Mô tả"
                                    multiline
                                    rows={3}
                                    value={formik.values.description}
                                    onChange={formik.handleChange}
                                    margin="normal"
                                />
                            </Grid>
                            
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Hình ảnh sản phẩm
                                </Typography>
                                <input
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    id="contained-button-file"
                                    multiple
                                    type="file"
                                    onChange={handleImageChange}
                                />
                                <label htmlFor="contained-button-file">
                                    <Button variant="contained" color="primary" component="span">
                                        Thêm hình ảnh
                                    </Button>
                                </label>
                                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {imagePreviews.map((preview, index) => (
                                        <Box key={index} sx={{ position: 'relative' }}>
                                            <img src={preview.src} alt={`Preview ${index}`} style={{ width: 100, height: 100, objectFit: 'cover' }} />
                                            <IconButton
                                                size="small"
                                                sx={{ position: 'absolute', top: -10, right: -10, backgroundColor:'error.main', color: 'white', '&:hover': { backgroundColor: 'error.dark' } }}
                                                onClick={() => handleRemoveImage(index)}
                                            >
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                            {!preview.isNew && (
                                                <Box sx={{ position: 'absolute', bottom: 2, left: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', px: 0.5, borderRadius: 1, fontSize: 10 }}>
                                                    Ảnh cũ
                                                </Box>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Đơn vị sản phẩm *
                                </Typography>
                            </Grid>
                            {formik.values.units.map((unit, index) => (
                                <Grid container spacing={2} key={index} sx={{ mb: 2, pl: 2 }}>
                                    <Grid item xs={4}>
                                        <Autocomplete
                                            freeSolo
                                            options={predefinedUnits}
                                            value={unit.name}
                                            onChange={(event, newValue) => {
                                                const newUnits = [...formik.values.units];
                                                newUnits[index].name = newValue || "";
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            renderInput={(params) => (
                                                <TextField 
                                                    {...params} 
                                                    label="Tên đơn vị *" 
                                                    error={!unit.name}
                                                    helperText={!unit.name && "Tên đơn vị là bắt buộc"}
                                                    onChange={(e) => {
                                                        if (e.target.value !== undefined) {
                                                            const newUnits = [...formik.values.units];
                                                            newUnits[index].name = e.target.value;
                                                            formik.setFieldValue("units", newUnits);
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField
                                            fullWidth
                                            label="Tỷ lệ *"
                                            type="number"
                                            value={unit.ratio}
                                            onChange={(e) => {
                                                const newUnits = [...formik.values.units];
                                                newUnits[index].ratio = parseFloat(e.target.value) || 0;
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            error={!unit.ratio || unit.ratio < 1}
                                            helperText={
                                                (!unit.ratio || unit.ratio < 1) && "Tỷ lệ phải lớn hơn hoặc bằng 1"
                                            }
                                            disabled={unit.ratio === 1}
                                        />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField
                                            fullWidth
                                            label="Giá bán *"
                                            type="number"
                                            value={unit.salePrice}
                                            onChange={(e) => {
                                                const newUnits = [...formik.values.units];
                                                newUnits[index].salePrice = parseFloat(e.target.value) || 0;
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            error={!unit.salePrice || unit.salePrice < 0}
                                            helperText={
                                                (!unit.salePrice || unit.salePrice < 0) &&
                                                "Giá bán phải lớn hơn hoặc bằng 0"
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={2}>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => {
                                                const newUnits = [...formik.values.units];
                                                newUnits.splice(index, 1);
                                                formik.setFieldValue("units", newUnits);
                                            }}
                                            disabled={formik.values.units.length === 1 || unit.ratio === 1}
                                        >
                                            Xóa
                                        </Button>
                                    </Grid>
                                </Grid>
                            ))}
                            <Grid item xs={12}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        // Ensure new units don't have ratio 1
                                        const hasRatio1 = formik.values.units.some(unit => unit.ratio === 1);
                                        formik.setFieldValue("units", [
                                            ...formik.values.units,
                                            { name: "cái", ratio: hasRatio1 ? 2 : 1, salePrice: 0 },
                                        ]);
                                    }}
                                >
                                    Thêm đơn vị
                                </Button>
                                {formik.errors.units && (
                                    <Typography color="error" variant="caption">
                                        {formik.errors.units}
                                    </Typography>
                                )}
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Nhà cung cấp
                                </Typography>
                            </Grid>
                            {formik.values.suppliers.map((supplier, index) => (
                                <Grid container spacing={2} key={index} sx={{ mb: 2, pl: 2 }}>
                                    <Grid item xs={10}>
                                        <FormControl fullWidth>
                                            <InputLabel id={`supplier-label-${index}`}>Nhà cung cấp *</InputLabel>
                                            <Select
                                                labelId={`supplier-label-${index}`}
                                                value={supplier.supplier}
                                                onChange={(e) =>
                                                    handleSupplierChange(index, "supplier", e.target.value)
                                                }
                                                error={!supplier.supplier}
                                            >
                                                {Array.isArray(suppliers) &&
                                                    suppliers.map((s) => (
                                                        <MenuItem key={s._id} value={s._id}>
                                                            {s.name || s.supplier_name || "Không rõ nhà cung cấp"}
                                                        </MenuItem>
                                                    ))}
                                            </Select>
                                            {!supplier.supplier && (
                                                <Typography color="error" variant="caption">
                                                    Nhà cung cấp là bắt buộc
                                                </Typography>
                                            )}
                                        </FormControl>
                                    </Grid>
                                    {/* <Grid item xs={3}>
                                        <TextField
                                            fullWidth
                                            label="Số lượng tối thiểu"
                                            type="number"
                                            value={supplier.minOrderQuantity || ""}
                                            onChange={(e) =>
                                                handleSupplierChange(index, "minOrderQuantity", parseInt(e.target.value))
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={2}>
                                        <TextField
                                            fullWidth
                                            label="Thời gian (ngày)"
                                            type="number"
                                            value={supplier.leadTime || ""}
                                            onChange={(e) =>
                                                handleSupplierChange(index, "leadTime", parseInt(e.target.value))
                                            }
                                        />
                                    </Grid> */}
                                    {/* <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconButton
                                            onClick={() => handleSupplierChange(index, "isPrimary", !supplier.isPrimary)}
                                            color={supplier.isPrimary ? "primary" : "default"}
                                            title="Nhà cung cấp chính"
                                        >
                                            {supplier.isPrimary ? <Typography variant="caption" color="primary">Chính</Typography> : <Typography variant="caption">Chính</Typography>}
                                        </IconButton>
                                    </Grid> */}
                                    <Grid item xs={2}>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => handleRemoveSupplier(index)}
                                        >
                                            Xóa
                                        </Button>
                                    </Grid>
                                </Grid>
                            ))}
                            <Grid item xs={12}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleAddSupplier}
                                >
                                    Thêm nhà cung cấp
                                </Button>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} disabled={submitLoading}>Hủy</Button>
                        <Button
                            type="submit"
                            color="primary"
                            variant="contained"
                            disabled={submitLoading}
                            startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {currentProduct ? "Cập nhật" : "Thêm mới"}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} fullWidth maxWidth="md">
                <DialogTitle>{currentProduct?.name}</DialogTitle>
                <DialogContent dividers>
                    {currentProduct && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Danh mục: {currentProduct.category?.name || "Không có"}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Trạng thái: {currentProduct.active ? "Hoạt động" : "Không hoạt động"}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Mã vạch: {currentProduct.barcode || "Không có"}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Đơn vị: {(currentProduct.units || []).map(unit => `${unit.name} (tỷ lệ: ${unit.ratio}, giá: ${unit.salePrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })})`).join(", ")}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">Nhà cung cấp: {(currentProduct.suppliers || []).map(s => s.supplier?.name || s.supplier).join(", ")}</Typography>
                            </Grid>
                            {currentProduct.description && (
                                <Grid item xs={12}>
                                    <Typography variant="body2">Mô tả: {currentProduct.description}</Typography>
                                </Grid>
                            )}
                            {currentProduct.images && currentProduct.images.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1">Hình ảnh:</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {currentProduct.images.map((image, index) => (
                                            <img key={index} src={image} alt={`Sản phẩm ${index}`} style={{ maxWidth: '100px', height: 'auto' }} />
                                        ))}
                                    </Box>
                                </Grid>
                            )}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">
                                    Ngưỡng cảnh báo hết hạn: {currentProduct.expiryThresholdDays || settings.expiryThresholdDays} ngày
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1">
                                    Ngưỡng cảnh báo số lượng thấp: {currentProduct.lowQuantityThreshold || settings.lowQuantityThreshold} sản phẩm
                                </Typography>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetailsDialog}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog}>
                <DialogTitle>Tạo danh mục mới</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tên danh mục"
                        fullWidth
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Mô tả"
                        fullWidth
                        multiline
                        rows={3}
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCategoryDialog}>Hủy</Button>
                    <Button onClick={handleCreateCategory} variant="contained">
                        Tạo mới
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ProductManager;