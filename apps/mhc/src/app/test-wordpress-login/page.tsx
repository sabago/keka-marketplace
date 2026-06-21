"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TestWordPressLoginPage() {
	// Note: These fields are for simulating a WordPress user
	// In a real WordPress login, the authentication would happen on the WordPress side
	// and we would just receive the JWT token with this information
	const [username, setUsername] = useState("Test User");
	const [userId, setUserId] = useState("1"); // WordPress user ID (required for the JWT token)
	const [email, setEmail] = useState("test@example.com");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [token, setToken] = useState("");
	interface VerificationResult {
		success?: boolean;
		error?: string;
		user?: Record<string, unknown>;
		[key: string]: unknown;
	}

	const [verificationResult, setVerificationResult] =
		useState<VerificationResult | null>(null);
	const router = useRouter();

	// Function to generate a test JWT token
	const generateToken = async () => {
		setLoading(true);
		setError("");

		try {
			// Create a payload similar to what WordPress would generate
			const payload = {
				user_id: parseInt(userId),
				email: email,
				display_name: username || "Test User",
				roles: ["subscriber"],
				iss: "https://masteringhomecare.com",
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
			};

			// In a real scenario, WordPress would sign this token
			// For testing, we'll use our API endpoint to generate a token
			const response = await fetch("/api/auth/wordpress/test-token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ payload }),
			});

			const data = await response.json();

			if (data.token) {
				setToken(data.token);
			} else {
				setError("Failed to generate token");
			}
		} catch (err) {
			console.error("Error generating token:", err);
			setError("An error occurred while generating the token");
		} finally {
			setLoading(false);
		}
	};

	// Function to verify the token
	const verifyToken = async () => {
		if (!token) {
			setError("No token to verify");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Call our API endpoint to verify the token
			const response = await fetch(
				`/api/auth/wordpress?token=${encodeURIComponent(token)}`
			);
			const data = await response.json();

			setVerificationResult(data);
		} catch (err) {
			console.error("Error verifying token:", err);
			setError("An error occurred while verifying the token");
		} finally {
			setLoading(false);
		}
	};

	// Function to simulate WordPress login redirect
	const simulateLoginRedirect = () => {
		if (!token) {
			setError("Generate a token first");
			return;
		}

		// Redirect to the marketplace home page with the token
		router.push(`/?token=${encodeURIComponent(token)}`);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6">Test WordPress Login Integration</h1>

			<div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
				<p className="text-yellow-700">
					This page is for testing purposes only. It simulates the WordPress login
					flow and JWT token generation.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold mb-4">Generate Test Token</h2>

					<div className="space-y-4">
						<div>
							<label
								htmlFor="username"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Username
							</label>
							<input
								type="text"
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Test User"
							/>
						</div>

						<div>
							<label
								htmlFor="userId"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								User ID
							</label>
							<input
								type="text"
								id="userId"
								value={userId}
								onChange={(e) => setUserId(e.target.value)}
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Email
							</label>
							<input
								type="email"
								id="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<button
							onClick={generateToken}
							disabled={loading}
							className="w-full bg-[#0B4F96] text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
						>
							{loading ? "Generating..." : "Generate Token"}
						</button>
					</div>

					{error && (
						<div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							<p>{error}</p>
						</div>
					)}

					{token && (
						<div className="mt-4">
							<h3 className="text-lg font-medium mb-2">Generated Token:</h3>
							<div className="bg-gray-100 p-3 rounded-lg overflow-x-auto">
								<code className="text-sm break-all">{token}</code>
							</div>

							<div className="mt-4 flex space-x-4">
								<button
									onClick={verifyToken}
									className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
								>
									Verify Token
								</button>

								<button
									onClick={simulateLoginRedirect}
									className="bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
								>
									Simulate Login Redirect
								</button>
							</div>
						</div>
					)}
				</div>

				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold mb-4">Token Verification Result</h2>

					{verificationResult ? (
						<div>
							<div className="bg-gray-100 p-4 rounded-lg">
								<pre className="text-sm overflow-x-auto">
									{JSON.stringify(verificationResult, null, 2)}
								</pre>
							</div>

							{verificationResult.success && (
								<div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
									<p>Token verified successfully!</p>
								</div>
							)}

							{verificationResult.error && (
								<div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
									<p>Token verification failed: {verificationResult.error}</p>
								</div>
							)}
						</div>
					) : (
						<p className="text-gray-500">
							No verification result yet. Generate and verify a token first.
						</p>
					)}
				</div>
			</div>

			<div className="mt-8">
				<h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>

				<ol className="list-decimal list-inside space-y-2 ml-4">
					<li>Fill in the user details (or use the defaults)</li>
					<li>Click "Generate Token" to create a test JWT token</li>
					<li>Click "Verify Token" to check if the token is valid</li>
					<li>
						Click "Simulate Login Redirect" to test the login flow with the
						marketplace
					</li>
					<li>
						After redirect, check if the marketplace recognizes you as logged in:
						<ul className="list-disc list-inside ml-6 mt-2">
							<li>The cart icon should show your discount</li>
							<li>Product prices should display member discounts</li>
						</ul>
					</li>
				</ol>
			</div>

			<div className="mt-8">
				<Link href="/" className="text-[#0B4F96] hover:underline">
					Back to Home
				</Link>
			</div>
		</div>
	);
}
