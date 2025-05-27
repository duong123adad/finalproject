const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Apply authentication to all routes
router.use(protect);

// Routes
router.route('/')
    .get(restrictTo('admin', 'employee'), supplierController.getAllSuppliers)
    .post(restrictTo('admin'), supplierController.createSupplier);

router.route('/:id')
    .get(restrictTo('admin', 'employee'), supplierController.getSupplierById)
    .put(restrictTo('admin'), supplierController.updateSupplier)
    .delete(restrictTo('admin'), supplierController.deleteSupplier);

router.patch('/:id/status', 
    restrictTo('admin'), 
    supplierController.toggleSupplierStatus);

router.get('/:id/products', 
    restrictTo('admin', 'employee'), 
    supplierController.getProductsBySupplier);

module.exports = router;