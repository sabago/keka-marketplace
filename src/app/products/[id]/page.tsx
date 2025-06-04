import { Suspense } from "react";
import Image from "next/image";
import ProductGalleryClient from "@/components/ProductGalleryClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/serverUtils";
import AddToCartButton from "@/components/AddToCartButton";
import ReviewList from "@/components/ReviewList";
import { Metadata, ResolvingMetadata } from "next";
import PageLayout from "@/components/PageLayout";

// Generate metadata for SEO
export async function generateMetadata(
	{ params }: { params: { id: string } },
	parent: ResolvingMetadata
): Promise<Metadata> {
	// We can use parent metadata if needed in the future
	await parent;
	const { id } = params;

	// Fetch product data
	const product = await prisma.product.findUnique({
		where: { id },
		include: {
			categories: {
				include: {
					category: true,
				},
			},
		},
	});

	if (!product) {
		return {
			title: "Product Not Found",
			description: "The requested product could not be found.",
		};
	}

	// Fetch SEO tags
	const tagsResult = await prisma.$queryRaw`
		SELECT tag
		FROM "ProductTag"
		WHERE "productId" = ${id}
	`;

	const tags = tagsResult as { tag: string }[];
	const keywords = tags.map((t) => t.tag).join(", ");

	// Get category name if available
	const categoryName =
		product.categories && product.categories.length > 0
			? product.categories[0].category.name
			: "Product";

	return {
		title: `${product.title} | ${categoryName}`,
		description:
			product.description.substring(0, 160) +
			(product.description.length > 160 ? "..." : ""),
		keywords: keywords,
		openGraph: {
			title: product.title,
			description:
				product.description.substring(0, 160) +
				(product.description.length > 160 ? "..." : ""),
			images: [product.thumbnail || "/images/dummy.jpeg"],
		},
	};
}

// Define types for our data
type Product = {
	id: string;
	title: string;
	price: unknown;
	description: string;
	thumbnail?: string | null;
	categories?: Array<{
		category: {
			id: string;
			name: string;
			slug: string;
		};
	}>;
	active?: boolean;
};

