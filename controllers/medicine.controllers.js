// controllers/medicineController.js
import Medicine from "../models/medicine.models.js";

// Create a new medicine
export const createMedicine = async (req, res) => {
  try {
    const {
      name,
      description,
      dosage,
      sideEffects,
      manufacturer,
      price,
      image,
    } = req.body;
    const existingMedicine = await Medicine.findOne({ name });
    if (existingMedicine) {
      return res.status(400).json({ message: "Thuốc này đã tồn tại." });
    }
    // Validate required fields
    if (!name || !dosage || !price || !image) {
      return res
        .status(400)
        .json({ message: "Tên, liều lượng, giá và hình ảnh là bắt buộc." });
    }

    const newMedicine = new Medicine({
      name,
      description,
      dosage,
      sideEffects,
      manufacturer,
      price,
      image,
    });

    const savedMedicine = await newMedicine.save();
    res
      .status(201)
      .json({
        message: "Thuốc đã được tạo thành công.",
        medicine: savedMedicine,
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all medicines
export const getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ createdAt: -1 });
    if (!medicines.length) {
      return res.status(404).json({ message: "Không có thuốc nào." });
    }
    res.status(200).json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get suggested medicines based on chatgpt

// Get medicine by ID
export const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({ message: "Thuốc không tồn tại." });
    }
    res.status(200).json(medicine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update medicine by ID
export const updateMedicine = async (req, res) => {     
  try {
    const { id } = req.params;
    const {
      name,
      description,
      dosage,
      sideEffects,
      manufacturer,
      price,
      image,
    } = req.body;
    const existingMedicine = await Medicine.findOne({ name });
    if (existingMedicine) {
      return res.status(400).json({ message: "Thuốc này đã tồn tại." });
    }

    const updatedMedicine = await Medicine.findByIdAndUpdate(
      id,
      { name, description, dosage, sideEffects, manufacturer, price, image },
      { new: true, runValidators: true }
    );

    if (!updatedMedicine) {
      return res.status(404).json({ message: "Thuốc không tồn tại." });
    }

    res
      .status(200)
      .json({ message: "Thuốc đã được cập nhật.", medicine: updatedMedicine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete medicine by ID
export const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMedicine = await Medicine.findByIdAndDelete(id);

    if (!deletedMedicine) {
      return res.status(404).json({ message: "Thuốc không tồn tại." });
    }

    res.status(200).json({ message: "Thuốc đã được xóa thành công." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
