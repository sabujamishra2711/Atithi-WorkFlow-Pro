/**
 * Frontend implementation example for generating payslips using html2pdf.js
 * This shows how html2pdf.js could be used directly in the browser for payslip generation
 */

// Import html2pdf.js
import html2pdf from 'html2pdf.js';

/**
 * Generate payslip PDF using html2pdf.js directly in the browser
 * @param {Object} payslipData - The payslip data
 * @param {string} elementId - The ID of the HTML element to convert to PDF
 */
export async function generatePayslipHtml2Pdf(payslipData, elementId) {
  try {
    // Get the element to convert to PDF
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    // Configure html2pdf options
    const options = {
      margin: [0.5, 0.3, 0.5, 0.3], // top, right, bottom, left in inches
      filename: `payslip_${payslipData.empId}_${payslipData.month}_${payslipData.year}.pdf`,
      image: {
        type: 'jpeg',
        quality: 1.0
      },
      html2canvas: {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY, // Fix for scrolling issues
        imageTimeout: 15000 // Add timeout for image loading
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy']
      }
    };

    // Generate and save the PDF
    await html2pdf().set(options).from(element).save();

    console.log('Payslip PDF generated successfully');
    return { success: true, message: 'Payslip PDF generated successfully' };
  } catch (error) {
    console.error('Error generating payslip PDF:', error);
    return { success: false, error: error.message };
  }
}