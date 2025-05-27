const jwt = require("jsonwebtoken");

const middlewareController = {
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      req.user = decoded;
      next();
    });
  },

  verifyTokenAndAdmin: (req, res, next) => {
    middlewareController.verifyToken(req, res, () => {
      if (req.user.role === "admin" || req.user.role === "manager") {
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to perform this action",
        });
      }
    });
  },

  verifyTokenAndAuthorization: (req, res, next) => {
    middlewareController.verifyToken(req, res, () => {
      if (
        req.user.id === req.params.id ||
        req.user.role === "admin" ||
        req.user.role === "manager"
      ) {
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access this resource",
        });
      }
    });
  },

  verifyTokenAndStaff: (req, res, next) => {
    middlewareController.verifyToken(req, res, () => {
      if (req.user.role !== "customer") {
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: "Staff or higher role required",
        });
      }
    });
  },

  optionalToken: (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) {
          req.user = decoded;
        }
        next();
      });
    } else {
      next();
    }
  },
};

module.exports = middlewareController;
