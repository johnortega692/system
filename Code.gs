// Code.gs (Main Entry Point)

function doGet(e) {
  try {
    var userProps = PropertiesService.getUserProperties();
    var loggedInUser = userProps.getProperty('username');
    
    if (loggedInUser) {
      // User is logged in, show home page
      var userData = getUserData(loggedInUser);
      
      if (!userData) {
        // Handle case where user data couldn't be retrieved
        var template = HtmlService.createTemplateFromFile('Login');
        template.loginError = "User session expired. Please log in again.";
        return template.evaluate()
          .setTitle('Company App Portal')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      }
      
      var homeTemplate = HtmlService.createTemplateFromFile('Home');
      homeTemplate.userData = userData;
      
      var htmlContent = homeTemplate.evaluate().getContent();
      
      var mainTemplate = HtmlService.createTemplateFromFile('Index');
      mainTemplate.content = htmlContent;
      mainTemplate.loggedIn = true;
      
      return mainTemplate.evaluate()
        .setTitle('Company App Portal')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else {
      // User is not logged in, show login page
      var loginTemplate = HtmlService.createTemplateFromFile('Login');
      var loginContent = loginTemplate.evaluate().getContent();
      
      var mainTemplate = HtmlService.createTemplateFromFile('Index');
      mainTemplate.content = loginContent;
      mainTemplate.loggedIn = false;
      
      return mainTemplate.evaluate()
        .setTitle('Company App Portal')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
  } catch (e) {
    Logger.log("Error in doGet: " + e.toString());
    return HtmlService.createHtmlOutput(
      '<h1>System Error</h1><p>' + e.toString() + '</p>'
    );
  }
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

// Authenticate user against User sheet
// In Code.gs - Authenticate user function
// Authenticate user against User sheet
function authenticateUser(username, password) {
  try {
    // Get the spreadsheet and users sheet
    var ss = getMainSpreadsheet();
    var userSheet = ss.getSheetByName('Users');
    
    if (!userSheet) {
      return { success: false, message: "System error: Users sheet not found" };
    }
    
    var data = userSheet.getDataRange().getValues();
    
    // Check credentials (skip header row)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === username && data[i][1] === password) {
        // Store user session data
        var userProps = PropertiesService.getUserProperties();
        userProps.setProperty('username', username);
        
        // Return user data directly with the response
        var userData = {
          username: username,
          firstName: data[i][3] || "User",
          lastName: data[i][4] || "",
          email: data[i][2] || "",
          modules: (data[i][5] || "").split(',').map(m => m.trim())
        };
        
        // Get the home page HTML
        var homeTemplate = HtmlService.createTemplateFromFile('Home');
        homeTemplate.userData = userData;
        var homeHtml = homeTemplate.evaluate().getContent();
        
        return {
          success: true,
          userData: userData,
          homeHtml: homeHtml
        };
      }
    }
    
    return { success: false, message: "Invalid username or password" };
  } catch (e) {
    Logger.log("Authentication error: " + e.toString());
    return { success: false, message: "System error: " + e.toString() };
  }
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

// Testing function to check if the app is working
function testApp() {
  var ss = getMainSpreadsheet();
  return "App is working. Spreadsheet ID: " + ss.getId();
}

function getHomeHtml() {
  try {
    var userProps = PropertiesService.getUserProperties();
    var username = userProps.getProperty('username');
    
    if (!username) {
      return {
        success: false,
        message: "Session expired. Please log in again."
      };
    }
    
    var userData = getUserData(username);
    
    if (!userData) {
      return {
        success: false,
        message: "User data not found. Please log in again."
      };
    }
    
    var homeTemplate = HtmlService.createTemplateFromFile('Home');
    homeTemplate.userData = userData;
    var homeHtml = homeTemplate.evaluate().getContent();
    
    return {
      success: true,
      homeHtml: homeHtml
    };
  } catch (e) {
    Logger.log("Get home HTML error: " + e.toString());
    return {
      success: false,
      message: "Error: " + e.toString()
    };
  }
}
