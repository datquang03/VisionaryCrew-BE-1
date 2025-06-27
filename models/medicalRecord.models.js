import mongoose from "mongoose";

   const medicalRecordSchema = new mongoose.Schema(
     {
       patientInfo: {
         fullName: { type: String, required: true },
         gender: { type: String, enum: ["Nam", "Nữ"], required: true },
         dob: { type: Date, required: true },
         age: { type: Number, required: true },
         job: { type: String, required: true },
         address: { type: String, required: true },
         idNumber: { type: String, required: true, index: true }, // Changed to String
         phone: { type: String, required: true },
       },
       familyInfo: {
         memberName: { type: String, required: true },
         memberPhone: { type: String, required: true }, // Changed to String
       },
       sickness: {
         reason: { type: String, required: true },
         mainDiagnosis: { type: String, required: true },
       },
       treatment: {
         doctorInCharge: { type: String, required: true },
         treatmentDetails: { type: String },
         outcome: {
           type: String,
           enum: ["Lý do vào viện", "Đã điều trị", "Tóm tắt quá trình điều trị"],
           required: true,
         },
         notes: { type: String },
       },
       createdBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
       },
       updatedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
       },
     },
     {
       timestamps: true,
     }
   );

   export default mongoose.model("MedicalRecord", medicalRecordSchema);