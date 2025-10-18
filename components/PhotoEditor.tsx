import React, { useState, useCallback } from 'react';
import { editImage } from '../services/geminiService';
import { toBase64, downloadFromUrl } from '../utils/fileUtils';
import { Spinner } from './Spinner';
import { UploadIcon, SparklesIcon, DownloadIcon } from './Icons';

const QUICK_STYLES = ['Cinematic', 'Vintage', 'Cyberpunk', 'Black and White', 'Pop Art', 'Neon Glow'];

export const PhotoEditor: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit for inline data
                setError('Image size should be less than 4MB.');
                return;
            }
            setImageFile(file);
            setOriginalImageUrl(URL.createObjectURL(file));
            setEditedImageUrl(null);
            setError(null);
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!prompt || !imageFile) {
            setError('Please provide an image and a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setEditedImageUrl(null);

        try {
            const base64Image = await toBase64(imageFile);
            const editedImageBase64 = await editImage(prompt, base64Image, imageFile.type);
            if (editedImageBase64) {
                setEditedImageUrl(`data:${imageFile.type};base64,${editedImageBase64}`);
            } else {
                throw new Error('The AI model did not return an image. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, imageFile]);

    const handleDownloadPhoto = () => {
        if (editedImageUrl && imageFile) {
            const extension = imageFile.type.split('/')[1] || 'png';
            downloadFromUrl(editedImageUrl, `edited-photo-by-likith.${extension}`);
        }
    };
    
    const handleStyleClick = (style: string) => {
        setPrompt(prev => prev ? `${prev}, ${style.toLowerCase()}` : style);
    };

    return (
        <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">1. Upload Photo</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadIcon />
                                <div className="flex text-sm text-gray-500">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none">
                                        <span>Upload a file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 4MB</p>
                                {imageFile && <p className="text-xs text-green-400 pt-2">{imageFile.name}</p>}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Describe Your Edit</label>
                        <textarea
                            id="prompt"
                            rows={3}
                            className="block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-white p-2"
                            placeholder="e.g., 'add a futuristic cyberpunk city in the background'"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">3. Quick Styles (optional)</label>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_STYLES.map(style => (
                                <button
                                    key={style}
                                    onClick={() => handleStyleClick(style)}
                                    className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-purple-500 hover:text-white transition-colors"
                                >
                                    + {style}
                                </button>
                            ))}
                        </div>
                    </div>

                     <button
                        onClick={handleSubmit}
                        disabled={isLoading || !imageFile || !prompt}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                    >
                        {isLoading ? <Spinner /> : <SparklesIcon />}
                        <span className="ml-2">{isLoading ? 'Generating...' : 'Apply Magic'}</span>
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                </div>

                {/* Image Display */}
                <div className="grid grid-cols-1 gap-4 items-start">
                     <div className="relative aspect-square bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center">
                        <h3 className="absolute top-2 left-3 text-sm font-bold bg-black/50 px-2 py-1 rounded">ORIGINAL</h3>
                        {originalImageUrl ? (
                            <img src={originalImageUrl} alt="Original" className="object-contain max-h-full max-w-full"/>
                        ) : (
                            <p className="text-gray-500">Upload an image to see it here</p>
                        )}
                    </div>
                    <div className="relative aspect-square bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center">
                        <h3 className="absolute top-2 left-3 text-sm font-bold bg-black/50 px-2 py-1 rounded">EDITED</h3>
                        {isLoading && <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center"><Spinner /><p className="mt-2">Editing in progress...</p></div>}
                        {editedImageUrl && !isLoading && (
                            <>
                                <img src={editedImageUrl} alt="Edited" className="object-contain max-h-full max-w-full"/>
                                <button 
                                    onClick={handleDownloadPhoto}
                                    className="absolute bottom-3 right-3 flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform duration-200"
                                    aria-label="Download edited photo"
                                >
                                    <DownloadIcon />
                                </button>
                            </>
                        )}
                         {!editedImageUrl && !isLoading && (
                            <p className="text-gray-500">Your edited image will appear here</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
