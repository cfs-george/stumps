import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged, sendEmailVerification
} from "firebase/auth";
import { auth } from "./firebase.js";


// Get auth state
const useAuthState = () => {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      resolve(user);
    }, (error) => {
      reject(error);
    });
  });
};


// Sign Up
const signUp = async (email, password, name, actionCodeSettings) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, {
      displayName: name,
    });
    await sendEmailVerification(user, actionCodeSettings || null);
    // console.log("User signed up successfully, verification email sent!");
    return null;
  } catch (error) {
    console.error("Error signing up user:", error);
    const errorMessage = handleError(error, 'signUp');
    return errorMessage;
  }
};


// Sign In
const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // console.log("User logged in successfully!");
    return null;
  } catch (error) {
    console.error("Error signing in user:", error);
    const errorMessage = handleError(error, 'login');
    return errorMessage;
  }
};


// Log Out
const signOutUser = async () => {
  try {
    await signOut(auth);
    // console.log("User signed out successfully!");
  } catch (error) {
    console.error("Error signing out user:", error);
    handleError(error, 'logout');
  }
};


// Error handling
function handleError(error, type) {
  if (error instanceof Error) {
    const errorCode = error.code;
    let errorMessage = "";
    switch (type) {
      case 'signUp':
        switch (errorCode) {
          case "auth/invalid-email":
            errorMessage = "Invalid email address";
            break;
          case "auth/missing-password":
            errorMessage = "You must enter a password";
            break;
          case "auth/weak-password":
            errorMessage = "Your password must be at least 6 characters long";
            break;
          case "auth/invalid-credential":
            errorMessage = "Incorrect email & password combination";
            break;
          case "auth/email-already-in-use":
            errorMessage = "You already have an account";
            break;
          default:
            errorMessage = "An unknown error occurred";
            break;
        }
        break;
      case 'login':
        switch (errorCode) {
          case "auth/invalid-email":
            errorMessage = "Invalid email address";
            break;
          case "auth/missing-password":
            errorMessage = "You must enter a password";
            break;
          case "auth/invalid-credential":
            errorMessage = "Incorrect email & password combination";
            break;
          case "auth/user-not-found":
            errorMessage = "User not found";
            break;
          case "auth/email-already-in-use":
            errorMessage = "Incorrect password";
            break;
          default:
            errorMessage = "An unknown error occurred";
            break;
        }
        break;
      case 'logout':
        switch (errorCode) {
          case "auth/user-disabled":
            errorMessage = "Your account has been disabled";
            break;
          case "auth/requires-recent-login":
            errorMessage = "You must sign in recently to perform this action";
            break;
          default:
            errorMessage = "An unknown error occurred";
            break;
        }
        break;
      default:
        console.error("Unknown error from auth:", error);
        // You can display a generic error message to the user here
        // errorMessage = "An unknown error occurred.";
        break;
    }
    console.error("errorMessage value:", errorMessage);
    return errorMessage;
    // You can display the error message to the user here
    // errorMessage = "An unknown error occurred.";
  }
}

export { signUp, signIn, signOutUser, handleError, useAuthState };