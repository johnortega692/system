// Code.gs (Main Entry Point)

function doGet() {
  const userProps = PropertiesService.getUserProperties();
  const username = userProps.getProperty('username');

  const mainTemplate = HtmlService.createTemplateFromFile('Index');
  mainTemplate.loggedIn = false;

  if (username) {
    const userData = getUserData(username);
    if (userData) {
      const homeTemplate = HtmlService.createTemplateFromFile('Home');
      homeTemplate.userData = userData;

      const homeHtml = homeTemplate.evaluate().getContent(); // ← inject as HTML
      mainTemplate.content = homeHtml;
      mainTemplate.loggedIn = true;
    } else {
      const loginTemplate = HtmlService.createTemplateFromFile('Login');
      mainTemplate.content = loginTemplate.evaluate().getContent();
    }
  } else {
    const loginTemplate = HtmlService.createTemplateFromFile('Login');
    mainTemplate.content = loginTemplate.evaluate().getContent();
  }

  return mainTemplate.evaluate()
    .setTitle('Company App Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// Helper function to refresh user session
// Helper function to refresh user session
function refreshUserSession(username) {
  var userProps = PropertiesService.getUserProperties();
  
  // Refresh the username property to ensure it's set correctly
  if (username) {
    userProps.setProperty('username', username);
  }
  
  return true;
}
// Helper function to include HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Function to initialize the main spreadsheet ID if needed
function initializeSpreadsheetId() {
  var scriptProps = PropertiesService.getScriptProperties();
  
  // Check if we already have a stored ID
  var storedId = scriptProps.getProperty('MAIN_SHEET_ID');
  if (!storedId) {
    // If not, use the hardcoded ID or create a new spreadsheet
    var hardcodedId = '11g2axq4_bCh-S7gSqdjDNRGyZJniGVloRdgmpPaZhlA';
    
    try {
      // Try to open with hardcoded ID
      var ss = SpreadsheetApp.openById(hardcodedId);
      scriptProps.setProperty('MAIN_SHEET_ID', hardcodedId);
      Logger.log('Using hardcoded spreadsheet ID: ' + hardcodedId);
    } catch (e) {
      // Create new if hardcoded doesn't exist
      var newSs = SpreadsheetApp.create("App Users and Data");
      scriptProps.setProperty('MAIN_SHEET_ID', newSs.getId());
      Logger.log('Created new spreadsheet with ID: ' + newSs.getId());
      
      // Initialize the sheets
      initializeSheets(newSs);
    }
  }
}
// Force create spreadsheet and initialize all sheets
function forceCreateAndInitialize() {
  try {
    // Clear any existing ID to force new creation
    PropertiesService.getScriptProperties().deleteProperty('MAIN_SHEET_ID');
    
    // Get/create spreadsheet
    var ss = getMainSpreadsheet();
    
    // Initialize all sheets
    var result = initializeSheets(ss);
    
    return "Spreadsheet created and initialized successfully. ID: " + ss.getId() + 
           ", URL: " + ss.getUrl();
  } catch (e) {
    return "Error: " + e.toString();
  }
}
// Get or create the main spreadsheet
// Get the main app spreadsheet (for users and app data)
function getMainSpreadsheet() {
  var scriptProps = PropertiesService.getScriptProperties();
  var sheetId = scriptProps.getProperty('MAIN_SHEET_ID');
  var ss = null;
  
  // Try to open existing spreadsheet if we have an ID
  if (sheetId) {
    try {
      ss = SpreadsheetApp.openById(sheetId);
      Logger.log("Successfully opened existing spreadsheet: " + sheetId);
      return ss;
    } catch (e) {
      Logger.log("Could not open existing spreadsheet: " + e.toString());
      // Continue to create a new one
    }
  }
  
  // Create new spreadsheet
  try {
    ss = SpreadsheetApp.create("App Users and Data");
    var newId = ss.getId();
    scriptProps.setProperty('MAIN_SHEET_ID', newId);
    Logger.log("Created new spreadsheet with ID: " + newId);
    
    // Initialize basic sheets
    var initResult = initializeSheets(ss);
    if (!initResult) {
      Logger.log("Warning: Failed to initialize all sheets");
    }
    
    return ss;
  } catch (e) {
    Logger.log("Error creating spreadsheet: " + e.toString());
    throw new Error("Failed to create or access spreadsheet: " + e.toString());
  }
}

// Get the material ordering system spreadsheet
function getMaterialOrderingSpreadsheet() {
  var scriptProps = PropertiesService.getScriptProperties();
  var materialOrderingSheetId = scriptProps.getProperty('MATERIAL_ORDERING_SHEET_ID');
  
  if (!materialOrderingSheetId) {
    // Set the material ordering spreadsheet ID if not already set
    materialOrderingSheetId = "1O_PDJL5AVMlf922tkBVeDKwJXu7_-zI74D5W8-GbvVI"; // Your provided ID
    scriptProps.setProperty('MATERIAL_ORDERING_SHEET_ID', materialOrderingSheetId);
    Logger.log("Material ordering spreadsheet ID set to: " + materialOrderingSheetId);
  }
  
  try {
    var ss = SpreadsheetApp.openById(materialOrderingSheetId);
    return ss;
  } catch (e) {
    Logger.log("Error opening material ordering spreadsheet: " + e.toString());
    throw new Error("Failed to access the Material Ordering spreadsheet. Please check the ID.");
  }
}
// Initialize all required sheets
function initializeSheets(ss) {
  // Check if spreadsheet object is valid
  if (!ss) {
    Logger.log("Error: Spreadsheet object is undefined in initializeSheets");
    return false;
  }
  
  try {
    // Create Users sheet if it doesn't exist
    if (!ss.getSheetByName('Users')) {
      var usersSheet = ss.insertSheet('Users');
      usersSheet.appendRow(['Username', 'Password', 'Email', 'FirstName', 'LastName', 'ModuleAccess']);
      usersSheet.appendRow(['admin', 'admin123', 'admin@example.com', 'Admin', 'User', 'MaterialOrderForm,WallcoveringOrderForm,Dashboard']);
    }
    
    // Create other necessary sheets
    if (!ss.getSheetByName('Vendors')) {
      var vendorsSheet = ss.insertSheet('Vendors');
      vendorsSheet.appendRow(['VendorID', 'Name', 'Email', 'Phone']);
      vendorsSheet.appendRow(['VEN001', 'Acme Supplies', 'orders@acme.com', '555-123-4567']);
      vendorsSheet.appendRow(['VEN002', 'BuildRight Materials', 'sales@buildright.com', '555-987-6543']);
    }
    
    // More sheets...
    
    return true;
  } catch (e) {
    Logger.log("Error in initializeSheets: " + e.toString());
    return false;
  }
}
function getLoginHtml() {
  try {
    return HtmlService.createHtmlOutputFromFile('Login').getContent();
  } catch (e) {
    Logger.log("Error in getLoginHtml: " + e.toString());
    return "<div>Error loading login screen</div>";
  }
}

function authenticateUser(username, password) {
  const ss = getMainSpreadsheet(); // use centralized access
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const user = data[i][0]?.toString().trim().toLowerCase();
    const pass = data[i][1]?.toString().trim();

    if (user === username.toLowerCase().trim() && pass === password.trim()) {
      PropertiesService.getUserProperties().setProperty("username", user);
      return {
        success: true,
        username: user,
        modules: data[i][5] || ""
      };
    }
  }

  return {
    success: false,
    message: 'Invalid username or password'
  };
}




// Get user data from sheet
function getUserData(username) {
  try {
    Logger.log("Getting user data for: " + username);
    var ss = getMainSpreadsheet();
    Logger.log("Got spreadsheet: " + ss.getId());
    var userSheet = ss.getSheetByName('Users');
    
    if (!userSheet) {
      Logger.log("Users sheet not found");
      return null;
    }
    
    var data = userSheet.getDataRange().getValues();
    Logger.log("Found " + data.length + " user records");
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
        var userData = {
          username: username,
          firstName: data[i][3] || "User",
          lastName: data[i][4] || "",
          email: data[i][2] || "",
          modules: (data[i][5] || "").split(',').map(m => m.trim())
        };
        Logger.log("User data found: " + JSON.stringify(userData));
        return userData;
      }
    }
    
    Logger.log("User not found in sheet: " + username);
    return null;
  } catch (e) {
    Logger.log("Get user data error: " + e.toString());
    return null;
  }
}
// Logout user
function logoutUser() {
  var userProps = PropertiesService.getUserProperties();
  userProps.deleteAllProperties();
  return true;
}

