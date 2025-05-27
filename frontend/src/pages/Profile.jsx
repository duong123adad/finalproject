import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Alert,
    Card,
    CardContent,
    Avatar,
    Stack,
    TextField,
    Button,
    Grid,
    CircularProgress,
    Paper,
    Divider,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/user';

const getAuthToken = () => localStorage.getItem('authToken');

const authHeader = () => ({
    headers: {
        Authorization: `Bearer ${getAuthToken()}`,
    },
});

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Loading = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
    </Box>
);

const ProfileCard = ({ user, onEditClick }) => (
    <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
            <Avatar
                alt={user.fullName}
                src={user.profileImage}
                sx={{ width: 100, height: 100 }}
            />
            <IconButton
                onClick={onEditClick}
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                        backgroundColor: 'primary.dark',
                    },
                }}
                size="small"
            >
                <EditIcon fontSize="small" />
            </IconButton>
        </Box>
        <Typography variant="h6" component="div" gutterBottom align="center">
            {user.fullName}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom align="center">
            @{user.username}
        </Typography>
        <Divider sx={{ width: '80%', my: 2 }} />
        <Stack spacing={1} sx={{ width: '100%', textAlign: 'center' }}>
            <Typography variant="body2">Email: {user.email}</Typography>
            {user.phone && <Typography variant="body2">Điện thoại: {user.phone}</Typography>}
            {user.address && (
                <Typography variant="body2">
                    Địa chỉ: {user.address.street}, {user.address.city}, {user.address.state}, {user.address.postalCode}, {user.address.country}
                </Typography>
            )}
            {user.dateOfBirth && <Typography variant="body2">Ngày sinh: {formatDate(user.dateOfBirth)}</Typography>}
            {user.gender && <Typography variant="body2">Giới tính: {user.gender}</Typography>}
            <Typography variant="body2">Vai trò: {user.role}</Typography>
            <Typography variant="body2">Trạng thái: {user.isActive ? 'Hoạt động' : 'Không hoạt động'}</Typography>
            {user.lastLogin && <Typography variant="body2">Đăng nhập cuối: {formatDate(user.lastLogin)}</Typography>}
        </Stack>
    </Paper>
);

const ProfileForm = ({ initialUser, onUpdateSuccess, onError }) => {
    const [formData, setFormData] = useState({ ...initialUser });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData({ ...initialUser });
    }, [initialUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const parts = name.split('.');
        if (parts.length > 1) {
            const [parent, child] = parts;
            setFormData(prevData => ({
                ...prevData,
                [parent]: {
                    ...prevData[parent],
                    [child]: value,
                },
            }));
        } else {
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const userId = localStorage.getItem('userID');
            const response = await axios.put(`${API_BASE_URL}/${userId}`, formData, authHeader());
            onUpdateSuccess(response.data);
        } catch (error) {
            onError(error.message || 'Lỗi khi cập nhật thông tin.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }} id="profile-form">
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Tên đầy đủ"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Tên người dùng"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        disabled
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Số điện thoại"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Ngày sinh"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth ? formatDateForInput(formData.dateOfBirth) : ''}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        fullWidth
                        label="Đường phố"
                        name="address.street"
                        value={formData.address?.street || ''}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        fullWidth
                        label="Thành phố"
                        name="address.city"
                        value={formData.address?.city || ''}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        fullWidth
                        label="Mã bưu điện"
                        name="address.postalCode"
                        value={formData.address?.postalCode || ''}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                    <TextField
                        fullWidth
                        label="Quốc gia"
                        name="address.country"
                        value={formData.address?.country || ''}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                    <TextField
                        fullWidth
                        label="Giới tính"
                        name="gender"
                        value={formData.gender || ''}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Ảnh đại diện (URL)"
                        name="profileImage"
                        value={formData.profileImage || ''}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Đang cập nhật...' : 'Lưu'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const userId = localStorage.getItem('userID');
                if (!userId) {
                    setError('Không tìm thấy ID người dùng. Vui lòng kiểm tra bạn đã đăng nhập.');
                    setLoading(false);
                    return;
                }
                const response = await axios.get(`${API_BASE_URL}/${userId}`, authHeader());
                setUser(response.data);
                setLoading(false);
            } catch (err) {
                setError('Không thể tải thông tin người dùng. Vui lòng kiểm tra bạn đã đăng nhập và token.');
                setLoading(false);
                console.error(err);
            }
        };

        fetchCurrentUser();
    }, []);

    const handleUpdateSuccess = (updatedUser) => {
        setUser(updatedUser);
        setSuccessMessage('Thông tin đã được cập nhật thành công!');
        setError('');
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleUpdateError = (errorMessage) => {
        setError(errorMessage);
        setSuccessMessage('');
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleCloseEdit = () => {
        setIsEditing(false);
    };

    return (
        <Container
            maxWidth="md"
            sx={{
                mt: 4,
                pb: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingX: isMobile ? 2 : 3, // Điều chỉnh padding cho mobile
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom align="center">
                Thông tin cá nhân
            </Typography>
            {successMessage && <Alert severity="success" sx={{ mb: 2, width: '100%' }}>{successMessage}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
            {loading ? (
                <Loading />
            ) : user ? (
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    <ProfileCard user={user} onEditClick={handleEditClick} />
                    {!isEditing && (
                        <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditClick} sx={{ mt: 2 }}>
                            Chỉnh sửa thông tin
                        </Button>
                    )}
                </Box>
            ) : (
                <Typography color="error">Không có dữ liệu người dùng.</Typography>
            )}

            <Dialog open={isEditing} onClose={handleCloseEdit} fullWidth maxWidth="md">
                <DialogTitle>Chỉnh sửa thông tin cá nhân</DialogTitle>
                <DialogContent sx={{ overflowY: 'auto', padding: 2 }}>
                    {user && (
                        <ProfileForm
                            initialUser={user}
                            onUpdateSuccess={handleUpdateSuccess}
                            onError={handleUpdateError}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ padding: 2 }}>
                    <Button onClick={handleCloseEdit}>Hủy</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ProfilePage;