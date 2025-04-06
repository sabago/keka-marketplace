"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tag, ArrowRight, Loader2 } from "lucide-react";
import { useSettings } from "@/lib/useSettings";

// Define category type
interface Category {
	id: string;
	name: string;
	slug: string;
	productCount: number;
	description?: string;
	icon?: string;
}

// Function to get the background image for each category
const getCategoryBackgroundImage = (slug: string): string => {
	switch (slug) {
		case "clinical-forms-templates":
			return "url('/images/clinicalformsandtemplates.jpg')";
		case "compliance-accreditation-tools":
			return "url('/images/complianceandaccredition.jpg')";
		case "courses-training-materials":
			return "url('/images/courses&trainingmaterials.jpg')";
		case "downloadables-digital-tools":
			return "url('/images/downloadables&digitaltools.jpg')";
		case "marketing-business-growth":
			return "url('/images/marketingandbusinessgrowth.jpg')";
		case "medical-equipment-supplies":
			return "url('/images/medicalequipment&supplies.jpg')";
		case "staffing-hr-resources":
			return "url('/images/staffing&hrresources.jpg')";
		case "vendor-services":
			return "url('/images/vendorservices2.jpg')";
		default:
			return "none";
	}
};

// Category descriptions and icons
const categoryDetails: Record<string, { description: string; icon: string }> = {
	"clinical-forms-templates": {
		description:
			"Evaluation Forms (PT, OT, RN, etc.), Care Plans & Goals, Admission Packets, Daily Visit Notes, Discharge Summaries, EVV Documentation Templates",
		icon: "📝",
	},
	"courses-training-materials": {
		description:
			"Home Health Aide (HHA) Training, Caregiver Certification Prep, EVV Compliance & Billing, Clinical Skills & Competency, OSHA/Infection Control, Medicare Documentation Training",
		icon: "📚",
	},
	"compliance-accreditation-tools": {
		description:
			"State-Specific Policy Templates, Quality Assurance & Performance Improvement (QAPI), HR & Personnel Files, Mock Survey Tools, Emergency Preparedness Plans",
		icon: "🛠️",
	},
	"staffing-hr-resources": {
		description:
			"Job Descriptions (RN, PT, HHA, etc.), Interview & Hiring Forms, Orientation Packets, Performance Review Templates, Contractor Agreements",
		icon: "🧑‍⚕️",
	},
	"medical-equipment-supplies": {
		description:
			"Mobility Aids (canes, walkers, wheelchairs), Incontinence Products, Personal Protective Equipment (PPE), Transfer & Safety Aids, Wound Care Supplies",
		icon: "🩺",
	},
	"vendor-services": {
		description:
			"Billing & Payroll Services, QA Consultants, Virtual Assistants, Scheduling & Software Solutions, Insurance & Credentialing Partners",
		icon: "🛎️",
	},
	"marketing-business-growth": {
		description:
			"Branding & Logo Packages, Social Media Templates, Business Plans & Pitch Decks, Referral Scripts & Guides, Website Design Services",
		icon: "📈",
	},
	"downloadables-digital-tools": {
		description:
			"Checklists & Cheat Sheets, Quick-Reference Clinical Guides, Printable Client Education Materials, Editable PDF Templates",
		icon: "📥",
	},
};

export default function CategoriesPage() {
	const [categories, setCategories] = useState<Category[]>([]);
	const { settings } = useSettings();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	// Fetch categories
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch categories
				console.log("Fetching categories...");
				const categoriesResponse = await fetch("/api/categories");
				if (!categoriesResponse.ok) {
					throw new Error("Failed to fetch categories");
				}
				const categoriesData = await categoriesResponse.json();
				console.log("Categories data:", categoriesData);

				setCategories(categoriesData.categories || []);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load categories. Please try again later.");
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	// Handle category click
	const handleCategoryClick = (categoryId: string) => {
		router.push(`/products?categoryId=${categoryId}`);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-2">Product Categories</h1>
			<p className="text-gray-600 mb-8">{settings.siteDescription}</p>

			{/* Loading state */}
			{loading && (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
					<span className="ml-2 text-gray-600">Loading categories...</span>
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
					<p>{error}</p>
				</div>
			)}

			{/* Categories grid */}
			{!loading && !error && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{categories
						.filter((category) => !category.name.startsWith("Hidden Category"))
						.map((category) => (
							<div
								key={category.id}
								className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
								onClick={() => handleCategoryClick(category.id)}
							>
								{/* Add background image based on category */}
								<div
									className="relative h-48 w-full bg-cover bg-center"
									style={{
										backgroundImage: getCategoryBackgroundImage(category.slug),
									}}
								>
									<div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center p-4">
										<span className="text-3xl mb-2">
											{categoryDetails[category.slug]?.icon || (
												<Tag className="h-8 w-8 text-white" />
											)}
										</span>
										<h2 className="text-white text-2xl font-bold text-center">
											{category.name}
										</h2>
										<span className="mt-2 bg-white bg-opacity-20 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
											{category.productCount}{" "}
											{category.productCount === 1 ? "product" : "products"}
										</span>
									</div>
								</div>
								<div className="p-4">
									<p className="text-gray-600 mb-4">
										{categoryDetails[category.slug]?.description ||
											`Browse all ${category.name.toLowerCase()} products in our marketplace.`}
									</p>
									<div className="flex justify-end">
										<Link
											href={`/products?categoryId=${category.id}`}
											className="text-[#48ccbc] hover:text-blue-800 font-medium inline-flex items-center"
											onClick={(e) => e.stopPropagation()}
										>
											View Products
											<ArrowRight className="ml-1 h-4 w-4" />
										</Link>
									</div>
								</div>
							</div>
						))}
				</div>
			)}

			{/* Empty state */}
			{!loading && !error && categories.length === 0 && (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<p className="text-gray-600 mb-4">No categories found.</p>
					<Link
						href="/products"
						className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						Browse All Products
					</Link>
				</div>
			)}
		</div>
	);
}
