/**
 * Media Upload API
 * 
 * Handles video + audio file uploads for interview answers
 * - Accepts multipart/form-data
 * - Stores files with metadata
 * - Returns mediaId for reference
 * - Production-ready with validation
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import Media from '../models/Media.js';

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const sessionId = req.body.sessionId || 'unknown';
    const uploadDir = path.join('uploads', 'interviews', sessionId);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const questionId = req.body.questionId || 'question';
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname) || '.webm';
    
    const filename = `${questionId}-${timestamp}-${hash}${ext}`;
    cb(null, filename);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Accept video files only
  const allowedMimes = [
    'video/webm',
    'video/mp4',
    'video/ogg',
    'video/x-matroska'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
    files: 1
  }
});

/**
 * @route   POST /api/media/upload
 * @desc    Upload interview video answer
 * @access  Private
 */
router.post('/upload', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }
    
    const {
      sessionId,
      questionId,
      duration,
      size,
      mimeType,
      timestamp
    } = req.body;
    
    // Validate required fields
    if (!sessionId || !questionId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: 'sessionId and questionId are required'
      });
    }
    
    // Get file stats
    const fileStats = fs.statSync(req.file.path);
    
    // Verify file was actually saved
    if (fileStats.size === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        success: false,
        error: 'File upload failed - zero bytes received'
      });
    }
    
    // Create media record
    const mediaRecord = new Media({
      userId: req.userId || req.user?.id,
      sessionId,
      questionId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filepath: req.file.path,
      mimeType: req.file.mimetype,
      size: fileStats.size,
      duration: parseInt(duration) || 0,
      codec: extractCodec(req.file.mimetype),
      uploadedAt: timestamp ? new Date(timestamp) : new Date(),
      metadata: {
        fieldname: req.file.fieldname,
        encoding: req.file.encoding,
        destination: req.file.destination
      }
    });
    
    await mediaRecord.save();
    
    console.log(`✅ Video uploaded: ${req.file.filename} (${formatFileSize(fileStats.size)})`);
    
    res.status(200).json({
      success: true,
      mediaId: mediaRecord._id,
      filename: mediaRecord.filename,
      size: mediaRecord.size,
      duration: mediaRecord.duration,
      message: 'Video uploaded successfully'
    });
    
  } catch (error) {
    console.error('Media upload error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload video: ' + error.message
    });
  }
});

/**
 * @route   GET /api/media/:id
 * @desc    Get media file metadata
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    // Verify user owns this media
    if (media.userId.toString() !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: media._id,
        sessionId: media.sessionId,
        questionId: media.questionId,
        filename: media.filename,
        size: media.size,
        duration: media.duration,
        mimeType: media.mimeType,
        uploadedAt: media.uploadedAt
      }
    });
    
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve media'
    });
  }
});

/**
 * @route   GET /api/media/:id/stream
 * @desc    Stream video file
 * @access  Private
 */
router.get('/:id/stream', authMiddleware, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    // Verify user owns this media
    if (media.userId.toString() !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(media.filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Media file not found on disk'
      });
    }
    
    const stat = fs.statSync(media.filepath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(media.filepath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': media.mimeType,
      };
      
      res.writeHead(206, head);
      file.pipe(res);
      
    } else {
      // Full file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': media.mimeType,
      };
      
      res.writeHead(200, head);
      fs.createReadStream(media.filepath).pipe(res);
    }
    
  } catch (error) {
    console.error('Stream media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream media'
    });
  }
});

/**
 * @route   DELETE /api/media/:id
 * @desc    Delete media file
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    // Verify user owns this media
    if (media.userId.toString() !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Delete file from disk
    if (fs.existsSync(media.filepath)) {
      fs.unlinkSync(media.filepath);
    }
    
    // Delete database record
    await Media.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete media'
    });
  }
});

/**
 * Helper: Extract codec from mime type
 */
function extractCodec(mimeType) {
  const match = mimeType.match(/codecs=([^;]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Helper: Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default router;
