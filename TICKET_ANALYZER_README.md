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

Your Excel file should contain one of the following column formats:

**Format 1 (Tickets):**
- **Ticket created - Date**: The date when the ticket was created (Required)
- **Ticket solved - Date**: The date when the ticket was solved (Required)

**Format 2 (Issues):**
- **Issue created date**: The date when the issue was created (Required)
- **Issue resolution date**: The date when the issue was resolved (Required)

### Note
- Column names are case-insensitive
- The application can work with partial matches (e.g., "ticket created" will match)
- Each sheet in the Excel file will be treated as a separate month/period
- Works with single-sheet or multi-sheet Excel files
- **Smart Month Detection**: If your sheet name is generic (like "sheet1"), the app will automatically extract the month name from your filename
  - Example: File `Ticket Resolution - SLA -Aug- Quality KPIs 2.xlsx` with sheet "sheet1" → Will display as "August"

## Supported Date Formats

The application automatically detects and parses multiple date formats:
- **ISO Date**: `2025-09-26`
- **DateTime**: `2025-08-12 13:46:04`
- **Text Format**: `Aug 03 2025`, `August 03 2025`
- **Slash Format**: `08/12/2025`, `12/08/2025`
- **Dash Format**: `12-08-2025`

The parser is flexible and will automatically detect which format your dates are in.

## Calculation Method

The application calculates the time difference between created date and resolved/solved date.

A ticket/issue is considered "resolved in 2 or less days" if the time difference is ≤ 48 hours (2 days).

**Formula:**
- # of total tickets = Count of all rows with valid created and solved dates
- # of tickets closed in 2 days = Count of tickets where (Solved Date - Created Date) ≤ 2 days
- Percentage = (# tickets closed in 2 days / # total tickets) × 100

## Quarter Detection

The application automatically detects which quarter each sheet belongs to based on:
1. **Sheet name** (e.g., "January 2025", "Feb", "Q2 Report")
2. **File name** (e.g., "Q2_2025.xlsx", "April_tickets.xlsx") - used when sheet name doesn't contain month info

**Quarter Mapping:**
- **Q1 (January - March)**: "January", "Jan", "February", "Feb", "March", "Mar", or "Q1"
- **Q2 (April - June)**: "April", "Apr", "May", "June", "Jun", or "Q2"
- **Q3 (July - September)**: "July", "Jul", "August", "Aug", "September", "Sep", or "Q3"
- **Q4 (October - December)**: "October", "Oct", "November", "Nov", "December", "Dec", or "Q4"

The quarter cards will only appear if at least one month from that quarter is detected. This is especially useful for single-sheet Excel files where the month is in the filename.

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
