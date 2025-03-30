// REPLACE ALL getActiveSpreadsheet() with openById
const MAIN_SPREADSHEET_ID = "1O_PDJL5AVMlf922tkBVeDKwJXu7_-zI74D5W8-GbvVI";

// Get data for populating dropdowns
function getVendors() {
  try {
    const sheet = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID).getSheetByName("Vendors");
    const data = sheet.getDataRange().getValues();
    const vendors = [];

    for (let i = 1; i < data.length; i++) {
      const name = data[i][0]; // Column A
      if (name) vendors.push([name]); // Return only the name
    }

    return vendors;
  } catch (e) {
    Logger.log("Error in getVendors(): " + e.toString());
    return [];
  }
}


function getMaterialList() {
  const sheet = SpreadsheetApp.openById("1O_PDJL5AVMlf922tkBVeDKwJXu7_-zI74D5W8-GbvVI").getSheetByName("Products");
  return sheet.getDataRange().getValues().slice(1); // Skip header
}


function getProjects() {
  const sheet = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID).getSheetByName("Projects");
  const data = sheet.getDataRange().getValues();
  return data.slice(1);
}

// Handle form submission
function submitMaterialOrder(data) {
  const sheet = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID).getSheetByName("Material Orders");
  sheet.appendRow([
    new Date(),
    data.project,
    data.vendor,
    data.material,
    data.quantity,
    data.unit,
    data.neededBy,
    data.requestedBy,
    data.notes
  ]);
  return true;
}

// Fetch existing orders (if needed)
function getMaterialOrders() {
  const sheet = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID).getSheetByName("Material Orders");
  const data = sheet.getDataRange().getValues();
  return data.slice(1); // Skip header
}

function getMaterialOrderFormHtml() {
  try {
    var template = HtmlService.createTemplateFromFile('MaterialOrderForm');
    
    // Inject your dynamic dropdown data here
    template.vendors = getVendors();
    template.products = getProducts();
    template.jobs = getJobsWithContacts();
    template.sundries = getSundries();
    template.categories = getProductCategories();
    template.sheenTypes = getSheenTypes();
    
    return template.evaluate()
      .setTitle("Material Order Form")
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    Logger.log("Error in getMaterialOrderFormHtml: " + e);
    return HtmlService.createHtmlOutput("<p>Error loading form: " + e.toString() + "</p>");
  }
}

// Get jobs with PM and Super information
function getJobsWithContacts() {
  try {
    var ss = getMaterialOrderingSpreadsheet();
    var jobsSheet = ss.getSheetByName('Jobs');
    
    if (!jobsSheet) {
      Logger.log("Jobs sheet not found");
      return []; // Return empty array instead of processing further
    }
    
    var jobsData = jobsSheet.getDataRange().getValues();
    
    // Check if we have any data
    if (!jobsData || jobsData.length <= 1) {
      Logger.log("No job data found");
      return [];
    }
    
    // Get PMs data if available
    var pmsData = [];
    var pmsSheet = ss.getSheetByName('PMs');
    if (pmsSheet) {
      pmsData = pmsSheet.getDataRange().getValues();
    }
    
    // Get Supers data if available
    var supersData = [];
    var supersSheet = ss.getSheetByName('Supers');
    if (supersSheet) {
      supersData = supersSheet.getDataRange().getValues();
    }
    
    // Create PM lookup
    var pmLookup = {};
    for (var i = 1; i < pmsData.length; i++) {
      if (pmsData[i][0]) {
        pmLookup[pmsData[i][0]] = {
          name: pmsData[i][0],
          email: pmsData[i][1] || ""
        };
      }
    }
    
    // Create Super lookup
    var superLookup = {};
    for (var i = 1; i < supersData.length; i++) {
      if (supersData[i][0]) {
        superLookup[supersData[i][0]] = {
          name: supersData[i][0],
          email: supersData[i][1] || ""
        };
      }
    }
    
    var jobs = [];
    
    // Skip header row
    for (var i = 1; i < jobsData.length; i++) {
      if (jobsData[i][0]) {
        var pmName = jobsData[i][1] || "";
        var superName = jobsData[i][2] || "";
        
        var jobPM = pmLookup[pmName] || { name: pmName, email: "" };
        var jobSuper = superLookup[superName] || { name: superName, email: "" };
        
        jobs.push({
          id: jobsData[i][0],
          name: jobsData[i][0], // This can be modified if you have a separate name column
          pm: jobPM,
          super: jobSuper
        });
      }
    }
    
    return jobs;
  } catch (e) {
    Logger.log("Error in getJobsWithContacts: " + e);
    return [];
  }
}