// Get Material Order Form HTML
function getMaterialOrderFormHtml() {
  var template = HtmlService.createTemplateFromFile('MaterialOrderForm');
  
  // Get data for dropdowns
  template.vendors = getVendors();
  template.products = getProducts();
  template.jobs = getJobs();
  
  return template.evaluate().getContent();
}

// Get Wallcovering Order Form HTML
function getWallcoveringOrderFormHtml() {
  var template = HtmlService.createTemplateFromFile('WallcoveringOrderForm');
  
  // Get data for dropdowns
  template.vendors = getWallcoveringVendors();
  template.equipment = getWallcoveringEquipment();
  template.jobs = getJobs();
  
  return template.evaluate().getContent();
}

// Get Dashboard HTML
function getDashboardHtml() {
  var template = HtmlService.createTemplateFromFile('Dashboard');
  
  // Get summary data
  template.materialOrderSummary = getMaterialOrderSummary();
  template.wallcoveringOrderSummary = getWallcoveringOrderSummary();
  
  return template.evaluate().getContent();
}

// Helper functions to get data
function getVendors() {
  try {
    var ss = getMainSpreadsheet();
    var sheet = ss.getSheetByName('Vendors');
    
    if (!sheet) {
      return [];
    }
    
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

function getProducts() {
  try {
    var ss = getMainSpreadsheet();
    var sheet = ss.getSheetByName('Products');
    
    if (!sheet) {
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    var products = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        products.push({
          id: data[i][0],
          name: data[i][1],
          vendorId: data[i][2],
          category: data[i][3],
          unitPrice: data[i][4]
        });
      }
    }
    
    return products;
  } catch (e) {
    Logger.log(e);
    return [];
  }
}

function getJobs() {
  try {
    var ss = getMainSpreadsheet();
    var sheet = ss.getSheetByName('Jobs');
    
    if (!sheet) {
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    var jobs = [];
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        jobs.push({
          id: data[i][0],
          name: data[i][1],
          address: data[i][2],
          clientName: data[i][3]
        });
      }
    }
    
    return jobs;
  } catch (e) {
    Logger.log(e);
    return [];
  }
}
function getPackages() {
  try {
    // Use the getMaterialOrderingSpreadsheet function to access the sheet
    var ss = getMaterialOrderingSpreadsheet(); 
    var sheet = ss.getSheetByName('Sundries Packages');
    
    if (!sheet) {
      Logger.log("Sheet 'Sundries Packages' not found.");
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    var packages = [];
    let currentPackage = null;

    // Loop through the data, starting from row 1 to skip header
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const packageName = row[0]; // Package name in column A
      const itemName = row[1]; // Item name in column B
      const qty = row[2]; // Quantity in column C

      // Create a new package if the package name changes
      if (!currentPackage || currentPackage.packageName !== packageName) {
        if (currentPackage) packages.push(currentPackage); // Push the last package
        currentPackage = { packageName: packageName, items: [] }; // Start a new package
      }

      // Add the item to the current package
      currentPackage.items.push({ itemName: itemName, qty: qty });
    }

    // Push the last package
    if (currentPackage) packages.push(currentPackage);

    return packages;
  } catch (e) {
    Logger.log("Error getting packages: " + e.toString());
    return [];
  }
}




// Testing function to check if the app is working
function testApp() {
  var ss = getMainSpreadsheet();
  return "App is working. Spreadsheet ID: " + ss.getId();
}

function getHomeHtml() {
  const userProps = PropertiesService.getUserProperties();
  const username = userProps.getProperty('username');
  if (!username) return { success: false, message: "Session expired" };

  const userData = getUserData(username);
  if (!userData) return { success: false, message: "User data not found" };

  const template = HtmlService.createTemplateFromFile('Home');
  template.userData = userData;
  const html = template.evaluate().getContent();
  return { success: true, homeHtml: html };
}

