import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, 
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, IconButton, Collapse, Typography 
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import axios from 'axios';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [formValues, setFormValues] = useState({ 
    _id: '', 
    name: '', 
    description: '', 
    parentCategory: null, 
    isActive: true 
  });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/categories/tree');
      setCategories(response.data);
    } catch (error) {
      showSnackbar('Load failed', 'error');
    }
  };

  const handleToggleExpand = (id) => {
    const newExpanded = new Set(expandedRows);
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const handleOpenAdd = () => {
    setFormValues({ _id: '', name: '', description: '', parentCategory: null, isActive: true });
    setEditMode(false);
    setOpenDialog(true);
  };

  const handleOpenEdit = (category) => {
    setFormValues({ 
      ...category, 
      parentCategory: category.parentCategory?._id || null 
    });
    setEditMode(true);
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editMode && !formValues._id) {
        showSnackbar('Invalid ID', 'error');
        return;
      }
      
      const url = editMode 
        ? `http://localhost:8000/api/categories/${formValues._id}`
        : 'http://localhost:8000/api/categories';
      
      const payload = {
        ...formValues,
        parentCategory: formValues.parentCategory || null
      };
      delete payload._id;

      await axios[editMode ? 'put' : 'post'](url, payload);
      fetchCategories();
      showSnackbar(editMode ? 'Updated' : 'Created');
      setOpenDialog(false);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/categories/${id}`);
      fetchCategories();
      showSnackbar('Deleted');
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const renderCategories = (items, level = 0) => {
    return items.map((category) => (
      <React.Fragment key={category._id}>
        <TableRow>
          <TableCell>
            <IconButton size="small" onClick={() => handleToggleExpand(category._id)}>
              {category.subcategories?.length > 0 ? (
                expandedRows.has(category._id) ? <ExpandLess /> : <ExpandMore />
              ) : null}
            </IconButton>
            {' '.repeat(level)}{category.name}
          </TableCell>
          <TableCell>{category.description}</TableCell>
          <TableCell>{category.isActive ? 'Active' : 'Inactive'}</TableCell>
          <TableCell>
            <IconButton onClick={() => handleOpenEdit(category)}><Edit /></IconButton>
            <IconButton onClick={() => handleDelete(category._id)}><Delete /></IconButton>
          </TableCell>
        </TableRow>
        {category.subcategories?.length > 0 && (
          <TableRow>
            <TableCell style={{ padding: 0 }} colSpan={4}>
              <Collapse in={expandedRows.has(category._id)}>
                <Table size="small"><TableBody>{renderCategories(category.subcategories, level + 1)}</TableBody></Table>
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Quản lý loại sản phẩm</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>Thêm loại sản phẩm</Button>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: 'calc(100vh - 190px)', 
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#888', borderRadius: 4 }
        }}
        stickyHeader
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Mô tả</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderCategories(categories)}</TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{editMode ? 'Update' : 'Create'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={formValues.name}
            onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formValues.description}
            onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CategoryManager; 