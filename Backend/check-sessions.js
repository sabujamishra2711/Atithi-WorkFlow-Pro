import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://mscoders:mscoders24@cluster0.j8lne.mongodb.net/atithillp';

async function checkSessions() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        // Get the AttendanceSession model dynamically
        const attendanceSessionCollection = mongoose.connection.collection('attendanceSessions');

        // Find sessions for November 2025
        const sessions = await attendanceSessionCollection.find({
            inTime: {
                $gte: new Date('2025-11-01'),
                $lte: new Date('2025-11-30')
            }
        }).limit(10).toArray();

        console.log(`Found ${sessions.length} sessions for November 2025:`);

        sessions.forEach((session, index) => {
            console.log(`\n--- Session ${index + 1} ---`);
            console.log(`Employee ID: ${session.employeeId}`);
            console.log(`In Time: ${session.inTime}`);
            console.log(`Out Time: ${session.outTime}`);
            console.log(`Punch Status: ${session.punchStatus}`);

            // Calculate work hours if both in and out times are available
            if (session.inTime && session.outTime) {
                const workHours = (new Date(session.outTime) - new Date(session.inTime)) / (1000 * 60 * 60);
                console.log(`Work Hours: ${workHours.toFixed(2)}`);
            }
        });

        // Check if any sessions have work hours > 9 (would generate OT for fullMonth employees)
        const sessionsWithPotentialOT = sessions.filter(session => {
            if (session.inTime && session.outTime) {
                const workHours = (new Date(session.outTime) - new Date(session.inTime)) / (1000 * 60 * 60);
                return workHours > 9; // Standard work hours
            }
            return false;
        });

        console.log(`\nSessions with potential OT (work hours > 9): ${sessionsWithPotentialOT.length}/${sessions.length}`);

        // Also check for any sessions with work hours > 9 regardless of date
        const allSessionsWithPotentialOT = await attendanceSessionCollection.find({}).limit(100).toArray();

        const allFilteredSessions = allSessionsWithPotentialOT.filter(session => {
            if (session.inTime && session.outTime) {
                const workHours = (new Date(session.outTime) - new Date(session.inTime)) / (1000 * 60 * 60);
                return workHours > 9; // Standard work hours
            }
            return false;
        });

        console.log(`\nFound ${allFilteredSessions.length} sessions with potential OT (any date, limit 100):`);

        allFilteredSessions.slice(0, 5).forEach((session, index) => {
            console.log(`\n--- OT Session ${index + 1} ---`);
            console.log(`Employee ID: ${session.employeeId}`);
            console.log(`In Time: ${session.inTime}`);
            console.log(`Out Time: ${session.outTime}`);
            console.log(`Punch Status: ${session.punchStatus}`);

            if (session.inTime && session.outTime) {
                const workHours = (new Date(session.outTime) - new Date(session.inTime)) / (1000 * 60 * 60);
                console.log(`Work Hours: ${workHours.toFixed(2)}`);
            }
        });

    } catch (error) {
        console.error('Error checking sessions:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the check
checkSessions();