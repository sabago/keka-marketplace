"use client";

import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
	Suspense,
} from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

// Helper function to get a cookie value
function getCookie(name: string): string | null {
	if (typeof document === "undefined") return null;

	const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
	return match ? match[2] : null;
}

// Component that uses useSearchParams
function AuthStateManager({
	setState,
}: {
	setState: React.Dispatch<React.SetStateAction<AuthContextType>>;
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();

	useEffect(() => {
		// Function to check authentication status
		const checkAuthStatus = async () => {
			// Check for WordPress logout cookie
			if (getCookie("wp_marketplace_logout") === "1") {
				// Clear token and remove the cookie
				sessionStorage.removeItem("wp_marketplace_token");
				localStorage.removeItem("wp_marketplace_token"); // Also clear from localStorage just in case

				// Clear all other potential storage
				try {
					// Clear all cache storage
					if ("caches" in window) {
						const cacheKeys = await window.caches.keys();
						await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
					}
				} catch (e) {
					console.error("Error clearing cache:", e);
				}

				document.cookie =
					"wp_marketplace_logout=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

				// Update state to logged out
				setState({
					isLoggedIn: false,
					user: null,
					loading: false,
					token: null,
				});

				// Refresh the router cache
				router.refresh();

				// Refresh the page to ensure all components update
				window.location.reload();
				return;
			}
			// First check for token in URL query parameter
			const token = searchParams.get("token");

			if (token) {
				try {
					// Decode token to get user info (without verification)
					const user = decodeJwt(token) as WordPressUser;

					// Check if token is expired
					if (user && user.exp * 1000 > Date.now()) {
						// Store token in sessionStorage
						sessionStorage.setItem("wp_marketplace_token", token);

						// Update state
						setState({
							isLoggedIn: true,
							user,
							loading: false,
							token,
						});

						// Remove token from URL (cleaner user experience)
						// Create new URL without the token parameter
						const params = new URLSearchParams(searchParams.toString());
						params.delete("token");

						// Construct new URL
						const newUrl =
							pathname + (params.toString() ? `?${params.toString()}` : "");

						// Replace current URL without reloading the page
						window.history.replaceState({}, "", newUrl);

						return;
					}
				} catch (error) {
					console.error("Error processing token:", error);
				}
			}

			// If no valid token in URL, check sessionStorage
			const storedToken = sessionStorage.getItem("wp_marketplace_token");

			if (storedToken) {
				try {
					// Decode token
					const user = decodeJwt(storedToken) as WordPressUser;

					// Check if token is expired
					if (user && user.exp * 1000 > Date.now()) {
						// Token is valid
						setState({
							isLoggedIn: true,
							user,
							loading: false,
							token: storedToken,
						});
						return;
					} else {
						// Token is expired, remove it
						sessionStorage.removeItem("wp_marketplace_token");
					}
				} catch (error) {
					console.error("Error processing stored token:", error);
					sessionStorage.removeItem("wp_marketplace_token");
				}
			}

			// No valid token found
			setState({
				isLoggedIn: false,
				user: null,
				loading: false,
				token: null,
			});
		};

		checkAuthStatus();
	}, [pathname, searchParams, setState, router]);

	return null;
}

// Define user type based on WordPress JWT payload
export interface WordPressUser {
	user_id: number;
	email: string;
	display_name: string;
	roles: string[];
	iss: string;
	iat: number;
	exp: number;
}

// Define auth context type
export interface AuthContextType {
	isLoggedIn: boolean;
	user: WordPressUser | null;
	loading: boolean;
	token: string | null;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
	isLoggedIn: false,
	user: null,
	loading: true,
	token: null,
});

// Provider props type
interface AuthProviderProps {
	children: ReactNode;
}

// Simple JWT decoder function (doesn't verify signature)
function decodeJwt(token: string): WordPressUser | null {
	try {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
				.join("")
		);
		return JSON.parse(jsonPayload);
	} catch (error) {
		console.error("Error decoding JWT:", error);
		return null;
	}
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
	const [state, setState] = useState<AuthContextType>({
		isLoggedIn: false,
		user: null,
		loading: true,
		token: null,
	});

	// Check for token in sessionStorage on initial load (client-side only)
	useEffect(() => {
		const storedToken = sessionStorage.getItem("wp_marketplace_token");

		if (storedToken) {
			try {
				// Decode token
				const user = decodeJwt(storedToken) as WordPressUser;

				// Check if token is expired
				if (user && user.exp * 1000 > Date.now()) {
					// Token is valid
					setState({
						isLoggedIn: true,
						user,
						loading: false,
						token: storedToken,
					});
					return;
				} else {
					// Token is expired, remove it
					sessionStorage.removeItem("wp_marketplace_token");
				}
			} catch (error) {
				console.error("Error processing stored token:", error);
				sessionStorage.removeItem("wp_marketplace_token");
			}
		}

		// No valid token found in sessionStorage
		setState({
			isLoggedIn: false,
			user: null,
			loading: false,
			token: null,
		});
	}, []);

	return (
		<AuthContext.Provider value={state}>
			<Suspense fallback={null}>
				<AuthStateManager setState={setState} />
			</Suspense>
			{children}
		</AuthContext.Provider>
	);
}

// Custom hook to use auth context
export function useAuth() {
	return useContext(AuthContext);
}
