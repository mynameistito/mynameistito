import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combines conditional class names and merges conflicting Tailwind classes.
 * @returns The merged class-name string.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
