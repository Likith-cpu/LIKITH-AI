import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateVideo, getVideoOperationStatus } from '../services/geminiService';
import { toBase64, downloadFromUrl } from '../utils/fileUtils';
import { Spinner } from './Spinner';
import { UploadIcon, PlayIcon, KeyIcon, DownloadIcon } from './Icons';
import type { AspectRatio, Resolution, VideoConfig } from '../types';

// Augment the Window interface to include aistudio
// Fix: Replaced inline object type with a named interface `AIStudio` to resolve declaration conflict.
// This allows TypeScript to merge this definition with other potential definitions of `window.aistudio`.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const POLLING_INTERVAL_MS = 10000;
const LOADING_MESSAGES = [
    "Contacting the AI director...",
    "Reticulating splines...",
    "Polishing the digital film...",
    "This can take a few minutes...",
    "The AI is rendering your masterpiece...",
    "Finalizing visual effects...",
];
const STYLE_SUGGESTIONS = ['Cinematic drone shot', 'Time-lapse', 'Slow motion', '8-bit pixel art style', 'Documentary style', 'Claymation'];

export const VideoEditor: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
    const [prompt, setPrompt] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<VideoConfig>({ aspectRatio: '16:9', resolution: '720p' });
    const pollingRef = useRef<number | null>(null);
    const loadingMessageRef = useRef<number | null>(null);

    const checkApiKey = useCallback(async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        } else {
             // Fallback for environments where aistudio is not available
            console.warn("aistudio not found. Assuming API key is set via environment variables.");
            setApiKeySelected(true);
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    useEffect(() => {
        if (isLoading) {
            loadingMessageRef.current = window.setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = LOADING_MESSAGES.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
                    return LOADING_MESSAGES[nextIndex];
                });
            }, 5000);
        } else if (loadingMessageRef.current) {
            clearInterval(loadingMessageRef.current);
        }
        return () => {
            if (loadingMessageRef.current) clearInterval(loadingMessageRef.current);
        };
    }, [isLoading]);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Optimistically set to true, actual check happens on submit
            setApiKeySelected(true); 
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewImageUrl(URL.createObjectURL(file));
        }
    };

    const cleanupPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!prompt) {
            setError('Please provide a prompt for the video.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl(null);
        setLoadingMessage(LOADING_MESSAGES[0]);

        try {
            // A new genai instance must be created before each API call to ensure it uses the latest API key.
            await checkApiKey();
            let base64Image: string | null = null;
            if (imageFile) {
                base64Image = await toBase64(imageFile);
            }

            let operation = await generateVideo(prompt, base64Image, imageFile?.type || null, config);

            pollingRef.current = window.setInterval(async () => {
                try {
                    operation = await getVideoOperationStatus(operation);
                    if (operation.done) {
                        cleanupPolling();
                        if(operation.response?.generatedVideos?.[0]?.video?.uri) {
                            const videoUri = operation.response.generatedVideos[0].video.uri;
                            const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
                            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
                            const videoBlob = await response.blob();
                            setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
                            setIsLoading(false);
                        } else {
                           throw new Error(operation.error?.message || "Video generation finished but no video URI was found.");
                        }
                    }
                } catch (pollError: any) {
                    cleanupPolling();
                    console.error("Polling Error:", pollError);
                    if (pollError.message?.includes("Requested entity was not found")) {
                        setError("API Key not valid. Please select a valid key.");
                        setApiKeySelected(false);
                    } else {
                        setError(pollError.message || 'An error occurred while checking video status.');
                    }
                    setIsLoading(false);
                }
            }, POLLING_INTERVAL_MS);

        } catch (err: any) {
            console.error(err);
            if (err.message?.includes("API key not valid")) {
                setError("API Key not valid. Please select a valid key.");
                setApiKeySelected(false);
            } else {
                 setError(err instanceof Error ? err.message : 'An unknown error occurred during video generation.');
            }
            setIsLoading(false);
        }
    }, [prompt, imageFile, config, checkApiKey]);

    const handleDownloadVideo = () => {
        if (generatedVideoUrl) {
            downloadFromUrl(generatedVideoUrl, 'generated-video-by-likith.mp4');
        }
    };

    const handleStyleClick = (style: string) => {
        setPrompt(prev => prev ? `${prev}, ${style.toLowerCase()}` : style);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanupPolling();
    }, []);

    if (!apiKeySelected) {
        return (
            <div className="text-center bg-gray-700 p-8 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">API Key Required for Video Generation</h2>
                <p className="text-gray-400 mb-6">Video generation with Veo requires a user-selected API key. Please select a key to proceed. For more information on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a>.</p>
                <button
                    onClick={handleSelectKey}
                    className="inline-flex items-center justify-center py-3 px-6 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
                >
                    <KeyIcon/>
                    <span className="ml-2">Select API Key</span>
                </button>
            </div>
        );
    }
    
    return (
        <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="video-prompt" className="block text-sm font-medium text-gray-300 mb-2">1. Describe Your Video</label>
                        <textarea id="video-prompt" rows={3} className="block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-white p-2" placeholder="e.g., 'A cinematic shot of a wolf howling at a neon moon'" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">2. Style Suggestions (optional)</label>
                        <div className="flex flex-wrap gap-2">
                            {STYLE_SUGGESTIONS.map(style => (
                                <button key={style} onClick={() => handleStyleClick(style)} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-purple-500 hover:text-white transition-colors">
                                    + {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="video-file-upload" className="block text-sm font-medium text-gray-300 mb-2">3. Upload Starting Image (Optional)</label>
                         <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadIcon />
                                <label htmlFor="video-file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none">
                                    <span>Upload an image</span>
                                    <input id="video-file-upload" name="video-file-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handleFileChange} />
                                </label>
                                {imageFile && <p className="text-xs text-green-400 pt-2">{imageFile.name}</p>}
                            </div>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">4. Configure Video</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-400">Aspect Ratio</span>
                                <div className="flex space-x-2 mt-1">
                                    {(['16:9', '9:16'] as AspectRatio[]).map(ratio => (
                                        <button key={ratio} onClick={() => setConfig(c => ({...c, aspectRatio: ratio}))} className={`w-full py-2 text-sm rounded-md ${config.aspectRatio === ratio ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{ratio}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400">Resolution</span>
                                <div className="flex space-x-2 mt-1">
                                     {(['720p', '1080p'] as Resolution[]).map(res => (
                                        <button key={res} onClick={() => setConfig(c => ({...c, resolution: res}))} className={`w-full py-2 text-sm rounded-md ${config.resolution === res ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{res}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleSubmit} disabled={isLoading || !prompt} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105">
                        {isLoading ? <Spinner /> : <PlayIcon/>}
                        <span className="ml-2">{isLoading ? 'Generating Video...' : 'Generate Video'}</span>
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                </div>
                {/* Video Display */}
                <div className="relative aspect-video bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center">
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4">
                            <Spinner />
                            <p className="mt-4 text-lg font-semibold">{loadingMessage}</p>
                        </div>
                    )}
                    {!isLoading && generatedVideoUrl && (
                         <>
                            <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                            <button
                                onClick={handleDownloadVideo}
                                className="absolute bottom-3 right-3 flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform duration-200"
                                aria-label="Download generated video"
                            >
                                <DownloadIcon />
                            </button>
                        </>
                    )}
                     {!isLoading && !generatedVideoUrl && previewImageUrl && (
                        <img src={previewImageUrl} alt="Preview" className="w-full h-full object-contain" />
                    )}
                    {!isLoading && !generatedVideoUrl && !previewImageUrl && (
                        <div className="text-center text-gray-500">
                            <p>Your generated video will appear here.</p>
                            <p className="text-sm">Provide a prompt to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
