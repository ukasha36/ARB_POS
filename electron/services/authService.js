const authRepository = require('../repositories/authRepository');

class AuthService {
  login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    const user = authRepository.findByUsername(username.trim());

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    if (user.password !== password) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Update last login timestamp
    authRepository.updateLastLogin(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    };
  }

  getProfile(userId) {
    try {
      const user = authRepository.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  updateProfile({ userId, username, displayName, currentPassword, newPassword }) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const existingUser = authRepository.getUserWithPassword(userId);
      if (!existingUser) {
        return { success: false, error: 'User account not found' };
      }

      if (!username || !username.trim()) {
        return { success: false, error: 'Username is required' };
      }

      if (!displayName || !displayName.trim()) {
        return { success: false, error: 'User display name is required' };
      }

      const trimmedUsername = username.trim();
      const trimmedDisplayName = displayName.trim();

      // Check unique username
      const conflict = authRepository.findByUsernameExcluding(trimmedUsername, userId);
      if (conflict) {
        return { success: false, error: `Username '${trimmedUsername}' is already in use by another account.` };
      }

      // Check if password change requested
      let passwordToSave = null;
      if (newPassword && newPassword.trim()) {
        if (!currentPassword) {
          return { success: false, error: 'Current password is required to change password' };
        }
        if (existingUser.password !== currentPassword) {
          return { success: false, error: 'Current password is incorrect' };
        }
        if (newPassword.trim().length < 4) {
          return { success: false, error: 'New password must be at least 4 characters long' };
        }
        passwordToSave = newPassword.trim();
      } else if (currentPassword) {
        // Just verifying identity if provided
        if (existingUser.password !== currentPassword) {
          return { success: false, error: 'Current password is incorrect' };
        }
      }

      authRepository.updateProfile(userId, {
        username: trimmedUsername,
        displayName: trimmedDisplayName,
        password: passwordToSave,
      });

      return {
        success: true,
        message: 'Profile updated successfully!',
        user: {
          id: existingUser.id,
          username: trimmedUsername,
          displayName: trimmedDisplayName,
          role: existingUser.role,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new AuthService();
