// utils/setMyTokens.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CognitoStorage } from '../utils/CognitoStorage';

export const setMyRealTokens = async () => {
  const clientId = '50o4msac77p5nka7hbcjqvvq36';
  const username = 'xtomerx003@gmail.com';
  
  // Your actual tokens
  const realTokens = {
    [`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`]: username,
    [`CognitoIdentityServiceProvider.${clientId}.${username}.idToken`]: 'eyJraWQiOiJVUTFveGdSVWh5VTU3bXd6Y3U4eHZUZnRRdVlWRVFlVmMrZjZyT2ZSUTE4PSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI5NGU4MjRmOC01MDIxLTcwMzgtNTY0Mi0xNjA0ZjA1YjE2YTYiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfWWI0Y3dYbXFIIiwiY29nbml0bzp1c2VybmFtZSI6Ijk0ZTgyNGY4LTUwMjEtNzAzOC01NjQyLTE2MDRmMDViMTZhNiIsIm9yaWdpbl9qdGkiOiJhNDlmMzM3MS1jZTMyLTQzMzYtODhkYi0yNjA5OWQ3MWFmOTkiLCJhdWQiOiI1MG80bXNhYzc3cDVua2E3aGJjanF2dnEzNiIsImV2ZW50X2lkIjoiNTg3MGJlMzgtNGEzYi00YzI2LWE4YWQtM2RlZTk4MTkzMWFkIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NTcxNTQ2MTAsIm5hbWUiOiJUb21lciBjb2hlbiIsImV4cCI6MTc1NzE1ODIxMCwiaWF0IjoxNzU3MTU0NjEwLCJqdGkiOiIzMjdhNzlkYS0zNzQwLTQ1YTYtOTY0Yi03NDFmYWRkY2UwOGYiLCJlbWFpbCI6Inh0b21lcngwMDNAZ21haWwuY29tIn0.fH804wVUk6KIxn54VfP1tHuUifE8VoAK7_pY5g0luNyefVLL0KwoKlnWtLfuNYudTqIRZXQK1y4lsyrW7ZlA5BfPxwvwc3vcf1ze493SwVbyhR_4sRxs4IEObJnoBFKAf_q3cEeWjI8znryMz-nMAxmiBFCRHFruoDd0F32a7nPjq3uy7attRVEsS7hzhUqSC1dEgAsslKmk4tc-EMFPPVj5Vn6uvihdxFtBm49ZiQnjTZREcoTecTuTJNHpzgrpgNw4sIc-KveeqjRr0r1uSKyF_cmPQyW1po-rScJVYon0LmINRSHaw7JQI67TVKXWqd-RjAFsIgPLem-MGBExgg',
    [`CognitoIdentityServiceProvider.${clientId}.${username}.accessToken`]: 'eyJraWQiOiJubFpnQUxsc3J4XC9IR05kSWVPZ0lOV1JcL0dDbmEwK0JRUUhCcU5uQzNUZkU9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI5NGU4MjRmOC01MDIxLTcwMzgtNTY0Mi0xNjA0ZjA1YjE2YTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9ZYjRjd1htcUgiLCJjbGllbnRfaWQiOiI1MG80bXNhYzc3cDVua2E3aGJjanF2dnEzNiIsIm9yaWdpbl9qdGkiOiJhNDlmMzM3MS1jZTMyLTQzMzYtODhkYi0yNjA5OWQ3MWFmOTkiLCJldmVudF9pZCI6IjU4NzBiZTM4LTRhM2ItNGMyNi1hOGFkLTNkZWU5ODE5MzFhZCIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NTcxNTQ2MTAsImV4cCI6MTc1NzE1ODIxMCwiaWF0IjoxNzU3MTU0NjEwLCJqdGkiOiIyNTMxNTlhYi02Mzg1LTRlMTktYWNiNS02YmViOGE4ZGUxZTEiLCJ1c2VybmFtZSI6Ijk0ZTgyNGY4LTUwMjEtNzAzOC01NjQyLTE2MDRmMDViMTZhNiJ9.eo7JOUIVTu0uT-ucrQWHG_sNXv2kX8Yom4Jy5Zg9DhBAyY-oSantJ5o4TTCJXrpunwnlXSLvJ3B56Ex8CvT00s8qv3zqsv8b4CltGqsmHOvA2te4MFWQySjc7oFAKDvwGeeWZv6hiG2exL3cPfLrNOSNrz9z1qqLdQUfYMUVAWoAUwy6-Roe-c2MZufDc-GWAZXfdi-lbmkgQIYEUnpuBDNjZNAajxYm5TLoFRUAPW1pp2EF8Ms3VDEL_RtiQrb8-dV-VDwkxltkebDO2peuJc6mZmZTE2c5PnIbGN-QU6yhUiB8ZGnyQRZHjSsQy6Edt-CnRshhRbu67RirtmLqfw',
    [`CognitoIdentityServiceProvider.${clientId}.${username}.refreshToken`]: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.tj3KzluyW7XlPLW4v3RS8j_v7GaWLwOyCxrdVvfsCMCP11mcUkrJYokIXs_9AxTJRgF4H08-5isXpzrYQi-jZs-kKuzSpTEgBN1LycE1GB99Jpr7OqZh-ikDYbkAGkbrIFxy6t0nsI_gZ9K8e6-_0qLdukmrd47G_tcD7FYkGvD90fX_p9nH39dJ43nELateu4k7o3f1eftdWFvXs1FfX8OhUr1j-kUWgbORCNSXHeyyRy-00eebrUt5AUMl3gJ8rUUNSw_-LBk0js7_VGtmhHkE6Hb4w4Att8P5BnRKJo0ZH91gSTFKi-NxI8Hkxw0O9t1VV4sflMStWtCOFYOgjA.ruh8vSeTTgkm8Efw.sKqAO-NBallYeslxK2GfLoxCYae0sB8UULrdcGHjCK_oXHqjqQPe8kB_h9M89BuVFoPCZgH5kxmNxy69mqCk13GzmKp0V4sRNqLpofR50RICw10OyAcJVwi4GIV0PU_mYIbvewHulSHvQiaipveHi8giuen9Tdo4cLn9F1u6q4QMhke_2bV7CONGe9DiYD4Yn6yJBwuy7MGGzbR3818KtbZ-FLTcOE-BYQcMy0ocImKpmISAhlWApCtTso7UXgUnpLJZvq-LQ3XCTypwIeg3qr9KwF_NEvOBqjabYCQ0O6sUv8u2lqJYtXu14Qr5cHYfdSbZ6prx418tE3paFQkxiTql8k3PKXYU7qKuwlmVzU55aEDmmVf--If8QPpCq7qEf8bmlfI5WduJ1g5XzBbkibKZECWQDzAN75dlI92R4LosKDjOek7D9fGTeHbA7FSrHcsYF-k8tD8WJE3xvZqzMPhs6D_GulIbL3oxUWDOOvRUFIoBIjKAsjsAf5iSLG4q9rIYhlMdswKCQ_49Izjq-IyCiOwRI6ktC2XVYet0UX0vwvjQWL_s5Znz2hpLx_RNXubBqn3aE5Bw3FGcd91a3jxgXo09LS9FWbxnP9GHX0voVfWjq8EnVmUOFNjsvFH97DxQ-3M-6RyeXv_CIv4uWOYbMwybVMKYFfpDmCY613d7i-ReGysz3k-nLdOYUr2xj7QkCdkWq80wPP9BErCofueJItDGchrpYm7ByfemIQOuSP1j1rEERG1MFksv4FsymceyhBphM2hp3EZsM_gkWDNEQflHj9QIH9UOIm0kw57XpkAl-NhpJvIONuSvkTHgRI3BhgwVm-FrP2iTiyZfpyLc6V8WWEaBebhgAMqZDuP-A4FiElBpXueUa5h5jmy9bcmet7kZaT4fvlbMSE_ys-b8BdPlE_oz-L0JGt6fuTkmmN8P2vArzS-QJpszJpv2y8-RCXn1RvOw7q3Ecb0mwMYW7X32H3OuT6-Zsc2D_DWJfhqQxGEATelQIjKot8EXPUDSUjeh6YxcS6c4wfBttZDg00CvBGKP3WZh69fnVDHbj5V0riIsgtqnvqImt2s5UaeICSD3MiCnkmZzwK7Xi_8lDGu49XwqZK83bkz6ngArCEP1qoYgPp8hhhEe22EKvroMKcNFhFM13amTEIh2XtIJJqw9yKzTlul8oJPdCtUe3f4-hgVgCtye_Z8qr6q_MuCSJomzp01nONsjDJq7lr7Lcbmgg3RwCO9KW6tczQwA6cAxoIufFVh5mYyvDEuKcJsff3bPV67HngO0bkJapZ_austX9HuamxchgpIF7RYRybiWd7146U9Qsg.Sd7xapqrRbxYA2HlYh4fPw'
  };

  try {
    // First, set tokens using CognitoStorage to update both AsyncStorage and in-memory cache
    console.log('Setting tokens to CognitoStorage...');
    Object.entries(realTokens).forEach(([key, value]) => {
      console.log('Setting:', key);
      CognitoStorage.setItem(key, value);
    });

    // Force reload the data to make sure it's in memory
    console.log('Force reloading CognitoStorage...');
    await CognitoStorage.loadDataToMemory();

    // Verify the tokens were set correctly
    const clientId = '50o4msac77p5nka7hbcjqvvq36';
    const username = 'xtomerx003@gmail.com';
    const lastAuthUser = CognitoStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
    const idToken = CognitoStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.${username}.idToken`);
    
    console.log('Verification - LastAuthUser:', lastAuthUser);
    console.log('Verification - ID Token exists:', !!idToken);

    // Check token expiration
    if (idToken) {
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now > exp;
        const expiresAt = new Date(exp * 1000);
        
        console.log('Token expires at:', expiresAt.toLocaleString());
        console.log('Token is expired:', isExpired);
        console.log('Current time:', new Date().toLocaleString());
        
        if (isExpired) {
          console.warn('⚠️ WARNING: Token is expired! You need fresh tokens.');
        }
      } catch (e) {
        console.error('Could not decode token:', e);
      }
    }

    if (!lastAuthUser || !idToken) {
      throw new Error('Tokens were not set properly');
    }

    console.log('✅ SUCCESS! Your real tokens are now set!');
    console.log('You are now authenticated as: Tomer Cohen (xtomerx003@gmail.com)');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting tokens:', error);
    return false;
  }
};