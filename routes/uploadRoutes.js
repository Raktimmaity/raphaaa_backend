// const express = require("express");
// const multer = require("multer");
// const cloudinary = require("cloudinary").v2;
// const streamifier = require("streamifier");

// require("dotenv").config();

// const router = express.Router();

// // Cloudinary configuration
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Multer setup using memory storage
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// router.post("/", upload.single("image"), async(req, res) => {
//     try {
//         if(!req.file){
//             return res.status(400).json({ message: "no file Uploaded" });
//         }

//         // function to handle the stream upload to cloudinary
//         const streamUpload = (fileBuffer) => {
//             return new Promise((resolve, reject) => {
//                 const stream = cloudinary.uploader.upload_stream((error, result) => {
//                     if(result){
//                         resolve(result);
//                     } else {
//                         reject(error);
//                     }
//                 });

//                 // Use streamifier to convert file buffer to a stream
//                 streamifier.createReadStream(fileBuffer).pipe(stream);
//             });
//         };

//         // Call the stream Upload function
//         const result = await streamUpload(req.file.buffer);
//         // console.log("File uploaded successfully:", result);

//         // Respond with the uploaded image URL
//         res.json({ imageUrl: result.secure_url });
//     } catch (error) {
//         console.error("Error uploading file:", error);
//         res.status(500).json({ message: "Error uploading file" });
//     }
// });

// module.exports = router;

const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { protect, admin } = require("../middleware/authMiddleware"); // Import auth middleware

require("dotenv").config();

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup using memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
    try {
        // Extract public_id from URL
        // Example URL: https://res.cloudinary.com/your-cloud/image/upload/v1234567890/folder/filename.jpg
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
            // Get everything after version number, remove file extension
            const pathParts = parts.slice(uploadIndex + 2);
            const publicId = pathParts.join('/').replace(/\.[^/.]+$/, "");
            return publicId;
        }
        return null;
    } catch (error) {
        console.error('Error extracting public_id:', error);
        return null;
    }
};

// Upload image route
router.post("/", protect, admin, upload.single("image"), async(req, res) => {
    try {
        if(!req.file){
            return res.status(400).json({ message: "no file Uploaded" });
        }

        // function to handle the stream upload to cloudinary
        const streamUpload = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "products", // Optional: organize images in folders
                        resource_type: "image"
                    },
                    (error, result) => {
                        if(result){
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );

                // Use streamifier to convert file buffer to a stream
                streamifier.createReadStream(fileBuffer).pipe(stream);
            });
        };

        // Call the stream Upload function
        const result = await streamUpload(req.file.buffer);
        console.log("File uploaded successfully:", result.public_id);

        // Respond with the uploaded image URL and public_id
        res.json({ 
            imageUrl: result.secure_url,
            publicId: result.public_id
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ message: "Error uploading file" });
    }
});

// Delete image route
router.delete("/:publicId", protect, admin, async(req, res) => {
    try {
        const { publicId } = req.params;
        
        if (!publicId) {
            return res.status(400).json({ message: "Public ID is required" });
        }

        // Decode the public_id (in case it's URL encoded)
        const decodedPublicId = decodeURIComponent(publicId);
        
        console.log("Attempting to delete image with public_id:", decodedPublicId);

        // Delete image from Cloudinary
        const result = await cloudinary.uploader.destroy(decodedPublicId);
        
        console.log("Cloudinary delete result:", result);

        if (result.result === 'ok') {
            res.json({ message: "Image deleted successfully" });
        } else if (result.result === 'not found') {
            res.status(404).json({ message: "Image not found" });
        } else {
            res.status(400).json({ message: "Failed to delete image" });
        }
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ message: "Error deleting file" });
    }
});

// Alternative delete route that accepts image URL in request body
router.post("/delete", protect, admin, async(req, res) => {
    try {
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ message: "Image URL is required" });
        }

        // Extract public_id from URL
        const publicId = getPublicIdFromUrl(imageUrl);
        
        if (!publicId) {
            return res.status(400).json({ message: "Could not extract public_id from URL" });
        }

        console.log("Attempting to delete image with public_id:", publicId);

        // Delete image from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        
        console.log("Cloudinary delete result:", result);

        if (result.result === 'ok') {
            res.json({ message: "Image deleted successfully" });
        } else if (result.result === 'not found') {
            res.status(404).json({ message: "Image not found" });
        } else {
            res.status(400).json({ message: "Failed to delete image" });
        }
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ message: "Error deleting file" });
    }
});

module.exports = router;