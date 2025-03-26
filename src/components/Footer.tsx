import Link from "next/link";

export default function Footer() {
	return (
		<footer className="bg-gray-800 text-white py-8">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{/* About Section */}
					<div>
						<h3 className="text-xl font-semibold mb-4">Keka Marketplace</h3>
						<p className="text-gray-300">
							Your one-stop shop for high-quality PDF resources. Browse our collection
							of professionally created documents, templates, and guides.
						</p>
					</div>

					{/* Quick Links */}
					<div>
						<h3 className="text-xl font-semibold mb-4">Quick Links</h3>
						<ul className="space-y-2">
							<li>
								<Link href="/" className="text-gray-300 hover:text-white">
									Home
								</Link>
							</li>
							<li>
								<Link href="/products" className="text-gray-300 hover:text-white">
									All Products
								</Link>
							</li>
							<li>
								<Link href="/categories" className="text-gray-300 hover:text-white">
									Categories
								</Link>
							</li>
							<li>
								<Link href="/cart" className="text-gray-300 hover:text-white">
									Cart
								</Link>
							</li>
						</ul>
					</div>

					{/* Contact Info */}
					<div>
						<h3 className="text-xl font-semibold mb-4">Contact Us</h3>
						<ul className="space-y-2 text-gray-300">
							<li>Email: support@pdfmarketplace.com</li>
							<li>Phone: (123) 456-7890</li>
							<li>Hours: Monday - Friday, 9am - 5pm</li>
						</ul>
					</div>
				</div>

				{/* Copyright */}
				<div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
					<p>
						&copy; {new Date().getFullYear()} Keka Marketplace. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
