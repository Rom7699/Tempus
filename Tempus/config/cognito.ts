import { CognitoUserPool } from 'amazon-cognito-identity-js';

// Replace with your own AWS Cognito User Pool credentials
const poolData = {
  // UserPoolId: 'us-east-1_Yb4cwXmqH',
  UserPoolId: 'us-east-1_ygYoHfnpa',
  ClientId: '5d0u0hu3elqj8cj7maf152199j'
};

export const userPool = new CognitoUserPool(poolData);