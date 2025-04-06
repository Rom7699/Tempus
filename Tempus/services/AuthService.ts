import {
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
  ISignUpResult,
  CognitoUserPool
} from 'amazon-cognito-identity-js';
import { userPool } from '../config/cognito';
import { AuthPersistence } from '../utils/AuthPersistence';

interface SignUpParams {
  fullName: string;
  email: string;
  password: string;
}

interface SignInParams {
  email: string;
  password: string;
}

export class AuthService {
  // Sign up a new user
  static signUp = (params: SignUpParams): Promise<ISignUpResult> => {
    const { fullName, email, password } = params;
    
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'name',
        Value: fullName
      }),
      new CognitoUserAttribute({
        Name: 'email',
        Value: email
      })
    ];
    
    return new Promise((resolve, reject) => {
      userPool.signUp(
        email,
        password,
        attributeList,
        [],
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result!);
        }
      );
    });
  };

  // Sign in an existing user
  static signIn = (params: SignInParams): Promise<CognitoUser> => {
    const { email, password } = params;
    
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password
    });
    
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          // Store the tokens for future use
          const accessToken = result.getAccessToken().getJwtToken();
          const idToken = result.getIdToken().getJwtToken();
          const refreshToken = result.getRefreshToken().getToken();
          
          // Save user information for persistence
          await AuthPersistence.saveUser(email);
          
          // Save any additional session info if needed
          await AuthPersistence.saveSessionInfo({
            lastLogin: new Date().toISOString(),
          });
          
          resolve(cognitoUser);
        },
        onFailure: (err) => {
          reject(err);
        },
        // Handle new password required (for admin created users)
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // This is relevant if you allow admin creation of users
          // For now we'll just reject with a clear message
          reject(new Error('New password setup required. Please contact support.'));
        }
      });
    });
  };

  // Sign out the current user and clear any cached tokens
  static signOut = async (): Promise<void> => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      // Clear stored user data
      await AuthPersistence.clearUser();
      
      // Global sign out will invalidate all tokens
      return new Promise((resolve, reject) => {
        currentUser.globalSignOut({
          onSuccess: () => {
            // Local sign out to remove tokens from storage
            currentUser.signOut();
            resolve();
          },
          onFailure: (err) => {
            console.error('Global sign out failed:', err);
            // Still try local sign out
            currentUser.signOut();
            resolve();
          }
        });
      });
    }
  };

  // Get current authenticated user with session validation
  static getCurrentUser = async (): Promise<CognitoUser | null> => {
    // First check if we have a user in the Cognito JS SDK's storage
    const cognitoUser = userPool.getCurrentUser();
    
    // If we don't have a Cognito user, check our stored user data
    if (!cognitoUser) {
      const storedUser = await AuthPersistence.getUser();
      if (storedUser) {
        // We have stored user data but no Cognito session
        // This could happen if tokens expired but we still have user data
        // Attempt to create a user object
        const userData = {
          Username: storedUser.username,
          Pool: userPool
        };
        const newCognitoUser = new CognitoUser(userData);
        
        // Check if this user has a valid session
        try {
          const hasSession = await new Promise<boolean>((resolve) => {
            newCognitoUser.getSession((err: Error | null, session: any) => {
              if (err || !session || !session.isValid()) {
                resolve(false);
              } else {
                resolve(true);
              }
            });
          });
          
          if (hasSession) {
            return newCognitoUser;
          } else {
            // Clear invalid session data
            await AuthPersistence.clearUser();
            return null;
          }
        } catch (error) {
          console.error('Error checking session:', error);
          return null;
        }
      }
      return null;
    }
    
    // We have a Cognito user, check if session is valid
    return new Promise((resolve) => {
      cognitoUser.getSession((err: Error | null, session: any) => {
        if (err) {
          console.error('Session error:', err);
          resolve(null);
          return;
        }
        
        if (session && session.isValid()) {
          // Refresh the user's attributes to ensure we have the latest data
          cognitoUser.getUserAttributes((attrErr, attributes) => {
            if (attrErr) {
              console.warn('Could not retrieve attributes', attrErr);
              // We still have a valid session, so return the user
            }
            // Return the user with a valid session
            resolve(cognitoUser);
          });
        } else {
          // Session exists but is not valid (likely expired)
          // Clear stored data
          AuthPersistence.clearUser();
          resolve(null);
        }
      });
    });
  };

  // Forgot password - initiate password reset
  static forgotPassword = (email: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  };

  // Confirm new password with verification code
  static confirmNewPassword = (email: string, verificationCode: string, newPassword: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(verificationCode, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  };

  // Confirm user registration with verification code
  static confirmRegistration = (email: string, verificationCode: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  // Resend confirmation code
  static resendConfirmationCode = (email: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };
}