import fs from 'fs';
import path from 'path';
import pdf from 'html-pdf';
import { fileURLToPath } from 'url';

const { readFile } = fs.promises;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fill the HTML template with data using simple string replacement.
 * @param {string} template - HTML template string
 * @param {object} data - Data object with keys matching template placeholders
 * @returns {string} - HTML with data filled in
 */
/**
 * Robust fillTemplate:
 * - Replaces only primitive placeholders in a safe way
 * - Handles `salaryRows` (array) specially (your template uses {{#salaryRows}} ... {{/salaryRows}})
 * - Avoids trying to convert circular objects to string (safe fallback)
 */
function fillTemplate(template, data) {
  let html = template;

  console.log('=== FILL TEMPLATE DEBUG ===');
  // Log top-level primitive keys and indicators for non-primitives
  const keys = Object.keys(data || {});
  console.log('Template variables to replace:', keys.map(k => {
    const v = data[k];
    if (v === null || v === undefined) return `${k}:<empty>`;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return `${k}:${String(v)}`.slice(0, 120);
    if (Array.isArray(v)) return `${k}:<array length=${v.length}>`;
    if (typeof v === 'object') return `${k}:<object>`;
    return `${k}:<${typeof v}>`;
  }));

  // Handle salaryRows first (special Mustache-like block)
  if (Array.isArray(data.salaryRows)) {
    let rowsHtml = '';
    data.salaryRows.forEach(row => {
      // Build a row using the same columns you expect
      // Be sure to safely coerce values to strings
      const safe = (val) => {
        try {
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
          if (Array.isArray(val)) return val.join(', ');
          // For objects, try JSON.stringify but guard against circular
          try { return JSON.stringify(val); } catch { return ''; }
        } catch { return ''; }
      };

      rowsHtml += `<tr>
        <td>${safe(row.earningFixed)}</td>
        <td>${safe(row.earningEarned)}</td>
        <td>${safe(row.otEarned)}</td>
        <td>${safe(row.phEarned)}</td>
        <td>${safe(row.adjustments)}</td>
        <td>${safe(row.earningTotal)}</td>
        <td>${safe(row.deductionName)}</td>
        <td>${safe(row.deductionAmount)}</td>
      </tr>\n`;
    });

    // Replace the whole block between {{#salaryRows}} and {{/salaryRows}}
    html = html.replace(/{{#salaryRows}}[\s\S]*?{{\/salaryRows}}/, rowsHtml);
  }

  // Now replace primitive placeholders only (skip arrays/objects)
  for (const key of keys) {
    if (key === 'salaryRows') continue; // already handled

    const value = data[key];
    // Only replace for primitive values
    if (value === null || value === undefined) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), '');
      continue;
    }

    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      // Use a safe string coercion
      const safe = String(value);
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), safe);
      console.log(`Replacing {{${key}}} => ${safe.length > 120 ? safe.slice(0, 120) + '...' : safe}`);
    } else {
      // Non-primitive: skip replacing (developers can add handlers if needed)
      console.log(`Skipping non-primitive key for replacement: ${key} (type=${t})`);
    }
  }

  console.log('=== END FILL TEMPLATE DEBUG ===');
  return html;
}

/**
 * Helper function to convert number to words (Indian numbering system with paise)
 */
function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  if (isNaN(num)) return '';

  const isNegative = num < 0;
  num = Math.abs(Number(num));

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  function convertToWords(n) {
    if (n === 0) return '';
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const remainder = n % 1000;
    let result = '';
    if (crore > 0) {
      result += convertLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      result += convertLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      result += convertLessThanThousand(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
      result += convertLessThanThousand(remainder);
    }
    return result.trim();
  }

  // Convert to string with 2 decimal places
  const numStr = Number(num).toFixed(2);
  const [rupees, paise] = numStr.split('.');

  let result = '';

  // Handle rupees
  if (parseInt(rupees) > 0) {
    result += convertToWords(parseInt(rupees)) + ' Rupees';
  }

  // Handle paise
  if (paise && parseInt(paise) > 0) {
    const paiseWords = convertToWords(parseInt(paise));
    if (result) {
      result += ' and ' + paiseWords + ' Paise';
    } else {
      result += paiseWords + ' Paise';
    }
  }

  result += ' Only';

  if (isNegative) {
    result = 'Minus ' + result;
  }

  return result;
}

/**
 * Read an image file and convert to base64 data URI.
 * Returns empty string on failure.
 */
