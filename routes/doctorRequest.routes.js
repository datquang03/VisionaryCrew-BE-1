// routes/doctorRequestRoutes.js
import express from 'express';
import { protectRouter } from '../middlewares/auth.js';
import { acceptRequest, getRequests, rejectRequest, sendRequest } from '../controllers/doctorRequest.controllers.js';

const router = express.Router();


// Gửi yêu cầu liên hệ
router.post('/send',protectRouter , sendRequest);

// Lấy danh sách yêu cầu (chỉ cho bác sĩ)
router.get('/',protectRouter , getRequests);

// Accept yêu cầu
router.put('/accept/:requestId',protectRouter , acceptRequest);

// Reject yêu cầu
router.put('/reject/:requestId',protectRouter ,rejectRequest);

// Lấy danh sách yêu cầu cho người dùng
router.get('/user', protectRouter, getRequests);

export default router;