const authRepository = require('../repositories/authRepository');
const bcrypt = require('bcryptjs');

class AuthService {
  login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    const user = authRepository.findByUsername(username.trim());

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    if (!bcrypt.compareSync(password, user.password)) {
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
        forcePasswordChange: !!user.force_password_change,
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
          forcePasswordChange: !!user.force_password_change,
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
      let isForcedChange = !!existingUser.force_password_change;

      if (newPassword && newPassword.trim()) {
        if (!currentPassword) {
          return { success: false, error: 'Current password is required to change password' };
        }
        if (!bcrypt.compareSync(currentPassword, existingUser.password)) {
          return { success: false, error: 'Current password is incorrect' };
        }
        if (newPassword.trim().length < 4) {
          return { success: false, error: 'New password must be at least 4 characters long' };
        }
        passwordToSave = bcrypt.hashSync(newPassword.trim(), 10);
        isForcedChange = false; // password changed successfully, no longer forced
      } else if (currentPassword) {
        // Just verifying identity if provided
        if (!bcrypt.compareSync(currentPassword, existingUser.password)) {
          return { success: false, error: 'Current password is incorrect' };
        }
      }

      authRepository.updateProfile(userId, {
        username: trimmedUsername,
        displayName: trimmedDisplayName,
        password: passwordToSave,
        forcePasswordChange: isForcedChange,
      });

      return {
        success: true,
        message: 'Profile updated successfully!',
        user: {
          id: existingUser.id,
          username: trimmedUsername,
          displayName: trimmedDisplayName,
          role: existingUser.role,
          forcePasswordChange: isForcedChange,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new AuthService();
