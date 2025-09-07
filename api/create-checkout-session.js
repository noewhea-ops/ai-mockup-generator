const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Authenticate the user with Firebase Admin SDK
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        if (!idToken) {
            return res.status(401).json({ error: 'Unauthorized: No token provided.' });
        }
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        const userEmail = decodedToken.email;

        // 2. Get the Price ID from the request body
        const { priceId } = req.body;
        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required.' });
        }
        
        // 3. Determine if the price is for a subscription or a one-time payment
        const price = await stripe.prices.retrieve(priceId);
        const mode = price.type === 'recurring' ? 'subscription' : 'payment';

        // 4. Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: mode,
            // Use the request origin for success and cancel URLs
            success_url: `${req.headers.origin}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}?payment=cancelled`,
            // Pass the user's email and Firebase UID to the session
            customer_email: userEmail,
            metadata: {
                userId: userId,
            },
        });

        // 5. Send the Session ID back to the client
        res.status(200).json({ id: session.id });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
};

