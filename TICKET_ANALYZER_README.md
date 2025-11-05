# Ticket Resolution Analyzer

A web-based tool to analyze ticket resolution times from Excel files.

## Features

- Upload Excel files with ticket data
- Automatically analyzes all sheets (months) in the workbook
- Calculates tickets resolved in 2 or less days
- Shows percentage success rate for each month
- Displays overall summary statistics
- Beautiful, responsive UI with visual progress bars

## How to Use

1. **Open the Application**
   - Simply double-click on `ticket-analyzer.html` to open it in your web browser
   - Or right-click and select "Open with" your preferred browser

2. **Upload Your Excel File**
   - Click on the "Choose Excel File" button
   - Select your Excel file (.xlsx or .xls format)

3. **View Results**
   - The application will automatically process all sheets in your workbook
   - Each sheet (representing a month) will be displayed as a card
   - You'll see:
     - Total number of tickets
     - Number of tickets resolved in ≤2 days
     - Success rate percentage
     - Visual progress bar

## Excel File Requirements

Your Excel file should contain the following columns:
- **Ticket created - Date**: The date when the ticket was created
- **Ticket solved - Date**: The date when the ticket was solved
- **Full resolution time (mins)**: The resolution time in minutes (optional)
- **Tickets**: Ticket identifier or count

### Note
- Column names are case-insensitive
- The application can work with partial matches (e.g., "ticket created" will match)
- Each sheet in the Excel file will be treated as a separate month/period

## Calculation Method

The application uses two methods to calculate resolution time:

1. **Primary Method**: If "Full resolution time (mins)" is available, it converts minutes to days and checks if ≤ 2 days
2. **Fallback Method**: If resolution time is not available, it calculates the difference between "Ticket created - Date" and "Ticket solved - Date"

A ticket is considered "resolved in 2 or less days" if the resolution time is ≤ 48 hours.

## Browser Compatibility

Works on all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## No Installation Required

This is a standalone HTML file that works entirely in your browser. No server or installation needed!

## Privacy

All processing is done locally in your browser. Your Excel file is never uploaded to any server.
