const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');

exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().populate('subcategories');
  res.json(categories);
});

exports.getCategoryTree = asyncHandler(async (req, res) => {
  const buildTree = async (parentId = null) => {
    const categories = await Category.find({ parentCategory: parentId });
    for (const category of categories) {
      category.subcategories = await buildTree(category._id);
    }
    return categories;
  };
  const tree = await buildTree();
  res.json(tree);
});

exports.getCategoryById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid ID');
  }
  const category = await Category.findById(req.params.id).populate('parentCategory');
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.json(category);
});

exports.createCategory = asyncHandler(async (req, res) => {
  await body('name').notEmpty().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }
  const { name, description, parentCategory, isActive } = req.body;
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    res.status(400);
    throw new Error('Category exists');
  }
  const category = await Category.create({
    name,
    description,
    parentCategory: parentCategory || null,
    isActive
  });
  res.status(201).json(category);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid ID');
  }
  if (req.body.parentCategory && !mongoose.Types.ObjectId.isValid(req.body.parentCategory)) {
    res.status(400);
    throw new Error('Invalid parent ID');
  }
  const updateData = {
    ...req.body,
    parentCategory: req.body.parentCategory || null
  };
  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  if (!updatedCategory) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.json(updatedCategory);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid ID');
  }
  const hasProducts = await Product.exists({ category: req.params.id });
  if (hasProducts) {
    res.status(400);
    throw new Error('Category has products');
  }
  await Category.deleteMany({ 
    $or: [
      { _id: req.params.id },
      { parentCategory: req.params.id }
    ]
  });
  res.json({ message: 'Deleted' });
});