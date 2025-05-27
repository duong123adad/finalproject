const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { isValidObjectId } = require("mongoose");
exports.createCart = async (req, res) => {
  try {
    const newCart = new Cart({ user: req.user._id, items: [], total: 0 });
    await newCart.save();
    res.status(201).json({ message: "Tạo giỏ hàng thành công", cart: newCart });
  } catch (error) {
    console.error("Lỗi tạo giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};
exports.addToCart = async (req, res) => {
  try {
    let itemsToAdd = req.body;

    if (!Array.isArray(itemsToAdd)) {
      // Nếu req.body không phải là mảng, coi nó là một sản phẩm duy nhất
      itemsToAdd = [req.body];
    }

    const cart = await Cart.findOne({ user: req.user._id });
    let updatedCart = cart || new Cart({ user: req.user._id, items: [], total: 0 });
    let newItems = [];
    let totalToAdd = 0;

    for (const itemData of itemsToAdd) {
      const { productId, quantity, selectedUnitName } = itemData;
      const quantityToAdd = parseInt(quantity, 10);

      if (!isValidObjectId(productId)) {
        return res.status(400).json({ message: `ID sản phẩm '${productId}' không hợp lệ` });
      }

      if (!Number.isInteger(quantityToAdd) || quantityToAdd < 1) {
        return res.status(400).json({ message: `Số lượng cho sản phẩm '${productId}' phải là số nguyên dương` });
      }

      if (!selectedUnitName) {
        return res.status(400).json({ message: `Vui lòng cung cấp selectedUnitName cho sản phẩm '${productId}'.` });
      }

      const product = await Product.findById(productId);
      if (!product || !product.active) {
        return res.status(404).json({ message: `Không tìm thấy sản phẩm hoặc sản phẩm không hoạt động với ID '${productId}'` });
      }

      const selectedUnit = product.units.find((u) => u.name === selectedUnitName);
      if (!selectedUnit) {
        return res.status(400).json({ message: `Không tìm thấy đơn vị '${selectedUnitName}' cho sản phẩm '${product.name}'` });
      }

      const existingItemIndex = updatedCart.items.findIndex(
        (item) => item.product.toString() === productId && item.selectedUnitName === selectedUnitName
      );

      if (existingItemIndex > -1) {
        // Sản phẩm đã tồn tại, tăng số lượng
        updatedCart.items[existingItemIndex].quantity += quantityToAdd;
      } else {
        // Sản phẩm chưa tồn tại, thêm mới vào mảng newItems
        newItems.push({
          product: productId,
          quantity: quantityToAdd,
          selectedUnitName: selectedUnitName,
          unitPrice: selectedUnit.salePrice,
        });
      }
      totalToAdd += quantityToAdd * selectedUnit.salePrice;
    }

    // Thêm các sản phẩm mới vào giỏ hàng
    updatedCart.items = [...updatedCart.items, ...newItems];

    // Cập nhật lại tổng tiền
    updatedCart.total = updatedCart.items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0
    );

    await updatedCart.save();
    await updatedCart.populate("items.product", "name units images");
    res.status(200).json({ message: "Đã thêm vào giỏ hàng", cart: updatedCart });
  } catch (error) {
    console.error("Lỗi thêm vào giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};
exports.updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, selectedUnitName } = req.body;
    const newQuantity = parseInt(quantity, 10);

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    if (!Number.isInteger(newQuantity) || newQuantity < 0) {
      return res.status(400).json({ message: "Số lượng phải là số nguyên không âm" });
    }

    if (!selectedUnitName) {
      return res.status(400).json({ message: "Vui lòng cung cấp selectedUnitName." });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.selectedUnitName === selectedUnitName
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    if (newQuantity === 0) {
      // Nếu số lượng mới là 0, xóa sản phẩm khỏi giỏ
      cart.items.splice(itemIndex, 1);
    } else {
      // Cập nhật số lượng
      cart.items[itemIndex].quantity = newQuantity;
    }

    // Cập nhật lại tổng tiền
    cart.total = cart.items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0
    );

    await cart.save();
    await cart.populate("items.product", "name units images");
    res.status(200).json({ message: "Đã cập nhật giỏ hàng", cart });
  } catch (error) {
    console.error("Lỗi cập nhật số lượng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};
exports.createOrUpdateCart = async (req, res) => {
  try {
    const itemsToUpdate = req.body;

    if (!Array.isArray(itemsToUpdate)) {
      return res
        .status(400)
        .json({ message: "Dữ liệu gửi lên phải là một mảng các sản phẩm" });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    } else {
      // Xóa tất cả các item hiện có trong giỏ hàng
      cart.items = [];
    }

    // Thêm các item mới từ req.body vào giỏ hàng
    for (const itemData of itemsToUpdate) {
      const { productId, quantity, selectedUnitName } = itemData;
      const quantityToAdd = parseInt(quantity, 10);

      if (!isValidObjectId(productId)) {
        return res
          .status(400)
          .json({ message: `ID sản phẩm '${productId}' không hợp lệ` });
      }

      if (!Number.isInteger(quantityToAdd) || quantityToAdd < 1) {
        return res.status(400).json({
          message: `Số lượng cho sản phẩm '${productId}' phải là số nguyên dương`,
        });
      }

      const product = await Product.findById(productId);
      if (!product || !product.active) {
        return res.status(404).json({
          message: `Không tìm thấy sản phẩm hoặc sản phẩm không hoạt động với ID '${productId}'`,
        });
      }

      const selectedUnit = product.units.find(
        (u) => u.name === selectedUnitName
      );
      if (!selectedUnit) {
        return res.status(400).json({
          message: `Không tìm thấy đơn vị '${selectedUnitName}' cho sản phẩm '${product.name}'`,
        });
      }

      cart.items.push({
        product: productId,
        quantity: quantityToAdd,
        selectedUnitName: selectedUnitName,
        unitPrice: selectedUnit.salePrice,
      });
    }

    // Tính toán lại tổng tiền của giỏ hàng
    cart.total = cart.items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0
    );

    await cart.save();
    await cart.populate("items.product", "name units images");
    res.status(200).json({ message: "Cập nhật giỏ hàng thành công", cart });
  } catch (error) {
    console.error("Lỗi cập nhật giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};
exports.createCart = async (req, res) => {
  try {
    const itemsToCreate = req.body; // Mong đợi một mảng các sản phẩm để thêm vào giỏ mới

    if (!Array.isArray(itemsToCreate) || itemsToCreate.length === 0) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp sản phẩm để thêm vào giỏ hàng." });
    }

    const newCart = new Cart({ user: req.user._id, items: [] });

    for (const itemData of itemsToCreate) {
      const { productId, quantity, selectedUnitName } = itemData;
      const quantityToAdd = parseInt(quantity, 10);

      if (!isValidObjectId(productId)) {
        return res
          .status(400)
          .json({ message: `ID sản phẩm '${productId}' không hợp lệ` });
      }

      if (!Number.isInteger(quantityToAdd) || quantityToAdd < 1) {
        return res.status(400).json({
          message: `Số lượng cho sản phẩm '${productId}' phải là số nguyên dương`,
        });
      }

      const product = await Product.findById(productId);
      if (!product || !product.active) {
        return res.status(404).json({
          message: `Không tìm thấy sản phẩm hoặc sản phẩm không hoạt động với ID '${productId}'`,
        });
      }

      const selectedUnit = product.units.find(
        (u) => u.name === selectedUnitName
      );
      if (!selectedUnit) {
        return res.status(400).json({
          message: `Không tìm thấy đơn vị '${selectedUnitName}' cho sản phẩm '${product.name}'`,
        });
      }

      newCart.items.push({
        product: productId,
        quantity: quantityToAdd,
        selectedUnitName: selectedUnitName,
        unitPrice: selectedUnit.salePrice,
      });
    }

    // Tính toán tổng tiền cho giỏ hàng mới
    let total = 0;
    for (let item of newCart.items) {
      total += item.quantity * item.unitPrice;
    }
    newCart.total = total;

    await newCart.save();
    await newCart.populate("items.product", "name units images");
    res.status(201).json({ message: "Tạo giỏ hàng thành công", cart: newCart });
  } catch (error) {
    console.error("Lỗi tạo giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};
exports.getCart = async (req, res) => {
  try {
    // Nếu không đăng nhập, trả về giỏ hàng rỗng để FE lấy từ localStorage
    if (!req.user || !req.user.id) {
      return res.status(200).json({ items: [], total: 0 });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "name units images",
    });

    if (!cart) {
      return res.status(200).json({ items: [], total: 0 });
    }

    let total = 0;
    for (let item of cart.items) {
      const product = item.product;
      const selectedUnit = product.units.find(
        (u) => u.name === item.selectedUnitName
      );
      const price = selectedUnit ? selectedUnit.salePrice : 0;

      // Cập nhật lại unitPrice
      item.unitPrice = price;
      total += price * item.quantity;
    }

    cart.total = total;
    await cart.save({ validateBeforeSave: false }); // Lưu lại unitPrice và total đã cập nhật

    res.status(200).json(cart);
  } catch (error) {
    console.error("Lỗi lấy giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { selectedUnitName } = req.body; // Lấy selectedUnitName từ body

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    if (!selectedUnitName) {
      return res.status(400).json({ message: "Vui lòng cung cấp selectedUnitName trong body." });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    console.log("productId to remove:", productId);
    console.log("selectedUnitName to remove:", selectedUnitName);
    console.log("Current cart items:", cart.items.map(item => ({
      productId: item.product._id.toString(),
      selectedUnitName: item.selectedUnitName,
      _id: item._id
    })));

    cart.items = cart.items.filter(
      (item) =>
        item.product.toString() !== productId ||
        item.selectedUnitName !== selectedUnitName
    );

    // Tính toán lại tổng tiền
    let total = 0;
    if (cart.items && cart.items.length > 0) {
      for (let item of cart.items) {
        total += item.quantity * item.unitPrice;
      }
    }
    cart.total = total;

    await cart.save();
    await cart.populate("items.product", "name units images");
    res.status(200).json({ message: "Đã xóa sản phẩm khỏi giỏ hàng", cart });
  } catch (error) {
    console.error("Lỗi xóa khỏi giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOneAndDelete({ user: req.user._id });
    res.status(200).json({ message: "Đã xóa giỏ hàng thành công", cart: null });
  } catch (error) {
    console.error("Lỗi xóa giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};
