const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const { buffer } = require('micro');

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
const db = admin.firestore();

// Vercel requires this config to access the raw request body for webhook signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        // 1. Verify the event came from Stripe using the webhook secret
        event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Handle the 'checkout.session.completed' event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Retrieve the user ID and price ID from the session metadata
        const userId = session.metadata.userId;
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        const priceId = lineItems.data[0].price.id;

        if (!userId || !priceId) {
            console.error('Webhook received a session without a userId or priceId in metadata.');
            return res.status(400).send('Missing metadata.');
        }

        try {
            const userDocRef = db.collection('users').doc(userId);
            
            // 3. Determine how many credits to add based on the Price ID
            let creditsToAdd = 0;
            let newStatus = 'free';
            if (priceId === process.env.STRIPE_SUB_PRICE_ID) {
                creditsToAdd = 400;
                newStatus = 'active'; // Mark user as a subscriber
            } else if (priceId === process.env.STRIPE_CREDITS_PRICE_ID) {
                creditsToAdd = 40;
                // Keep their existing subscription status
                const doc = await userDocRef.get();
                newStatus = doc.exists ? doc.data().stripeSubscriptionStatus : 'free';
            }

            // 4. Update the user's document in Firestore
            if (creditsToAdd > 0) {
                await userDocRef.update({
                    credits: admin.firestore.FieldValue.increment(creditsToAdd),
                    stripeSubscriptionStatus: newStatus
                });
                console.log(`Successfully added ${creditsToAdd} credits to user ${userId}. Status: ${newStatus}`);
            }
        } catch (error) {
            console.error('Error updating user in Firestore:', error);
            // We still return a 200 to Stripe to acknowledge receipt of the event, but we log the error for our own debugging.
        }
    }

    // Acknowledge receipt of the event
    res.status(200).json({ received: true });
};