// This is a server component that fetches data
export default async function ProductDetailPage({
	params,
}: {
	params: { id: string };
}) {
	const { id } = params;

	// Fetch product data
	const product = await prisma.product.findUnique({
		where: { id },
		include: {
			categories: {
				include: {
					category: true,
				},
			},
		},
	});

	// If product not found, show 404
	if (!product) {
		notFound();
	}

	// Fetch additional images using raw SQL
	const additionalImagesResult = await prisma.$queryRaw`
		SELECT id, "imageUrl", "order", "createdAt"
		FROM "ProductImage"
		WHERE "productId" = ${id}
		ORDER BY "order" ASC
	`;

	// Fetch video using raw SQL
	const videoResult = await prisma.$queryRaw`
		SELECT id, "videoUrl", "createdAt"
		FROM "ProductVideo"
		WHERE "productId" = ${id}
	`;

	// Fetch SEO tags using raw SQL
	const tagsResult = await prisma.$queryRaw`
		SELECT id, tag, "createdAt"
		FROM "ProductTag"
		WHERE "productId" = ${id}
	`;

	// Define types for the query results
	type ProductImage = {
		id: string;
		imageUrl: string;
		order: number;
		createdAt: Date;
	};

	type ProductVideo = {
		id: string;
		videoUrl: string;
		createdAt: Date;
	};

	type ProductTag = {
		id: string;
		tag: string;
		createdAt: Date;
	};

	// Convert the results to the expected format
	const additionalImages = additionalImagesResult as ProductImage[];
	const videoArray = videoResult as ProductVideo[];
	const video = videoArray && videoArray.length > 0 ? videoArray[0] : null;
	const tags = tagsResult as ProductTag[];

	// Get the first category ID if available
	const firstCategoryId =
		product.categories && product.categories.length > 0
			? product.categories[0].category.id
			: null;

	// Fetch related products
	const relatedProducts = await prisma.product.findMany({
		where: {
			id: { not: product.id },
			...(firstCategoryId && {
				categories: {
					some: {
						categoryId: firstCategoryId,
					},
				},
			}),
		},
		include: {
			categories: {
				include: {
					category: true,
				},
			},
		},
		take: 3,
	});

	return (
		<PageLayout>
			<div className="container mx-auto px-4 py-8">
				{/* Breadcrumb */}
				<div className="mb-6">
					<Link
						href="/products"
						className="text-blue-600 hover:text-blue-800 flex items-center"
					>
						<ArrowLeft className="h-4 w-4 mr-1" />
						Back to Products
					</Link>
				</div>

				{/* Product Details */}
				<div className="bg-white rounded-lg shadow-md overflow-hidden mb-12">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
						{/* Product Images */}
						<div className="space-y-4">
							<Suspense
								fallback={
									<div className="relative h-80 md:h-96 rounded-lg overflow-hidden bg-gray-200 animate-pulse">
										<div className="absolute inset-0 flex items-center justify-center">
											<span className="text-gray-400">Loading images...</span>
										</div>
									</div>
								}
							>
								{/* Use the client component wrapper */}
								<ProductGalleryClient
									thumbnail={product.thumbnail || "/images/dummy.jpeg"}
									additionalImages={additionalImages}
									productTitle={product.title}
								/>
							</Suspense>

							{/* Video Player */}
							{video && video.videoUrl && (
								<div className="mt-4">
									<h3 className="text-lg font-semibold mb-2">Product Video</h3>
									<video
										controls
										className="w-full rounded-lg"
										poster={product.thumbnail}
									>
										<source src={video.videoUrl} type="video/mp4" />
										Your browser does not support the video tag.
									</video>
								</div>
							)}
						</div>

						{/* Product Info */}
						<div className="flex flex-col">
							<h1 className="text-3xl font-bold text-gray-800 mb-2">
								{product.title}
							</h1>

							{/* Category */}
							{product.categories && product.categories.length > 0 && (
								<Link
									href={`/categories/${product.categories[0].category.slug}`}
									className="text-blue-600 hover:text-blue-800 text-sm mb-4"
								>
									{product.categories[0].category.name}
								</Link>
							)}

							{/* Price */}
							<div className="mb-6">
								<span className="text-3xl font-bold text-blue-600">
									{formatCurrency(Number(product.price), "USD")}
								</span>

								{/* Client component for add to cart with login button */}
								<Suspense fallback={<div>Loading...</div>}>
									<AddToCartButton product={product} />
								</Suspense>
							</div>

							{/* Description */}
							<div className="text-gray-700 mb-8 flex-grow">
								{product.description
									.split("\n\n")
									.map((paragraph: string, index: number) => (
										<p key={index} className="mb-4">
											{paragraph}
										</p>
									))}
							</div>

							{/* SEO Tags */}
							{tags && tags.length > 0 && (
								<div className="mb-6">
									<h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
									<div className="flex flex-wrap gap-2">
										{tags.map((tag) => (
											<span
												key={tag.id}
												className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full"
											>
												{tag.tag}
											</span>
										))}
									</div>
								</div>
							)}

							{/* No review form here - it will be shown in the reviews section when stars are clicked */}
						</div>
					</div>
				</div>

				{/* Reviews Section with clickable stars */}
				<div className="bg-white rounded-lg shadow-md overflow-hidden mb-12 p-6">
					<h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
					<div className="mb-6">
						<p className="text-sm text-gray-600 mb-2">
							Click on the stars to write a review
						</p>
						<ReviewList productId={id} />
					</div>
				</div>

				{/* Related Products Section */}
				{relatedProducts.length > 0 && (
					<div>
						<h2 className="text-2xl font-bold mb-6">Related Products</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{relatedProducts.map((relatedProduct: Product) => (
								<Link
									key={relatedProduct.id}
									href={`/products/${relatedProduct.id}`}
									className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
								>
									<div className="relative h-48 w-full">
										<Image
											src={relatedProduct.thumbnail || "/images/dummy.jpeg"}
											alt={relatedProduct.title}
											fill
											sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
											className="object-cover"
										/>
									</div>
									<div className="p-4">
										<h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors">
											{relatedProduct.title}
										</h3>
										<p className="text-blue-600 font-bold mt-2">
											{formatCurrency(Number(relatedProduct.price), "USD")}
										</p>
									</div>
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</PageLayout>
	);
}
