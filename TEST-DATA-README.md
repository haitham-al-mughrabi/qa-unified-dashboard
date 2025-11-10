# Test Data Generator

This script generates random test data for the QA Analytics Dashboard to help with testing and development.

## What It Does

The `generate-test-data.js` script creates:

- **5 Projects**:
  - Customer Support
  - Technical Support
  - Sales Team
  - Product Bugs
  - Feature Requests

- **Random Analysis Records** spanning years 2019-2030 with:
  - Randomly selected years for each project
  - Randomly selected quarters within each year
  - 1-3 months per quarter (some months intentionally skipped)
  - Random ticket counts (100-1000 per month)
  - Random success rates (biased towards 60-95%)

## How to Use

### Generate Test Data

```bash
node generate-test-data.js
```

This will:
1. Clear all existing projects and analysis records
2. Create 5 new projects
3. Generate 60-100+ random analysis records across different years and quarters
4. Display a summary of what was created

### Expected Output

```
Starting test data generation...

Connected to database
Cleared existing data
Created 5 projects

Generating analysis records...
  - Created 13 records for Customer Support
  - Created 17 records for Technical Support
  - Created 22 records for Sales Team
  - Created 11 records for Product Bugs
  - Created 15 records for Feature Requests

✓ Test data generation completed successfully!

Summary:
  - Projects: 5
  - Year range: 2019-2030
  - Random quarters and months generated per project

You can now view the dashboard at http://localhost:3000/dashboard
```

## Data Characteristics

### Random Elements

- **Years**: Each project randomly gets 50% of years between 2019-2030
- **Quarters**: Each year has ~75% chance to include each quarter
- **Months**: Each quarter randomly includes 1-3 months (intentionally skipping some)
- **Tickets**: Random count between 100-1000 per month
- **Success Rate**:
  - 60% chance: High (80-95%)
  - 30% chance: Medium (60-79%)
  - 10% chance: Low (40-59%)

### Example Data Structure

Each record contains:
```javascript
{
  "displayName": "January 2024",
  "month": "January",
  "totalTickets": 456,
  "resolvedIn2Days": 389,
  "resolvedAfter2Days": 67,
  "successRate": "85.31"
}
```

## Testing Scenarios

The generated data allows you to test:

- ✓ Projects with varying amounts of data
- ✓ Year navigation across wide range (2019-2030)
- ✓ Quarter navigation with automatic year transitions
- ✓ Monthly breakdown with missing months
- ✓ Different success rate color coding
- ✓ Empty states for quarters without data
- ✓ Project tabs with multiple projects

## Warning

**This script will DELETE all existing data!**

Make sure to backup any important data before running the script.

## Customization

You can modify these variables in the script:

```javascript
// Number and names of projects
const projects = [
    { name: 'Customer Support', description: '...' },
    // Add or remove projects here
];

// Year range
await generateRecordsForProject(projectIds[i], projects[i].name, 2019, 2030);
//                                                              ^^^^  ^^^^
//                                                            start   end

// Probability settings
if (Math.random() < 0.5)   // 50% chance to include year
if (Math.random() < 0.75)  // 75% chance to include quarter
const numMonths = getRandomInt(1, 3);  // 1-3 months per quarter
```