// Get product categories
function getProductCategories() {
  try {
    var ss = getMaterialOrderingSpreadsheet();
    var sheet = ss.getSheetByName('Products');
    
    if (!sheet) {
      Logger.log("Products sheet not found");
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (!data || data.length <= 1) {
      Logger.log("No product data found");
      return [];
    }
    
    var categoryMap = {};
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][3]) { // Assuming category is in column D (index 3)
        categoryMap[data[i][3]] = true;
      }
    }
    
    return Object.keys(categoryMap).sort();
  } catch (e) {
    Logger.log("Error in getProductCategories: " + e);
    return [];
  }
}

// Get sundries/masking products
function getSundries() {
  try {
    var ss = getMaterialOrderingSpreadsheet();
    var sheet = ss.getSheetByName('Sundries');
    
    if (!sheet) {
      Logger.log("Sundries sheet not found");
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (!data || data.length <= 1) {
      Logger.log("No sundries data found");
      return [];
    }
    
    var sundries = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        sundries.push({
          id: "SUN" + i, // Generate a unique ID
          name: data[i][0],
          category: data[i][1] || "Sundries"
        });
      }
    }
    
    return sundries;
  } catch (e) {
    Logger.log("Error in getSundries: " + e);
    return [];
  }
}

// Get vendors
function getVendors() {
  try {
    var ss = getMaterialOrderingSpreadsheet();
    var sheet = ss.getSheetByName('Vendors');
    
    if (!sheet) {
      Logger.log("Vendors sheet not found");
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (!data || data.length <= 1) {
      Logger.log("No vendor data found");
      return [];
    }
    
    var vendors = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        vendors.push({
          id: data[i][0],
          name: data[i][1] || data[i][0],
          contactEmail: data[i][2] || "",
          phone: data[i][3] || ""
        });
      }
    }
    
    return vendors;
  } catch (e) {
    Logger.log("Error in getVendors: " + e);
    return [];
  }
}

// Get products
// Get products with sheen information
function getProducts() {
  try {
    var ss = getMaterialOrderingSpreadsheet();
    var sheet = ss.getSheetByName('Products');
    
    if (!sheet) {
      Logger.log("Products sheet not found");
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    var products = [];
    
    // Determine the column indices based on header row
    var headers = data[0];
    var productIdIndex = headers.indexOf("ProductID");
    var nameIndex = headers.indexOf("Name");
    var vendorIndex = headers.indexOf("Vendor");
    var categoryIndex = headers.indexOf("Category");
    var unitPriceIndex = headers.indexOf("UnitPrice");
    var sheenIndex = headers.indexOf("Sheen"); // Add this if you have a Sheen column
    
    // If essential columns aren't found, use default indices
    if (productIdIndex === -1) productIdIndex = 0;
    if (nameIndex === -1) nameIndex = 1;
    if (vendorIndex === -1) vendorIndex = 2;
    if (categoryIndex === -1) categoryIndex = 3;
    if (unitPriceIndex === -1) unitPriceIndex = 4;
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][productIdIndex]) {
        var product = {
          id: data[i][productIdIndex],
          name: data[i][nameIndex],
          vendorId: data[i][vendorIndex],
          category: data[i][categoryIndex],
          unitPrice: data[i][unitPriceIndex] || 0
        };
        
        // Add sheen if the column exists
        if (sheenIndex !== -1) {
          product.sheen = data[i][sheenIndex] || "";
        }
        
        // Extract sheen from product name if not explicitly specified
        if (!product.sheen) {
          var sheenTypes = ["Flat", "Eggshell", "Satin", "Semi-Gloss", "Gloss", "Matte", "Low Sheen", "High Gloss"];
          for (var j = 0; j < sheenTypes.length; j++) {
            if (product.name.includes(sheenTypes[j])) {
              product.sheen = sheenTypes[j];
              break;
            }
          }
        }
        
        products.push(product);
      }
    }
    
    return products;
  } catch (e) {
    Logger.log("Error getting products: " + e.toString());
    return [];
  }
}

