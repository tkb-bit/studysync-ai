// src/app/api/notices/[id]/route.js

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(request, { params }) {
    // ... (DELETE function is already correct)
}

// FINAL, CORRECTED PUT FUNCTION
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();

        const client = await clientPromise;
        const db = client.db(process.env.DB_NAME);

        // Build the update object from the request body
        const updateData = {};
        if (body.status) {
            updateData.status = body.status;
            if (body.status === 'published' && !body.publishDate) {
                updateData.publishDate = new Date();
            }
        }
        // Add other fields if they exist in the body
        if (body.title) updateData.title = body.title;
        if (body.content) updateData.content = body.content;
        if (body.category) updateData.category = body.category;
        if (body.priority) updateData.priority = body.priority;

        const result = await db.collection("notices").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return new Response(JSON.stringify({ error: "Notice not found" }), { status: 404 });
        }

        const updatedNotice = await db.collection("notices").findOne({ _id: new ObjectId(id) });
        // Return the full, updated notice object
        return new Response(JSON.stringify({ success: true, notice: updatedNotice }), { status: 200 });

    } catch (error) {
        console.error("Update Notice Error:", error);
        return new Response(JSON.stringify({ error: "Failed to update notice" }), { status: 500 });
    }
}