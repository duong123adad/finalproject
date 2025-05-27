const PurchaseOrder = require('../models/PurchaseOrder');
const { sendEmail } = require('../config/nodemailer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const GoodReceipt = require('../models/Goodreceipt');

const purchaseOrderController = {
  createPurchaseOrder: async (req, res) => {
    try {
      const { supplier, items, expectedDeliveryDate, notes, deliveryAddress, paymentMethod, sendEmailFlag } = req.body;

      if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin: nhà cung cấp và danh sách sản phẩm.' });
      }

      const supplierData = await Supplier.findById(supplier);
      if (!supplierData) {
        return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp.' });
      }

      let totalAmount = 0;
      for (const item of items) {
        if (!item.product || !item.quantity || !item.unit || !item.conversionRate) {
          return res.status(400).json({ message: 'Thiếu thông tin cho một sản phẩm trong đơn hàng.' });
        }

        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Không tìm thấy sản phẩm với ID: ${item.product}` });
        }

        // Find the unit with the matching name and get its salePrice
        const unit = product.units.find(u => u.name === item.unit);
        if (!unit) {
          return res.status(400).json({ message: `Không tìm thấy đơn vị '${item.unit}' cho sản phẩm ${product.name}.` });
        }

        const itemTotal = unit.salePrice * item.quantity;
        totalAmount += itemTotal;
      }

      const newOrder = new PurchaseOrder({
        supplier,
        supplierName: supplierData.name,
        createdBy: req.user.id,
        createdByName: req.user.fullName,
        items,
        totalAmount,
        expectedDeliveryDate,
        notes,
        deliveryAddress,
        paymentMethod,
      });

      const savedOrder = await newOrder.save();
      const populatedOrder = await PurchaseOrder.findById(savedOrder._id)
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers',
          },
        })
        .populate('supplier', 'name contact');

      if (sendEmailFlag && supplierData.contact && supplierData.contact.email) {
        await sendPurchaseOrderEmail(supplierData.contact.email, populatedOrder);
      }

      res.status(201).json(populatedOrder);
    } catch (error) {
      console.error('Lỗi tạo phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi tạo phiếu đặt hàng', error: error.message });
    }
  },

  getAllPurchaseOrders: async (req, res) => {
    try {
      const orders = await PurchaseOrder.find()
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers.supplier', // Make sure this matches the schema
          },
        })
        .populate('supplier', 'name contact'); // NOT supplierId, but supplier

      res.status(200).json(orders);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách phiếu đặt hàng', error: error.message });
    }
  },

  getPurchaseOrderById: async (req, res) => {
    try {
      const order = await PurchaseOrder.findById(req.params.id)
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers.supplier', // Make sure this matches the schema
          },
        })
        .populate('supplier', 'name contact'); // NOT supplierId, but supplier

      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng.' });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi lấy chi tiết phiếu đặt hàng', error: error.message });
    }
  },

  updatePurchaseOrder: async (req, res) => {
    try {
      const { expectedDeliveryDate, ...rest } = req.body;
      const orderId = req.params.id;

      const order = await PurchaseOrder.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng để cập nhật.' });
      }

      if (expectedDeliveryDate) {
        const expectedDate = new Date(expectedDeliveryDate);
        if (expectedDate.getTime() < order.orderDate.getTime()) {
          return res.status(400).json({ message: 'Ngày giao hàng dự kiến phải lớn hơn hoặc bằng ngày đặt hàng.' });
        }
      }

      const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
        orderId,
        { ...rest, expectedDeliveryDate },
        { new: true, runValidators: true }
      )
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers',
          },
        })
        .populate('supplier', 'name contact');

      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error('Lỗi cập nhật phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật phiếu đặt hàng', error: error.message });
    }
  },

  deletePurchaseOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      const deletedOrder = await PurchaseOrder.findByIdAndDelete(orderId);

      if (!deletedOrder) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng để xóa.' });
      }

      res.status(200).json({ message: 'Phiếu đặt hàng đã được xóa thành công.' });
    } catch (error) {
      console.error('Lỗi xóa phiếu đặt hàng:', error);
      res.status(500).json({ message: 'Lỗi khi xóa phiếu đặt hàng', error: error.message });
    }
  },

  resendPurchaseOrderEmail: async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await PurchaseOrder.findById(orderId)
        .populate({
          path: 'items.product',
          populate: {
            path: 'suppliers',
          },
        })
        .populate('supplier', 'name contact');

      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy phiếu đặt hàng.' });
      }

      if (order.supplier && order.supplier.contact && order.supplier.contact.email) {
        await sendPurchaseOrderEmail(order.supplier.contact.email, order);
        res.status(200).json({ message: 'Email đã được gửi lại thành công.' });
      } else {
        res.status(400).json({ message: 'Không tìm thấy email của nhà cung cấp.' });
      }
    } catch (error) {
      console.error('Lỗi khi gửi lại email đơn hàng:', error);
      res.status(500).json({ message: 'Lỗi khi gửi lại email đơn hàng', error: error.message });
    }
  },
};

const sendPurchaseOrderEmail = async (toEmail, order) => {
  try {
    const itemsListHtml = order.items.map((item, index) => {
      const productName = item.product ? item.product.name : 'Không rõ';
      const unit = item.product?.units.find(u => u.name === item.unit);
      const purchasePrice = unit ? unit.purchasePrice : 0; // Changed from salePrice to purchasePrice
      const itemTotal = purchasePrice * item.quantity;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${productName}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>${purchasePrice.toLocaleString()} đ</td>
          <td>${item.conversionRate}</td>
          <td>${itemTotal.toLocaleString()} đ</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      to: toEmail,
      subject: 'Xác nhận đơn đặt hàng mới',
      html: `
        <p>Kính gửi quý đối tác,</p>
        <p>Chúng tôi xin trân trọng thông báo về đơn đặt hàng mới của quý vị. Chi tiết đơn hàng như sau:</p>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Sản phẩm</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Quy đổi</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>
        <p>Tổng giá trị đơn hàng: <strong>${order.totalAmount.toLocaleString()} đ</strong></p>
        <p>Xin chân thành cảm ơn sự hợp tác của quý vị.</p>
        <p>Trân trọng,</p>
        <p>Phòng mua hàng</p>
      `,
    };

    await sendEmail(mailOptions);
    console.log(`Đã gửi email đơn hàng đến: ${toEmail}`);
  } catch (error) {
    console.error('Lỗi khi gửi email đơn hàng:', error);
  }
};

module.exports = purchaseOrderController;