// Get unique sheen types from products
function getSheenTypes() {
  try {
    var products = getProducts();
    var sheenMap = {};
    
    products.forEach(function(product) {
      if (product.sheen) {
        sheenMap[product.sheen] = true;
      }
    });
    
    return Object.keys(sheenMap).sort();
  } catch (e) {
    Logger.log("Error getting sheen types: " + e.toString());
    return [];
  }
}

// Enhanced Material Order Form submission handling
function submitMaterialOrder(orderData) {
  try {
    // Rest of your code...
    
    // Save order to sheet
    var orderId = saveOrderToSheet(orderData);
    
    // Rest of your code...
  } catch (e) {
    Logger.log("Error submitting material order: " + e.toString());
    return {
      success: false,
      message: "Error submitting order: " + e.toString()
    };
  }
}

// Save order to the Material Orders sheet
function saveOrderToSheet(orderData) {
  var ss = getMaterialOrderingSpreadsheet(); // Use material ordering spreadsheet instead of main spreadsheet
  var sheet = ss.getSheetByName('Material Orders');
  
  if (!sheet) {
    sheet = ss.insertSheet('Material Orders');
    sheet.appendRow([
      'OrderID', 
      'Date', 
      'JobID', 
      'CreatedBy', 
      'PM',
      'PM Email',
      'Super',
      'Super Email',
      'DeliveryType', 
      'DeliveryAddress', 
      'RequestedDate', 
      'Items', 
      'Notes', 
      'Status'
    ]);
  }
  
  // Get username from session
  var userProps = PropertiesService.getUserProperties();
  var username = userProps.getProperty('username') || "Unknown";
  
  // Generate order ID
  var orderId = "MO-" + new Date().getTime();
  
  // Convert items array to string
  var itemsJson = JSON.stringify(orderData.items);
  
  // Add order to sheet
  sheet.appendRow([
    orderId,
    new Date(),
    orderData.jobId,
    username,
    orderData.pmName || '',
    orderData.pmEmail || '',
    orderData.superName || '',
    orderData.superEmail || '',
    orderData.deliveryType,
    orderData.deliveryAddress || "Will Call",
    orderData.requestedDate,
    itemsJson,
    orderData.notes || "",
    "Pending" // Status
  ]);
  
  return orderId;
}
// Validate order data
function validateOrderData(orderData) {
  // Check required fields
  if (!orderData.jobId || !orderData.items || orderData.items.length === 0) {
    return false;
  }
  
  // Validate delivery type
  if (orderData.deliveryType === "Delivery" && !orderData.deliveryAddress) {
    return false;
  }
  
  return true;
}

// Save order to the Material Orders sheet
function saveOrderToSheet(orderData) {
  var ss = getMainSpreadsheet();
  var sheet = ss.getSheetByName('Material Orders');
  
  if (!sheet) {
    sheet = ss.insertSheet('Material Orders');
    sheet.appendRow([
      'OrderID', 
      'Date', 
      'JobID', 
      'CreatedBy', 
      'PM',
      'PM Email',
      'Super',
      'Super Email',
      'DeliveryType', 
      'DeliveryAddress', 
      'RequestedDate', 
      'Items', 
      'Notes', 
      'Status'
    ]);
  }
  
  // Get username from session
  var userProps = PropertiesService.getUserProperties();
  var username = userProps.getProperty('username') || "Unknown";
  
  // Generate order ID
  var orderId = "MO-" + new Date().getTime();
  
  // Convert items array to string
  var itemsJson = JSON.stringify(orderData.items);
  
  // Add order to sheet
  sheet.appendRow([
    orderId,
    new Date(),
    orderData.jobId,
    username,
    orderData.pmName || '',
    orderData.pmEmail || '',
    orderData.superName || '',
    orderData.superEmail || '',
    orderData.deliveryType,
    orderData.deliveryAddress || "Will Call",
    orderData.requestedDate,
    itemsJson,
    orderData.notes || "",
    "Pending" // Status
  ]);
  
  return orderId;
}

