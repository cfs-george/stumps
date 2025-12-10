/*
 * Name:          stumps_server.js
 * Author:        George Lomas
 * Date:          09-12-2025
 * Purpose:       Stumps web server
 * Run command:   cd Stumps; npm run start
*/

import express from 'express';
import path from 'path';

import dotenv from 'dotenv';
import session from 'express-session';
import { Redis } from '@upstash/redis';
import { RedisStore } from 'connect-redis';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import axios from 'axios';

dotenv.config({ path: 'stumps.env' });
const port = process.env.PORT;

import { signUp, signIn, signOutUser, useAuthState } from './auth.js';
import { sendEmailVerification } from "firebase/auth";

import { get, getDatabase, ref, set, update, remove, query, orderByChild, equalTo, runTransaction } from 'firebase/database';
const db = getDatabase();

import { adminDb, adminMain } from './firebase_admin.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { parse } from 'json2csv';
import fs from 'fs';


const app = express();
app.use((req, res, next) => {
  if (req.path === '/api/webhook') {
    next(); // Skip express.json() for /api/webhook
  } else {
    express.json()(req, res, next); // Use express.json() for all other routes
  }
});

import Stripe from 'stripe';
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
// const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_KEY;
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY_TEST);
// const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_KEY_TEST;


import nodemailer from 'nodemailer';
const emailSecret = process.env.EMAIL_SECRET;
const passwordSecret = process.env.PASSWORD_SECRET;
const emailGeorge = process.env.EMAIL_GEORGE;

import moment from 'moment';

import shortUuid from 'short-uuid';
import cron from 'node-cron';
import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';


// Set up the view engine
app.set('view engine', 'ejs');

const __dirname = dirname(fileURLToPath(import.meta.url));
app.set('views', path.join(__dirname, 'views'));

// Set the MIME type for JavaScript files
app.use(express.static('stumps', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set("Content-Type", "application/javascript");
    }
  }
}));


// Use cookieParse middleware
app.use(cookieParser());


// CSRF middleware
const csrfProtection = csrf({ cookie: true });


// Helmet middleware
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://www.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        (req, res) => `'nonce-${res.locals.nonce}'`
      ],
      styleSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com",
        "data:"
      ],
      connectSrc: [
        "'self'",
        "https://*.firebaseio.com",
        "https://identitytoolkit.googleapis.com",
        "https://*.google-analytics.com",
        "https://www.googletagmanager.com",
        "https://region1.google-analytics.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    },
  })
);

// Allow images to be accessed from different domains
app.use(cors({
  origin: '*', // Allow all origins (email clients)
  methods: ['GET'], // Allow GET for image fetching
}));


// Initialize Redis
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN,
// });
// redis.ping().catch((err) => console.error('Redis ping error:', err));


