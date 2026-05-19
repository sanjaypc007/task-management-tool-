/**
 * TaskBoard.
 *
 * Main authenticated UI:
 * - Header with user avatar/name, API Docs toggle, and Sign out
 * - Task creation form
 * - Real-time task list with status summary, loading and empty states
 */

import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";

import { auth } from "../firebase";
import { getUserTasks } from "../services/taskService";
import AddTask from "./AddTask";
import TaskCard from "./TaskCard";

const formatFirebaseErrorMessage = (error, fallbackMessage) => {
	const errorCode =
		error && typeof error === "object" && "code" in error && typeof error.code === "string"
			? error.code
			: "";

	if (errorCode === "permission-denied") {
		return "Permission denied. Check your Firestore security rules for the tasks collection.";
	}

	if (errorCode === "failed-precondition") {
		return "This query requires a Firestore index. Create the suggested index in the Firebase console, then reload.";
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

const countByStatus = (tasks) =>
	tasks.reduce(
		(counts, task) => {
			const nextCounts = { ...counts };
			nextCounts[task.status] = (nextCounts[task.status] ?? 0) + 1;
			return nextCounts;
		},
		{ Planned: 0, "In Progress": 0, Complete: 0 }
	);

export default function TaskBoard({ user }) {
	const [tasks, setTasks] = useState([]);
	const [isTasksLoading, setIsTasksLoading] = useState(true);
	const [tasksErrorMessage, setTasksErrorMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		setTasksErrorMessage("");
		let hasReceivedSnapshot = false;

		const unsubscribe = getUserTasks(
			user.uid,
			(nextTasks) => {
				setTasks(nextTasks);
				if (!hasReceivedSnapshot) {
					hasReceivedSnapshot = true;
					setIsTasksLoading(false);
				}
			},
			(error) => {
				setTasksErrorMessage(
					formatFirebaseErrorMessage(
						error,
						"Failed to load tasks from Firestore."
					)
				);
				if (!hasReceivedSnapshot) {
					hasReceivedSnapshot = true;
					setIsTasksLoading(false);
				}
			}
		);

		return unsubscribe;
	}, [user.uid]);

	const statusCounts = useMemo(() => countByStatus(tasks), [tasks]);
	const summaryText =
		`${statusCounts.Planned} Planned` +
		` · ${statusCounts["In Progress"]} In Progress` +
		` · ${statusCounts.Complete} Complete`;

	const handleSignOut = async () => {
		try {
			setErrorMessage("");
			await signOut(auth);
		} catch (error) {
			setErrorMessage(
				formatFirebaseErrorMessage(error, "Failed to sign out. Please try again.")
			);
		}
	};

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					{user.photoURL ? (
						<img
							src={user.photoURL}
							alt={user.displayName ?? "User"}
							className="h-10 w-10 rounded-full border border-gray-200"
							referrerPolicy="no-referrer"
						/>
					) : (
						<div className="h-10 w-10 rounded-full bg-gray-200" aria-hidden="true" />
					)}

					<div className="min-w-0">
						<div className="text-lg font-bold truncate">Task Manager</div>
						<div className="text-sm text-gray-600 truncate">
							{user.displayName ?? "Signed in"}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<a
						href="/api-doc"
						className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
					>
						📄 API Docs
					</a>

					<button
						type="button"
						onClick={handleSignOut}
						className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
					>
						Sign out
					</button>
				</div>
			</header>

			{errorMessage ? (
				<div
					className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{errorMessage}
				</div>
			) : null}

			{tasksErrorMessage ? (
				<div
					className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{tasksErrorMessage}
				</div>
			) : null}

			<div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
				<AddTask userId={user.uid} />
				<div className="mt-3 text-sm text-gray-600">{summaryText}</div>
			</div>

			<section className="mt-6 space-y-3">
				{isTasksLoading ? (
					<div className="rounded-xl border border-gray-200 bg-white p-6">
						<div className="flex items-center gap-3 text-sm text-gray-700">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
							Loading tasks…
						</div>
					</div>
				) : null}

				{!isTasksLoading && tasks.length === 0 ? (
					<div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
						No tasks yet. Create your first task above.
					</div>
				) : null}

				{!isTasksLoading
					? tasks.map((task) => <TaskCard key={task.id} task={task} />)
					: null}
			</section>
		</div>
	);
}

