// Triggers.gs
// Sets up time-based triggers for automated processing

// Function to set up all required triggers
function setupTriggers() {
  // Clear existing triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  // Create trigger to check for pending orders every 5 minutes
  ScriptApp.newTrigger('processPendingOrders')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('Triggers set up successfully');
}

// Function to process pending orders
function processPendingOrders() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Process material orders
    var materialSheet = ss.getSheetByName('Material Orders');
    if (materialSheet) {
      processOrdersSheet(materialSheet);
    }
    
    // Process wallcovering orders
    var wallcoveringSheet = ss.getSheetByName('Wallcovering Orders');
    if (wallcoveringSheet) {
      processOrdersSheet(wallcoveringSheet);
    }
    
    Logger.log('Orders processed successfully');
  } catch (e) {
    Logger.log('Error processing orders: ' + e.toString());
  }
}

// Process a specific order sheet
function processOrdersSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  var statusColIndex = data[0].indexOf('Status');
  
  if (statusColIndex === -1) {
    Logger.log('Status column not found in sheet: ' + sheet.getName());
    return;
  }
  
  // Skip header row
  for (var i = 1; i < data.length; i++) {
    if (data[i][statusColIndex] === 'Pending') {
      // Update status to "Processing" after 1 hour
      var orderDate = new Date(data[i][1]);
      var currentDate = new Date();
      var hoursSinceOrder = (currentDate - orderDate) / (1000 * 60 * 60);
      
      if (hoursSinceOrder >= 1) {
        sheet.getRange(i + 1, statusColIndex + 1).setValue('Processing');
        Logger.log('Updated order ' + data[i][0] + ' status to Processing');
      }
    }
  }
}
