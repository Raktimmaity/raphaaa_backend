// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// // Middleware to protect routes
// const protect = async (req, res, next) => {
//     let token;

//     if(
//         req.headers.authorization &&
//         req.headers.authorization.startsWith("Bearer")
//     ) {
//         try {
//             token = req.headers.authorization.split(" ")[1];
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);

//             req.user = await User.findById(decoded.user.id).select("-password"); // Exclude password
//             next();
//         } catch (error) {
//             console.error("Token verification failed:", error);
//             res.status(401).json({ message: "Not authorized, token failed" });
//         }
//     } else {
//         res.status(401).json({ message: "Not authorized, no token provided" });
//     }
// };

// // Middleware to check if the user is an admin
// const admin = (req, res, next) => {
//     if(req.user && req.user.role === "admin") {
//         next();
//     } else {
//         res.status(403).json({message: "Not authorized as an admin"});
//     }
// };

// module.exports = { protect, admin };

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect routes
const protect = async (req, res, next) => {
    let token;

    if(
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];
            
            // Debug logging (remove in production)
            console.log('Token received:', token);
            
            // Check if token exists and has proper format
            if (!token) {
                return res.status(401).json({ message: "Not authorized, no token" });
            }
            
            // Verify token has 3 parts (header.payload.signature)
            if (token.split('.').length !== 3) {
                return res.status(401).json({ message: "Invalid token format" });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded); // Debug logging
            
            // Handle different token structures
            let userId;
            if (decoded.user && decoded.user.id) {
                userId = decoded.user.id;
            } else if (decoded.id) {
                userId = decoded.id;
            } else {
                return res.status(401).json({ message: "Invalid token structure" });
            }

            req.user = await User.findById(userId).select("-password");
            
            if (!req.user) {
                return res.status(401).json({ message: "User not found" });
            }
            
            next();
        } catch (error) {
            console.error("Token verification failed:", error);
            
            // Provide more specific error messages
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: "Invalid token" });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Token expired" });
            } else {
                return res.status(401).json({ message: "Not authorized, token failed" });
            }
        }
    } else {
        res.status(401).json({ message: "Not authorized, no token provided" });
    }
};

// Middleware to check if the user is an admin
const admin = (req, res, next) => {
    if(req.user && (req.user.role === "admin" || req.user.role === "merchantise")) {
        next();
    } else {
        res.status(403).json({message: "Not authorized as an admin"});
    }
};

const adminOrMerchantise = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "merchantise")) {
    next();
  } else {
    res.status(401).json({ message: "Not authorized as admin/merchantise" });
  }
};


module.exports = { protect, admin, adminOrMerchantise };