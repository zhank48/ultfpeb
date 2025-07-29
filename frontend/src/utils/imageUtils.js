/**
 * Helper function to get proper photo URL for display
 * @param {string} photoUrl - Primary photo URL
 * @param {string} avatarUrl - Fallback avatar URL
 * @returns {string|null} - Properly formatted URL or null if no valid URL
 */
export const getPhotoUrl = (photoUrl, avatarUrl) => {
  // Prioritize photo_url, then avatar_url
  const url = photoUrl || avatarUrl;
  
  // Check if URL is valid (not null, undefined, empty, or string 'null'/'undefined')
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return null;
  }
  
  // If URL already starts with http, use as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // Get base URL from environment or default to localhost:3001
  const baseUrl = import.meta.env.VITE_API_URL ? 
    import.meta.env.VITE_API_URL.replace("/api", "") : 
    "http://localhost:3001";
  
  // If URL starts with /, prepend base URL
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  
  // Otherwise, assume it's a relative path and prepend base URL with /
  return `${baseUrl}/${url}`;
};

/**
 * Helper function specifically for visitor photos
 * @param {Object} visitor - Visitor object
 * @returns {string|null} - Properly formatted photo URL or null
 */
export const getVisitorPhotoUrl = (visitor) => {
  if (!visitor) return null;
  return getPhotoUrl(visitor.photo_url, visitor.avatar_url);
};

/**
 * Helper function specifically for user avatars
 * @param {Object} user - User object
 * @returns {string|null} - Properly formatted avatar URL or null
 */
export const getUserAvatarUrl = (user) => {
  if (!user) return null;
  return getPhotoUrl(user.photo_url, user.avatar_url);
};

/**
 * Helper function to get proper image URL for lost items
 * @param {string} imageUrl - Image URL from lost item
 * @returns {string|null} - Properly formatted URL or null
 */
export const getLostItemImageUrl = (imageUrl) => {
  return getPhotoUrl(imageUrl, null);
};