import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { CognitoStorage } from '../utils/CognitoStorage';

// Replace with your own AWS Cognito User Pool credentials
const poolData = {
  UserPoolId: 'us-east-1_Yb4cwXmqH',
  ClientId: '50o4msac77p5nka7hbcjqvvq36',
  Storage: CognitoStorage
};

// Make client ID available for token storage keys
export const COGNITO_CLIENT_ID = poolData.ClientId;

export const userPool = new CognitoUserPool(poolData);