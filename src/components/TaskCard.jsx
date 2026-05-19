/**
 * TaskCard.
 *
 * Displays a single task with:
 * - Status dot + color coding
 * - Status dropdown (Planned/In Progress/Complete)
 * - Delete action with confirmation
 */

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { deleteTask, updateTaskStatus } from "../services/taskService";

const STATUS_OPTIONS = ["Planned", "In Progress", "Complete"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const normalizePriority = (priority) =>
	PRIORITY_OPTIONS.includes(priority) ? priority : "Medium";

const getStatusStyle = (status) => {
	if (status === "Complete") {
		return {
			dot: "bg-green-500",
			badge: "bg-green-50 text-green-700 border-green-200",
		};
	}

	if (status === "In Progress") {
		return {
			dot: "bg-amber-500",
			badge: "bg-amber-50 text-amber-700 border-amber-200",
		};
	}

	return {
		dot: "bg-gray-400",
		badge: "bg-gray-50 text-gray-700 border-gray-200",
	};
};

const formatFirebaseErrorMessage = (error, fallbackMessage) => {
	const errorCode =
		error && typeof error === "object" && "code" in error && typeof error.code === "string"
			? error.code
			: "";

	if (errorCode === "permission-denied") {
		return "Permission denied. Check Firestore security rules for this task.";
	}

	if (errorCode === "unauthenticated") {
		return "You are not authenticated. Please sign in again.";
	}

	if (errorCode === "not-found") {
		return "Task not found. It may have been deleted in another session.";
	}

	if (errorCode === "unavailable") {
		return "Firestore is unavailable (network issue). Check your connection and retry.";
	}

	const baseMessage = error instanceof Error ? error.message : fallbackMessage;
	return errorCode ? `${baseMessage} (${errorCode})` : baseMessage;
};

const getPriorityStyle = (priority) => {
	if (priority === "High") {
		return {
			badge: "bg-red-50 text-red-700 border-red-200",
		};
	}

	if (priority === "Low") {
		return {
			badge: "bg-green-50 text-green-700 border-green-200",
		};
	}

	return {
		badge: "bg-amber-50 text-amber-700 border-amber-200",
	};
};

export default function TaskCard({ task }) {
	const { badge, dot } = useMemo(() => getStatusStyle(task.status), [task.status]);
	const priority = normalizePriority(task.priority);
	const priorityBadge = useMemo(() => getPriorityStyle(priority).badge, [priority]);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const handleStatusChange = async (event) => {
		const nextStatus = event.target.value;

		try {
			setErrorMessage("");
			setIsUpdating(true);
			await updateTaskStatus(task.id, nextStatus);
			toast.success(`Status updated to ${nextStatus}`);
		} catch (error) {
			toast.error("Failed to update status.");
			setErrorMessage(
				formatFirebaseErrorMessage(error, "Failed to update status. Please try again.")
			);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDelete = async () => {
		const confirmed = confirm("Delete this task?");
		if (!confirmed) return;

		try {
			setErrorMessage("");
			setIsDeleting(true);
			await deleteTask(task.id);
			toast("Task deleted", { icon: "🗑️" });
		} catch (error) {
			toast.error("Failed to delete task.");
			setErrorMessage(
				formatFirebaseErrorMessage(error, "Failed to delete task. Please try again.")
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const isComplete = task.status === "Complete";

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-4">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
						<h3
							className={`truncate text-sm font-semibold ${
								isComplete ? "line-through text-gray-400" : "text-gray-900"
							}`}
							title={task.title}
						>
							{task.title}
						</h3>
					</div>

					<div className="mt-2">
						<span
							className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}
						>
							{task.status}
						</span>
						<span
							className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge}`}
							aria-label={`Priority ${priority}`}
						>
							{priority} Priority
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<select
						value={task.status}
						onChange={handleStatusChange}
						disabled={isUpdating || isDeleting}
						className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
						aria-label="Update task status"
					>
						{STATUS_OPTIONS.map((status) => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>

					<button
						type="button"
						onClick={handleDelete}
						disabled={isUpdating || isDeleting}
						className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isDeleting ? "Deleting…" : "Delete"}
					</button>
				</div>
			</div>

			{errorMessage ? (
				<div
					className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{errorMessage}
				</div>
			) : null}
		</div>
	);
}