// Session middleware
app.use(
  session({
    // store: new RedisStore({
    //   client: redis,
    //   prefix: 'stumps_session:',
    // }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);


// Serve files
app.use(express.static(path.join(__dirname, 'images')));
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));
app.use('/styles', express.static(path.join(__dirname, 'styles'), {
  setHeaders: (res, path) => {
    res.set("Content-Type", "text/css");
  }
}));
app.use('/scripts', express.static(path.join(__dirname, 'scripts'), {
  setHeaders: (res, path) => {
    res.set("Content-Type", "application/javascript");
  }
}));




// Define routes to render pages
app.get('/', csrfProtection, async (req, res) => {
  res.render('index', {
    stumps_circle_dark: '/stumps_circle_dark.png',
    stumps_circle_light: '/stumps_circle_light.png',
    stumps_logo_full: '/stumps_logo_full.png',
    favicon: '/stumps_logo_small.png',
    victory: '/victory.png',
    csrfToken: req.csrfToken()
  });
});


// app.get('/payment', csrfProtection, async (req, res) => {
//   try {
//     const user = await useAuthState();
//     if (!user) return res.redirect('/');
//     const userId = user.uid;
//     const employerName = (await get(ref(db, `employers/${userId}/companyName`))).val();
//     res.render('mm_payment', {
//       logo: '/full-logo-white-high-res.png',
//       logo_head: '/mm_logo_new.png',
//       favicon_new: '/favicon_browser_high_res.png',
//       employerName,
//       csrfToken: req.csrfToken()
//     });
//   } catch (error) {
//     console.error('Error fetching user data:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });


// app.get('/account', csrfProtection, requirePaidOrTrial, async (req, res) => {
//   try {
//     const user = await useAuthState();
//     if (!user) return res.redirect('/');
//     const userId = user.uid;

//     const employerName = (await get(ref(db, `employers/${userId}/companyName`))).val();
//     const claimRecipient = (await get(ref(db, `employers/${userId}/claimRecipient`))).val();
//     const accnum = (await get(ref(db, `employers/${userId}/accnum`))).val();
//     const verified = (await get(ref(db, `employers/${userId}/verified`))).val();
//     const freq = (await get(ref(db, `employers/${userId}/stripeDetails/frequency`))).val() || "monthly";

//     const numEmployeesRef = ref(db, `employers/${userId}/numEmployees`);
//     let numEmployees = (await get(numEmployeesRef)).val();
//     if (numEmployees == null) {
//       numEmployees = 0;
//     }

//     const paid = (await get(ref(db, `employers/${userId}/paid`))).val();
//     let remainingDays;
//     if (paid) {
//       remainingDays = "none";
//     } else {
//       const trialStart = (await get(ref(db, `employers/${userId}/trialStart`))).val();
//       const now = Date.now();
//       const trialLength = 30 * 24 * 60 * 60 * 1000;
//       const trialEnd = trialStart + trialLength;
//       const remainingMs = trialEnd - now;
//       remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
//       if (remainingDays < 0) remainingDays = 0;
//     }

//     res.render('mm_account', {
//       logo: '/full-logo-white-high-res.png',
//       logo_head: '/mm_logo_new.png',
//       favicon_new: '/favicon_browser_high_res.png',
//       employerName,
//       claimRecipient,
//       accnum,
//       numEmployees,
//       hmrcRates,
//       rateDefinitions,
//       verified,
//       freq,
//       remainingDays,
//       csrfToken: req.csrfToken()
//     });

//     if (req.query.session_id) {
//       const session = await stripe.checkout.sessions.retrieve(
//         req.query.session_id, 
//         { expand: ['subscription'] }
//       );
//       const stripeSubscriptionId = session.subscription.id;
//       try {
//         await set(ref(db, `employers/${userId}/stripeSubscriptionId`), stripeSubscriptionId);
//       } catch (error) {
//         console.error(`Error writing stripeSubscriptionId to database: ${error}`);
//       }
//     }
//   } catch (error) {
//     console.error('Error fetching user data:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });





// app.get('/verify', async (req, res) => {
//   const { token, continueUrl, mode, oobCode } = req.query;

//   // Handle Firebase password reset
//   if (mode === 'resetPassword') {
//     res.render('mm_verify', {
//       logo: '/full-logo-white-high-res.png',
//       logo_head: '/mm_logo_new.png',
//       favicon_new: '/favicon_browser_high_res.png',
//       API_KEY: process.env.API_KEY,
//       AUTH_DOMAIN: process.env.AUTH_DOMAIN,
//       mode: mode,
//       message: ''
//     });
//     return;
//   }

//   // Handle custom token verification for employers/users
//   let verificationToken = token;
//   if (!verificationToken && continueUrl) {
//     try {
//       const url = new URL(continueUrl);
//       verificationToken = url.searchParams.get('token');
//     } catch (error) {
//       console.error('Error parsing continueUrl:', error);
//     }
//   }

//   if (!verificationToken) {
//     res.render('mm_verify', {
//       logo: '/full-logo-white-high-res.png',
//       logo_head: '/mm_logo_new.png',
//       favicon_new: '/favicon_browser_high_res.png',
//       mode: mode || '',
//       message: 'Invalid or missing verification code.'
//     });
//     return;
//   }

//   try {
//     let type, snapshot;
//     // Check employers first
//     const employersRef = adminDb.ref('employers');
//     const employerSnapshot = await employersRef.orderByChild('verificationToken').equalTo(verificationToken).once('value');
//     if (employerSnapshot.exists()) {
//       type = 'employer';
//       snapshot = employerSnapshot;
//     } else {
//       // Check users if not found in employers
//       const usersRef = adminDb.ref('users');
//       const userSnapshot = await usersRef.orderByChild('verificationToken').equalTo(verificationToken).once('value');
//       if (userSnapshot.exists()) {
//         type = 'user';
//         snapshot = userSnapshot;
//       }
//     }

//     if (snapshot) {
//       const [uid, data] = Object.entries(snapshot.val())[0];
//       if (data.tokenExpiration < Date.now()) {
//         res.render('mm_verify', {
//           message: 'Verification link has expired. Please request a new one from your dashboard.',
//           logo: '/full-logo-white-high-res.png',
//           logo_head: '/mm_logo_new.png',
//           favicon_new: '/favicon_browser_high_res.png',
//           mode: mode || '',
//           API_KEY: process.env.API_KEY,
//           AUTH_DOMAIN: process.env.AUTH_DOMAIN
//         });
//         return;
//       }

//       // Update verified status and clear token
//       const ref = adminDb.ref(`${type}s/${uid}`);
//       await ref.update({
//         verified: true,
//         verificationToken: null,
//         tokenExpiration: null,
//       });

//       res.render('mm_verify', {
//         message: 'Email verified successfully! You can now close this window.',
//         logo: '/full-logo-white-high-res.png',
//         logo_head: '/mm_logo_new.png',
//         favicon_new: '/favicon_browser_high_res.png',
//         mode: mode || '',
//         API_KEY: process.env.API_KEY,
//         AUTH_DOMAIN: process.env.AUTH_DOMAIN
//       });
//       return;
//     } else {
//       res.render('mm_verify', {
//         message: 'Invalid or expired verification link. Please request a new one from your dashboard.',
//         logo: '/full-logo-white-high-res.png',
//         logo_head: '/mm_logo_new.png',
//         favicon_new: '/favicon_browser_high_res.png',
//         mode: mode || '',
//         API_KEY: process.env.API_KEY,
//         AUTH_DOMAIN: process.env.AUTH_DOMAIN
//       });
//       return;
//     }
//   } catch (error) {
//     console.error('Error verifying email with token:', error);
//     res.render('mm_verify', {
//       message: 'An error occurred during verification. Please try again.',
//       logo: '/full-logo-white-high-res.png',
//       logo_head: '/mm_logo_new.png',
//       favicon_new: '/favicon_browser_high_res.png',
//       mode: mode || '',
//       API_KEY: process.env.API_KEY,
//       AUTH_DOMAIN: process.env.AUTH_DOMAIN
//     });
//     return;
//   }
// });





// Sign up
// app.post('/api/signup', csrfProtection, async (req, res) => {
//   const { email, password, companyName, referral } = req.body;

//   // Sanitization regex to prevent XSS (disallow <, >, ;, and other dangerous characters)
//   const xssRegex = /[<>;]/;
//   const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//   const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+=-]{10,}$/;
//   const companyNameRegex = /^[a-zA-Z0-9\s&.,'-]{1,100}$/;
  
//   // Validate inputs
//   if (!email || !password || !companyName) {
//     return res.status(400).send('Missing required fields');
//   }
  
//   if (xssRegex.test(email) || xssRegex.test(password) || xssRegex.test(companyName) || (referral && xssRegex.test(referral))) {
//     return res.status(400).send('Invalid characters detected');
//   }
  
//   if (!emailRegex.test(email)) {
//     return res.status(400).send('Invalid email format');
//   }
  
//   if (!passwordRegex.test(password)) {
//     return res.status(400).send('Password must be at least 10 characters and contain only letters, numbers, or allowed special characters');
//   }
  
//   if (!companyNameRegex.test(companyName)) {
//     return res.status(400).send('Invalid company name');
//   }
  
//   if (referral && !emailRegex.test(referral)) {
//     return res.status(400).send('Invalid referral email format');
//   }

//   try {
//     const verificationToken = shortUuid.generate();
//     const actionCodeSettings = {
//       url: `${process.env.SERVER_URL}/verify?token=${verificationToken}`,
//       handleCodeInApp: true,
//       continueUrl: `${process.env.SERVER_URL}/verify?token=${verificationToken}`
//     };

//     const errorMessage = await signUp(email, password, companyName, actionCodeSettings);
//     if (errorMessage) {
//       res.send(errorMessage);
//     } else {
//       const user = await useAuthState();
//       const accnum = convertCodeToNumbers(user.uid);
//       const employerId = user.uid;

//       // Write to employers node
//       const employerRef = ref(db, 'employers/' + employerId);
//       await set(employerRef, {
//         email,
//         companyName,
//         claimRecipient: email,
//         paid: false,
//         trialStart: Date.now(),
//         platform: "web",
//         accnum,
//         verified: false,
//         verificationToken,
//         tokenExpiration: Date.now() + 7 * 24 * 60 * 60 * 1000,
//         employees: {
//           [employerId]: {
//             active: true,
//             employeeEmail: email,
//             employeeName: 'Director',
//             director: true
//           }
//         }
//       });

//       // Write to users node
//       const userRef = ref(db, 'users/' + employerId);
//       const name = 'Director';
//       await set(userRef, {
//         email,
//         employers: {
//           [employerId]: {
//             email,
//             companyName,
//             frozen: false
//           }
//         },
//         name,
//         platform: "director",
//       });

//       // Write employerId to referrers node under referral email
//       if (referral) {
//         const sanitizedReferral = referral.replace(/\./g, '_');
//         const referrerRef = ref(adminDb, `referrers/${sanitizedReferral}`);

//         await update(referrerRef, {
//           [`employerUids/${employerId}`]: true
//         });
//       }

//       req.session.regenerate((err) => {
//         if (err) console.error(err);
//         res.json({ redirect: '/account' });
//       });

//       beginnerEmail(email, companyName);
//       infoEmail(companyName + ' just signed up using ' + email + '.');
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error creating user');
//   }
// });



// // Helper function to generate account number
// function convertCodeToNumbers(code) {
//   const letterMap = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11, l: 12, m: 13, n: 14, o: 15, p: 16, q: 17, r: 18, s: 19, t: 20, u: 21, v: 22, w: 23, x: 24, y: 25, z: 26 };
//   let result = '';
  
//   for (let char of code.toLowerCase()) {
//     if (/\d/.test(char)) {
//       result += char;
//     } else if (letterMap[char]) {
//       result += letterMap[char];
//     }
//     if (result.length >= 6) break;
//   }
  
//   return result.slice(0, 6);
// }



// // Login
// app.post('/api/login', csrfProtection, async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const errorMessage = await signIn(email, password);
//     if (errorMessage) {
//       res.set('Content-Type', 'text/plain').status(400).send(errorMessage);
//     } else {
//       const user = await useAuthState();
//       const employerRef = ref(db, `employers/${user.uid}`);
//       const snapshot = await get(employerRef);

//       if (!snapshot.exists()) {
//         await signOutUser(auth);
//         return res.set('Content-Type', 'text/plain').status(404).send('Employer not found');
//       }

//       const employerData = snapshot.val();

//       if (employerData.closed) {
//         await signOutUser(auth);
//         return res.set('Content-Type', 'text/plain').status(403).send(
//           'Your account has been suspended due to an unpaid invoice for more than 7 days. Please check your inbox/junk for emails off us with more information.'
//         );
//       }

//       if (employerData.platform !== 'web') {
//         await signOutUser(auth);
//         return res.set('Content-Type', 'text/plain').status(403).send('Access to web app restricted');
//       }

//       const now = Date.now();
//       const trialStart = employerData.trialStart || 0;
//       const trialExpired = now > trialStart + 30 * 24 * 60 * 60 * 1000;

//       if (employerData.paid || !trialExpired) {
//         req.session.regenerate((err) => {
//           if (err) console.error(err);
//           res.json({ redirect: '/account' });
//         });
//       } else {
//         req.session.regenerate((err) => {
//           if (err) console.error(err);
//           res.json({ redirect: '/payment' });
//         });
//       }
//     }
//   } catch (error) {
//     console.error('Login error:', error);
//     res.set('Content-Type', 'text/plain').status(500).send('Error logging in');
//   }
// });



// // Logout
// app.post('/api/logout', csrfProtection, async (req, res) => {
//   try {
//     await signOutUser();
//     res.json({ redirect: '/' });
//   } catch (error) {
//     res.status(400).json({ error });
//   }
// });



// // Resend verification email
// app.post('/api/resend', csrfProtection, async (req, res) => {
//   try {
//     const user = await useAuthState();

//     if (!user) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const verificationToken = shortUuid.generate();
//     const tokenExpiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
//     const actionCodeSettings = {
//       url: `${process.env.SERVER_URL}/verify?token=${verificationToken}`,
//       handleCodeInApp: true,
//       continueUrl: `${process.env.SERVER_URL}/verify?token=${verificationToken}`
//     };

//     await sendEmailVerification(user, actionCodeSettings);

//     const verificationTokenRef = ref(adminDb, `employers/${user.uid}/verificationToken`);
//     await set(verificationTokenRef, verificationToken);
//     const tokenExpirationRef = ref(adminDb, `employers/${user.uid}/tokenExpiration`);
//     await set(tokenExpirationRef, tokenExpiration);
    
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error resending verification email:', error);
//     res.status(500).json({ error: 'Failed to resend verification email' });
//   }
// });



// // Reset password
// app.post('/api/reset-password', async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) {
//       return res.status(400).json({ error: 'Email is required' });
//     }

//     const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ error: 'Invalid email address' });
//     }

//     // Get user UID from Firebase Auth
//     let user;
//     try {
//       user = await adminMain.auth().getUserByEmail(email);
//     } catch (error) {
//       if (error.code === 'auth/user-not-found') {
//         infoEmail('The following email address requested a password reset but the account does not exist: ' + email);
//         return res.status(400).json({ error: 'No account found with this email' });
//       }
//       throw error;
//     }

//     // Check platform in employers/ and fetch company name
//     const employersRef = adminDb.ref('employers');
//     const employerSnapshot = await employersRef.orderByChild('email').equalTo(email).once('value');

//     let platformValid = false;
//     let companyName = null;

//     employerSnapshot.forEach((child) => {
//       if (child.val().platform === 'web' && child.key === user.uid) {
//         platformValid = true;
//         companyName = child.val().companyName || null;
//         return true;
//       }
//     });

//     if (!platformValid) {
//       infoEmail('The following email address requested a password reset from the website but is not a website user: ' + email);
//       return res.status(400).json({ error: 'No account found with this email' });
//     }


//     const actionCodeSettings = {
//       url: `${process.env.SERVER_URL}/verify`,
//       handleCodeInApp: true,
//       continueUrl: `${process.env.SERVER_URL}/verify`
//     };

//     const resetLink = await adminMain.auth().generatePasswordResetLink(email, actionCodeSettings);

//     const mailOptions = {
//     from: emailJack,
//     to: email,
//     subject: 'MileageMonster password reset',
//     html: `<!DOCTYPE html>
//       <html>
//       <head>
//         <meta charset="utf-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <meta name="color-scheme" content="dark">
//         <meta name="supported-color-schemes" content="dark">
//         <title>Password Reset</title>
//       </head>
//       <body style="margin: 0; padding: 0; background-color: #222222;">
//         <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #222222;">
//           <tr>
//             <td style="padding: 20px;">
//               <!-- Content container -->
//               <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #222222;">
//                 <tr>
//                   <td style="padding: 20px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 24px;">
//                     <span style="color: #ffffff;">Hi ${companyName || 'there'},</span><br><br>
//                     <span style="color: #ffffff;">Click the link below to reset your MileageMonster password:</span><br><br>
//                     <a href="${resetLink}" style="display: inline-block; background-color: #333333; border-radius: 10px; color: #cc66ff; padding: 10px; margin-left: 10px; text-decoration: none; font-weight: bold;">Reset password</a>
//                     <br><br>
//                     <span style="color: #ffffff;">If you didn’t request to reset your password, please ignore this email and notify our team.</span><br><br>
//                     <span style="color: #ffffff;">Thank you,</span><br>
//                     <span style="color: #ffffff;">MileageMonster</span>
//                   </td>
//                 </tr>
//               </table>
//               <!-- Footer with logo -->
//               <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #222222;">
//                 <tr>
//                   <td style="padding: 10px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">
//                     <div style="display: inline-block; background-color: #222222; padding: 5px;">
//                       <img
//                         src="${process.env.SERVER_URL}/full-logo-white-high-res.png"
//                         alt="MileageMonster Logo"
//                         style="max-width: 150px; height: auto; display: block;"
//                       >
//                     </div>
//                   </td>
//                 </tr>
//               </table>
//             </td>
//           </tr>
//         </table>
//       </body>
//       </html>`
//   };


//     await transporter.sendMail(mailOptions);

//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error sending password reset email:', error);
//     let errorMessage = 'Failed to send password reset email';
//     switch (error.code) {
//       case 'auth/invalid-email':
//         errorMessage = 'Invalid email address';
//         break;
//       case 'auth/too-many-requests':
//         errorMessage = 'Too many attempts. Please try again later';
//         break;
//     }
//     res.status(500).json({ error: errorMessage });
//   }
// });



// // Delete account
// app.post('/api/delete-account', csrfProtection, async (req, res) => {
//   try {
//     const user = await useAuthState();
//     if (!user) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }
//     const employerUID = user.uid;

//     if (!employerUID) {
//       return res.status(400).json({ error: 'User ID required' });
//     }

//     // Verify user exists in Firebase Auth
//     try {
//       await adminMain.auth().getUser(employerUID);
//     } catch (error) {
//       if (error.code === 'auth/user-not-found') {
//         return res.status(400).json({ error: 'No account found with this user ID' });
//       }
//       throw error;
//     }

//     // Tell me that they're deleting
//     const displayName = user.displayName;
//     await infoEmail(`${displayName} just deleted their account.`);

//     // Prepare a batch of updates
//     const updates = {};

//     // Fetch all employees under this employer
//     const employeesRef = ref(adminDb, `employers/${employerUID}/employees`);
//     const snapshot = await get(employeesRef);
//     const employees = snapshot.exists() ? snapshot.val() : {};

//     // Remove employer from each user's employers node
//     for (const employeeUID of Object.keys(employees)) {
//       updates[`users/${employeeUID}/employers/${employerUID}`] = null;
//     }

//     // Remove employer from all referrer records
//     const referrersSnapshot = await get(ref(adminDb, 'referrers'));
//     if (referrersSnapshot.exists()) {
//       const referrers = referrersSnapshot.val();
//       for (const emailKey of Object.keys(referrers)) {
//         const employerUids = referrers[emailKey].employerUids || {};
//         if (employerUids[employerUID]) {
//           updates[`referrers/${emailKey}/employerUids/${employerUID}`] = null;
//         }
//       }
//     }

//     // Delete director account
//     updates[`users/${employerUID}`] = null;

//     // Delete employer data
//     updates[`employers/${employerUID}`] = null;

//     // Apply all database deletions atomically
//     await update(ref(adminDb), updates);

//     // Delete employer auth
//     await adminMain.auth().deleteUser(employerUID);

//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error deleting account:', error);
//     let errorMessage = 'An error occurred while deleting the account';
//     switch (error.code) {
//       case 'auth/invalid-user-id':
//         errorMessage = 'Invalid user ID';
//         break;
//       case 'auth/requires-recent-login':
//         errorMessage = 'Please re-authenticate and try again';
//         break;
//     }
//     res.status(500).json({ error: errorMessage });
//   }
// });



// // Create new subscription
// app.post('/api/payment', csrfProtection, async (req, res) => {
//   let { numEmployees, billingType } = req.body;
//   numEmployees = sanitizeHtml(numEmployees, { allowedTags: [], allowedAttributes: {} });
//   numEmployees = parseInt(numEmployees);
//   billingType = sanitizeHtml(billingType, { allowedTags: [], allowedAttributes: {} }) === 'yearly' ? 'yearly' : 'monthly';

//   if (!Number.isInteger(numEmployees) || numEmployees <= 0) {
//     return res.status(400).json({ error: 'Invalid number of employees' });
//   }

//   const price = calculatePrice(numEmployees, billingType === 'yearly');

//   try {
//     const product = await stripe.products.create({
//       name: "MileageMonster Subscription",
//       description: billingType === 'yearly' ? "Yearly subscription" : "Monthly subscription",
//     });

//     const priceData = await stripe.prices.create({
//       unit_amount: price,
//       currency: "gbp",
//       product: product.id,
//       recurring: { interval: billingType === 'yearly' ? "year" : "month" },
//     });

//     const user = await useAuthState();
//     if (!user) return res.status(401).json({ error: 'Unauthorized' });
//     const userId = user.uid;

//     const employerRef = ref(db, `employers/${userId}`);
//     const employerSnapshot = await get(employerRef);
//     const employer = employerSnapshot.val();

//     if (!employer) {
//       return res.status(404).json({ error: 'Employer not found' });
//     }

//     const email = sanitizeHtml(employer.email, { allowedTags: [], allowedAttributes: {} });
//     const companyName = sanitizeHtml(employer.companyName, { allowedTags: [], allowedAttributes: {} });

//     const customer = await stripe.customers.create({
//       email: email,
//       name: companyName,
//       address: {
//         country: "GB"
//       }
//     });
//     const stripeCustomerId = customer.id;

//     try {
//       await set(ref(db, `employers/${userId}/stripeDetails`), {
//         customerId: stripeCustomerId,
//         frequency: billingType
//       });
//       await set(ref(db, `stripeCustomers/${stripeCustomerId}`), { employerUID: userId });
//       await set(ref(db, `employers/${userId}/numEmployees`), Number(numEmployees) || 0);

//       const employeesRef = ref(db, `employers/${userId}/employees`);
//       const employeesSnapshot = await get(employeesRef);

//       if (employeesSnapshot.exists()) {
//         const employeesData = employeesSnapshot.val() || {};
//         let reactivatedCount = 0;

//         for (const empId of Object.keys(employeesData)) {
//           const employee = employeesData[empId];
//           if (employee?.temp === true) {
//             const empRef = ref(db, `employers/${userId}/employees/${empId}`);
//             await update(empRef, { active: true, temp: null });
//             reactivatedCount++;
//           }
//         }
//       } else {
//         console.log(`[payment] No employees found for employer ${userId}`);
//       }

//     } catch (error) {
//       console.error(`[payment] Error writing to database for employer ${userId}:`, error);
//       infoEmail(`Failed to save customer data for user ${userId}: ${error.message}`);
//       return res.status(500).json({ error: 'Failed to save customer data' });
//     }

//     const session = await stripe.checkout.sessions.create({
//       line_items: [{ price: priceData.id, quantity: 1 }],
//       payment_method_types: ["card"],
//       mode: "subscription",
//       customer: stripeCustomerId,
//       customer_update: {
//         address: 'never'
//       },
//       success_url: `${process.env.SERVER_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.SERVER_URL}/payment`,
//     });

//     res.json({ url: session.url });

//   } catch (error) {
//     console.error('Payment error:', error);
//     infoEmail(`Payment endpoint failed for user ${userId}: ${error.message}`);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });





// Stripe webhooks
// app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
//   } catch (err) {
//     console.error('Error constructing event:', err);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   let customerId, stripeCustomerRef, stripeCustomerData, employerUID, employerRef, employerData, employer, email, name;

//   switch (event.type) {
//     case 'invoice.payment_succeeded':
//       customerId = event.data.object.customer;
//       stripeCustomerRef = ref(db, `stripeCustomers/${customerId}`);
//       stripeCustomerData = await get(stripeCustomerRef);
//       employerUID = stripeCustomerData.val().employerUID;

//       if (employerUID) {
//         employerRef = ref(db, `employers/${employerUID}`);
//         employerData = await get(employerRef);
//         employer = employerData.val();
//         if (employer && employer.stripeDetails) {
//           email = employer.email;
//           name = employer.companyName;
//           const isYearly = employer.stripeDetails.frequency === 'yearly';
//           if (event.data.object.billing_reason === 'subscription_create') {
//             welcomeEmail(email, name);
//           }
//           await runTransaction(employerRef, (currentData) => {
//             if (currentData) {
//               currentData.paid = true;
//               currentData.paymentFailedDate = null; // Reset on success
//             }
//             return currentData;
//           });
//           infoEmail(`Invoice successfully paid for ${name}, ${email} (${isYearly ? 'yearly' : 'monthly'} subscription).`);
//         } else {
//           console.error('No employer data or stripeDetails found for UID:', employerUID);
//           const eventData = JSON.stringify(event.data.object, null, 2);
//           infoEmail(`No employer data found for UID: ${employerUID}.<br><br>${eventData}`);
//         }
//       } else {
//         console.error('No employer found for customerId:', customerId);
//         const eventData = JSON.stringify(event.data.object, null, 2);
//         infoEmail(`No employer found for customerId: ${customerId}.<br><br>${eventData}`);
//         return res.status(404).send('No employer found');
//       }
//       break;

//     case 'invoice.payment_failed':
//       customerId = event.data.object.customer;
//       stripeCustomerRef = ref(db, `stripeCustomers/${customerId}`);
//       stripeCustomerData = await get(stripeCustomerRef);
//       employerUID = stripeCustomerData.val().employerUID;

//       if (employerUID) {
//         employerRef = ref(db, `employers/${employerUID}`);
//         employerData = await get(employerRef);
//         employer = employerData.val();
//         if (employer && employer.stripeDetails) {
//           email = employer.email;
//           name = employer.companyName;
//           const isYearly = employer.stripeDetails.frequency === 'yearly';
//           invoiceFailedEmail(email, name);
//           infoEmail(`Invoice payment failed for ${name}, ${email} (${isYearly ? 'yearly' : 'monthly'} subscription).`);
//           await runTransaction(employerRef, (currentData) => {
//             if (currentData) {
//               currentData.paymentFailedDate = new Date().toISOString();
//             }
//             return currentData;
//           });
//         }
//       } else {
//         console.error('No employer found with matching stripeCustomerId');
//       }
//       break;

//     case 'customer.subscription.updated':
//       customerId = event.data.object.customer;
//       stripeCustomerRef = ref(db, `stripeCustomers/${customerId}`);
//       stripeCustomerData = await get(stripeCustomerRef);
//       employerUID = stripeCustomerData.val().employerUID;
//       if (employerUID) {
//         employerRef = ref(db, `employers/${employerUID}`);
//         employerData = await get(employerRef);
//         employer = employerData.val();
//         if (employer && employer.stripeDetails) {
//           email = employer.email;
//           name = employer.companyName;
//           const isYearly = employer.stripeDetails.frequency === 'yearly';
//           const newAmount = event.data.object.plan.amount;
//           const oldAmount = event.data.previous_attributes?.plan?.amount || 'N/A';
//           infoEmail(`Subscription updated for ${name}, ${email} from ${oldAmount} to ${newAmount} (${isYearly ? 'yearly' : 'monthly'} subscription).`);
//         }
//       } else {
//         console.error('No employer found for customerId:', customerId);
//       }
//       break;

//     case 'customer.subscription.deleted':
//       customerId = event.data.object.customer;
//       stripeCustomerRef = ref(db, `stripeCustomers/${customerId}`);
//       stripeCustomerData = await get(stripeCustomerRef);
//       employerUID = stripeCustomerData.val().employerUID;
//       if (employerUID) {
//         await runTransaction(ref(db, `employers/${employerUID}`), (currentData) => {
//           if (currentData && currentData.stripeDetails) {
//             currentData.stripeDetails.customerId = null;
//             currentData.stripeDetails.frequency = null;
//           }
//           return currentData;
//         });
//         await remove(stripeCustomerRef);
//       }
//       break;

//     default:
//       break;
//   }
//   res.send();
// });





// Email transporter object
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: emailSecret,
    pass: passwordSecret,
  }
});


