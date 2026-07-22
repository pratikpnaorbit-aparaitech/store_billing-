const getCloudinary = require("../config/cloudinary");

exports.uploadProductImage = async (req, res) => {
  try {
    const cloudinary = getCloudinary();
    if (!cloudinary) return res.status(503).json({ success: false, message: "Image storage is not configured" });
    const image = String(req.body.image || "");
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
      return res.status(400).json({ success: false, message: "A JPEG, PNG or WebP image is required" });
    }
    if (Buffer.byteLength(image, "utf8") > 7 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Image must be smaller than 5 MB" });
    }
    const result = await cloudinary.uploader.upload(image, {
      folder: `smart-billing/${req.userId}/products`,
      resource_type: "image",
      transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }],
    });
    res.status(201).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Image upload failed" });
  }
};
