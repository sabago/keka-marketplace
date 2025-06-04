"use client";

import dynamic from "next/dynamic";

type ProductImage = {
	id: string;
	imageUrl: string;
	order: number;
	createdAt: Date;
};

type ProductGalleryClientProps = {
	thumbnail: string;
	additionalImages: ProductImage[];
	productTitle: string;
};

export default function ProductGalleryClient({
	thumbnail,
	additionalImages,
	productTitle,
}: ProductGalleryClientProps) {
	// Dynamic import of ImageGallery component
	const ImageGallery = dynamic(() => import("@/components/ImageGallery"), {
		loading: () => (
			<div className="relative h-80 md:h-96 rounded-lg overflow-hidden bg-gray-200 animate-pulse">
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="text-gray-400">Loading gallery...</span>
				</div>
			</div>
		),
		ssr: false,
	});

	return (
		<ImageGallery
			thumbnail={thumbnail}
			additionalImages={additionalImages}
			productTitle={productTitle}
		/>
	);
}
