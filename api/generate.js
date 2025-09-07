// Vercel Serverless Function
// This file will handle requests from our frontend,
// add the secret API key, and forward the request to the Google AI API.

export default async function handler(request, response) {
    // We only want to handle POST requests, reject others
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 1. Get the prompt and image data from the frontend's request
        const { prompt, fileData, fileType } = request.body;
        
        if (!prompt || !fileData || !fileType) {
            return response.status(400).json({ message: "Missing required fields: prompt, fileData, fileType" });
        }

        // 2. Get the secret API key from a secure environment variable
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            // This is a server-side error, so we return a 500 status
            console.error("GOOGLE_API_KEY is not set in environment variables.");
            return response.status(500).json({ message: "Server configuration error." });
        }
        
        // 3. Prepare the payload for the real Google AI API
        const model = "gemini-2.5-flash-image-preview";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: fileType, data: fileData } }
                ]
            }],
            generationConfig: {
                responseModalities: ['IMAGE']
            },
        };

        // 4. Call the Google AI API from our server
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!apiResponse.ok) {
            // If the API call fails, log the error and forward a generic error to the client
            const errorBody = await apiResponse.text();
            console.error(`Google AI API Error: ${apiResponse.status} ${errorBody}`);
            return response.status(502).json({ message: "Error from AI service." });
        }

        const data = await apiResponse.json();

        // 5. Send the final result back to the user's browser
        return response.status(200).json(data);

    } catch (error) {
        console.error('Internal Server Error:', error);
        return response.status(500).json({ message: 'An unexpected error occurred.' });
    }
}

