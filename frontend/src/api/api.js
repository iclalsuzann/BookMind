export const API_URL = "http://localhost:5000/api";

/**
 * Global API Helper: Toggle Like on a Review
 */
export const toggleLike = async (ratingId, userId) => {
  try {
    await fetch(`${API_URL}/books/ratings/${ratingId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId })
    });
    return true;
  } catch (e) { return false; }
};

/**
 * User Search (Community)
 */
export const searchUsers = async (query) => {
  if (!query) return [];
  try {
    const res = await fetch(`${API_URL}/auth/search?query=${query}`);
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch (e) {
    return [];
  }
};

/**
 * Reading List (Wishlist) Functions
 * It will appear as "Reading List" in the UI, but we use "wishlist" in the code.
 */
export const toggleWishlist = async (bookId, userId, bookTitle, imageUrl) => {
  try {
    const res = await fetch(`${API_URL}/books/${bookId}/wishlist/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        user_id: userId,
        book_title: bookTitle,
        image_url: imageUrl
      })
    });
    return await res.json();
  } catch (e) {
    return { status: "error" };
  }
};

export const checkWishlistStatus = async (bookId, userId) => {
  try {
    const res = await fetch(`${API_URL}/books/${bookId}/wishlist/check?user_id=${userId}`);
    const data = await res.json();
    return data.in_wishlist;
  } catch (e) {
    return false;
  }
};

export const getUserWishlist = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/books/users/${userId}/wishlist`);
    return await res.json();
  } catch (e) {
    return [];
  }
};

export const deleteRating = async (bookId, userId) => {
  try {
    const res = await fetch(`${API_URL}/books/${bookId}/rate?user_id=${userId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};