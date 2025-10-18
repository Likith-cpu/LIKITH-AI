
import { GoogleGenAI, Modality } from "@google/genai";
import type { VideoConfig } from "../types";

// This file assumes process.env.API_KEY is available globally,
// which is standard in environments like Vite, Create React App, or via injected scripts.

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string | null> => {
    // A new instance is created for each call to ensure the latest config/API key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    return null;
};

export const generateVideo = async (prompt: string, imageBase64: string | null, mimeType: string | null, config: VideoConfig) => {
    // IMPORTANT: Create a new instance right before the API call to use the latest key from the selection dialog.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imagePayload = imageBase64 && mimeType ? {
        image: {
            imageBytes: imageBase64,
            mimeType: mimeType,
        }
    } : {};
    
    const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        ...imagePayload,
        config: {
            numberOfVideos: 1,
            resolution: config.resolution,
            aspectRatio: config.aspectRatio,
        }
    });
    
    return operation;
};

export const getVideoOperationStatus = async (operation: any) => {
    // IMPORTANT: Create a new instance right before the API call.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
    return updatedOperation;
};
