import Visitor from '../models/visitor.model.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { ApiResponse } from '../utils/ApiResponse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Add a visitor record
export const addVisitor = async (req, res) => {
  try {
    const { name, phone, purpose, timeIn, timeOut, company, hostName, photo, visitDate } = req.body;
    
    // Use provided visitDate or current date
    const date = visitDate ? new Date(visitDate) : new Date();
    
    // Find next available code for today
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const count = await Visitor.countDocuments({ 
      date: { 
        $gte: today, 
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
      } 
    });
    
    if (count >= 50) {
      return res.status(400).json(new ApiResponse(400, null, 'Maximum 50 visitors per day limit reached'));
    }
    
    const code = 'VISIT' + String(count + 1).padStart(3, '0');
    
    const visitorData = {
      date,
      code,
      name,
      phone: phone || '',
      purpose: purpose || '',
      timeIn: timeIn || new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      timeOut: timeOut || '',
      createdBy: req.user ? req.user._id : undefined,
      // Handle both file upload and base64 photo data
      photo: req.file ? `/public/temp/${req.file.filename}` : (photo || ''),
    };

    // Add optional fields if provided
    if (company) visitorData.company = company;
    if (hostName) visitorData.hostName = hostName;
    
    const visitor = await Visitor.create(visitorData);
    
    return res.status(201).json(
      new ApiResponse(201, visitor, 'Visitor record saved successfully')
    );
  } catch (err) {
    console.error('Error saving visitor:', err);
    return res.status(400).json(new ApiResponse(400, null, err.message || 'Failed to save visitor record'));
  }
};

// List today's visitors
export const listVisitors = async (req, res) => {
  try {
    let { date } = req.query;
    let filter = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    } else {
      // Default: today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.date = { $gte: today };
    }
    const visitors = await Visitor.find(filter);
    // Use ApiResponse wrapper for consistency
    return res.status(200).json(
      new ApiResponse(200, visitors, "Visitors fetched successfully")
    );
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, null, err.message));
  }
};

// Delete a visitor record
export const deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json(new ApiResponse(404, null, 'Visitor record not found'));
    }
    
    await Visitor.findByIdAndDelete(id);
    
    return res.status(200).json(
      new ApiResponse(200, null, `Visitor record for ${visitor.name} (${visitor.code}) deleted successfully`)
    );
  } catch (err) {
    console.error('Error deleting visitor:', err);
    return res.status(500).json(new ApiResponse(500, null, err.message || 'Failed to delete visitor record'));
  }
};