"use client";

import { useState, useRef, FormEvent, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const htmlToPlain = (html: string) =>
	html
		.replace(/<[^>]+>/g, "")
		.replace(/\s+/g, " ")
		.trim();

export default function NewProductPage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Form state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [price, setPrice] = useState("");
	const [categories, setCategories] = useState<string[]>([]);
	const [seoTags, setSeoTags] = useState<string[]>([]);
	const [currentTag, setCurrentTag] = useState("");

	// File state
	const [productFile, setProductFile] = useState<File | null>(null);
	const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
	const [productFilePreview, setProductFilePreview] = useState<string>("");
	const [thumbnailPreview, setThumbnailPreview] = useState<string>("");

	// Additional images and video state
	const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
	const [additionalImagePreviews, setAdditionalImagePreviews] = useState<
		string[]
	>([]);
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const [videoPreview, setVideoPreview] = useState<string>("");

	// Refs for file inputs
	const productFileInputRef = useRef<HTMLInputElement>(null);
	const thumbnailInputRef = useRef<HTMLInputElement>(null);
	const additionalImagesInputRef = useRef<HTMLInputElement>(null);
	const videoInputRef = useRef<HTMLInputElement>(null);

	// Categories state
	const [availableCategories, setAvailableCategories] = useState<
		{ id: string; name: string }[]
	>([]);

	// Fetch categories
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const response = await fetch("/api/categories");
				if (!response.ok) {
					throw new Error("Failed to fetch categories");
				}
				const data = await response.json();
				setAvailableCategories(
					data.categories.map((cat: { id: string; name: string }) => ({
						id: cat.id,
						name: cat.name,
					}))
				);
				setIsLoading(false);
			} catch {
				setError("Failed to load categories. Please try again later.");
				setIsLoading(false);
			}
		};

		fetchCategories();
	}, []);

	// Handle product file selection
	const handleProductFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setProductFile(file);

			// Show file name as preview
			setProductFilePreview(file.name);
		}
	};

	// Handle thumbnail selection
	const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setThumbnailFile(file);

			// Create a preview URL
			const reader = new FileReader();
			reader.onload = () => {
				setThumbnailPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	// Handle additional images selection
	const handleAdditionalImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			// Convert FileList to array and limit to 9 images
			const files = Array.from(e.target.files).slice(0, 9);
			setAdditionalImageFiles(files);

			// Create preview URLs for each file
			const previews: string[] = [];
			files.forEach((file) => {
				const reader = new FileReader();
				reader.onload = () => {
					previews.push(reader.result as string);
					if (previews.length === files.length) {
						setAdditionalImagePreviews(previews);
					}
				};
				reader.readAsDataURL(file);
			});
		}
	};

	// Handle video selection
	const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setVideoFile(file);

			// Create a preview URL
			const reader = new FileReader();
			reader.onload = () => {
				setVideoPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	// Handle category selection
	const handleCategoryChange = (categoryId: string) => {
		setCategories((prev) => {
			if (prev.includes(categoryId)) {
				return prev.filter((id) => id !== categoryId);
			} else {
				return [...prev, categoryId];
			}
		});
	};

	// Handle form submission
	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		// Validate form
		if (!title.trim()) {
			setError("Title is required");
			return;
		}

		if (!htmlToPlain(description)) {
			setError("Description is required");
			return;
		}

		if (!price || isNaN(parseFloat(price))) {
			setError("Valid price is required");
			return;
		}

		// For development purposes, we'll allow submission without files
		// In production, uncomment these checks
		/*
    if (!productFile) {
      setError("Product file is required");
      return;
    }
    
    if (!thumbnailFile) {
      setError("Thumbnail image is required");
      return;
    }
    */

		// If no files are selected, use dummy files for development
		if (!productFile || !thumbnailFile) {
			setError(
				"For development: Using placeholder files. In production, file uploads would be required."
			);
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// Create FormData for file uploads
			const formData = new FormData();
			formData.append("title", title);
			formData.append("description", description);
			formData.append("price", price);

			// Add files if they exist, otherwise use dummy placeholders
			if (productFile) {
				formData.append("productFile", productFile);
			} else {
				// Create a dummy file for development
				const dummyPdfBlob = new Blob(["dummy pdf content"], {
					type: "application/pdf",
				});
				formData.append("productFile", dummyPdfBlob, "dummy-product.pdf");
			}

			if (thumbnailFile) {
				formData.append("thumbnailFile", thumbnailFile);
			} else {
				// Create a dummy image for development
				// This is just a tiny transparent pixel
				const base64Image =
					"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
				const response = await fetch(base64Image);
				const blob = await response.blob();
				formData.append("thumbnailFile", blob, "dummy-thumbnail.png");
			}

			// Add additional images if any
			if (additionalImageFiles.length > 0) {
				additionalImageFiles.forEach((file) => {
					formData.append("additionalImages", file);
				});
			}

			// Add video if exists
			if (videoFile) {
				formData.append("videoFile", videoFile);
			}

			// Add categories
			categories.forEach((categoryId) => {
				formData.append("categories[]", categoryId);
			});

			// Add SEO tags
			seoTags.forEach((tag) => {
				formData.append("seoTags[]", tag);
			});

			// Send the request to the API
			const response = await fetch("/api/products", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create product");
			}

			// Commented out to avoid console logs and unused variable warnings
			// const data = await response.json();
			// console.log("meh", data);
			await response.json(); // Still parse the response but don't store it

			setSuccess("Product created successfully!");

			// Redirect to the product page after a short delay
			setTimeout(() => {
				router.push(`/admin`);
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unknown error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Back button */}
			<div className="mb-6">
				<Link
					href="/admin"
					className="text-[#0B4F96] hover:text-blue-800 flex items-center"
				>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back to Dashboard
				</Link>
			</div>

			<h1 className="text-3xl font-bold mb-8">Add New Product</h1>

			{/* Error message */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
					{error}
				</div>
			)}

			{/* Success message */}
			{success && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
					{success}
				</div>
			)}

			{/* Loading state */}
			{isLoading ? (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading categories...</p>
				</div>
			) : (
				<div className="bg-white rounded-lg shadow-md p-6">
					<form onSubmit={handleSubmit}>
						{/* Product Title */}
						<div className="mb-6">
							<label
								htmlFor="title"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Product Title
							</label>
							<input
								type="text"
								id="title"
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Enter product title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								disabled={isSubmitting}
							/>
						</div>

						{/* Product Description */}
						<div className="mb-6">
							<label
								htmlFor="description"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Description
							</label>
							<RichTextEditor
								value={description}
								onChange={(html) => setDescription(html)}
							/>
							<p className="text-xs text-gray-500 mt-2">
								Tip: You can add headings, lists, links, tables, and images.
							</p>
							{/* <textarea
								id="description"
								rows={5}
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Enter product description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={isSubmitting}
							/> */}
						</div>

						{/* Product Price */}
						<div className="mb-6">
							<label
								htmlFor="price"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Price (USD)
							</label>
							<div className="relative">
								<span className="absolute left-3 top-2 text-gray-500">$</span>
								<input
									type="text"
									id="price"
									className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="29.99"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									disabled={isSubmitting}
								/>
							</div>
						</div>

						{/* Product File Upload */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Product File (PDF)
							</label>
							<div
								className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
								onClick={() => productFileInputRef.current?.click()}
							>
								<input
									type="file"
									ref={productFileInputRef}
									className="hidden"
									accept=".pdf"
									onChange={handleProductFileChange}
									disabled={isSubmitting}
								/>

								{productFilePreview ? (
									<div className="text-gray-700">
										<p className="font-medium">{productFilePreview}</p>
										<p className="text-sm text-gray-500 mt-1">Click to change file</p>
									</div>
								) : (
									<div className="text-gray-500">
										<Upload className="h-10 w-10 mx-auto mb-2" />
										<p className="font-medium">Click to upload PDF file</p>
										<p className="text-sm mt-1">or drag and drop</p>
									</div>
								)}
							</div>
						</div>

						{/* Thumbnail Upload */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Thumbnail Image (Main Product Image)
							</label>
							<div
								className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
								onClick={() => thumbnailInputRef.current?.click()}
							>
								<input
									type="file"
									ref={thumbnailInputRef}
									className="hidden"
									accept="image/*"
									onChange={handleThumbnailChange}
									disabled={isSubmitting}
								/>

								{thumbnailPreview ? (
									<div className="flex justify-center">
										<img
											src={thumbnailPreview}
											alt="Thumbnail preview"
											className="h-40 object-contain"
										/>
									</div>
								) : (
									<div className="text-gray-500">
										<Upload className="h-10 w-10 mx-auto mb-2" />
										<p className="font-medium">Click to upload thumbnail image</p>
										<p className="text-sm mt-1">or drag and drop</p>
									</div>
								)}
							</div>
						</div>

						{/* Additional Images Upload */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Additional Images (Up to 9)
							</label>
							<div
								className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
								onClick={() => additionalImagesInputRef.current?.click()}
							>
								<input
									type="file"
									ref={additionalImagesInputRef}
									className="hidden"
									accept="image/*"
									multiple
									onChange={handleAdditionalImagesChange}
									disabled={isSubmitting}
								/>

								{additionalImagePreviews.length > 0 ? (
									<div>
										<div className="grid grid-cols-3 gap-2 mb-4">
											{additionalImagePreviews.map((preview, index) => (
												<div key={index} className="relative h-24">
													<img
														src={preview}
														alt={`Additional image ${index + 1}`}
														className="h-full w-full object-cover rounded"
													/>
												</div>
											))}
										</div>
										<p className="text-sm text-gray-500">Click to change images</p>
									</div>
								) : (
									<div className="text-gray-500">
										<Upload className="h-10 w-10 mx-auto mb-2" />
										<p className="font-medium">Click to upload additional images</p>
										<p className="text-sm mt-1">or drag and drop (up to 9 images)</p>
									</div>
								)}
							</div>
						</div>

						{/* Video Upload */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Product Video (Optional)
							</label>
							<div
								className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
								onClick={() => videoInputRef.current?.click()}
							>
								<input
									type="file"
									ref={videoInputRef}
									className="hidden"
									accept="video/*"
									onChange={handleVideoChange}
									disabled={isSubmitting}
								/>

								{videoPreview ? (
									<div>
										<video
											controls
											className="w-full h-40 object-contain mb-2"
											poster={thumbnailPreview}
										>
											<source src={videoPreview} type="video/mp4" />
											Your browser does not support the video tag.
										</video>
										<p className="text-sm text-gray-500">Click to change video</p>
									</div>
								) : (
									<div className="text-gray-500">
										<Upload className="h-10 w-10 mx-auto mb-2" />
										<p className="font-medium">Click to upload product video</p>
										<p className="text-sm mt-1">or drag and drop</p>
									</div>
								)}
							</div>
						</div>

						{/* SEO Tags */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								SEO Tags (Up to 13)
							</label>
							<p className="text-xs text-gray-500 mb-2">
								Add up to 13 tags to help people search for your listings.
							</p>
							<div className="flex flex-wrap gap-2 mb-3">
								{seoTags.map((tag, index) => (
									<div
										key={index}
										className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center"
									>
										<span className="mr-1">{tag}</span>
										<button
											type="button"
											onClick={() => {
												setSeoTags(seoTags.filter((_, i) => i !== index));
											}}
											className="text-[#0B4F96] hover:text-blue-800"
										>
											×
										</button>
									</div>
								))}
							</div>
							<div className="flex">
								<input
									type="text"
									value={currentTag}
									onChange={(e) => setCurrentTag(e.target.value)}
									placeholder="Add a tag (e.g., healthcare, template)"
									className="flex-grow px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									disabled={isSubmitting || seoTags.length >= 13}
								/>
								<button
									type="button"
									onClick={() => {
										if (currentTag.trim() && seoTags.length < 13) {
											setSeoTags([...seoTags, currentTag.trim()]);
											setCurrentTag("");
										}
									}}
									disabled={!currentTag.trim() || seoTags.length >= 13 || isSubmitting}
									className="bg-[#0B4F96] text-white px-4 py-2 rounded-r-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
								>
									Add
								</button>
							</div>
							{seoTags.length >= 13 && (
								<p className="text-amber-600 text-xs mt-1">
									Maximum number of tags reached (13).
								</p>
							)}
						</div>

						{/* Categories */}
						<div className="mb-8">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Categories
							</label>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
								{availableCategories.map((category) => (
									<div key={category.id} className="flex items-center">
										<input
											type="checkbox"
											id={`category-${category.id}`}
											checked={categories.includes(category.id)}
											onChange={() => handleCategoryChange(category.id)}
											className="h-4 w-4 text-[#0B4F96] focus:ring-blue-500 border-gray-300 rounded"
											disabled={isSubmitting}
										/>
										<label
											htmlFor={`category-${category.id}`}
											className="ml-2 text-sm text-gray-700"
										>
											{category.name}
										</label>
									</div>
								))}
							</div>
						</div>

						{/* Submit Button */}
						<div className="flex justify-end">
							<button
								type="submit"
								disabled={isSubmitting}
								className="bg-[#0B4F96] text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center disabled:bg-blue-300"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="h-5 w-5 mr-2 animate-spin" />
										Creating...
									</>
								) : (
									"Create Product"
								)}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