// Welcome email
async function welcomeEmail(recipient, name) {
  const mailOptions = {
    from: emailJack,
    to: recipient,
    bcc: emailJack, emailSecret,
    subject: 'Welcome to Stumps!',
    text: `Hi ` + name + `,\n\nBody of the email.\n\nThank you,\nThe Stumps team`,
    html:
      `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="dark">
          <meta name="supported-color-schemes" content="dark">
          <title>Stumps welcome</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #222222;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #222222;">
            <tr>
              <td style="padding: 20px;">
                <!-- Content container -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #222222;">
                  <tr>
                    <td style="padding: 20px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 24px;">
                      <span style="color: #ffffff;">Hi ` + name + `,</span><br><br>
                      <span style="color: #ffffff;">Body of the email.</span><br><br>
                      <span style="color: #ffffff;">Thank you,</span><br>
                      <span style="color: #ffffff;">The Stumps team</span><br><br>
                    </td>
                  </tr>
                </table>
                <!-- Footer with logo -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #222222;">
                  <tr>
                    <td style="padding: 10px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">
                      <!-- Logo wrapper with fallback background for light mode -->
                      <div style="display: inline-block; background-color: #222222; padding: 5px;">
                        <img
                          src="${process.env.SERVER_URL}/stumps_logo_full.png"
                          alt="Stumps Logo"
                          style="max-width: 150px; height: auto; display: block;"
                        >
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

app.listen(port);