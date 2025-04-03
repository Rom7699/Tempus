import {
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
  ISignUpResult,
  CognitoUserPool
} from 'amazon-cognito-identity-js';
import { userPool } from '../config/cognito';

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
        onSuccess: (result) => {
          resolve(cognitoUser);
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  };

  // Sign out the current user
  static signOut = (): void => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
  };

  // Get current authenticated user
  static getCurrentUser = (): Promise<CognitoUser | null> => {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        resolve(null);
        return;
      }
      
      cognitoUser.getSession((err: Error | null, session: any) => {
        if (err) {
          resolve(null);
          return;
        }
        
        if (session.isValid()) {
          resolve(cognitoUser);
        } else {
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