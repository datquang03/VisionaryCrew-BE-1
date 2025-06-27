import DoctorRequest from "../models/doctorRequest.model.js";
import User from "../models/user.models.js";

// Gửi request liên hệ với bác sĩ
export const sendRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); 
    if (!user || user.role !== "doctor") {
      return res.status(403).json({ message: "Người dùng không phải là bác sĩ." });
    }

    const { doctorId, message } = req.body;
    if (!doctorId || !message) {
      return res.status(400).json({ message: "doctorId và message là bắt buộc." });
    }

    const newRequest = new DoctorRequest({
      senderId: req.user.id,
      doctorId,
      message,
    });

    const savedRequest = await newRequest.save();
    res.status(201).json({
      message: "Yêu cầu đã được gửi thành công.",
      request: savedRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách yêu cầu cho bác sĩ
export const getRequests = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const requests = await DoctorRequest.find({ doctorId })
      .populate("senderId", "username email avatar role")
      .sort({ createdAt: -1 });
    if (!requests.length) {
      return res.status(404).json({ message: "Không có yêu cầu nào." });
    }
    res.status(200).json(requests);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Lỗi khi lấy danh sách yêu cầu.",
        error: error.message,
      });
  }
};

// Accept yêu cầu
export const acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const doctorId = req.user._id;

    const request = await DoctorRequest.findOne({ _id: requestId, doctorId });
    if (!request) {
      return res
        .status(404)
        .json({ message: "Yêu cầu không tồn tại hoặc không thuộc về bạn." });
    }

    request.status = "accepted";
    await request.save();

    res.status(200).json({ message: "Yêu cầu đã được chấp nhận.", request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject yêu cầu
export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const doctorId = req.user._id;
    const { rejectionMessage } = req.body; 

    // Kiểm tra lý do từ chối
    if(!rejectionMessage)
        return res.status(400).json({ message: "Lý do từ chối là bắt buộc." });

    const request = await DoctorRequest.findOne({ _id: requestId, doctorId });
    if (!request) {
      return res
        .status(404)
        .json({ message: "Yêu cầu không tồn tại hoặc không thuộc về bạn." });
    }

    request.status = "rejected";
    request.rejectionMessage = rejectionMessage; // Lưu lý do từ chối
    await request.save();

    res.status(200).json({
      message: "Yêu cầu đã bị từ chối.",
      request,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message:  error.message });
  }
};

// Lấy danh sách yêu cầu của người dùng

export const getUserRequests = async (req, res) => {
  try {
    const senderId = req.user._id; // Giả sử từ middleware auth

    const requests = await DoctorRequest.find({ senderId })
      .populate("doctorId", "username email role") // Lấy thông tin bác sĩ
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian mới nhất

    if (!requests.length) {
      return res.status(404).json({ message: "Bạn chưa gửi yêu cầu nào." });
    }

    res.status(200).json(requests);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy danh sách yêu cầu của bạn.", error: error.message });
  }
};