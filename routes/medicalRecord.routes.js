import express from 'express';
import {
  createMedicalRecord,
  getAllMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
    getMedicalRecordsByPatientId,
    getMedicalRecordsForDoctor
} from '../controllers/medicalRecord.controllers.js';
import { admin, doctor, protectRouter } from '../middlewares/auth.js';

const router = express.Router();
router.post('/', protectRouter, createMedicalRecord);
router.get('/patient/:id', protectRouter, getMedicalRecordsByPatientId); 
router.get('/:id', protectRouter, getMedicalRecordById);                
router.put('/:id', protectRouter, updateMedicalRecord);
router.delete('/:id', protectRouter, deleteMedicalRecord);
router.get('/doctor/:id', protectRouter,doctor, getMedicalRecordsForDoctor);
router.get('/', protectRouter, admin, getAllMedicalRecords);


export default router;