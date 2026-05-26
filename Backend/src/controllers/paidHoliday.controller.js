import { PaidHoliday } from '../models/paidHoliday.model.js';
import { User } from '../models/user.model.js';

// Create a new Paid Holiday
export const createPH = async (req, res) => {
  try {
    const { date, name, year } = req.body;
    if (!date || !name || !year) {
      return res.status(400).json({ message: 'Date, name, and year are required.' });
    }
    const exists = await PaidHoliday.findOne({ date: new Date(date), year });
    if (exists) {
      return res.status(409).json({ message: 'Paid Holiday already exists for this date.' });
    }
    const ph = await PaidHoliday.create({
      date: new Date(date),
      name,
      year,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });
    res.status(201).json(ph);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all Paid Holidays for a year
export const getPHs = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = year ? { year: Number(year) } : {};
    const phs = await PaidHoliday.find(filter).sort({ date: 1 });
    res.json(phs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a Paid Holiday
export const updatePH = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name } = req.body;
    const ph = await PaidHoliday.findById(id);
    if (!ph) return res.status(404).json({ message: 'Paid Holiday not found.' });
    if (date) ph.date = new Date(date);
    if (name) ph.name = name;
    ph.updatedBy = req.user?._id;
    await ph.save();
    res.json(ph);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a Paid Holiday
export const deletePH = async (req, res) => {
  try {
    const { id } = req.params;
    const ph = await PaidHoliday.findByIdAndDelete(id);
    if (!ph) return res.status(404).json({ message: 'Paid Holiday not found.' });
    res.json({ message: 'Paid Holiday deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 