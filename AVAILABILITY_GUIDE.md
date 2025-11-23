# Availability Statistics - User Guide

## 📊 How to View Saved Availability Statistics

### Quick Access via Statistics Dropdown

Click on the **Statistics** dropdown in the navigation bar to access:

1. **Performance Statistics** - Upload performance data
2. **Availability Statistics** - Upload availability data
3. **Project Details** - View performance by project
4. **Portfolio Details** - View performance by portfolio
5. **Availability Projects** - View availability by project ⭐
6. **Availability Portfolios** - View availability by portfolio ⭐

---

## 🎯 Viewing Availability Data

### Method 1: View by Project (Individual Project Analysis)

**Path:** Statistics → Availability Projects

**URL:** `/project-availability`

**What you'll see:**
- Select a specific project from the dropdown
- Filter by year
- Overall availability statistics (average, total data points, latest quarter)
- Interactive availability trend chart
- Quarterly breakdown cards with monthly details
- All values displayed as percentages (e.g., 95.5%, 98.2%)

**Steps:**
1. Click **Statistics** in the navigation
2. Select **Availability Projects** from the dropdown
3. Choose a project from the project selector
4. (Optional) Filter by specific year
5. View charts, quarterly averages, and monthly breakdowns

---

### Method 2: View by Portfolio (Aggregated Portfolio View)

**Path:** Statistics → Availability Portfolios

**URL:** `/availability-dashboard`

**What you'll see:**
- Portfolio tabs (one for each portfolio)
- Aggregated availability metrics across all projects in the portfolio
- Breakdown by year and quarter
- Monthly averages within each quarter
- Data point counts
- All values as percentages

**Steps:**
1. Click **Statistics** in the navigation
2. Select **Availability Portfolios** from the dropdown
3. Click on different portfolio tabs to view each portfolio
4. Review quarterly and monthly breakdowns

---

## 💾 How to Upload and Save Availability Data

### Step-by-Step Guide

**1. Navigate to Upload Page**
- Click **Statistics** → **Availability Statistics**
- Or go to `/availability-statistics`

**2. Upload Files**
- Drag and drop JSON/CSV files
- Or click "Choose Files" to browse
- Expected format: `[{"title": "ProjectName - Month Year:", "value": 95.5}]`
- Values should be percentages (e.g., 95.5 for 95.5%)

**3. Process Files**
- Files are processed and data is parsed
- Project tabs appear showing organized data
- Data grouped by project, year, quarter, and month

**4. Save to Database** ⭐
- Scroll down to see the **green "Save to Database" button**
- Click the button
- Select which projects to save (or select all)
- Click "Save Selected"
- Data is now saved and can be viewed!

---

## 📈 Data Format

### JSON Format
```json
[
  {"title": "Project Alpha - January 2024:", "value": 95.5},
  {"title": "Project Alpha - February 2024:", "value": 96.2},
  {"title": "Project Beta - January 2024:", "value": 98.1}
]
```

### CSV Format
```csv
title,value
"Project Alpha - January 2024:",95.5
"Project Alpha - February 2024:",96.2
"Project Beta - January 2024:",98.1
```

### Title Format
- Format: `ProjectName - MonthName Year:`
- Examples:
  - "Web Portal - January 2024:"
  - "Mobile App - March 2024:"
  - "API Service - December 2023:"

---

## 🔍 Understanding the Data

### Quarterly Breakdown
- **Q1:** January, February, March
- **Q2:** April, May, June
- **Q3:** July, August, September
- **Q4:** October, November, December

### Metrics Displayed
- **Overall Average:** Average availability across all periods
- **Total Data Points:** Number of monthly data points recorded
- **Latest Quarter Average:** Average for the most recent quarter
- **Quarterly Averages:** Average availability for each quarter
- **Monthly Values:** Individual availability percentages for each month

---

## 🎨 Visual Features

### Color Coding
- **Green gradient:** Availability statistics (to differentiate from Performance)
- **Purple gradient:** Performance statistics
- **Cards:** Quarterly breakdowns
- **Charts:** Interactive line charts showing trends

### Interactive Elements
- **Hover effects:** On cards and navigation items
- **Dropdown menus:** Statistics organized in dropdown
- **Tabs:** Switch between portfolios
- **Filters:** Year-based filtering
- **Charts:** Hover to see exact values

---

## ⚠️ Troubleshooting

### "No Availability Data Available"
- Upload data first via **Statistics** → **Availability Statistics**
- Make sure to click the **Save to Database** button after upload
- Verify projects exist in the system

### Can't Find Save Button
- After uploading files, scroll down below the project tabs
- Look for the large green "Save to Database" button
- If not visible, try refreshing the page and uploading again

### Data Not Showing
- Verify data was saved (check for success message)
- Refresh the page
- Make sure the correct project/portfolio is selected
- Check if year filter is limiting results

---

## 🚀 Quick Tips

1. **Upload regularly:** Keep your availability data up to date
2. **Use consistent naming:** Ensure project names match exactly
3. **Check formatting:** Verify JSON/CSV format before upload
4. **Review before saving:** Check the preview tabs before saving to database
5. **Use filters:** Year filters help focus on specific time periods
6. **Compare quarters:** Use quarterly breakdowns to identify trends
7. **Check portfolios:** Portfolio view shows aggregated insights

---

## 📞 Support

For issues or questions:
- Check that all projects are properly configured
- Verify data format matches expected structure
- Ensure values are in percentage format (0-100)
- Contact system administrator for database issues
