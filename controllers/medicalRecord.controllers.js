import medicalRecord from "../models/medicalRecord.models.js";
import asyncHandler from "express-async-handler";
import DoctorRequest from "../models/doctorRequest.model.js";
import User from "../models/user.models.js";

// Create a new medical record
const createMedicalRecord = asyncHandler(async (req, res) => {
  try {
    const { patientInfo, familyInfo, sickness, treatment } = req.body;

    if (!patientInfo || !familyInfo || !sickness || !treatment) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ các trường bắt buộc" });
    }

    const record = await medicalRecord.create({
      patientInfo,
      familyInfo,
      sickness,
      treatment,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Hồ sơ y tế đã tạo thành công",
      record,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get all medical records
const getAllMedicalRecords = asyncHandler(async (req, res) => {
  try {
    const count = await medicalRecord.countDocuments();
    const records = await medicalRecord
      .find({})
      .populate("createdBy updatedBy", "username phone")
      .sort({ createdAt: -1 });

    if (!records || records.length === 0) {
      return res.status(404).json({ message: "Không có hồ sơ y tế nào" });
    }

    return res.status(200).json({ message: `Có ${count} hồ sơ y tế`, records });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get a medical record by id
const getMedicalRecordById = asyncHandler(async (req, res) => {
  try {
    const record = await medicalRecord
      .findById(req.params.id)
      .populate("createdBy updatedBy", "username phone");

    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ" });
    }

    return res.status(200).json(record);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get all medical records by patient id
const getMedicalRecordsByPatientId = asyncHandler(async (req, res) => {
  try {
    const tokenUserId = req.user._id.toString();
    const requestedUserId = req.params.id;

    if (tokenUserId !== requestedUserId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xem hồ sơ của người khác" });
    }

    const count = await medicalRecord.countDocuments({
      createdBy: requestedUserId,
    });

    const records = await medicalRecord
      .find({ createdBy: requestedUserId })
      .populate("createdBy updatedBy", "username phone")
      .sort({ createdAt: -1 });

    if (!records || records.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy hồ sơ do bạn tạo" });
    }

    return res
      .status(200)
      .json({ message: `Có ${count} hồ sơ y tế do bạn tạo`, records });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get all medical records for doctor
const getMedicalRecordsForDoctor = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== "doctor") {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền truy cập với vai trò này" });
    }

    const doctorId = req.user._id.toString();
    const count = await medicalRecord.countDocuments({
      $or: [{ createdBy: doctorId }, { updatedBy: doctorId }],
    });

    const records = await medicalRecord
      .find({ $or: [{ createdBy: doctorId }, { updatedBy: doctorId }] })
      .populate("createdBy updatedBy", "username phone")
      .sort({ createdAt: -1 });

    if (!records || records.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy hồ sơ y tế liên quan đến bạn" });
    }

    return res.status(200).json({
      message: `Có ${count} hồ sơ y tế liên quan đến bạn`,
      records,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Update a medical record by id
const updateMedicalRecord = asyncHandler(async (req, res) => {
  try {
    const { patientInfo, familyInfo, sickness, treatment } = req.body;

    const record = await medicalRecord
      .findByIdAndUpdate(
        req.params.id,
        {
          patientInfo,
          familyInfo,
          sickness,
          treatment,
          updatedBy: req.user._id,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      )
      .populate("createdBy updatedBy", "username phone");

    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ để cập nhật" });
    }

    return res.status(200).json({
      message: "Hồ sơ y tế đã được cập nhật",
      record,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Delete a medical record by id
const deleteMedicalRecord = asyncHandler(async (req, res) => {
  try {
    const record = await medicalRecord.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ để xóa" });
    }

    return res.status(200).json({ message: "Hồ sơ đã được xóa" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export {
  createMedicalRecord,
  getAllMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  getMedicalRecordsByPatientId,
  getMedicalRecordsForDoctor,
  deleteMedicalRecord,
};
