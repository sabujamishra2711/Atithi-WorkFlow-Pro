fetch('http://127.0.0.1:8000/api/v1/hr/payroll/fast?month=2026-01')
  .then(r => r.json())
  .then(d => {
    console.log('Sample employees - earned, phAmount, presentDays:');
    d.records?.slice(0, 5).forEach(e => {
      console.log(`${e.empId}: earned=${e.earned}, phAmount=${e.phAmount}, phPaid=${e.phPaid}, presentDays=${e.presentDays}, absentDays=${e.absentDays}`);
    });
  });
