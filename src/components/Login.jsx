/**
 * Login screen.
 *
 * Renders a Google Sign-In button using Firebase Authentication.
 * On success, the auth state listener in App will route to the task board.
 */

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";

import { auth, googleProvider } from "../firebase";

export default function Login() {
	const [isSigningIn, setIsSigningIn] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const handleGoogleSignIn = async () => {
		try {
			setErrorMessage("");
			setIsSigningIn(true);
			await signInWithPopup(auth, googleProvider);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Sign-in failed. Please try again.";
			setErrorMessage(message);
		} finally {
			setIsSigningIn(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
			<div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
				<h1 className="text-2xl font-bold">Task Manager</h1>
				<p className="mt-1 text-sm text-gray-600">
					Sign in with Google to manage your tasks.
				</p>

				{errorMessage ? (
					<div
						className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
						role="alert"
					>
						{errorMessage}
					</div>
				) : null}

				<button
					type="button"
					onClick={handleGoogleSignIn}
					disabled={isSigningIn}
					className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isSigningIn ? "Signing in…" : "Continue with Google"}
				</button>

				<p className="mt-4 text-xs text-gray-500">
					By continuing, you agree to sign in with your Google account.
				</p>
			</div>
		</div>
	);
}

