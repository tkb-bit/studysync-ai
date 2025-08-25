// src/app/api/upload-file/route.js



import clientPromise from "@/lib/mongodb";

import { ChromaClient } from "chromadb";

import pdf from "pdf-extraction";

import { v2 as cloudinary } from 'cloudinary';



// Configure Cloudinary from .env.local - ONLY for storage

cloudinary.config({

  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  api_key: process.env.CLOUDINARY_API_KEY,

  api_secret: process.env.CLOUDINARY_API_SECRET,

  secure: true

});



const chroma = new ChromaClient({ host: "localhost", port: 8000 });



// Helper function for Cloudflare AI API

async function runCloudflareAIJson(model, inputs) {

  const AI_GATEWAY = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run`;

  const response = await fetch(`${AI_GATEWAY}/${model}`, {

    method: "POST",

    headers: {

      "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,

      "Content-Type": "application/json"

    },

    body: JSON.stringify(inputs),

  });

  const jsonResponse = await response.json();

  if (!jsonResponse.success) {

    console.error("Error from Cloudflare AI:", jsonResponse.errors);

    throw new Error(`Cloudflare AI API call failed: ${jsonResponse.errors?.[0]?.message || 'Unknown error'}`);

  }

  return jsonResponse;

}



export async function POST(request) {

  try {

    const data = await request.formData();

    const file = data.get("file");

    const category = data.get("category") || "general";



    if (!file) {

      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });

    }



    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    let documentText = "";

    let fileURL = "";



    // Step 1: Upload the file to Cloudinary for storage to get a reliable URL

    const resourceType = file.type.startsWith("image/") ? "image" : "raw";

    const uploadOptions = {

      resource_type: resourceType,

      folder: "studysync_materials",

      use_filename: true,

      unique_filename: false,

    };

    const uploadResult = await new Promise((resolve, reject) => {

      cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {

        if (error) return reject(error); resolve(result);

      }).end(buffer);

    });

    fileURL = uploadResult.secure_url;

    console.log("File successfully stored in Cloudinary at:", fileURL);



    // Step 2: Extract text from the file for the AI

    if (file.type === "application/pdf") {

      const extractedData = await pdf(buffer);

      documentText = extractedData.text;

    } else if (file.type.startsWith("image/")) {

      console.log("Extracting text from image using Cloudflare AI Vision...");

     

      // ================== FINAL OCR FIX: USING CLOUDFLARE AI ==================

      // This method is confirmed to be on the free tier and works reliably.

      const imageBase64 = buffer.toString('base64');

      const extractionPrompt = `This is an image of a document. Perform OCR and extract all text from this image. Be as precise as possible.`;

     

      const visionResponse = await runCloudflareAIJson('@cf/llava-hf/llava-1.5-7b-hf', { prompt: extractionPrompt, image: imageBase64 });

     

      documentText = visionResponse.result.response;

      console.log("Successfully extracted text with Cloudflare AI:", documentText);

      // =====================================================================

    }



    // Step 3: Save metadata to MongoDB

    await clientPromise.then(client => client.db(process.env.DB_NAME).collection("materials").insertOne({

        fileName: file.name, fileURL, contentType: file.type, size: file.size, uploadDate: new Date(), category, aiDescription: documentText

    }));

    console.log("Successfully saved metadata to MongoDB.");



    // Step 4: Save extracted text to ChromaDB for searching

    if (documentText) {

      const collection = await chroma.getOrCreateCollection({ name: "studysync_materials", metadata: { "hnsw:space": "cosine" } });

      const chunks = documentText.split("\n").filter(chunk => chunk.trim() !== ""); // Split by line for OCR text

      if (chunks.length > 0) {

          const embeddingResponse = await runCloudflareAIJson('@cf/baai/bge-base-en-v1.5', { text: chunks });

          const embeddings = embeddingResponse.result.data;

          let idCounter = Date.now();

          for (let i = 0; i < chunks.length; i++) {

              await collection.add({

                  ids: [`${file.name}-${idCounter++}`],

                  embeddings: [embeddings[i]],

                  metadatas: [{ source: file.name, fileURL, category: category }],

                  documents: [chunks[i]],

              });

          }

      }

      console.log("Successfully saved text chunks to ChromaDB.");

    }



    return new Response(JSON.stringify({ success: true, message: `Successfully ingested and saved ${file.name}` }), { status: 200 });

  } catch (error) {

    console.error("Upload Error:", error);

    return new Response(JSON.stringify({ error: "Failed to ingest document" }), { status: 500 });

  }

}



