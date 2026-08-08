/*
  Portfolio-safe restaurant configuration.
  Replace the demo values below with your own restaurant information
  and Supabase project settings when running the system.
*/
window.RESTAURANT_CONFIG = {
  restaurant: {
    name: "Demo Restaurant",
    englishName: "DEMO RESTAURANT",
    tagline: "Modern digital dining experience",
    phone: "0000000000",
    address: "Your City",
    workingHours: "Daily 10:00 AM – 12:00 AM",
    mapUrl: "",
    tableCount: 20,
    currency: "₪"
  },

  supabase: {
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY"
  },

  colors: {
    primary: "#7A1F2B",
    secondary: "#D8A75B",
    background: "#FFF9F2",
    text: "#1F1A17",
    success: "#1F9D62"
  },

  assets: {
    productPlaceholder: "assets/product-placeholder.svg",
    venuePlaceholder: "assets/product-placeholder.svg"
  },

  menu: {
    showEnglishName: true,
    showVenueImage: false,
    showContactSection: true,
    showFooter: true,
    categorySidebarTitle: "Categories",
    menuTitle: "Menu",
    addButtonText: "Add",
    emptyMenuText: "No items are available.",
    productImagePosition: "right"
  },

  order: {
    cartTitle: "Your Order",
    tableLabel: "Table Number",
    notesLabel: "Order Notes",
    notesPlaceholder: "Example: no onions",
    submitButton: "Send Order",
    submittingText: "Sending...",
    emptyCartMessage: "Cart is empty.",
    addItemFirstMessage: "Add an item first",
    successTitle: "Order Sent",
    successMessage: "Your order has been sent to the kitchen.",
    successButton: "Done"
  },

  contact: {
    eyebrow: "We look forward to seeing you",
    title: "Location & Contact",
    description: "Restaurant contact and visit information.",
    locationTitle: "Location",
    phoneTitle: "Contact",
    hoursTitle: "Working Hours",
    mapButtonText: "Open map →",
    callButtonText: "Call →",
    hoursNote: "Hours may vary on holidays."
  },

  kitchen: {
    pageTitle: "Kitchen Display",
    emptyMessage: "No active orders.",
    printButton: "Print",
    preparingButton: "Start Preparing",
    readyButton: "Ready",
    deliveredButton: "Delivered"
  },

  cash: {
    pageTitle: "Cashier & Tables",
    emptyTableText: "Table is empty",
    activeTableText: "Open order",
    totalLabel: "Total",
    checkoutButton: "Close Bill",
    checkoutConfirm: "Confirm payment and close all orders for this table?",
    checkoutSuccess: "Table bill closed successfully.",
    noOrdersMessage: "No open orders."
  }
};

window.RESTAURANT_CONFIG.restaurantName = window.RESTAURANT_CONFIG.restaurant.name;
window.RESTAURANT_CONFIG.englishName = window.RESTAURANT_CONFIG.restaurant.englishName;
window.RESTAURANT_CONFIG.tagline = window.RESTAURANT_CONFIG.restaurant.tagline;
window.RESTAURANT_CONFIG.phone = window.RESTAURANT_CONFIG.restaurant.phone;
window.RESTAURANT_CONFIG.address = window.RESTAURANT_CONFIG.restaurant.address;
window.RESTAURANT_CONFIG.workingHours = window.RESTAURANT_CONFIG.restaurant.workingHours;
window.RESTAURANT_CONFIG.mapUrl = window.RESTAURANT_CONFIG.restaurant.mapUrl;
window.RESTAURANT_CONFIG.tableCount = window.RESTAURANT_CONFIG.restaurant.tableCount;
window.RESTAURANT_CONFIG.currency = window.RESTAURANT_CONFIG.restaurant.currency;