// Generate PDF from Google Doc template
function generateOrderPdf(orderData, orderId) {
  // Check if template exists or create it
  var templateId = getOrderTemplateId();
  var docTemplate = DocumentApp.openById(templateId);
  
  // Create a copy of the template
  var docName = "Material Order - " + orderData.jobId + " - " + new Date().toISOString().split('T')[0];
  var docCopy = DriveApp.getFileById(templateId).makeCopy(docName);
  var doc = DocumentApp.openById(docCopy.getId());
  var body = doc.getBody();
  
  // Replace placeholders in template
  body.replaceText("{{ORDER_ID}}", orderId);
  body.replaceText("{{ORDER_DATE}}", new Date().toLocaleDateString());
  body.replaceText("{{JOB_ID}}", orderData.jobId);
  body.replaceText("{{PM_NAME}}", orderData.pmName || '');
  body.replaceText("{{SUPER_NAME}}", orderData.superName || '');
  body.replaceText("{{DELIVERY_TYPE}}", orderData.deliveryType);
  body.replaceText("{{DELIVERY_ADDRESS}}", orderData.deliveryAddress || "Will Call");
  body.replaceText("{{REQUESTED_DATE}}", orderData.requestedDate);
  body.replaceText("{{NOTES}}", orderData.notes || "");
  
  // Build items table
  var table = body.findText("{{ITEMS_TABLE}}").getElement().getParent().getParent();
  
  for (var i = 0; i < orderData.items.length; i++) {
    var item = orderData.items[i];
    
    // Add row to table
    var row = table.appendTableRow();
    row.appendTableCell(item.productName);
    row.appendTableCell(item.quantity.toString());
    row.appendTableCell(item.productCategory || "");
    row.appendTableCell(item.notes || "");
  }
  
  // Remove placeholder row
  table.removeRow(1);
  
  // Save and close the document
  doc.saveAndClose();
  
  // Convert to PDF
  var pdfBlob = docCopy.getAs(MimeType.PDF);
  var pdf = DriveApp.createFile(pdfBlob).setName(docName + ".pdf");
  
  // Delete the temporary Doc
  docCopy.setTrashed(true);
  
  return pdf.getUrl();
}

// Send email notification with PDF
function sendOrderEmail(orderData, orderId, pdfUrl) {
  try {
    // Get recipients
    var userProps = PropertiesService.getUserProperties();
    var username = userProps.getProperty('username');
    var userData = getUserData(username);
    
    var recipients = [];
    
    // Add user who created the order
    if (userData && userData.email) {
      recipients.push(userData.email);
    }
    
    // Add PM and Super emails
    if (orderData.pmEmail) {
      recipients.push(orderData.pmEmail);
    }
    
    if (orderData.superEmail) {
      recipients.push(orderData.superEmail);
    }
    
    // Deduplicate recipients
    recipients = [...new Set(recipients)];
    
    // Build email body
    var subject = "Material Order - " + orderData.jobId + " - " + new Date().toLocaleDateString();
    
    var body = "<html><body>";
    body += "<h2>Material Order - " + orderId + "</h2>";
    body += "<p><strong>Order Date:</strong> " + new Date().toLocaleDateString() + "</p>";
    body += "<p><strong>Job:</strong> " + orderData.jobId + "</p>";
    body += "<p><strong>PM:</strong> " + (orderData.pmName || '') + "</p>";
    body += "<p><strong>Super:</strong> " + (orderData.superName || '') + "</p>";
    body += "<p><strong>Delivery Type:</strong> " + orderData.deliveryType + "</p>";
    
    if (orderData.deliveryType === "Delivery") {
      body += "<p><strong>Delivery Address:</strong> " + orderData.deliveryAddress + "</p>";
    }
    
    body += "<p><strong>Requested Date:</strong> " + orderData.requestedDate + "</p>";
    
    body += "<h3>Ordered Items:</h3>";
    body += "<table border='1' cellpadding='5' style='border-collapse:collapse;'>";
    body += "<tr><th>Item</th><th>Quantity</th><th>Category</th><th>Notes</th></tr>";
    
    for (var i = 0; i < orderData.items.length; i++) {
      var item = orderData.items[i];
      
      body += "<tr>";
      body += "<td>" + item.productName + "</td>";
      body += "<td>" + item.quantity + "</td>";
      body += "<td>" + (item.productCategory || "") + "</td>";
      body += "<td>" + (item.notes || "") + "</td>";
      body += "</tr>";
    }
    
    body += "</table>";
    
    if (orderData.notes) {
      body += "<h3>Additional Notes:</h3>";
      body += "<p>" + orderData.notes + "</p>";
    }
    
    body += "<p>Please see the attached PDF for full details.</p>";
    body += "<p>Click <a href='" + pdfUrl + "'>here</a> to view the PDF.</p>";
    body += "</body></html>";
    
    // Send email with PDF attachment
    var pdf = DriveApp.getFileById(pdfUrl.split("id=")[1]);
    
    if (recipients.length > 0) {
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: subject,
        htmlBody: body,
        attachments: [pdf.getAs(MimeType.PDF)]
      });
    }
    
    return true;
  } catch (e) {
    Logger.log("Error sending email: " + e.toString());
    return false;
  }
}

