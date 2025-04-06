import { CognitoUserPool } from 'amazon-cognito-identity-js';

// Replace with your own AWS Cognito User Pool credentials
const poolData = {
  UserPoolId: 'us-east-1_Yb4cwXmqH',
  ClientId: '50o4msac77p5nka7hbcjqvvq36',
};

export const userPool = new CognitoUserPool(poolData);