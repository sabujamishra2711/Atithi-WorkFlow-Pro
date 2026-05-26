import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { PaidHoliday } from '../models/paidHoliday.model.js';


const MONGO_URI = 'mongodb+srv://mscoders:mscoders24@cluster0.j8lne.mongodb.net/atithillp';
const CURRENT_YEAR = new Date().getFullYear();
const PH_DAY = 15; // Paid Holiday on 15th of each month

function getAllDatesInMonth(year, month) {
  const dates = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    dates.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Fetch all employees (excluding admins)
  const employees = await User.find({ role: { $ne: 'ADMIN' }, status: 'Active' });
  console.log(`Found ${employees.length} employees.`);

  // 2. Add PHs for each month
  for (let month = 0; month < 12; month++) {
    const phDate = new Date(CURRENT_YEAR, month, PH_DAY);
    const phName = `Monthly PH - ${phDate.toLocaleString('default', { month: 'long' })}`;
    try {
      await PaidHoliday.updateOne(
        { date: phDate, year: CURRENT_YEAR },
        { $setOnInsert: { date: phDate, name: phName, year: CURRENT_YEAR } },
        { upsert: true }
      );
      console.log(`PH set for ${phDate.toDateString()}`);
    } catch (err) {
      console.error(`Error adding PH for ${phDate.toDateString()}:`, err.message);
    }
  }

  // 3. Get all PH dates for the year
  const phs = await PaidHoliday.find({ year: CURRENT_YEAR });
  const phDates = phs.map(ph => ph.date.toDateString());

  // 4. Add punch records for each employee for each working day (Mon-Sat, not PH)
  for (const emp of employees) {
    for (let month = 0; month < 12; month++) {
      const dates = getAllDatesInMonth(CURRENT_YEAR, month);
      for (const date of dates) {
        const day = date.getDay();
        if (day === 0) continue; // Skip Sundays
        if (phDates.includes(date.toDateString())) continue; // Skip PHs
        // Check for existing punches to avoid duplicates
        const existing = await Punch.findOne({ employeeId: emp.empId, timestamp: { $gte: new Date(date.setHours(0,0,0,0)), $lte: new Date(date.setHours(23,59,59,999)) } });
        if (existing) continue;
        // Add IN punch at 9:00 AM
        await Punch.create({
          employeeId: emp.empId,
          punchType: 'IN',
          timestamp: new Date(date.setHours(9, 0, 0, 0)),
          enteredBy: 'HR',
        });
        // Add OUT punch at 6:00 PM
        await Punch.create({
          employeeId: emp.empId,
          punchType: 'OUT',
          timestamp: new Date(date.setHours(18, 0, 0, 0)),
          enteredBy: 'HR',
        });
        console.log(`Punches added for ${emp.empId} on ${date.toDateString()}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Bulk PH and punch data population complete.');
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
}); 