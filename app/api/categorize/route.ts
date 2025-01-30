import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
    try {
        const { questions, categories } = await req.json();

        if (!Array.isArray(questions) || !Array.isArray(categories) || !questions.length || !categories.length) {
            return NextResponse.json({ error: "Missing or invalid questions or categories" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

        const categorizedResults = await Promise.all(
            questions.map(async (question: { text: string }) => {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are an AI that categorizes Bible questions." },
                        {
                            role: "user",
                            content: `Classify this Bible question: "${question.text}" into the most relevant category from the following list: 
                            ${categories.map((c: { name: string }) => c.name).join(", ")}. 
                            Return only one category with a confidence score in JSON format: {"name": "Category1", "confidence": 95}. 
                            If confidence is below 30%, mark it as "Recommended" but still provide the best match.`
                        },
                    ],
                    max_tokens: 150,
                });

                let parsedCategory;
                try {
                    parsedCategory = JSON.parse(response.choices[0]?.message?.content?.trim() || "{}");
                    if (!parsedCategory.name) {
                        parsedCategory = { name: "Uncategorized", confidence: 0 };
                    }
                } catch (error) {
                    parsedCategory = { name: "Uncategorized", confidence: 0 };
                }

                return {
                    question: question.text,
                    categories: [parsedCategory], // Only pick one category
                };
            })
        );

        return NextResponse.json(categorizedResults);
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Error processing request" }, { status: 500 });
    }
}
