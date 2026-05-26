import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://mscoders:mscoders24@cluster0.j8lne.mongodb.net/atithillp';

async function checkSnapshots() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        // Get the PayrollSnapshot model dynamically
        const payrollSnapshotCollection = mongoose.connection.collection('payrollSnapshots');

        // Find snapshots for December 2025
        const snapshots = await payrollSnapshotCollection.find({
            month: 12,
            year: 2025
        }).limit(5).toArray();

        console.log(`Found ${snapshots.length} snapshots for December 2025:`);

        snapshots.forEach((snapshot, index) => {
            console.log(`\n--- Snapshot ${index + 1} ---`);
            console.log(`Employee ID: ${snapshot.employee}`);
            console.log(`Month: ${snapshot.month}`);
            console.log(`Year: ${snapshot.year}`);

            if (snapshot.salarySnapshot) {
                console.log(`OT Hours: ${snapshot.salarySnapshot.otHours}`);
                console.log(`OT Salary: ${snapshot.salarySnapshot.otSalary}`);
                console.log(`PH Paid: ${snapshot.salarySnapshot.phPaid}`);
                console.log(`PH Amount: ${snapshot.salarySnapshot.phAmount}`);
            }
        });

        // Check if any snapshots have OT values
        const snapshotsWithOT = snapshots.filter(snapshot =>
            snapshot.salarySnapshot &&
            (snapshot.salarySnapshot.otHours > 0 || snapshot.salarySnapshot.otSalary > 0)
        );

        console.log(`\nSnapshots with OT values: ${snapshotsWithOT.length}/${snapshots.length}`);

        // Also check for any snapshots with OT values regardless of month/year
        const allSnapshotsWithOT = await payrollSnapshotCollection.find({
            'salarySnapshot.otHours': { $gt: 0 }
        }).limit(5).toArray();

        console.log(`\nFound ${allSnapshotsWithOT.length} snapshots with OT hours > 0 (any month/year):`);

        allSnapshotsWithOT.forEach((snapshot, index) => {
            console.log(`\n--- OT Snapshot ${index + 1} ---`);
            console.log(`Employee ID: ${snapshot.employee}`);
            console.log(`Month: ${snapshot.month}`);
            console.log(`Year: ${snapshot.year}`);
            console.log(`OT Hours: ${snapshot.salarySnapshot.otHours}`);
            console.log(`OT Salary: ${snapshot.salarySnapshot.otSalary}`);
        });

    } catch (error) {
        console.error('Error checking snapshots:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the check
checkSnapshots();