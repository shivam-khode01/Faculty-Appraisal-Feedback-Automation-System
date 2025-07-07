// googleSheet.js

const { google } = require('googleapis');
const credentials = require('./google-credentials.json');

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SHEET_ID = '1xakNMtl7q31cDznvyn4vEElCSZNX9ZTpiPaqHMhpSMs'; // Your actual sheet ID

// ✅ Rename function to match export
async function appendToSheet(values) {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1', // Adjust range as needed
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values],
    },
  });
  console.log('Row added:', response.status);
}

// ✅ Correctly exported now
module.exports = { appendToSheet };





