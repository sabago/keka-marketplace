import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
			<div className="text-center">
				<h1 className="text-6xl font-bold text-[#0B4F96] mb-4">404</h1>
				<h2 className="text-2xl font-semibold text-gray-800 mb-6">
					Page Not Found
				</h2>
				<p className="text-gray-600 mb-8">
					The page you are looking for doesn&apos;t exist or has been moved.
				</p>
				<Link
					href="/"
					className="px-6 py-3 bg-[#0B4F96] text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
				>
					Go back home
				</Link>
			</div>
		</div>
	);
}
