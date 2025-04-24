import { Hono } from "hono";
import OpenAI from "openai";
import { Buffer } from "node:buffer";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Define time periods (examples removed)
interface TimePeriod {
  id: string;
  name: string;
  prompt: string;
  // examples property removed
}

const TIME_PERIODS: TimePeriod[] = [
  {
    id: "prehistoric",
    name: "Prehistoric",
    prompt: "prehistoric era",
  },
  {
    id: "ancient-egypt", 
    name: "Ancient Egypt",
    prompt: "ancient Egyptian civilization",
  },
  {
    id: "roman-empire",
    name: "Roman Empire",
    prompt: "ancient Roman civilization",
  },
  {
    id: "medieval",
    name: "Medieval",
    prompt: "medieval Europe",
  },
  {
    id: "renaissance",
    name: "Renaissance",
    prompt: "Renaissance period",
  },
  {
    id: "wild-west",
    name: "Wild West",
    prompt: "American Wild West era",
  },
  {
    id: "roaring-twenties",
    name: "1920s",
    prompt: "Roaring Twenties",
  },
  {
    id: "future",
    name: "Future (Year 3030)",
    prompt: "year 3030",
  }
];

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({ status: "ok", message: "Server is running" });
});

// Get available time periods
app.get("/api/time-periods", (c) => {
  console.log("Returning time periods:", TIME_PERIODS.length);
  return c.json(TIME_PERIODS);
});

// API endpoint to generate a time travel image
app.post("/api/time-travel", async (c) => {
  try {
    const body = await c.req.json();
    const { timeperiod, imageData } = body;
    
    console.log(`Received time travel request for period: ${timeperiod}`);
    
    if (!timeperiod || !imageData) {
      console.log("Missing required parameters");
      return c.json({ error: "Missing required parameters" }, 400);
    }
    
    // Get OpenAI API key from environment variable
    const apiKey = c.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log("OpenAI API key not configured");
      return c.json({ 
        error: "OpenAI API key not configured", 
        details: "Please add OPENAI_API_KEY to your environment variables" 
      }, 500);
    }
    
    // Find the selected time period
    const period = TIME_PERIODS.find(p => p.id === timeperiod);
    
    if (!period) {
      console.log(`Invalid time period: ${timeperiod}`);
      return c.json({ error: "Invalid time period" }, 400);
    }
    
    console.log(`Generating image for period: ${period.name}`);
    
    // Initialize OpenAI client with API key from environment
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Revised prompt without examples, emphasizing adaptation
    const promptText = `Transform the provided image into a photorealistic scene taking place in the ${period.prompt}. **It is essential to retain the original subjects' identity, features, and the overall composition of the scene.** Modify the setting, clothing, and surrounding elements to accurately reflect the style and atmosphere of the ${period.prompt}. The final image should clearly show the original subject transported to this different time period.`;
    console.log("Using prompt:", promptText);
    
    try {
      // Process image data
      console.log("Processing image data for OpenAI");
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Create a blob from the buffer
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      const imageFile = new File([blob], 'image.png', { type: 'image/png' });
      
      // Use the OpenAI SDK to call the image edit endpoint
      const result = await openai.images.edit({
        model: "gpt-image-1", 
        image: imageFile,
        prompt: promptText
      });
      
      console.log("Successfully generated image");
      
      // Check if we have a valid response structure
      if (!result.data || !result.data[0]) {
        console.error("Unexpected OpenAI response format");
        throw new Error("OpenAI returned invalid response format");
      }
      
      // Check if we get the base64 content directly
      if (result.data[0].b64_json) {
        try {
          // Store the image in R2 if IMAGES_BUCKET is available
          if (c.env.IMAGES_BUCKET) {
            const timestamp = Date.now();
            const filename = `timetravel-${period.id}-${timestamp}.png`;
            
            // Convert base64 to binary for R2 storage using Node.js Buffer
            const b64 = result.data[0].b64_json;
            const binaryData = Buffer.from(b64, 'base64');
            
            // Save to R2
            console.log(`Storing image in R2 bucket with key: ${filename}`);
            await c.env.IMAGES_BUCKET.put(filename, binaryData, {
              httpMetadata: { contentType: "image/png" }
            });
            
            // Return R2 image URL
            return c.json({
              success: true,
              image: `/api/images/${filename}`,
              stored: true,
              filename: filename,
              timeperiod: period
            });
          } else {
            console.log("No R2 bucket available, returning data URI");
            // Still return the data URI if no R2 bucket is available
            const dataUri = `data:image/png;base64,${result.data[0].b64_json}`;
            return c.json({
              success: true,
              image: dataUri,
              stored: false,
              timeperiod: period
            });
          }
        } catch (storageError) {
          console.error("Error storing image in R2:", storageError);
          // Fall back to data URI if R2 storage fails
          const dataUri = `data:image/png;base64,${result.data[0].b64_json}`;
          return c.json({
            success: true,
            image: dataUri,
            stored: false,
            storageError: storageError.message,
            timeperiod: period
          });
        }
      } 
      // No valid data found
      else {
        console.error("No image data in OpenAI response");
        return c.json({
          error: "No image returned from OpenAI",
          details: "The API response did not include image data"
        }, 500);
      }
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError);
      return c.json({ 
        error: "Failed to generate image with OpenAI", 
        details: openaiError.message || "Unknown OpenAI error" 
      }, 500);
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return c.json({ error: "Failed to process request" }, 500);
  }
});

// Add API route to serve images from R2
app.get("/api/images/:filename", async (c) => {
  try {
    const filename = c.req.param("filename");
    console.log(`Retrieving image from R2: ${filename}`);
    
    // Check if IMAGES_BUCKET is available
    if (!c.env.IMAGES_BUCKET) {
      return c.json({ error: "R2 bucket not configured" }, 500);
    }
    
    // Get the object from R2
    const object = await c.env.IMAGES_BUCKET.get(filename);
    
    if (!object) {
      console.log(`Image not found: ${filename}`);
      return c.json({ error: "Image not found" }, 404);
    }
    
    // Set up response headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    
    // Return the image
    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error("Error serving image from R2:", error);
    return c.json({ 
      error: "Failed to retrieve image", 
      details: error.message 
    }, 500);
  }
});

// Add API route to list all stored images
app.get("/api/images", async (c) => {
  try {
    console.log("Listing all images in R2 bucket");
    
    // Check if IMAGES_BUCKET is available
    if (!c.env.IMAGES_BUCKET) {
      return c.json({ error: "R2 bucket not configured" }, 500);
    }
    
    // List objects in the bucket
    const objects = await c.env.IMAGES_BUCKET.list();
    
    // Format the response
    const images = objects.objects.map(obj => ({
      key: obj.key,
      url: `/api/images/${obj.key}`,
      size: obj.size,
      uploaded: obj.uploaded
    }));
    
    return c.json({
      images: images,
      count: images.length
    });
  } catch (error) {
    console.error("Error listing images from R2:", error);
    return c.json({ 
      error: "Failed to list images", 
      details: error.message 
    }, 500);
  }
});

export default app;