# Ticket Resolution Analyzer

A web-based tool to analyze ticket resolution times from Excel files.

## Features

- Upload Excel files with ticket data
- Automatically analyzes all sheets (months) in the workbook
- **Quarterly Summary**: Automatically groups months into quarters (Q1-Q4) and displays aggregated statistics
- Calculates tickets resolved in 2 or less days
- Shows percentage success rate for each quarter and month
- Displays overall summary statistics
- Beautiful, responsive UI with visual progress bars and gradient cards

## How to Use

1. **Open the Application**
   - Simply double-click on `ticket-analyzer.html` to open it in your web browser
   - Or right-click and select "Open with" your preferred browser

2. **Upload Your Excel File**
   - Click on the "Choose Excel File" button
   - Select your Excel file (.xlsx or .xls format)

3. **View Results**
   - The application will automatically process all sheets in your workbook
   - **Overall Summary**: Total statistics across all months
   - **Quarterly Summary**: Aggregated data for each quarter (Q1, Q2, Q3, Q4)
     - Automatically detects which quarter each month belongs to
     - Shows combined statistics for all months in that quarter
     - Lists the months included in each quarter
   - **Monthly Breakdown**: Individual cards for each sheet/month
   - Each card displays:
     - Total number of tickets
     - Number of tickets resolved in ≤2 days
     - Success rate percentage
     - Visual progress bar

## Excel File Requirements

Your Excel file should contain the following columns:
- **Ticket created - Date**: The date when the ticket was created (Required)
- **Ticket solved - Date**: The date when the ticket was solved (Required)
- **Tickets**: Ticket identifier or count (Optional)

### Note
- Column names are case-insensitive
- The application can work with partial matches (e.g., "ticket created" will match)
- Each sheet in the Excel file will be treated as a separate month/period

## Calculation Method

The application calculates the time difference between "Ticket created - Date" and "Ticket solved - Date".

A ticket is considered "resolved in 2 or less days" if the time difference is ≤ 48 hours (2 days).

**Formula:**
- # of total tickets = Count of all rows with valid created and solved dates
- # of tickets closed in 2 days = Count of tickets where (Solved Date - Created Date) ≤ 2 days
- Percentage = (# tickets closed in 2 days / # total tickets) × 100

## Quarter Detection

The application automatically detects which quarter each sheet belongs to based on the sheet name:

- **Q1 (January - March)**: Sheet names containing "January", "Jan", "February", "Feb", "March", "Mar", or "Q1"
- **Q2 (April - June)**: Sheet names containing "April", "Apr", "May", "June", "Jun", or "Q2"
- **Q3 (July - September)**: Sheet names containing "July", "Jul", "August", "Aug", "September", "Sep", or "Q3"
- **Q4 (October - December)**: Sheet names containing "October", "Oct", "November", "Nov", "December", "Dec", or "Q4"

The quarter cards will only appear if at least one month from that quarter is detected in your Excel file.

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
