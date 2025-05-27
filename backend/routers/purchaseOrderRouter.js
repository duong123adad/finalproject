const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const adminProtect = [protect, restrictTo('admin')];

router.post('/', adminProtect, purchaseOrderController.createPurchaseOrder);
router.get('/', adminProtect, purchaseOrderController.getAllPurchaseOrders);
router.get('/:id', adminProtect, purchaseOrderController.getPurchaseOrderById);
router.put('/:id', adminProtect, purchaseOrderController.updatePurchaseOrder);
router.delete('/:id', adminProtect, purchaseOrderController.deletePurchaseOrder);
router.post('/:id/resend-email', adminProtect, purchaseOrderController.resendPurchaseOrderEmail);


module.exports = router;        