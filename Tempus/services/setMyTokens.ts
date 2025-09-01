// utils/setMyTokens.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CognitoStorage } from '../utils/CognitoStorage';

export const setMyRealTokens = async () => {
  const clientId = '50o4msac77p5nka7hbcjqvvq36';
  const username = 'xtomerx003@gmail.com';
  
  // Your actual tokens
  const realTokens = {
    [`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`]: username,
    [`CognitoIdentityServiceProvider.${clientId}.${username}.idToken`]: 'eyJraWQiOiJVUTFveGdSVWh5VTU3bXd6Y3U4eHZUZnRRdVlWRVFlVmMrZjZyT2ZSUTE4PSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI5NGU4MjRmOC01MDIxLTcwMzgtNTY0Mi0xNjA0ZjA1YjE2YTYiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfWWI0Y3dYbXFIIiwiY29nbml0bzp1c2VybmFtZSI6Ijk0ZTgyNGY4LTUwMjEtNzAzOC01NjQyLTE2MDRmMDViMTZhNiIsIm9yaWdpbl9qdGkiOiJkZjZiMTRkNi03YWQwLTQ2ODEtODJiNi0yYmU3ZDc0MDM5NTQiLCJhdWQiOiI1MG80bXNhYzc3cDVua2E3aGJjanF2dnEzNiIsImV2ZW50X2lkIjoiZmIzZWQ3YWItZDEwNi00MDU5LTkwM2UtYmE0ZDkxZTI1NDJhIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NTY1NTc4ODcsIm5hbWUiOiJUb21lciBjb2hlbiIsImV4cCI6MTc1NjU2MTQ4NywiaWF0IjoxNzU2NTU3ODg3LCJqdGkiOiIwZGE1ZDFjMC1hNzU5LTQ1YzMtOWQxNi05YmRmYTQ5ZTY0MGIiLCJlbWFpbCI6Inh0b21lcngwMDNAZ21haWwuY29tIn0.MQLvd4wkhOJIbYrVq7-IR4OtK_u4ELLWlsARkryhqIC2p3CFrqz6DYQ-SnCTXQHl0CSIKvuwXaj78gMfs6TrB3skUXdPQV2bzWCQOyINsD07w7o7AzUPjdW2BDBPZ-prX46yA3MfwPqlQZAojNy28ULwABm0MbOZ1ztSFlvzMTYHtXES5ueMLcUo1U8XVbyY0CNTXpTgjiYiqMJ0MJ7NJVG2GRaUCxxzlHZSgV3j3nv27SfOLn1wH1-hPlBQmXjJOWimr0pwLwMyHDizpIGV0fdbc8CdWafR1YoPlzMhSnlU3Lr_iiw1wUH5Df-_7VoYeqfh0lwopNtxiNa1XlI8-g',
    [`CognitoIdentityServiceProvider.${clientId}.${username}.accessToken`]: 'eyJraWQiOiJubFpnQUxsc3J4XC9IR05kSWVPZ0lOV1JcL0dDbmEwK0JRUUhCcU5uQzNUZkU9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI5NGU4MjRmOC01MDIxLTcwMzgtNTY0Mi0xNjA0ZjA1YjE2YTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9ZYjRjd1htcUgiLCJjbGllbnRfaWQiOiI1MG80bXNhYzc3cDVua2E3aGJjanF2dnEzNiIsIm9yaWdpbl9qdGkiOiJkZjZiMTRkNi03YWQwLTQ2ODEtODJiNi0yYmU3ZDc0MDM5NTQiLCJldmVudF9pZCI6ImZiM2VkN2FiLWQxMDYtNDA1OS05MDNlLWJhNGQ5MWUyNTQyYSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NTY1NTc4ODcsImV4cCI6MTc1NjU2MTQ4NywiaWF0IjoxNzU2NTU3ODg3LCJqdGkiOiI0YzhhOWYwMC1jMDQwLTRjODUtOTAzZS0yMmY3NDEwNjZhMmMiLCJ1c2VybmFtZSI6Ijk0ZTgyNGY4LTUwMjEtNzAzOC01NjQyLTE2MDRmMDViMTZhNiJ9.SwwZ5Vu2rYuNJeAIiqp9acqqceKAZP-DBpLtVkFdMuF6p2e-he1NdugK1Y0m6BDI9vP3v5sHKqh2idj2QLpWMH_E8jvnl6d6CWuAXFkEqXcnbOhcXhJfYXwFzR-0z_6uO3-BtR_G0829gQufeuEGM_l9Kjbsl8MMZ3ZzFLGp_UpU2e_8kobNm6UBc0zEIAjeZLG7Y4DKy-3RYhJg1VG0d9PGU38bFmMVi-9L-qY78hFhRR_WPcr5uhj9hTJwsTNnPWigF7ryRdcBynsaifB-sYBIbZ5Dfl9ryP2O0RCJINoJhQyzLhRYzri7lt9VzhWDNPSTOkZNYkL0m6wWG1NGnA',
    [`CognitoIdentityServiceProvider.${clientId}.${username}.refreshToken`]: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.h1Sfa8aTqSgJGq5hq1zctkjz3PTB-nbRyVWvlQ9pF1Fgix7HZxUF6PV4V9Z-V3a9tVEn_TV_vFEO7Ss3OfILFlw-C8cLruM-Vd4NY-y7HOTXOLll1Q05X6Qk4iaKLJ1qpF6Kc2_17cYxQ09Bdh0wtcJB-bycsBDwOndF8X4wouhah3jIL4BzJXsYLLme50Ld9WNrVqYYHIHdHJEwE1u4KEOU2D-IS9faSUgECnfmh4CIH0K3ruhPk7H5a4uJ5euWAIMe5Vj5HeU5w6uZB5gpOPGRd-eY1ZqPsxKWkvn-S1G2wg7ZrTFQO1pcPjailorKHrGdcCLCPyXXE1ZW2NrQCQ.4-JJPtVnYoUoVdya.S8DJ4bNfZtS0yI2c70SMGAy8okFO39-lw9SBImen5CupUgxCYi2e9bYx48cekNr92ueYgCxVCotxRJKAhythA5hu04CGpnVMkyP_YbJo_Hzl9QtNzQC7e2huaSSwMNtRLO7jQ4RIMUlXB2RK2eNydB8YNuy2sOBPELoVhw9h0puagc-x6OWMeeVDwTOFwEioHAzjD4Y3SFVpz3EaKLbihpgXIdOqPXyu__X_BEMnZuhlZdT-dw9F5qoMfVwf6GUDSPy7Qdq8x9LnE1C33xyG3I0P3K7x68-cQ9xl-AXbZ0a4k0Hd-ScGRCEXSBR7f0uwMfFxSZP0enpa6KlwWsc1p8JlltWALJoJawEx_de-76u_XsUseZZjIxNsYGsT56RCwHCDjUE75p7g895YWNftcq4R9Z3nKLzaPl7mFE10zvZrbqMV9LsmwI1_JF73e1yk6NCRBB0e5JJYpDIF-wGtCLyZkmE0SoLXF6MFVuD2ErL2olsUT-TfpJqiHMbxXtrkHnkKx5n0JnzHz2I_PWWns9JDoDtAA-nLjM0kV00OiaF1UDl8evHYHKt3QGqp7Lae96hZgtuBylXwS346MBdiaecUha5uzhQFhByl43Fd9X8TWdTpqikwTUrkZ78WDCAiaeOJNwwUiQkqEgcOirwhDDR0j4fgWtRcWBTURuCqO73fkGtBEaH1X2g2WQtNnhViZkd9xkzvWjVz2MGFuhINu5I11AOwCa6pVG3XGuwhqrC6HALXYFmCK4nId3fh67uEbSpyk9wP2CpXW5BZG2ILcwKyFpPSgeuvoxTVzC0GCIxxBslegiqDxyg70zscTOlb4u7SkFrxmZyi-VzHHDVEJ0jVN01SW7r1p7w2zYTwko7bbNkC9TjxLgq8X6t-LX8sp86X6WY9f5p-KGP28RKwLy0HSRCS_vnc-Qln04rkOM-iT1RRQ90zP5ujbBBrtAKGrpdWLZ3ttBJRyYBvSi7AOvsd2bhR3n6ahlNyu_mEqXRd90Embs2QdSdSJVP0CUazpQXEIPCDx9nS7AgZbu3K9IqEHLbTa_H9QSYBAg41I6k86u6rrXxLrX_GPFcMMr_oqcfq5UmbZCy7TheRqneQAWIbbdvC8FzsfOQNamy_nXGd-H17WCjXlfO7XPA6bWdYTJBKQGT0gGym9mOqKETKR_swKYR1vPj1NP4TmxePeFLC1nsa85X-zGav2jAlmFwzTz8MQHceenaB9wWGfOkyi---ygntFUANOfnsiH9oCAyg1DvUZQjRII1Qd5n_R2qysuoKTd7jv_jPAKwYCT6EY3Oti2ApfdC6Vsr-Oh98tq0PqQpqd0h4OZszJg.5AlKnWV-IlEzM8zy_a_JaA'
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