// WallcoveringOrderFormController.gs
// Interacts with "Wallcovering Orders" Sheet

// Get HTML for Wallcovering Order Form
function getWallcoveringOrderFormHtml() {
  var template = HtmlService.createTemplateFromFile('WallcoveringOrderForm');
  
  // Get data for dropdowns
  template.vendors = getWallcoveringVendors();
  template.equipment = getWallcoveringEquipment();
  template.jobs = getJobs(); // Reuse from Material Order
  
  return template.evaluate().getContent();
}

// Get list of wallcovering vendors
function getWallcoveringVendors() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Wallcovering Vendors') || createWallcoveringVendorsSheet(ss);
    
    var data = sheet.getDataRange().getValues();
    var vendors = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        vendors.push({
          id: data[i][0],
          name: data[i][1],
          contactEmail: data[i][2],
          phone: data[i][3]
        });
      }
    }
    
    return vendors;
  } catch (e) {
    Logger.log(e);
    return [];
  }
}

// Get list of wallcovering equipment
function getWallcoveringEquipment() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Wallcovering Equipment') || createWallcoveringEquipmentSheet(ss);
    
    var data = sheet.getDataRange().getValues();
    var equipment = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        equipment.push({
          id: data[i][0],
          name: data[i][1],
          vendorId: data[i][2],
          category: data[i][3],
          dailyRate: data[i][4]
        });
      }
    }
    
    return equipment;
  } catch (e) {
    Logger.log(e);
    return [];
  }
}

// Submit wallcovering equipment order
function submitWallcoveringOrder(orderData) {
  try {
    // Validate data
    if (!validateWallcoveringOrder(orderData)) {
      return { 
        success: false, 
        message: "Validation failed. Please check all required fields."
      };
    }
    
    // Save order to sheet
    saveWallcoveringOrderToSheet(orderData);
    
    // Generate PDF
    var pdfUrl = generateWallcoveringOrderPdf(orderData);
    
    // Send email notification
    sendWallcoveringOrderEmail(orderData, pdfUrl);
    
    return {
      success: true,
      message: "Equipment order submitted successfully!",
      pdfUrl: pdfUrl
    };
  } catch (e) {
    Logger.log(e);
    return {
      success: false,
      message: "Error submitting order: " + e.toString()
    };
  }
}

// Validate wallcovering order data
function validateWallcoveringOrder(orderData) {
  // Check required fields
  if (!orderData.jobId || !orderData.vendorId || !orderData.items || orderData.items.length === 0) {
    return false;
  }
  
  // Validate delivery type
  if (orderData.deliveryType === "Delivery" && !orderData.deliveryAddress) {
    return false;
  }
  
  // Validate rental period
  if (!orderData.startDate || !orderData.endDate) {
    return false;
  }
  
  return true;
}

// Save wallcovering order to Orders sheet
function saveWallcoveringOrderToSheet(orderData) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Wallcovering Orders') || createWallcoveringOrdersSheet(ss);
  
  // Get username from session
  var userProps = PropertiesService.getUserProperties();
  var username = userProps.getProperty('username') || "Unknown";
  
  // Generate order ID
  var orderId = "WCO-" + new Date().getTime();
  
  // Convert items array to string
  var itemsJson = JSON.stringify(orderData.items);
  
  // Add order to sheet
  sheet.appendRow([
    orderId,
    new Date(),
    username,
    orderData.jobId,
    orderData.vendorId,
    orderData.deliveryType,
    orderData.deliveryAddress || "Will Call",
    orderData.startDate,
    orderData.endDate,
    itemsJson,
    orderData.notes || "",
    "Pending" // Status
  ]);
  
  return orderId;
}

