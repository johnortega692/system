// Entry point to load the form
function doGet() {
  return HtmlService.createTemplateFromFile("MaterialOrderForm")
    .evaluate()
    .setTitle("Material Order Form")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Utility to include other HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Spreadsheet access
function getMaterialOrderingSpreadsheet() {
  return SpreadsheetApp.openById("1O_PDJL5AVMlf922tkBVeDKwJXu7_-zI74D5W8-GbvVI");
}

function getJobsWithContacts() {
  const sheet = SpreadsheetApp.openById("1O_PDJL5AVMlf922tkBVeDKwJXu7_-zI74D5W8-GbvVI").getSheetByName("Jobs");
  const jobs = sheet.getDataRange().getValues();
  return jobs.slice(1).map(row => ({
    id: row[0],
    jobName: row[1],
    pm: { name: row[2] },  // assuming Project Manager info is in column 2
    super: { name: row[3] } // assuming Supervisor info is in column 3
  }));
}



function getSundriesPackages() {
  const sheet = getMaterialOrderingSpreadsheet().getSheetByName("Sundries Packages");
  const data = sheet ? sheet.getDataRange().getValues() : [];
  
  const packages = {};

  // Loop through the data to organize items by package
  data.slice(1).forEach(row => {
    const packageName = row[0];
    const itemName = row[1];
    const qty = row[2];
    
    if (!packages[packageName]) {
      packages[packageName] = [];
    }
    
    packages[packageName].push({
      name: itemName,
      qty: qty
    });
  });

  return packages;
}


function getVendors() {
  const sheet = getMaterialOrderingSpreadsheet().getSheetByName("Vendors");
  const data = sheet ? sheet.getDataRange().getValues() : [];
return data.slice(1).map(r => ({
  id: r[0],       // ← Column A = Name
  name: r[0],     // use name as display
  contactEmail: r[2] || '',
  phone: r[3] || ''
}));

}

function getProductCategories() {
  const sheet = getMaterialOrderingSpreadsheet().getSheetByName("Products");
  const data = sheet ? sheet.getDataRange().getValues() : [];
  const categories = new Set();
  data.slice(1).forEach(r => r[3] && categories.add(r[3]));
  return [...categories].sort();
}

function getProducts() {
  const sheet = getMaterialOrderingSpreadsheet().getSheetByName("Products");
  const data = sheet ? sheet.getDataRange().getValues() : [];

  return data.slice(1).map((row, i) => ({
    id: row[0],                // Column A - Name (used as ID)
    name: row[0],              // Column A - Name
    vendorId: row[1]?.trim(),  // Column B - Vendor (dropdown values like “PPG Paints”)
    category: "",              // You don’t have a category column yet
    unitPrice: 0,              // Optional — fill this if/when you add price
    sheen: ""                  // Optional — same for sheen
  })).filter(p => p.name);
}


function getSundries() {
  const sheet = getMaterialOrderingSpreadsheet().getSheetByName("Sundries");
  const data = sheet ? sheet.getDataRange().getValues() : [];
  return data.slice(1).map((r, i) => ({
    id: "SUN" + i,
    name: r[0],
    category: r[1] || "Sundries"
  })).filter(s => s.name);
}
