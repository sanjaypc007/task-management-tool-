/**
 * AddTask form.
 *
 * Allows the authenticated user to create a new task with input validation.
 * Persists to Firestore via the service layer.
 */

import { useState } from "react";
import toast from "react-hot-toast";

import { createTask } from "../services/taskService";

const MAX_TITLE_LENGTH = 200;

const formatFirebaseErrorMessage = (error, fallbackMessage) => {
	const errorCode =
		error && typeof error === "object" && "code" in error && typeof error.code === "string"
			? error.code
			: "";

	if (errorCode === "permission-denied") {
		return "Permission denied. Check Firestore security rules (userId must match auth.uid).";
	}

	if (errorCode === "unauthenticated") {
		return "You are not authenticated. Please sign in again.";
	}

	if (errorCode === "unavailable") {
		return "Firestore is unavailable (network issue). Check your connection and retry.";
	}

	const baseMessage = error instanceof Error ? error.message : fallbackMessage;
	return errorCode ? `${baseMessage} (${errorCode})` : baseMessage;
};

export default function AddTask({ userId }) {
	const [title, setTitle] = useState("");
	const [priority, setPriority] = useState("Medium");
	const [errorMessage, setErrorMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			setErrorMessage("Task title cannot be empty.");
			return;
		}

		if (trimmedTitle.length > MAX_TITLE_LENGTH) {
			setErrorMessage("Task title must be 200 characters or less.");
			return;
		}

		try {
			setErrorMessage("");
			setIsSubmitting(true);
			await createTask(userId, trimmedTitle, priority);
			setTitle("");
			setPriority("Medium");
			toast.success("Task created!");
		} catch (error) {
			toast.error("Failed to create task.");
			setErrorMessage(
				formatFirebaseErrorMessage(error, "Failed to create task. Please try again.")
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="w-full">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<input
					type="text"
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					maxLength={MAX_TITLE_LENGTH}
					placeholder="Add a new task title…"
					className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
					aria-label="Task title"
				/>

				<select
					value={priority}
					onChange={(event) => setPriority(event.target.value)}
					disabled={isSubmitting}
					className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
					aria-label="Task priority"
				>
					<option value="High">High</option>
					<option value="Medium">Medium</option>
					<option value="Low">Low</option>
				</select>

				<button
					type="submit"
					disabled={isSubmitting}
					className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isSubmitting ? "Adding…" : "Add"}
				</button>
			</div>

			{errorMessage ? (
				<div
					className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{errorMessage}
				</div>
			) : null}
		</form>
	);
}