// Generate PDF from Google Doc template
function generateWallcoveringOrderPdf(orderData) {
  var templateId = "1Ez1d2yfS3xQG5JgFh7TvpQZxNeKjL2pWq9o8abcXYZ"; // Replace with your template Doc ID
  var docTemplate = DocumentApp.openById(templateId);
  
  // Create a copy of the template
  var docName = "Wallcovering Equipment Order - Job " + orderData.jobId + " - " + new Date().toISOString().split('T')[0];
  var docCopy = DriveApp.getFileById(templateId).makeCopy(docName);
  var doc = DocumentApp.openById(docCopy.getId());
  var body = doc.getBody();
  
  // Get job and vendor details
  var job = getJobById(orderData.jobId);
  var vendor = getWallcoveringVendorById(orderData.vendorId);
  
  // Replace placeholders in template
  body.replaceText("{{ORDER_DATE}}", new Date().toLocaleDateString());
  body.replaceText("{{JOB_ID}}", orderData.jobId);
  body.replaceText("{{JOB_NAME}}", job ? job.name : "");
  body.replaceText("{{JOB_ADDRESS}}", job ? job.address : "");
  body.replaceText("{{VENDOR_NAME}}", vendor ? vendor.name : "");
  body.replaceText("{{DELIVERY_TYPE}}", orderData.deliveryType);
  body.replaceText("{{DELIVERY_ADDRESS}}", orderData.deliveryAddress || "Will Call");
  body.replaceText("{{START_DATE}}", orderData.startDate);
  body.replaceText("{{END_DATE}}", orderData.endDate);
  
  // Build items table
  var table = body.findText("{{ITEMS_TABLE}}").getElement().getParent().getParent();
  for (var i = 0; i < orderData.items.length; i++) {
    var item = orderData.items[i];
    var equipment = getWallcoveringEquipmentById(item.equipmentId);
    
    // Add row to table
    var row = table.appendTableRow();
    row.appendTableCell(equipment ? equipment.name : item.equipmentId);
    row.appendTableCell(item.quantity.toString());
    row.appendTableCell(equipment ? "$" + equipment.dailyRate.toFixed(2) : "");
    var days = calculateDays(orderData.startDate, orderData.endDate);
    row.appendTableCell(days.toString());
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

// Calculate days between two dates
function calculateDays(startDate, endDate) {
  var start = new Date(startDate);
  var end = new Date(endDate);
  
  // Add 1 to include both start and end days
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

// Send email notification with PDF
function sendWallcoveringOrderEmail(orderData, pdfUrl) {
  // Get recipients
  var userProps = PropertiesService.getUserProperties();
  var username = userProps.getProperty('username');
  var userData = getUserData(username);
  
  var vendor = getWallcoveringVendorById(orderData.vendorId);
  var job = getJobById(orderData.jobId);
  
  var recipients = userData.email;
  if (vendor && vendor.contactEmail) {
    recipients += "," + vendor.contactEmail;
  }
  
  // Build email body
  var subject = "Wallcovering Equipment Order - Job " + orderData.jobId + " - " + new Date().toLocaleDateString();
  
  var body = "<html><body>";
  body += "<h2>Wallcovering Equipment Order</h2>";
  body += "<p><strong>Order Date:</strong> " + new Date().toLocaleDateString() + "</p>";
  body += "<p><strong>Job:</strong> " + orderData.jobId + (job ? " - " + job.name : "") + "</p>";
  body += "<p><strong>Vendor:</strong> " + (vendor ? vendor.name : orderData.vendorId) + "</p>";
  body += "<p><strong>Rental Period:</strong> " + orderData.startDate + " to " + orderData.endDate + "</p>";
  body += "<p><strong>Delivery Type:</strong> " + orderData.deliveryType + "</p>";
  if (orderData.deliveryType === "Delivery") {
    body += "<p><strong>Delivery Address:</strong> " + orderData.deliveryAddress + "</p>";
  }
  
  body += "<h3>Equipment:</h3>";
  body += "<table border='1' cellpadding='5' style='border-collapse:collapse;'>";
  body += "<tr><th>Equipment</th><th>Quantity</th><th>Notes</th></tr>";
  
  for (var i = 0; i < orderData.items.length; i++) {
    var item = orderData.items[i];
    var equipment = getWallcoveringEquipmentById(item.equipmentId);
    
    body += "<tr>";
    body += "<td>" + (equipment ? equipment.name : item.equipmentId) + "</td>";
    body += "<td>" + item.quantity + "</td>";
    body += "<td>" + (item.notes || "") + "</td>";
    body += "</tr>";
  }
  
  body += "</table>";
  body += "<p>Please see the attached PDF for full details.</p>";
  body += "<p>Click <a href='" + pdfUrl + "'>here</a> to view the PDF.</p>";
  body += "</body></html>";
  
  // Send email with PDF attachment
  try {
    var pdf = DriveApp.getFileById(pdfUrl.split("id=")[1]);
    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      htmlBody: body,
      attachments: [pdf.getAs(MimeType.PDF)]
    });
    return true;
  } catch (e) {
    Logger.log(e);
    return false;
  }
}

// Helper functions to get data by ID
function getWallcoveringVendorById(vendorId) {
  var vendors = getWallcoveringVendors();
  for (var i = 0; i < vendors.length; i++) {
    if (vendors[i].id === vendorId) {
      return vendors[i];
    }
  }
  return null;
}

function getWallcoveringEquipmentById(equipmentId) {
  var equipment = getWallcoveringEquipment();
  for (var i = 0; i < equipment.length; i++) {
    if (equipment[i].id === equipmentId) {
      return equipment[i];
    }
  }
  return null;
}

// Create necessary sheets if they don't exist
function createWallcoveringVendorsSheet(ss) {
  var sheet = ss.insertSheet('Wallcovering Vendors');
  sheet.appendRow(['VendorID', 'Name', 'Email', 'Phone']);
  sheet.appendRow(['WCV001', 'XYZ Equipment Rentals', 'rentals@xyz.com', '555-123-4567']);
  sheet.appendRow(['WCV002', 'ABC Wallcovering Supplies', 'equipment@abcwc.com', '555-987-6543']);
  return sheet;
}

function createWallcoveringEquipmentSheet(ss) {
  var sheet = ss.insertSheet('Wallcovering Equipment');
  sheet.appendRow(['EquipmentID', 'Name', 'VendorID', 'Category', 'DailyRate']);
  sheet.appendRow(['EQP001', 'Paste Machine', 'WCV001', 'Machine', 75.00]);
  sheet.appendRow(['EQP002', 'Wallpaper Table', 'WCV001', 'Tool', 25.00]);
  sheet.appendRow(['EQP003', 'Seam Roller', 'WCV002', 'Tool', 5.00]);
  sheet.appendRow(['EQP004', 'Smoothing Brush Set', 'WCV002', 'Tool', 10.00]);
  return sheet;
}

function createWallcoveringOrdersSheet(ss) {
  var sheet = ss.insertSheet('Wallcovering Orders');
  sheet.appendRow([
    'OrderID', 
    'Date', 
    'CreatedBy', 
    'JobID', 
    'VendorID', 
    'DeliveryType', 
    'DeliveryAddress', 
    'StartDate',
    'EndDate',
    'Items', 
    'Notes', 
    'Status'
  ]);
  return sheet;
}
