// Utility to clear user cache and force fresh data
export const clearUserCache = () => {
  console.log('Clearing user cache...');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('User cache cleared. Please refresh the page and log in again.');
  
  // Show alert to user
  alert('User cache cleared! Please refresh the page and log in again to get fresh data.');
  
  // Refresh the page
  window.location.reload();
};

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  window.clearUserCache = clearUserCache;
}
