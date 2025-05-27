const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'product_images',
        format: async (req, file) => {
            const format = file.mimetype.split('/')[1];
            return format || 'png';
        },
        public_id: (req, file) => {
            const timestamp = Date.now();
            const originalName = file.originalname.split('.')[0];
            return `${originalName}_${timestamp}`;
        },
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, 
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ được phép upload file ảnh!'), false);
        }
    },
});

module.exports = upload;