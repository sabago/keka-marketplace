import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/useSettings";
import AddToCartButton from "@/components/AddToCartButton";

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
					{/* Product Image */}
					<div className="relative h-80 md:h-96 rounded-lg overflow-hidden">
						<Image
							src={product.thumbnail || "/images/dummy.jpeg"}
							alt={product.title}
							fill
							sizes="(max-width: 768px) 100vw, 50vw"
							className="object-cover"
						/>
					</div>

					{/* Product Info */}
					<div className="flex flex-col">
						<h1 className="text-3xl font-bold text-gray-800 mb-2">{product.title}</h1>

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
					</div>
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
	);
}
