// src/app/api/notices/route.js

import clientPromise from "@/lib/mongodb";

// The GET function is already correct and does not need changes.
export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const notices = await db
      .collection("notices")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return new Response(JSON.stringify(notices), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Fetch Notices Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch notices" }), { status: 500 });
  }
}


// Function to POST (create) a new notice
export async function POST(request) {
  try {
    const { title, content, category, status, priority } = await request.json();

    if (!title || !content) {
      return new Response(JSON.stringify({ error: "Title and content are required" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const newNotice = {
      title,
      content,
      category: category || "general",
      priority: priority || "medium",
      status: status || "draft",
      createdAt: new Date(),
      publishDate: null,
      views: 0,
    };

    const result = await db.collection("notices").insertOne(newNotice);

    // ================== THE FINAL, CORRECTED LINE ==================
    // We construct the response using the 'newNotice' object and the 'insertedId' from the result.
    return new Response(JSON.stringify({ 
        success: true, 
        newNotice: { ...newNotice, _id: result.insertedId } 
    }), { status: 201 });
    // ===============================================================

  } catch (error) {
    console.error("Notice Creation Error:", error);
    return new Response(JSON.stringify({ error: "Failed to create notice" }), { status: 500 });
  }
}