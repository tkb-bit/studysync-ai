// src/app/api/materials/route.js

import clientPromise from "@/lib/mongodb";

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    // Find all documents in the "materials" collection
    // We sort by uploadDate in descending order to show the newest first
    const materials = await db
      .collection("materials")
      .find({})
      .sort({ uploadDate: -1 })
      .toArray();

    return new Response(JSON.stringify(materials), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error("Failed to fetch materials:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch materials" }), { status: 500 });
  }
}