// Get or create order template
function getOrderTemplateId() {
  var scriptProps = PropertiesService.getScriptProperties();
  var templateId = scriptProps.getProperty('ORDER_TEMPLATE_ID');
  
  if (templateId) {
    try {
      DocumentApp.openById(templateId);
      return templateId;
    } catch (e) {
      // Template not found, continue to create new one
      Logger.log("Template not found: " + e.toString());
    }
  }
  
  // Create new template
  var doc = DocumentApp.create("Material Order Template");
  var body = doc.getBody();
  
  // Add header
  var header = body.appendParagraph("MATERIAL ORDER");
  header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  header.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  // Add order details
  body.appendParagraph("Order ID: {{ORDER_ID}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph("Order Date: {{ORDER_DATE}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph("Job: {{JOB_ID}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph("PM: {{PM_NAME}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph("Super: {{SUPER_NAME}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph("Delivery Type: {{DELIVERY_TYPE}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph("Delivery Address: {{DELIVERY_ADDRESS}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.appendParagraph("Requested Date: {{REQUESTED_DATE}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  
  // Add items section
  var itemsHeader = body.appendParagraph("Ordered Items");
  itemsHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  // Create items table
  var table = body.appendTable();
  var headerRow = table.appendTableRow();
  headerRow.appendTableCell("Product").setBackgroundColor("#f3f3f3");
  headerRow.appendTableCell("Quantity").setBackgroundColor("#f3f3f3");
  headerRow.appendTableCell("Category").setBackgroundColor("#f3f3f3");
  headerRow.appendTableCell("Notes").setBackgroundColor("#f3f3f3");
  
  // Add placeholder row
  var placeholderRow = table.appendTableRow();
  placeholderRow.appendTableCell("{{ITEMS_TABLE}}");
  placeholderRow.appendTableCell("");
  placeholderRow.appendTableCell("");
  placeholderRow.appendTableCell("");
  
  // Add notes section
  body.appendParagraph("Additional Notes:").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph("{{NOTES}}").setHeading(DocumentApp.ParagraphHeading.NORMAL);
  
  // Save the template ID
  scriptProps.setProperty('ORDER_TEMPLATE_ID', doc.getId());
  
  return doc.getId();
}

function testMaterialOrderingSheets() {
  try {
    var ss = getMaterialOrderingSpreadsheet();
    var sheets = ss.getSheets();
    var results = {
      spreadsheetName: ss.getName(),
      sheetsFound: []
    };
    
    // Log all sheets
    for (var i = 0; i < sheets.length; i++) {
      var sheetName = sheets[i].getName();
      var rowCount = sheets[i].getLastRow();
      results.sheetsFound.push({
        name: sheetName,
        rowCount: rowCount
      });
    }
    
    return results;
  } catch (e) {
    return "Error: " + e.toString();
  }
}