async function imageFileToDataUri(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn('Logo file not found at path:', filePath);
      return '';
    }

    const buffer = await readFile(filePath);
    // try detect mime from extension
    const ext = path.extname(filePath).toLowerCase();
    let mime = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.svg') mime = 'image/svg+xml';
    else if (ext === '.gif') mime = 'image/gif';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('Could not read image to convert to data URI:', filePath, err.message);
    return '';
  }
}

/**
 * generatePayslipPdf using html-pdf
 * - data: object that will be used to fill template (expects placeholders in template)
 * - outputPdfPath: destination path for PDF file
 */
async function generatePayslipPdf(data, outputPdfPath) {
  try {
    console.log('Starting PDF generation for:', data.empId, 'at', outputPdfPath);

    const templatePath = path.join(__dirname, 'payslipTemplate.html');
    console.log('Template path:', templatePath);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    let template = fs.readFileSync(templatePath, 'utf8');
    console.log('Template loaded, length:', template.length);

    // If logoPath is not set, try multiple possible paths
    if (!data.logoPath) {
      // Log current working directory and __dirname for debugging
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);

      const possibleLogoPaths = [
        path.join(process.cwd(), 'public', 'frontend', 'atithi-logo.png'),
        path.join(process.cwd(), '..', 'frontend', 'public', 'atithi-logo.png'),
        path.join(__dirname, '..', '..', '..', '..', 'frontend', 'public', 'atithi-logo.png'),
        path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'atithi-logo.png'),
        path.join(__dirname, 'atithi-logo.png')
      ];

      let logoPath = null;
      for (const possiblePath of possibleLogoPaths) {
        console.log('Checking logo path:', possiblePath);
        console.log('File exists:', fs.existsSync(possiblePath));
        if (fs.existsSync(possiblePath)) {
          logoPath = possiblePath;
          console.log('Logo found at:', logoPath);
          break;
        }
      }
      data.logoPath = logoPath || '';
      console.log('Logo path resolved to:', data.logoPath);
    } else {
      console.log('Using provided logoPath:', data.logoPath);
    }

    // Convert logo file to data URI if present, else empty string.
    let logoDataUri = '';
    if (data.logoPath && fs.existsSync(data.logoPath)) {
      logoDataUri = await imageFileToDataUri(data.logoPath);
    }
    // Attach the data uri to data so template can use it (e.g., <img src="{{logoDataUri}}">)
    data.logoDataUri = logoDataUri;

    // Example fillTemplate implementation:
    // If you already have a function `fillTemplate(template, data)`, you can keep it.
    // Here's a simple placeholder replacer for {{key}} style placeholders:
    function fillTemplateSimple(tpl, ctx) {
      return tpl.replace(/\{\{(\w+)\}\}/g, (match, p1) => {
        if (ctx[p1] === undefined || ctx[p1] === null) return '';
        return String(ctx[p1]);
      });
    }

    // Use your real fillTemplate if available, otherwise fallback to simple replacer
    // Add netPayableWords to data if not already present
    if (data.netPayable && !data.netPayableWords) {
      data.netPayableWords = numberToWords(Math.floor(data.netPayable));
    }

    const html = (typeof fillTemplate === 'function') ? fillTemplate(template, data) : fillTemplateSimple(template, data);
    console.log('Template filled successfully, html length:', html.length);

    // html-pdf options — tune as needed
    const options = {
      format: 'A4',           // 'A4', 'Letter', etc.
      orientation: 'portrait',
      border: '10mm',        // margins
      // base: 'file://' + __dirname + '/', // if your template uses relative file paths
      // quality or phantom-specific options could be added here
      timeout: 30000 // Increase timeout to 30 seconds
    };

    // promisify pdf.create(...).toFile
    const toFile = (htmlContent, outPath, opts) =>
      new Promise((resolve, reject) => {
        pdf.create(htmlContent, opts).toFile(outPath, (err, res) => {
          if (err) return reject(err);
          resolve(res); // res.filename contains filename
        });
      });

    // Ensure output directory exists
    const outDir = path.dirname(outputPdfPath);
    fs.mkdirSync(outDir, { recursive: true });

    console.log('Creating PDF...');
    const result = await toFile(html, outputPdfPath, options);
    console.log('PDF generated:', result.filename);

    return result.filename;
  } catch (err) {
    console.error('PDF generation error:', err);
    console.error('PDF generation error stack:', err.stack);
    throw new Error(`Failed to generate PDF: ${err.message}`);
  }
}

export { imageFileToDataUri, numberToWords };
export default generatePayslipPdf;