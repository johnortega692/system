// DashboardController.gs
// Interacts with orders data for analytics

// Get HTML for Dashboard
function getDashboardHtml() {
  var template = HtmlService.createTemplateFromFile('Dashboard');
  
  // Get summary data
  template.materialOrderSummary = getMaterialOrderSummary();
  template.wallcoveringOrderSummary = getWallcoveringOrderSummary();
  
  return template.evaluate().getContent();
}

// Get summary data for material orders
function getMaterialOrderSummary() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Material Orders');
    
    if (!sheet) {
      return {
        totalOrders: 0,
        recentOrders: [],
        ordersByStatus: [],
        ordersByVendor: []
      };
    }
    
    var data = sheet.getDataRange().getValues();
    
    // Skip header row
    var orders = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        orders.push({
          orderId: data[i][0],
          date: new Date(data[i][1]),
          createdBy: data[i][2],
          jobId: data[i][3],
          vendorId: data[i][4],
          status: data[i][10]
        });
      }
    }
    
    // Total count
    var totalOrders = orders.length;
    
    // Recent orders (last 5)
    var recentOrders = orders.sort(function(a, b) {
      return b.date - a.date;
    }).slice(0, 5);
    
    // Orders by status
    var statusMap = {};
    for (var i = 0; i < orders.length; i++) {
      var status = orders[i].status || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
    
    var ordersByStatus = [];
    for (var status in statusMap) {
      ordersByStatus.push({
        status: status,
        count: statusMap[status]
      });
    }
    
    // Orders by vendor
    var vendorMap = {};
    for (var i = 0; i < orders.length; i++) {
      var vendorId = orders[i].vendorId;
      vendorMap[vendorId] = (vendorMap[vendorId] || 0) + 1;
    }
    
    var ordersByVendor = [];
    for (var vendorId in vendorMap) {
      var vendor = getVendorById(vendorId);
      ordersByVendor.push({
        vendorId: vendorId,
        vendorName: vendor ? vendor.name : vendorId,
        count: vendorMap[vendorId]
      });
    }
    
    return {
      totalOrders: totalOrders,
      recentOrders: recentOrders,
      ordersByStatus: ordersByStatus,
      ordersByVendor: ordersByVendor
    };
  } catch (e) {
    Logger.log(e);
    return {
      totalOrders: 0,
      recentOrders: [],
      ordersByStatus: [],
      ordersByVendor: []
    };
  }
}

// Get summary data for wallcovering orders
function getWallcoveringOrderSummary() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Wallcovering Orders');
    
    if (!sheet) {
      return {
        totalOrders: 0,
        recentOrders: [],
        ordersByStatus: [],
        ordersByVendor: []
      };
    }
    
    var data = sheet.getDataRange().getValues();
    
    // Skip header row
    var orders = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        orders.push({
          orderId: data[i][0],
          date: new Date(data[i][1]),
          createdBy: data[i][2],
          jobId: data[i][3],
          vendorId: data[i][4],
          startDate: data[i][7],
          endDate: data[i][8],
          status: data[i][11]
        });
      }
    }
    
    // Total count
    var totalOrders = orders.length;
    
    // Recent orders (last 5)
    var recentOrders = orders.sort(function(a, b) {
      return b.date - a.date;
    }).slice(0, 5);
    
    // Orders by status
    var statusMap = {};
    for (var i = 0; i < orders.length; i++) {
      var status = orders[i].status || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
    
    var ordersByStatus = [];
    for (var status in statusMap) {
      ordersByStatus.push({
        status: status,
        count: statusMap[status]
      });
    }
    
    // Orders by vendor
    var vendorMap = {};
    for (var i = 0; i < orders.length; i++) {
      var vendorId = orders[i].vendorId;
      vendorMap[vendorId] = (vendorMap[vendorId] || 0) + 1;
    }
    
    var ordersByVendor = [];
    for (var vendorId in vendorMap) {
      var vendor = getWallcoveringVendorById(vendorId);
      ordersByVendor.push({
        vendorId: vendorId,
        vendorName: vendor ? vendor.name : vendorId,
        count: vendorMap[vendorId]
      });
    }
    
    return {
      totalOrders: totalOrders,
      recentOrders: recentOrders,
      ordersByStatus: ordersByStatus,
      ordersByVendor: ordersByVendor
    };
  } catch (e) {
    Logger.log(e);
    return {
      totalOrders: 0,
      recentOrders: [],
      ordersByStatus: [],
      ordersByVendor: []
    };
  }
}

// Get user order history
function getUserOrderHistory() {
  try {
    // Get username from session
    var userProps = PropertiesService.getUserProperties();
    var username = userProps.getProperty('username');
    
    if (!username) {
      return {
        materialOrders: [],
        wallcoveringOrders: []
      };
    }
    
    var ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Get material orders
    var materialOrders = [];
    var materialSheet = ss.getSheetByName('Material Orders');
    if (materialSheet) {
      var data = materialSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][2] === username) {
          materialOrders.push({
            orderId: data[i][0],
            date: new Date(data[i][1]),
            jobId: data[i][3],
            vendorId: data[i][4],
            status: data[i][10]
          });
        }
      }
    }
    
    // Get wallcovering orders
    var wallcoveringOrders = [];
    var wallcoveringSheet = ss.getSheetByName('Wallcovering Orders');
    if (wallcoveringSheet) {
      var data = wallcoveringSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][2] === username) {
          wallcoveringOrders.push({
            orderId: data[i][0],
            date: new Date(data[i][1]),
            jobId: data[i][3],
            vendorId: data[i][4],
            startDate: data[i][7],
            endDate: data[i][8],
            status: data[i][11]
          });
        }
      }
    }
    
    return {
      materialOrders: materialOrders,
      wallcoveringOrders: wallcoveringOrders
    };
  } catch (e) {
    Logger.log(e);
    return {
      materialOrders: [],
      wallcoveringOrders: []
    };
  }
}
