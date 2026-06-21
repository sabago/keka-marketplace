"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type Image = {
	id: string;
	imageUrl: string;
	order: number;
};

type ImageGalleryProps = {
	thumbnail: string;
	additionalImages: Image[];
	productTitle: string;
};

export default function ImageGallery({
	thumbnail,
	additionalImages,
	productTitle,
}: ImageGalleryProps) {
	// State to track the currently selected image
	const [selectedImage, setSelectedImage] = useState<string>(thumbnail);

	// State to track if the lightbox is open
	const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

	// All images including the thumbnail
	const allImages = [
		{ id: "thumbnail", imageUrl: thumbnail, order: 0 },
		...additionalImages,
	];

	// Handle clicking on a thumbnail
	const handleThumbnailClick = (imageUrl: string) => {
		setSelectedImage(imageUrl);
	};

	// Open lightbox
	const openLightbox = () => {
		setLightboxOpen(true);
	};

	// Close lightbox
	const closeLightbox = () => {
		setLightboxOpen(false);
	};

	return (
		<div className="space-y-4">
			{/* Main Image */}
			<div
				className="relative h-80 md:h-96 rounded-lg overflow-hidden cursor-pointer"
				onClick={openLightbox}
			>
				<Image
					src={selectedImage}
					alt={productTitle}
					fill
					sizes="(max-width: 768px) 100vw, 50vw"
					className="object-cover"
				/>
			</div>

			{/* Thumbnails Gallery */}
			{additionalImages && additionalImages.length > 0 && (
				<div className="grid grid-cols-4 gap-2">
					{/* Thumbnail as first image */}
					<div
						key="thumbnail"
						className={`relative h-20 rounded-lg overflow-hidden cursor-pointer ${
							selectedImage === thumbnail ? "ring-2 ring-blue-500" : ""
						}`}
						onClick={() => handleThumbnailClick(thumbnail)}
					>
						<Image
							src={thumbnail}
							alt={`${productTitle} - main image`}
							fill
							sizes="(max-width: 768px) 25vw, 12vw"
							className="object-cover"
						/>
					</div>

					{/* Additional images */}
					{additionalImages.map((image) => (
						<div
							key={image.id}
							className={`relative h-20 rounded-lg overflow-hidden cursor-pointer ${
								selectedImage === image.imageUrl ? "ring-2 ring-blue-500" : ""
							}`}
							onClick={() => handleThumbnailClick(image.imageUrl)}
						>
							<Image
								src={image.imageUrl}
								alt={`${productTitle} - additional image`}
								fill
								sizes="(max-width: 768px) 25vw, 12vw"
								className="object-cover"
							/>
						</div>
					))}
				</div>
			)}

			{/* Lightbox */}
			{lightboxOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
					onClick={closeLightbox}
				>
					<div
						className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors"
							onClick={closeLightbox}
						>
							<X className="h-6 w-6" />
						</button>

						<div className="relative w-full h-full">
							<Image
								src={selectedImage}
								alt={productTitle}
								fill
								sizes="90vw"
								className="object-contain"
							/>
						</div>

						{/* Thumbnails in lightbox */}
						<div className="absolute bottom-4 left-0 right-0">
							<div className="flex justify-center space-x-2 px-4 py-2 bg-black bg-opacity-50 overflow-x-auto">
								{allImages.map((image) => (
									<div
										key={image.id}
										className={`relative h-16 w-16 flex-shrink-0 rounded overflow-hidden cursor-pointer ${
											selectedImage === image.imageUrl ? "ring-2 ring-white" : ""
										}`}
										onClick={(e) => {
											e.stopPropagation();
											handleThumbnailClick(image.imageUrl);
										}}
									>
										<Image
											src={image.imageUrl}
											alt={`${productTitle} - thumbnail`}
											fill
											sizes="64px"
											className="object-cover"
										/>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
